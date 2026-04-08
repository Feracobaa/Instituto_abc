-- ==============================================================================
-- SCRIPT FINAL: RLS CON POLÍTICAS GRANULARES (sin warnings del linter)
-- Corre este script en Supabase Dashboard → SQL Editor
-- ==============================================================================

-- ============================================================
-- BLOQUE 1: grade_records — scoped por teacher_id / rol rector
-- ============================================================

ALTER TABLE public.grade_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de calificaciones para autenticados"       ON public.grade_records;
DROP POLICY IF EXISTS "Inserción de calificaciones para autenticados"     ON public.grade_records;
DROP POLICY IF EXISTS "Actualización de calificaciones para autenticados" ON public.grade_records;
DROP POLICY IF EXISTS "grade_records_select" ON public.grade_records;
DROP POLICY IF EXISTS "grade_records_insert" ON public.grade_records;
DROP POLICY IF EXISTS "grade_records_update" ON public.grade_records;

-- SELECT: todos los autenticados pueden leer (no genera warning)
CREATE POLICY "grade_records_select"
  ON public.grade_records FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: solo si el teacher_id coincide con el profesor autenticado, o es rector
CREATE POLICY "grade_records_insert"
  ON public.grade_records FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role('rector'::public.app_role, auth.uid())
    OR teacher_id = public.get_teacher_id_for_user(auth.uid())
  );

-- UPDATE: solo el profesor dueño del registro, o rector
CREATE POLICY "grade_records_update"
  ON public.grade_records FOR UPDATE
  TO authenticated
  USING (
    public.has_role('rector'::public.app_role, auth.uid())
    OR teacher_id = public.get_teacher_id_for_user(auth.uid())
  )
  WITH CHECK (
    public.has_role('rector'::public.app_role, auth.uid())
    OR teacher_id = public.get_teacher_id_for_user(auth.uid())
  );

GRANT SELECT, INSERT, UPDATE ON public.grade_records TO authenticated;

-- ============================================================
-- BLOQUE 2: Tablas de apoyo del IABC
-- ============================================================

-- subjects
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura de materias para autenticados" ON public.subjects;
DROP POLICY IF EXISTS "subjects_select" ON public.subjects;
DROP POLICY IF EXISTS "subjects_insert" ON public.subjects;
DROP POLICY IF EXISTS "subjects_update" ON public.subjects;
CREATE POLICY "subjects_select" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "subjects_insert" ON public.subjects FOR INSERT TO authenticated WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "subjects_update" ON public.subjects FOR UPDATE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid())) WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.subjects TO authenticated;

-- academic_periods
ALTER TABLE public.academic_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura de períodos para autenticados" ON public.academic_periods;
DROP POLICY IF EXISTS "academic_periods_select" ON public.academic_periods;
DROP POLICY IF EXISTS "academic_periods_insert" ON public.academic_periods;
DROP POLICY IF EXISTS "academic_periods_update" ON public.academic_periods;
CREATE POLICY "academic_periods_select" ON public.academic_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "academic_periods_insert" ON public.academic_periods FOR INSERT TO authenticated WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "academic_periods_update" ON public.academic_periods FOR UPDATE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid())) WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.academic_periods TO authenticated;

-- ============================================================
-- BLOQUE 3: Tablas de exámenes legacy
-- SELECT abierto para autenticados; writes solo para rector
-- ============================================================

-- -------- usuarios --------
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso autenticado a usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete" ON public.usuarios;
CREATE POLICY "usuarios_select" ON public.usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "usuarios_insert" ON public.usuarios FOR INSERT TO authenticated WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "usuarios_update" ON public.usuarios FOR UPDATE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid())) WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "usuarios_delete" ON public.usuarios FOR DELETE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios TO authenticated;

-- -------- examenes --------
ALTER TABLE public.examenes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso autenticado a examenes" ON public.examenes;
DROP POLICY IF EXISTS "examenes_select" ON public.examenes;
DROP POLICY IF EXISTS "examenes_insert" ON public.examenes;
DROP POLICY IF EXISTS "examenes_update" ON public.examenes;
DROP POLICY IF EXISTS "examenes_delete" ON public.examenes;
CREATE POLICY "examenes_select" ON public.examenes FOR SELECT TO authenticated USING (true);
CREATE POLICY "examenes_insert" ON public.examenes FOR INSERT TO authenticated WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "examenes_update" ON public.examenes FOR UPDATE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid())) WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "examenes_delete" ON public.examenes FOR DELETE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.examenes TO authenticated;

