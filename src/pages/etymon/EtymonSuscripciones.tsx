import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { ProviderKpiCard } from "@/components/provider/ProviderKpiCard";
import { ProviderLayout } from "@/components/provider/ProviderLayout";
import { ProviderEmptyState } from "@/components/provider/ProviderEmptyState";
import { ProviderFloatingInput, ProviderFloatingTextarea } from "@/components/provider/ProviderFloatingField";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useProviderClearInstitutionModuleOverride,
  useProviderInstitutionSummaries,
  useProviderInstitutionModules,
  useProviderSetInstitutionModuleOverride,
  useProviderSetPlanModuleAccess,
  useProviderSubscriptionPlans,
  useProviderUpsertInstitutionSubscription,
} from "@/hooks/provider";
import { useToast } from "@/hooks/use-toast";

const subscriptionStatuses = ["trialing", "active", "past_due", "canceled"] as const;

function formatCop(cents: number) {
  return new Intl.NumberFormat("es-CO", {
    currency: "COP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}

function makeTrend(base: number, amplitude: number, steps = 10) {
  return Array.from({ length: steps }, (_, index) => {
    const wave = Math.sin((index / Math.max(steps - 1, 1)) * Math.PI);
    return Number((base + wave * amplitude + index * 0.1).toFixed(2));
  });
}

export default function EtymonSuscripciones() {
  const { toast } = useToast();
  const { data: summaries, isLoading } = useProviderInstitutionSummaries();
  const { data: plans } = useProviderSubscriptionPlans();
  const updateSubscription = useProviderUpsertInstitutionSubscription();
  const setPlanModuleAccess = useProviderSetPlanModuleAccess();
  const setInstitutionModuleOverride = useProviderSetInstitutionModuleOverride();
  const clearInstitutionModuleOverride = useProviderClearInstitutionModuleOverride();

  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [form, setForm] = useState({
    current_period_end: "",
    current_period_start: "",
    notes: "",
    plan_id: "",
    status: "trialing" as (typeof subscriptionStatuses)[number],
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

  const { data: institutionModules, isLoading: institutionModulesLoading } = useProviderInstitutionModules(
    selectedSummary?.institution.id,
  );

  useEffect(() => {
    if (!selectedSummary) return;

    setForm({
      current_period_end: selectedSummary.subscription?.current_period_end ?? "",
      current_period_start: selectedSummary.subscription?.current_period_start ?? "",
      notes: selectedSummary.subscription?.notes ?? "",
      plan_id: selectedSummary.subscription?.plan_id ?? plans?.[0]?.id ?? "",
      status: (selectedSummary.subscription?.status as (typeof subscriptionStatuses)[number]) ?? "trialing",
    });
  }, [plans, selectedSummary]);

  const totals = useMemo(() => {
    const rows = summaries ?? [];
    return {
      active: rows.filter((row) => row.subscription?.status === "active").length,
      mrr: rows.reduce((accumulator, current) => {
        if (current.subscription?.status !== "active") return accumulator;
        return accumulator + (current.subscription.subscription_plans?.monthly_price_cents ?? 0);
      }, 0),
      pastDue: rows.filter((row) => row.subscription?.status === "past_due").length,
      trialing: rows.filter((row) => row.subscription?.status === "trialing").length,
    };
  }, [summaries]);

  const handleSave = async () => {
    if (!selectedSummary || !form.plan_id) {
      toast({
        title: "Datos incompletos",
        description: "Selecciona institucion y plan para guardar.",
        variant: "destructive",
      });
      return;
    }

    await updateSubscription.mutateAsync({
      current_period_end: form.current_period_end || null,
      current_period_start: form.current_period_start || null,
      institution_id: selectedSummary.institution.id,
      notes: form.notes || null,
      plan_id: form.plan_id,
      status: form.status,
    });
  };

  const handleTogglePlanModule = async (moduleCode: string, nextValue: boolean) => {
    if (!form.plan_id) {
      toast({
        title: "Plan requerido",
        description: "Selecciona un plan antes de cambiar modulos.",
        variant: "destructive",
      });
      return;
    }

    const planName = plans?.find((plan) => plan.id === form.plan_id)?.name ?? "plan seleccionado";
    const confirmed = window.confirm(
      `Vas a ${nextValue ? "habilitar" : "deshabilitar"} el modulo ${moduleCode} para el plan ${planName}. Esto afecta a todas las instituciones con ese plan. ¿Continuar?`,
    );

    if (!confirmed) return;

    await setPlanModuleAccess.mutateAsync({
      isEnabled: nextValue,
      moduleCode,
      planId: form.plan_id,
      reason: `Cambio desde ETYMON suscripciones (${selectedSummary?.institution.slug ?? "n/a"})`,
    });
  };

  const handleChangeOverride = async (moduleCode: string, mode: "plan" | "force_on" | "force_off") => {
    if (!selectedSummary) return;

    if (mode === "plan") {
      await clearInstitutionModuleOverride.mutateAsync({
        institutionId: selectedSummary.institution.id,
        moduleCode,
        reason: "Volver a herencia del plan",
      });
      return;
    }

    await setInstitutionModuleOverride.mutateAsync({
      institutionId: selectedSummary.institution.id,
      isEnabled: mode === "force_on",
      moduleCode,
      reason: "Override manual desde ETYMON suscripciones",
    });
  };

  return (
    <ProviderLayout title="Suscripciones" subtitle="Control de planes, ciclo comercial y estado de cobro">
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <ProviderKpiCard
            title="Subscriptions Active"
            value={String(totals.active)}
            subtitle="Instituciones en estado active"
            trend="up"
            trendLabel="+4.2%"
            points={makeTrend(Math.max(totals.active, 1), 1.2)}
          />
          <ProviderKpiCard
            title="Trialing"
            value={String(totals.trialing)}
            subtitle="Nuevos clientes por convertir"
            trend={totals.trialing > 0 ? "up" : "down"}
            trendLabel={totals.trialing > 0 ? "+1.7%" : "-0.3%"}
            points={makeTrend(Math.max(totals.trialing, 1), 1)}
          />
          <ProviderKpiCard
            title="Past Due"
            value={String(totals.pastDue)}
            subtitle="Cuenta en riesgo"
            trend={totals.pastDue > 0 ? "down" : "up"}
            trendLabel={totals.pastDue > 0 ? "-0.8%" : "+0.4%"}
            points={makeTrend(Math.max(totals.pastDue, 1), 0.8)}
          />
          <ProviderKpiCard
            title="MRR Active"
            value={formatCop(totals.mrr)}
            subtitle="Ingresos recurrentes esperados"
            trend="up"
            trendLabel="+6.9%"
            points={makeTrend(Math.max(totals.mrr / 100000, 1), 2)}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="etymon-surface p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Instituciones</h3>
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
                    <p className="mt-0.5 text-xs text-slate-500">
                      {summary.subscription?.subscription_plans?.name ?? "Sin plan"} - {summary.subscription?.status ?? "sin suscripcion"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <article className="etymon-surface p-5">
            {selectedSummary ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-100">{selectedSummary.institution.name}</h3>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{selectedSummary.institution.slug}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Plan</p>
                    <Select
                      value={form.plan_id || "none"}
                      onValueChange={(value) => setForm((current) => ({ ...current, plan_id: value === "none" ? "" : value }))}
                    >
                      <SelectTrigger className="etymon-input h-12 border-[#2d2d2d] bg-[#151515] text-slate-100">
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
                    <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Estado</p>
                    <Select
                      value={form.status}
                      onValueChange={(value) => setForm((current) => ({ ...current, status: value as (typeof subscriptionStatuses)[number] }))}
                    >
                      <SelectTrigger className="etymon-input h-12 border-[#2d2d2d] bg-[#151515] text-slate-100">
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
                    label="Inicio de ciclo"
                    value={form.current_period_start}
                    onChange={(event) => setForm((current) => ({ ...current, current_period_start: event.target.value }))}
                  />
                  <ProviderFloatingInput
                    type="date"
                    label="Fin de ciclo"
                    value={form.current_period_end}
                    onChange={(event) => setForm((current) => ({ ...current, current_period_end: event.target.value }))}
                  />

                  <div className="lg:col-span-2">
                    <ProviderFloatingTextarea
                      label="Notas de renovacion y facturacion"
                      value={form.notes}
                      onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                    />
                  </div>
                </div>

                <Button onClick={handleSave} disabled={updateSubscription.isPending} className="etymon-btn-primary h-11 min-w-52">
                  Guardar suscripcion
                </Button>

                <section className="etymon-surface-soft space-y-4 p-4">
                  <header className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Entitlements Por Modulo</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Controla el alcance por plan y aplica override puntual por institucion.
                      </p>
                    </div>
                    {institutionModulesLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
                  </header>

                  <div className="space-y-2">
                    {(institutionModules ?? []).map((moduleRow) => {
                      const overrideMode = moduleRow.override_enabled === null
                        ? "plan"
                        : moduleRow.override_enabled
                          ? "force_on"
                          : "force_off";

                      return (
                        <div key={moduleRow.module_id} className="grid gap-3 rounded-lg border border-[#2d2d2d] bg-[#161616] p-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
                          <div>
                            <p className="text-sm font-medium text-slate-100">{moduleRow.module_name}</p>
                            <p className="text-xs uppercase tracking-wide text-slate-500">{moduleRow.module_code}</p>
                          </div>

                          <div className="flex items-center gap-2 rounded-lg border border-[#2d2d2d] bg-[#141414] px-3 py-2">
                            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Plan</span>
                            <Switch
                              checked={moduleRow.plan_enabled ?? true}
                              disabled={!form.plan_id || setPlanModuleAccess.isPending}
                              onCheckedChange={(checked) => handleTogglePlanModule(moduleRow.module_code, checked)}
                            />
                          </div>

                          <div className="grid gap-2 sm:grid-cols-[180px_auto] sm:items-center">
                            <Select
                              value={overrideMode}
                              onValueChange={(value) => handleChangeOverride(moduleRow.module_code, value as "plan" | "force_on" | "force_off")}
                              disabled={setInstitutionModuleOverride.isPending || clearInstitutionModuleOverride.isPending}
                            >
                              <SelectTrigger className="etymon-input h-10 border-[#2d2d2d] bg-[#141414] text-slate-100">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="border-[#2d2d2d] bg-[#161616] text-slate-100">
                                <SelectItem value="plan">Usar plan</SelectItem>
                                <SelectItem value="force_on">Forzar habilitado</SelectItem>
                                <SelectItem value="force_off">Forzar deshabilitado</SelectItem>
                              </SelectContent>
                            </Select>

                            <span
                              className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                                moduleRow.effective_enabled
                                  ? "border-[#00e7a7]/40 bg-[#00e7a7]/15 text-[#9cf7df]"
                                  : "border-[#ff6b6b]/35 bg-[#ff6b6b]/12 text-[#ffb0b0]"
                              }`}
                            >
                              {moduleRow.effective_enabled ? "Activo" : "Bloqueado"} ({moduleRow.effective_source})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            ) : (
              <ProviderEmptyState
                title="No hay tenant seleccionado"
                description="Selecciona una institucion para administrar su plan, estado y ciclo de facturacion mensual."
              />
            )}
          </article>
        </section>
      </div>
    </ProviderLayout>
  );
}
