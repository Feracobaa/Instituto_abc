import { useState, useMemo, useCallback } from "react";
import {
  Loader2,
  Plus,
  Settings2,
  CreditCard,
  LayoutDashboard,
  Calculator,
  Users,
  GraduationCap,
  BookOpen,
  Clock,
  Layers,
  Library,
  ClipboardCheck,
  CalendarCheck,
  FileText,
  UserCircle,
  Package,
} from "lucide-react";
import { ProviderLayout } from "@/components/provider/ProviderLayout";
import { ProviderEmptyState } from "@/components/provider/ProviderEmptyState";
import { ProviderFloatingInput } from "@/components/provider/ProviderFloatingField";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  useProviderSubscriptionPlans,
  useProviderUpsertPlan,
  useProviderModuleCatalog,
  useProviderPlanModules,
  useProviderSetPlanModuleAccess,
} from "@/hooks/provider";

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function formatCop(cents: number) {
  return new Intl.NumberFormat("es-CO", {
    currency: "COP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}

/** Maps a module code to a Lucide icon for visual richness. */
const MODULE_ICON_MAP: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  contabilidad: Calculator,
  usuarios: Users,
  profesores: GraduationCap,
  estudiantes: BookOpen,
  familias: Users,
  horarios: Clock,
  grados: Layers,
  materias: Library,
  calificaciones: ClipboardCheck,
  asistencias: CalendarCheck,
  mis_notas: FileText,
  mi_horario: Clock,
  mi_perfil: UserCircle,
};

/** Aesthetic color accents per module for the card left-border strip. */
const MODULE_COLOR_MAP: Record<string, string> = {
  dashboard: "#00e7a7",
  contabilidad: "#facc15",
  usuarios: "#38bdf8",
  profesores: "#a78bfa",
  estudiantes: "#fb923c",
  familias: "#34d399",
  horarios: "#f472b6",
  grados: "#60a5fa",
  materias: "#c084fc",
  calificaciones: "#2dd4bf",
  asistencias: "#fbbf24",
  mis_notas: "#818cf8",
  mi_horario: "#f472b6",
  mi_perfil: "#94a3b8",
};

/* ─── Module Card Component ────────────────────────────────────────────────── */

interface ModuleCardProps {
  code: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  isSaving: boolean;
  onToggle: (enabled: boolean) => void;
}

function ModuleCard({ code, name, description, isEnabled, isSaving, onToggle }: ModuleCardProps) {
  const Icon = MODULE_ICON_MAP[code] ?? Package;
  const accentColor = MODULE_COLOR_MAP[code] ?? "#64748b";

  return (
    <div
      className={`
        group relative overflow-hidden rounded-xl border transition-all duration-300
        ${isEnabled
          ? "border-[#2d2d2d] bg-[#141414] hover:border-[#3a3a3a]"
          : "border-[#1e1e1e] bg-[#0e0e0e] opacity-60 hover:opacity-80"
        }
      `}
    >
      {/* Accent strip on the left */}
      <div
        className="absolute left-0 top-0 h-full w-1 transition-opacity duration-300"
        style={{
          backgroundColor: accentColor,
          opacity: isEnabled ? 1 : 0.25,
        }}
      />

      <div className="flex items-center gap-4 px-5 py-4">
        {/* Icon */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-300"
          style={{
            backgroundColor: isEnabled ? `${accentColor}15` : "#1a1a1a",
          }}
        >
          <Icon
            className="h-5 w-5 transition-colors duration-300"
            style={{ color: isEnabled ? accentColor : "#555" }}
          />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold transition-colors duration-300 ${
              isEnabled ? "text-slate-100" : "text-slate-500"
            }`}
          >
            {name}
          </p>
          {description && (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {description}
            </p>
          )}
        </div>

        {/* Switch */}
        <div className="flex items-center gap-2">
          {isSaving && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
          )}
          <Switch
            checked={isEnabled}
            disabled={isSaving}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-[#00e7a7]"
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Modules Section Component ────────────────────────────────────────────── */

interface PlanModulesSectionProps {
  planId: string;
}

function PlanModulesSection({ planId }: PlanModulesSectionProps) {
  const { data: catalog, isLoading: catalogLoading } = useProviderModuleCatalog();
  const { data: planModules, isLoading: planModulesLoading } = useProviderPlanModules(planId);
  const setPlanModuleAccess = useProviderSetPlanModuleAccess();

  const [savingModules, setSavingModules] = useState<Set<string>>(new Set());

  /** Build a map of module_id → is_enabled from the plan's current assignments. */
  const enabledMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const pm of planModules ?? []) {
      map.set(pm.module_id, pm.is_enabled);
    }
    return map;
  }, [planModules]);

  const handleToggle = useCallback(
    async (moduleCode: string, moduleId: string, newValue: boolean) => {
      setSavingModules((prev) => new Set(prev).add(moduleId));
      try {
        await setPlanModuleAccess.mutateAsync({
          planId,
          moduleCode,
          isEnabled: newValue,
        });
      } finally {
        setSavingModules((prev) => {
          const next = new Set(prev);
          next.delete(moduleId);
          return next;
        });
      }
    },
    [planId, setPlanModuleAccess],
  );

  const isLoading = catalogLoading || planModulesLoading;

  /** Count enabled modules for the summary badge. */
  const enabledCount = useMemo(() => {
    if (!catalog) return 0;
    return catalog.filter((m) => enabledMap.get(m.id) !== false).length;
  }, [catalog, enabledMap]);

  if (isLoading) {
    return (
      <div className="mt-6 flex h-24 items-center justify-center rounded-xl border border-[#2d2d2d] bg-[#111]">
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!catalog || catalog.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-[#2d2d2d] bg-[#111] p-6 text-center text-xs text-slate-500">
        No hay módulos registrados en el catálogo.
      </div>
    );
  }

  return (
    <div className="mt-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
            <Package className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">
              Módulos del Plan
            </h4>
            <p className="text-[11px] text-slate-500">
              Define qué funcionalidades incluye este plan
            </p>
          </div>
        </div>

        <span className="rounded-full border border-[#2d2d2d] bg-[#171717] px-3 py-1 text-[11px] font-medium text-slate-400">
          {enabledCount} / {catalog.length} activos
        </span>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {catalog.map((mod) => {
          // If the module is not in the plan's assignments, it defaults to enabled (grace mode)
          const isEnabled = enabledMap.get(mod.id) !== false;
          const isSaving = savingModules.has(mod.id);

          return (
            <ModuleCard
              key={mod.id}
              code={mod.code}
              name={mod.name}
              description={mod.description}
              isEnabled={isEnabled}
              isSaving={isSaving}
              onToggle={(newValue) => handleToggle(mod.code, mod.id, newValue)}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────────── */

export default function EtymonPlanes() {
  const { data: plans, isLoading } = useProviderSubscriptionPlans();
  const upsertPlan = useProviderUpsertPlan();

  const [selectedPlanId, setSelectedPlanId] = useState<string | "new">("");
  const [form, setForm] = useState({
    name: "",
    monthly_price: "",
    is_active: true,
  });

  const selectedPlan = selectedPlanId === "new" ? null : plans?.find((p) => p.id === selectedPlanId);

  const handleSelectPlan = (planId: string | "new") => {
    setSelectedPlanId(planId);
    if (planId === "new") {
      setForm({ name: "", monthly_price: "", is_active: true });
    } else {
      const plan = plans?.find((p) => p.id === planId);
      if (plan) {
        setForm({
          name: plan.name,
          monthly_price: (plan.monthly_price_cents / 100).toString(),
          is_active: plan.is_active,
        });
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.monthly_price) return;

    const priceNum = parseFloat(form.monthly_price);
    if (isNaN(priceNum) || priceNum < 0) return;

    const monthly_price_cents = Math.round(priceNum * 100);

    await upsertPlan.mutateAsync({
      id: selectedPlanId === "new" ? undefined : selectedPlanId,
      name: form.name,
      monthly_price_cents,
      is_active: form.is_active,
    });

    if (selectedPlanId === "new") {
      setSelectedPlanId(""); // Deselect to show it in the list
    }
  };

  return (
    <ProviderLayout title="Planes y Tarifas" subtitle="Configura los precios, módulos incluidos y disponibilidad comercial">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="etymon-surface p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Planes Activos</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelectPlan("new")}
                className="h-7 px-2 text-[#00e7a7] hover:bg-[#00e7a7]/10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              </div>
            ) : (
              <div className="space-y-2">
                {selectedPlanId === "new" && (
                  <div className="w-full rounded-lg border border-[#00e7a7]/55 bg-[#00e7a7]/10 px-3 py-3 text-left transition-colors">
                    <p className="text-sm font-medium text-slate-100">Nuevo Plan</p>
                    <p className="mt-0.5 text-xs text-[#00e7a7]">Configuración en progreso...</p>
                  </div>
                )}
                
                {(plans ?? []).map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                      selectedPlanId === plan.id
                        ? "border-[#00e7a7]/55 bg-[#00e7a7]/10 text-slate-100"
                        : "border-[#2d2d2d] bg-[#171717] text-slate-300 hover:border-[#3a3a3a]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{plan.name}</p>
                      {!plan.is_active && (
                        <span className="rounded bg-[#ff6b6b]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#ffb0b0]">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatCop(plan.monthly_price_cents)} / mes
                    </p>
                  </button>
                ))}

                {!plans?.length && selectedPlanId !== "new" && (
                  <p className="text-center text-xs text-slate-500 py-4">No hay planes creados</p>
                )}
              </div>
            )}
          </aside>

          <article className="etymon-surface p-5">
            {selectedPlanId ? (
              <>
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00e7a7]/10">
                      <Settings2 className="h-5 w-5 text-[#00e7a7]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-100">
                        {selectedPlanId === "new" ? "Crear Nuevo Plan" : "Editar Plan"}
                      </h3>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Configuración de facturación mensual
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <div className="lg:col-span-2">
                      <ProviderFloatingInput
                        label="Nombre del plan"
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <ProviderFloatingInput
                        type="number"
                        label="Precio Mensual (COP) sin puntos ni comas"
                        value={form.monthly_price}
                        onChange={(e) => setForm((prev) => ({ ...prev, monthly_price: e.target.value }))}
                        required
                        min="0"
                      />
                      <p className="mt-1.5 text-[10px] uppercase tracking-wider text-slate-500">
                        Ej: Para $299.000 ingresa 299000
                      </p>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border border-[#2d2d2d] bg-[#141414] px-4 py-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-200">Plan Comercial Activo</p>
                        <p className="text-[11px] text-slate-500">Disponible para nuevas suscripciones</p>
                      </div>
                      <Switch
                        checked={form.is_active}
                        onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
                      />
                    </div>
                  </div>

                  {selectedPlan && (
                    <div className="mt-6 rounded-lg border border-[#00e7a7]/20 bg-[#00e7a7]/5 p-4">
                      <div className="flex items-start gap-3">
                        <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-[#00e7a7]" />
                        <div>
                          <h4 className="text-sm font-medium text-slate-200">Vista Previa de Facturación</h4>
                          <p className="mt-1 text-xs text-slate-400">
                            Las instituciones suscritas a este plan generarán un MRR de{" "}
                            <strong className="text-[#9cf7df]">
                              {form.monthly_price ? formatCop(parseFloat(form.monthly_price) * 100) : "$0"}
                            </strong>{" "}
                            al mes. Ten en cuenta que los cambios aplicarán para el siguiente ciclo de cobro.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2d2d2d]">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setSelectedPlanId("")}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={upsertPlan.isPending || !form.name || !form.monthly_price}
                      className="etymon-btn-primary min-w-32"
                    >
                      {upsertPlan.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Guardar Plan"
                      )}
                    </Button>
                  </div>
                </form>

                {/* ── Module Entitlements ────────────────────────────────── */}
                {selectedPlanId !== "new" && (
                  <PlanModulesSection planId={selectedPlanId} />
                )}
              </>
            ) : (
              <ProviderEmptyState
                title="Selecciona un plan"
                description="Elige un plan de la lista para editar su precio, estado y módulos incluidos, o crea uno nuevo para tu portafolio."
              />
            )}
          </article>
        </section>
      </div>
    </ProviderLayout>
  );
}
