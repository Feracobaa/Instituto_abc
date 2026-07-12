-- Migration 20260422_33_performance_indexes
-- Description: Adds critical indexes missing from previous schemas, largely to optimize RLS policies and common lookups.

-- 1. grade_records: teacher_id (CRITICAL for RLS)
create index if not exists grade_records_teacher_id_idx on public.grade_records (teacher_id);

-- 2. grade_records: period_id (CRITICAL for module loads)
create index if not exists grade_records_period_id_idx on public.grade_records (period_id);

-- 3. grade_records: student_id (CRITICAL for guardian portal)
create index if not exists grade_records_student_id_idx on public.grade_records (student_id);

-- 4. students: grade_id
create index if not exists students_grade_id_idx on public.students (grade_id);

-- 5. schedules: teacher_id
create index if not exists schedules_teacher_id_idx on public.schedules (teacher_id);

-- 6. schedules: grade_id
create index if not exists schedules_grade_id_idx on public.schedules (grade_id);

-- 7. preescolar_evaluations: period_id
create index if not exists preescolar_evaluations_period_id_idx on public.preescolar_evaluations (period_id);

-- 8. preescolar_evaluations: student_id
create index if not exists preescolar_evaluations_student_id_idx on public.preescolar_evaluations (student_id);

-- 9. student_tuition_profiles: student_id
create index if not exists student_tuition_profiles_student_id_idx on public.student_tuition_profiles (student_id);
