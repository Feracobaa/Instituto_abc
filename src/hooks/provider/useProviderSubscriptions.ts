import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import type {
  InstitutionSubscription,
  ProviderCustomerAccount,
  ProviderInstitutionModuleRow,
  ProviderModule,
  SubscriptionPlan,
  SubscriptionPlanModule,
} from "@/hooks/school/types";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";
import { invalidateProviderQueries } from "./providerQueryUtils";

export interface ProviderSubscriptionPayload {
  current_period_end?: string | null;
  current_period_start?: string | null;
  institution_id: string;
  notes?: string | null;
  plan_id: string;
  status: string;
}

export interface ProviderCustomerAccountPayload {
  account_owner_user_id?: string | null;
  billing_status: "pending" | "paid" | "overdue" | "waived";
  commercial_status: "lead" | "active" | "paused" | "churned";
  contract_start_date?: string | null;
  institution_id: string;
  notes?: string | null;
}

export interface ProviderPlanModuleAccessPayload {
  isEnabled: boolean;
  moduleCode: string;
  planId: string;
  reason?: string;
}

export interface ProviderInstitutionModuleOverridePayload {
  institutionId: string;
  isEnabled: boolean;
  moduleCode: string;
  reason?: string;
}

export function useProviderSubscriptionPlans() {
  return useQuery({
    queryKey: schoolQueryKeys.provider.plans,
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("monthly_price_cents", { ascending: true });

      if (error) throw error;
      return (data ?? []) as SubscriptionPlan[];
    },
  });
}

export function useProviderUpsertPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id?: string; name: string; monthly_price_cents: number; is_active: boolean }) => {
      if (payload.id) {
        const { data, error } = await supabase
          .from("subscription_plans")
          .update({
            name: payload.name,
            monthly_price_cents: payload.monthly_price_cents,
            is_active: payload.is_active,
          })
          .eq("id", payload.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("subscription_plans")
          .insert({
            name: payload.name,
            monthly_price_cents: payload.monthly_price_cents,
            is_active: payload.is_active,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.plans });
      toast({ title: "Plan guardado", description: "El plan de suscripción ha sido actualizado." });
    },
    onError: (error) => {
      toast({
        title: "Error al guardar el plan",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useProviderModuleCatalog() {
  return useQuery({
    queryKey: schoolQueryKeys.provider.moduleCatalog,
    queryFn: async (): Promise<ProviderModule[]> => {
      const { data, error } = await supabase
        .from("provider_modules")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as ProviderModule[];
    },
  });
}

export function useProviderPlanModules(planId?: string | null) {
  return useQuery({
    queryKey: schoolQueryKeys.provider.planModules(planId ?? undefined),
    enabled: Boolean(planId),
    queryFn: async (): Promise<SubscriptionPlanModule[]> => {
      const { data, error } = await supabase
        .from("subscription_plan_modules")
        .select("*")
        .eq("plan_id", planId as string);

      if (error) throw error;
      return (data ?? []) as SubscriptionPlanModule[];
    },
  });
}

export function useProviderInstitutionModules(institutionId?: string | null) {
  return useQuery({
    queryKey: schoolQueryKeys.provider.institutionModules(institutionId ?? undefined),
    enabled: Boolean(institutionId),
    queryFn: async (): Promise<ProviderInstitutionModuleRow[]> => {
      const { data, error } = await supabase.rpc("provider_get_institution_modules", {
        p_institution_id: institutionId as string,
      });

      if (error) throw error;
      return (data ?? []) as ProviderInstitutionModuleRow[];
    },
  });
}

export function useProviderUpsertInstitutionSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProviderSubscriptionPayload) => {
      const { data: existingSubscription, error: selectError } = await supabase
        .from("institution_subscriptions")
        .select("id")
        .eq("institution_id", payload.institution_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selectError) throw selectError;

      if (existingSubscription?.id) {
        const { data, error } = await supabase
          .from("institution_subscriptions")
          .update({
            current_period_end: payload.current_period_end ?? null,
            current_period_start: payload.current_period_start ?? null,
            notes: payload.notes ?? null,
            plan_id: payload.plan_id,
            status: payload.status,
          })
          .eq("id", existingSubscription.id)
          .select("*")
          .single();

        if (error) throw error;
        return data as InstitutionSubscription;
      }

      const { data, error } = await supabase
        .from("institution_subscriptions")
        .insert({
          current_period_end: payload.current_period_end ?? null,
          current_period_start: payload.current_period_start ?? null,
          institution_id: payload.institution_id,
          notes: payload.notes ?? null,
          plan_id: payload.plan_id,
          status: payload.status,
        })
        .select("*")
        .single();

      if (error) throw error;
      return data as InstitutionSubscription;
    },
    onSuccess: () => {
      invalidateProviderQueries(queryClient);
      toast({ title: "Suscripcion actualizada" });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar suscripcion",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useProviderUpsertCustomerAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProviderCustomerAccountPayload) => {
      const { data, error } = await supabase
        .from("provider_customer_accounts")
        .upsert(
          {
            account_owner_user_id: payload.account_owner_user_id ?? null,
            billing_status: payload.billing_status,
            commercial_status: payload.commercial_status,
            contract_start_date: payload.contract_start_date ?? null,
            institution_id: payload.institution_id,
            notes: payload.notes ?? null,
          },
          { onConflict: "institution_id" },
        )
        .select("*")
        .single();

      if (error) throw error;
      return data as ProviderCustomerAccount;
    },
    onSuccess: () => {
      invalidateProviderQueries(queryClient);
      toast({ title: "Ficha comercial actualizada" });
    },
    onError: (error) => {
      toast({
        title: "Error al guardar ficha comercial",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useProviderSetPlanModuleAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProviderPlanModuleAccessPayload) => {
      const { data, error } = await supabase.rpc("provider_set_plan_module_access", {
        p_is_enabled: payload.isEnabled,
        p_module_code: payload.moduleCode,
        p_plan_id: payload.planId,
        p_reason: payload.reason ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateProviderQueries(queryClient);
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar modulo del plan",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useProviderSetInstitutionModuleOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProviderInstitutionModuleOverridePayload) => {
      const { data, error } = await supabase.rpc("provider_set_institution_module_override", {
        p_institution_id: payload.institutionId,
        p_is_enabled: payload.isEnabled,
        p_module_code: payload.moduleCode,
        p_reason: payload.reason ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateProviderQueries(queryClient);
    },
    onError: (error) => {
      toast({
        title: "Error al guardar override",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useProviderClearInstitutionModuleOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Pick<ProviderInstitutionModuleOverridePayload, "institutionId" | "moduleCode" | "reason">) => {
      const { data, error } = await supabase.rpc("provider_clear_institution_module_override", {
        p_institution_id: payload.institutionId,
        p_module_code: payload.moduleCode,
        p_reason: payload.reason ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateProviderQueries(queryClient);
    },
    onError: (error) => {
      toast({
        title: "Error al limpiar override",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
