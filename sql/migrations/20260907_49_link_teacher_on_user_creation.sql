-- ==============================================================================
-- Migración: Sincronización e Integridad Relacional en Creación de Profesores
-- Fecha: 07 de Septiembre de 2026
-- Objetivo: Evitar duplicación de registros en public.teachers cuando un rector
-- crea un usuario para un profesor que ya tenía ficha académica creada previamente.
-- ==============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_role text;
  v_name text;
  v_institution_raw text;
  v_target_institution uuid;
BEGIN
  v_role := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'profesor');
  IF v_role NOT IN ('rector', 'profesor', 'parent', 'contable') THEN
    v_role := 'profesor';
  END IF;

  v_name := nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '');
  IF v_name IS NULL THEN
    v_name := split_part(coalesce(new.email, 'Usuario Nuevo'), '@', 1);
  END IF;

  v_institution_raw := nullif(new.raw_user_meta_data ->> 'institution_id', '');
  IF v_institution_raw IS NOT NULL AND v_institution_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_target_institution := v_institution_raw::uuid;
  END IF;

  IF v_target_institution IS NULL THEN
    v_target_institution := public.current_institution_id();
  END IF;

  IF v_target_institution IS NULL THEN
    RETURN new;
  END IF;

  -- 1. Perfil institucional
  INSERT INTO public.profiles (user_id, full_name, email, institution_id)
  VALUES (new.id, v_name, new.email, v_target_institution)
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = excluded.full_name,
        email = excluded.email,
        institution_id = excluded.institution_id,
        updated_at = now();

  -- 2. Rol de usuario
  DELETE FROM public.user_roles
  WHERE user_id = new.id;

  INSERT INTO public.user_roles (user_id, role, institution_id)
  VALUES (new.id, v_role::public.user_role_enum, v_target_institution);

  -- 3. Membresía institucional
  INSERT INTO public.institution_memberships (institution_id, user_id, role, is_default)
  VALUES (v_target_institution, new.id, v_role::public.user_role_enum, true)
  ON CONFLICT (institution_id, user_id, role) DO UPDATE
    SET is_default = true;

  UPDATE public.institution_memberships
  SET is_default = false
  WHERE user_id = new.id
    AND institution_id <> v_target_institution
    AND is_default = true;

  -- 4. Ficha académica docente (Integridad relacional anti-duplicados)
  IF v_role = 'profesor' THEN
    -- A) Intentar actualizar si ya estaba vinculado directamente por user_id
    UPDATE public.teachers
    SET full_name = v_name,
        email = new.email,
        is_active = true,
        institution_id = v_target_institution,
        updated_at = now()
    WHERE user_id = new.id;

    -- B) Si no estaba vinculado, buscar si existía una ficha en la misma institución
    --    con el mismo email pero con user_id IS NULL (ficha creada previamente por el rector)
    IF NOT FOUND THEN
      UPDATE public.teachers
      SET user_id = new.id,
          full_name = coalesce(v_name, full_name),
          is_active = true,
          updated_at = now()
      WHERE lower(btrim(email)) = lower(btrim(new.email))
        AND institution_id = v_target_institution
        AND user_id IS NULL;
    END IF;

    -- C) Si no existía ninguna ficha previa, insertar el nuevo registro
    IF NOT FOUND THEN
      INSERT INTO public.teachers (user_id, full_name, email, is_active, institution_id)
      VALUES (new.id, v_name, new.email, true, v_target_institution);
    END IF;
  ELSE
    DELETE FROM public.teachers
    WHERE user_id = new.id;
  END IF;

  RETURN new;
END;
$function$;

COMMIT;
