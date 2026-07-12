begin;

-- ============================================================
-- Allow "contable" role to fully manage students and view grades
-- ============================================================
-- Contables need to see what grade a student belongs to, filter by grade,
-- and register new students.

-- 1. public.grades (SELECT)
drop policy if exists grades_select_contable on public.grades;
create policy grades_select_contable
on public.grades
for select
to authenticated
using (public.is_user_contable());

-- 2. public.students (INSERT, UPDATE, DELETE)
-- Note: students_select_contable was already created in a previous migration.
drop policy if exists students_insert_contable on public.students;
create policy students_insert_contable
on public.students
for insert
to authenticated
with check (public.is_user_contable());

drop policy if exists students_update_contable on public.students;
create policy students_update_contable
on public.students
for update
to authenticated
using (public.is_user_contable())
with check (public.is_user_contable());

drop policy if exists students_delete_contable on public.students;
create policy students_delete_contable
on public.students
for delete
to authenticated
using (public.is_user_contable());

commit;
