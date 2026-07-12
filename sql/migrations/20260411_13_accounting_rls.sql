begin;

alter table public.student_tuition_profiles enable row level security;
alter table public.student_tuition_payments enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.inventory_items enable row level security;

drop policy if exists student_tuition_profiles_select_contable on public.student_tuition_profiles;
drop policy if exists student_tuition_profiles_select_rector on public.student_tuition_profiles;
drop policy if exists student_tuition_profiles_insert_contable on public.student_tuition_profiles;
drop policy if exists student_tuition_profiles_update_contable on public.student_tuition_profiles;
drop policy if exists student_tuition_profiles_delete_contable on public.student_tuition_profiles;

create policy student_tuition_profiles_select_contable
on public.student_tuition_profiles
for select
to authenticated
using (public.is_user_contable());

create policy student_tuition_profiles_select_rector
on public.student_tuition_profiles
for select
to authenticated
using (public.is_user_rector());

create policy student_tuition_profiles_insert_contable
on public.student_tuition_profiles
for insert
to authenticated
with check (public.is_user_contable());

create policy student_tuition_profiles_update_contable
on public.student_tuition_profiles
for update
to authenticated
using (public.is_user_contable())
with check (public.is_user_contable());

create policy student_tuition_profiles_delete_contable
on public.student_tuition_profiles
for delete
to authenticated
using (public.is_user_contable());

drop policy if exists student_tuition_payments_select_contable on public.student_tuition_payments;
drop policy if exists student_tuition_payments_select_rector on public.student_tuition_payments;
drop policy if exists student_tuition_payments_insert_contable on public.student_tuition_payments;
drop policy if exists student_tuition_payments_update_contable on public.student_tuition_payments;
drop policy if exists student_tuition_payments_delete_contable on public.student_tuition_payments;

create policy student_tuition_payments_select_contable
on public.student_tuition_payments
for select
to authenticated
using (public.is_user_contable());

create policy student_tuition_payments_select_rector
on public.student_tuition_payments
for select
to authenticated
using (public.is_user_rector());

create policy student_tuition_payments_insert_contable
on public.student_tuition_payments
for insert
to authenticated
with check (public.is_user_contable());

create policy student_tuition_payments_update_contable
on public.student_tuition_payments
for update
to authenticated
using (public.is_user_contable())
with check (public.is_user_contable());

create policy student_tuition_payments_delete_contable
on public.student_tuition_payments
for delete
to authenticated
using (public.is_user_contable());

drop policy if exists financial_transactions_select_contable on public.financial_transactions;
drop policy if exists financial_transactions_select_rector on public.financial_transactions;
drop policy if exists financial_transactions_insert_contable on public.financial_transactions;
drop policy if exists financial_transactions_update_contable on public.financial_transactions;
drop policy if exists financial_transactions_delete_contable on public.financial_transactions;

create policy financial_transactions_select_contable
on public.financial_transactions
for select
to authenticated
using (public.is_user_contable());

create policy financial_transactions_select_rector
on public.financial_transactions
for select
to authenticated
using (public.is_user_rector());

create policy financial_transactions_insert_contable
on public.financial_transactions
for insert
to authenticated
with check (public.is_user_contable());

create policy financial_transactions_update_contable
on public.financial_transactions
for update
to authenticated
using (public.is_user_contable())
with check (public.is_user_contable());

create policy financial_transactions_delete_contable
on public.financial_transactions
for delete
to authenticated
using (public.is_user_contable());

drop policy if exists inventory_items_select_contable on public.inventory_items;
drop policy if exists inventory_items_select_rector on public.inventory_items;
drop policy if exists inventory_items_insert_contable on public.inventory_items;
drop policy if exists inventory_items_update_contable on public.inventory_items;
drop policy if exists inventory_items_delete_contable on public.inventory_items;

create policy inventory_items_select_contable
on public.inventory_items
for select
to authenticated
using (public.is_user_contable());

create policy inventory_items_select_rector
on public.inventory_items
for select
to authenticated
using (public.is_user_rector());

create policy inventory_items_insert_contable
on public.inventory_items
for insert
to authenticated
with check (public.is_user_contable());

create policy inventory_items_update_contable
on public.inventory_items
for update
to authenticated
using (public.is_user_contable())
with check (public.is_user_contable());

create policy inventory_items_delete_contable
on public.inventory_items
for delete
to authenticated
using (public.is_user_contable());

grant select, insert, update, delete on public.student_tuition_profiles to authenticated;
grant select, insert, update, delete on public.student_tuition_payments to authenticated;
grant select, insert, update, delete on public.financial_transactions to authenticated;
grant select, insert, update, delete on public.inventory_items to authenticated;

commit;
