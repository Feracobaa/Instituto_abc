begin;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_tuition_payments_profile_fk'
  ) then
    alter table public.student_tuition_payments
      add constraint student_tuition_payments_profile_fk
      foreign key (student_id)
      references public.student_tuition_profiles(student_id)
      on delete cascade;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'financial_transactions_category_type_check'
  ) then
    alter table public.financial_transactions
      add constraint financial_transactions_category_type_check
      check (
        (movement_type = 'income' and category in ('other_income'))
        or (movement_type = 'expense' and category in (
          'teacher_payment',
          'rent',
          'water',
          'electricity',
          'cleaning',
          'inventory_purchase',
          'repair',
          'other_expense'
        ))
      );
  end if;
end
$$;

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

drop trigger if exists student_tuition_payments_validate on public.student_tuition_payments;
create trigger student_tuition_payments_validate
before insert or update on public.student_tuition_payments
for each row
execute function public.validate_student_tuition_payment();

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

create index if not exists student_tuition_payments_student_period_idx
  on public.student_tuition_payments (student_id, period_month);

create index if not exists student_tuition_payments_period_month_idx
  on public.student_tuition_payments (period_month);

create index if not exists financial_transactions_period_month_idx
  on public.financial_transactions (period_month);

create index if not exists financial_transactions_teacher_period_month_idx
  on public.financial_transactions (teacher_id, period_month);

commit;