-- -------- exam_settings --------
ALTER TABLE public.exam_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso autenticado a exam_settings" ON public.exam_settings;
DROP POLICY IF EXISTS "exam_settings_select" ON public.exam_settings;
DROP POLICY IF EXISTS "exam_settings_insert" ON public.exam_settings;
DROP POLICY IF EXISTS "exam_settings_update" ON public.exam_settings;
CREATE POLICY "exam_settings_select" ON public.exam_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "exam_settings_insert" ON public.exam_settings FOR INSERT TO authenticated WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "exam_settings_update" ON public.exam_settings FOR UPDATE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid())) WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.exam_settings TO authenticated;

-- -------- preguntas --------
ALTER TABLE public.preguntas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso autenticado a preguntas" ON public.preguntas;
DROP POLICY IF EXISTS "preguntas_select" ON public.preguntas;
DROP POLICY IF EXISTS "preguntas_insert" ON public.preguntas;
DROP POLICY IF EXISTS "preguntas_update" ON public.preguntas;
DROP POLICY IF EXISTS "preguntas_delete" ON public.preguntas;
CREATE POLICY "preguntas_select" ON public.preguntas FOR SELECT TO authenticated USING (true);
CREATE POLICY "preguntas_insert" ON public.preguntas FOR INSERT TO authenticated WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "preguntas_update" ON public.preguntas FOR UPDATE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid())) WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "preguntas_delete" ON public.preguntas FOR DELETE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preguntas TO authenticated;

-- -------- resultados --------
ALTER TABLE public.resultados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso autenticado a resultados" ON public.resultados;
DROP POLICY IF EXISTS "resultados_select" ON public.resultados;
DROP POLICY IF EXISTS "resultados_insert" ON public.resultados;
DROP POLICY IF EXISTS "resultados_update" ON public.resultados;
CREATE POLICY "resultados_select" ON public.resultados FOR SELECT TO authenticated USING (true);
CREATE POLICY "resultados_insert" ON public.resultados FOR INSERT TO authenticated WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "resultados_update" ON public.resultados FOR UPDATE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid())) WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.resultados TO authenticated;

-- -------- exam_responses --------
ALTER TABLE public.exam_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso autenticado a exam_responses" ON public.exam_responses;
DROP POLICY IF EXISTS "exam_responses_select" ON public.exam_responses;
DROP POLICY IF EXISTS "exam_responses_insert" ON public.exam_responses;
DROP POLICY IF EXISTS "exam_responses_update" ON public.exam_responses;
CREATE POLICY "exam_responses_select" ON public.exam_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "exam_responses_insert" ON public.exam_responses FOR INSERT TO authenticated WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "exam_responses_update" ON public.exam_responses FOR UPDATE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid())) WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.exam_responses TO authenticated;

-- -------- exam_progress --------
ALTER TABLE public.exam_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso autenticado a exam_progress" ON public.exam_progress;
DROP POLICY IF EXISTS "exam_progress_select" ON public.exam_progress;
DROP POLICY IF EXISTS "exam_progress_insert" ON public.exam_progress;
DROP POLICY IF EXISTS "exam_progress_update" ON public.exam_progress;
CREATE POLICY "exam_progress_select" ON public.exam_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY "exam_progress_insert" ON public.exam_progress FOR INSERT TO authenticated WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "exam_progress_update" ON public.exam_progress FOR UPDATE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid())) WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.exam_progress TO authenticated;

-- -------- active_exam_sessions --------
ALTER TABLE public.active_exam_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso autenticado a active_exam_sessions" ON public.active_exam_sessions;
DROP POLICY IF EXISTS "active_exam_sessions_select" ON public.active_exam_sessions;
DROP POLICY IF EXISTS "active_exam_sessions_insert" ON public.active_exam_sessions;
DROP POLICY IF EXISTS "active_exam_sessions_update" ON public.active_exam_sessions;
DROP POLICY IF EXISTS "active_exam_sessions_delete" ON public.active_exam_sessions;
CREATE POLICY "active_exam_sessions_select" ON public.active_exam_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "active_exam_sessions_insert" ON public.active_exam_sessions FOR INSERT TO authenticated WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "active_exam_sessions_update" ON public.active_exam_sessions FOR UPDATE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid())) WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "active_exam_sessions_delete" ON public.active_exam_sessions FOR DELETE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.active_exam_sessions TO authenticated;

-- -------- exam_audit_log --------
ALTER TABLE public.exam_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso autenticado a exam_audit_log" ON public.exam_audit_log;
DROP POLICY IF EXISTS "exam_audit_log_select" ON public.exam_audit_log;
DROP POLICY IF EXISTS "exam_audit_log_insert" ON public.exam_audit_log;
CREATE POLICY "exam_audit_log_select" ON public.exam_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "exam_audit_log_insert" ON public.exam_audit_log FOR INSERT TO authenticated WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
GRANT SELECT, INSERT ON public.exam_audit_log TO authenticated;

