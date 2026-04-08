-- ==============================================================================
-- FIX: REGISTRO DE PROFESORES Y ROLES (TRIGGER DE AUTENTICACIÓN CORREGIDO)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_name text;
BEGIN
  v_role := new.raw_user_meta_data->>'role';
  v_name := new.raw_user_meta_data->>'full_name';

  IF v_name IS NULL THEN
    v_name := 'Usuario Nuevo';
  END IF;
  
  IF v_role IS NULL THEN
    v_role := 'profesor';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = new.id) THEN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (new.id, v_name, new.email);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = new.id) THEN
    EXECUTE format('INSERT INTO public.user_roles (user_id, role) VALUES (%L, %L)', new.id, v_role);
  END IF;

  IF v_role = 'profesor' THEN
    IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE user_id = new.id) THEN
      INSERT INTO public.teachers (user_id, full_name, email, is_active)
      VALUES (new.id, v_name, new.email, true);
    END IF;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
