begin;

create table if not exists public.provider_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_support_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  reason text not null check (nullif(btrim(reason), '') is not null),
  started_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists provider_support_sessions_active_user_idx
  on public.provider_support_sessions (user_id)
  where ended_at is null;

create index if not exists provider_support_sessions_institution_idx
  on public.provider_support_sessions (institution_id, started_at desc);

create table if not exists public.provider_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id text,
  institution_id uuid references public.institutions(id) on delete set null,
  old_values jsonb,
  new_values jsonb,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists provider_audit_logs_created_at_idx
  on public.provider_audit_logs (created_at desc);

create index if not exists provider_audit_logs_institution_idx
  on public.provider_audit_logs (institution_id, created_at desc);

create table if not exists public.provider_customer_accounts (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null unique references public.institutions(id) on delete cascade,
  commercial_status text not null default 'active' check (commercial_status in ('lead', 'active', 'paused', 'churned')),
  billing_status text not null default 'pending' check (billing_status in ('pending', 'paid', 'overdue', 'waived')),
  contract_start_date date,
  account_owner_user_id uuid references auth.users(id) on delete set null,
  is_first_customer boolean not null default false,
  display_tag text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_onboarding_checklists (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null unique references public.institutions(id) on delete cascade,
  tenant_created boolean not null default true,
  access_delivered boolean not null default false,
  branding_configured boolean not null default false,
  plan_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.institution_subscriptions
  add column if not exists notes text;

create or replace function public.touch_provider_updated_at()
returns trigger
language plpgsql
set search_path = 'public'
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists provider_users_set_updated_at on public.provider_users;
create trigger provider_users_set_updated_at
before update on public.provider_users
for each row
execute function public.touch_provider_updated_at();

drop trigger if exists provider_customer_accounts_set_updated_at on public.provider_customer_accounts;
create trigger provider_customer_accounts_set_updated_at
before update on public.provider_customer_accounts
for each row
execute function public.touch_provider_updated_at();

drop trigger if exists provider_onboarding_checklists_set_updated_at on public.provider_onboarding_checklists;
create trigger provider_onboarding_checklists_set_updated_at
before update on public.provider_onboarding_checklists
for each row
execute function public.touch_provider_updated_at();

drop trigger if exists institution_subscriptions_set_updated_at on public.institution_subscriptions;
create trigger institution_subscriptions_set_updated_at
before update on public.institution_subscriptions
for each row
execute function public.touch_institution_updated_at();

create or replace function public.is_provider_owner()
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $function$
  select exists (
    select 1
    from public.provider_users pu
    where pu.user_id = auth.uid()
      and pu.role = 'owner'
      and pu.is_active
  );
$function$;

create or replace function public.current_institution_id()
returns uuid
language plpgsql
stable
security definer
set search_path = 'public'
as $function$
declare
  v_claim text;
  v_claim_id uuid;
  v_membership_institution uuid;
  v_provider_institution uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  if public.is_provider_owner() then
    select pss.institution_id
    into v_provider_institution
    from public.provider_support_sessions pss
    join public.institutions i
      on i.id = pss.institution_id
    where pss.user_id = auth.uid()
      and pss.ended_at is null
      and i.is_active
    order by pss.started_at desc
    limit 1;

    return v_provider_institution;
  end if;

  v_claim := nullif(auth.jwt() ->> 'institution_id', '');
  if v_claim is not null and v_claim ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_claim_id := v_claim::uuid;

    if exists (
      select 1
      from public.institution_memberships im
      where im.user_id = auth.uid()
        and im.institution_id = v_claim_id
    ) then
      return v_claim_id;
    end if;
  end if;

  select im.institution_id
  into v_membership_institution
  from public.institution_memberships im
  where im.user_id = auth.uid()
  order by im.is_default desc, im.created_at asc
  limit 1;

  return v_membership_institution;
end;
$function$;

create or replace function public.provider_get_support_context()
returns table(
  session_id uuid,
  institution_id uuid,
  institution_slug text,
  institution_name text,
  reason text,
  started_at timestamptz,
  last_used_at timestamptz
)
language sql
stable
security definer
set search_path = 'public'
as $function$
  select
    pss.id,
    pss.institution_id,
    i.slug,
    i.name,
    pss.reason,
    pss.started_at,
    pss.last_used_at
  from public.provider_support_sessions pss
  join public.institutions i
    on i.id = pss.institution_id
  where pss.user_id = auth.uid()
    and pss.ended_at is null
  order by pss.started_at desc
  limit 1;
$function$;

create or replace function public.provider_set_institution_context(
  p_institution_id uuid,
  p_reason text
)
returns public.provider_support_sessions
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_session public.provider_support_sessions;
  v_reason text;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user is required.';
  end if;

  if not public.is_provider_owner() then
    raise exception 'Only provider owners can set support context.';
  end if;

  v_reason := nullif(btrim(p_reason), '');
  if v_reason is null then
    raise exception 'Support reason is required.';
  end if;

  if not exists (
    select 1
    from public.institutions i
    where i.id = p_institution_id
      and i.is_active
  ) then
    raise exception 'Institution does not exist or is inactive.';
  end if;

  update public.provider_support_sessions
  set ended_at = now(),
      last_used_at = now()
  where user_id = auth.uid()
    and ended_at is null;

  insert into public.provider_support_sessions (
    user_id,
    institution_id,
    reason
  )
  values (
    auth.uid(),
    p_institution_id,
    v_reason
  )
  returning *
  into v_session;

  insert into public.provider_audit_logs (
    actor_user_id,
    action,
    table_name,
    record_id,
    institution_id,
    details,
    new_values
  )
  values (
    auth.uid(),
    'support_context_set',
    'provider_support_sessions',
    v_session.id::text,
    v_session.institution_id,
    jsonb_build_object('reason', v_reason),
    to_jsonb(v_session)
  );

  return v_session;
end;
$function$;

create or replace function public.provider_clear_institution_context()
returns boolean
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_session public.provider_support_sessions;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user is required.';
  end if;

  if not public.is_provider_owner() then
    raise exception 'Only provider owners can clear support context.';
  end if;

  select *
  into v_session
  from public.provider_support_sessions pss
  where pss.user_id = auth.uid()
    and pss.ended_at is null
  order by pss.started_at desc
  limit 1;

  if v_session.id is null then
    return false;
  end if;

  update public.provider_support_sessions
  set ended_at = now(),
      last_used_at = now()
  where id = v_session.id;

  insert into public.provider_audit_logs (
    actor_user_id,
    action,
    table_name,
    record_id,
    institution_id,
    details,
    old_values
  )
  values (
    auth.uid(),
    'support_context_cleared',
    'provider_support_sessions',
    v_session.id::text,
    v_session.institution_id,
    jsonb_build_object('reason', v_session.reason),
    to_jsonb(v_session)
  );

  return true;
end;
$function$;

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
    raise exception 'No profile found for email %', v_email;
  end if;

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

  update public.profiles
  set institution_id = p_institution_id
  where user_id = v_user_id;

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

create or replace function public.provider_create_institution(
  p_slug text,
  p_name text,
  p_display_name text default null,
  p_plan_id uuid default null,
  p_subscription_status text default 'trialing',
  p_period_start date default null,
  p_period_end date default null,
  p_billing_status text default 'pending',
  p_contract_start_date date default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_slug text;
  v_name text;
  v_institution_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user is required.';
  end if;

  if not public.is_provider_owner() then
    raise exception 'Only provider owners can create institutions.';
  end if;

  v_slug := lower(nullif(btrim(p_slug), ''));
  v_name := nullif(btrim(p_name), '');

  if v_slug is null then
    raise exception 'Slug is required.';
  end if;

  if v_name is null then
    raise exception 'Name is required.';
  end if;

  insert into public.institutions (slug, name, is_active)
  values (v_slug, v_name, true)
  returning id
  into v_institution_id;

  insert into public.institution_settings (institution_id, display_name)
  values (v_institution_id, coalesce(nullif(btrim(p_display_name), ''), v_name))
  on conflict (institution_id) do update
    set display_name = excluded.display_name;

  if p_plan_id is not null then
    insert into public.institution_subscriptions (
      institution_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      notes
    )
    values (
      v_institution_id,
      p_plan_id,
      coalesce(nullif(btrim(p_subscription_status), ''), 'trialing'),
      coalesce(p_period_start, current_date),
      p_period_end,
      p_notes
    );
  end if;

  insert into public.provider_customer_accounts (
    institution_id,
    commercial_status,
    billing_status,
    contract_start_date,
    account_owner_user_id,
    notes
  )
  values (
    v_institution_id,
    'active',
    coalesce(nullif(btrim(p_billing_status), ''), 'pending'),
    coalesce(p_contract_start_date, current_date),
    auth.uid(),
    p_notes
  )
  on conflict (institution_id) do update
    set billing_status = excluded.billing_status,
        contract_start_date = excluded.contract_start_date,
        account_owner_user_id = excluded.account_owner_user_id,
        notes = excluded.notes;

  insert into public.provider_onboarding_checklists (
    institution_id,
    tenant_created,
    access_delivered,
    branding_configured,
    plan_active
  )
  values (
    v_institution_id,
    true,
    false,
    p_display_name is not null,
    p_plan_id is not null
  )
  on conflict (institution_id) do update
    set tenant_created = true;

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
    'institution_created',
    'institutions',
    v_institution_id::text,
    v_institution_id,
    jsonb_build_object(
      'slug', v_slug,
      'name', v_name,
      'plan_id', p_plan_id,
      'subscription_status', p_subscription_status
    )
  );

  return v_institution_id;
end;
$function$;

create or replace function public.provider_detect_identity_drift()
returns table(
  user_id uuid,
  email text,
  profile_institution uuid,
  role_institution uuid,
  teacher_institution uuid,
  membership_institution uuid,
  is_aligned boolean,
  issue text
)
language sql
stable
security definer
set search_path = 'public'
as $function$
  with profile_rows as (
    select p.user_id, p.email, p.institution_id
    from public.profiles p
  ),
  role_rows as (
    select distinct on (ur.user_id)
      ur.user_id,
      ur.role,
      ur.institution_id
    from public.user_roles ur
    order by ur.user_id, ur.id
  ),
  membership_rows as (
    select distinct on (im.user_id)
      im.user_id,
      im.institution_id
    from public.institution_memberships im
    order by im.user_id, im.is_default desc, im.created_at asc
  ),
  teacher_rows as (
    select t.user_id, t.institution_id
    from public.teachers t
  )
  select
    p.user_id,
    p.email,
    p.institution_id as profile_institution,
    rr.institution_id as role_institution,
    tr.institution_id as teacher_institution,
    mr.institution_id as membership_institution,
    (
      p.institution_id is not null
      and rr.institution_id is not null
      and mr.institution_id is not null
      and p.institution_id = rr.institution_id
      and p.institution_id = mr.institution_id
      and (
        rr.role <> 'profesor'
        or tr.institution_id = p.institution_id
      )
      and (
        rr.role = 'profesor'
        or tr.institution_id is null
      )
    ) as is_aligned,
    case
      when p.institution_id is null then 'profile institution missing'
      when rr.institution_id is null then 'role institution missing'
      when mr.institution_id is null then 'membership institution missing'
      when p.institution_id <> rr.institution_id then 'profile and role mismatch'
      when p.institution_id <> mr.institution_id then 'profile and membership mismatch'
      when rr.role = 'profesor' and tr.institution_id is distinct from p.institution_id then 'teacher institution mismatch'
      when rr.role <> 'profesor' and tr.institution_id is not null then 'unexpected teacher row for non-profesor role'
      else null
    end as issue
  from profile_rows p
  left join role_rows rr
    on rr.user_id = p.user_id
  left join membership_rows mr
    on mr.user_id = p.user_id
  left join teacher_rows tr
    on tr.user_id = p.user_id;
$function$;

create or replace function public.provider_repair_identity_drift(
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_target_institution uuid;
  v_role public.user_role_enum;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user is required.';
  end if;

  if not public.is_provider_owner() then
    raise exception 'Only provider owners can repair identity drift.';
  end if;

  select im.institution_id
  into v_target_institution
  from public.institution_memberships im
  where im.user_id = p_user_id
  order by im.is_default desc, im.created_at asc
  limit 1;

  if v_target_institution is null then
    return false;
  end if;

  select ur.role
  into v_role
  from public.user_roles ur
  where ur.user_id = p_user_id
  order by ur.id
  limit 1;

  if v_role is null then
    v_role := 'profesor'::public.user_role_enum;
  end if;

  update public.profiles
  set institution_id = v_target_institution,
      updated_at = now()
  where user_id = p_user_id;

  update public.user_roles
  set institution_id = v_target_institution
  where user_id = p_user_id;

  if v_role = 'profesor'::public.user_role_enum then
    update public.teachers
    set institution_id = v_target_institution,
        updated_at = now()
    where user_id = p_user_id;
  else
    delete from public.teachers
    where user_id = p_user_id;
  end if;

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
    'identity_drift_repaired',
    'profiles',
    p_user_id::text,
    v_target_institution,
    jsonb_build_object('role', v_role)
  );

  return true;
end;
$function$;

create or replace function public.provider_capture_audit()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_row jsonb;
  v_institution_id uuid;
  v_record_id text;
begin
  if auth.uid() is null or not public.is_provider_owner() then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  v_row := coalesce(to_jsonb(new), to_jsonb(old));

  if v_row ? 'institution_id' then
    begin
      v_institution_id := nullif(v_row ->> 'institution_id', '')::uuid;
    exception
      when others then
        v_institution_id := null;
    end;
  elsif tg_table_name = 'institutions' and v_row ? 'id' then
    begin
      v_institution_id := nullif(v_row ->> 'id', '')::uuid;
    exception
      when others then
        v_institution_id := null;
    end;
  end if;

  if v_row ? 'id' then
    v_record_id := v_row ->> 'id';
  end if;

  insert into public.provider_audit_logs (
    actor_user_id,
    action,
    table_name,
    record_id,
    institution_id,
    old_values,
    new_values
  )
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    v_record_id,
    v_institution_id,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

drop trigger if exists provider_audit_institutions on public.institutions;
create trigger provider_audit_institutions
after insert or update or delete on public.institutions
for each row execute function public.provider_capture_audit();

drop trigger if exists provider_audit_institution_settings on public.institution_settings;
create trigger provider_audit_institution_settings
after insert or update or delete on public.institution_settings
for each row execute function public.provider_capture_audit();

drop trigger if exists provider_audit_institution_memberships on public.institution_memberships;
create trigger provider_audit_institution_memberships
after insert or update or delete on public.institution_memberships
for each row execute function public.provider_capture_audit();

drop trigger if exists provider_audit_institution_subscriptions on public.institution_subscriptions;
create trigger provider_audit_institution_subscriptions
after insert or update or delete on public.institution_subscriptions
for each row execute function public.provider_capture_audit();

drop trigger if exists provider_audit_provider_customer_accounts on public.provider_customer_accounts;
create trigger provider_audit_provider_customer_accounts
after insert or update or delete on public.provider_customer_accounts
for each row execute function public.provider_capture_audit();

drop trigger if exists provider_audit_provider_onboarding_checklists on public.provider_onboarding_checklists;
create trigger provider_audit_provider_onboarding_checklists
after insert or update or delete on public.provider_onboarding_checklists
for each row execute function public.provider_capture_audit();

drop trigger if exists provider_audit_provider_support_sessions on public.provider_support_sessions;
create trigger provider_audit_provider_support_sessions
after insert or update or delete on public.provider_support_sessions
for each row execute function public.provider_capture_audit();

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

  if v_target_institution is null then
    raise exception 'Institution context is required for new users.';
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

do $$
declare
  v_iabc_id uuid := '11111111-1111-1111-1111-111111111111'::uuid;
begin
  if exists (
    select 1
    from public.institutions i
    where i.id = v_iabc_id
  ) then
    insert into public.provider_customer_accounts (
      institution_id,
      commercial_status,
      billing_status,
      contract_start_date,
      is_first_customer,
      display_tag,
      notes
    )
    values (
      v_iabc_id,
      'active',
      'pending',
      current_date,
      true,
      'Cliente #1',
      'Cliente inicial migrado a ETYMON'
    )
    on conflict (institution_id) do update
      set commercial_status = excluded.commercial_status,
          is_first_customer = true,
          display_tag = excluded.display_tag;

    insert into public.provider_onboarding_checklists (
      institution_id,
      tenant_created,
      access_delivered,
      branding_configured,
      plan_active
    )
    values (
      v_iabc_id,
      true,
      true,
      true,
      true
    )
    on conflict (institution_id) do update
      set tenant_created = true,
          plan_active = true;
  end if;
end
$$;

alter table public.provider_users enable row level security;
alter table public.provider_support_sessions enable row level security;
alter table public.provider_audit_logs enable row level security;
alter table public.provider_customer_accounts enable row level security;
alter table public.provider_onboarding_checklists enable row level security;

drop policy if exists provider_users_select_self on public.provider_users;
create policy provider_users_select_self
on public.provider_users
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists provider_support_sessions_owner_all on public.provider_support_sessions;
create policy provider_support_sessions_owner_all
on public.provider_support_sessions
for all
to authenticated
using (public.is_provider_owner())
with check (public.is_provider_owner());

drop policy if exists provider_audit_logs_owner_select on public.provider_audit_logs;
create policy provider_audit_logs_owner_select
on public.provider_audit_logs
for select
to authenticated
using (public.is_provider_owner());

drop policy if exists provider_customer_accounts_owner_all on public.provider_customer_accounts;
create policy provider_customer_accounts_owner_all
on public.provider_customer_accounts
for all
to authenticated
using (public.is_provider_owner())
with check (public.is_provider_owner());

drop policy if exists provider_onboarding_checklists_owner_all on public.provider_onboarding_checklists;
create policy provider_onboarding_checklists_owner_all
on public.provider_onboarding_checklists
for all
to authenticated
using (public.is_provider_owner())
with check (public.is_provider_owner());

drop policy if exists institutions_provider_owner_all on public.institutions;
create policy institutions_provider_owner_all
on public.institutions
for all
to authenticated
using (public.is_provider_owner())
with check (public.is_provider_owner());

drop policy if exists institution_settings_provider_owner_all on public.institution_settings;
create policy institution_settings_provider_owner_all
on public.institution_settings
for all
to authenticated
using (public.is_provider_owner())
with check (public.is_provider_owner());

drop policy if exists institution_memberships_provider_owner_all on public.institution_memberships;
create policy institution_memberships_provider_owner_all
on public.institution_memberships
for all
to authenticated
using (public.is_provider_owner())
with check (public.is_provider_owner());

drop policy if exists subscription_plans_provider_owner_all on public.subscription_plans;
create policy subscription_plans_provider_owner_all
on public.subscription_plans
for all
to authenticated
using (public.is_provider_owner())
with check (public.is_provider_owner());

drop policy if exists institution_subscriptions_provider_owner_all on public.institution_subscriptions;
create policy institution_subscriptions_provider_owner_all
on public.institution_subscriptions
for all
to authenticated
using (public.is_provider_owner())
with check (public.is_provider_owner());

drop policy if exists usage_events_provider_owner_all on public.usage_events;
create policy usage_events_provider_owner_all
on public.usage_events
for all
to authenticated
using (public.is_provider_owner())
with check (public.is_provider_owner());

grant select on public.provider_users to authenticated;
grant select, insert, update, delete on public.provider_support_sessions to authenticated;
grant select on public.provider_audit_logs to authenticated;
grant select, insert, update, delete on public.provider_customer_accounts to authenticated;
grant select, insert, update, delete on public.provider_onboarding_checklists to authenticated;
grant execute on function public.is_provider_owner() to authenticated;
grant execute on function public.provider_get_support_context() to authenticated;
grant execute on function public.provider_set_institution_context(uuid, text) to authenticated;
grant execute on function public.provider_clear_institution_context() to authenticated;
grant execute on function public.provider_link_rector_by_email(uuid, text, boolean) to authenticated;
grant execute on function public.provider_create_institution(text, text, text, uuid, text, date, date, text, date, text) to authenticated;
grant execute on function public.provider_detect_identity_drift() to authenticated;
grant execute on function public.provider_repair_identity_drift(uuid) to authenticated;

commit;
