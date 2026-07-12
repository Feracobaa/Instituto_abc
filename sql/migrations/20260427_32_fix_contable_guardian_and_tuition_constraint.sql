begin;

-- ============================================================
-- FIX 1: Contable puede leer student_guardian_accounts
-- ============================================================
-- El rol 'contable' necesita leer esta tabla para enviar
-- notificaciones de cobro al acudiente. Sin esta política,
-- la query devuelve 0 filas aunque el registro exista.

drop policy if exists student_guardian_accounts_select_contable on public.student_guardian_accounts;

create policy student_guardian_accounts_select_contable
on public.student_guardian_accounts
for select
to authenticated
using (public.is_user_contable());

-- ============================================================
-- FIX 2: Eliminar constraint de valor fijo de pensión
-- ============================================================
-- El constraint check(monthly_tuition in (120000, 130000))
-- impide registrar pensiones de valores distintos (ej: 100000).
-- Lo reemplazamos por un check simple mayor a cero.

alter table public.student_tuition_profiles
  drop constraint if exists student_tuition_profiles_monthly_tuition_check;

alter table public.student_tuition_profiles
  add constraint student_tuition_profiles_monthly_tuition_check
  check (monthly_tuition > 0);

-- Actualizar bulk_assign_tuition_profiles: eliminar validación de valores fijos
create or replace function public.bulk_assign_tuition_profiles(
  p_monthly_tuition numeric,
  p_charge_start_month date,
  p_charge_end_month date default null,
  p_overwrite boolean default false
)
returns integer
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_count integer;
begin
  if not public.is_user_contable() then
    raise exception 'Only contable users can assign tuition profiles.';
  end if;

  if p_monthly_tuition <= 0 then
    raise exception 'Monthly tuition must be a positive amount.';
  end if;

  if date_trunc('month', p_charge_start_month) <> p_charge_start_month then
    raise exception 'Charge start month must be the first day of the month.';
  end if;

  if p_charge_end_month is not null and date_trunc('month', p_charge_end_month) <> p_charge_end_month then
    raise exception 'Charge end month must be the first day of the month.';
  end if;

  if p_charge_end_month is not null and p_charge_end_month < p_charge_start_month then
    raise exception 'Charge end month must be greater or equal to charge start month.';
  end if;

  insert into public.student_tuition_profiles (
    student_id,
    monthly_tuition,
    charge_start_month,
    charge_end_month
  )
  select
    s.id,
    p_monthly_tuition,
    p_charge_start_month,
    p_charge_end_month
  from public.students s
  where coalesce(s.is_active, true)
    and (
      p_overwrite
      or not exists (
        select 1
        from public.student_tuition_profiles stp
        where stp.student_id = s.id
      )
    )
  on conflict (student_id) do update
    set monthly_tuition = excluded.monthly_tuition,
        charge_start_month = excluded.charge_start_month,
        charge_end_month = excluded.charge_end_month,
        updated_at = now()
    where p_overwrite;

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

grant execute on function public.bulk_assign_tuition_profiles(numeric, date, date, boolean) to authenticated;

-- Actualizar register_student_payment: eliminar validación de valores fijos
-- y relajar la validación del techo (permitir abonos parciales sin rechazar)
create or replace function public.register_student_payment(
  p_student_id uuid,
  p_period_month date,
  p_amount numeric,
  p_payment_date date,
  p_notes text default null
)
returns public.student_tuition_payments
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_profile public.student_tuition_profiles%rowtype;
  v_paid numeric;
  v_payment public.student_tuition_payments%rowtype;
begin
  if not public.is_user_contable() then
    raise exception 'Only contable users can register tuition payments.';
  end if;

  if p_amount <= 0 then
    raise exception 'Payment amount must be positive.';
  end if;

  if extract(month from p_period_month) < 2 or extract(month from p_period_month) > 11 then
    raise exception 'Tuition month must be between February and November.';
  end if;

  select *
  into v_profile
  from public.student_tuition_profiles stp
  where stp.student_id = p_student_id;

  if not found then
    raise exception 'Student tuition profile not found.';
  end if;

  if date_trunc('month', p_period_month) <> p_period_month then
    raise exception 'Period month must be the first day of the month.';
  end if;

  if p_period_month < v_profile.charge_start_month
    or (v_profile.charge_end_month is not null and p_period_month > v_profile.charge_end_month)
  then
    raise exception 'Period month is outside the charge window.';
  end if;

  select coalesce(sum(amount), 0)
  into v_paid
  from public.student_tuition_payments stp
  where stp.student_id = p_student_id
    and stp.period_month = p_period_month;

  -- Permitir abonos parciales y pagos exactos; solo rechazar si ya se pagó completo
  if v_paid >= v_profile.monthly_tuition then
    raise exception 'Este mes ya está pagado completamente (% / %).',
      v_paid, v_profile.monthly_tuition;
  end if;

  insert into public.student_tuition_payments (
    student_id,
    period_month,
    amount,
    payment_date,
    notes
  )
  values (
    p_student_id,
    p_period_month,
    p_amount,
    p_payment_date,
    p_notes
  )
  returning *
  into v_payment;

  return v_payment;
end;
$function$;

grant execute on function public.register_student_payment(uuid, date, numeric, date, text) to authenticated;

-- Actualizar trigger de validación de pago también (misma lógica)
create or replace function public.validate_student_tuition_payment()
returns trigger
language plpgsql
set search_path = 'public'
as $function$
declare
  v_profile public.student_tuition_profiles%rowtype;
  v_paid numeric;
begin
  select *
  into v_profile
  from public.student_tuition_profiles stp
  where stp.student_id = new.student_id;

  if not found then
    raise exception 'Student tuition profile not found.';
  end if;

  if extract(month from new.period_month) < 2 or extract(month from new.period_month) > 11 then
    raise exception 'Tuition month must be between February and November.';
  end if;

  if new.period_month < v_profile.charge_start_month
    or (v_profile.charge_end_month is not null and new.period_month > v_profile.charge_end_month)
  then
    raise exception 'Period month is outside the charge window.';
  end if;

  select coalesce(sum(amount), 0)
  into v_paid
  from public.student_tuition_payments stp
  where stp.student_id = new.student_id
    and stp.period_month = new.period_month
    and (tg_op <> 'UPDATE' or stp.id <> new.id);

  -- Solo rechazar si el mes ya está completamente pagado
  if v_paid >= v_profile.monthly_tuition then
    raise exception 'Este mes ya está pagado completamente.';
  end if;

  return new;
end;
$function$;

commit;
