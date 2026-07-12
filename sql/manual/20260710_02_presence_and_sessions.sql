-- Migración para el monitoreo de usuarios en tiempo real y sesiones históricas
-- Archivo: e:\iabc\sql\manual\20260710_02_presence_and_sessions.sql

CREATE TABLE IF NOT EXISTS public.provider_user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  full_name text,
  role text,
  institution_name text,
  page_url text,
  user_agent text,
  ip_address text,
  created_at timestamptz DEFAULT now(),
  last_active_at timestamptz DEFAULT now()
);

-- Habilitar RLS en la tabla de sesiones históricas
ALTER TABLE public.provider_user_sessions ENABLE ROW LEVEL SECURITY;

-- Crear políticas para provider_user_sessions
DROP POLICY IF EXISTS "Permitir lectura a administradores de ETYMON" ON public.provider_user_sessions;
CREATE POLICY "Permitir lectura a administradores de ETYMON" 
  ON public.provider_user_sessions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.provider_users 
      WHERE provider_users.user_id = auth.uid() 
        AND provider_users.is_active = true
    )
  );

-- Crear función RPC para registrar el pulso de presencia y persistencia de sesión
CREATE OR REPLACE FUNCTION public.register_user_presence_pulse(
  p_page_url text,
  p_user_agent text
) RETURNS void AS $$
DECLARE
  v_client_ip text;
  v_user_id uuid;
  v_full_name text;
  v_email text;
  v_role text;
  v_institution_name text;
  v_session_id uuid;
BEGIN
  -- Obtener el ID del usuario autenticado actual en Supabase
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Obtener la IP del cliente a partir de la cabecera x-forwarded-for de Supabase
  v_client_ip := coalesce(
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    '127.0.0.1'
  );

  -- Obtener nombre completo y email desde auth.users
  SELECT 
    coalesce(raw_user_meta_data->>'full_name', email),
    email
  INTO v_full_name, v_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Obtener el rol del usuario y el nombre de la institución actual
  SELECT 
    ur.role,
    inst.name
  INTO v_role, v_institution_name
  FROM public.user_roles ur
  LEFT JOIN public.institutions inst ON inst.id = ur.institution_id
  WHERE ur.user_id = v_user_id
  LIMIT 1;

  -- Buscar si existe una sesión reciente de este usuario (en las últimas 4 horas) con la misma IP y agente de usuario
  SELECT id INTO v_session_id
  FROM public.provider_user_sessions
  WHERE user_id = v_user_id
    AND ip_address = v_client_ip
    AND user_agent = p_user_agent
    AND last_active_at > now() - interval '4 hours'
  ORDER BY last_active_at DESC
  LIMIT 1;

  IF v_session_id IS NOT NULL THEN
    -- Actualizar la sesión existente
    UPDATE public.provider_user_sessions
    SET 
      page_url = p_page_url,
      last_active_at = now()
    WHERE id = v_session_id;
  ELSE
    -- Insertar una nueva sesión
    INSERT INTO public.provider_user_sessions (
      user_id,
      email,
      full_name,
      role,
      institution_name,
      page_url,
      user_agent,
      ip_address,
      created_at,
      last_active_at
    ) VALUES (
      v_user_id,
      v_email,
      v_full_name,
      coalesce(v_role, 'usuario'),
      coalesce(v_institution_name, 'Sin institución'),
      p_page_url,
      p_user_agent,
      v_client_ip,
      now(),
      now()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
