begin;

alter table public.student_tuition_profiles
drop constraint if exists student_tuition_profiles_monthly_tuition_check;

update public.student_tuition_profiles
set monthly_tuition = monthly_tuition * 1000
where monthly_tuition in (120, 130);

update public.student_tuition_payments
set amount = amount * 1000
where amount > 0
  and amount <= 130;

alter table public.student_tuition_profiles
add constraint student_tuition_profiles_monthly_tuition_check
check (monthly_tuition in (120000, 130000));

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

  if p_monthly_tuition not in (120000, 130000) then
    raise exception 'Monthly tuition must be 120000 or 130000.';
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

  if v_paid + p_amount > v_profile.monthly_tuition then
    raise exception 'Payment exceeds monthly tuition.';
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

  if v_paid + new.amount > v_profile.monthly_tuition then
    raise exception 'Payment exceeds monthly tuition.';
  end if;

  return new;
end;
$function$;

create or replace view public.student_tuition_month_status as
with current_month as (
  select date_trunc('month', now())::date as current_month
),
profile_data as (
  select
    s.id as student_id,
    s.full_name as student_name,
    stp.monthly_tuition,
    stp.charge_start_month,
    least(coalesce(stp.charge_end_month, cm.current_month), cm.current_month) as charge_end_month
  from public.student_tuition_profiles stp
  join public.students s
    on s.id = stp.student_id
  cross join current_month cm
  where coalesce(s.is_active, true)
),
month_series as (
  select
    pd.student_id,
    pd.student_name,
    pd.monthly_tuition,
    generate_series(pd.charge_start_month, pd.charge_end_month, interval '1 month')::date as period_month
  from profile_data pd
)
select
  ms.student_id,
  ms.student_name,
  ms.period_month,
  ms.monthly_tuition as expected_amount,
  coalesce(sum(stp.amount), 0) as paid_amount,
  greatest(ms.monthly_tuition - coalesce(sum(stp.amount), 0), 0) as pending_amount,
  case
    when coalesce(sum(stp.amount), 0) >= ms.monthly_tuition then 'paid'
    when coalesce(sum(stp.amount), 0) = 0 then 'unpaid'
    else 'partial'
  end as status
from month_series ms
left join public.student_tuition_payments stp
  on stp.student_id = ms.student_id
  and stp.period_month = ms.period_month
where extract(month from ms.period_month) between 2 and 11
group by ms.student_id, ms.student_name, ms.period_month, ms.monthly_tuition;

create or replace view public.student_tuition_summary as
select
  student_id,
  student_name,
  sum(expected_amount) as total_expected,
  sum(paid_amount) as total_paid,
  sum(pending_amount) as total_pending,
  count(*) filter (where pending_amount > 0) as pending_months
from public.student_tuition_month_status
group by student_id, student_name;

commit;
