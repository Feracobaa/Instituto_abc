-- ==============================================================================
-- Migración 50: Fase 1.1 — Fundación de Datos y Llaves Compuestas Multi-Tenant
-- Fecha: 08 de Septiembre de 2026
-- Objetivo: Establecer ENUMs, clave única (id, institution_id) en students,
-- tablas relacionales con integridad compuesta y catálogo documental.
-- ==============================================================================

BEGIN;

-- 1. ENUMs de Dominio Controlado
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_purpose_enum') THEN
    CREATE TYPE public.consent_purpose_enum AS ENUM ('ACADEMIC', 'HEALTH', 'BIOMETRIC', 'EMERGENCY', 'COMMUNICATION', 'DOCUMENT_STORAGE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_status_enum') THEN
    CREATE TYPE public.consent_status_enum AS ENUM ('GRANTED', 'REVOKED', 'EXPIRED', 'REQUIRES_RECONFIRMATION', 'SUPERSEDED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_source_enum') THEN
    CREATE TYPE public.consent_source_enum AS ENUM ('PORTAL_WEB', 'PRESENCIAL_DIGITALIZADO', 'APP_MOVIL', 'SECRETARIA_VENTANILLA');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sensitive_action_enum') THEN
    CREATE TYPE public.sensitive_action_enum AS ENUM ('VIEW', 'DOWNLOAD', 'GENERATE_URL', 'DELETE', 'UPLOAD', 'UPDATE', 'SHARE', 'PRINT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_verification_status_enum') THEN
    CREATE TYPE public.document_verification_status_enum AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_category_enum') THEN
    CREATE TYPE public.document_category_enum AS ENUM ('IDENTIFICATION', 'HEALTH', 'ACADEMIC', 'FINANCIAL', 'CONTRACT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_severity_enum') THEN
    CREATE TYPE public.incident_severity_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_resolution_status_enum') THEN
    CREATE TYPE public.incident_resolution_status_enum AS ENUM ('DETECTED', 'CONTAINING', 'INVESTIGATING', 'NOTIFIED', 'RESOLVED', 'CLOSED');
  END IF;
END
$$;

-- 2. Integridad Referencial Compuesta en students: (id, institution_id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_students_id_institution') THEN
    ALTER TABLE public.students ADD CONSTRAINT uq_students_id_institution UNIQUE (id, institution_id);
  END IF;
END
$$;

-- 3. Tabla: document_types (Catálogo tipológico con soporte global y tenant)
CREATE TABLE IF NOT EXISTS public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category public.document_category_enum NOT NULL DEFAULT 'IDENTIFICATION',
  is_sensitive BOOLEAN NOT NULL DEFAULT true,
  requires_consent BOOLEAN NOT NULL DEFAULT false,
  allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['rector', 'contable'],
  validity_months INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_document_types_global_code ON public.document_types (code) WHERE institution_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_types_tenant_code ON public.document_types (institution_id, code) WHERE institution_id IS NOT NULL;

-- 4. Tabla: student_consents (Integridad compuesta contra students)
CREATE TABLE IF NOT EXISTS public.student_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  guardian_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guardian_name TEXT NOT NULL,
  guardian_document_id TEXT,
  purpose public.consent_purpose_enum NOT NULL,
  status public.consent_status_enum NOT NULL DEFAULT 'GRANTED',
  legal_basis TEXT NOT NULL DEFAULT 'Representación legal y ejecución de contrato educativo',
  policy_version TEXT NOT NULL DEFAULT '1.0',
  terms_version TEXT NOT NULL DEFAULT '1.0',
  consent_text_hash TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revocation_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  source public.consent_source_enum NOT NULL DEFAULT 'SECRETARIA_VENTANILLA',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_student_consents_student_tenant FOREIGN KEY (student_id, institution_id)
    REFERENCES public.students(id, institution_id) ON DELETE CASCADE
);

