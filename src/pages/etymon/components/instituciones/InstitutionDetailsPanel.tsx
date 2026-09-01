import React from "react";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProviderEmptyState } from "@/components/provider/ProviderEmptyState";
import type { ProviderInstitutionSummary } from "@/hooks/provider";
import type { SubscriptionPlan } from "@/hooks/school/types";
import { InstitutionGeneralTab } from "./InstitutionGeneralTab";
import { InstitutionBrandingTab } from "./InstitutionBrandingTab";
import { InstitutionSubscriptionTab } from "./InstitutionSubscriptionTab";
import { InstitutionUsersTab } from "./InstitutionUsersTab";
import {
  BrandingFormState,
  billingStatuses,
  brandPresets,
  commercialStatuses,
  institutionRoles,
  subscriptionStatuses,
} from "./types";

interface InstitutionDetailsPanelProps {
  selectedSummary: ProviderInstitutionSummary | null;
  activeTab: "general" | "branding" | "subscription" | "users";
  setActiveTab: (tab: "general" | "branding" | "subscription" | "users") => void;
  onToggleActiveStatus: (id: string, currentStatus: boolean, slug: string) => void;
  isTogglingStatus: boolean;
  brandingForm: BrandingFormState;
  setBrandingForm: React.Dispatch<React.SetStateAction<BrandingFormState>>;
  onSaveBrandingGeneral: () => void;
  onSaveBrandingIdentity: () => void;
  isSavingSettings: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "cover") => void;
  isUploadingLogo: boolean;
  isUploadingCover: boolean;
  applyPreset: (preset: (typeof brandPresets)[number]) => void;
  subscriptionForm: {
    current_period_end: string;
    current_period_start: string;
    notes: string;
    plan_id: string;
    status: (typeof subscriptionStatuses)[number];
  };
  setSubscriptionForm: React.Dispatch<
    React.SetStateAction<{
      current_period_end: string;
      current_period_start: string;
      notes: string;
      plan_id: string;
      status: (typeof subscriptionStatuses)[number];
    }>
  >;
  commercialForm: {
    billing_status: (typeof billingStatuses)[number];
    commercial_status: (typeof commercialStatuses)[number];
    notes: string;
  };
  setCommercialForm: React.Dispatch<
    React.SetStateAction<{
      billing_status: (typeof billingStatuses)[number];
      commercial_status: (typeof commercialStatuses)[number];
      notes: string;
    }>
  >;
  plans?: SubscriptionPlan[];
  onSaveSubscription: () => void;
  isSavingSubscription: boolean;
  onSaveCommercial: () => void;
  isSavingCommercial: boolean;
  accessForm: {
    email: string;
    fullName: string;
    role: (typeof institutionRoles)[number];
    temporaryPassword: string;
  };
  setAccessForm: React.Dispatch<
    React.SetStateAction<{
      email: string;
      fullName: string;
      role: (typeof institutionRoles)[number];
      temporaryPassword: string;
    }>
  >;
  onProcessUserAccess: () => void;
  isProcessingUserAccess: boolean;
}

export function InstitutionDetailsPanel({
  selectedSummary,
  activeTab,
  setActiveTab,
  onToggleActiveStatus,
  isTogglingStatus,
  brandingForm,
  setBrandingForm,
  onSaveBrandingGeneral,
  onSaveBrandingIdentity,
  isSavingSettings,
  onFileUpload,
  isUploadingLogo,
  isUploadingCover,
  applyPreset,
  subscriptionForm,
  setSubscriptionForm,
  commercialForm,
  setCommercialForm,
  plans,
  onSaveSubscription,
  isSavingSubscription,
  onSaveCommercial,
  isSavingCommercial,
  accessForm,
  setAccessForm,
  onProcessUserAccess,
  isProcessingUserAccess,
}: InstitutionDetailsPanelProps) {
  if (!selectedSummary) {
    return (
      <article className="etymon-surface p-5">
        <ProviderEmptyState
          title="Selecciona una institución"
          description="Escoge un colegio para administrar imagen de marca, comercial, suscripción y acceso de usuarios."
        />
      </article>
    );
  }

  return (
    <article className="etymon-surface p-5">
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-[var(--et-border)] pb-4">
          <div>
            <h3 className="text-xl font-bold text-[var(--et-text)]">
              {selectedSummary.institution.name}
            </h3>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--et-text-muted)]">
              {selectedSummary.institution.slug}
            </p>
          </div>
          <Button
            className="etymon-btn-outline gap-2 text-xs py-1.5 h-auto font-semibold"
            onClick={() =>
              onToggleActiveStatus(
                selectedSummary.institution.id,
                selectedSummary.institution.is_active,
                selectedSummary.institution.slug,
              )
            }
            disabled={isTogglingStatus}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            {selectedSummary.institution.is_active ? "Desactivar" : "Activar"}
          </Button>
        </div>

        {/* Tabs Selector */}
        <div className="flex border-b border-[var(--et-border)] gap-2 overflow-x-auto pb-px">
          {(
            [
              { id: "general", label: "Operativo y General" },
              { id: "branding", label: "Identidad y Marca" },
              { id: "subscription", label: "Comercial y Suscripción" },
              { id: "users", label: "Acceso de Usuarios" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
                activeTab === tab.id
                  ? "border-[var(--et-accent)] text-[var(--et-text)]"
                  : "border-transparent text-[var(--et-text-muted)] hover:text-[var(--et-text-subtle)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="pt-2">
          {activeTab === "general" && (
            <InstitutionGeneralTab
              brandingForm={brandingForm}
              setBrandingForm={setBrandingForm}
              onSave={onSaveBrandingGeneral}
              isSaving={isSavingSettings}
            />
          )}

          {activeTab === "branding" && (
            <InstitutionBrandingTab
              brandingForm={brandingForm}
              setBrandingForm={setBrandingForm}
              onFileUpload={onFileUpload}
              isUploadingLogo={isUploadingLogo}
              isUploadingCover={isUploadingCover}
              applyPreset={applyPreset}
              onSave={onSaveBrandingIdentity}
              isSaving={isSavingSettings}
            />
          )}

          {activeTab === "subscription" && (
            <InstitutionSubscriptionTab
              subscriptionForm={subscriptionForm}
              setSubscriptionForm={setSubscriptionForm}
              commercialForm={commercialForm}
              setCommercialForm={setCommercialForm}
              plans={plans}
              onSaveSubscription={onSaveSubscription}
              isSavingSubscription={isSavingSubscription}
              onSaveCommercial={onSaveCommercial}
              isSavingCommercial={isSavingCommercial}
            />
          )}

          {activeTab === "users" && (
            <InstitutionUsersTab
              accessForm={accessForm}
              setAccessForm={setAccessForm}
              onProcessUserAccess={onProcessUserAccess}
              isProcessing={isProcessingUserAccess}
            />
          )}
        </div>
      </div>
    </article>
  );
}
