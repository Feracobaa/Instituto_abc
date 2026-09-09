-- ==============================================================================
-- Migración 53: Módulo de Contratos y Legitimidad de Plataforma (Etymon Provider)
-- Fecha: 08 de Septiembre de 2026
-- Objetivo: Establecer el modelo de plantillas maestras legales, contratos
-- individualizados por institución, ciclo de vida (draft -> sent -> signed),
-- trazabilidad criptográfica de firma digital para rectores y auditoría inmutable.
-- ==============================================================================

BEGIN;

-- 1. ENUMs de Dominio Contractual
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_contract_type_enum') THEN
    CREATE TYPE public.platform_contract_type_enum AS ENUM (
      'SAAS_SERVICE_AGREEMENT',
      'DATA_PROCESSING_AGREEMENT',
      'TERMS_AND_CONDITIONS',
      'SLA_SECURITY_POLICY',
      'MASTER_COMPLIANCE_PACK'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_contract_status_enum') THEN
    CREATE TYPE public.platform_contract_status_enum AS ENUM (
      'draft',
      'sent',
      'signed',
      'active',
      'expired',
      'revoked'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_contract_audit_action_enum') THEN
    CREATE TYPE public.platform_contract_audit_action_enum AS ENUM (
      'GENERATE',
      'SEND',
      'VIEW',
      'SIGN',
      'DOWNLOAD',
      'REVOKE',
      'UPDATE'
    );
  END IF;
END
$$;

-- 2. Tabla: platform_legal_templates (Plantillas Maestras Oficiales de Etymon)
CREATE TABLE IF NOT EXISTS public.platform_legal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code public.platform_contract_type_enum NOT NULL UNIQUE,
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  category TEXT NOT NULL DEFAULT 'legal_master',
  description TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabla: institution_contracts (Contratos Individualizados por Colegio)
CREATE TABLE IF NOT EXISTS public.institution_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT NOT NULL UNIQUE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.platform_legal_templates(id) ON DELETE RESTRICT,
  contract_type public.platform_contract_type_enum NOT NULL,
  title TEXT NOT NULL,
  status public.platform_contract_status_enum NOT NULL DEFAULT 'draft',
  version TEXT NOT NULL DEFAULT '1.0',
  content_markdown TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  institution_legal_name TEXT,
  institution_nit TEXT,
  rector_name TEXT,
  rector_document_id TEXT,
  rector_email TEXT,
  plan_name TEXT,
  plan_price_cop NUMERIC(14,2) DEFAULT 0,
  billing_cycle TEXT DEFAULT 'monthly',
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signed_at TIMESTAMPTZ,
  signed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signer_name TEXT,
  signer_document_id TEXT,
  signer_role TEXT,
  signature_hash TEXT,
  signature_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_institution_contracts_inst_status 
  ON public.institution_contracts(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_institution_contracts_number 
  ON public.institution_contracts(contract_number);

-- 4. Tabla: platform_contract_audit_logs (Pista Forense Inmutable)
CREATE TABLE IF NOT EXISTS public.platform_contract_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.institution_contracts(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  action public.platform_contract_audit_action_enum NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_contract_audit_inst 
  ON public.platform_contract_audit_logs(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_contract_audit_contract 
  ON public.platform_contract_audit_logs(contract_id, created_at DESC);

-- 5. Triggers de Actualización Temporal
CREATE OR REPLACE FUNCTION public.touch_contracts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_platform_legal_templates ON public.platform_legal_templates;
CREATE TRIGGER trg_touch_platform_legal_templates
  BEFORE UPDATE ON public.platform_legal_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_contracts_updated_at();

DROP TRIGGER IF EXISTS trg_touch_institution_contracts ON public.institution_contracts;
CREATE TRIGGER trg_touch_institution_contracts
  BEFORE UPDATE ON public.institution_contracts
  FOR EACH ROW EXECUTE FUNCTION public.touch_contracts_updated_at();

-- 6. Seguridad RLS y Permisos
ALTER TABLE public.platform_legal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_contract_audit_logs ENABLE ROW LEVEL SECURITY;

-- Prohibir manipulación directa de la tabla de auditoría
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.platform_contract_audit_logs FROM authenticated, anon, public;

-- Políticas: platform_legal_templates
DROP POLICY IF EXISTS "Lectura de plantillas para autenticados" ON public.platform_legal_templates;
CREATE POLICY "Lectura de plantillas para autenticados"
  ON public.platform_legal_templates FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Gestion total de plantillas para Etymon Owner" ON public.platform_legal_templates;
CREATE POLICY "Gestion total de plantillas para Etymon Owner"
  ON public.platform_legal_templates FOR ALL TO authenticated
  USING (public.is_provider_owner())
  WITH CHECK (public.is_provider_owner());

-- Políticas: institution_contracts
DROP POLICY IF EXISTS "Lectura de contratos por Owner o Rector del Tenant" ON public.institution_contracts;
CREATE POLICY "Lectura de contratos por Owner o Rector del Tenant"
  ON public.institution_contracts FOR SELECT TO authenticated
  USING (
    public.is_provider_owner()
    OR (
      institution_id = public.current_institution_id()
      AND EXISTS (
        SELECT 1 FROM public.institution_memberships im
        WHERE im.user_id = auth.uid()
          AND im.institution_id = public.institution_contracts.institution_id
          AND im.role = 'rector'::public.user_role_enum
      )
    )
  );

DROP POLICY IF EXISTS "Gestion total de contratos para Etymon Owner" ON public.institution_contracts;
CREATE POLICY "Gestion total de contratos para Etymon Owner"
  ON public.institution_contracts FOR ALL TO authenticated
  USING (public.is_provider_owner())
  WITH CHECK (public.is_provider_owner());

-- Políticas: platform_contract_audit_logs (Solo lectura)
DROP POLICY IF EXISTS "Lectura de auditoria contractual por Owner o Rector del Tenant" ON public.platform_contract_audit_logs;
CREATE POLICY "Lectura de auditoria contractual por Owner o Rector del Tenant"
  ON public.platform_contract_audit_logs FOR SELECT TO authenticated
  USING (
    public.is_provider_owner()
    OR (
      institution_id = public.current_institution_id()
      AND EXISTS (
        SELECT 1 FROM public.institution_memberships im
        WHERE im.user_id = auth.uid()
          AND im.institution_id = public.platform_contract_audit_logs.institution_id
          AND im.role = 'rector'::public.user_role_enum
      )
    )
  );

-- 7. Procedimiento RPC: Generar Contrato Institucional (Security Definer)
CREATE OR REPLACE FUNCTION public.etymon_generate_institution_contract(
  p_institution_id UUID,
  p_template_code public.platform_contract_type_enum,
  p_custom_title TEXT DEFAULT NULL,
  p_plan_name TEXT DEFAULT NULL,
  p_plan_price_cop NUMERIC DEFAULT 0,
  p_billing_cycle TEXT DEFAULT 'monthly',
  p_valid_until DATE DEFAULT NULL,
  p_content_override TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_template RECORD;
  v_inst RECORD;
  v_settings RECORD;
  v_consecutive INT;
  v_contract_num TEXT;
  v_title TEXT;
  v_markdown TEXT;
  v_hash TEXT;
  v_new_id UUID;
  v_year TEXT;
  v_slug TEXT;
BEGIN
  -- Validar privilegios de Owner
  IF NOT public.is_provider_owner() THEN
    RAISE EXCEPTION 'Acceso denegado: solo el Owner de Etymon puede emitir contratos.';
  END IF;

  -- Obtener plantilla
  SELECT * INTO v_template FROM public.platform_legal_templates WHERE code = p_template_code AND is_active = true LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plantilla contractual no encontrada o inactiva: %', p_template_code;
  END IF;

  -- Obtener institución y settings
  SELECT * INTO v_inst FROM public.institutions WHERE id = p_institution_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Institución no encontrada: %', p_institution_id;
  END IF;

  SELECT * INTO v_settings FROM public.institution_settings WHERE institution_id = p_institution_id LIMIT 1;

  v_year := to_char(now(), 'YYYY');
  v_slug := upper(coalesce(nullif(v_inst.slug, ''), 'INST'));
  
  -- Calcular consecutivo
  SELECT count(*) + 1 INTO v_consecutive 
  FROM public.institution_contracts 
  WHERE institution_id = p_institution_id;

  v_contract_num := format('ETM-%s-%s-%s', v_year, v_slug, lpad(v_consecutive::text, 3, '0'));
  v_title := coalesce(nullif(trim(p_custom_title), ''), v_template.name);
  
  -- Interpolar markdown si no viene override
  IF p_content_override IS NOT NULL AND trim(p_content_override) <> '' THEN
    v_markdown := p_content_override;
  ELSE
    v_markdown := v_template.content_markdown;
    v_markdown := replace(v_markdown, '{{CONTRACT_NUMBER}}', v_contract_num);
    v_markdown := replace(v_markdown, '{{INSTITUTION_NAME}}', coalesce(v_settings.legal_name, v_inst.name));
    v_markdown := replace(v_markdown, '{{NIT}}', coalesce(v_settings.nit, 'Por definir'));
    v_markdown := replace(v_markdown, '{{RECTOR_NAME}}', coalesce(v_settings.rector_name, 'Representante Legal'));
    v_markdown := replace(v_markdown, '{{ADDRESS}}', coalesce(v_settings.address, 'Sede Institucional'));
    v_markdown := replace(v_markdown, '{{PLAN_NAME}}', coalesce(p_plan_name, 'Plan Institucional Etymon'));
    v_markdown := replace(v_markdown, '{{PRICE_COP}}', to_char(coalesce(p_plan_price_cop, 0), 'FM999,999,999'));
    v_markdown := replace(v_markdown, '{{DATE}}', to_char(now(), 'DD/MM/YYYY'));
  END IF;

  v_hash := encode(digest(v_markdown, 'sha256'), 'hex');

  INSERT INTO public.institution_contracts (
    contract_number,
    institution_id,
    template_id,
    contract_type,
    title,
    status,
    version,
    content_markdown,
    content_hash,
    institution_legal_name,
    institution_nit,
    rector_name,
    rector_email,
    plan_name,
    plan_price_cop,
    billing_cycle,
    valid_from,
    valid_until,
    created_by
  ) VALUES (
    v_contract_num,
    p_institution_id,
    v_template.id,
    p_template_code,
    v_title,
    'draft',
    v_template.version,
    v_markdown,
    v_hash,
    coalesce(v_settings.legal_name, v_inst.name),
    v_settings.nit,
    v_settings.rector_name,
    v_settings.phone,
    p_plan_name,
    p_plan_price_cop,
    p_billing_cycle,
    current_date,
    p_valid_until,
    auth.uid()
  )
  RETURNING id INTO v_new_id;

  -- Registrar auditoría inmutable
  INSERT INTO public.platform_contract_audit_logs (
    contract_id,
    institution_id,
    actor_user_id,
    actor_role,
    action,
    details
  ) VALUES (
    v_new_id,
    p_institution_id,
    auth.uid(),
    'owner',
    'GENERATE',
    jsonb_build_object(
      'contract_number', v_contract_num,
      'template_code', p_template_code,
      'content_hash', v_hash
    )
  );

  RETURN v_new_id;
END;
$$;

-- 8. Procedimiento RPC: Enviar Contrato a Rector para Firma
CREATE OR REPLACE FUNCTION public.etymon_send_institution_contract(
  p_contract_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_contract RECORD;
BEGIN
  IF NOT public.is_provider_owner() THEN
    RAISE EXCEPTION 'Acceso denegado: solo el Owner de Etymon puede despachar contratos.';
  END IF;

  SELECT * INTO v_contract FROM public.institution_contracts WHERE id = p_contract_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato no encontrado: %', p_contract_id;
  END IF;

  IF v_contract.status NOT IN ('draft', 'revoked') THEN
    RAISE EXCEPTION 'El contrato ya fue enviado o se encuentra en estado %', v_contract.status;
  END IF;

  UPDATE public.institution_contracts
  SET status = 'sent',
      sent_at = now(),
      sent_by = auth.uid(),
      updated_at = now()
  WHERE id = p_contract_id;

  INSERT INTO public.platform_contract_audit_logs (
    contract_id,
    institution_id,
    actor_user_id,
    actor_role,
    action,
    details
  ) VALUES (
    p_contract_id,
    v_contract.institution_id,
    auth.uid(),
    'owner',
    'SEND',
    jsonb_build_object('contract_number', v_contract.contract_number, 'sent_at', now())
  );

  RETURN true;
END;
$$;

-- 9. Procedimiento RPC: Firma Digital del Contrato por el Rector
CREATE OR REPLACE FUNCTION public.etymon_sign_institution_contract(
  p_contract_id UUID,
  p_signer_document_id TEXT,
  p_signer_name TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_contract RECORD;
  v_is_rector BOOLEAN;
  v_signature_seal TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida para firmar el contrato.';
  END IF;

  SELECT * INTO v_contract FROM public.institution_contracts WHERE id = p_contract_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato no encontrado: %', p_contract_id;
  END IF;

  IF v_contract.status <> 'sent' THEN
    RAISE EXCEPTION 'El contrato no está pendiente de firma (Estado actual: %)', v_contract.status;
  END IF;

  -- Verificar que el usuario autenticado sea rector de la institución del contrato
  SELECT EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE user_id = auth.uid()
      AND institution_id = v_contract.institution_id
      AND role = 'rector'::public.user_role_enum
  ) INTO v_is_rector;

  IF NOT v_is_rector AND NOT public.is_provider_owner() THEN
    RAISE EXCEPTION 'Solo el Rector o Representante Legal puede firmar este acuerdo.';
  END IF;

  -- Generar sello criptográfico de no repudio
  v_signature_seal := encode(
    digest(
      format('%s|%s|%s|%s|%s', v_contract.content_hash, auth.uid(), p_signer_document_id, now(), coalesce(p_ip_address, '0.0.0.0')),
      'sha256'
    ),
    'hex'
  );

  UPDATE public.institution_contracts
  SET status = 'signed',
      signed_at = now(),
      signed_by_user_id = auth.uid(),
      signer_name = p_signer_name,
      signer_document_id = p_signer_document_id,
      signer_role = 'rector',
      signature_hash = v_signature_seal,
      signature_metadata = jsonb_build_object(
        'ip_address', coalesce(p_ip_address, 'desconocida'),
        'user_agent', coalesce(p_user_agent, 'navegador web'),
        'legal_framework', 'Ley 527 de 1999 y Ley 1581 de 2012 de Colombia',
        'timestamp', now()
      ),
      updated_at = now()
  WHERE id = p_contract_id;

  -- Sincronizar fecha de inicio de contrato en cuenta comercial
  UPDATE public.provider_customer_accounts
  SET contract_start_date = coalesce(contract_start_date, current_date),
      commercial_status = 'active',
      updated_at = now()
  WHERE institution_id = v_contract.institution_id;

  -- Registrar auditoría inmutable
  INSERT INTO public.platform_contract_audit_logs (
    contract_id,
    institution_id,
    actor_user_id,
    actor_role,
    action,
    ip_address,
    user_agent,
    details
  ) VALUES (
    p_contract_id,
    v_contract.institution_id,
    auth.uid(),
    'rector',
    'SIGN',
    p_ip_address,
    p_user_agent,
    jsonb_build_object(
      'signature_seal', v_signature_seal,
      'signer_name', p_signer_name,
      'signer_document_id', p_signer_document_id
    )
  );

  RETURN true;
END;
$$;

-- 10. Procedimiento RPC: Revocar Contrato (Solo Owner)
CREATE OR REPLACE FUNCTION public.etymon_revoke_institution_contract(
  p_contract_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_contract RECORD;
BEGIN
  IF NOT public.is_provider_owner() THEN
    RAISE EXCEPTION 'Acceso denegado: solo el Owner puede revocar contratos.';
  END IF;

  SELECT * INTO v_contract FROM public.institution_contracts WHERE id = p_contract_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato no encontrado: %', p_contract_id;
  END IF;

  UPDATE public.institution_contracts
  SET status = 'revoked',
      revoked_at = now(),
      revoked_by = auth.uid(),
      revocation_reason = p_reason,
      updated_at = now()
  WHERE id = p_contract_id;

  INSERT INTO public.platform_contract_audit_logs (
    contract_id,
    institution_id,
    actor_user_id,
    actor_role,
    action,
    details
  ) VALUES (
    p_contract_id,
    v_contract.institution_id,
    auth.uid(),
    'owner',
    'REVOKE',
    jsonb_build_object('reason', p_reason, 'revoked_at', now())
  );

  RETURN true;
END;
$$;

-- 11. Seed de Plantillas Maestras Legales
INSERT INTO public.platform_legal_templates (code, name, version, description, content_markdown)
VALUES 
(
  'SAAS_SERVICE_AGREEMENT',
  'Contrato Marco de Licenciamiento SaaS',
  '1.0',
  'Contrato principal de prestación de servicios de software en la nube, módulos habilitados, SLA de servicio y soporte.',
  '# CONTRATO DE PRESTACIÓN DE SERVICIOS DE SOFTWARE COMO SERVICIO (SaaS)

**CONTRATO NÚMERO:** {{CONTRACT_NUMBER}}  
**FECHA DE EMISIÓN:** {{DATE}}  

Entre los suscritos:
1. **EL PROVEEDOR:** **ETYMON**, plataforma de gestión y gobernanza educativa integral en la nube.
2. **EL CLIENTE:** La institución educativa **{{INSTITUTION_NAME}}**, con NIT **{{NIT}}**, domiciliada en **{{ADDRESS}}**, legalmente representada por **{{RECTOR_NAME}}** en su calidad de Rector(a) y Representante Legal.

Las partes acuerdan celebrar el presente Contrato de Licenciamiento SaaS bajo las siguientes cláusulas:

---

### CLÁUSULA PRIMERA: OBJETO
El Proveedor concede al Cliente una licencia de uso no exclusiva, intransferible y en la modalidad SaaS de la plataforma Etymon, que incluye los módulos de gestión académica, portal de calificaciones, asistencias, horarios y administración escolar bajo el plan contratado: **{{PLAN_NAME}}**.

### CLÁUSULA SEGUNDA: CANON DEL SERVICIO Y FORMA DE PAGO
El valor de licenciamiento mensual pactado corresponde a **${{PRICE_COP}} COP**, el cual será liquidado y facturado periódicamente conforme al plan comercial acordado.

### CLÁUSULA TERCERA: DISPONIBILIDAD Y SOPORTE (SLA)
El Proveedor se compromete a mantener un nivel de disponibilidad mensual del servicio de al menos **99.5%**, excluyendo ventanas de mantenimiento programadas informadas con no menos de 24 horas de antelación.

### CLÁUSULA CUARTA: PROPIEDAD INTELECTUAL Y CUSTODIA
El software, su código fuente, arquitectura, diseño y marcas son propiedad exclusiva de Etymon. Los datos académicos, expedientes de estudiantes y registros de la institución son y permanecerán bajo exclusiva titularidad y dominio del Cliente.

### CLÁUSULA QUINTA: VALIDEZ DE FIRMA ELECTRÓNICA
Las partes reconocen plena validez, eficacia probatoria y obligatoriedad legal a la firma electrónica y aceptación digital del presente instrumento, conforme a lo establecido en la **Ley 527 de 1999** de la República de Colombia.
'
),
(
  'DATA_PROCESSING_AGREEMENT',
  'Acuerdo de Transmisión de Datos Personales (DPA / Habeas Data Menores)',
  '1.0',
  'Acuerdo vinculante conforme a la Ley 1581 de 2012 y Decreto 1377 de 2013 para la custodia y tratamiento seguro de datos de niños, niñas y adolescentes.',
  '# ACUERDO DE TRANSMISIÓN DE DATOS PERSONALES (DPA) Y HABEAS DATA
### CUSTODIA Y PROTECCIÓN DE DATOS SENSIBLES DE MENORES DE EDAD

**VINCULADO AL CONTRATO:** {{CONTRACT_NUMBER}}  
**RESPONSABLE DEL TRATAMIENTO:** {{INSTITUTION_NAME}} (NIT: {{NIT}})  
**ENCARGADO DEL TRATAMIENTO:** ETYMON (Plataforma Tecnológica)  

En cumplimiento de la **Ley Estatutaria 1581 de 2012**, el **Decreto Reglamentario 1377 de 2013** y la jurisprudencia constitucional sobre el interés superior de los niños, niñas y adolescentes:

---

### CLÁUSULA PRIMERA: CALIDAD DE LAS PARTES
La Institución Educativa actúa en calidad de **Responsable del Tratamiento**, garantizando contar con las autorizaciones y fundamentos legales aplicables. Etymon actúa en calidad de **Encargado del Tratamiento**, procesando la información exclusivamente bajo las directrices del Responsable.

### CLÁUSULA SEGUNDA: FINALIDADES AUTORIZADAS
El tratamiento de datos personales de estudiantes, padres y acudientes se limitará a:
1. Gestión y emisión de boletines, registros de notas y certificados académicos.
2. Control de asistencia presencial y biométrica consentida.
3. Notificaciones escolares, circulares y cobranza de pensiones.

### CLÁUSULA TERCERA: MEDIDAS DE SEGURIDAD Y CONFIDENCIALIDAD
Etymon implementa aislamiento lógico multi-inquilino (RLS), cifrado de datos en reposo y tránsito (TLS 1.3), y pistas de auditoría inmutables para el acceso a documentos confidenciales.

### CLÁUSULA CUARTA: NOTIFICACIÓN DE INCIDENTES
En caso de detectar cualquier brecha de seguridad que comprometa la confidencialidad de datos personales, Etymon notificará a la Institución dentro de las 72 horas siguientes para coordinar el reporte ante la Superintendencia de Industria y Comercio (SIC).
'
),
(
  'TERMS_AND_CONDITIONS',
  'Términos y Condiciones de Uso de la Plataforma',
  '1.0',
  'Políticas de uso aceptable, deberes de los usuarios y validez de actos electrónicos.',
  '# TÉRMINOS Y CONDICIONES GENERALES DE USO DE LA PLATAFORMA ETYMON

**APLICABLE A:** {{INSTITUTION_NAME}}  

1. **Uso Aceptable:** Los accesos asignados a directivos, profesores y familias son personales e intransferibles. Queda prohibido compartir credenciales maestras.
2. **Custodia de Información:** La institución es responsable de la exactitud y veracidad de las calificaciones y datos ingresados.
3. **No Repudio:** Todo acto realizado bajo una sesión autenticada con roles directivos se entenderá ejecutado por el titular de la cuenta.
'
),
(
  'SLA_SECURITY_POLICY',
  'Política de Niveles de Servicio y Seguridad',
  '1.0',
  'Definición de RPO, RTO, soporte prioritario y ventanas de mantenimiento.',
  '# POLÍTICA DE NIVELES DE SERVICIO (SLA) Y CONTINUIDAD OPERATIVA

**INSTITUCIÓN:** {{INSTITUTION_NAME}}  

- **Disponibilidad comprometida:** 99.5% anual.
- **RPO (Pérdida máxima de datos admisible):** Menor a 1 hora (backups continuos).
- **RTO (Tiempo de recuperación ante desastres):** Menor a 4 horas.
- **Soporte prioritario:** Canales de atención directa para la rectoría en días hábiles de 7:00 a 17:00 horas.
'
),
(
  'MASTER_COMPLIANCE_PACK',
  'Paquete Integral de Legitimidad y Cumplimiento Educativo',
  '1.0',
  'Convenio unificado que agrupa el Contrato SaaS, el Acuerdo de Tratamiento de Datos (DPA) y los Términos de Servicio en un solo instrumento.',
  '# CONVENIO INTEGRAL DE SERVICIOS Y CUMPLIMIENTO REGULATORIO EDUCATIVO

**CONVENIO NÚMERO:** {{CONTRACT_NUMBER}}  
**INSTITUCIÓN:** {{INSTITUTION_NAME}} (NIT: {{NIT}})  
**REPRESENTANTE LEGAL:** {{RECTOR_NAME}}  
**VALOR MENSUAL:** ${{PRICE_COP}} COP  

El presente instrumento unifica de manera integral:
1. El **Contrato Marco de Licenciamiento SaaS de Etymon**.
2. El **Acuerdo de Transmisión de Datos Personales de Menores (DPA Ley 1581/2012)**.
3. La **Política de Seguridad, Copias de Respaldo y Niveles de Servicio (SLA)**.

Al suscribir este convenio, las partes ratifican su compromiso con la excelencia educativa, la protección integral de la niñez y la legitimidad jurídica de todas las operaciones tecnológicas del colegio.
'
)
ON CONFLICT (code) DO UPDATE
SET name = excluded.name,
    description = excluded.description,
    content_markdown = excluded.content_markdown,
    updated_at = now();

COMMIT;
