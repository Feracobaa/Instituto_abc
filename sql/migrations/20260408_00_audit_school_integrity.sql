-- Audit first. Do not change data in this file.
-- Goal: detect rows that would block stricter RLS or the new schedules constraint.

select
  'grade_records_without_teacher' as check_name,
  count(*) as affected_rows
from public.grade_records
where teacher_id is null

union all

select
  'grade_records_teacher_without_grade_assignment' as check_name,
  count(*) as affected_rows
from public.grade_records gr
where not exists (
  select 1
  from public.students s
  join public.teacher_grade_assignments tga
    on tga.grade_id = s.grade_id
  where s.id = gr.student_id
    and tga.teacher_id = gr.teacher_id
)

union all

select
  'grade_records_teacher_without_subject_assignment' as check_name,
  count(*) as affected_rows
from public.grade_records gr
where not exists (
  select 1
  from public.teacher_subjects ts
  where ts.teacher_id = gr.teacher_id
    and ts.subject_id = gr.subject_id
)

union all

select
  'preescolar_without_teacher' as check_name,
  count(*) as affected_rows
from public.preescolar_evaluations
where teacher_id is null

union all

select
  'preescolar_teacher_without_grade_assignment' as check_name,
  count(*) as affected_rows
from public.preescolar_evaluations pe
where not exists (
  select 1
  from public.students s
  join public.teacher_grade_assignments tga
    on tga.grade_id = s.grade_id
  where s.id = pe.student_id
    and tga.teacher_id = pe.teacher_id
)

union all

select
  'schedules_ambiguous_blocks' as check_name,
  count(*) as affected_rows
from public.schedules
where not (
  (
    title is not null
    and btrim(title) <> ''
    and subject_id is null
    and teacher_id is null
  )
  or
  (
    subject_id is not null
    and teacher_id is not null
  )
)

union all

select
  'schedules_teacher_without_grade_assignment' as check_name,
  count(*) as affected_rows
from public.schedules s
where s.teacher_id is not null
  and s.grade_id is not null
  and not exists (
    select 1
    from public.teacher_grade_assignments tga
    where tga.teacher_id = s.teacher_id
      and tga.grade_id = s.grade_id
  )

union all

select
  'schedules_teacher_without_subject_assignment' as check_name,
  count(*) as affected_rows
from public.schedules s
where s.teacher_id is not null
  and s.subject_id is not null
  and not exists (
    select 1
    from public.teacher_subjects ts
    where ts.teacher_id = s.teacher_id
      and ts.subject_id = s.subject_id
);

-- Detail rows only if one of the counts above is not zero.

select
  gr.*
from public.grade_records gr
where gr.teacher_id is null
   or not exists (
     select 1
     from public.students s
     join public.teacher_grade_assignments tga
       on tga.grade_id = s.grade_id
     where s.id = gr.student_id
       and tga.teacher_id = gr.teacher_id
   )
   or not exists (
     select 1
     from public.teacher_subjects ts
     where ts.teacher_id = gr.teacher_id
       and ts.subject_id = gr.subject_id
   )
order by gr.created_at desc;

select
  pe.*
from public.preescolar_evaluations pe
where pe.teacher_id is null
   or not exists (
     select 1
     from public.students s
     join public.teacher_grade_assignments tga
       on tga.grade_id = s.grade_id
     where s.id = pe.student_id
       and tga.teacher_id = pe.teacher_id
   )
order by pe.created_at desc;

select
  s.*
from public.schedules s
where (
  not (
    (
      s.title is not null
      and btrim(s.title) <> ''
      and s.subject_id is null
      and s.teacher_id is null
    )
    or
    (
      s.subject_id is not null
      and s.teacher_id is not null
    )
  )
  or (
    s.teacher_id is not null
    and s.grade_id is not null
    and not exists (
      select 1
      from public.teacher_grade_assignments tga
      where tga.teacher_id = s.teacher_id
        and tga.grade_id = s.grade_id
    )
  )
  or (
    s.teacher_id is not null
    and s.subject_id is not null
    and not exists (
      select 1
      from public.teacher_subjects ts
      where ts.teacher_id = s.teacher_id
        and ts.subject_id = s.subject_id
    )
  )
)
order by s.day_of_week, s.start_time;
