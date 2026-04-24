-- Post-migration validation for:
-- 20260421_22 .. 20260421_26
-- Safe to run in staging/production (read-only except temp tables).

-- 1) Multi-tenant core tables should exist.
with expected_multi_tenant(table_name) as (
  values
    ('institutions'),
    ('institution_memberships'),
    ('institution_settings'),
    ('subscription_plans'),
    ('institution_subscriptions'),
    ('usage_events')
)
select
  emt.table_name,
  case when to_regclass('public.' || emt.table_name) is null then 'MISSING' else 'OK' end as status
from expected_multi_tenant emt
order by emt.table_name;

-- 2) Legacy tables should be removed.
with legacy_tables(table_name) as (
  values
    ('active_exam_sessions'),
    ('exam_audit_log'),
    ('exam_progress'),
    ('exam_responses'),
    ('exam_settings'),
    ('examenes'),
    ('feedback_analytic'),
    ('preguntas'),
    ('question_statistics'),
    ('resultados'),
    ('simulacro_respuestas'),
    ('simulacro_resultados'),
    ('simulacros'),
    ('usuarios')
)
select
  lt.table_name,
  case when to_regclass('public.' || lt.table_name) is null then 'REMOVED' else 'STILL_PRESENT' end as status
from legacy_tables lt
order by lt.table_name;

-- 3) Active tables: institution_id column, not-null backfill, FK to institutions.
create temp table if not exists _tenant_column_check (
  table_name text primary key,
  has_institution_id boolean not null,
  null_institution_rows bigint not null,
  has_institution_fk boolean not null
) on commit drop;

truncate _tenant_column_check;

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
  v_has_column boolean;
  v_has_fk boolean;
  v_null_rows bigint;
begin
  foreach target_table in array target_tables loop
    if to_regclass('public.' || target_table) is null then
      insert into _tenant_column_check (table_name, has_institution_id, null_institution_rows, has_institution_fk)
      values (target_table, false, 0, false)
      on conflict (table_name) do update
        set has_institution_id = excluded.has_institution_id,
            null_institution_rows = excluded.null_institution_rows,
            has_institution_fk = excluded.has_institution_fk;
      continue;
    end if;

    select exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = target_table
        and c.column_name = 'institution_id'
    )
    into v_has_column;

    if not v_has_column then
      insert into _tenant_column_check (table_name, has_institution_id, null_institution_rows, has_institution_fk)
      values (target_table, false, 0, false)
      on conflict (table_name) do update
        set has_institution_id = excluded.has_institution_id,
            null_institution_rows = excluded.null_institution_rows,
            has_institution_fk = excluded.has_institution_fk;
      continue;
    end if;

    execute format(
      'select count(*) from public.%I where institution_id is null',
      target_table
    )
    into v_null_rows;

    select exists (
      select 1
      from pg_constraint con
      join pg_attribute attr
        on attr.attrelid = con.conrelid
       and attr.attnum = any(con.conkey)
      where con.contype = 'f'
        and con.conrelid = ('public.' || target_table)::regclass
        and con.confrelid = 'public.institutions'::regclass
        and attr.attname = 'institution_id'
    )
    into v_has_fk;

    insert into _tenant_column_check (table_name, has_institution_id, null_institution_rows, has_institution_fk)
    values (target_table, true, v_null_rows, v_has_fk)
    on conflict (table_name) do update
      set has_institution_id = excluded.has_institution_id,
          null_institution_rows = excluded.null_institution_rows,
          has_institution_fk = excluded.has_institution_fk;
  end loop;
end
$$;

select *
from _tenant_column_check
order by table_name;

-- 4) RLS + restrictive tenant policy should be in place.
with target_tables(table_name) as (
  values
    ('academic_periods'),
    ('profiles'),
    ('user_roles'),
    ('teachers'),
    ('teacher_subjects'),
    ('teacher_grade_assignments'),
    ('grades'),
    ('students'),
    ('subjects'),
    ('schedules'),
    ('grade_records'),
    ('grade_record_partials'),
    ('preescolar_evaluations'),
    ('student_guardian_accounts'),
    ('student_tuition_profiles'),
    ('student_tuition_payments'),
    ('financial_transactions'),
    ('inventory_items'),
    ('student_attendance'),
    ('audit_logs')
)
select
  tt.table_name,
  coalesce(pc.relrowsecurity, false) as rls_enabled,
  exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = tt.table_name
      and p.policyname = left(tt.table_name || '_tenant_isolation_restrictive', 63)
      and lower(p.permissive) = 'restrictive'
  ) as has_restrictive_tenant_policy
