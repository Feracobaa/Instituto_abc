-- Migration: 20260807_45_teachers_rls_parent_access.sql
-- Description: Permite a los usuarios autenticados (incluidos padres y estudiantes) consultar el directorio de profesores de su institución para tareas, horarios y boletines.

BEGIN;

-- 1. Asegurar política permisiva de lectura para usuarios autenticados de la institución
DROP POLICY IF EXISTS "teachers_select_authenticated" ON public.teachers;
CREATE POLICY "teachers_select_authenticated"
  ON public.teachers
  FOR SELECT
  TO authenticated
  USING (
    institution_id = public.current_institution_id()
  );

-- 2. Asegurar permisos de SELECT para el rol authenticated
GRANT SELECT ON public.teachers TO authenticated;

COMMIT;
