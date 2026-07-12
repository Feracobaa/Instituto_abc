begin;

create table if not exists public.provider_modules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_modules_code_check
    check (code ~ '^[a-z][a-z0-9_]*$')
);

create table if not exists public.subscription_plan_modules (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  module_id uuid not null references public.provider_modules(id) on delete cascade,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_plan_modules_unique
    unique (plan_id, module_id)
);

create table if not exists public.institution_module_overrides (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  module_id uuid not null references public.provider_modules(id) on delete cascade,
  is_enabled boolean not null,
  reason text,
  set_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institution_module_overrides_unique
    unique (institution_id, module_id)
);

create index if not exists subscription_plan_modules_plan_idx
  on public.subscription_plan_modules (plan_id);

create index if not exists subscription_plan_modules_module_idx
  on public.subscription_plan_modules (module_id);

create index if not exists institution_module_overrides_institution_idx
  on public.institution_module_overrides (institution_id);

create index if not exists institution_module_overrides_module_idx
  on public.institution_module_overrides (module_id);

drop trigger if exists provider_modules_set_updated_at on public.provider_modules;
create trigger provider_modules_set_updated_at
before update on public.provider_modules
for each row
execute function public.touch_provider_updated_at();

drop trigger if exists subscription_plan_modules_set_updated_at on public.subscription_plan_modules;
create trigger subscription_plan_modules_set_updated_at
before update on public.subscription_plan_modules
for each row
execute function public.touch_provider_updated_at();

drop trigger if exists institution_module_overrides_set_updated_at on public.institution_module_overrides;
create trigger institution_module_overrides_set_updated_at
before update on public.institution_module_overrides
for each row
execute function public.touch_provider_updated_at();

insert into public.provider_modules (code, name, description)
values
  ('dashboard', 'Dashboard', 'Vista principal operativa'),
  ('contabilidad', 'Contabilidad', 'Cobros, pagos, cartera e inventario'),
  ('usuarios', 'Usuarios', 'Gestion de cuentas y perfiles institucionales'),
  ('profesores', 'Profesores', 'Gestion del equipo docente'),
  ('estudiantes', 'Estudiantes', 'Gestion de estudiantes y datos base'),
  ('familias', 'Portal Estudiantil', 'Credenciales y flujo de acudientes'),
  ('horarios', 'Horarios', 'Programacion academica por grado/materia'),
  ('grados', 'Grados', 'Estructura de grados y niveles'),
  ('materias', 'Materias', 'Catalogo y asignacion de materias'),
  ('calificaciones', 'Calificaciones', 'Registro y consulta de notas'),
  ('asistencias', 'Asistencias', 'Control de asistencia diaria'),
  ('mis_notas', 'Mis Notas', 'Vista de notas para acudientes'),
  ('mi_horario', 'Mi Horario', 'Vista de horario para acudientes'),
  ('mi_perfil', 'Mi Perfil', 'Perfil del acudiente')
on conflict (code) do update
  set name = excluded.name,
      description = excluded.description,
      is_active = true,
      updated_at = now();

with target_plans as (
  select id, name
  from public.subscription_plans
  where name in ('starter', 'pro', 'enterprise')
),
target_modules as (
  select id, code
  from public.provider_modules
),
matrix as (
  select
    p.id as plan_id,
    m.id as module_id,
    case
      when p.name = 'starter' and m.code = 'contabilidad' then false
      else true
    end as is_enabled
  from target_plans p
  cross join target_modules m
)
insert into public.subscription_plan_modules (plan_id, module_id, is_enabled)
select
  matrix.plan_id,
  matrix.module_id,
  matrix.is_enabled
from matrix
on conflict (plan_id, module_id) do update
  set is_enabled = excluded.is_enabled,
      updated_at = now();

