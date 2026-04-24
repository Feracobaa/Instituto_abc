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
      <ProviderLayout title="ETYMON Overview" subtitle="Monitoreo operativo para instituciones y suscripciones">
        <div className="flex min-h-[48vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout title="ETYMON Overview" subtitle="Monitoreo operativo para instituciones y suscripciones">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <ProviderKpiCard
            title="Active Institutions"
            value={String(activeInstitutions)}
            subtitle="Tenants productivos"
            trend="up"
            trendLabel="+6.4%"
            points={makeTrend(Math.max(activeInstitutions - 1, 1), 1.4)}
          />
          <ProviderKpiCard
            title="Trial Pipeline"
            value={String(trialingInstitutions)}
            subtitle="Instituciones en onboarding"
            trend={trialingInstitutions > 0 ? "up" : "down"}
            trendLabel={trialingInstitutions > 0 ? "+2.1%" : "-0.4%"}
            points={makeTrend(Math.max(trialingInstitutions, 1), 1)}
          />
          <ProviderKpiCard
            title="Past Due"
            value={String(pastDueInstitutions)}
            subtitle="Cobros que requieren gestion"
            trend={pastDueInstitutions > 0 ? "down" : "up"}
            trendLabel={pastDueInstitutions > 0 ? "-1.2%" : "+0.8%"}
            points={makeTrend(Math.max(pastDueInstitutions, 1), 0.9)}
          />
          <ProviderKpiCard
            title="MRR Expected"
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
              <ScrollText className="h-4 w-4 text-cyan-300" />
              <h3 className="text-sm font-semibold tracking-wide text-slate-100">Operational Activity</h3>
            </div>

            {auditLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              </div>
            ) : auditLogs && auditLogs.length > 0 ? (
              <div className="space-y-2">
                {auditLogs.slice(0, 8).map((log) => (
                  <div key={log.id} className="rounded-lg border border-[#2d2d2d] bg-[#171717] px-3 py-2">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-medium text-slate-100">{log.action}</p>
                      <p className="text-[11px] text-slate-500">{new Date(log.created_at).toLocaleString("es-CO")}</p>
                    </div>
                    <p className="text-xs text-slate-400">
                      {log.table_name}
                      {log.record_id ? ` - ${log.record_id}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <ProviderEmptyState
                title="No hay actividad registrada"
                description="Cuando ETYMON ejecute cambios operativos o sesiones de soporte, apareceran aqui con trazabilidad completa."
              />
            )}
          </article>

          <article className="etymon-surface p-5 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#00e7a7]" />
              <h3 className="text-sm font-semibold tracking-wide text-slate-100">Commercial Pulse</h3>
            </div>

            <div className="space-y-3">
              {firstCustomer ? (
                <div className="rounded-lg border border-[#00e7a7]/30 bg-[#00e7a7]/10 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9cf7df]">Cliente #1 Activo</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{firstCustomer.institution.name}</p>
                  <p className="text-xs text-slate-400">{firstCustomer.institution.slug}</p>
                </div>
              ) : (
                <ProviderEmptyState
                  title="Sin cliente bandera"
                  description="Marca una institucion como cliente #1 para visibilidad comercial en el dashboard ETYMON."
                />
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[#2d2d2d] bg-[#171717] p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Tenants Totales</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-100">{summaries.length}</p>
                </div>
                <div className="rounded-lg border border-[#2d2d2d] bg-[#171717] p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Subscriptions Active</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-100">{activeSubscriptions}</p>
                </div>
              </div>

              <div className="rounded-lg border border-[#2d2d2d] bg-[#171717] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Health Note</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {pastDueInstitutions > 0
                        ? `Hay ${pastDueInstitutions} instituciones en estado past_due. Prioriza recuperacion en Suscripciones.`
                        : "No hay cartera vencida. El ritmo comercial actual es estable."}
                    </p>
                  </div>
                  <Sparkles className="h-4 w-4 text-cyan-300" />
                </div>
              </div>
            </div>
          </article>
        </section>
      </div>
    </ProviderLayout>
  );
}
