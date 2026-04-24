-- Preflight audit report for staging/production before destructive cleanup.
-- Read-only script: counts, dependencies and current RLS policy inventory.

-- 1) Active vs legacy table row counts
with target_tables(table_name, domain) as (
  values
    ('academic_periods', 'active'),
    ('profiles', 'active'),
    ('user_roles', 'active'),
    ('teachers', 'active'),
    ('teacher_subjects', 'active'),
    ('teacher_grade_assignments', 'active'),
    ('grades', 'active'),
    ('students', 'active'),
    ('subjects', 'active'),
    ('schedules', 'active'),
    ('grade_records', 'active'),
    ('grade_record_partials', 'active'),
    ('preescolar_evaluations', 'active'),
    ('student_guardian_accounts', 'active'),
    ('student_tuition_profiles', 'active'),
    ('student_tuition_payments', 'active'),
    ('financial_transactions', 'active'),
    ('inventory_items', 'active'),
    ('student_attendance', 'active'),
    ('audit_logs', 'active'),
    ('active_exam_sessions', 'legacy'),
    ('exam_audit_log', 'legacy'),
    ('exam_progress', 'legacy'),
    ('exam_responses', 'legacy'),
    ('exam_settings', 'legacy'),
    ('examenes', 'legacy'),
    ('feedback_analytic', 'legacy'),
    ('preguntas', 'legacy'),
    ('question_statistics', 'legacy'),
    ('resultados', 'legacy'),
    ('simulacro_respuestas', 'legacy'),
    ('simulacro_resultados', 'legacy'),
    ('simulacros', 'legacy'),
    ('usuarios', 'legacy')
)
select
  tt.domain,
  tt.table_name,
  c.reltuples::bigint as estimated_rows
from target_tables tt
left join pg_class c
  on c.relname = tt.table_name
left join pg_namespace n
  on n.oid = c.relnamespace
where c.oid is null or n.nspname = 'public'
order by tt.domain, tt.table_name;

-- 2) Foreign key dependencies for legacy tables (must be empty from active domain)
select
  con.conname as fk_name,
  con.conrelid::regclass::text as source_table,
  con.confrelid::regclass::text as target_table
from pg_constraint con
where con.contype = 'f'
  and (
    con.conrelid::regclass::text in (
      'public.active_exam_sessions',
      'public.exam_audit_log',
      'public.exam_progress',
      'public.exam_responses',
      'public.exam_settings',
      'public.examenes',
      'public.feedback_analytic',
      'public.preguntas',
      'public.question_statistics',
      'public.resultados',
      'public.simulacro_respuestas',
      'public.simulacro_resultados',
      'public.simulacros',
      'public.usuarios'
    )
    or con.confrelid::regclass::text in (
      'public.active_exam_sessions',
      'public.exam_audit_log',
      'public.exam_progress',
      'public.exam_responses',
      'public.exam_settings',
      'public.examenes',
      'public.feedback_analytic',
      'public.preguntas',
      'public.question_statistics',
      'public.resultados',
      'public.simulacro_respuestas',
      'public.simulacro_resultados',
      'public.simulacros',
      'public.usuarios'
    )
  )
order by source_table, target_table, fk_name;

-- 3) RLS policies by table
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
