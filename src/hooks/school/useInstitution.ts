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
