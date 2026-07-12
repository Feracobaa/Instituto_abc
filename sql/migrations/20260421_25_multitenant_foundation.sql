begin;

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institutions_slug_format_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.institution_settings (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null unique references public.institutions(id) on delete cascade,
  display_name text,
  logo_url text,
  primary_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.institution_memberships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.user_role_enum not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  constraint institution_memberships_unique_role_per_user
    unique (institution_id, user_id, role)
);

create unique index if not exists institution_memberships_one_default_per_user_idx
  on public.institution_memberships (user_id)
  where is_default;

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.institution_subscriptions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  status text not null default 'trialing',
  current_period_start date,
  current_period_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institution_subscriptions_status_check
    check (status in ('trialing', 'active', 'past_due', 'canceled'))
);

create index if not exists institution_subscriptions_institution_idx
  on public.institution_subscriptions (institution_id);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  event_type text not null,
  quantity integer not null default 1 check (quantity > 0),
  reference_id text,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_institution_created_idx
  on public.usage_events (institution_id, created_at desc);

create or replace function public.touch_institution_updated_at()
returns trigger
language plpgsql
set search_path = 'public'
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists institutions_set_updated_at on public.institutions;
create trigger institutions_set_updated_at
before update on public.institutions
for each row
execute function public.touch_institution_updated_at();

drop trigger if exists institution_settings_set_updated_at on public.institution_settings;
create trigger institution_settings_set_updated_at
before update on public.institution_settings
for each row
execute function public.touch_institution_updated_at();

drop trigger if exists subscription_plans_set_updated_at on public.subscription_plans;
create trigger subscription_plans_set_updated_at
before update on public.subscription_plans
for each row
execute function public.touch_institution_updated_at();

drop trigger if exists institution_subscriptions_set_updated_at on public.institution_subscriptions;
create trigger institution_subscriptions_set_updated_at
before update on public.institution_subscriptions
for each row
execute function public.touch_institution_updated_at();

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
begin
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

  if v_membership_institution is not null then
    return v_membership_institution;
  end if;

  select i.id
  into v_membership_institution
  from public.institutions i
  where i.is_active
  order by i.created_at asc
  limit 1;

  return v_membership_institution;
end;
$function$;

