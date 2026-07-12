-- Migration: Create Trigger to Notify Guardian when Grade is Created/Updated
-- Run this in your Supabase SQL Editor

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_grade_record()
RETURNS TRIGGER AS $$
DECLARE
  v_guardian_user_id UUID;
  v_subject_name TEXT;
  v_student_name TEXT;
  v_message TEXT;
BEGIN
  -- Find the guardian's user_id linked to the student
  SELECT user_id INTO v_guardian_user_id
  FROM public.student_guardian_accounts
  WHERE student_id = NEW.student_id
  LIMIT 1;

  -- If there is a guardian to notify
  IF v_guardian_user_id IS NOT NULL THEN
    -- Fetch subject name
    SELECT name INTO v_subject_name
    FROM public.subjects
    WHERE id = NEW.subject_id;

    -- Fetch student name
    SELECT full_name INTO v_student_name
    FROM public.students
    WHERE id = NEW.student_id;

    -- Format the message depending on insert vs update
    IF TG_OP = 'INSERT' THEN
      v_message := 'Se ha registrado una nueva calificación de ' || COALESCE(NEW.grade::text, '0') || ' para ' || COALESCE(v_student_name, 'el estudiante') || ' en la asignatura ' || COALESCE(v_subject_name, 'asignatura') || '.';
    ELSIF TG_OP = 'UPDATE' AND OLD.grade IS DISTINCT FROM NEW.grade THEN
      v_message := 'Se ha actualizado la calificación de ' || COALESCE(v_student_name, 'el estudiante') || ' en la asignatura ' || COALESCE(v_subject_name, 'asignatura') || ' a ' || COALESCE(NEW.grade::text, '0') || '.';
    ELSE
      -- If the grade itself did not change, do not trigger a new notification
      RETURN NEW;
    END IF;

    -- Insert notification for the guardian
    INSERT INTO public.notifications (
      institution_id,
      user_id,
      title,
      message,
      type,
      link_url
    ) VALUES (
      NEW.institution_id,
      v_guardian_user_id,
      'Nueva Calificación',
      v_message,
      'info',
      '/portal'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger to public.grade_records
DROP TRIGGER IF EXISTS trigger_on_new_grade_record ON public.grade_records;
CREATE TRIGGER trigger_on_new_grade_record
    AFTER INSERT OR UPDATE ON public.grade_records
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_grade_record();