from target_tables tt
left join pg_class pc
  on pc.oid = to_regclass('public.' || tt.table_name)
order by tt.table_name;

-- 5) audit_logs hardening checks.
select
  check_name,
  status
from (
  select 'audit_logs_table' as check_name, case when to_regclass('public.audit_logs') is null then 'MISSING' else 'OK' end as status
  union all
  select 'audit_logs_changed_at_idx', case when exists (
    select 1 from pg_indexes i
    where i.schemaname = 'public'
      and i.tablename = 'audit_logs'
      and i.indexname = 'audit_logs_changed_at_idx'
  ) then 'OK' else 'MISSING' end
  union all
  select 'audit_logs_table_name_idx', case when exists (
    select 1 from pg_indexes i
    where i.schemaname = 'public'
      and i.tablename = 'audit_logs'
      and i.indexname = 'audit_logs_table_name_idx'
  ) then 'OK' else 'MISSING' end
  union all
  select 'function_purge_audit_logs', case when exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'purge_audit_logs'
  ) then 'OK' else 'MISSING' end
) checks
order by check_name;

select
  p.policyname,
  p.cmd,
  p.permissive
from pg_policies p
where p.schemaname = 'public'
  and p.tablename = 'audit_logs'
order by p.policyname;

-- 6) Function availability for app contract.
select
  fn.function_name,
  case when exists (
    select 1
    from information_schema.routines r
    where r.routine_schema = 'public'
      and r.routine_name = fn.function_name
  ) then 'OK' else 'MISSING' end as status
from (
  values
    ('current_institution_id'),
    ('is_user_in_institution'),
    ('provision_institution'),
    ('reset_student_tuition_profile')
) as fn(function_name)
order by fn.function_name;

-- 7) Data sanity: at most one default membership per user.
select
  im.user_id,
  count(*) as default_membership_count
from public.institution_memberships im
where im.is_default
group by im.user_id
having count(*) > 1
order by default_membership_count desc, im.user_id;

-- 8) Quick distribution by institution (sample operational visibility).
select 'students' as table_name, institution_id, count(*) as row_count
from public.students
group by institution_id
union all
select 'teachers' as table_name, institution_id, count(*) as row_count
from public.teachers
group by institution_id
union all
select 'grade_records' as table_name, institution_id, count(*) as row_count
from public.grade_records
group by institution_id
union all
select 'student_attendance' as table_name, institution_id, count(*) as row_count
from public.student_attendance
group by institution_id
union all
select 'financial_transactions' as table_name, institution_id, count(*) as row_count
from public.financial_transactions
group by institution_id
order by table_name, institution_id;

-- 9) Final issue list (should return 0 rows).
with tenant_issues as (
  select
    table_name,
    case
      when not has_institution_id then 'missing institution_id column'
      when null_institution_rows > 0 then 'institution_id backfill has nulls'
      when not has_institution_fk then 'missing institution_id foreign key'
      else null
    end as issue
  from _tenant_column_check
),
legacy_issues as (
  select
    lt.table_name,
    'legacy table still present' as issue
  from (
    values
      ('active_exam_sessions'),
      ('exam_audit_log'),
      ('exam_progress'),
      ('exam_responses'),
      ('exam_settings'),
      ('examenes'),
      ('feedback_analytic'),
      ('preguntas'),
      ('question_statistics'),
      ('resultados'),
      ('simulacro_respuestas'),
      ('simulacro_resultados'),
      ('simulacros'),
      ('usuarios')
  ) as lt(table_name)
  where to_regclass('public.' || lt.table_name) is not null
)
select table_name, issue
from tenant_issues
where issue is not null
union all
select table_name, issue
from legacy_issues
order by table_name, issue;
