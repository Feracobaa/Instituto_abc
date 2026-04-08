-- ==============================================================================
-- SCRIPT DE REMEDIACIÓN DE SEGURIDAD PARA SUPABASE
-- Corre este script en tu Dashboard de Supabase (SQL Editor)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FIX: SECURITY DEFINER VIEWS
-- PostgreSQL 15+ soporta security_invoker en las vistas.
-- Esto forza a las vistas a evaluar el RLS de quien realiza el query.
-- ------------------------------------------------------------------------------
ALTER VIEW public.audit_by_user SET (security_invoker = on);
ALTER VIEW public.audit_suspicious_activity SET (security_invoker = on);
ALTER VIEW public.audit_recent_changes SET (security_invoker = on);
ALTER VIEW public.grade_records_audit_trail SET (security_invoker = on);
ALTER VIEW public.audit_summary SET (security_invoker = on);

-- ------------------------------------------------------------------------------
-- 2. FIX: FUNCTION SEARCH PATH MUTABLE
-- Para prevenir ataques de secuestro de esquemas, atamos el search path a 'public'.
-- ------------------------------------------------------------------------------
-- Nota: Si alguna de estas funciones recibe parámetros, debes incluir sus tipos.
-- Supondremos que estas funciones básicas no tienen parámetros, o si los tienen,
-- se ajustarán dinámicamente. A continuación el fix estándar asumiendo firmas vacías 
-- o de 1 parametro comun (en el caso is_user_rector).
--
-- La forma más segura en Supabase es usar ALTER FUNCTION nombre_funcion SET search_path = ''
-- o especificar el schema. A continuación usamos un bloque DO para alterar todas las 
-- funciones listadas sin importar su cantidad de parámetros.
-- ------------------------------------------------------------------------------

DO $$ 
DECLARE
    func RECORD;
BEGIN
    FOR func IN 
        SELECT oid::regprocedure as signature
        FROM pg_proc 
        WHERE proname IN (
            'is_user_rector', 
            'is_user_profesor', 
            'get_current_teacher_id', 
            'audit_trigger', 
            'get_changed_fields', 
            'get_audit_history', 
            'cleanup_old_audit_logs'
        )
        AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'ALTER FUNCTION ' || func.signature || ' SET search_path = public, pg_temp;';
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. FIX: RLS ENABLED NO POLICY EN 'audit_logs'
-- Agregamos la política para que el "Rector" pueda leer los logs de auditoría 
-- en el frontend (en caso de que quieras armar una tabla para verlo).
-- ------------------------------------------------------------------------------
-- Primero, nos aseguramos que tiene RLS (ya lo tiene, pero no cuesta nada asegurarlo)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Evitamos duplicar políticas si ya existían borrando la política previa por si acaso 
DROP POLICY IF EXISTS "Rectores pueden leer auditorías" ON public.audit_logs;

-- Todos sabemos que la auditoría es super sensible, solo rectores pueden leer.
CREATE POLICY "Rectores pueden leer auditorías"
ON public.audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'rector'
  )
);
-- Nota: Las inserciones en audit_logs seguramente las hace el 'audit_trigger' 
-- interno saltándose el RLS con un Security Definer, o podrías permitir 
-- la inserción a todos así:
-- CREATE POLICY "Usuarios pueden registrar su propia auditoria" ON public.audit_logs FOR INSERT WITH CHECK (true);