-- -------- question_statistics --------
ALTER TABLE public.question_statistics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso autenticado a question_statistics" ON public.question_statistics;
DROP POLICY IF EXISTS "question_statistics_select" ON public.question_statistics;
DROP POLICY IF EXISTS "question_statistics_insert" ON public.question_statistics;
DROP POLICY IF EXISTS "question_statistics_update" ON public.question_statistics;
CREATE POLICY "question_statistics_select" ON public.question_statistics FOR SELECT TO authenticated USING (true);
CREATE POLICY "question_statistics_insert" ON public.question_statistics FOR INSERT TO authenticated WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "question_statistics_update" ON public.question_statistics FOR UPDATE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid())) WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.question_statistics TO authenticated;

-- -------- feedback_analytic --------
ALTER TABLE public.feedback_analytic ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso autenticado a feedback_analytic" ON public.feedback_analytic;
DROP POLICY IF EXISTS "feedback_analytic_select" ON public.feedback_analytic;
DROP POLICY IF EXISTS "feedback_analytic_insert" ON public.feedback_analytic;
DROP POLICY IF EXISTS "feedback_analytic_update" ON public.feedback_analytic;
CREATE POLICY "feedback_analytic_select" ON public.feedback_analytic FOR SELECT TO authenticated USING (true);
CREATE POLICY "feedback_analytic_insert" ON public.feedback_analytic FOR INSERT TO authenticated WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "feedback_analytic_update" ON public.feedback_analytic FOR UPDATE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid())) WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.feedback_analytic TO authenticated;

-- -------- simulacros --------
ALTER TABLE public.simulacros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso autenticado a simulacros" ON public.simulacros;
DROP POLICY IF EXISTS "simulacros_select" ON public.simulacros;
DROP POLICY IF EXISTS "simulacros_insert" ON public.simulacros;
DROP POLICY IF EXISTS "simulacros_update" ON public.simulacros;
DROP POLICY IF EXISTS "simulacros_delete" ON public.simulacros;
CREATE POLICY "simulacros_select" ON public.simulacros FOR SELECT TO authenticated USING (true);
CREATE POLICY "simulacros_insert" ON public.simulacros FOR INSERT TO authenticated WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "simulacros_update" ON public.simulacros FOR UPDATE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid())) WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "simulacros_delete" ON public.simulacros FOR DELETE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.simulacros TO authenticated;

-- -------- simulacro_respuestas --------
ALTER TABLE public.simulacro_respuestas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso autenticado a simulacro_respuestas" ON public.simulacro_respuestas;
DROP POLICY IF EXISTS "simulacro_respuestas_select" ON public.simulacro_respuestas;
DROP POLICY IF EXISTS "simulacro_respuestas_insert" ON public.simulacro_respuestas;
DROP POLICY IF EXISTS "simulacro_respuestas_update" ON public.simulacro_respuestas;
CREATE POLICY "simulacro_respuestas_select" ON public.simulacro_respuestas FOR SELECT TO authenticated USING (true);
CREATE POLICY "simulacro_respuestas_insert" ON public.simulacro_respuestas FOR INSERT TO authenticated WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "simulacro_respuestas_update" ON public.simulacro_respuestas FOR UPDATE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid())) WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.simulacro_respuestas TO authenticated;

-- -------- simulacro_resultados --------
ALTER TABLE public.simulacro_resultados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso autenticado a simulacro_resultados" ON public.simulacro_resultados;
DROP POLICY IF EXISTS "simulacro_resultados_select" ON public.simulacro_resultados;
DROP POLICY IF EXISTS "simulacro_resultados_insert" ON public.simulacro_resultados;
DROP POLICY IF EXISTS "simulacro_resultados_update" ON public.simulacro_resultados;
CREATE POLICY "simulacro_resultados_select" ON public.simulacro_resultados FOR SELECT TO authenticated USING (true);
CREATE POLICY "simulacro_resultados_insert" ON public.simulacro_resultados FOR INSERT TO authenticated WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
CREATE POLICY "simulacro_resultados_update" ON public.simulacro_resultados FOR UPDATE TO authenticated USING (public.has_role('rector'::public.app_role, auth.uid())) WITH CHECK (public.has_role('rector'::public.app_role, auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.simulacro_resultados TO authenticated;

-- ==============================================================================
-- NOTA FINAL: warning "Leaked Password Protection"
-- No se corrige con SQL. Ve a:
-- Dashboard → Authentication → Settings → Password Strength
-- → Activa "Enable leaked password protection"
-- ==============================================================================
