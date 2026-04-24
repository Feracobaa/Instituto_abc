import { useQuery } from "@tanstack/react-query";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import type { CurrentInstitutionModuleAccessRow, InstitutionSettings } from "@/hooks/school/types";
import { supabase } from "@/integrations/supabase/client";

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

export function useInstitutionModuleAccess(options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: schoolQueryKeys.institution.modules,
    queryFn: async (): Promise<Record<string, boolean>> => {
      const { data, error } = await supabase.rpc("get_current_institution_module_access");

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as CurrentInstitutionModuleAccessRow[];
      return rows.reduce<Record<string, boolean>>((accumulator, row) => {
        accumulator[row.module_code] = row.is_enabled;
        return accumulator;
      }, {});
    },
  });
}
