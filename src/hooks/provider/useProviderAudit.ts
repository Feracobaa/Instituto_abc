import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import type {
  IdentityDriftRow,
  ProviderAuditLog,
  ProviderSupportContext,
} from "@/hooks/school/types";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";
import { invalidateProviderQueries } from "./providerQueryUtils";

export function useProviderSupportContext() {
  return useQuery({
    queryKey: schoolQueryKeys.provider.supportContext,
    queryFn: async (): Promise<ProviderSupportContext> => {
      const { data, error } = await supabase.rpc("provider_get_support_context");
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

export function useProviderAuditLogs(institutionId?: string | null) {
  return useQuery({
    queryKey: schoolQueryKeys.provider.auditLogs(institutionId ?? undefined),
    queryFn: async (): Promise<ProviderAuditLog[]> => {
      let query = supabase
        .from("provider_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (institutionId) {
        query = query.eq("institution_id", institutionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ProviderAuditLog[];
    },
  });
}

export function useProviderIdentityDrift() {
  return useQuery({
    queryKey: schoolQueryKeys.provider.drift,
    queryFn: async (): Promise<IdentityDriftRow[]> => {
      const { data, error } = await supabase.rpc("provider_detect_identity_drift");
      if (error) throw error;
      return (data ?? []) as IdentityDriftRow[];
    },
  });
}

export function useProviderSetSupportContext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { institutionId: string; reason: string }) => {
      const { data, error } = await supabase.rpc("provider_set_institution_context", {
        p_institution_id: payload.institutionId,
        p_reason: payload.reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateProviderQueries(queryClient);
      toast({ title: "Soporte activado", description: "Contexto de institucion actualizado." });
    },
    onError: (error) => {
      toast({
        title: "Error al activar soporte",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useProviderClearSupportContext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("provider_clear_institution_context");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateProviderQueries(queryClient);
      toast({ title: "Soporte cerrado", description: "Ya no hay contexto de institucion activo." });
    },
    onError: (error) => {
      toast({
        title: "Error al cerrar soporte",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useProviderRepairIdentityDrift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc("provider_repair_identity_drift", {
        p_user_id: userId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateProviderQueries(queryClient);
      toast({ title: "Drift corregido" });
    },
    onError: (error) => {
      toast({
        title: "Error al reparar drift",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
