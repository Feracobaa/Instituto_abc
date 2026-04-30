import { useEffect, useMemo, useState } from "react";
import { Loader2, Palette, RefreshCcw, Sparkles } from "lucide-react";
import { ProviderLayout } from "@/components/provider/ProviderLayout";
import { ProviderEmptyState } from "@/components/provider/ProviderEmptyState";
import { ProviderFloatingInput, ProviderFloatingTextarea } from "@/components/provider/ProviderFloatingField";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";

const commercialStatuses = ["lead", "active", "paused", "churned"] as const;
const billingStatuses = ["pending", "paid", "overdue", "waived"] as const;
const subscriptionStatuses = ["trialing", "active", "past_due", "canceled"] as const;
const institutionRoles = ["rector", "profesor", "parent", "contable"] as const;
const colorRegex = /^#[0-9A-Fa-f]{6}$/;

const fontFamilyOptions = [
  { value: "modern-sans", label: "Modern Sans" },
  { value: "academic-sans", label: "Academic Sans" },
  { value: "friendly-rounded", label: "Friendly Rounded" },
  { value: "classic-serif", label: "Classic Serif" },
] as const;

const visualStyleOptions = [
  { value: "clean", label: "Clean" },
  { value: "bold", label: "Bold" },
  { value: "minimal", label: "Minimal" },
] as const;

const brandPresets = [
  {
    accent_color: "#14B8A6",
    key: "coastal",
    label: "Coastal Tech",
    primary_color: "#0EA5E9",
    secondary_color: "#1E293B",
    visual_style: "clean",
  },
  {
    accent_color: "#F59E0B",
    key: "academia",
    label: "Academia Gold",
    primary_color: "#0F172A",
    secondary_color: "#334155",
    visual_style: "bold",
  },
  {
    accent_color: "#4F46E5",
    key: "future",
    label: "Future Indigo",
    primary_color: "#111827",
    secondary_color: "#312E81",
    visual_style: "minimal",
  },
] as const;

type FontFamilyValue = (typeof fontFamilyOptions)[number]["value"];
type VisualStyleValue = (typeof visualStyleOptions)[number]["value"];

interface BrandingFormState {
  accent_color: string;
  cover_image_url: string;
  display_name: string;
  font_family: FontFamilyValue;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  visual_style: VisualStyleValue;
}

interface CreateInstitutionForm extends BrandingFormState {
  billingStatus: string;
  name: string;
  notes: string;
  planId: string;
  slug: string;
  subscriptionStatus: string;
}

function makeBrandingForm(displayName = ""): BrandingFormState {
  return {
    accent_color: "#14B8A6",
    cover_image_url: "",
    display_name: displayName,
    font_family: "modern-sans",
    logo_url: "",
    primary_color: "#0EA5E9",
    secondary_color: "#1E293B",
    visual_style: "clean",
  };
}

function defaultCreateForm(): CreateInstitutionForm {
  return {
    ...makeBrandingForm(""),
    billingStatus: "pending",
    name: "",
    notes: "",
    planId: "",
    slug: "",
    subscriptionStatus: "trialing",
  };
}

function ensureHexOrEmpty(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  return colorRegex.test(normalized) ? normalized.toUpperCase() : null;
}

function fontPreviewClass(value: FontFamilyValue) {
  if (value === "friendly-rounded") return "font-[Nunito]";
  if (value === "classic-serif") return "font-serif";
  if (value === "academic-sans") return "font-[Inter] tracking-[0.01em]";
  return "font-[Inter]";
}

