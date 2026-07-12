-- Migration: 20260422_32_grade_records_teacher_id_not_null
-- Date: 2026-04-22
-- Purpose: Fix critical RLS issue - grade_records.teacher_id MUST be NOT NULL
-- 
-- CRITICAL: This migration enforces data integrity for Row Level Security
-- RLS policies cannot function correctly with nullable teacher_id

BEGIN;

-- Step 1: Log current state of orphaned records
CREATE TEMP TABLE orphaned_grade_records AS
SELECT 
  id,
  student_id,
  subject_id,
  period_id,
  grade,
  created_at,
  institution_id
FROM grade_records
WHERE teacher_id IS NULL;

-- If orphaned records exist, document them
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM orphaned_grade_records;
  
  IF orphan_count > 0 THEN
    INSERT INTO public.audit_logs (
      table_name,
      action,
      record_id,
      institution_id,
      details,
      changed_at,
      changed_by
    )
    SELECT
      'grade_records',
      'audit_orphaned_records',
      id::TEXT,
      institution_id,
      jsonb_build_object(
        'reason', 'Orphaned grade_record with NULL teacher_id detected during migration',
        'student_id', student_id,
        'subject_id', subject_id,
        'period_id', period_id,
        'grade', grade
      ),
      NOW(),
      'system'
    FROM orphaned_grade_records;
    
    RAISE WARNING 'Found % orphaned grade_records with NULL teacher_id', orphan_count;
  END IF;
END $$;

-- Step 2: STRATEGY FOR ORPHANED RECORDS
-- Option A: If we can infer teacher from schedule, assign it
-- Option B: If not possible, delete orphaned records (safest for RLS)
--
-- CHOSEN: Option B - Delete orphaned records (they cannot be valid without a teacher)
-- These records are data inconsistencies that violate business logic

DELETE FROM grade_records
WHERE teacher_id IS NULL;

-- Step 3: Ensure no NULL teacher_id remains
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM grade_records WHERE teacher_id IS NULL) THEN
    RAISE EXCEPTION 'MIGRATION FAILED: Still have NULL teacher_id in grade_records';
  END IF;
END $$;

-- Step 4: ALTER TABLE to add NOT NULL constraint
ALTER TABLE grade_records
ALTER COLUMN teacher_id SET NOT NULL;

-- Step 5: Ensure foreign key constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'grade_records'
      AND constraint_name LIKE '%teacher_id%'
  ) THEN
    ALTER TABLE grade_records
    ADD CONSTRAINT fk_grade_records_teacher_id
    FOREIGN KEY (teacher_id)
    REFERENCES teachers(id)
    ON DELETE RESTRICT;
  END IF;
END $$;

-- Step 6: Revalidate indexes
REINDEX TABLE grade_records;

-- Step 7: Verify RLS policies are still active
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'grade_records'
    AND policyname LIKE '%teacher%';
    
  IF policy_count = 0 THEN
    RAISE WARNING 'No teacher-related RLS policies found on grade_records';
  ELSE
    RAISE NOTICE 'Verified: % RLS policies active on grade_records', policy_count;
  END IF;
END $$;

-- Step 8: Document completion
COMMENT ON COLUMN grade_records.teacher_id IS 
'Teacher/Instructor who created this grade record. MUST NOT BE NULL - required for RLS policies.
RLS ensures teachers only see their own grade records via: grade_records.teacher_id = auth.uid()';

COMMIT;

-- Post-Migration Validation Queries (Run these to verify)
-- 
-- SELECT COUNT(*) FROM grade_records WHERE teacher_id IS NULL; -- Should return 0
-- SELECT COUNT(*) FROM pg_policies WHERE tablename = 'grade_records' AND policyname LIKE '%teacher%';
-- SELECT column_name, is_nullable FROM information_schema.columns 
--   WHERE table_name = 'grade_records' AND column_name = 'teacher_id'; -- Should show is_nullable = NO
--
-- Run tests:
-- npm run test -- --grep "RLS" -- Should still pass all 4 tests
