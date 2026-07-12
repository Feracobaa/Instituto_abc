begin;

-- ============================================================
-- Global Role-Module Permissions Matrix
-- ============================================================
-- Defines which modules (and at what access level) each role
-- can access across ALL institutions globally.
-- This is managed exclusively by the Etymon provider owner.
--
-- access_level:
--   'full'      – read + write (create, update, delete)
--   'readonly'  – read only (view data, no mutations)
--   'none'      – no access at all (module hidden)

create type public.module_access_level as enum ('full', 'readonly', 'none');

create table if not exists public.global_role_module_permissions (
  id uuid primary key default gen_random_uuid(),
  role public.user_role_enum not null,
  module_id uuid not null references public.provider_modules(id) on delete cascade,
  access_level public.module_access_level not null default 'full',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint global_role_module_permissions_unique
    unique (role, module_id)
);

create index if not exists global_role_module_permissions_role_idx
  on public.global_role_module_permissions (role);

create index if not exists global_role_module_permissions_module_idx
  on public.global_role_module_permissions (module_id);

-- ── Auto-update timestamp ─────────────────────────────────────
drop trigger if exists global_role_module_permissions_set_updated_at
  on public.global_role_module_permissions;

create trigger global_role_module_permissions_set_updated_at
before update on public.global_role_module_permissions
for each row
execute function public.touch_provider_updated_at();

-- ── RLS: only provider owners ─────────────────────────────────
alter table public.global_role_module_permissions enable row level security;

drop policy if exists global_role_module_permissions_owner_all
  on public.global_role_module_permissions;

create policy global_role_module_permissions_owner_all
on public.global_role_module_permissions
for all
to authenticated
using (public.is_provider_owner())
with check (public.is_provider_owner());

-- ── Audit trigger ─────────────────────────────────────────────
drop trigger if exists provider_audit_global_role_module_permissions
  on public.global_role_module_permissions;

create trigger provider_audit_global_role_module_permissions
after insert or update or delete on public.global_role_module_permissions
for each row execute function public.provider_capture_audit();

-- ── Grants ────────────────────────────────────────────────────
grant select, insert, update, delete
  on public.global_role_module_permissions to authenticated;

-- ============================================================
-- Seed: Default permissions that match the current hardcoded
-- role→module mapping from AppSidebar.tsx
-- ============================================================
-- Matrix key (from current codebase):
--   rector:    dashboard, contabilidad, usuarios, profesores, estudiantes,
--              familias, horarios, grados, materias, calificaciones, asistencias
--   profesor:  dashboard, horarios, materias, calificaciones, asistencias
--   contable:  dashboard, contabilidad
--   parent:    dashboard, mis_notas, mi_horario, mi_perfil

insert into public.global_role_module_permissions (role, module_id, access_level)
select
  matrix.role::public.user_role_enum,
  pm.id,
  matrix.access_level::public.module_access_level
from (values
  -- ── Rector ────────────────────────────
  ('rector', 'dashboard',      'full'),
  ('rector', 'contabilidad',   'readonly'),
  ('rector', 'usuarios',       'full'),
  ('rector', 'profesores',     'full'),
  ('rector', 'estudiantes',    'full'),
  ('rector', 'familias',       'full'),
  ('rector', 'horarios',       'full'),
  ('rector', 'grados',         'full'),
  ('rector', 'materias',       'full'),
  ('rector', 'calificaciones', 'full'),
  ('rector', 'asistencias',    'full'),
  -- ── Profesor ──────────────────────────
  ('profesor', 'dashboard',      'full'),
  ('profesor', 'horarios',       'readonly'),
  ('profesor', 'materias',       'readonly'),
  ('profesor', 'calificaciones', 'full'),
  ('profesor', 'asistencias',    'full'),
  -- ── Contable ──────────────────────────
  ('contable', 'dashboard',    'full'),
  ('contable', 'contabilidad', 'full'),
  -- ── Parent ────────────────────────────
  ('parent', 'dashboard',  'full'),
  ('parent', 'mis_notas',  'readonly'),
  ('parent', 'mi_horario', 'readonly'),
  ('parent', 'mi_perfil',  'full')
) as matrix(role, module_code, access_level)
join public.provider_modules pm on pm.code = matrix.module_code
on conflict (role, module_id) do update
  set access_level = excluded.access_level,
      updated_at = now();

-- ============================================================
-- Helper: Check if a role has access to a module
-- ============================================================
create or replace function public.has_role_module_access(
  p_role text,
  p_module_code text
)
returns public.module_access_level
language plpgsql
stable
security definer
set search_path = 'public'
as $function$
declare
  v_module_id uuid;
  v_access public.module_access_level;
begin
  select pm.id
  into v_module_id
  from public.provider_modules pm
  where pm.code = lower(nullif(btrim(p_module_code), ''))
    and pm.is_active
  limit 1;

  if v_module_id is null then
    return 'none'::public.module_access_level;
  end if;

  select grmp.access_level
  into v_access
  from public.global_role_module_permissions grmp
  where grmp.role = p_role::public.user_role_enum
    and grmp.module_id = v_module_id
  limit 1;

  -- If no permission row exists, default to 'none' (deny by default)
  return coalesce(v_access, 'none'::public.module_access_level);
end;
$function$;

grant execute on function public.has_role_module_access(text, text) to authenticated;

