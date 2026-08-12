begin;

-- Fase 1: el cliente no es una fuente de autoridad para tenant, enrolamiento
-- de personal, liveness ni permisos de RPC.

alter table public.student_attendance
  add column if not exists liveness_status text not null default 'unverified';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'student_attendance_liveness_status_check'
  ) then
    alter table public.student_attendance
      add constraint student_attendance_liveness_status_check
      check (liveness_status in ('unverified', 'pending', 'verified', 'rejected'));
  end if;
end
$$;

-- Recupera asociaciones históricas solamente cuando existe una fuente institucional
-- conocida. Las filas que sigan en NULL no podrán autenticar hasta re-enrolarse.
update public.staff_biometrics sb
set institution_id = coalesce(
  (select t.institution_id from public.teachers t where t.user_id = sb.user_id limit 1),
  (select ur.institution_id from public.user_roles ur where ur.user_id = sb.user_id and ur.institution_id is not null limit 1)
)
where sb.institution_id is null;

create or replace function public.upsert_staff_biometric(
  p_user_id uuid,
  p_institution_id uuid,
  p_embedding extensions.vector(128)
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth
as $function$
declare
  v_biometric_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user is required.';
  end if;

  if p_user_id is null or p_institution_id is null or p_embedding is null then
    raise exception 'user_id, institution_id and embedding are required.';
  end if;

  if not exists (
    select 1 from public.institutions i
    where i.id = p_institution_id and i.is_active
  ) then
    raise exception 'Institution does not exist or is inactive.';
  end if;

  -- Sólo un rector miembro de la institución puede enrolar personal allí.
  if not exists (
    select 1 from public.institution_memberships im
    where im.user_id = auth.uid()
      and im.institution_id = p_institution_id
      and im.role = 'rector'::public.user_role_enum
  ) then
    raise exception 'Actor is not authorized to enroll staff for this institution.';
  end if;

  -- El sujeto debe pertenecer a la misma institución; evita asociaciones cruzadas.
  if not exists (
    select 1 from public.institution_memberships im
    where im.user_id = p_user_id
      and im.institution_id = p_institution_id
  ) then
    raise exception 'Target user does not belong to this institution.';
  end if;

  if exists (
    select 1 from public.staff_biometrics sb
    where sb.user_id = p_user_id
      and sb.institution_id is not null
      and sb.institution_id <> p_institution_id
  ) then
    raise exception 'Target biometric is already bound to a different institution.';
  end if;

  insert into public.staff_biometrics (user_id, institution_id, vec_embedding, updated_at)
  values (p_user_id, p_institution_id, p_embedding, now())
  on conflict (user_id) do update
    set institution_id = excluded.institution_id,
        vec_embedding = excluded.vec_embedding,
        updated_at = now()
  returning id into v_biometric_id;

  insert into public.biometric_audit_logs (
    institution_id, event_type, user_id, metadata
  ) values (
    p_institution_id,
    'enrollment_created',
    p_user_id,
    jsonb_build_object('actor_user_id', auth.uid(), 'subject_type', 'staff')
  );

  return v_biometric_id;
end;
$function$;

-- La función de login debe devolver el estudiante real, no la cuenta guardián.
drop function if exists public.match_biometric_login(extensions.vector(128), uuid, double precision);

create function public.match_biometric_login(
  query_embedding extensions.vector(128),
  p_institution_id uuid,
  match_threshold double precision default 0.92
)
returns table (
  target_user_id uuid,
  target_student_id uuid,
  full_name text,
  email text,
  user_type text,
  similarity double precision
)
language plpgsql
security definer
set search_path = public, extensions, auth
as $function$
begin
  if p_institution_id is null then
    raise exception 'Institution is required.';
  end if;

  return query
  select
    stb.user_id,
    null::uuid,
    coalesce(p.full_name, u.email),
    u.email,
    'staff'::text,
    1.0 - (stb.vec_embedding <=> query_embedding)
  from public.staff_biometrics stb
  join auth.users u on u.id = stb.user_id
  left join public.profiles p on p.id = stb.user_id
  where stb.institution_id = p_institution_id
    and stb.vec_embedding is not null
    and (1.0 - (stb.vec_embedding <=> query_embedding)) >= match_threshold

  union all

  select
    sga.user_id,
    s.id,
    s.full_name,
    (sga.username || '@familias.iabc.local')::text,
    'student'::text,
    1.0 - (sb.vec_embedding <=> query_embedding)
  from public.student_biometrics sb
  join public.students s on s.id = sb.student_id
  join public.student_guardian_accounts sga on sga.student_id = s.id
  where s.institution_id = p_institution_id
    and sb.vec_embedding is not null
    and (1.0 - (sb.vec_embedding <=> query_embedding)) >= match_threshold
  order by similarity desc
  limit 1;
end;
$function$;

-- Sincroniza una captura offline, pero el servidor fija siempre su confianza.
create or replace function public.sync_biometric_attendance_offline(
  p_student_id uuid,
  p_attendance_date date,
  p_status public.attendance_status_enum,
  p_grade_id uuid,
  p_subject_id uuid,
  p_teacher_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_period_id uuid;
  v_institution_id uuid;
  v_attendance_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user is required.';
  end if;

  if p_student_id is null or p_attendance_date is null or p_status is null
     or p_grade_id is null or p_subject_id is null or p_teacher_id is null then
    raise exception 'Offline attendance context is incomplete.';
  end if;

  if not public.can_manage_attendance_context(p_teacher_id, p_grade_id, p_subject_id) then
    raise exception 'Actor is not allowed to manage this attendance context.';
  end if;

  select s.institution_id into v_institution_id
  from public.students s
  where s.id = p_student_id
    and s.grade_id = p_grade_id
    and (s.is_active is null or s.is_active);

  if v_institution_id is null or not public.is_user_in_institution(v_institution_id) then
    raise exception 'Student is not available in the actor institution.';
  end if;

  select ap.id into v_period_id
  from public.academic_periods ap
  where ap.institution_id = v_institution_id
    and ap.is_active
    and p_attendance_date between ap.start_date and ap.end_date
  order by ap.start_date desc
  limit 1;

  if v_period_id is null then
    raise exception 'No active academic period for offline attendance.';
  end if;

  insert into public.student_attendance (
    attendance_date, period_id, grade_id, subject_id, teacher_id, student_id,
    institution_id, status, capture_method, liveness_verified, liveness_status
  ) values (
    p_attendance_date, v_period_id, p_grade_id, p_subject_id, p_teacher_id, p_student_id,
    v_institution_id, p_status, 'facial_mobile', false, 'unverified'
  )
  on conflict (attendance_date, grade_id, subject_id, teacher_id, student_id)
  do update set
    status = excluded.status,
    capture_method = 'facial_mobile',
    liveness_verified = false,
    liveness_status = 'unverified',
    updated_at = now()
  returning id into v_attendance_id;

  return v_attendance_id;
end;
$function$;

-- El registro de auditoría se escribe sólo desde funciones backend SECURITY DEFINER.
drop policy if exists "Permitir inserción de logs biométricos" on public.biometric_audit_logs;
revoke insert, update, delete on public.biometric_audit_logs from anon, authenticated;
revoke update, delete on public.biometric_audit_logs from public;

-- El enrolamiento no se autoriza mediante DML directo del navegador.
drop policy if exists "Staff members can view their own biometric record" on public.staff_biometrics;
drop policy if exists "Staff members or rectors can update biometric records" on public.staff_biometrics;
create policy staff_biometrics_select_scoped
  on public.staff_biometrics for select to authenticated
  using (
    user_id = auth.uid()
    or (institution_id = public.current_institution_id() and public.is_user_rector())
  );
revoke insert, update, delete on public.staff_biometrics from anon, authenticated;

-- Mínimo privilegio para RPCs biométricas. service_role invoca login desde Edge.
revoke all on function public.match_biometric_login(extensions.vector(128), uuid, double precision) from public, anon, authenticated;
revoke all on function public.upsert_staff_biometric(uuid, uuid, extensions.vector(128)) from public, anon;
revoke all on function public.sync_biometric_attendance_offline(uuid, date, public.attendance_status_enum, uuid, uuid, uuid) from public, anon;
revoke execute on function public.match_student_biometrics(extensions.vector(128), double precision, uuid[]) from public, anon;

grant execute on function public.upsert_staff_biometric(uuid, uuid, extensions.vector(128)) to authenticated;
grant execute on function public.sync_biometric_attendance_offline(uuid, date, public.attendance_status_enum, uuid, uuid, uuid) to authenticated;
grant execute on function public.match_student_biometrics(extensions.vector(128), double precision, uuid[]) to authenticated;
grant execute on function public.match_biometric_login(extensions.vector(128), uuid, double precision) to service_role;

commit;
