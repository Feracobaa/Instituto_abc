import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import type {
  GuardianAccount,
  GuardianGradeRecord,
  GuardianSchedule,
  ProvisionGuardianAccountResult,
} from "@/hooks/school/types";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";

async function getEdgeFunctionErrorMessage(response: Response) {
  try {
    const payload = await response.clone().json() as { error?: string; message?: string };
    if (payload.error) {
      return payload.error;
    }
    if (payload.message) {
      return payload.message;
    }
  } catch {
    // Fall back to the raw text body below.
  }

  try {
    const text = (await response.clone().text()).trim();
    if (text) {
      return text;
    }
  } catch {
    // Ignore body read failures and fall back to the generic error.
  }

  return null;
}

export function useGuardianAccounts() {
  return useQuery({
    queryKey: schoolQueryKeys.guardianAccounts.all,
    queryFn: async (): Promise<GuardianAccount[]> => {
      const { data, error } = await supabase
        .from("student_guardian_accounts")
        .select(`
          *,
          students(
            *,
            grades(*)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []) as GuardianAccount[];
    },
  });
}

export function useGuardianAccount(enabled = true) {
  return useQuery({
    queryKey: schoolQueryKeys.guardianAccounts.self,
    enabled,
    queryFn: async (): Promise<GuardianAccount | null> => {
      const { data, error } = await supabase
        .from("student_guardian_accounts")
        .select(`
          *,
          students(
            *,
            grades(*)
          )
        `)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return (data ?? null) as GuardianAccount | null;
    },
  });
}

export function useGuardianGradeRecords(studentId?: string, periodId?: string) {
  return useQuery({
    queryKey: schoolQueryKeys.guardianGradeRecords.list(studentId, periodId),
    enabled: Boolean(studentId),
    queryFn: async (): Promise<GuardianGradeRecord[]> => {
      let query = supabase
        .from("grade_records")
        .select(`
          *,
          subjects(*),
          academic_periods(*)
        `)
        .eq("student_id", studentId as string)
        .order("created_at", { ascending: false });

      if (periodId) {
        query = query.eq("period_id", periodId);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      return (data ?? []) as GuardianGradeRecord[];
    },
  });
}

export function useGuardianSchedules(gradeId?: string) {
  return useQuery({
    queryKey: schoolQueryKeys.guardianSchedules.list(gradeId),
    enabled: Boolean(gradeId),
    queryFn: async (): Promise<GuardianSchedule[]> => {
      const { data, error } = await supabase
        .from("schedules")
        .select(`
          *,
          subjects(*),
          grades(*)
        `)
        .eq("grade_id", gradeId as string)
        .order("day_of_week")
        .order("start_time");

      if (error) {
        throw error;
      }

      return (data ?? []) as GuardianSchedule[];
    },
  });
}

export function useProvisionGuardianAccounts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (studentIds?: string[]) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Tu sesion expiro. Ingresa nuevamente para crear accesos del portal estudiantil.");
      }

      supabase.functions.setAuth(session.access_token);

      const { data, error } = await supabase.functions.invoke("provision-guardian-accounts", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          studentIds,
        },
      });

      if (error) {
        const response = (error as { context?: Response }).context;
        if (response instanceof Response) {
          const message = await getEdgeFunctionErrorMessage(response);
          if (message) {
            throw new Error(message);
          }
        }

        throw error;
      }

      return (data?.accounts ?? []) as ProvisionGuardianAccountResult[];
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.guardianAccounts.all });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.students.all });

      const createdCount = results.filter((item) => item.status === "created").length;
      const existingCount = results.filter((item) => item.status === "already_exists").length;

      toast({
        title: "Provision de accesos completada",
        description:
          createdCount > 0
            ? `Se crearon ${createdCount} acceso(s) nuevos y ${existingCount} ya existian.`
            : existingCount > 0
              ? `Todos los accesos seleccionados ya existian.`
              : "No fue posible crear accesos con los datos seleccionados.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al crear accesos del portal estudiantil",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useUpdateGuardianProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      address: string;
      birth_date: string | null;
      guardian_name: string;
      guardian_phone: string;
      markOnboardingComplete?: boolean;
    }) => {
      const { data: updatedAccount, error } = await supabase.rpc("update_guardian_profile", {
        p_address: data.address,
        p_birth_date: data.birth_date,
        p_guardian_name: data.guardian_name,
        p_guardian_phone: data.guardian_phone,
        p_mark_onboarding_complete: data.markOnboardingComplete ?? false,
      });

      if (error) {
        throw error;
      }

      return updatedAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.guardianAccounts.self });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.students.all });
      toast({
        title: "Perfil actualizado",
        description: "Los datos del acudiente y del estudiante fueron guardados correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "No fue posible guardar el perfil",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