-- ============================================================
-- RPC: Get the full role-module permissions matrix
-- Used by the Etymon UI to render the permissions grid
-- ============================================================
create or replace function public.provider_get_role_permissions_matrix()
returns table(
  role text,
  module_id uuid,
  module_code text,
  module_name text,
  access_level text
)
language plpgsql
stable
security definer
set search_path = 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authenticated user is required.';
  end if;

  if not public.is_provider_owner() then
    raise exception 'Only provider owners can view the permissions matrix.';
  end if;

  return query
  select
    r.role::text,
    pm.id as module_id,
    pm.code as module_code,
    pm.name as module_name,
    coalesce(grmp.access_level::text, 'none') as access_level
  from (
    select unnest(enum_range(null::public.user_role_enum)) as role
  ) r
  cross join public.provider_modules pm
  left join public.global_role_module_permissions grmp
    on grmp.role = r.role
    and grmp.module_id = pm.id
  where pm.is_active
    and r.role in ('rector', 'profesor', 'contable', 'parent')
  order by
    case r.role::text
      when 'rector' then 1
      when 'profesor' then 2
      when 'contable' then 3
      when 'parent' then 4
      else 5
    end,
    pm.name;
end;
$function$;

grant execute on function public.provider_get_role_permissions_matrix() to authenticated;

-- ============================================================
-- RPC: Set a single role-module permission
-- ============================================================
create or replace function public.provider_set_role_permission(
  p_role text,
  p_module_code text,
  p_access_level text
)
returns boolean
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_module_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user is required.';
  end if;

  if not public.is_provider_owner() then
    raise exception 'Only provider owners can manage role permissions.';
  end if;

  select pm.id
  into v_module_id
  from public.provider_modules pm
  where pm.code = lower(nullif(btrim(p_module_code), ''))
  limit 1;

  if v_module_id is null then
    raise exception 'Module does not exist.';
  end if;

  if p_access_level = 'none' then
    -- Remove the row entirely (deny by default)
    delete from public.global_role_module_permissions grmp
    where grmp.role = p_role::public.user_role_enum
      and grmp.module_id = v_module_id;
  else
    insert into public.global_role_module_permissions (role, module_id, access_level)
    values (
      p_role::public.user_role_enum,
      v_module_id,
      p_access_level::public.module_access_level
    )
    on conflict (role, module_id) do update
      set access_level = excluded.access_level,
          updated_at = now();
  end if;

  -- Audit log
  insert into public.provider_audit_logs (
    actor_user_id,
    action,
    table_name,
    record_id,
    details
  )
  values (
    auth.uid(),
    'role_permission_set',
    'global_role_module_permissions',
    p_role || ':' || p_module_code,
    jsonb_build_object(
      'role', p_role,
      'module_code', p_module_code,
      'access_level', p_access_level
    )
  );

  return true;
end;
$function$;

grant execute on function public.provider_set_role_permission(text, text, text) to authenticated;

-- ============================================================
-- Update get_current_institution_module_access() to also
-- factor in role-level permissions
-- ============================================================
drop function if exists public.get_current_institution_module_access();

create or replace function public.get_current_institution_module_access()
returns table(
  module_code text,
  module_name text,
  is_enabled boolean,
  source text,
  access_level text
)
language plpgsql
stable
security definer
set search_path = 'public'
as $function$
declare
  v_effective_institution uuid;
  v_user_role text;
begin
  if auth.uid() is null then
    return;
  end if;

  if public.is_provider_owner() then
    return query
    select
      pm.code,
      pm.name,
      true as is_enabled,
      'owner'::text as source,
      'full'::text as access_level
    from public.provider_modules pm
    where pm.is_active
    order by pm.name;
    return;
  end if;

  v_effective_institution := public.current_institution_id();
  if v_effective_institution is null then
    return;
  end if;

  -- Get the user's role
  select ur.role::text
  into v_user_role
  from public.user_roles ur
  where ur.user_id = auth.uid()
  limit 1;

  return query
  with latest_subscription as (
    select ins.plan_id
    from public.institution_subscriptions ins
    where ins.institution_id = v_effective_institution
    order by ins.created_at desc
    limit 1
  ),
  plan_check as (
    select
      pm.id as module_id,
      pm.code,
      pm.name,
      coalesce(imo.is_enabled, spm.is_enabled, true) as plan_enabled,
      case
        when imo.is_enabled is not null then 'override'
        when spm.is_enabled is not null then 'plan'
        else 'grace'
      end as plan_source
    from public.provider_modules pm
    left join latest_subscription ls on true
    left join public.subscription_plan_modules spm
      on spm.plan_id = ls.plan_id
      and spm.module_id = pm.id
    left join public.institution_module_overrides imo
      on imo.institution_id = v_effective_institution
      and imo.module_id = pm.id
    where pm.is_active
  )
  select
    pc.code as module_code,
    pc.name as module_name,
    -- Module is enabled only if BOTH plan allows AND role has access (not 'none')
    pc.plan_enabled and coalesce(grmp.access_level, 'none'::public.module_access_level) <> 'none' as is_enabled,
    pc.plan_source as source,
    coalesce(grmp.access_level::text, 'none') as access_level
  from plan_check pc
  left join public.global_role_module_permissions grmp
    on grmp.module_id = pc.module_id
    and grmp.role = v_user_role::public.user_role_enum
  order by pc.name;
end;
$function$;

commit;
