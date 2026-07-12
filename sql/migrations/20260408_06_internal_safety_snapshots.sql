begin;

-- Lightweight safety snapshot inside the same database.
-- This is not a full disaster-recovery backup, but it protects the critical
-- academic data before applying RLS hardening.

create schema if not exists safety_snapshots;

drop table if exists safety_snapshots.grade_records_20260408;
create table safety_snapshots.grade_records_20260408 as
table public.grade_records;

drop table if exists safety_snapshots.preescolar_evaluations_20260408;
create table safety_snapshots.preescolar_evaluations_20260408 as
table public.preescolar_evaluations;

drop table if exists safety_snapshots.students_20260408;
create table safety_snapshots.students_20260408 as
table public.students;

drop table if exists safety_snapshots.teachers_20260408;
create table safety_snapshots.teachers_20260408 as
table public.teachers;

drop table if exists safety_snapshots.teacher_subjects_20260408;
create table safety_snapshots.teacher_subjects_20260408 as
table public.teacher_subjects;

drop table if exists safety_snapshots.teacher_grade_assignments_20260408;
create table safety_snapshots.teacher_grade_assignments_20260408 as
table public.teacher_grade_assignments;

drop table if exists safety_snapshots.subjects_20260408;
create table safety_snapshots.subjects_20260408 as
table public.subjects;

drop table if exists safety_snapshots.schedules_20260408;
create table safety_snapshots.schedules_20260408 as
table public.schedules;

drop table if exists safety_snapshots.academic_periods_20260408;
create table safety_snapshots.academic_periods_20260408 as
table public.academic_periods;

commit;

select
  'grade_records' as table_name,
  count(*) as rows_copied
from safety_snapshots.grade_records_20260408
union all
select 'preescolar_evaluations', count(*) from safety_snapshots.preescolar_evaluations_20260408
union all
select 'students', count(*) from safety_snapshots.students_20260408
union all
select 'teachers', count(*) from safety_snapshots.teachers_20260408
union all
select 'teacher_subjects', count(*) from safety_snapshots.teacher_subjects_20260408
union all
select 'teacher_grade_assignments', count(*) from safety_snapshots.teacher_grade_assignments_20260408
union all
select 'subjects', count(*) from safety_snapshots.subjects_20260408
union all
select 'schedules', count(*) from safety_snapshots.schedules_20260408
union all
select 'academic_periods', count(*) from safety_snapshots.academic_periods_20260408;
