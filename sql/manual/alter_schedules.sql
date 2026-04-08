-- ==============================================================================
-- SCRIPT: ACTUALIZACIÓN DE ESQUEMA PARA HORARIOS DINÁMICOS Y RUTINAS
-- ==============================================================================

-- 1. Permitimos que un bloque de horario NO tenga materia o profesor asignado
--    Esto es crucial para poder registrar "Descansos", "Devocional", etc.
ALTER TABLE public.schedules
ALTER COLUMN subject_id DROP NOT NULL,
ALTER COLUMN teacher_id DROP NOT NULL;

-- 2. Agregamos una columna de título para nombrar las rutinas (ej. "DEVOCIONAL")
ALTER TABLE public.schedules
ADD COLUMN IF NOT EXISTS title text;

-- 3. (Opcional pero recomendado) Restricción de integridad:
-- Si no hay título, debe haber materia (y viceversa) para que el bloque tenga sentido.
-- (Bypass por ahora para no romper datos existentes que no tengan title).
