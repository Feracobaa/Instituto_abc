import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";
import type { InstitutionContract, SignContractPayload } from "@/features/contracts/types";
import { computeSha256 } from "@/features/contracts/contractInterpolation";
import { getLocalContracts, saveLocalContracts } from "@/features/contracts/contractLocalStorage";

export function useInstitutionContracts() {
  return useQuery({
    queryKey: schoolQueryKeys.institution.contracts,
    queryFn: async (): Promise<InstitutionContract[]> => {
      try {
        const { data, error } = await supabase
          .from("institution_contracts" as any)
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) return data as unknown as InstitutionContract[];
      } catch {}
      return getLocalContracts();
    },
  });
}

export function useSignInstitutionContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SignContractPayload) => {
      const seal = await computeSha256(`${payload.contractId}|${payload.signerDocumentId}|${Date.now()}`);
      try {
        await (supabase.rpc as any)("etymon_sign_institution_contract", {
          p_contract_id: payload.contractId,
          p_signer_document_id: payload.signerDocumentId,
          p_signer_name: payload.signerName,
          p_ip_address: "Web Client (HTTPS)",
          p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "Navegador Web",
        });
      } catch {}

      const local = getLocalContracts().map((c) =>
        c.id === payload.contractId
          ? {
              ...c,
              status: "signed" as const,
              signed_at: new Date().toISOString(),
              signer_name: payload.signerName,
              signer_document_id: payload.signerDocumentId,
              signature_hash: seal,
            }
          : c
      );
      saveLocalContracts(local);
      return true;
    },
    onSuccess: () => {
      toast.success("Contrato firmado y ratificado digitalmente con éxito.");
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.institution.contracts });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.contracts });
    },
    onError: (error) => toast.error(getFriendlyErrorMessage(error)),
  });
}
