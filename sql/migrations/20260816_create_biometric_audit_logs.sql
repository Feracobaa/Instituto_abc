-- ====================================================================
-- Migración: Tabla de Auditoría Inmutable para Eventos Biométricos
-- Propósito: Cumplimiento de normativas de seguridad, telemetría y trazabilidad
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.biometric_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'login_success', 'login_failed', 'enrollment_created', 'enrollment_deleted', 'liveness_failed'
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    similarity_score DOUBLE PRECISION,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comentarios explicativos
COMMENT ON TABLE public.biometric_audit_logs IS 'Registro inmutable de eventos biométricos de acceso, enrolamiento y auditoría institucional.';
COMMENT ON COLUMN public.biometric_audit_logs.similarity_score IS 'Puntaje de similitud coseno registrado en el momento de la comparación (0.00 a 1.00).';

-- Índices de alto rendimiento para consultas administrativas
CREATE INDEX IF NOT EXISTS idx_biometric_audit_logs_inst_created 
    ON public.biometric_audit_logs (institution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_biometric_audit_logs_event_type 
    ON public.biometric_audit_logs (event_type);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.biometric_audit_logs ENABLE ROW LEVEL SECURITY;

-- Política de inserción: Permitir al backend (service_role) y usuarios autenticados
CREATE POLICY "Permitir inserción de logs biométricos"
    ON public.biometric_audit_logs
    FOR INSERT
    TO authenticated, service_role
    WITH CHECK (true);

-- Política de lectura: Permitir lectura a personal directivo (rector) de la institución
CREATE POLICY "Permitir lectura de logs biométricos a directivos institucionales"
    ON public.biometric_audit_logs
    FOR SELECT
    TO authenticated
    USING (
        institution_id IN (
            SELECT ur.institution_id 
            FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
              AND ur.role = 'rector'
        )
        OR (auth.jwt() ->> 'role') = 'service_role'
    );
