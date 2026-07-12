import {
  AlertTriangle,
  Building2,
  CreditCard,
  Loader2,
  ScrollText,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { ProviderKpiCard } from "@/components/provider/ProviderKpiCard";
import { ProviderLayout } from "@/components/provider/ProviderLayout";
import { ProviderEmptyState } from "@/components/provider/ProviderEmptyState";
import { useProviderAuditLogs, useProviderInstitutionSummaries } from "@/hooks/provider";

function currencyFromCents(value: number) {
  return new Intl.NumberFormat("es-CO", {
    currency: "COP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value / 100);
}

function makeTrend(base: number, amplitude: number, steps = 10) {
  return Array.from({ length: steps }, (_, index) => {
    const wave = Math.sin((index / Math.max(steps - 1, 1)) * Math.PI);
    return Number((base + wave * amplitude + index * 0.12).toFixed(2));
  });
}

export default function EtymonDashboard() {
  const { data: institutionSummaries, isLoading } = useProviderInstitutionSummaries();
  const { data: auditLogs, isLoading: auditLoading } = useProviderAuditLogs();

  const summaries = institutionSummaries ?? [];
  const activeInstitutions = summaries.filter((row) => row.institution.is_active).length;
  const trialingInstitutions = summaries.filter((row) => row.subscription?.status === "trialing").length;
  const pastDueInstitutions = summaries.filter((row) => row.subscription?.status === "past_due").length;
  const activeSubscriptions = summaries.filter((summary) => summary.subscription?.status === "active").length;

  const expectedMrrCents = summaries.reduce((accumulator, current) => {
    const isBillable = current.subscription?.status === "active";
    const priceCents = current.subscription?.subscription_plans?.monthly_price_cents ?? 0;
    return accumulator + (isBillable ? priceCents : 0);
  }, 0);

  const firstCustomer = summaries.find((summary) => summary.customerAccount?.is_first_customer);

  if (isLoading) {
    return (
      <ProviderLayout title="Resumen de ETYMON" subtitle="Monitoreo operativo para instituciones y suscripciones">
        <div className="flex min-h-[48vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout title="Resumen de ETYMON" subtitle="Monitoreo operativo para instituciones y suscripciones">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <ProviderKpiCard
            title="Instituciones activas"
            value={String(activeInstitutions)}
            subtitle="Colegios en producción"
            trend="up"
            trendLabel="+6.4%"
            points={makeTrend(Math.max(activeInstitutions - 1, 1), 1.4)}
          />
          <ProviderKpiCard
            title="Periodos de prueba"
            value={String(trialingInstitutions)}
            subtitle="Colegios en inducción"
            trend={trialingInstitutions > 0 ? "up" : "down"}
            trendLabel={trialingInstitutions > 0 ? "+2.1%" : "-0.4%"}
            points={makeTrend(Math.max(trialingInstitutions, 1), 1)}
          />
          <ProviderKpiCard
            title="Suscripciones en mora"
            value={String(pastDueInstitutions)}
            subtitle="Cobros pendientes de gestión"
            trend={pastDueInstitutions > 0 ? "down" : "up"}
            trendLabel={pastDueInstitutions > 0 ? "-1.2%" : "+0.8%"}
            points={makeTrend(Math.max(pastDueInstitutions, 1), 0.9)}
          />
          <ProviderKpiCard
            title="Recaudo mensual esperado (MRR)"
            value={currencyFromCents(expectedMrrCents)}
            subtitle={`${activeSubscriptions} suscripciones activas`}
            trend="up"
            trendLabel="+8.7%"
            points={makeTrend(Math.max(expectedMrrCents / 100000, 1), 2)}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <article className="etymon-surface p-5 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
            <div className="mb-4 flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold tracking-tight text-[var(--et-text)]">Actividad operativa</h3>
            </div>

            {auditLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              </div>
            ) : auditLogs && auditLogs.length > 0 ? (
              <div className="space-y-2.5">
                {auditLogs.slice(0, 8).map((log) => (
                  <div key={log.id} className="rounded-xl border border-[var(--et-border)] bg-[var(--et-chip-bg)] px-4 py-3 shadow-sm transition-all hover:bg-white/[0.01]">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold text-[var(--et-text)]">{log.action}</p>
                      <p className="text-[10px] text-[var(--et-text-muted)]">{new Date(log.created_at).toLocaleString("es-CO")}</p>
                    </div>
                    <p className="mt-1 text-xs text-[var(--et-text-subtle)]">
                      {log.table_name}
                      {log.record_id ? ` • ID: ${log.record_id}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <ProviderEmptyState
                title="No hay actividad registrada"
                description="Cuando ETYMON ejecute cambios operativos o sesiones de soporte, aparecerán aquí con trazabilidad completa."
              />
            )}
          </article>

          <article className="etymon-surface p-5 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--et-accent)]" />
              <h3 className="text-sm font-semibold tracking-tight text-[var(--et-text)]">Pulso comercial</h3>
            </div>

            <div className="space-y-4">
              {firstCustomer ? (
                <div className="rounded-xl border border-[var(--et-accent)]/20 bg-[var(--et-accent-soft)] p-4 shadow-sm">
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--et-accent)]">Cliente #1 Activo</p>
                  <p className="mt-1.5 text-sm font-bold text-[var(--et-text)]">{firstCustomer.institution.name}</p>
                  <p className="text-xs text-[var(--et-text-muted)]">{firstCustomer.institution.slug}</p>
                </div>
              ) : (
                <ProviderEmptyState
                  title="Sin cliente bandera"
                  description="Marca una institución como cliente #1 para visibilidad comercial en el dashboard ETYMON."
                />
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--et-border)] bg-[var(--et-chip-bg)] p-4 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--et-text-muted)]">Colegios totales</p>
                  <p className="mt-1.5 text-2xl font-bold tracking-tight text-[var(--et-text)]">{summaries.length}</p>
                </div>
                <div className="rounded-xl border border-[var(--et-border)] bg-[var(--et-chip-bg)] p-4 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--et-text-muted)]">Suscripciones activas</p>
                  <p className="mt-1.5 text-2xl font-bold tracking-tight text-[var(--et-text)]">{activeSubscriptions}</p>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--et-border)] bg-[var(--et-chip-bg)] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--et-text-muted)]">Nota de salud</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--et-text-subtle)]">
                      {pastDueInstitutions > 0
                        ? `Hay ${pastDueInstitutions} instituciones en estado de mora (vencido). Prioriza recuperación en Suscripciones.`
                        : "No hay cartera vencida. El ritmo comercial actual es estable."}
                    </p>
                  </div>
                  <Sparkles className="h-4 w-4 shrink-0 text-cyan-400" />
                </div>
              </div>
            </div>
          </article>
        </section>
      </div>
    </ProviderLayout>
  );
}
