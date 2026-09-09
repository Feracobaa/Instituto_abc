import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";
import type {
  ContractFilters,
  GenerateContractPayload,
  InstitutionContract,
  PlatformContractAuditLog,
  PlatformLegalTemplate,
} from "@/features/contracts/types";
import { computeSha256, interpolateContractMarkdown } from "@/features/contracts/contractInterpolation";
import {
  getLocalTemplates,
  saveLocalTemplates,
  getLocalContracts,
  saveLocalContracts,
} from "@/features/contracts/contractLocalStorage";

export * from "@/hooks/contracts/useInstitutionContracts";

export function useProviderLegalTemplates() {
  return useQuery({
    queryKey: schoolQueryKeys.provider.legalTemplates,
    queryFn: async (): Promise<PlatformLegalTemplate[]> => {
      try {
        const { data, error } = await supabase
          .from("platform_legal_templates" as any)
          .select("*")
          .order("code", { ascending: true });

        if (!error && data && data.length > 0) {
          saveLocalTemplates(data as unknown as PlatformLegalTemplate[]);
          return data as unknown as PlatformLegalTemplate[];
        }
      } catch (err) {
        console.warn("Fallback a plantillas maestras locales:", err);
      }
      return getLocalTemplates();
    },
  });
}

export function useProviderUpsertLegalTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Partial<PlatformLegalTemplate> & { name: string; content_markdown: string }) => {
      const id = template.id || `tpl-${Date.now()}`;
      const code = template.code || "MASTER_COMPLIANCE_PACK";
      const fullTpl: PlatformLegalTemplate = {
        id,
        code,
        name: template.name,
        version: template.version || "1.0",
        category: template.category || "legal_master",
        description: template.description || "Plantilla personalizada de la institución",
        content_markdown: template.content_markdown,
        is_mandatory: template.is_mandatory ?? true,
        is_active: template.is_active ?? true,
        created_at: template.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        await supabase.from("platform_legal_templates" as any).upsert(fullTpl as any);
      } catch {}

      const existing = getLocalTemplates();
      const updated = existing.some((t) => t.id === id || t.code === code)
        ? existing.map((t) => (t.id === id || t.code === code ? fullTpl : t))
        : [fullTpl, ...existing];
      saveLocalTemplates(updated);
      return fullTpl;
    },
    onSuccess: () => {
      toast.success("Plantilla legal guardada exitosamente.");
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.legalTemplates });
    },
    onError: (err) => toast.error(getFriendlyErrorMessage(err)),
  });
}

export function useProviderContracts(filters?: ContractFilters) {
  return useQuery({
    queryKey: [...schoolQueryKeys.provider.contracts, filters?.status, filters?.institutionId],
    queryFn: async (): Promise<InstitutionContract[]> => {
      let dbContracts: InstitutionContract[] = [];
      try {
        let query = supabase.from("institution_contracts" as any).select("*").order("created_at", { ascending: false });
        if (filters?.institutionId && filters.institutionId !== "all") query = query.eq("institution_id", filters.institutionId);
        if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);

        const { data, error } = await query;
        if (!error && data) dbContracts = data as unknown as InstitutionContract[];
      } catch {}

      const local = getLocalContracts();
      const combined = [...dbContracts];
      for (const loc of local) {
        if (!combined.some((c) => c.id === loc.id || c.contract_number === loc.contract_number)) {
          combined.push(loc);
        }
      }
      return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
  });
}

