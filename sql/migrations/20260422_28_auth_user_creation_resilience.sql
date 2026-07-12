begin;

create or replace function public.provider_link_rector_by_email(
  p_institution_id uuid,
  p_email text,
  p_make_default boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_email text;
  v_name text;
  v_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user is required.';
  end if;

  if not public.is_provider_owner() then
    raise exception 'Only provider owners can link rector users.';
  end if;

  if not exists (
    select 1
    from public.institutions i
    where i.id = p_institution_id
  ) then
    raise exception 'Institution does not exist.';
  end if;

  v_email := lower(nullif(btrim(p_email), ''));
  if v_email is null then
    raise exception 'Email is required.';
  end if;

  select p.user_id
  into v_user_id
  from public.profiles p
  where lower(p.email) = v_email
  limit 1;

  if v_user_id is null then
    select au.id
    into v_user_id
    from auth.users au
    where lower(au.email) = v_email
    limit 1;
  end if;

  if v_user_id is null then
    raise exception 'No existe usuario % en auth.users', v_email;
  end if;

  select p.full_name
  into v_name
  from public.profiles p
  where p.user_id = v_user_id
  limit 1;

  if v_name is null then
    select nullif(btrim(au.raw_user_meta_data ->> 'full_name'), '')
    into v_name
    from auth.users au
    where au.id = v_user_id
    limit 1;
  end if;

  if v_name is null then
    v_name := split_part(v_email, '@', 1);
  end if;

  insert into public.profiles (user_id, full_name, email, institution_id)
  values (v_user_id, v_name, v_email, p_institution_id)
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        institution_id = excluded.institution_id,
        updated_at = now();

  insert into public.institution_memberships (institution_id, user_id, role, is_default)
  values (p_institution_id, v_user_id, 'rector'::public.user_role_enum, p_make_default)
  on conflict (institution_id, user_id, role) do update
    set is_default = excluded.is_default;

  if p_make_default then
    update public.institution_memberships
    set is_default = false
    where user_id = v_user_id
      and institution_id <> p_institution_id
      and is_default = true;
  end if;

  delete from public.user_roles
  where user_id = v_user_id;

  insert into public.user_roles (user_id, role, institution_id)
  values (v_user_id, 'rector'::public.user_role_enum, p_institution_id);

  delete from public.teachers
  where user_id = v_user_id;

  insert into public.provider_audit_logs (
    actor_user_id,
    action,
    table_name,
    record_id,
    institution_id,
    details
  )
  values (
    auth.uid(),
    'link_rector_by_email',
    'institution_memberships',
    v_user_id::text,
    p_institution_id,
    jsonb_build_object('email', v_email, 'make_default', p_make_default)
  );

  return v_user_id;
end;
$function$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_role text;
  v_name text;
  v_institution_raw text;
  v_target_institution uuid;
begin
  v_role := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'profesor');
  if v_role not in ('rector', 'profesor', 'parent', 'contable') then
    v_role := 'profesor';
  end if;

  v_name := nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '');
  if v_name is null then
    v_name := split_part(coalesce(new.email, 'Usuario Nuevo'), '@', 1);
  end if;

  v_institution_raw := nullif(new.raw_user_meta_data ->> 'institution_id', '');
  if v_institution_raw is not null and v_institution_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_target_institution := v_institution_raw::uuid;
  end if;

  if v_target_institution is null then
    v_target_institution := public.current_institution_id();
  end if;

  -- This is expected when users are created from Supabase Auth Dashboard (admin/users)
  -- because that flow does not provide institution metadata or tenant session context.
  -- We keep the auth user and defer institutional linkage to ETYMON flows.
  if v_target_institution is null then
    return new;
  end if;

  insert into public.profiles (user_id, full_name, email, institution_id)
  values (new.id, v_name, new.email, v_target_institution)
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        institution_id = excluded.institution_id,
        updated_at = now();

  delete from public.user_roles
  where user_id = new.id;

  insert into public.user_roles (user_id, role, institution_id)
  values (new.id, v_role::public.user_role_enum, v_target_institution);

  insert into public.institution_memberships (institution_id, user_id, role, is_default)
  values (v_target_institution, new.id, v_role::public.user_role_enum, true)
  on conflict (institution_id, user_id, role) do update
    set is_default = true;

  update public.institution_memberships
  set is_default = false
  where user_id = new.id
    and institution_id <> v_target_institution
    and is_default = true;

  if v_role = 'profesor' then
    insert into public.teachers (user_id, full_name, email, is_active, institution_id)
    values (new.id, v_name, new.email, true, v_target_institution)
    on conflict (user_id) do update
      set full_name = excluded.full_name,
          email = excluded.email,
          is_active = true,
          institution_id = excluded.institution_id,
          updated_at = now();
  else
    delete from public.teachers
    where user_id = new.id;
  end if;

  return new;
end;
$function$;

commit;
