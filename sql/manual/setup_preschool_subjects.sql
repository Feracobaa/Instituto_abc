-- ==============================================================================
-- SCRIPT: MATERIAS Y SUB-MATERIAS PARA PREESCOLAR (Párvulo a Transición)
-- ==============================================================================

DO $$
DECLARE
  v_matematicas_id uuid;
  v_lenguaje_id uuid;
BEGIN
  -- 1. Limpieza preventiva (por si se crearon las rutinas como materias por error)
  DELETE FROM public.subjects WHERE name IN ('AMBIENTACIÓN DEVOCIONAL', 'HORA LÚDICA', 'ÁREAS INTEGRADAS');

  -- 2. Obtener los IDs de las materias principales (madres)
  SELECT id INTO v_matematicas_id FROM public.subjects WHERE name = 'MATEMATICAS' LIMIT 1;
  SELECT id INTO v_lenguaje_id FROM public.subjects WHERE name = 'LENGUAJE' LIMIT 1;

  -- 3. Insertar submaterias reales evaluables (evitando duplicados)
  
  -- Rama Matemáticas
  IF v_matematicas_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.subjects WHERE name = 'PRE-MATEMÁTICAS') THEN
    INSERT INTO public.subjects (name, color, parent_id) VALUES ('PRE-MATEMÁTICAS', 'bg-blue-500', v_matematicas_id);
  END IF;
  IF v_matematicas_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.subjects WHERE name = 'NÚMEROS') THEN
    INSERT INTO public.subjects (name, color, parent_id) VALUES ('NÚMEROS', 'bg-blue-500', v_matematicas_id);
  END IF;

  -- Rama Lenguaje
  IF v_lenguaje_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.subjects WHERE name = 'PRE-ESCRITURA') THEN
    INSERT INTO public.subjects (name, color, parent_id) VALUES ('PRE-ESCRITURA', 'bg-rose-500', v_lenguaje_id);
  END IF;
  IF v_lenguaje_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.subjects WHERE name = 'PLAN LECTOR') THEN
    INSERT INTO public.subjects (name, color, parent_id) VALUES ('PLAN LECTOR', 'bg-rose-500', v_lenguaje_id);
  END IF;

  -- Nota: Materias como "Inglés", "Naturales" o "Física" dentro de "Áreas integradas" 
  -- ya existen en el colegio y simplemente se deben asignar de forma normal en el horario.
END $$;
