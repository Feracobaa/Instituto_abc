-- SQL Script: Institution Billing Status and Contract Expiry Checker
-- Date: 2026-07-09

begin;

create or replace function public.get_current_institution_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  v_institution_id uuid;
  v_institution_name text;
  v_is_active boolean;
  v_billing_status text;
  v_sub_status text;
  v_period_end date;
  v_days_remaining integer;
begin
  -- 1. Obtener la institución del usuario actual
  v_institution_id := public.current_institution_id();
  if v_institution_id is null then
    return jsonb_build_object('status', 'unknown', 'reason', 'no_institution');
  end if;

  -- Obtener nombre de la institución
  select name into v_institution_name
  from public.institutions
  where id = v_institution_id;

  -- 2. Validar si la institución está inactiva administrativamente
  select is_active into v_is_active
  from public.institutions
  where id = v_institution_id;

  if not coalesce(v_is_active, true) then
    return jsonb_build_object(
      'status', 'blocked',
      'reason', 'suspended',
      'institution_name', v_institution_name,
      'days_remaining', 0
    );
  end if;

  -- 3. Obtener estado de facturación (mora comercial)
  select billing_status into v_billing_status
  from public.provider_customer_accounts
  where institution_id = v_institution_id;

  -- 4. Obtener estado de la suscripción y fecha de vencimiento
  select status, current_period_end into v_sub_status, v_period_end
  from public.institution_subscriptions
  where institution_id = v_institution_id
  order by created_at desc
  limit 1;

  -- Calcular días restantes si existe fecha de fin de periodo
  if v_period_end is not null then
    v_days_remaining := v_period_end - current_date;
  else
    v_days_remaining := null;
  end if;

  -- 5. Lógica de bloqueo
  -- Bloquea si la cuenta está marcada en mora ('overdue') o si la suscripción está vencida ('past_due', 'canceled') o si el periodo ya venció
  if v_billing_status = 'overdue' or v_sub_status in ('past_due', 'canceled') or (v_days_remaining is not null and v_days_remaining < 0) then
    return jsonb_build_object(
      'status', 'blocked',
      'reason', case 
        when v_billing_status = 'overdue' then 'overdue'
        when v_sub_status in ('past_due', 'canceled') then 'subscription_expired'
        else 'expired'
      end,
      'institution_name', v_institution_name,
      'current_period_end', v_period_end,
      'days_remaining', coalesce(v_days_remaining, 0)
    );
  end if;

  -- Retorno de estado activo normal con información de vencimiento
  return jsonb_build_object(
    'status', 'active',
    'reason', 'normal',
    'institution_name', v_institution_name,
    'current_period_end', v_period_end,
    'days_remaining', v_days_remaining
  );
end;
$$;

grant execute on function public.get_current_institution_status() to authenticated;

commit;