-- 5. Tabla: student_documents (Metadatos e integridad estricta)
CREATE TABLE IF NOT EXISTS public.student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  document_type_id UUID NOT NULL REFERENCES public.document_types(id),
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  file_hash TEXT,
  verification_status public.document_verification_status_enum NOT NULL DEFAULT 'PENDING',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_student_documents_student_tenant FOREIGN KEY (student_id, institution_id)
    REFERENCES public.students(id, institution_id) ON DELETE CASCADE
);

-- 6. Trigger para validar correspondencia de tenant en document_types
CREATE OR REPLACE FUNCTION public.check_document_type_tenant_match()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $function$
DECLARE
  v_dt_inst uuid;
BEGIN
  SELECT dt.institution_id INTO v_dt_inst FROM public.document_types dt WHERE dt.id = NEW.document_type_id;
  IF v_dt_inst IS NOT NULL AND v_dt_inst <> NEW.institution_id THEN
    RAISE EXCEPTION 'Mapeo documental invalido: el tipo documental pertenece a otra institucion.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_check_document_type_tenant ON public.student_documents;
CREATE TRIGGER trg_check_document_type_tenant
  BEFORE INSERT OR UPDATE OF document_type_id, institution_id ON public.student_documents
  FOR EACH ROW EXECUTE FUNCTION public.check_document_type_tenant_match();

-- 7. Tabla: data_breach_incidents (reported_at nullable)
CREATE TABLE IF NOT EXISTS public.data_breach_incidents (
  incident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity public.incident_severity_enum NOT NULL DEFAULT 'LOW',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reported_at TIMESTAMPTZ,
  affected_students INT NOT NULL DEFAULT 0,
  affected_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  containment_action TEXT,
  notification_status TEXT NOT NULL DEFAULT 'PENDING_EVALUATION',
  resolution_status public.incident_resolution_status_enum NOT NULL DEFAULT 'DETECTED',
  root_cause TEXT,
  remediation_action TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_student_consents_lookup ON public.student_consents (institution_id, student_id, status);
CREATE INDEX IF NOT EXISTS idx_student_documents_student ON public.student_documents (institution_id, student_id, is_active);

-- 8. Semilla de Tipos de Documento Globales (institution_id IS NULL)
INSERT INTO public.document_types (institution_id, code, name, category, is_sensitive, requires_consent, allowed_roles, validity_months)
VALUES
  (NULL, 'IDENTITY_CARD', 'Tarjeta de Identidad / Registro Civil / Pasaporte', 'IDENTIFICATION', true, true, ARRAY['rector', 'contable'], NULL),
  (NULL, 'GUARDIAN_ID', 'Documento de Identidad del Acudiente', 'IDENTIFICATION', true, true, ARRAY['rector', 'contable'], NULL),
  (NULL, 'MEDICAL_CERTIFICATE', 'Certificado Médico Escolar / EPS', 'HEALTH', true, true, ARRAY['rector', 'contable'], 12),
  (NULL, 'VACCINATION_CARD', 'Carnet de Vacunación', 'HEALTH', true, true, ARRAY['rector', 'contable'], NULL),
  (NULL, 'PAZ_Y_SALVO', 'Paz y Salvo de Institución Previa', 'FINANCIAL', false, false, ARRAY['rector', 'contable'], NULL),
  (NULL, 'PREVIOUS_GRADES', 'Certificado de Calificaciones Previas', 'ACADEMIC', false, false, ARRAY['rector', 'contable', 'profesor'], NULL),
  (NULL, 'PAYMENT_SUPPORT', 'Comprobante de Pago de Matrícula / Pensión', 'FINANCIAL', true, false, ARRAY['rector', 'contable'], NULL),
  (NULL, 'ENROLLMENT_CONTRACT', 'Contrato de Matrícula Firmado', 'CONTRACT', true, true, ARRAY['rector', 'contable'], 12)
ON CONFLICT (code) WHERE institution_id IS NULL DO UPDATE
  SET name = EXCLUDED.name, category = EXCLUDED.category, is_sensitive = EXCLUDED.is_sensitive,
      requires_consent = EXCLUDED.requires_consent, allowed_roles = EXCLUDED.allowed_roles, validity_months = EXCLUDED.validity_months;

COMMIT;
