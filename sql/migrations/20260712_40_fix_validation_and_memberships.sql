begin;

-- ==============================================================================
-- 1. Indexación de rendimiento para membresías de usuarios
-- ==============================================================================
-- Optimiza la función current_institution_id() llamada por cada query protegida por RLS
create index if not exists institution_memberships_user_id_idx 
  on public.institution_memberships (user_id);

-- ==============================================================================
-- 2. Función helper para comprobar estado de institución en RLS
-- ==============================================================================
create or replace function public.is_institution_active(p_institution_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  v_is_active boolean;
  v_billing_status text;
  v_sub_status text;
  v_period_end date;
begin
  -- 2.1 Validar si la institución está activa administrativamente
  select is_active into v_is_active
  from public.institutions
  where id = p_institution_id;

  if not coalesce(v_is_active, true) then
    return false;
  end if;

  -- 2.2 Obtener estado de facturación (mora comercial)
  select billing_status into v_billing_status
  from public.provider_customer_accounts
  where institution_id = p_institution_id;

  if v_billing_status = 'overdue' then
    return false;
  end if;

  -- 2.3 Obtener estado de la suscripción y fecha de vencimiento
  select status, current_period_end into v_sub_status, v_period_end
  from public.institution_subscriptions
  where institution_id = p_institution_id
  order by created_at desc
  limit 1;

  if v_sub_status in ('past_due', 'canceled') then
    return false;
  end if;

  if v_period_end is not null and v_period_end < current_date then
    return false;
  end if;

  return true;
end;
$$;

grant execute on function public.is_institution_active(uuid) to authenticated;

-- ==============================================================================
-- 3. Re-aplicación de políticas RLS restrictivas con validación comercial
-- ==============================================================================
do $$
declare
  target_table text;
  target_tables text[] := array[
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
  policy_name text;
begin
  foreach target_table in array target_tables loop
    if to_regclass('public.' || target_table) is null then
      continue;
    end if;

    policy_name := left(target_table || '_tenant_isolation_restrictive', 63);

    execute format(
      'drop policy if exists %I on public.%I',
      policy_name,
      target_table
    );

    -- La política restringe el acceso si el inquilino no coincide, 
    -- O si el colegio está inactivo comercialmente (a menos que el usuario sea el super admin de ETYMON en soporte)
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated 
       using (institution_id = public.current_institution_id() and (public.is_provider_owner() or public.is_institution_active(institution_id)))
       with check (institution_id = public.current_institution_id() and (public.is_provider_owner() or public.is_institution_active(institution_id)))',
      policy_name,
      target_table
    );
  end loop;
end
$$;

commit;
