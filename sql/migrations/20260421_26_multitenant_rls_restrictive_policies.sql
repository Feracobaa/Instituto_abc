begin;

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

    if not exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = target_table
        and c.column_name = 'institution_id'
    ) then
      continue;
    end if;

    execute format(
      'alter table public.%I enable row level security',
      target_table
    );

    policy_name := left(target_table || '_tenant_isolation_restrictive', 63);

    execute format(
      'drop policy if exists %I on public.%I',
      policy_name,
      target_table
    );

    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using (institution_id = public.current_institution_id()) with check (institution_id = public.current_institution_id())',
      policy_name,
      target_table
    );
  end loop;
end
$$;

commit;