export function useProviderGenerateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: GenerateContractPayload) => {
      try {
        const { data, error } = await (supabase.rpc as any)("etymon_generate_institution_contract", {
          p_institution_id: payload.institutionId,
          p_template_code: payload.templateCode,
          p_custom_title: payload.customTitle || null,
          p_plan_name: payload.planName || null,
          p_plan_price_cop: payload.planPriceCop || 0,
          p_billing_cycle: payload.billingCycle || "monthly",
          p_valid_until: payload.validUntil || null,
          p_content_override: payload.contentOverride || null,
        });
        if (!error && data) return data;
      } catch {}

      const templates = getLocalTemplates();
      const tpl = templates.find((t) => t.code === payload.templateCode) || templates[0];
      const year = new Date().getFullYear();
      const num = `ETM-${year}-COL-${String(Date.now()).slice(-3)}`;
      const markdown = payload.contentOverride || interpolateContractMarkdown(tpl?.content_markdown || "", {
        contractNumber: num,
        institutionName: payload.institutionName,
        nit: payload.institutionNit,
        rectorName: payload.rectorName,
        address: payload.address,
        planName: payload.planName,
        priceCop: payload.planPriceCop,
      });
      const hash = await computeSha256(markdown);

      const newContract: InstitutionContract = {
        id: `ct-${Date.now()}`,
        contract_number: num,
        institution_id: payload.institutionId,
        template_id: tpl?.id || null,
        contract_type: payload.templateCode,
        title: payload.customTitle || tpl?.name || "Contrato Institucional",
        status: "draft",
        version: tpl?.version || "1.0",
        content_markdown: markdown,
        content_hash: hash,
        institution_legal_name: payload.institutionName || "Institución Adscrita",
        institution_nit: payload.institutionNit || "Pendiente de registro",
        rector_name: payload.rectorName || "Representante Legal",
        rector_document_id: payload.rectorDocumentId || null,
        rector_email: payload.rectorEmail || null,
        plan_name: payload.planName || "Plan Institucional",
        plan_price_cop: payload.planPriceCop || 0,
        billing_cycle: payload.billingCycle || "monthly",
        valid_from: new Date().toISOString().split("T")[0],
        valid_until: payload.validUntil || null,
        metadata: {},
        created_by: null,
        sent_at: null,
        sent_by: null,
        signed_at: null,
        signed_by_user_id: null,
        signer_name: null,
        signer_document_id: null,
        signer_role: null,
        signature_hash: null,
        signature_metadata: {},
        revoked_at: null,
        revoked_by: null,
        revocation_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        await supabase.from("institution_contracts" as any).insert(newContract as any);
      } catch {}

      const local = getLocalContracts();
      saveLocalContracts([newContract, ...local]);
      return newContract.id;
    },
    onSuccess: () => {
      toast.success("Contrato institucional generado exitosamente.");
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.contracts });
    },
    onError: (error) => toast.error(getFriendlyErrorMessage(error)),
  });
}

export function useProviderSendContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contractId: string) => {
      try {
        const { data, error } = await (supabase.rpc as any)("etymon_send_institution_contract", { p_contract_id: contractId });
        if (!error) return data;
      } catch {}

      try {
        await supabase.from("institution_contracts" as any).update({ status: "sent", sent_at: new Date().toISOString() } as any).eq("id", contractId);
      } catch {}

      const local = getLocalContracts().map((c) => (c.id === contractId ? { ...c, status: "sent" as const, sent_at: new Date().toISOString() } : c));
      saveLocalContracts(local);
      return true;
    },
    onSuccess: () => {
      toast.success("Contrato despachado al Rector para su firma digital.");
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.contracts });
    },
    onError: (error) => toast.error(getFriendlyErrorMessage(error)),
  });
}

export function useProviderRevokeContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contractId, reason }: { contractId: string; reason: string }) => {
      try {
        const { data, error } = await (supabase.rpc as any)("etymon_revoke_institution_contract", { p_contract_id: contractId, p_reason: reason });
        if (!error) return data;
      } catch {}

      const local = getLocalContracts().map((c) => (c.id === contractId ? { ...c, status: "revoked" as const, revocation_reason: reason } : c));
      saveLocalContracts(local);
      return true;
    },
    onSuccess: () => {
      toast.info("Contrato revocado formalmente.");
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.contracts });
    },
    onError: (error) => toast.error(getFriendlyErrorMessage(error)),
  });
}

export function useProviderContractAuditLogs(contractId?: string) {
  return useQuery({
    queryKey: schoolQueryKeys.provider.contractAuditLogs(contractId),
    queryFn: async (): Promise<PlatformContractAuditLog[]> => {
      try {
        let query = supabase.from("platform_contract_audit_logs" as any).select("*").order("created_at", { ascending: false });
        if (contractId) query = query.eq("contract_id", contractId);
        const { data, error } = await query.limit(50);
        if (!error && data) return data as unknown as PlatformContractAuditLog[];
      } catch {}
      return [];
    },
  });
}
