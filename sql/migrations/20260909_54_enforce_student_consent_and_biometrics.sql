-- Fase 2: consentimientos y biometría sólo mediante procedimientos auditables.
BEGIN;

CREATE OR REPLACE FUNCTION public.can_manage_student_consent(p_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.student_guardian_accounts sga ON sga.student_id = s.id
    WHERE s.id = p_student_id AND sga.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.institution_memberships im ON im.institution_id = s.institution_id
    WHERE s.id = p_student_id AND im.user_id = auth.uid()
      AND im.role IN ('rector'::public.user_role_enum, 'admin'::public.user_role_enum)
  );
$$;

CREATE OR REPLACE FUNCTION public.record_student_consent(
  p_student_id uuid,
  p_purpose public.consent_purpose_enum,
  p_guardian_name text,
  p_guardian_document_id text,
  p_consent_text_hash text,
  p_source public.consent_source_enum DEFAULT 'PORTAL_WEB',
  p_legal_basis text DEFAULT 'Autorización previa, expresa e informada del representante legal'
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_institution_id uuid; v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_student_consent(p_student_id) THEN
    RAISE EXCEPTION 'No autorizado para registrar consentimiento para este estudiante.';
  END IF;
  IF length(trim(coalesce(p_guardian_name, ''))) < 3 OR length(trim(coalesce(p_consent_text_hash, ''))) <> 64 THEN
    RAISE EXCEPTION 'La evidencia del consentimiento es incompleta.';
  END IF;
  SELECT institution_id INTO v_institution_id FROM public.students WHERE id = p_student_id;
  UPDATE public.student_consents
    SET status = 'SUPERSEDED', updated_at = now()
    WHERE student_id = p_student_id AND purpose = p_purpose AND status = 'GRANTED';
  INSERT INTO public.student_consents (
    institution_id, student_id, guardian_id, guardian_name, guardian_document_id, purpose,
    legal_basis, policy_version, terms_version, consent_text_hash, source, user_agent, metadata
  ) VALUES (
    v_institution_id, p_student_id, auth.uid(), trim(p_guardian_name), nullif(trim(p_guardian_document_id), ''), p_purpose,
    coalesce(nullif(trim(p_legal_basis), ''), 'Autorización previa, expresa e informada del representante legal'),
    '1.0.0', '1.0.0', lower(p_consent_text_hash), p_source, current_setting('request.headers', true)::jsonb ->> 'user-agent',
    jsonb_build_object('recorded_by', auth.uid())
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_student_consent(p_consent_id uuid, p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_consent public.student_consents%rowtype;
BEGIN
  SELECT * INTO v_consent FROM public.student_consents WHERE id = p_consent_id;
  IF NOT FOUND OR auth.uid() IS NULL OR NOT public.can_manage_student_consent(v_consent.student_id) THEN
    RAISE EXCEPTION 'No autorizado para revocar este consentimiento.';
  END IF;
  IF v_consent.status <> 'GRANTED' THEN RETURN false; END IF;
  UPDATE public.student_consents SET status = 'REVOKED', revoked_at = now(), revoked_by = auth.uid(),
    revocation_reason = nullif(trim(p_reason), ''), updated_at = now() WHERE id = p_consent_id;
  IF v_consent.purpose = 'BIOMETRIC' THEN
    DELETE FROM public.student_biometrics WHERE student_id = v_consent.student_id;
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_student_consents(p_student_id uuid)
RETURNS SETOF public.student_consents LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT sc.* FROM public.student_consents sc
  WHERE sc.student_id = p_student_id AND public.can_manage_student_consent(p_student_id)
  ORDER BY sc.accepted_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.enroll_student_biometric(p_student_id uuid, p_embedding double precision[])
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_student_consent(p_student_id) THEN
    RAISE EXCEPTION 'No autorizado para enrolar biometría.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.student_consents WHERE student_id = p_student_id AND purpose = 'BIOMETRIC' AND status = 'GRANTED') THEN
    RAISE EXCEPTION 'El estudiante no cuenta con consentimiento biométrico vigente.';
  END IF;
  IF coalesce(array_length(p_embedding, 1), 0) <> 128 THEN
    RAISE EXCEPTION 'El vector biométrico debe tener 128 dimensiones.';
  END IF;
  INSERT INTO public.student_biometrics (student_id, embedding, updated_at)
  VALUES (p_student_id, p_embedding, now())
  ON CONFLICT (student_id) DO UPDATE SET embedding = excluded.embedding, updated_at = now();
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_consented_student_biometrics(p_student_ids uuid[])
RETURNS TABLE(id uuid, student_id uuid, embedding double precision[], created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT sb.id, sb.student_id, sb.embedding, sb.created_at, sb.updated_at
  FROM public.student_biometrics sb
  JOIN public.students s ON s.id = sb.student_id
  WHERE sb.student_id = ANY(p_student_ids)
    AND EXISTS (SELECT 1 FROM public.institution_memberships im WHERE im.user_id = auth.uid() AND im.institution_id = s.institution_id)
    AND EXISTS (SELECT 1 FROM public.student_consents sc WHERE sc.student_id = sb.student_id AND sc.purpose = 'BIOMETRIC' AND sc.status = 'GRANTED');
$$;

CREATE OR REPLACE FUNCTION public.remove_student_biometric(p_student_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_student_consent(p_student_id) THEN
    RAISE EXCEPTION 'No autorizado para eliminar biometría.';
  END IF;
  DELETE FROM public.student_biometrics WHERE student_id = p_student_id;
  RETURN true;
END;
$$;

DROP POLICY IF EXISTS student_biometrics_insert_policy ON public.student_biometrics;
DROP POLICY IF EXISTS student_biometrics_update_policy ON public.student_biometrics;
DROP POLICY IF EXISTS student_biometrics_delete_policy ON public.student_biometrics;
REVOKE INSERT, UPDATE, DELETE ON public.student_biometrics FROM authenticated;

REVOKE ALL ON FUNCTION public.record_student_consent(uuid, public.consent_purpose_enum, text, text, text, public.consent_source_enum, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_student_consent(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_my_student_consents(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enroll_student_biometric(uuid, double precision[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_consented_student_biometrics(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_student_biometric(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_student_consent(uuid, public.consent_purpose_enum, text, text, text, public.consent_source_enum, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_student_consent(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_student_consents(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_student_biometric(uuid, double precision[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_consented_student_biometrics(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_student_biometric(uuid) TO authenticated;

COMMIT;
