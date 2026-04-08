-- ==============================================================================
-- SCRIPT: SINCRONIZAR USUARIOS EXISTENTES (VERSIÓN CORREGIDA)
-- ==============================================================================

DO $$ 
DECLARE
  rec RECORD;
  v_role text;
  v_name text;
BEGIN
  FOR rec IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
  
    v_role := rec.raw_user_meta_data->>'role';
    v_name := rec.raw_user_meta_data->>'full_name';

    IF v_name IS NULL OR v_name = '' THEN 
      v_name := 'Profesor ' || split_part(rec.email, '@', 1); 
    END IF;
    
    IF v_role IS NULL OR v_role = '' THEN 
      v_role := 'profesor'; 
    END IF;

    -- 1. Insertamos en profiles
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = rec.id) THEN
      INSERT INTO public.profiles (user_id, full_name, email)
      VALUES (rec.id, v_name, rec.email);
    END IF;

    -- 2. Insertamos el rol
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = rec.id) THEN
      -- Se usa SQL dinámico para que PostgreSQL convierta el texto automáticamente al Enum requerido
      EXECUTE format('INSERT INTO public.user_roles (user_id, role) VALUES (%L, %L)', rec.id, v_role);
    END IF;

    -- 3. Insertamos en teachers si es profesor
    IF v_role = 'profesor' THEN
      IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE user_id = rec.id) THEN
        INSERT INTO public.teachers (user_id, full_name, email, is_active)
        VALUES (rec.id, v_name, rec.email, true);
      END IF;
    END IF;

  END LOOP;
END $$;
