begin;

drop policy if exists students_select_contable on public.students;

create policy students_select_contable
on public.students
for select
to authenticated
using (public.is_user_contable());

commit;
