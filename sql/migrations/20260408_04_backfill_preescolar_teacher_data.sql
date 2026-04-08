begin;

-- 1) Backfill teacher_grade_assignments from existing preescolar rows that
-- already have a teacher_id but fail the grade-assignment rule.
insert into public.teacher_grade_assignments (teacher_id, grade_id)
select distinct
  pe.teacher_id,
  s.grade_id
from public.preescolar_evaluations pe
join public.students s
  on s.id = pe.student_id
where pe.teacher_id is not null
  and s.grade_id is not null
  and not exists (
    select 1
    from public.teacher_grade_assignments tga
    where tga.teacher_id = pe.teacher_id
      and tga.grade_id = s.grade_id
  );

-- 2) Fill missing teacher_id only when the student's grade has exactly one
-- assigned teacher. This avoids guessing when multiple teachers are attached
-- to the same grade.
with one_teacher_per_grade as (
  select
    tga.grade_id,
    (array_agg(distinct tga.teacher_id))[1] as teacher_id
  from public.teacher_grade_assignments tga
  group by tga.grade_id
  having count(distinct tga.teacher_id) = 1
)
update public.preescolar_evaluations pe
set
  teacher_id = otg.teacher_id,
  updated_at = now()
from public.students s
join one_teacher_per_grade otg
  on otg.grade_id = s.grade_id
where pe.student_id = s.id
  and pe.teacher_id is null;

commit;

-- 3) Re-run this query after the update. If it returns rows, those remaining
-- cases need manual review because the grade has multiple candidate teachers
-- or no teacher assignment at all.
select
  pe.id,
  pe.student_id,
  s.full_name as student_name,
  g.name as grade_name,
  pe.dimension,
  pe.period_id,
  pe.teacher_id,
  t.full_name as teacher_name,
  pe.created_at
from public.preescolar_evaluations pe
join public.students s
  on s.id = pe.student_id
left join public.grades g
  on g.id = s.grade_id
left join public.teachers t
  on t.id = pe.teacher_id
where pe.teacher_id is null
   or not exists (
     select 1
     from public.teacher_grade_assignments tga
     where tga.teacher_id = pe.teacher_id
       and tga.grade_id = s.grade_id
   )
order by g.level nulls last, s.full_name, pe.dimension;
