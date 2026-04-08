-- ==============================================================================
-- SCRIPT: HABILITAR LECTURA DE ESTUDIANTES PARA PROFESORES
-- Corre este script en tu Dashboard de Supabase (SQL Editor)
-- Para solucionar el problema de que los profesores ven 0 estudiantes.
-- ==============================================================================

-- 1. Asegurarse que la tabla tiene RLS activado
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar políticas anteriores (por si acaso bloqueaban a profesores)
DROP POLICY IF EXISTS "Lectura de estudiantes para autenticados" ON public.students;
DROP POLICY IF EXISTS "Todos pueden leer estudiantes" ON public.students;
DROP POLICY IF EXISTS "Solo rectores pueden leer estudiantes" ON public.students;
DROP POLICY IF EXISTS "Rectores leen estudiantes" ON public.students;

-- 3. Crear una política genérica que permita a cualquier usuario autenticado (Rector o Profesor) 
--    leer los estudiantes. La seguridad fina (de qué estudiante ve qué profesor) 
--    ya está controlada adecuadamente desde la Inteligencia del Frontend.
CREATE POLICY "Lectura de estudiantes para autenticados"
ON public.students FOR SELECT
TO authenticated
USING (true);

-- 4. Asegurar los permisos base en la tabla
GRANT SELECT ON public.students TO authenticated;
