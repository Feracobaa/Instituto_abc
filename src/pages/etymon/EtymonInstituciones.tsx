import { useEffect, useMemo, useState } from "react";
import { ProviderLayout } from "@/components/provider/ProviderLayout";
import {
  useProviderAssignUserRoleByEmail,
  useProviderCreateInstitution,
  useProviderInstitutionSummaries,
  useEtymonSetInstitutionActive,
  useProviderSubscriptionPlans,
  useProviderUpsertCustomerAccount,
  useProviderUpsertInstitutionSettings,
  useProviderUpsertInstitutionSubscription,
  useEtymonCreateUser,
} from "@/hooks/provider";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  BrandingFormState,
  CreateInstitutionForm,
  FontFamilyValue,
  VisualStyleValue,
  billingStatuses,
  brandPresets,
  commercialStatuses,
  defaultCreateForm,
  ensureHexOrEmpty,
  institutionRoles,
  makeBrandingForm,
  subscriptionStatuses,
  CreateInstitutionSection,
  InstitutionListSidebar,
  InstitutionDetailsPanel,
} from "./components/instituciones";

export default function EtymonInstituciones() {
  const { data: summaries, isLoading } = useProviderInstitutionSummaries();
  const { data: plans } = useProviderSubscriptionPlans();

  const createInstitutionMutation = useProviderCreateInstitution();
  const setInstitutionActiveMutation = useEtymonSetInstitutionActive();
  const upsertSettingsMutation = useProviderUpsertInstitutionSettings();
  const upsertSubscriptionMutation = useProviderUpsertInstitutionSubscription();
  const upsertCustomerAccountMutation = useProviderUpsertCustomerAccount();
  const assignUserRoleMutation = useProviderAssignUserRoleByEmail();
  const createUserMutation = useEtymonCreateUser();

  const [createForm, setCreateForm] = useState<CreateInstitutionForm>(defaultCreateForm());
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("");
  const [brandingForm, setBrandingForm] = useState<BrandingFormState>(makeBrandingForm());
  const [commercialForm, setCommercialForm] = useState({
    billing_status: "pending" as (typeof billingStatuses)[number],
    commercial_status: "active" as (typeof commercialStatuses)[number],
    notes: "",
  });
  const [subscriptionForm, setSubscriptionForm] = useState({
    current_period_end: "",
    current_period_start: "",
    notes: "",
    plan_id: "",
    status: "trialing" as (typeof subscriptionStatuses)[number],
  });
  const [accessForm, setAccessForm] = useState({
    email: "",
    fullName: "",
    role: "rector" as (typeof institutionRoles)[number],
    temporaryPassword: "",
  });

  const [activeTab, setActiveTab] = useState<"general" | "branding" | "subscription" | "users">("general");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const selectedSummary = useMemo(
    () => summaries?.find((summary) => summary.institution.id === selectedInstitutionId) ?? null,
    [selectedInstitutionId, summaries],
  );

  useEffect(() => {
    if (!selectedInstitutionId && summaries && summaries.length > 0) {
      setSelectedInstitutionId(summaries[0].institution.id);
    }
  }, [selectedInstitutionId, summaries]);

  useEffect(() => {
    if (!selectedSummary) return;

    setBrandingForm({
      accent_color: selectedSummary.settings?.accent_color ?? "#14B8A6",
      cover_image_url: selectedSummary.settings?.cover_image_url ?? "",
      display_name: selectedSummary.settings?.display_name ?? selectedSummary.institution.name,
      font_family: (selectedSummary.settings?.font_family as FontFamilyValue) ?? "modern-sans",
      logo_url: selectedSummary.settings?.logo_url ?? "",
      primary_color: selectedSummary.settings?.primary_color ?? "#0EA5E9",
      secondary_color: selectedSummary.settings?.secondary_color ?? "#1E293B",
      visual_style: (selectedSummary.settings?.visual_style as VisualStyleValue) ?? "clean",
      address: selectedSummary.settings?.address ?? "",
      legal_name: selectedSummary.settings?.legal_name ?? "",
      nit: selectedSummary.settings?.nit ?? "",
      phone: selectedSummary.settings?.phone ?? "",
      rector_name: selectedSummary.settings?.rector_name ?? "",
      block_reports_on_debt: selectedSummary.settings?.block_reports_on_debt ?? false,
    });

    setCommercialForm({
      billing_status: (selectedSummary.customerAccount?.billing_status as (typeof billingStatuses)[number]) ?? "pending",
      commercial_status: (selectedSummary.customerAccount?.commercial_status as (typeof commercialStatuses)[number]) ?? "active",
      notes: selectedSummary.customerAccount?.notes ?? "",
    });

    setSubscriptionForm({
      current_period_end: selectedSummary.subscription?.current_period_end ?? "",
      current_period_start: selectedSummary.subscription?.current_period_start ?? "",
      notes: selectedSummary.subscription?.notes ?? "",
      plan_id: selectedSummary.subscription?.plan_id ?? plans?.[0]?.id ?? "",
      status: (selectedSummary.subscription?.status as (typeof subscriptionStatuses)[number]) ?? "trialing",
    });
  }, [plans, selectedSummary]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "cover", isCreateForm = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const prefix = selectedSummary ? selectedSummary.institution.id : "new_tenant";

    try {
      if (type === "logo") setIsUploadingLogo(true);
      else setIsUploadingCover(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `${prefix}_${type}_${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("institution_assets")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("institution_assets")
        .getPublicUrl(fileName);

      if (publicUrlData) {
        if (isCreateForm) {
          setCreateForm((curr) => ({ ...curr, [type === "logo" ? "logo_url" : "cover_image_url"]: publicUrlData.publicUrl }));
        } else {
          setBrandingForm((curr) => ({ ...curr, [type === "logo" ? "logo_url" : "cover_image_url"]: publicUrlData.publicUrl }));
          if (selectedSummary) {
            upsertSettingsMutation.mutate({
              institution_id: selectedSummary.institution.id,
              [type === "logo" ? "logo_url" : "cover_image_url"]: publicUrlData.publicUrl,
            });
          }
        }
        toast({ title: "Archivo subido", description: "El archivo se subió y guardó con éxito." });
      }
    } catch {
      toast({ title: "Error al subir", description: "Hubo un error subiendo el archivo.", variant: "destructive" });
    } finally {
      if (type === "logo") setIsUploadingLogo(false);
      else setIsUploadingCover(false);
    }
  };

  const validateBrandingColors = (payload: BrandingFormState) => {
    const primary = ensureHexOrEmpty(payload.primary_color);
    const secondary = ensureHexOrEmpty(payload.secondary_color);
    const accent = ensureHexOrEmpty(payload.accent_color);

    if (primary === null || secondary === null || accent === null) {
      toast({
        title: "Color invalido",
        description: "Usa formato HEX de 6 digitos, por ejemplo #0EA5E9.",
        variant: "destructive",
      });
      return null;
    }

    return { accent_color: accent, primary_color: primary, secondary_color: secondary };
  };

  const handleCreateInstitution = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedColors = validateBrandingColors(createForm);
    if (!normalizedColors) return;

    await createInstitutionMutation.mutateAsync({
      accentColor: normalizedColors.accent_color || undefined,
      billingStatus: createForm.billingStatus,
      coverImageUrl: createForm.cover_image_url || undefined,
      displayName: createForm.display_name || undefined,
      fontFamily: createForm.font_family,
      name: createForm.name,
      notes: createForm.notes || undefined,
      planId: createForm.planId || undefined,
      primaryColor: normalizedColors.primary_color || undefined,
      secondaryColor: normalizedColors.secondary_color || undefined,
      slug: createForm.slug,
      subscriptionStatus: createForm.subscriptionStatus,
      visualStyle: createForm.visual_style,
    });

    setCreateForm(defaultCreateForm());
  };

  const handleToggleInstitutionStatus = async (institutionId: string, currentStatus: boolean, slug: string) => {
    const typedSlug = window.prompt(
      `Accion critica. Escribe el slug "${slug}" para ${currentStatus ? "desactivar" : "activar"} esta institucion.`,
    );

    if (typedSlug !== slug) {
      toast({
        title: "Confirmacion invalida",
        description: "No se aplicaron cambios porque el slug no coincide.",
        variant: "destructive",
      });
      return;
    }

    const reason = window.prompt(
      `Registra el motivo de ${currentStatus ? "archivo" : "reactivacion"} para ${slug}.`,
    );

    if (!reason || !reason.trim()) {
      toast({
        title: "Motivo requerido",
        description: "Debes registrar un motivo para ejecutar esta accion.",
        variant: "destructive",
      });
      return;
    }

    await setInstitutionActiveMutation.mutateAsync({
      institutionId,
      isActive: !currentStatus,
      reason: reason.trim(),
    });
  };

  const handleSaveBranding = async () => {
    if (!selectedSummary) return;
    const normalizedColors = validateBrandingColors(brandingForm);
    if (!normalizedColors) return;

    await upsertSettingsMutation.mutateAsync({
      accent_color: normalizedColors.accent_color || null,
      cover_image_url: brandingForm.cover_image_url || null,
      display_name: brandingForm.display_name,
      font_family: brandingForm.font_family,
      institution_id: selectedSummary.institution.id,
      logo_url: brandingForm.logo_url || null,
      primary_color: normalizedColors.primary_color || null,
      secondary_color: normalizedColors.secondary_color || null,
      visual_style: brandingForm.visual_style,
      address: brandingForm.address || null,
      legal_name: brandingForm.legal_name || null,
      nit: brandingForm.nit || null,
      phone: brandingForm.phone || null,
      rector_name: brandingForm.rector_name || null,
      block_reports_on_debt: brandingForm.block_reports_on_debt,
    });
  };

  const handleSaveCommercial = async () => {
    if (!selectedSummary) return;
    await upsertCustomerAccountMutation.mutateAsync({
      billing_status: commercialForm.billing_status,
      commercial_status: commercialForm.commercial_status,
      institution_id: selectedSummary.institution.id,
      notes: commercialForm.notes || null,
    });
  };

  const handleSaveSubscription = async () => {
    if (!selectedSummary || !subscriptionForm.plan_id) {
      toast({
        title: "Plan requerido",
        description: "Selecciona un plan antes de guardar la suscripcion.",
        variant: "destructive",
      });
      return;
    }

    await upsertSubscriptionMutation.mutateAsync({
      current_period_end: subscriptionForm.current_period_end || null,
      current_period_start: subscriptionForm.current_period_start || null,
      institution_id: selectedSummary.institution.id,
      notes: subscriptionForm.notes || null,
      plan_id: subscriptionForm.plan_id,
      status: subscriptionForm.status,
    });
  };

  const handleProcessUserAccess = async () => {
    if (!selectedSummary) return;
    if (!accessForm.email.trim()) {
      toast({ title: "Email requerido", description: "Ingresa el correo del usuario.", variant: "destructive" });
      return;
    }

    try {
      await createUserMutation.mutateAsync({
        email: accessForm.email.trim().toLowerCase(),
        full_name: accessForm.fullName.trim() || "Usuario " + accessForm.role,
        institution_id: selectedSummary.institution.id,
        role: accessForm.role as "rector" | "profesor" | "contable",
        temporary_password: accessForm.temporaryPassword.trim() || undefined,
      });
      setAccessForm((current) => ({ ...current, email: "", fullName: "", temporaryPassword: "" }));
    } catch (err) {
      const msg = (err as Error).message?.toLowerCase() ?? "";
      if (msg.includes("already exists") || msg.includes("already registered")) {
        await assignUserRoleMutation.mutateAsync({
          email: accessForm.email.trim().toLowerCase(),
          fullName: accessForm.fullName.trim() || undefined,
          institutionId: selectedSummary.institution.id,
          makeDefault: true,
          role: accessForm.role,
        });
        toast({
          title: "Usuario vinculado",
          description: "El usuario ya existia y fue asignado exitosamente a la institucion.",
        });
        setAccessForm((current) => ({ ...current, email: "", fullName: "", temporaryPassword: "" }));
      }
    }
  };

  const applyPreset = (preset: (typeof brandPresets)[number]) => {
    setBrandingForm((current) => ({
      ...current,
      accent_color: preset.accent_color,
      primary_color: preset.primary_color,
      secondary_color: preset.secondary_color,
      visual_style: preset.visual_style as VisualStyleValue,
    }));
  };

  const applyPresetToCreate = (preset: (typeof brandPresets)[number]) => {
    setCreateForm((current) => ({
      ...current,
      accent_color: preset.accent_color,
      primary_color: preset.primary_color,
      secondary_color: preset.secondary_color,
      visual_style: preset.visual_style as VisualStyleValue,
    }));
  };

  return (
    <ProviderLayout title="Instituciones" subtitle="Inducción, imagen de marca avanzada y operación comercial por colegio">
      <div className="space-y-6">
        <CreateInstitutionSection
          createForm={createForm}
          setCreateForm={setCreateForm}
          plans={plans}
          isPending={createInstitutionMutation.isPending}
          onSubmit={handleCreateInstitution}
          onFileUpload={(e, type) => handleFileUpload(e, type, true)}
          applyPreset={applyPresetToCreate}
        />

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <InstitutionListSidebar
            summaries={summaries}
            selectedInstitutionId={selectedInstitutionId}
            onSelectInstitution={setSelectedInstitutionId}
            isLoading={isLoading}
          />

          <InstitutionDetailsPanel
            selectedSummary={selectedSummary}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onToggleActiveStatus={handleToggleInstitutionStatus}
            isTogglingStatus={setInstitutionActiveMutation.isPending}
            brandingForm={brandingForm}
            setBrandingForm={setBrandingForm}
            onSaveBrandingGeneral={handleSaveBranding}
            onSaveBrandingIdentity={handleSaveBranding}
            isSavingSettings={upsertSettingsMutation.isPending}
            onFileUpload={(e, type) => handleFileUpload(e, type, false)}
            isUploadingLogo={isUploadingLogo}
            isUploadingCover={isUploadingCover}
            applyPreset={applyPreset}
            subscriptionForm={subscriptionForm}
            setSubscriptionForm={setSubscriptionForm}
            commercialForm={commercialForm}
            setCommercialForm={setCommercialForm}
            plans={plans}
            onSaveSubscription={handleSaveSubscription}
            isSavingSubscription={upsertSubscriptionMutation.isPending}
            onSaveCommercial={handleSaveCommercial}
            isSavingCommercial={upsertCustomerAccountMutation.isPending}
            accessForm={accessForm}
            setAccessForm={setAccessForm}
            onProcessUserAccess={handleProcessUserAccess}
            isProcessingUserAccess={createUserMutation.isPending || assignUserRoleMutation.isPending}
          />
        </section>
      </div>
    </ProviderLayout>
  );
}
