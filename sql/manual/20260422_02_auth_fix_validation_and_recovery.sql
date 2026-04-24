-- Post-fix validation and recovery guide for:
-- 20260422_28_auth_user_creation_resilience.sql
-- 20260422_29_provider_assign_user_role_by_email.sql

-- 1) Verify both functions exist.
select
  fn.function_name,
  case when exists (
    select 1
    from information_schema.routines r
    where r.routine_schema = 'public'
      and r.routine_name = fn.function_name
  ) then 'OK' else 'MISSING' end as status
from (
  values
    ('handle_new_user'),
    ('provider_assign_user_role_by_email'),
    ('provider_link_rector_by_email')
) as fn(function_name)
order by fn.function_name;

-- 2) Ensure handle_new_user no longer hard-fails when institution context is missing.
select
  case
    when position('Institution context is required for new users.' in pg_get_functiondef('public.handle_new_user()'::regprocedure)) > 0
      then 'STALE_FUNCTION_NEEDS_FIX'
    else 'OK'
  end as handle_new_user_status,
  case
    when position('if v_target_institution is null then' in pg_get_functiondef('public.handle_new_user()'::regprocedure)) > 0
      then 'HAS_NULL_CONTEXT_GUARD'
    else 'MISSING_NULL_CONTEXT_GUARD'
  end as null_context_guard;

-- 3) Find users created in auth.users without profile rows (normal if created from Auth dashboard).
select
  au.id as user_id,
  au.email,
  au.created_at
from auth.users au
left join public.profiles p
  on p.user_id = au.id
where p.user_id is null
order by au.created_at desc;

-- 4) Cross-table alignment check (after assignments).
-- If issue is null and is_aligned = true, user is healthy.
select
  user_id,
  email,
  profile_institution,
  role_institution,
  teacher_institution,
  membership_institution,
  is_aligned,
  issue
from public.provider_detect_identity_drift()
order by is_aligned asc, email asc;

-- 5) Optional emergency SQL-only assignment (use only when not assigning from ETYMON UI).
-- Replace the 3 values below before running.
-- This path does not depend on auth.uid() and avoids ON CONFLICT constraints
-- so it can run even in drifted schemas.
do $$
declare
  v_email text := lower('REPLACE_EMAIL@example.com');
  v_institution_id uuid := '11111111-1111-1111-1111-111111111111'::uuid;
  v_role public.user_role_enum := 'rector'::public.user_role_enum;
  v_user_id uuid;
  v_full_name text;
begin
  if v_role not in ('rector', 'profesor', 'parent', 'contable') then
    raise exception 'Role % is not allowed.', v_role;
  end if;

  select
    au.id,
    coalesce(
      nullif(btrim(au.raw_user_meta_data ->> 'full_name'), ''),
      split_part(lower(au.email), '@', 1)
    )
  into v_user_id, v_full_name
  from auth.users au
  where lower(au.email) = v_email
  limit 1;

  if v_user_id is null then
    raise exception 'No existe usuario % en auth.users', v_email;
  end if;

  update public.profiles
  set full_name = v_full_name,
      email = v_email,
      institution_id = v_institution_id,
      updated_at = now()
  where user_id = v_user_id;

  if not found then
    insert into public.profiles (user_id, full_name, email, institution_id)
    values (v_user_id, v_full_name, v_email, v_institution_id);
  end if;

  delete from public.user_roles
  where user_id = v_user_id;

  insert into public.user_roles (user_id, role, institution_id)
  values (v_user_id, v_role, v_institution_id);

  update public.institution_memberships
  set is_default = true
  where institution_id = v_institution_id
    and user_id = v_user_id
    and role = v_role;

  if not found then
    insert into public.institution_memberships (institution_id, user_id, role, is_default)
    values (v_institution_id, v_user_id, v_role, true);
  end if;

  update public.institution_memberships
  set is_default = false
  where user_id = v_user_id
    and institution_id <> v_institution_id
    and is_default = true;

  if v_role = 'profesor' then
    update public.teachers
    set full_name = v_full_name,
        email = v_email,
        is_active = true,
        institution_id = v_institution_id,
        updated_at = now()
    where user_id = v_user_id;

    if not found then
      insert into public.teachers (user_id, full_name, email, is_active, institution_id)
      values (v_user_id, v_full_name, v_email, true, v_institution_id);
    end if;
  else
    delete from public.teachers
    where user_id = v_user_id;
  end if;

  raise notice 'ASSIGNMENT_APPLIED user_id=% email=% role=% institution_id=%',
    v_user_id, v_email, v_role, v_institution_id;
end
$$;