create or replace function public.is_module_enabled_for_institution(
  p_module_code text,
  p_institution_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = 'public'
as $function$
declare
  v_effective_institution uuid;
  v_module_id uuid;
  v_module_code text;
  v_override boolean;
  v_plan_id uuid;
  v_plan_enabled boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  if public.is_provider_owner() then
    return true;
  end if;

  v_module_code := lower(nullif(btrim(p_module_code), ''));
  if v_module_code is null then
    return false;
  end if;

  select pm.id
  into v_module_id
  from public.provider_modules pm
  where pm.code = v_module_code
    and pm.is_active
  limit 1;

  if v_module_id is null then
    return false;
  end if;

  v_effective_institution := coalesce(p_institution_id, public.current_institution_id());
  if v_effective_institution is null then
    return false;
  end if;

  select imo.is_enabled
  into v_override
  from public.institution_module_overrides imo
  where imo.institution_id = v_effective_institution
    and imo.module_id = v_module_id
  limit 1;

  if v_override is not null then
    return v_override;
  end if;

  select ins.plan_id
  into v_plan_id
  from public.institution_subscriptions ins
  where ins.institution_id = v_effective_institution
  order by ins.created_at desc
  limit 1;

  if v_plan_id is null then
    return true;
  end if;

  select spm.is_enabled
  into v_plan_enabled
  from public.subscription_plan_modules spm
  where spm.plan_id = v_plan_id
    and spm.module_id = v_module_id
  limit 1;

  if v_plan_enabled is null then
    return true;
  end if;

  return v_plan_enabled;
end;
$function$;

create or replace function public.is_module_enabled_for_current_institution(
  p_module_code text
)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $function$
  select public.is_module_enabled_for_institution(
    p_module_code,
    public.current_institution_id()
  );
$function$;

create or replace function public.get_current_institution_module_access()
returns table(
  module_code text,
  module_name text,
  is_enabled boolean,
  source text
)
language plpgsql
stable
security definer
set search_path = 'public'
as $function$
declare
  v_effective_institution uuid;
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
      'owner'::text as source
    from public.provider_modules pm
    where pm.is_active
    order by pm.name;
    return;
  end if;

  v_effective_institution := public.current_institution_id();
  if v_effective_institution is null then
    return;
  end if;

  return query
  with latest_subscription as (
    select ins.plan_id
    from public.institution_subscriptions ins
    where ins.institution_id = v_effective_institution
    order by ins.created_at desc
    limit 1
  )
  select
    pm.code,
    pm.name,
    coalesce(imo.is_enabled, spm.is_enabled, true) as is_enabled,
    case
      when imo.is_enabled is not null then 'override'
      when spm.is_enabled is not null then 'plan'
      else 'grace'
    end as source
  from public.provider_modules pm
  left join latest_subscription ls
    on true
  left join public.subscription_plan_modules spm
    on spm.plan_id = ls.plan_id
   and spm.module_id = pm.id
  left join public.institution_module_overrides imo
    on imo.institution_id = v_effective_institution
   and imo.module_id = pm.id
  where pm.is_active
  order by pm.name;
end;
$function$;

create or replace function public.provider_get_institution_modules(
  p_institution_id uuid
)
returns table(
  module_id uuid,
  module_code text,
  module_name text,
  plan_id uuid,
  plan_name text,
  plan_enabled boolean,
  override_enabled boolean,
  effective_enabled boolean,
  effective_source text
)
language plpgsql
stable
security definer
set search_path = 'public'
as $function$
declare
  v_plan_id uuid;
  v_plan_name text;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user is required.';
  end if;

  if not public.is_provider_owner() then
    raise exception 'Only provider owners can inspect module access.';
  end if;

  if not exists (
    select 1
    from public.institutions i
    where i.id = p_institution_id
  ) then
    raise exception 'Institution does not exist.';
  end if;

  select ins.plan_id, sp.name
  into v_plan_id, v_plan_name
  from public.institution_subscriptions ins
  left join public.subscription_plans sp
    on sp.id = ins.plan_id
  where ins.institution_id = p_institution_id
  order by ins.created_at desc
  limit 1;

  return query
  select
    pm.id as module_id,
    pm.code as module_code,
    pm.name as module_name,
    v_plan_id as plan_id,
    v_plan_name as plan_name,
    spm.is_enabled as plan_enabled,
    imo.is_enabled as override_enabled,
    coalesce(imo.is_enabled, spm.is_enabled, true) as effective_enabled,
    case
      when imo.is_enabled is not null then 'override'
      when spm.is_enabled is not null then 'plan'
      else 'grace'
    end as effective_source
  from public.provider_modules pm
  left join public.subscription_plan_modules spm
    on spm.plan_id = v_plan_id
   and spm.module_id = pm.id
  left join public.institution_module_overrides imo
    on imo.institution_id = p_institution_id
   and imo.module_id = pm.id
  where pm.is_active
  order by pm.name;
end;
$function$;

create or replace function public.provider_set_plan_module_access(
  p_plan_id uuid,
  p_module_code text,
  p_is_enabled boolean,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_module_id uuid;
  v_module_code text;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user is required.';
  end if;

  if not public.is_provider_owner() then
    raise exception 'Only provider owners can manage plan module access.';
  end if;

  if not exists (
    select 1
    from public.subscription_plans sp
    where sp.id = p_plan_id
  ) then
    raise exception 'Plan does not exist.';
  end if;

  v_module_code := lower(nullif(btrim(p_module_code), ''));
  if v_module_code is null then
    raise exception 'Module code is required.';
  end if;

  select pm.id
  into v_module_id
  from public.provider_modules pm
  where pm.code = v_module_code
  limit 1;

  if v_module_id is null then
    raise exception 'Module does not exist.';
  end if;

  insert into public.subscription_plan_modules (plan_id, module_id, is_enabled)
  values (p_plan_id, v_module_id, p_is_enabled)
  on conflict (plan_id, module_id) do update
    set is_enabled = excluded.is_enabled,
        updated_at = now();

  insert into public.provider_audit_logs (
    actor_user_id,
    action,
    table_name,
    record_id,
    details
  )
  values (
    auth.uid(),
    'plan_module_access_set',
    'subscription_plan_modules',
    p_plan_id::text || ':' || v_module_id::text,
    jsonb_build_object(
      'plan_id', p_plan_id,
      'module_code', v_module_code,
      'is_enabled', p_is_enabled,
      'reason', nullif(btrim(p_reason), '')
    )
  );

  return true;
end;
$function$;

create or replace function public.provider_set_institution_module_override(
  p_institution_id uuid,
  p_module_code text,
  p_is_enabled boolean,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_module_id uuid;
  v_module_code text;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user is required.';
  end if;

  if not public.is_provider_owner() then
    raise exception 'Only provider owners can set institution module overrides.';
  end if;

  if not exists (
    select 1
    from public.institutions i
    where i.id = p_institution_id
  ) then
    raise exception 'Institution does not exist.';
  end if;

  v_module_code := lower(nullif(btrim(p_module_code), ''));
  if v_module_code is null then
    raise exception 'Module code is required.';
  end if;

  select pm.id
  into v_module_id
  from public.provider_modules pm
  where pm.code = v_module_code
  limit 1;

  if v_module_id is null then
    raise exception 'Module does not exist.';
  end if;

  insert into public.institution_module_overrides (
    institution_id,
    module_id,
    is_enabled,
    reason,
    set_by_user_id
  )
  values (
    p_institution_id,
    v_module_id,
    p_is_enabled,
    nullif(btrim(p_reason), ''),
    auth.uid()
  )
  on conflict (institution_id, module_id) do update
    set is_enabled = excluded.is_enabled,
        reason = excluded.reason,
        set_by_user_id = excluded.set_by_user_id,
        updated_at = now();

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
    'institution_module_override_set',
    'institution_module_overrides',
    p_institution_id::text || ':' || v_module_id::text,
    p_institution_id,
    jsonb_build_object(
      'module_code', v_module_code,
      'is_enabled', p_is_enabled,
      'reason', nullif(btrim(p_reason), '')
    )
  );

  return true;
end;
$function$;

create or replace function public.provider_clear_institution_module_override(
  p_institution_id uuid,
  p_module_code text,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_module_id uuid;
  v_module_code text;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user is required.';
  end if;

  if not public.is_provider_owner() then
    raise exception 'Only provider owners can clear institution module overrides.';
  end if;

  v_module_code := lower(nullif(btrim(p_module_code), ''));
  if v_module_code is null then
    raise exception 'Module code is required.';
  end if;

  select pm.id
  into v_module_id
  from public.provider_modules pm
  where pm.code = v_module_code
  limit 1;

  if v_module_id is null then
    raise exception 'Module does not exist.';
  end if;

  delete from public.institution_module_overrides imo
  where imo.institution_id = p_institution_id
    and imo.module_id = v_module_id;

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
    'institution_module_override_cleared',
    'institution_module_overrides',
    p_institution_id::text || ':' || v_module_id::text,
    p_institution_id,
    jsonb_build_object(
      'module_code', v_module_code,
      'reason', nullif(btrim(p_reason), '')
    )
  );

  return true;
end;
$function$;

alter table public.provider_modules enable row level security;
alter table public.subscription_plan_modules enable row level security;
alter table public.institution_module_overrides enable row level security;

drop policy if exists provider_modules_owner_all on public.provider_modules;
create policy provider_modules_owner_all
on public.provider_modules
for all
to authenticated
using (public.is_provider_owner())
with check (public.is_provider_owner());

drop policy if exists subscription_plan_modules_owner_all on public.subscription_plan_modules;
create policy subscription_plan_modules_owner_all
on public.subscription_plan_modules
for all
to authenticated
using (public.is_provider_owner())
with check (public.is_provider_owner());

drop policy if exists institution_module_overrides_owner_all on public.institution_module_overrides;
create policy institution_module_overrides_owner_all
on public.institution_module_overrides
for all
to authenticated
using (public.is_provider_owner())
with check (public.is_provider_owner());

drop trigger if exists provider_audit_provider_modules on public.provider_modules;
create trigger provider_audit_provider_modules
after insert or update or delete on public.provider_modules
for each row execute function public.provider_capture_audit();

drop trigger if exists provider_audit_subscription_plan_modules on public.subscription_plan_modules;
create trigger provider_audit_subscription_plan_modules
after insert or update or delete on public.subscription_plan_modules
for each row execute function public.provider_capture_audit();

drop trigger if exists provider_audit_institution_module_overrides on public.institution_module_overrides;
create trigger provider_audit_institution_module_overrides
after insert or update or delete on public.institution_module_overrides
for each row execute function public.provider_capture_audit();

grant select, insert, update, delete on public.provider_modules to authenticated;
grant select, insert, update, delete on public.subscription_plan_modules to authenticated;
grant select, insert, update, delete on public.institution_module_overrides to authenticated;
grant execute on function public.is_module_enabled_for_institution(text, uuid) to authenticated;
grant execute on function public.is_module_enabled_for_current_institution(text) to authenticated;
grant execute on function public.get_current_institution_module_access() to authenticated;
grant execute on function public.provider_get_institution_modules(uuid) to authenticated;
grant execute on function public.provider_set_plan_module_access(uuid, text, boolean, text) to authenticated;
grant execute on function public.provider_set_institution_module_override(uuid, text, boolean, text) to authenticated;
grant execute on function public.provider_clear_institution_module_override(uuid, text, text) to authenticated;

commit;
