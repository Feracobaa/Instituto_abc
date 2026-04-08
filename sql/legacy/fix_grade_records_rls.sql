-- ==============================================================================
-- SCRIPT: HABILITAR ACCESO A GRADE_RECORDS PARA PROFESORES Y RECTORES
-- Corre este script en tu Dashboard de Supabase → SQL Editor
-- Soluciona el error al intentar subir notas y logros.
-- ==============================================================================

-- 1. Asegurarse que la tabla tiene RLS activado
ALTER TABLE public.grade_records ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar políticas anteriores que puedan estar bloqueando
DROP POLICY IF EXISTS "Lectura de calificaciones para autenticados" ON public.grade_records;
DROP POLICY IF EXISTS "Inserción de calificaciones para autenticados" ON public.grade_records;
DROP POLICY IF EXISTS "Actualización de calificaciones para autenticados" ON public.grade_records;
DROP POLICY IF EXISTS "Profesores pueden leer grade_records" ON public.grade_records;
DROP POLICY IF EXISTS "Profesores pueden insertar grade_records" ON public.grade_records;
DROP POLICY IF EXISTS "Profesores pueden actualizar grade_records" ON public.grade_records;

-- 3. Política de LECTURA: cualquier usuario autenticado puede leer calificaciones
CREATE POLICY "Lectura de calificaciones para autenticados"
ON public.grade_records FOR SELECT
TO authenticated
USING (true);

-- 4. Política de INSERCIÓN: cualquier usuario autenticado puede registrar calificaciones
CREATE POLICY "Inserción de calificaciones para autenticados"
ON public.grade_records FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Política de ACTUALIZACIÓN: cualquier usuario autenticado puede actualizar calificaciones
CREATE POLICY "Actualización de calificaciones para autenticados"
ON public.grade_records FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Garantizar permisos base en la tabla
GRANT SELECT, INSERT, UPDATE ON public.grade_records TO authenticated;

-- ==============================================================================
-- TAMBIÉN verifica que subjects tenga acceso de lectura (necesario para el join)
-- ==============================================================================
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de materias para autenticados" ON public.subjects;

CREATE POLICY "Lectura de materias para autenticados"
ON public.subjects FOR SELECT
TO authenticated
USING (true);

GRANT SELECT ON public.subjects TO authenticated;

-- ==============================================================================
-- TAMBIÉN verifica que academic_periods tenga acceso de lectura
-- ==============================================================================
ALTER TABLE public.academic_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de períodos para autenticados" ON public.academic_periods;

CREATE POLICY "Lectura de períodos para autenticados"
ON public.academic_periods FOR SELECT
TO authenticated
USING (true);

GRANT SELECT ON public.academic_periods TO authenticated;
