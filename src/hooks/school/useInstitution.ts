import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import type { CurrentInstitutionModuleAccessRow, InstitutionSettings } from "@/hooks/school/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useUpdateInstitutionSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<Omit<InstitutionSettings, "id" | "created_at" | "updated_at" | "institution_id">>
    ): Promise<InstitutionSettings> => {
      const { data: currentSettings, error: selectError } = await supabase
        .from("institution_settings")
        .select("id")
        .maybeSingle();

      if (selectError) throw selectError;
      if (!currentSettings) throw new Error("No se encontró la configuración de la institución.");

      const { data, error } = await supabase
        .from("institution_settings")
        .update(payload)
        .eq("id", currentSettings.id)
        .select("*")
        .single();

      if (error) throw error;
      return data as InstitutionSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.institution.settings });
      toast({
        title: "Configuración actualizada",
        description: "Los cambios se guardaron correctamente.",
      });
    },
    onError: (error: Error) => {
      console.error(error);
      toast({
        title: "Error al actualizar configuración",
        description: error.message || "Por favor intente nuevamente.",
        variant: "destructive",
      });
    },
  });
}

export function useInstitutionSettings() {
  return useQuery({
    queryKey: schoolQueryKeys.institution.settings,
    queryFn: async (): Promise<InstitutionSettings | null> => {
      const { data, error } = await supabase
        .from("institution_settings")
        .select("*")
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as InstitutionSettings | null;
    },
  });
}

export interface ModuleAccessData {
  is_enabled: boolean;
  access_level: 'full' | 'readonly' | 'none';
}

export function useInstitutionModuleAccess(options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: schoolQueryKeys.institution.modules,
    queryFn: async (): Promise<Record<string, ModuleAccessData>> => {
      const { data, error } = await supabase.rpc("get_current_institution_module_access");

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as CurrentInstitutionModuleAccessRow[];
      return rows.reduce<Record<string, ModuleAccessData>>((accumulator, row) => {
        accumulator[row.module_code] = {
          is_enabled: row.is_enabled,
          access_level: (row.access_level as 'full' | 'readonly' | 'none') || 'none',
        };
        return accumulator;
      }, {});
    },
  });
}

export interface InstitutionStatusData {
  status: 'active' | 'blocked' | 'unknown';
  reason: 'normal' | 'suspended' | 'overdue' | 'subscription_expired' | 'expired' | 'no_institution';
  institution_name: string | null;
  current_period_end: string | null;
  days_remaining: number | null;
}

export function useInstitutionStatus(options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: ['school', 'institution', 'status'],
    queryFn: async (): Promise<InstitutionStatusData> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.rpc("get_current_institution_status" as any);

      if (error) {
        throw error;
      }

      return data as unknown as InstitutionStatusData;
    },
  });
}

