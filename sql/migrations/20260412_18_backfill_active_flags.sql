begin;

alter table public.students
  alter column is_active set default true;

alter table public.teachers
  alter column is_active set default true;

update public.students
set is_active = true,
    updated_at = now()
where is_active is null;

update public.teachers
set is_active = true,
    updated_at = now()
where is_active is null;

commit;
