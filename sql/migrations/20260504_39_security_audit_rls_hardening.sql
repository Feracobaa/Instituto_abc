begin;

-- ==============================================================================
-- 1. Helper Functions to Check Module Access in RLS Policies
-- ==============================================================================
-- These functions use the dynamic module access system to verify if the current
-- user's role has permission to read or mutate data for a specific module,
-- AND if the institution's subscription allows access to that module.

create or replace function public.can_read_module(p_module_code text)
returns boolean
language sql
stable security definer
set search_path = 'public'
as $$
  select exists (
    select 1
    from public.get_current_institution_module_access()
    where module_code = p_module_code
      and is_enabled = true
      and access_level in ('full', 'readonly')
  );
$$;

grant execute on function public.can_read_module(text) to authenticated;

create or replace function public.can_mutate_module(p_module_code text)
returns boolean
language sql
stable security definer
set search_path = 'public'
as $$
  select exists (
    select 1
    from public.get_current_institution_module_access()
    where module_code = p_module_code
      and is_enabled = true
      and access_level = 'full'
  );
$$;

grant execute on function public.can_mutate_module(text) to authenticated;

-- ==============================================================================
-- 2. Harden Accounting RLS Policies
-- ==============================================================================
-- We are replacing the hardcoded `is_user_contable()` and `is_user_rector()`
-- checks with our dynamic module permissions helpers.
-- The module code for accounting is 'contabilidad'.

-- Re-apply RLS enforcement just in case
alter table public.student_tuition_profiles enable row level security;
alter table public.student_tuition_payments enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.inventory_items enable row level security;

-- Drop old accounting policies
drop policy if exists student_tuition_profiles_select_contable on public.student_tuition_profiles;
drop policy if exists student_tuition_profiles_select_rector on public.student_tuition_profiles;
drop policy if exists student_tuition_profiles_insert_contable on public.student_tuition_profiles;
drop policy if exists student_tuition_profiles_update_contable on public.student_tuition_profiles;
drop policy if exists student_tuition_profiles_delete_contable on public.student_tuition_profiles;

drop policy if exists student_tuition_payments_select_contable on public.student_tuition_payments;
drop policy if exists student_tuition_payments_select_rector on public.student_tuition_payments;
drop policy if exists student_tuition_payments_insert_contable on public.student_tuition_payments;
drop policy if exists student_tuition_payments_update_contable on public.student_tuition_payments;
drop policy if exists student_tuition_payments_delete_contable on public.student_tuition_payments;

drop policy if exists financial_transactions_select_contable on public.financial_transactions;
drop policy if exists financial_transactions_select_rector on public.financial_transactions;
drop policy if exists financial_transactions_insert_contable on public.financial_transactions;
drop policy if exists financial_transactions_update_contable on public.financial_transactions;
drop policy if exists financial_transactions_delete_contable on public.financial_transactions;

drop policy if exists inventory_items_select_contable on public.inventory_items;
drop policy if exists inventory_items_select_rector on public.inventory_items;
drop policy if exists inventory_items_insert_contable on public.inventory_items;
drop policy if exists inventory_items_update_contable on public.inventory_items;
drop policy if exists inventory_items_delete_contable on public.inventory_items;

-- Re-create policies using the new helpers

-- student_tuition_profiles
create policy student_tuition_profiles_select_module
on public.student_tuition_profiles
for select
to authenticated
using (public.can_read_module('contabilidad'));

create policy student_tuition_profiles_insert_module
on public.student_tuition_profiles
for insert
to authenticated
with check (public.can_mutate_module('contabilidad'));

create policy student_tuition_profiles_update_module
on public.student_tuition_profiles
for update
to authenticated
using (public.can_mutate_module('contabilidad'))
with check (public.can_mutate_module('contabilidad'));

create policy student_tuition_profiles_delete_module
on public.student_tuition_profiles
for delete
to authenticated
using (public.can_mutate_module('contabilidad'));

-- student_tuition_payments
create policy student_tuition_payments_select_module
on public.student_tuition_payments
for select
to authenticated
using (public.can_read_module('contabilidad'));

create policy student_tuition_payments_insert_module
on public.student_tuition_payments
for insert
to authenticated
with check (public.can_mutate_module('contabilidad'));

create policy student_tuition_payments_update_module
on public.student_tuition_payments
for update
to authenticated
using (public.can_mutate_module('contabilidad'))
with check (public.can_mutate_module('contabilidad'));

create policy student_tuition_payments_delete_module
on public.student_tuition_payments
for delete
to authenticated
using (public.can_mutate_module('contabilidad'));

-- financial_transactions
create policy financial_transactions_select_module
on public.financial_transactions
for select
to authenticated
using (public.can_read_module('contabilidad'));

create policy financial_transactions_insert_module
on public.financial_transactions
for insert
to authenticated
with check (public.can_mutate_module('contabilidad'));

create policy financial_transactions_update_module
on public.financial_transactions
for update
to authenticated
using (public.can_mutate_module('contabilidad'))
with check (public.can_mutate_module('contabilidad'));

create policy financial_transactions_delete_module
on public.financial_transactions
for delete
to authenticated
using (public.can_mutate_module('contabilidad'));

-- inventory_items
create policy inventory_items_select_module
on public.inventory_items
for select
to authenticated
using (public.can_read_module('contabilidad'));

create policy inventory_items_insert_module
on public.inventory_items
for insert
to authenticated
with check (public.can_mutate_module('contabilidad'));

create policy inventory_items_update_module
on public.inventory_items
for update
to authenticated
using (public.can_mutate_module('contabilidad'))
with check (public.can_mutate_module('contabilidad'));

create policy inventory_items_delete_module
on public.inventory_items
for delete
to authenticated
using (public.can_mutate_module('contabilidad'));

commit;
