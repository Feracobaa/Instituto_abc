-- Invariante de tenant para las RPCs SECURITY DEFINER de asistencia.
-- student_attendance no tiene institution_id propio: el aislamiento se deriva de
-- sus referencias a profesor, grado, materia, periodo y estudiante.
begin;

create or replace function public.can_manage_attendance_context(
  p_teacher_id uuid,
  p_grade_id uuid,
  p_subject_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $function$
  with active_context as (
    select public.current_institution_id() as institution_id
  )
  select
    active_context.institution_id is not null
    and exists (
      select 1
      from public.teachers t
      join public.grades g on g.id = p_grade_id
      join public.subjects s on s.id = p_subject_id
      where t.id = p_teacher_id
        and t.institution_id = active_context.institution_id
        and g.institution_id = active_context.institution_id
        and s.institution_id = active_context.institution_id
    )
    and (
      exists (
        select 1
        from public.institution_memberships im
        where im.user_id = auth.uid()
          and im.institution_id = active_context.institution_id
          and im.role = 'rector'
      )
      or exists (
        select 1
        from public.teachers t
        where t.user_id = auth.uid()
          and t.id = p_teacher_id
          and t.institution_id = active_context.institution_id
          and exists (
            select 1
            from public.teacher_grade_assignments tga
            where tga.teacher_id = t.id
              and tga.grade_id = p_grade_id
          )
          and exists (
            select 1
            from public.teacher_subjects ts
            where ts.teacher_id = t.id
              and ts.subject_id = p_subject_id
          )
      )
    )
  from active_context;
$function$;

create or replace function public.save_student_attendance(
  p_attendance_date date,
  p_grade_id uuid,
  p_subject_id uuid,
  p_teacher_id uuid,
  p_rows jsonb
)
returns integer
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_actor_teacher_id uuid;
  v_institution_id uuid;
  v_day_of_week integer;
  v_period_id uuid;
  v_payload_rows integer;
  v_roster_rows integer;
  v_inserted_rows integer := 0;
begin
  v_institution_id := public.current_institution_id();

  if v_institution_id is null then
    raise exception 'An active institution context is required.';
  end if;

  if p_attendance_date is null
     or p_grade_id is null
     or p_subject_id is null
     or p_teacher_id is null then
    raise exception 'Attendance context is incomplete.';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Attendance rows payload must be a JSON array.';
  end if;

  if not public.can_manage_attendance_context(p_teacher_id, p_grade_id, p_subject_id) then
    raise exception 'You are not allowed to manage attendance for this institutional class.';
  end if;

  if exists (
    select 1 from public.institution_memberships im
    where im.user_id = auth.uid()
      and im.institution_id = v_institution_id
      and im.role = 'profesor'
  ) then
    select t.id into v_actor_teacher_id
    from public.teachers t
    where t.user_id = auth.uid()
      and t.institution_id = v_institution_id
    limit 1;

    if v_actor_teacher_id is null or v_actor_teacher_id <> p_teacher_id then
      raise exception 'Professors can only save attendance for their own teacher profile.';
    end if;
  end if;

  v_day_of_week := extract(dow from p_attendance_date)::integer;
  if v_day_of_week = 0 or v_day_of_week = 6 then
    raise exception 'Attendance can only be saved for weekdays with scheduled classes.';
  end if;
  v_day_of_week := v_day_of_week - 1;

  if not exists (
    select 1
    from public.schedules sc
    join public.grades g on g.id = sc.grade_id
    join public.subjects s on s.id = sc.subject_id
    join public.teachers t on t.id = sc.teacher_id
    where sc.grade_id = p_grade_id
      and sc.subject_id = p_subject_id
      and sc.teacher_id = p_teacher_id
      and g.institution_id = v_institution_id
      and s.institution_id = v_institution_id
      and t.institution_id = v_institution_id
      and sc.day_of_week = v_day_of_week
      and (sc.start_date is null or sc.start_date <= p_attendance_date)
      and (sc.end_date is null or sc.end_date >= p_attendance_date)
  ) then
    raise exception 'No scheduled institutional class found for this context and date.';
  end if;

  select ap.id into v_period_id
  from public.academic_periods ap
  where ap.institution_id = v_institution_id
    and ap.is_active = true
    and p_attendance_date between ap.start_date and ap.end_date
  order by ap.start_date desc
  limit 1;

  if v_period_id is null then
    raise exception 'Attendance can only be edited for dates in the active institutional period.';
  end if;

  select count(*) into v_payload_rows
  from jsonb_to_recordset(p_rows) as payload(
    student_id uuid,
    status public.attendance_status_enum,
    justification_note text
  );

  if v_payload_rows = 0 then
    raise exception 'Attendance payload cannot be empty.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_rows) as p(student_id uuid, status public.attendance_status_enum, justification_note text)
    where p.student_id is null or p.status is null
  ) then
    raise exception 'Every attendance row must include student_id and status.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_rows) as p(student_id uuid, status public.attendance_status_enum, justification_note text)
    group by p.student_id
    having count(*) > 1
  ) then
    raise exception 'Attendance payload includes duplicated students.';
  end if;

  select count(*) into v_roster_rows
  from public.students st
  where st.grade_id = p_grade_id
    and st.institution_id = v_institution_id
    and (st.is_active is null or st.is_active = true);

  if v_roster_rows = 0 then
    raise exception 'No active institutional students found for the selected grade.';
  end if;

  if exists (
    with payload as (
      select p.student_id
      from jsonb_to_recordset(p_rows) as p(student_id uuid, status public.attendance_status_enum, justification_note text)
    ), roster as (
      select st.id as student_id
      from public.students st
      where st.grade_id = p_grade_id
        and st.institution_id = v_institution_id
        and (st.is_active is null or st.is_active = true)
    )
    select 1 from roster r left join payload p on p.student_id = r.student_id where p.student_id is null
  ) then
    raise exception 'Attendance payload is incomplete: every active student in the grade must be marked.';
  end if;

  if exists (
    with payload as (
      select p.student_id
      from jsonb_to_recordset(p_rows) as p(student_id uuid, status public.attendance_status_enum, justification_note text)
    ), roster as (
      select st.id as student_id
      from public.students st
      where st.grade_id = p_grade_id
        and st.institution_id = v_institution_id
        and (st.is_active is null or st.is_active = true)
    )
    select 1 from payload p left join roster r on r.student_id = p.student_id where r.student_id is null
  ) then
    raise exception 'Attendance payload includes students outside the institutional grade.';
  end if;

  delete from public.student_attendance sa
  where sa.attendance_date = p_attendance_date
    and sa.grade_id = p_grade_id
    and sa.subject_id = p_subject_id
    and sa.teacher_id = p_teacher_id;

  insert into public.student_attendance (
    attendance_date, period_id, grade_id, subject_id, teacher_id, student_id, status, justification_note
  )
  select
    p_attendance_date, v_period_id, p_grade_id, p_subject_id, p_teacher_id,
    payload.student_id, payload.status,
    case when payload.status = 'justified'::public.attendance_status_enum
      then nullif(btrim(payload.justification_note), '') else null end
  from jsonb_to_recordset(p_rows) as payload(
    student_id uuid,
    status public.attendance_status_enum,
    justification_note text
  );

  get diagnostics v_inserted_rows = row_count;
  return v_inserted_rows;
end;
$function$;

revoke all on function public.can_manage_attendance_context(uuid, uuid, uuid) from public, anon;
revoke all on function public.save_student_attendance(date, uuid, uuid, uuid, jsonb) from public, anon;
grant execute on function public.can_manage_attendance_context(uuid, uuid, uuid) to authenticated;
grant execute on function public.save_student_attendance(date, uuid, uuid, uuid, jsonb) to authenticated;

commit;