function styleBadgeClass(value: VisualStyleValue) {
  if (value === "bold") return "uppercase tracking-[0.16em]";
  if (value === "minimal") return "tracking-[0.08em]";
  return "tracking-[0.12em]";
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const safeColor = colorRegex.test(value) ? value : "#0EA5E9";

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safeColor}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-11 w-14 cursor-pointer rounded-lg border border-[var(--et-border)] bg-transparent p-1"
        />
        <ProviderFloatingInput
          label="Hex"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function BrandPreview({ title, branding }: { title: string; branding: BrandingFormState }) {
  return (
    <div className="etymon-surface-soft overflow-hidden p-0">
      <div
        className="relative min-h-[190px] p-4"
        style={{
          background: `linear-gradient(145deg, ${branding.primary_color} 0%, ${branding.secondary_color} 52%, ${branding.accent_color} 100%)`,
        }}
      >
        {branding.cover_image_url ? (
          <img
            src={branding.cover_image_url}
            alt="Portada de marca"
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
        ) : null}

        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-black/35 px-2.5 py-1 text-[11px] text-white/90">
            <Sparkles className="h-3.5 w-3.5" />
            Preview de marca
          </div>

          <div>
            <p className={`text-[11px] text-white/75 ${styleBadgeClass(branding.visual_style)}`}>{title}</p>
            <h4 className={`mt-1 text-xl text-white ${fontPreviewClass(branding.font_family)}`}>
              {branding.display_name || "Nombre institucional"}
            </h4>
            <p className="mt-2 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs text-white">
              {visualStyleOptions.find((option) => option.value === branding.visual_style)?.label}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EtymonInstituciones() {
  const { toast } = useToast();
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

  useEffect(() => {
    if (!selectedInstitutionId && summaries && summaries.length > 0) {
      setSelectedInstitutionId(summaries[0].institution.id);
    }
  }, [selectedInstitutionId, summaries]);

  const selectedSummary = useMemo(
    () => summaries?.find((summary) => summary.institution.id === selectedInstitutionId) ?? null,
    [selectedInstitutionId, summaries],
  );

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

    return {
      accent_color: accent,
      primary_color: primary,
      secondary_color: secondary,
    };
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

  const applyPresetToCreate = (preset: (typeof brandPresets)[number]) => {
    setCreateForm((current) => ({
      ...current,
      accent_color: preset.accent_color,
      primary_color: preset.primary_color,
      secondary_color: preset.secondary_color,
      visual_style: preset.visual_style as VisualStyleValue,
    }));
  };

  const applyPresetToBranding = (preset: (typeof brandPresets)[number]) => {
    setBrandingForm((current) => ({
      ...current,
      accent_color: preset.accent_color,
      primary_color: preset.primary_color,
      secondary_color: preset.secondary_color,
      visual_style: preset.visual_style as VisualStyleValue,
    }));
  };

  return (
    <ProviderLayout title="Instituciones" subtitle="Onboarding, branding avanzado y operacion comercial por tenant">
      <div className="space-y-6">
        <section className="etymon-surface p-5">
          <header className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Nueva Institucion</h3>
              <p className="mt-1 text-sm text-slate-500">Crea un tenant con personalizacion visual completa desde el primer dia.</p>
            </div>
            {createInstitutionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
          </header>

          <form onSubmit={handleCreateInstitution} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <ProviderFloatingInput
                  label="Slug"
                  value={createForm.slug}
                  onChange={(event) => setCreateForm((current) => ({ ...current, slug: event.target.value.toLowerCase() }))}
                  required
                />
              </div>
              <div className="lg:col-span-4">
                <ProviderFloatingInput
                  label="Nombre institucional"
                  value={createForm.name}
                  onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </div>
              <div className="lg:col-span-4">
                <ProviderFloatingInput
                  label="Display name"
                  value={createForm.display_name}
                  onChange={(event) => setCreateForm((current) => ({ ...current, display_name: event.target.value }))}
                />
              </div>

              <div className="lg:col-span-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Plan inicial</p>
                <Select
                  value={createForm.planId || "none"}
                  onValueChange={(value) => setCreateForm((current) => ({ ...current, planId: value === "none" ? "" : value }))}
                >
                  <SelectTrigger className="etymon-input h-12 text-slate-100">
                    <SelectValue placeholder="Selecciona plan" />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-slate-100">
                    <SelectItem value="none">Sin plan por ahora</SelectItem>
                    {(plans ?? []).map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Estado suscripcion</p>
                <Select
                  value={createForm.subscriptionStatus}
                  onValueChange={(value) => setCreateForm((current) => ({ ...current, subscriptionStatus: value }))}
                >
                  <SelectTrigger className="etymon-input h-12 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-slate-100">
                    {subscriptionStatuses.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Estado de cobro</p>
                <Select
                  value={createForm.billingStatus}
                  onValueChange={(value) => setCreateForm((current) => ({ ...current, billingStatus: value }))}
                >
                  <SelectTrigger className="etymon-input h-12 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-slate-100">
                    {billingStatuses.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-3 flex items-end">
                <Button type="submit" disabled={createInstitutionMutation.isPending} className="etymon-btn-primary h-12 w-full">
                  Crear institucion
                </Button>
              </div>

              <div className="lg:col-span-12">
                <ProviderFloatingTextarea
                  label="Notas operativas"
                  value={createForm.notes}
                  onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </div>
            </div>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr,0.8fr]">
              <div className="etymon-surface-soft p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Brand Kit Inicial</h4>
                  <div className="flex flex-wrap gap-2">
                    {brandPresets.map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => applyPresetToCreate(preset)}
                        className="rounded-full border border-[var(--et-border)] px-2 py-0.5 text-[10px] text-slate-400 transition-colors hover:text-slate-200"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <ProviderFloatingInput
                    label="Logo URL"
                    value={createForm.logo_url}
                    onChange={(event) => setCreateForm((current) => ({ ...current, logo_url: event.target.value }))}
                  />
                  <ProviderFloatingInput
                    label="Portada URL"
                    value={createForm.cover_image_url}
                    onChange={(event) => setCreateForm((current) => ({ ...current, cover_image_url: event.target.value }))}
                  />

                  <ColorInput
                    label="Color primario"
                    value={createForm.primary_color}
                    onChange={(value) => setCreateForm((current) => ({ ...current, primary_color: value }))}
                  />
                  <ColorInput
                    label="Color secundario"
                    value={createForm.secondary_color}
                    onChange={(value) => setCreateForm((current) => ({ ...current, secondary_color: value }))}
                  />
                  <ColorInput
                    label="Color acento"
                    value={createForm.accent_color}
                    onChange={(value) => setCreateForm((current) => ({ ...current, accent_color: value }))}
                  />

                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Tipografia</p>
                      <Select
                        value={createForm.font_family}
                        onValueChange={(value) => setCreateForm((current) => ({ ...current, font_family: value as FontFamilyValue }))}
                      >
                        <SelectTrigger className="etymon-input h-11 text-slate-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-slate-100">
                          {fontFamilyOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Estilo visual</p>
                      <Select
                        value={createForm.visual_style}
                        onValueChange={(value) => setCreateForm((current) => ({ ...current, visual_style: value as VisualStyleValue }))}
                      >
                        <SelectTrigger className="etymon-input h-11 text-slate-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-slate-100">
                          {visualStyleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <BrandPreview title="Nuevo Tenant" branding={createForm} />
            </section>
          </form>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="etymon-surface p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Tenants</h3>

            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {(summaries ?? []).map((summary) => (
                  <button
                    key={summary.institution.id}
                    onClick={() => setSelectedInstitutionId(summary.institution.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${
                      selectedInstitutionId === summary.institution.id
                        ? "border-[var(--et-accent)] bg-[color:var(--et-accent-soft)] text-slate-100"
                        : "border-[var(--et-border)] [background:var(--et-chip-bg)] text-slate-300 hover:border-[var(--et-accent)]"
                    }`}
                  >
                    <p className="text-sm font-medium">{summary.institution.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{summary.institution.slug}</p>
                    <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${summary.institution.is_active ? "border border-emerald-400/35 bg-emerald-400/12 text-emerald-200" : "border border-slate-500/35 bg-slate-500/15 text-slate-300"}`}>
                      {summary.institution.is_active ? "Activa" : "Inactiva"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <article className="etymon-surface p-5">
            {selectedSummary ? (
              <div className="space-y-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-100">{selectedSummary.institution.name}</h3>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{selectedSummary.institution.slug}</p>
                  </div>
                  <Button
                    className="etymon-btn-outline gap-2"
                    onClick={() => handleToggleInstitutionStatus(
                      selectedSummary.institution.id,
                      selectedSummary.institution.is_active,
                      selectedSummary.institution.slug,
                    )}
                    disabled={setInstitutionActiveMutation.isPending}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {selectedSummary.institution.is_active ? "Desactivar" : "Activar"}
                  </Button>
                </div>

                <section className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                  <div className="space-y-4">
                    <div className="etymon-surface-soft p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Palette className="h-4 w-4 text-[var(--et-accent)]" />
                        <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Branding</h4>
                      </div>
                      <div className="space-y-3">
                        <ProviderFloatingInput
                          label="Display name"
                          value={brandingForm.display_name}
                          onChange={(event) => setBrandingForm((current) => ({ ...current, display_name: event.target.value }))}
                        />
                        <ProviderFloatingInput
                          label="Logo URL"
                          value={brandingForm.logo_url}
                          onChange={(event) => setBrandingForm((current) => ({ ...current, logo_url: event.target.value }))}
                        />
                        <ProviderFloatingInput
                          label="Portada URL"
                          value={brandingForm.cover_image_url}
                          onChange={(event) => setBrandingForm((current) => ({ ...current, cover_image_url: event.target.value }))}
                        />
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <ColorInput
                            label="Color primario"
                            value={brandingForm.primary_color}
                            onChange={(value) => setBrandingForm((current) => ({ ...current, primary_color: value }))}
                          />
                          <ColorInput
                            label="Color secundario"
                            value={brandingForm.secondary_color}
                            onChange={(value) => setBrandingForm((current) => ({ ...current, secondary_color: value }))}
                          />
                        </div>
                        <ColorInput
                          label="Color acento"
                          value={brandingForm.accent_color}
                          onChange={(value) => setBrandingForm((current) => ({ ...current, accent_color: value }))}
                        />
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Tipografia</p>
                            <Select
                              value={brandingForm.font_family}
                              onValueChange={(value) => setBrandingForm((current) => ({ ...current, font_family: value as FontFamilyValue }))}
                            >
                              <SelectTrigger className="etymon-input h-11 text-slate-100">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-slate-100">
                                {fontFamilyOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Estilo visual</p>
                            <Select
                              value={brandingForm.visual_style}
                              onValueChange={(value) => setBrandingForm((current) => ({ ...current, visual_style: value as VisualStyleValue }))}
                            >
                              <SelectTrigger className="etymon-input h-11 text-slate-100">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-slate-100">
                                {visualStyleOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {brandPresets.map((preset) => (
                            <button
                              key={preset.key}
                              type="button"
                              onClick={() => applyPresetToBranding(preset)}
                              className="rounded-full border border-[var(--et-border)] px-2 py-0.5 text-[10px] text-slate-400 transition-colors hover:text-slate-200"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                        <Button className="etymon-btn-primary w-full" onClick={handleSaveBranding} disabled={upsertSettingsMutation.isPending}>
                          Guardar branding
                        </Button>
                      </div>
                    </div>

                    <div className="etymon-surface-soft p-4">
                      <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Commercial</h4>
                      <div className="space-y-3">
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Estado comercial</p>
                          <Select
                            value={commercialForm.commercial_status}
                            onValueChange={(value) => setCommercialForm((current) => ({ ...current, commercial_status: value as (typeof commercialStatuses)[number] }))}
                          >
                            <SelectTrigger className="etymon-input h-11 text-slate-100">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-slate-100">
                              {commercialStatuses.map((status) => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Estado de cobro</p>
                          <Select
                            value={commercialForm.billing_status}
                            onValueChange={(value) => setCommercialForm((current) => ({ ...current, billing_status: value as (typeof billingStatuses)[number] }))}
                          >
                            <SelectTrigger className="etymon-input h-11 text-slate-100">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-slate-100">
                              {billingStatuses.map((status) => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <ProviderFloatingTextarea
                          label="Notas comerciales"
                          value={commercialForm.notes}
                          onChange={(event) => setCommercialForm((current) => ({ ...current, notes: event.target.value }))}
                        />
                        <Button className="etymon-btn-outline w-full" onClick={handleSaveCommercial} disabled={upsertCustomerAccountMutation.isPending}>
                          Guardar comercial
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <BrandPreview title="Identidad activa" branding={brandingForm} />

                    <div className="etymon-surface-soft p-4">
                      <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Subscription</h4>
                      <div className="space-y-3">
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Plan</p>
                          <Select
                            value={subscriptionForm.plan_id || "none"}
                            onValueChange={(value) => setSubscriptionForm((current) => ({ ...current, plan_id: value === "none" ? "" : value }))}
                          >
                            <SelectTrigger className="etymon-input h-11 text-slate-100">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-slate-100">
                              <SelectItem value="none">Sin plan</SelectItem>
                              {(plans ?? []).map((plan) => (
                                <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Estado suscripcion</p>
                          <Select
                            value={subscriptionForm.status}
                            onValueChange={(value) => setSubscriptionForm((current) => ({ ...current, status: value as (typeof subscriptionStatuses)[number] }))}
                          >
                            <SelectTrigger className="etymon-input h-11 text-slate-100">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-slate-100">
                              {subscriptionStatuses.map((status) => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <ProviderFloatingInput
                          type="date"
                          label="Inicio ciclo"
                          value={subscriptionForm.current_period_start}
                          onChange={(event) => setSubscriptionForm((current) => ({ ...current, current_period_start: event.target.value }))}
                        />
                        <ProviderFloatingInput
                          type="date"
                          label="Fin ciclo"
                          value={subscriptionForm.current_period_end}
                          onChange={(event) => setSubscriptionForm((current) => ({ ...current, current_period_end: event.target.value }))}
                        />
                        <ProviderFloatingTextarea
                          label="Notas de suscripcion"
                          value={subscriptionForm.notes}
                          onChange={(event) => setSubscriptionForm((current) => ({ ...current, notes: event.target.value }))}
                        />
                        <Button className="etymon-btn-outline w-full" onClick={handleSaveSubscription} disabled={upsertSubscriptionMutation.isPending}>
                          Guardar suscripcion
                        </Button>
                      </div>
                    </div>

                    <div className="etymon-surface-soft p-4">
                      <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Acceso Usuarios</h4>
                      <div className="space-y-3">
                        <p className="mb-2 text-xs text-slate-500">
                          Ingresa el email. Si no existe, se crea automaticamente. Si ya existe, se asigna el rol en esta institucion.
                        </p>
                        <ProviderFloatingInput
                          type="email"
                          label="Email usuario"
                          value={accessForm.email}
                          onChange={(event) => setAccessForm((current) => ({ ...current, email: event.target.value }))}
                        />
                        <ProviderFloatingInput
                          label="Nombre completo (opcional)"
                          value={accessForm.fullName}
                          onChange={(event) => setAccessForm((current) => ({ ...current, fullName: event.target.value }))}
                        />
                        <ProviderFloatingInput
                          label="Contrasena temporal (opcional)"
                          type="password"
                          value={accessForm.temporaryPassword}
                          onChange={(event) => setAccessForm((current) => ({ ...current, temporaryPassword: event.target.value }))}
                        />
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Rol institucional</p>
                          <Select
                            value={accessForm.role}
                            onValueChange={(value) => setAccessForm((current) => ({ ...current, role: value as (typeof institutionRoles)[number] }))}
                          >
                            <SelectTrigger className="etymon-input h-11 text-slate-100">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-slate-100">
                              {institutionRoles.filter((r) => r !== "parent").map((role) => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          className="etymon-btn-primary w-full"
                          onClick={handleProcessUserAccess}
                          disabled={createUserMutation.isPending || assignUserRoleMutation.isPending}
                        >
                          {createUserMutation.isPending || assignUserRoleMutation.isPending ? "Procesando..." : "Otorgar acceso a institucion"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <ProviderEmptyState
                title="Selecciona una institucion"
                description="Escoge un tenant para administrar branding, comercial, suscripcion y acceso de usuarios."
              />
            )}
          </article>
        </section>
      </div>
    </ProviderLayout>
  );
}
