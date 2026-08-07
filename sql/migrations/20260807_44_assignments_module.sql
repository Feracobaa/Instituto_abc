-- Migration: 20260807_44_assignments_module.sql
-- Description: Módulo de Tareas y Entregas con RLS Multitenant e Índices de Rendimiento

-- 1. Tabla de Tareas (assignments)
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  grade_id UUID NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  period_id UUID REFERENCES public.academic_periods(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description_json TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla de Entregas de Tareas (assignment_submissions)
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'evaluated', 'late')),
  submitted_at TIMESTAMPTZ,
  submission_text TEXT,
  file_url TEXT,
  feedback TEXT,
  score NUMERIC(5, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assignment_submissions_student_unique UNIQUE (assignment_id, student_id)
);

-- 3. Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_assignments_institution ON public.assignments(institution_id);
CREATE INDEX IF NOT EXISTS idx_assignments_grade ON public.assignments(grade_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON public.assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON public.assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON public.assignments(due_date);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_inst ON public.assignment_submissions(institution_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON public.assignment_submissions(status);

-- 4. Triggers para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_assignments_updated_at ON public.assignments;
CREATE TRIGGER set_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_column();

DROP TRIGGER IF EXISTS set_assignment_submissions_updated_at ON public.assignment_submissions;
CREATE TRIGGER set_assignment_submissions_updated_at
  BEFORE UPDATE ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_column();

-- 5. Habilitar RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para assignments
DROP POLICY IF EXISTS "assignments_rector_all" ON public.assignments;
CREATE POLICY "assignments_rector_all"
  ON public.assignments
  FOR ALL
  TO authenticated
  USING (
    institution_id = public.current_institution_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('rector', 'admin')
    )
  )
  WITH CHECK (
    institution_id = public.current_institution_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('rector', 'admin')
    )
  );

DROP POLICY IF EXISTS "assignments_teacher_select" ON public.assignments;
CREATE POLICY "assignments_teacher_select"
  ON public.assignments
  FOR SELECT
  TO authenticated
  USING (
    institution_id = public.current_institution_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'profesor'
    )
  );

DROP POLICY IF EXISTS "assignments_teacher_insert" ON public.assignments;
CREATE POLICY "assignments_teacher_insert"
  ON public.assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    institution_id = public.current_institution_id()
    AND EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.user_id = auth.uid() AND t.id = teacher_id
    )
  );

DROP POLICY IF EXISTS "assignments_teacher_update_delete" ON public.assignments;
CREATE POLICY "assignments_teacher_update_delete"
  ON public.assignments
  FOR ALL
  TO authenticated
  USING (
    institution_id = public.current_institution_id()
    AND EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.user_id = auth.uid() AND t.id = teacher_id
    )
  )
  WITH CHECK (
    institution_id = public.current_institution_id()
    AND EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.user_id = auth.uid() AND t.id = teacher_id
    )
  );

DROP POLICY IF EXISTS "assignments_parent_select" ON public.assignments;
CREATE POLICY "assignments_parent_select"
  ON public.assignments
  FOR SELECT
  TO authenticated
  USING (
    institution_id = public.current_institution_id()
    AND status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.student_guardian_accounts sga
      JOIN public.students s ON s.id = sga.student_id
      WHERE sga.user_id = auth.uid()
        AND s.grade_id = assignments.grade_id
    )
  );

-- 7. Políticas RLS para assignment_submissions
DROP POLICY IF EXISTS "submissions_rector_all" ON public.assignment_submissions;
CREATE POLICY "submissions_rector_all"
  ON public.assignment_submissions
  FOR ALL
  TO authenticated
  USING (
    institution_id = public.current_institution_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('rector', 'admin')
    )
  )
  WITH CHECK (
    institution_id = public.current_institution_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('rector', 'admin')
    )
  );

DROP POLICY IF EXISTS "submissions_teacher_all" ON public.assignment_submissions;
CREATE POLICY "submissions_teacher_all"
  ON public.assignment_submissions
  FOR ALL
  TO authenticated
  USING (
    institution_id = public.current_institution_id()
    AND EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.teachers t ON t.id = a.teacher_id
      WHERE a.id = assignment_submissions.assignment_id
        AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    institution_id = public.current_institution_id()
    AND EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.teachers t ON t.id = a.teacher_id
      WHERE a.id = assignment_submissions.assignment_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "submissions_parent_all" ON public.assignment_submissions;
CREATE POLICY "submissions_parent_all"
  ON public.assignment_submissions
  FOR ALL
  TO authenticated
  USING (
    institution_id = public.current_institution_id()
    AND EXISTS (
      SELECT 1 FROM public.student_guardian_accounts sga
      WHERE sga.user_id = auth.uid()
        AND sga.student_id = assignment_submissions.student_id
    )
  )
  WITH CHECK (
    institution_id = public.current_institution_id()
    AND EXISTS (
      SELECT 1 FROM public.student_guardian_accounts sga
      WHERE sga.user_id = auth.uid()
        AND sga.student_id = assignment_submissions.student_id
    )
  );
