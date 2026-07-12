begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'accounting_movement_type'
      and e.enumlabel = 'income'
  ) then
    create type public.accounting_movement_type as enum ('income', 'expense');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'accounting_category_enum'
      and e.enumlabel = 'other_income'
  ) then
    create type public.accounting_category_enum as enum (
      'other_income',
      'teacher_payment',
      'rent',
      'water',
      'electricity',
      'cleaning',
      'inventory_purchase',
      'repair',
      'other_expense'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'inventory_payment_mode'
      and e.enumlabel = 'paid'
  ) then
    create type public.inventory_payment_mode as enum ('paid', 'financed');
  end if;
end
$$;

create table if not exists public.student_tuition_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete cascade,
  monthly_tuition numeric(10,2) not null,
  charge_start_month date not null,
  charge_end_month date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_tuition_profiles_monthly_tuition_check
    check (monthly_tuition in (120, 130)),
  constraint student_tuition_profiles_months_valid
    check (
      date_trunc('month', charge_start_month) = charge_start_month
      and (charge_end_month is null or date_trunc('month', charge_end_month) = charge_end_month)
      and (charge_end_month is null or charge_end_month >= charge_start_month)
    )
);

create table if not exists public.student_tuition_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  period_month date not null,
  amount numeric(10,2) not null,
  payment_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint student_tuition_payments_amount_check
    check (amount > 0),
  constraint student_tuition_payments_month_valid
    check (date_trunc('month', period_month) = period_month)
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  acquisition_date date not null,
  total_cost numeric(10,2) not null,
  payment_mode public.inventory_payment_mode not null default 'paid',
  outstanding_debt numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_items_total_cost_check
    check (total_cost > 0),
  constraint inventory_items_outstanding_debt_check
    check (outstanding_debt >= 0 and outstanding_debt <= total_cost),
  constraint inventory_items_mode_debt_check
    check (
      (payment_mode = 'paid' and outstanding_debt = 0)
      or (payment_mode = 'financed')
    )
);

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  movement_type public.accounting_movement_type not null,
  category public.accounting_category_enum not null,
  teacher_id uuid references public.teachers(id) on delete set null,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  period_month date not null,
  transaction_date date not null,
  amount numeric(10,2) not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_transactions_amount_check
    check (amount > 0),
  constraint financial_transactions_month_valid
    check (date_trunc('month', period_month) = period_month),
  constraint financial_transactions_teacher_required
    check (
      category <> 'teacher_payment'
      or teacher_id is not null
    )
);

create or replace function public.touch_accounting_updated_at()
returns trigger
language plpgsql
set search_path = 'public'
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists student_tuition_profiles_set_updated_at on public.student_tuition_profiles;
create trigger student_tuition_profiles_set_updated_at
before update on public.student_tuition_profiles
for each row
execute function public.touch_accounting_updated_at();

drop trigger if exists inventory_items_set_updated_at on public.inventory_items;
create trigger inventory_items_set_updated_at
before update on public.inventory_items
for each row
execute function public.touch_accounting_updated_at();

drop trigger if exists financial_transactions_set_updated_at on public.financial_transactions;
create trigger financial_transactions_set_updated_at
before update on public.financial_transactions
for each row
execute function public.touch_accounting_updated_at();

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

create or replace view public.student_tuition_month_status as
with profile_data as (
  select
    s.id as student_id,
    s.full_name as student_name,
    stp.monthly_tuition,
    stp.charge_start_month,
    coalesce(stp.charge_end_month, date_trunc('month', now())::date) as charge_end_month
  from public.student_tuition_profiles stp
  join public.students s
    on s.id = stp.student_id
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

create or replace view public.accounting_ledger as
select
  stp.id as movement_id,
  'income'::public.accounting_movement_type as movement_type,
  'tuition'::text as category_label,
  stp.student_id,
  null::uuid as teacher_id,
  null::uuid as inventory_item_id,
  stp.period_month,
  stp.payment_date as transaction_date,
  stp.amount,
  stp.notes as description,
  stp.created_at
from public.student_tuition_payments stp

union all

select
  ft.id as movement_id,
  ft.movement_type,
  ft.category::text as category_label,
  null::uuid as student_id,
  ft.teacher_id,
  ft.inventory_item_id,
  ft.period_month,
  ft.transaction_date,
  ft.amount,
  ft.description,
  ft.created_at
from public.financial_transactions ft;

commit;
