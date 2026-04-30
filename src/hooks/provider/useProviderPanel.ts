import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import type {
  IdentityDriftRow,
  Institution,
  InstitutionMembership,
  InstitutionSettings,
  InstitutionSubscription,
  ProviderAuditLog,
  ProviderCustomerAccount,
  ProviderInstitutionModuleRow,
  ProviderModule,
  ProviderOnboardingChecklist,
  ProviderSupportContext,
  SubscriptionPlanModule,
  SubscriptionPlan,
} from "@/hooks/school/types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";

export interface InstitutionSubscriptionWithPlan extends InstitutionSubscription {
  subscription_plans: SubscriptionPlan | null;
}

export interface ProviderInstitutionSummary {
  customerAccount: ProviderCustomerAccount | null;
  institution: Institution;
  membershipsCount: number;
  onboarding: ProviderOnboardingChecklist | null;
  rectorsCount: number;
  settings: InstitutionSettings | null;
  subscription: InstitutionSubscriptionWithPlan | null;
}

export interface ProviderCreateInstitutionPayload {
  billingStatus?: string;
  contractStartDate?: string;
  displayName?: string;
  name: string;
  notes?: string;
  periodEnd?: string;
  periodStart?: string;
  planId?: string;
  slug: string;
  subscriptionStatus?: string;
}

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

export interface ProviderAssignUserRolePayload {
  email: string;
  fullName?: string;
  institutionId: string;
  makeDefault?: boolean;
  role: "rector" | "profesor" | "parent" | "contable";
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

export function useProviderInstitutionSummaries() {
  return useQuery({
    queryKey: schoolQueryKeys.provider.institutions,
    queryFn: async (): Promise<ProviderInstitutionSummary[]> => {
      const [
        institutionsResult,
        settingsResult,
        subscriptionsResult,
        customerAccountsResult,
        onboardingResult,
        membershipsResult,
      ] = await Promise.all([
        supabase
          .from("institutions")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("institution_settings").select("*"),
        supabase
          .from("institution_subscriptions")
          .select("*, subscription_plans(*)")
          .order("created_at", { ascending: false }),
        supabase.from("provider_customer_accounts").select("*"),
        supabase.from("provider_onboarding_checklists").select("*"),
        supabase.from("institution_memberships").select("institution_id, role"),
      ]);

      if (institutionsResult.error) throw institutionsResult.error;
      if (settingsResult.error) throw settingsResult.error;
      if (subscriptionsResult.error) throw subscriptionsResult.error;
      if (customerAccountsResult.error) throw customerAccountsResult.error;
      if (onboardingResult.error) throw onboardingResult.error;
      if (membershipsResult.error) throw membershipsResult.error;

      const institutions = (institutionsResult.data ?? []) as Institution[];
      const settings = (settingsResult.data ?? []) as InstitutionSettings[];
      const subscriptions = (subscriptionsResult.data ?? []) as InstitutionSubscriptionWithPlan[];
      const customerAccounts = (customerAccountsResult.data ?? []) as ProviderCustomerAccount[];
      const onboardingChecklists = (onboardingResult.data ?? []) as ProviderOnboardingChecklist[];
      const memberships = (membershipsResult.data ?? []) as Pick<InstitutionMembership, "institution_id" | "role">[];

      const settingsByInstitution = new Map(settings.map((row) => [row.institution_id, row]));
      const customerAccountByInstitution = new Map(customerAccounts.map((row) => [row.institution_id, row]));
      const onboardingByInstitution = new Map(onboardingChecklists.map((row) => [row.institution_id, row]));

      const subscriptionByInstitution = new Map<string, InstitutionSubscriptionWithPlan>();
      for (const row of subscriptions) {
        if (!subscriptionByInstitution.has(row.institution_id)) {
          subscriptionByInstitution.set(row.institution_id, row);
        }
      }

      const membershipsByInstitution = new Map<string, { membershipsCount: number; rectorsCount: number }>();
      for (const membership of memberships) {
        const current = membershipsByInstitution.get(membership.institution_id) ?? {
          membershipsCount: 0,
          rectorsCount: 0,
        };
        current.membershipsCount += 1;
        if (membership.role === "rector") {
          current.rectorsCount += 1;
        }
        membershipsByInstitution.set(membership.institution_id, current);
      }

      return institutions.map((institution) => {
        const membershipInfo = membershipsByInstitution.get(institution.id) ?? {
          membershipsCount: 0,
          rectorsCount: 0,
        };

        return {
          customerAccount: customerAccountByInstitution.get(institution.id) ?? null,
          institution,
          membershipsCount: membershipInfo.membershipsCount,
          onboarding: onboardingByInstitution.get(institution.id) ?? null,
          rectorsCount: membershipInfo.rectorsCount,
          settings: settingsByInstitution.get(institution.id) ?? null,
          subscription: subscriptionByInstitution.get(institution.id) ?? null,
        };
      });
    },
  });
}

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
  const { toast } = useToast();

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

function invalidateProviderQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.moduleCatalog });
  queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.institutions });
  queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.planModulesRoot });
  queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.institutionModulesRoot });
  queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.supportContext });
  queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.auditLogs() });
  queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.drift });
  queryClient.invalidateQueries({ queryKey: schoolQueryKeys.institution.settings });
}

