begin;

-- ============================================================
-- Allow "contable" role to view teachers and their assignments
-- ============================================================
-- The new dynamic permission system allows the "contable" role
-- to be granted access to the "Profesores" module.
-- However, Row Level Security (RLS) on the teachers table
-- previously only allowed "rector" (and "profesor" for their own records).
-- We need to add explicit SELECT policies for "contable".

-- 1. public.teachers
drop policy if exists teachers_select_contable on public.teachers;
create policy teachers_select_contable
on public.teachers
for select
to authenticated
using (public.is_user_contable());

-- 2. public.teacher_subjects
drop policy if exists teacher_subjects_select_contable on public.teacher_subjects;
create policy teacher_subjects_select_contable
on public.teacher_subjects
for select
to authenticated
using (public.is_user_contable());

-- 3. public.teacher_grade_assignments
drop policy if exists teacher_grade_assignments_select_contable on public.teacher_grade_assignments;
create policy teacher_grade_assignments_select_contable
on public.teacher_grade_assignments
for select
to authenticated
using (public.is_user_contable());

commit;
