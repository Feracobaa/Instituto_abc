-- ==============================================================================
-- MIGRACIÓN: Función pública para obtener branding del colegio
-- ==============================================================================
-- Ejecutar en el Editor SQL de Supabase
-- Esto permite que la pantalla de Login lea el logo y color del colegio 
-- ANTES de que el usuario inicie sesión.

CREATE OR REPLACE FUNCTION get_public_institution_branding(p_slug TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'id', i.id,
    'name', i.name,
    'slug', i.slug,
    'display_name', s.display_name,
    'logo_url', s.logo_url,
    'primary_color', s.primary_color
  )
  INTO v_result
  FROM institutions i
  LEFT JOIN institution_settings s ON s.institution_id = i.id
  WHERE i.slug = p_slug AND i.is_active = true;

  RETURN COALESCE(v_result, '{}'::json);
END;
$$;

-- Otorgar permiso de ejecución al rol anónimo (público sin login)
GRANT EXECUTE ON FUNCTION get_public_institution_branding(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_institution_branding(TEXT) TO authenticated;
