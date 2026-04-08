-- ==============================================================================
-- SCRIPT: LIMPIEZA Y CONFIGURACIÓN DE LAS 11 MATERIAS UNIVERSALES
-- ==============================================================================

-- 1. Eliminar datos falsos que dependan de las 57 materias 
-- (Advertencia: Esto vaciará los horarios o calificaciones de prueba que hubieras hecho)
DELETE FROM public.schedules;
DELETE FROM public.grade_records;
DELETE FROM public.teacher_subjects;
DELETE FROM public.teacher_grade_assignments;

-- 2. Eliminar las 57 materias autogeneradas
DELETE FROM public.subjects;

-- 3. Insertar únicamente las 11 materias oficiales para toda primaria
INSERT INTO public.subjects (name, color, grade_level) VALUES 
('E.D. EMOCIONAL', 'bg-blue-500', NULL),
('E.D. FISÍCA', 'bg-emerald-500', NULL),
('E.D. RELIGIOSA', 'bg-violet-500', NULL),
('EDUCACION ARTISTICA', 'bg-rose-500', NULL),
('ETICA', 'bg-cyan-500', NULL),
('INGLES', 'bg-amber-500', NULL),
('LENGUAJE', 'bg-pink-500', NULL),
('MATEMATICAS', 'bg-blue-600', NULL),
('NATURALES', 'bg-emerald-600', NULL),
('SOCIALES', 'bg-indigo-500', NULL),
('TECNOLOGIA E INFORMATICA', 'bg-slate-600', NULL);

-- LISTO. Misión cumplida.
