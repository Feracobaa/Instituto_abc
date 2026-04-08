begin;

-- 1) Backfill teacher-grade assignments from existing grade records.
-- If a teacher already has grades with notes, those grades must be part of the
-- official assignment table used by RLS.
insert into public.teacher_grade_assignments (teacher_id, grade_id)
select distinct
  gr.teacher_id,
  s.grade_id
from public.grade_records gr
join public.students s
  on s.id = gr.student_id
where gr.teacher_id is not null
  and s.grade_id is not null
  and not exists (
    select 1
    from public.teacher_grade_assignments tga
    where tga.teacher_id = gr.teacher_id
      and tga.grade_id = s.grade_id
  );

-- 2) Backfill teacher-subject assignments from existing grade records.
-- If a teacher already has notes in a subject, that subject must be reflected
-- in teacher_subjects so the new RLS matches historical reality.
insert into public.teacher_subjects (teacher_id, subject_id)
select distinct
  gr.teacher_id,
  gr.subject_id
from public.grade_records gr
where gr.teacher_id is not null
  and gr.subject_id is not null
  and not exists (
    select 1
    from public.teacher_subjects ts
    where ts.teacher_id = gr.teacher_id
      and ts.subject_id = gr.subject_id
  );

commit;

-- 3) Re-run this query after the inserts. If it still returns rows, those
-- cases need manual review because they are not explainable by missing
-- assignment tables alone.
select
  gr.id,
  gr.student_id,
  s.full_name as student_name,
  g.name as grade_name,
  gr.subject_id,
  sub.name as subject_name,
  gr.teacher_id,
  t.full_name as teacher_name,
  gr.period_id,
  gr.grade,
  gr.created_at
from public.grade_records gr
join public.students s
  on s.id = gr.student_id
left join public.grades g
  on g.id = s.grade_id
left join public.subjects sub
  on sub.id = gr.subject_id
left join public.teachers t
  on t.id = gr.teacher_id
where gr.teacher_id is null
   or gr.subject_id is null
   or not exists (
     select 1
     from public.teacher_grade_assignments tga
     where tga.teacher_id = gr.teacher_id
       and tga.grade_id = s.grade_id
   )
   or not exists (
     select 1
     from public.teacher_subjects ts
     where ts.teacher_id = gr.teacher_id
       and ts.subject_id = gr.subject_id
   )
order by g.level nulls last, t.full_name nulls last, s.full_name, sub.name;