create or replace function public.is_user_in_institution(
  p_institution_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $function$
  select exists (
    select 1
    from public.institution_memberships im
    where im.user_id = auth.uid()
      and im.institution_id = p_institution_id
  );
$function$;

create or replace function public.provision_institution(
  p_name text,
  p_slug text
)
returns uuid
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_institution_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user is required.';
  end if;

  if not public.is_user_rector() then
    raise exception 'Only rector users can provision institutions.';
  end if;

  insert into public.institutions (name, slug)
  values (btrim(p_name), lower(btrim(p_slug)))
  returning id
  into v_institution_id;

  insert into public.institution_settings (institution_id, display_name)
  values (v_institution_id, btrim(p_name));

  insert into public.institution_memberships (institution_id, user_id, role, is_default)
  values (v_institution_id, auth.uid(), 'rector'::public.user_role_enum, true)
  on conflict (institution_id, user_id, role) do update
    set is_default = true;

  return v_institution_id;
end;
$function$;

do $$
declare
  v_iabc_id uuid := '11111111-1111-1111-1111-111111111111'::uuid;
  v_table text;
  v_tables text[] := array[
    'academic_periods',
    'profiles',
    'user_roles',
    'teachers',
    'teacher_subjects',
    'teacher_grade_assignments',
    'grades',
    'students',
    'subjects',
    'schedules',
    'grade_records',
    'grade_record_partials',
    'preescolar_evaluations',
    'student_guardian_accounts',
    'student_tuition_profiles',
    'student_tuition_payments',
    'financial_transactions',
    'inventory_items',
    'student_attendance',
    'audit_logs'
  ];
  v_constraint_name text;
begin
  insert into public.institutions (id, slug, name, is_active)
  values (v_iabc_id, 'iabc', 'Instituto Pedagogico ABC', true)
  on conflict (id) do update
    set slug = excluded.slug,
        name = excluded.name,
        is_active = true;

  insert into public.institution_settings (institution_id, display_name)
  values (v_iabc_id, 'Instituto Pedagogico ABC')
  on conflict (institution_id) do nothing;

  insert into public.subscription_plans (name, monthly_price_cents, is_active)
  values
    ('starter', 149000, true),
    ('pro', 299000, true),
    ('enterprise', 0, true)
  on conflict (name) do update
    set monthly_price_cents = excluded.monthly_price_cents,
        is_active = excluded.is_active;

  insert into public.institution_subscriptions (institution_id, plan_id, status, current_period_start, current_period_end)
  select
    v_iabc_id,
    sp.id,
    'trialing',
    current_date,
    (current_date + interval '30 days')::date
  from public.subscription_plans sp
  where sp.name = 'pro'
  on conflict do nothing;

  if to_regclass('public.user_roles') is not null then
    insert into public.institution_memberships (institution_id, user_id, role, is_default)
    select
      v_iabc_id,
      ur.user_id,
      ur.role,
      false
    from public.user_roles ur
    on conflict (institution_id, user_id, role) do nothing;
  end if;

  update public.institution_memberships im
  set is_default = true
  where im.id in (
    select distinct on (user_id)
      id
    from public.institution_memberships
    order by user_id, created_at asc
  );

  update public.institution_memberships im
  set is_default = false
  where exists (
    select 1
    from public.institution_memberships im2
    where im2.user_id = im.user_id
      and im2.is_default = true
      and im2.id <> im.id
  )
  and im.is_default = true;

  foreach v_table in array v_tables loop
    if to_regclass('public.' || v_table) is null then
      continue;
    end if;

    execute format(
      'alter table public.%I add column if not exists institution_id uuid',
      v_table
    );

    if v_table = 'student_tuition_payments' then
      -- Backfill can touch historical rows that fail legacy payment validation.
      -- Disable user triggers only for this one update.
      execute 'alter table public.student_tuition_payments disable trigger user';
    end if;

    execute format(
      'update public.%I set institution_id = coalesce(institution_id, %L::uuid)',
      v_table,
      v_iabc_id::text
    );

    if v_table = 'student_tuition_payments' then
      execute 'alter table public.student_tuition_payments enable trigger user';
    end if;

    v_constraint_name := left(v_table || '_institution_id_fkey', 63);
    if not exists (
      select 1
      from pg_constraint c
      where c.conname = v_constraint_name
        and c.conrelid = ('public.' || v_table)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (institution_id) references public.institutions(id) on delete restrict',
        v_table,
        v_constraint_name
      );
    end if;

    execute format(
      'alter table public.%I alter column institution_id set default public.current_institution_id()',
      v_table
    );

    execute format(
      'alter table public.%I alter column institution_id set not null',
      v_table
    );

    execute format(
      'create index if not exists %I on public.%I (institution_id)',
      left(v_table || '_institution_id_idx', 63),
      v_table
    );
  end loop;
end
$$;

alter table public.institutions enable row level security;
alter table public.institution_settings enable row level security;
alter table public.institution_memberships enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.institution_subscriptions enable row level security;
alter table public.usage_events enable row level security;

drop policy if exists institutions_select_member on public.institutions;
create policy institutions_select_member
on public.institutions
for select
to authenticated
using (public.is_user_in_institution(id));

drop policy if exists institution_settings_select_member on public.institution_settings;
drop policy if exists institution_settings_upsert_rector on public.institution_settings;
create policy institution_settings_select_member
on public.institution_settings
for select
to authenticated
using (institution_id = public.current_institution_id());

create policy institution_settings_upsert_rector
on public.institution_settings
for all
to authenticated
using (
  institution_id = public.current_institution_id()
  and public.is_user_rector()
)
with check (
  institution_id = public.current_institution_id()
  and public.is_user_rector()
);

drop policy if exists institution_memberships_select_member on public.institution_memberships;
drop policy if exists institution_memberships_manage_rector on public.institution_memberships;
create policy institution_memberships_select_member
on public.institution_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    institution_id = public.current_institution_id()
    and public.is_user_rector()
  )
);

create policy institution_memberships_manage_rector
on public.institution_memberships
for all
to authenticated
using (
  institution_id = public.current_institution_id()
  and public.is_user_rector()
)
with check (
  institution_id = public.current_institution_id()
  and public.is_user_rector()
);

drop policy if exists subscription_plans_select_authenticated on public.subscription_plans;
create policy subscription_plans_select_authenticated
on public.subscription_plans
for select
to authenticated
using (true);

drop policy if exists institution_subscriptions_select_member on public.institution_subscriptions;
drop policy if exists institution_subscriptions_manage_rector on public.institution_subscriptions;
create policy institution_subscriptions_select_member
on public.institution_subscriptions
for select
to authenticated
using (institution_id = public.current_institution_id());

create policy institution_subscriptions_manage_rector
on public.institution_subscriptions
for all
to authenticated
using (
  institution_id = public.current_institution_id()
  and public.is_user_rector()
)
with check (
  institution_id = public.current_institution_id()
  and public.is_user_rector()
);

drop policy if exists usage_events_select_member on public.usage_events;
drop policy if exists usage_events_insert_rector on public.usage_events;
create policy usage_events_select_member
on public.usage_events
for select
to authenticated
using (institution_id = public.current_institution_id());

create policy usage_events_insert_rector
on public.usage_events
for insert
to authenticated
with check (
  institution_id = public.current_institution_id()
  and public.is_user_rector()
);

grant select on public.institutions to authenticated;
grant select, insert, update, delete on public.institution_settings to authenticated;
grant select, insert, update, delete on public.institution_memberships to authenticated;
grant select on public.subscription_plans to authenticated;
grant select, insert, update, delete on public.institution_subscriptions to authenticated;
grant select, insert on public.usage_events to authenticated;
grant execute on function public.current_institution_id() to authenticated;
grant execute on function public.is_user_in_institution(uuid) to authenticated;
grant execute on function public.provision_institution(text, text) to authenticated;

commit;
