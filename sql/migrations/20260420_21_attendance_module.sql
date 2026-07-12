begin;

-- Attendance statuses used by the new daily attendance module.
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'attendance_status_enum'
  ) then
    create type public.attendance_status_enum as enum ('present', 'absent', 'justified');
  end if;
end
$$;

create table if not exists public.student_attendance (
  id uuid primary key default gen_random_uuid(),
  attendance_date date not null,
  period_id uuid not null references public.academic_periods(id) on delete restrict,
  grade_id uuid not null references public.grades(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete cascade,
  status public.attendance_status_enum not null,
  justification_note text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint student_attendance_justification_note_not_blank_check
    check (justification_note is null or btrim(justification_note) <> '')
);

create unique index if not exists student_attendance_unique_context_idx
  on public.student_attendance (attendance_date, grade_id, subject_id, teacher_id, student_id);

create index if not exists student_attendance_lookup_idx
  on public.student_attendance (attendance_date, grade_id, subject_id, teacher_id);

create index if not exists student_attendance_student_id_idx
  on public.student_attendance (student_id);

comment on table public.student_attendance is
'Daily attendance marks by date, grade, subject, teacher, and student.';

create or replace function public.touch_student_attendance_updated_at()
returns trigger
language plpgsql
set search_path = 'public'
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists student_attendance_set_updated_at
on public.student_attendance;

create trigger student_attendance_set_updated_at
before update on public.student_attendance
for each row
execute function public.touch_student_attendance_updated_at();

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
  select
    public.is_user_rector()
    or (
      public.is_user_profesor()
      and exists (
        select 1
        from public.teachers t
        where t.user_id = auth.uid()
          and t.id = p_teacher_id
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
    );
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
  v_day_of_week integer;
  v_period_id uuid;
  v_payload_rows integer;
  v_roster_rows integer;
  v_inserted_rows integer := 0;
begin
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
    raise exception 'You are not allowed to manage attendance for this class.';
  end if;

  if public.is_user_profesor() then
    select t.id
    into v_actor_teacher_id
    from public.teachers t
    where t.user_id = auth.uid()
    limit 1;

    if v_actor_teacher_id is null or v_actor_teacher_id <> p_teacher_id then
      raise exception 'Professors can only save attendance for their own teacher profile.';
    end if;
  end if;

  v_day_of_week := extract(dow from p_attendance_date)::integer;

  if v_day_of_week = 0 or v_day_of_week = 6 then
    raise exception 'Attendance can only be saved for weekdays with scheduled classes.';
  end if;

  -- JS day indexes use Monday=0..Friday=4. The schedule table follows the same convention.
  v_day_of_week := v_day_of_week - 1;

  if not exists (
    select 1
    from public.schedules s
    where s.grade_id = p_grade_id
      and s.subject_id = p_subject_id
      and s.teacher_id = p_teacher_id
      and s.day_of_week = v_day_of_week
      and (s.start_date is null or s.start_date <= p_attendance_date)
      and (s.end_date is null or s.end_date >= p_attendance_date)
  ) then
    raise exception 'No scheduled class found for this grade, subject, teacher, and date.';
  end if;

  select ap.id
  into v_period_id
  from public.academic_periods ap
  where ap.is_active = true
    and p_attendance_date between ap.start_date and ap.end_date
  order by ap.start_date desc
  limit 1;

  if v_period_id is null then
    raise exception 'Attendance can only be edited for dates in the active academic period.';
  end if;

  select count(*)
  into v_payload_rows
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
    from jsonb_to_recordset(p_rows) as p(
      student_id uuid,
      status public.attendance_status_enum,
      justification_note text
    )
    where p.student_id is null
       or p.status is null
  ) then
    raise exception 'Every attendance row must include student_id and status.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_rows) as p(
      student_id uuid,
      status public.attendance_status_enum,
      justification_note text
    )
    group by p.student_id
    having count(*) > 1
  ) then
    raise exception 'Attendance payload includes duplicated students.';
  end if;

  select count(*)
  into v_roster_rows
  from public.students s
  where s.grade_id = p_grade_id
    and (s.is_active is null or s.is_active = true);

  if v_roster_rows = 0 then
    raise exception 'No active students found for the selected grade.';
  end if;

  if exists (
    with payload as (
      select p.student_id
      from jsonb_to_recordset(p_rows) as p(
        student_id uuid,
        status public.attendance_status_enum,
        justification_note text
      )
    ),
    roster as (
      select s.id as student_id
      from public.students s
      where s.grade_id = p_grade_id
        and (s.is_active is null or s.is_active = true)
    )
    select 1
    from roster r
    left join payload p
      on p.student_id = r.student_id
    where p.student_id is null
  ) then
    raise exception 'Attendance payload is incomplete: every active student in the grade must be marked.';
  end if;

  if exists (
    with payload as (
      select p.student_id
      from jsonb_to_recordset(p_rows) as p(
        student_id uuid,
        status public.attendance_status_enum,
        justification_note text
      )
    ),
    roster as (
      select s.id as student_id
      from public.students s
      where s.grade_id = p_grade_id
        and (s.is_active is null or s.is_active = true)
    )
    select 1
    from payload p
    left join roster r
      on r.student_id = p.student_id
    where r.student_id is null
  ) then
    raise exception 'Attendance payload includes students outside the selected grade.';
  end if;

  delete from public.student_attendance sa
  where sa.attendance_date = p_attendance_date
    and sa.grade_id = p_grade_id
    and sa.subject_id = p_subject_id
    and sa.teacher_id = p_teacher_id;

  insert into public.student_attendance (
    attendance_date,
    period_id,
    grade_id,
    subject_id,
    teacher_id,
    student_id,
    status,
    justification_note
  )
  select
    p_attendance_date,
    v_period_id,
    p_grade_id,
    p_subject_id,
    p_teacher_id,
    payload.student_id,
    payload.status,
    case
      when payload.status = 'justified'::public.attendance_status_enum
        then nullif(btrim(payload.justification_note), '')
      else null
    end
  from jsonb_to_recordset(p_rows) as payload(
    student_id uuid,
    status public.attendance_status_enum,
    justification_note text
  );

  get diagnostics v_inserted_rows = row_count;

  return v_inserted_rows;
end;
$function$;

alter table public.student_attendance enable row level security;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'student_attendance'
  loop
    execute format('drop policy %I on public.student_attendance', policy_row.policyname);
  end loop;
end
$$;

create policy student_attendance_select_managers
on public.student_attendance
for select
to authenticated
using (
  public.can_manage_attendance_context(teacher_id, grade_id, subject_id)
);

grant usage on type public.attendance_status_enum to authenticated;
grant select on public.student_attendance to authenticated;
revoke insert, update, delete on public.student_attendance from authenticated;
grant execute on function public.can_manage_attendance_context(uuid, uuid, uuid) to authenticated;
grant execute on function public.save_student_attendance(date, uuid, uuid, uuid, jsonb) to authenticated;

commit;