export function useProviderCreateInstitution() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: ProviderCreateInstitutionPayload) => {
      const { data, error } = await supabase.rpc("provider_create_institution", {
        p_billing_status: payload.billingStatus ?? "pending",
        p_contract_start_date: payload.contractStartDate ?? null,
        p_display_name: payload.displayName ?? null,
        p_name: payload.name,
        p_notes: payload.notes ?? null,
        p_period_end: payload.periodEnd ?? null,
        p_period_start: payload.periodStart ?? null,
        p_plan_id: payload.planId ?? null,
        p_slug: payload.slug,
        p_subscription_status: payload.subscriptionStatus ?? "trialing",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateProviderQueries(queryClient);
      toast({ title: "Institucion creada", description: "La institucion quedo registrada en ETYMON." });
    },
    onError: (error) => {
      toast({
        title: "Error al crear institucion",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useProviderUpdateInstitution() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Pick<Institution, "id"> & Partial<Pick<Institution, "name" | "slug" | "is_active">>) => {
      const { id, ...updatePayload } = payload;
      const { data, error } = await supabase
        .from("institutions")
        .update(updatePayload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as Institution;
    },
    onSuccess: () => {
      invalidateProviderQueries(queryClient);
      toast({ title: "Institucion actualizada" });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar institucion",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useProviderUpsertInstitutionSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Pick<InstitutionSettings, "institution_id"> & Partial<Pick<InstitutionSettings, "display_name" | "logo_url" | "primary_color">>) => {
      const { data, error } = await supabase
        .from("institution_settings")
        .upsert(payload, { onConflict: "institution_id" })
        .select("*")
        .single();
      if (error) throw error;
      return data as InstitutionSettings;
    },
    onSuccess: () => {
      invalidateProviderQueries(queryClient);
      toast({ title: "Branding actualizado" });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar branding",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useProviderUpsertInstitutionSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
  const { toast } = useToast();

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
  const { toast } = useToast();

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
  const { toast } = useToast();

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
  const { toast } = useToast();

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

export function useProviderSetSupportContext() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
  const { toast } = useToast();

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

export function useProviderLinkRectorByEmail() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: { email: string; institutionId: string; makeDefault?: boolean }) => {
      const { data, error } = await supabase.rpc("provider_link_rector_by_email", {
        p_email: payload.email,
        p_institution_id: payload.institutionId,
        p_make_default: payload.makeDefault ?? true,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateProviderQueries(queryClient);
      toast({ title: "Rector vinculado" });
    },
    onError: (error) => {
      toast({
        title: "Error al vincular rector",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useProviderAssignUserRoleByEmail() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: ProviderAssignUserRolePayload) => {
      const { data, error } = await supabase.rpc("provider_assign_user_role_by_email", {
        p_email: payload.email,
        p_full_name: payload.fullName ?? null,
        p_institution_id: payload.institutionId,
        p_make_default: payload.makeDefault ?? true,
        p_role: payload.role,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateProviderQueries(queryClient);
      toast({ title: "Usuario asignado", description: "Perfil y rol alineados con la institucion." });
    },
    onError: (error) => {
      toast({
        title: "Error al asignar usuario",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useProviderRepairIdentityDrift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

// ============================================================================
// ETYMON PHASE 1 — User Creation, Deletion, Institution Deletion
// ============================================================================

export interface EtymonCreateUserPayload {
  email: string;
  full_name: string;
  institution_id: string;
  role: "rector" | "profesor" | "contable";
  temporary_password?: string;
}

export interface EtymonCreateUserResult {
  user_id: string;
  email: string;
  full_name: string;
  temporary_password: string;
  role: string;
  institution_id: string;
}

/** Creates a new platform user with a temporary password via Etymon Edge Function. */
export function useEtymonCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: EtymonCreateUserPayload): Promise<EtymonCreateUserResult> => {
      const { data, error } = await supabase.functions.invoke("etymon-create-user", {
        body: payload,
      });

      if (data?.error) {
        throw new Error(data.error as string);
      }

      if (error) {
        // En Supabase JS v2, un error 4xx/5xx de Edge Function arroja un error genérico
        // "Edge Function returned a non-2xx status code", pero el cuerpo real puede estar en `error.context`.
        let serverMessage = error.message;
        
        try {
          // Intentar extraer el mensaje real si es un FunctionsHttpError con context
          if (error && typeof error === 'object' && 'context' in error) {
            const contextError = error as any;
            if (contextError.context && typeof contextError.context.json === 'function') {
              const errBody = await contextError.context.json();
              if (errBody && errBody.error) {
                serverMessage = errBody.error;
              }
            }
          }
        } catch (e) {
          // Ignorar si falla al parsear
        }
        
        throw new Error(serverMessage ?? "Error desconocido al invocar la funcion.");
      }

      return data as EtymonCreateUserResult;
    },
    onSuccess: (result) => {
      invalidateProviderQueries(queryClient);
      toast({
        title: "Usuario creado",
        description: `${result.full_name} (${result.email}) fue creado exitosamente.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error al crear usuario",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export interface EtymonInstitutionUser {
  email: string;
  full_name: string;
  institution_id: string;
  is_default: boolean;
  membership_id: string;
  role: string;
  user_id: string;
}

/** Lists all users (memberships + profiles) for a given institution. */
export function useEtymonInstitutionUsers(institutionId?: string | null) {
  return useQuery({
    queryKey: ["etymon", "institution-users", institutionId ?? "none"],
    enabled: Boolean(institutionId),
    queryFn: async (): Promise<EtymonInstitutionUser[]> => {
      const { data, error } = await supabase
        .from("institution_memberships")
        .select("id, user_id, role, institution_id, is_default")
        .eq("institution_id", institutionId as string)
        .order("role", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) return [];

      const userIds = data.map((row) => row.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      return data.map((membership) => {
        const profile = profileMap.get(membership.user_id);
        return {
          email: profile?.email ?? "—",
          full_name: profile?.full_name ?? "Sin nombre",
          institution_id: membership.institution_id,
          is_default: membership.is_default,
          membership_id: membership.id,
          role: membership.role,
          user_id: membership.user_id,
        };
      });
    },
  });
}

/** Removes a user's membership from an institution (does NOT delete the auth account). */
export function useEtymonRemoveUserMembership() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      membershipId,
      institutionId,
    }: {
      membershipId: string;
      institutionId: string;
    }) => {
      const { error } = await supabase
        .from("institution_memberships")
        .delete()
        .eq("id", membershipId)
        .eq("institution_id", institutionId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["etymon", "institution-users", variables.institutionId] });
      invalidateProviderQueries(queryClient);
      toast({ title: "Acceso revocado", description: "El usuario fue desvinculado de esta institución." });
    },
    onError: (error) => {
      toast({
        title: "Error al revocar acceso",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

/** Hard-deletes an institution and all its data. Use with extreme caution. */
export function useEtymonDeleteInstitution() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ institutionId }: { institutionId: string }) => {
      // Cascade is handled by the DB foreign keys.
      // We delete the root record; Supabase RLS for this table only allows provider_owner.
      const { error } = await supabase
        .from("institutions")
        .delete()
        .eq("id", institutionId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateProviderQueries(queryClient);
      toast({
        title: "Institución eliminada",
        description: "La institución y todos sus datos fueron eliminados permanentemente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar institución",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

// ============================================================
// Phase 2: Dynamic Role Permissions Hooks
// ============================================================

export interface ProviderRolePermission {
  role: string;
  module_id: string;
  module_code: string;
  module_name: string;
  access_level: "full" | "readonly" | "none";
}

export function useProviderRolePermissions() {
  return useQuery({
    queryKey: schoolQueryKeys.provider.rolePermissions,
    queryFn: async (): Promise<ProviderRolePermission[]> => {
      const { data, error } = await (supabase as any).rpc("provider_get_role_permissions_matrix");
      if (error) throw error;
      return (data ?? []) as unknown as ProviderRolePermission[];
    },
  });
}

export function useProviderSetRolePermission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      role,
      moduleCode,
      accessLevel,
    }: {
      role: string;
      moduleCode: string;
      accessLevel: "full" | "readonly" | "none";
    }) => {
      const { error } = await (supabase as any).rpc("provider_set_role_permission", {
        p_role: role,
        p_module_code: moduleCode,
        p_access_level: accessLevel,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.provider.rolePermissions });
      invalidateProviderQueries(queryClient);
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar permiso",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

