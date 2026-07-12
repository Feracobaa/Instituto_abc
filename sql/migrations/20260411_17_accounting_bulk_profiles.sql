begin;

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

  if p_monthly_tuition not in (120, 130) then
    raise exception 'Monthly tuition must be 120 or 130.';
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

commit;
