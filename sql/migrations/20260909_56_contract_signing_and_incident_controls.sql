BEGIN;

ALTER TABLE public.institution_contracts
  DROP CONSTRAINT IF EXISTS signed_contract_requires_signer_identity;
ALTER TABLE public.institution_contracts
  ADD CONSTRAINT signed_contract_requires_signer_identity CHECK (
    status NOT IN ('signed', 'active') OR (
      nullif(btrim(signer_name), '') IS NOT NULL
      AND nullif(btrim(signer_document_id), '') IS NOT NULL
      AND signed_at IS NOT NULL AND signature_hash IS NOT NULL
    )
  );

-- Los incidentes son evidencia institucional y no se eliminan físicamente.
DROP POLICY IF EXISTS "Gestion de incidentes de seguridad reservada para directivos" ON public.data_breach_incidents;
CREATE POLICY "Lectura de incidentes para rector del tenant"
ON public.data_breach_incidents FOR SELECT TO authenticated
USING (institution_id = public.current_institution_id() AND EXISTS (
  SELECT 1 FROM public.institution_memberships im
  WHERE im.user_id = auth.uid() AND im.institution_id = public.data_breach_incidents.institution_id
    AND im.role IN ('rector'::public.user_role_enum, 'admin'::public.user_role_enum)
));
CREATE POLICY "Alta y actualizacion de incidentes para rector del tenant"
ON public.data_breach_incidents FOR INSERT TO authenticated
WITH CHECK (institution_id = public.current_institution_id() AND EXISTS (
  SELECT 1 FROM public.institution_memberships im
  WHERE im.user_id = auth.uid() AND im.institution_id = public.data_breach_incidents.institution_id
    AND im.role IN ('rector'::public.user_role_enum, 'admin'::public.user_role_enum)
));
CREATE POLICY "Actualizacion de incidentes para rector del tenant"
ON public.data_breach_incidents FOR UPDATE TO authenticated
USING (institution_id = public.current_institution_id() AND EXISTS (
  SELECT 1 FROM public.institution_memberships im
  WHERE im.user_id = auth.uid() AND im.institution_id = public.data_breach_incidents.institution_id
    AND im.role IN ('rector'::public.user_role_enum, 'admin'::public.user_role_enum)
)) WITH CHECK (institution_id = public.current_institution_id());
REVOKE DELETE ON public.data_breach_incidents FROM authenticated;
COMMIT;
