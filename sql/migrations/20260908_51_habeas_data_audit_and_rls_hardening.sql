-- ==============================================================================
-- Migración 51: Fase 1.1 — Auditoría No Falsificable y Blindaje RLS Multi-Tenant
-- Fecha: 08 de Septiembre de 2026
-- Objetivo: sensitive_access_logs compuesta con role_enum, revocación de
-- manipulación cliente, RPC hardened (search_path='', membresía obligatoria)
-- y políticas RLS con principio de mínimo privilegio sin DELETE físico.
-- ==============================================================================

BEGIN;

-- 1. Tabla: sensitive_access_logs (Integridad referencial compuesta y rol tipado)
CREATE TABLE IF NOT EXISTS public.sensitive_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  document_id UUID REFERENCES public.student_documents(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role public.user_role_enum NOT NULL,
  action public.sensitive_action_enum NOT NULL,
  document_type TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  denied_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_sensitive_logs_student_tenant FOREIGN KEY (student_id, institution_id)
    REFERENCES public.students(id, institution_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sensitive_access_logs_institution ON public.sensitive_access_logs(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensitive_access_logs_student ON public.sensitive_access_logs(student_id, created_at DESC);

-- 2. Protección Estricta contra Modificación y Falsificación de Auditoría
ALTER TABLE public.sensitive_access_logs ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.sensitive_access_logs FROM authenticated, anon, public;

DROP POLICY IF EXISTS "Lectura de auditoria documental para directivos del tenant" ON public.sensitive_access_logs;
CREATE POLICY "Lectura de auditoria documental para directivos del tenant"
ON public.sensitive_access_logs FOR SELECT TO authenticated
USING (
  institution_id = public.current_institution_id()
  AND EXISTS (
    SELECT 1 FROM public.institution_memberships im
    WHERE im.user_id = auth.uid() AND im.institution_id = public.sensitive_access_logs.institution_id
      AND im.role IN ('rector'::public.user_role_enum, 'admin'::public.user_role_enum)
  )
);

-- 3. RPC Hardened: log_sensitive_document_access (SECURITY DEFINER + search_path='')
CREATE OR REPLACE FUNCTION public.log_sensitive_document_access(
  p_student_id UUID,
  p_document_id UUID DEFAULT NULL,
  p_action public.sensitive_action_enum DEFAULT 'VIEW',
  p_document_type TEXT DEFAULT 'UNKNOWN',
  p_success BOOLEAN DEFAULT true,
  p_denied_reason TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE
  v_user_id UUID;
  v_institution_id UUID;
  v_role public.user_role_enum;
  v_log_id UUID;
  v_doc_inst UUID;
  v_doc_student UUID;
  v_doc_type TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Acceso no autorizado: sesion JWT requerida.';
  END IF;

  v_institution_id := public.current_institution_id();
  IF v_institution_id IS NULL THEN
    RAISE EXCEPTION 'Aislamiento tenant: no se identifico una institucion valida en la sesion.';
  END IF;

  -- Membresía formal obligatoria: sin membresía activa en el tenant, se aborta de inmediato
  SELECT im.role INTO v_role FROM public.institution_memberships im
  WHERE im.user_id = v_user_id AND im.institution_id = v_institution_id LIMIT 1;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Acceso no autorizado: el usuario no posee una membresia activa en la institucion.';
  END IF;

  -- Validar existencia del estudiante y pertenencia al tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = p_student_id AND s.institution_id = v_institution_id
  ) THEN
    RAISE EXCEPTION 'Violacion de frontera tenant: el estudiante no existe o pertenece a otra institucion.';
  END IF;

  -- Si se indica documento, validar relación estricta (doc <-> estudiante <-> tenant <-> tipo)
  IF p_document_id IS NOT NULL THEN
    SELECT sd.institution_id, sd.student_id, dt.code INTO v_doc_inst, v_doc_student, v_doc_type
    FROM public.student_documents sd
    JOIN public.document_types dt ON dt.id = sd.document_type_id
    WHERE sd.id = p_document_id;

    IF v_doc_inst IS NULL THEN
      RAISE EXCEPTION 'El documento especificado no existe.';
    END IF;
    IF v_doc_inst <> v_institution_id THEN
      RAISE EXCEPTION 'Violacion de frontera tenant: el documento pertenece a otra institucion.';
    END IF;
    IF v_doc_student <> p_student_id THEN
      RAISE EXCEPTION 'Inconsistencia de identidad: el documento no pertenece al estudiante indicado.';
    END IF;
    IF p_document_type IS NOT NULL AND p_document_type <> '' AND p_document_type <> 'UNKNOWN' AND v_doc_type <> p_document_type THEN
      RAISE EXCEPTION 'Inconsistencia tipologica: el tipo documental no coincide con el registro original.';
    END IF;
  END IF;

  -- Inserción interna en sensitive_access_logs
  INSERT INTO public.sensitive_access_logs (
    institution_id, student_id, document_id, user_id, user_role,
    action, document_type, success, denied_reason, ip_address, user_agent, created_at
  ) VALUES (
    v_institution_id, p_student_id, p_document_id, v_user_id, v_role,
    p_action, p_document_type, p_success, p_denied_reason, p_ip_address, p_user_agent, pg_catalog.clock_timestamp()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.log_sensitive_document_access(UUID, UUID, public.sensitive_action_enum, TEXT, BOOLEAN, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_sensitive_document_access(UUID, UUID, public.sensitive_action_enum, TEXT, BOOLEAN, TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_sensitive_document_access(UUID, UUID, public.sensitive_action_enum, TEXT, BOOLEAN, TEXT, TEXT, TEXT) TO authenticated;

-- 4. RLS para document_types
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de catalogo documental institucional y global" ON public.document_types;
CREATE POLICY "Lectura de catalogo documental institucional y global"
ON public.document_types FOR SELECT TO authenticated
USING (institution_id IS NULL OR institution_id = public.current_institution_id());

DROP POLICY IF EXISTS "Gestion de tipos documentales por directivos" ON public.document_types;
CREATE POLICY "Gestion de tipos documentales por directivos"
ON public.document_types FOR ALL TO authenticated
USING (
  institution_id = public.current_institution_id()
  AND EXISTS (
    SELECT 1 FROM public.institution_memberships im
    WHERE im.user_id = auth.uid() AND im.institution_id = public.document_types.institution_id
      AND im.role IN ('rector'::public.user_role_enum, 'admin'::public.user_role_enum)
  )
)
WITH CHECK (
  institution_id = public.current_institution_id()
  AND EXISTS (
    SELECT 1 FROM public.institution_memberships im
    WHERE im.user_id = auth.uid() AND im.institution_id = public.document_types.institution_id
      AND im.role IN ('rector'::public.user_role_enum, 'admin'::public.user_role_enum)
  )
);

-- 5. RLS para student_consents (Sin DELETE físico - Conservación de Evidencia)
ALTER TABLE public.student_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura restringida de consentimientos por directivos o acudiente" ON public.student_consents;
CREATE POLICY "Lectura restringida de consentimientos por directivos o acudiente"
ON public.student_consents FOR SELECT TO authenticated
USING (
  institution_id = public.current_institution_id()
  AND (
    guardian_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.institution_memberships im
      WHERE im.user_id = auth.uid() AND im.institution_id = public.student_consents.institution_id
        AND im.role IN ('rector'::public.user_role_enum, 'admin'::public.user_role_enum, 'contable'::public.user_role_enum)
    )
  )
);

DROP POLICY IF EXISTS "Insercion de consentimientos por personal autorizado o acudiente" ON public.student_consents;
CREATE POLICY "Insercion de consentimientos por personal autorizado o acudiente"
ON public.student_consents FOR INSERT TO authenticated
WITH CHECK (
  institution_id = public.current_institution_id()
  AND (
    guardian_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.institution_memberships im
      WHERE im.user_id = auth.uid() AND im.institution_id = public.student_consents.institution_id
        AND im.role IN ('rector'::public.user_role_enum, 'admin'::public.user_role_enum, 'contable'::public.user_role_enum)
    )
  )
);

DROP POLICY IF EXISTS "Actualizacion de estado de consentimiento por directivos o acudiente" ON public.student_consents;
CREATE POLICY "Actualizacion de estado de consentimiento por directivos o acudiente"
ON public.student_consents FOR UPDATE TO authenticated
USING (
  institution_id = public.current_institution_id()
  AND (
    guardian_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.institution_memberships im
      WHERE im.user_id = auth.uid() AND im.institution_id = public.student_consents.institution_id
        AND im.role IN ('rector'::public.user_role_enum, 'admin'::public.user_role_enum, 'contable'::public.user_role_enum)
    )
  )
);

-- 6. RLS para student_documents (Sin DELETE físico - Soft-delete via is_active)
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de metadatos documentales por rol autorizado" ON public.student_documents;
CREATE POLICY "Lectura de metadatos documentales por rol autorizado"
ON public.student_documents FOR SELECT TO authenticated
USING (
  institution_id = public.current_institution_id()
  AND (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.institution_memberships im
      WHERE im.user_id = auth.uid() AND im.institution_id = public.student_documents.institution_id
        AND (
          im.role IN ('rector'::public.user_role_enum, 'admin'::public.user_role_enum, 'contable'::public.user_role_enum)
          OR (im.role = 'profesor'::public.user_role_enum AND EXISTS (
            SELECT 1 FROM public.document_types dt
            WHERE dt.id = public.student_documents.document_type_id
              AND (dt.category = 'ACADEMIC' OR dt.is_sensitive = false)
          ))
        )
    )
  )
);

DROP POLICY IF EXISTS "Carga de documentos por directivos o acudiente" ON public.student_documents;
CREATE POLICY "Carga de documentos por directivos o acudiente"
ON public.student_documents FOR INSERT TO authenticated
WITH CHECK (
  institution_id = public.current_institution_id()
  AND (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.institution_memberships im
      WHERE im.user_id = auth.uid() AND im.institution_id = public.student_documents.institution_id
        AND im.role IN ('rector'::public.user_role_enum, 'admin'::public.user_role_enum, 'contable'::public.user_role_enum)
    )
  )
);

DROP POLICY IF EXISTS "Actualizacion de metadatos o estado de documentos por directivos" ON public.student_documents;
CREATE POLICY "Actualizacion de metadatos o estado de documentos por directivos"
ON public.student_documents FOR UPDATE TO authenticated
USING (
  institution_id = public.current_institution_id()
  AND EXISTS (
    SELECT 1 FROM public.institution_memberships im
    WHERE im.user_id = auth.uid() AND im.institution_id = public.student_documents.institution_id
      AND im.role IN ('rector'::public.user_role_enum, 'admin'::public.user_role_enum, 'contable'::public.user_role_enum)
  )
);

-- 7. RLS para data_breach_incidents
ALTER TABLE public.data_breach_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestion de incidentes de seguridad reservada para directivos" ON public.data_breach_incidents;
CREATE POLICY "Gestion de incidentes de seguridad reservada para directivos"
ON public.data_breach_incidents FOR ALL TO authenticated
USING (
  institution_id = public.current_institution_id()
  AND EXISTS (
    SELECT 1 FROM public.institution_memberships im
    WHERE im.user_id = auth.uid() AND im.institution_id = public.data_breach_incidents.institution_id
      AND im.role IN ('rector'::public.user_role_enum, 'admin'::public.user_role_enum)
  )
);

COMMIT;
