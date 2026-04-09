begin;

alter table public.students
  add column if not exists address text,
  add column if not exists birth_date date;

comment on column public.students.address is
'Family home address used by the guardian portal.';

comment on column public.students.birth_date is
'Student birth date completed or updated from the guardian profile.';

create table if not exists public.student_guardian_accounts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete cascade,
  user_id uuid not null unique,
  username text not null,
  must_change_password boolean not null default true,
  onboarding_completed_at timestamp with time zone,
  last_credentials_issued_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint student_guardian_accounts_username_not_blank
    check (char_length(btrim(username)) >= 3)
);

create unique index if not exists student_guardian_accounts_username_lower_key
  on public.student_guardian_accounts (lower(username));

comment on table public.student_guardian_accounts is
'Maps one guardian portal account to one student. Auth uses a synthetic email internally, but the visible credential is the username.';

create or replace function public.touch_student_guardian_accounts_updated_at()
returns trigger
language plpgsql
set search_path = 'public'
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists student_guardian_accounts_set_updated_at
on public.student_guardian_accounts;

create trigger student_guardian_accounts_set_updated_at
before update on public.student_guardian_accounts
for each row
execute function public.touch_student_guardian_accounts_updated_at();

create or replace function public.is_user_parent()
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $function$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'parent'::public.user_role_enum
  );
$function$;

create or replace function public.update_guardian_profile(
  p_guardian_name text,
  p_guardian_phone text,
  p_address text,
  p_birth_date date,
  p_mark_onboarding_complete boolean default false
)
returns public.student_guardian_accounts
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_account public.student_guardian_accounts%rowtype;
  v_guardian_name text;
  v_guardian_phone text;
  v_address text;
begin
  if not public.is_user_parent() then
    raise exception 'Only guardian accounts can update this profile.';
  end if;

  select *
  into v_account
  from public.student_guardian_accounts sga
  where sga.user_id = auth.uid();

  if not found then
    raise exception 'No guardian account is linked to the current user.';
  end if;

  v_guardian_name := nullif(btrim(coalesce(p_guardian_name, '')), '');
  v_guardian_phone := nullif(btrim(coalesce(p_guardian_phone, '')), '');
  v_address := nullif(btrim(coalesce(p_address, '')), '');

  update public.students
  set guardian_name = v_guardian_name,
      guardian_phone = v_guardian_phone,
      address = v_address,
      birth_date = p_birth_date,
      updated_at = now()
  where id = v_account.student_id;

  update public.profiles
  set full_name = coalesce(v_guardian_name, full_name),
      phone = v_guardian_phone,
      updated_at = now()
  where user_id = auth.uid();

  update public.student_guardian_accounts
  set must_change_password = case
        when p_mark_onboarding_complete then false
        else must_change_password
      end,
      onboarding_completed_at = case
        when p_mark_onboarding_complete then coalesce(onboarding_completed_at, now())
        else onboarding_completed_at
      end,
      updated_at = now()
  where id = v_account.id
  returning *
  into v_account;

  return v_account;
end;
$function$;

grant execute on function public.update_guardian_profile(text, text, text, date, boolean) to authenticated;

alter table public.academic_periods enable row level security;
alter table public.grades enable row level security;
alter table public.schedules enable row level security;
alter table public.student_guardian_accounts enable row level security;
alter table public.subjects enable row level security;

drop policy if exists student_guardian_accounts_select_rector on public.student_guardian_accounts;
drop policy if exists student_guardian_accounts_select_parent_self on public.student_guardian_accounts;
drop policy if exists student_guardian_accounts_update_rector on public.student_guardian_accounts;
drop policy if exists student_guardian_accounts_delete_rector on public.student_guardian_accounts;
drop policy if exists student_guardian_accounts_insert_rector on public.student_guardian_accounts;

create policy student_guardian_accounts_select_rector
on public.student_guardian_accounts
for select
to authenticated
using (public.is_user_rector());

create policy student_guardian_accounts_select_parent_self
on public.student_guardian_accounts
for select
to authenticated
using (user_id = auth.uid());

create policy student_guardian_accounts_insert_rector
on public.student_guardian_accounts
for insert
to authenticated
with check (public.is_user_rector());

create policy student_guardian_accounts_update_rector
on public.student_guardian_accounts
for update
to authenticated
using (public.is_user_rector())
with check (public.is_user_rector());

create policy student_guardian_accounts_delete_rector
on public.student_guardian_accounts
for delete
to authenticated
using (public.is_user_rector());

drop policy if exists students_select_parent_own on public.students;

create policy students_select_parent_own
on public.students
for select
to authenticated
using (
  public.is_user_parent()
  and exists (
    select 1
    from public.student_guardian_accounts sga
    where sga.user_id = auth.uid()
      and sga.student_id = students.id
  )
);

drop policy if exists grade_records_select_parent_own_student on public.grade_records;

create policy grade_records_select_parent_own_student
on public.grade_records
for select
to authenticated
using (
  public.is_user_parent()
  and exists (
    select 1
    from public.student_guardian_accounts sga
    where sga.user_id = auth.uid()
      and sga.student_id = grade_records.student_id
  )
);

drop policy if exists preescolar_select_parent_own_student on public.preescolar_evaluations;

create policy preescolar_select_parent_own_student
on public.preescolar_evaluations
for select
to authenticated
using (
  public.is_user_parent()
  and exists (
    select 1
    from public.student_guardian_accounts sga
    where sga.user_id = auth.uid()
      and sga.student_id = preescolar_evaluations.student_id
  )
);

drop policy if exists schedules_select_parent_grade on public.schedules;

create policy schedules_select_parent_grade
on public.schedules
for select
to authenticated
using (
  public.is_user_parent()
  and exists (
    select 1
    from public.student_guardian_accounts sga
    join public.students s
      on s.id = sga.student_id
    where sga.user_id = auth.uid()
      and s.grade_id = schedules.grade_id
  )
);

drop policy if exists academic_periods_select_parent on public.academic_periods;

create policy academic_periods_select_parent
on public.academic_periods
for select
to authenticated
using (public.is_user_parent());

drop policy if exists grades_select_parent on public.grades;

create policy grades_select_parent
on public.grades
for select
to authenticated
using (
  public.is_user_parent()
  and exists (
    select 1
    from public.student_guardian_accounts sga
    join public.students s
      on s.id = sga.student_id
    where sga.user_id = auth.uid()
      and s.grade_id = grades.id
  )
);

drop policy if exists subjects_select_parent on public.subjects;

create policy subjects_select_parent
on public.subjects
for select
to authenticated
using (public.is_user_parent());

grant select on public.academic_periods to authenticated;
grant select on public.grade_records to authenticated;
grant select on public.grades to authenticated;
grant select on public.preescolar_evaluations to authenticated;
grant select on public.schedules to authenticated;
grant select on public.student_guardian_accounts to authenticated;
grant select on public.students to authenticated;
grant select on public.subjects to authenticated;

commit;
