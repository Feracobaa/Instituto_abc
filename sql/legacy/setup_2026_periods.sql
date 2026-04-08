-- ==============================================================================
-- SCRIPT: CRONOGRAMA I SEMESTRE ACADÉMICO 2026 (INSTITUTO PEDAGÓGICO ABC)
-- ==============================================================================

-- 1. Limpiamos cualquier período falso o viejo que haya venido con la plantilla
DELETE FROM public.academic_periods;

-- 2. Insertamos estrictamente los bimestres oficiales de 2026
-- Como estamos en Abril de 2026, el 'Segundo Bimestre' (Abr 6 - Jun 12) 
-- es el correcto para estar activo (is_active = true)
INSERT INTO public.academic_periods (name, start_date, end_date, is_active) VALUES
('Primer Bimestre', '2026-01-26', '2026-04-03', false),
('Segundo Bimestre', '2026-04-06', '2026-06-12', true),
('Tercer Bimestre', '2026-06-30', '2026-09-04', false),
('Cuarto Bimestre', '2026-09-07', '2026-11-20', false);

-- NOTA: La plataforma leerá esto y se pondrá
-- automáticamente en "Segundo Bimestre".
