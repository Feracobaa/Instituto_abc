import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import type {
  Institution,
  InstitutionMembership,
  InstitutionSettings,
  InstitutionSubscription,
  ProviderCustomerAccount,
  ProviderOnboardingChecklist,
  SubscriptionPlan,
} from "@/hooks/school/types";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";
import { invalidateProviderQueries } from "./providerQueryUtils";

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
  accentColor?: string;
  billingStatus?: string;
  coverImageUrl?: string;
  contractStartDate?: string;
  displayName?: string;
  fontFamily?: "modern-sans" | "academic-sans" | "friendly-rounded" | "classic-serif";
  name: string;
  notes?: string;
  periodEnd?: string;
  periodStart?: string;
  planId?: string;
  primaryColor?: string;
  secondaryColor?: string;
  slug: string;
  subscriptionStatus?: string;
  visualStyle?: "clean" | "bold" | "minimal";
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

export function useProviderCreateInstitution() {
  const queryClient = useQueryClient();
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

      const institutionId = data as string;
      const hasExtendedBranding =
        Boolean(payload.primaryColor)
        || Boolean(payload.secondaryColor)
        || Boolean(payload.accentColor)
        || Boolean(payload.coverImageUrl)
        || Boolean(payload.fontFamily)
        || Boolean(payload.visualStyle);

      if (institutionId && hasExtendedBranding) {
        const { error: brandingError } = await supabase
          .from("institution_settings")
          .upsert(
            {
              accent_color: payload.accentColor ?? null,
              cover_image_url: payload.coverImageUrl ?? null,
              display_name: payload.displayName ?? payload.name,
              font_family: payload.fontFamily ?? null,
              institution_id: institutionId,
              primary_color: payload.primaryColor ?? null,
              secondary_color: payload.secondaryColor ?? null,
              visual_style: payload.visualStyle ?? null,
            },
            { onConflict: "institution_id" },
          );

        if (brandingError) {
          throw brandingError;
        }
      }

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
  return useMutation({
    mutationFn: async (
      payload: Pick<InstitutionSettings, "institution_id"> & Partial<
        Pick<
          InstitutionSettings,
          | "accent_color"
          | "address"
          | "cover_image_url"
          | "display_name"
          | "font_family"
          | "legal_name"
          | "logo_url"
          | "nit"
          | "phone"
          | "primary_color"
          | "rector_name"
          | "secondary_color"
          | "visual_style"
          | "block_reports_on_debt"
        >
      >,
    ) => {
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
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.institution.settings });
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

/** Soft-deletes (archives) or reactivates an institution with mandatory reason. */
export function useEtymonSetInstitutionActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      institutionId,
      isActive,
      reason,
    }: {
      institutionId: string;
      isActive: boolean;
      reason: string;
    }) => {
      const { error } = await supabase.rpc("provider_set_institution_active", {
        p_institution_id: institutionId,
        p_is_active: isActive,
        p_reason: reason,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      invalidateProviderQueries(queryClient);
      toast({
        title: variables.isActive ? "Institucion reactivada" : "Institucion archivada",
        description: variables.isActive
          ? "La institucion vuelve a estar operativa."
          : "La institucion quedo archivada sin eliminar su historial.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar estado de institucion",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
