begin;

do $$
begin
  if exists (
    select 1
    from pg_type
    where typname = 'accounting_category_enum'
  ) then
    alter type public.accounting_category_enum add value if not exists 'suplent_payment';
    alter type public.accounting_category_enum add value if not exists 'internet';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'financial_transactions_category_type_check'
  ) then
    alter table public.financial_transactions
      drop constraint financial_transactions_category_type_check;
  end if;

  alter table public.financial_transactions
    add constraint financial_transactions_category_type_check
    check (
      (movement_type = 'income' and category in ('other_income'))
      or (movement_type = 'expense' and category in (
        'teacher_payment',
        'suplent_payment',
        'rent',
        'internet',
        'water',
        'electricity',
        'cleaning',
        'inventory_purchase',
        'repair',
        'other_expense'
      ))
    );
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'financial_transactions_teacher_required'
  ) then
    alter table public.financial_transactions
      drop constraint financial_transactions_teacher_required;
  end if;

  alter table public.financial_transactions
    add constraint financial_transactions_teacher_required
    check (
      category not in ('teacher_payment', 'suplent_payment')
      or teacher_id is not null
    );
end
$$;

create or replace function public.reset_student_tuition_profile(
  p_student_id uuid
)
returns integer
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_deleted_rows integer := 0;
begin
  if not public.is_user_contable() then
    raise exception 'Only contable users can reset tuition profiles.';
  end if;

  delete from public.student_tuition_payments
  where student_id = p_student_id;

  get diagnostics v_deleted_rows = row_count;

  delete from public.student_tuition_profiles
  where student_id = p_student_id;

  return v_deleted_rows;
end;
$function$;

grant execute on function public.reset_student_tuition_profile(uuid) to authenticated;

commit;
