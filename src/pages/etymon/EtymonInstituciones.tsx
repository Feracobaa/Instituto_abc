import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { ProviderLayout } from "@/components/provider/ProviderLayout";
import { ProviderEmptyState } from "@/components/provider/ProviderEmptyState";
import { ProviderFloatingInput, ProviderFloatingTextarea } from "@/components/provider/ProviderFloatingField";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useProviderAssignUserRoleByEmail,
  useProviderCreateInstitution,
  useProviderInstitutionSummaries,
  useProviderSubscriptionPlans,
  useProviderUpdateInstitution,
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

function defaultCreateForm() {
  return {
    billingStatus: "pending",
    displayName: "",
    name: "",
    notes: "",
    planId: "",
    slug: "",
    subscriptionStatus: "trialing",
  };
}

export default function EtymonInstituciones() {
  const { toast } = useToast();
  const { data: summaries, isLoading } = useProviderInstitutionSummaries();
  const { data: plans } = useProviderSubscriptionPlans();

  const createInstitutionMutation = useProviderCreateInstitution();
  const updateInstitutionMutation = useProviderUpdateInstitution();
  const upsertSettingsMutation = useProviderUpsertInstitutionSettings();
  const upsertSubscriptionMutation = useProviderUpsertInstitutionSubscription();
  const upsertCustomerAccountMutation = useProviderUpsertCustomerAccount();
  const assignUserRoleMutation = useProviderAssignUserRoleByEmail();
  const createUserMutation = useEtymonCreateUser();

  const [createForm, setCreateForm] = useState(defaultCreateForm());
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("");
  const [brandingForm, setBrandingForm] = useState({ display_name: "", logo_url: "", primary_color: "" });
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
      display_name: selectedSummary.settings?.display_name ?? selectedSummary.institution.name,
      logo_url: selectedSummary.settings?.logo_url ?? "",
      primary_color: selectedSummary.settings?.primary_color ?? "",
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

  const handleCreateInstitution = async (event: React.FormEvent) => {
    event.preventDefault();

    await createInstitutionMutation.mutateAsync({
      billingStatus: createForm.billingStatus,
      displayName: createForm.displayName || undefined,
      name: createForm.name,
      notes: createForm.notes || undefined,
      planId: createForm.planId || undefined,
      slug: createForm.slug,
      subscriptionStatus: createForm.subscriptionStatus,
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

    await updateInstitutionMutation.mutateAsync({ id: institutionId, is_active: !currentStatus });
  };

  const handleSaveBranding = async () => {
    if (!selectedSummary) return;

    await upsertSettingsMutation.mutateAsync({
      display_name: brandingForm.display_name,
      institution_id: selectedSummary.institution.id,
      logo_url: brandingForm.logo_url || null,
      primary_color: brandingForm.primary_color || null,
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
      // Si el usuario ya existe, lo vinculamos automáticamente a la institución
      if (msg.includes("already exists") || msg.includes("already registered")) {
        try {
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
        } catch (assignErr) {
          // onError de la mutación ya muestra el toast
        }
      }
    }
  };


  return (
    <ProviderLayout title="Instituciones" subtitle="Onboarding, branding y operacion comercial por tenant">
      <div className="space-y-6">
        <section className="etymon-surface p-5">
          <header className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Nueva Institucion</h3>
              <p className="mt-1 text-sm text-slate-500">Crea un tenant limpio con plan inicial y datos operativos.</p>
            </div>
            {createInstitutionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
          </header>

          <form onSubmit={handleCreateInstitution} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
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
                value={createForm.displayName}
                onChange={(event) => setCreateForm((current) => ({ ...current, displayName: event.target.value }))}
              />
            </div>

            <div className="lg:col-span-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Plan inicial</p>
              <Select
                value={createForm.planId || "none"}
                onValueChange={(value) => setCreateForm((current) => ({ ...current, planId: value === "none" ? "" : value }))}
              >
                <SelectTrigger className="etymon-input h-12 border-[#2d2d2d] bg-[#151515] text-slate-100 focus:ring-[#00e7a7]/40">
                  <SelectValue placeholder="Selecciona plan" />
                </SelectTrigger>
                <SelectContent className="border-[#2d2d2d] bg-[#161616] text-slate-100">
                  <SelectItem value="none">Sin plan por ahora</SelectItem>
                  {(plans ?? []).map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Estado de suscripcion</p>
              <Select
                value={createForm.subscriptionStatus}
                onValueChange={(value) => setCreateForm((current) => ({ ...current, subscriptionStatus: value }))}
              >
                <SelectTrigger className="etymon-input h-12 border-[#2d2d2d] bg-[#151515] text-slate-100 focus:ring-[#00e7a7]/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#2d2d2d] bg-[#161616] text-slate-100">
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
                <SelectTrigger className="etymon-input h-12 border-[#2d2d2d] bg-[#151515] text-slate-100 focus:ring-[#00e7a7]/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#2d2d2d] bg-[#161616] text-slate-100">
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
          </form>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="etymon-surface p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Tenants</h3>

            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              </div>
            ) : (
              <div className="space-y-2">
                {(summaries ?? []).map((summary) => (
                  <button
                    key={summary.institution.id}
                    onClick={() => setSelectedInstitutionId(summary.institution.id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                      selectedInstitutionId === summary.institution.id
                        ? "border-[#00e7a7]/55 bg-[#00e7a7]/10 text-slate-100"
                        : "border-[#2d2d2d] bg-[#171717] text-slate-300 hover:border-[#3a3a3a]"
                    }`}
                  >
                    <p className="text-sm font-medium">{summary.institution.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{summary.institution.slug}</p>
                    <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${summary.institution.is_active ? "border border-[#00e7a7]/30 bg-[#00e7a7]/10 text-[#9cf7df]" : "border border-[#444] bg-[#222] text-slate-400"}`}>
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
                    disabled={updateInstitutionMutation.isPending}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {selectedSummary.institution.is_active ? "Desactivar" : "Activar"}
                  </Button>
                </div>

                <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="etymon-surface-soft p-4">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Branding</h4>
                    <div className="space-y-3">
                      <ProviderFloatingInput
                        label="Display name"
                        value={brandingForm.display_name}
                        onChange={(event) => setBrandingForm((current) => ({ ...current, display_name: event.target.value }))}
                      />
                      <ProviderFloatingInput
                        label="Color primario (hex)"
                        value={brandingForm.primary_color}
                        onChange={(event) => setBrandingForm((current) => ({ ...current, primary_color: event.target.value }))}
                      />
                      <ProviderFloatingInput
                        label="Logo URL"
                        value={brandingForm.logo_url}
                        onChange={(event) => setBrandingForm((current) => ({ ...current, logo_url: event.target.value }))}
                      />
                      <Button className="etymon-btn-outline w-full" onClick={handleSaveBranding} disabled={upsertSettingsMutation.isPending}>
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
                          <SelectTrigger className="etymon-input h-11 border-[#2d2d2d] bg-[#151515] text-slate-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-[#2d2d2d] bg-[#161616] text-slate-100">
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
                          <SelectTrigger className="etymon-input h-11 border-[#2d2d2d] bg-[#151515] text-slate-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-[#2d2d2d] bg-[#161616] text-slate-100">
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

                  <div className="etymon-surface-soft p-4">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Subscription</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Plan</p>
                        <Select
                          value={subscriptionForm.plan_id || "none"}
                          onValueChange={(value) => setSubscriptionForm((current) => ({ ...current, plan_id: value === "none" ? "" : value }))}
                        >
                          <SelectTrigger className="etymon-input h-11 border-[#2d2d2d] bg-[#151515] text-slate-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-[#2d2d2d] bg-[#161616] text-slate-100">
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
                          <SelectTrigger className="etymon-input h-11 border-[#2d2d2d] bg-[#151515] text-slate-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-[#2d2d2d] bg-[#161616] text-slate-100">
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
                        Ingresa el email. Si no existe, se creara automaticamente. Si ya existe, se le asignara el rol en esta institucion de inmediato.
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
                        label="Contraseña temporal (opcional)"
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
                          <SelectTrigger className="etymon-input h-11 border-[#2d2d2d] bg-[#151515] text-slate-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-[#2d2d2d] bg-[#161616] text-slate-100">
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
                </section>
              </div>
            ) : (
              <ProviderEmptyState
                title="Selecciona una institucion"
                description="Escoge un tenant desde el panel izquierdo para administrar branding, comercial, suscripcion y acceso de usuarios."
              />
            )}
          </article>
        </section>
      </div>
    </ProviderLayout>
  );
}
