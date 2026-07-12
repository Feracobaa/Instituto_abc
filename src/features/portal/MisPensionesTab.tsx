import { useMemo } from "react";
import { CheckCircle2, AlertCircle, XCircle, DollarSign, Loader2, Calendar } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useGuardianAccount } from "@/hooks/useSchoolData";
import { useGuardianTuitionStatus } from "@/hooks/school/useGuardianPortalExtras";
import { cn } from "@/lib/utils";

import { normalizeLegacyAmount } from "@/features/contabilidad/utils";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; badge: string }> = {
  paid:      { label: "Al día",    icon: CheckCircle2, badge: "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 text-xs" },
  pending:   { label: "Pendiente", icon: AlertCircle,  badge: "border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 text-xs" },
  partial:   { label: "Parcial",   icon: AlertCircle,  badge: "border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 text-xs" },
};

const fmt = (val: number | null) => {
  if (val == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(normalizeLegacyAmount(val));
};

const monthLabel = (ym: string | null) => {
  if (!ym) return "—";
  const [y, m] = ym.split("-");
  const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
};

export default function MisPensionesTab() {
  const guardianAccountQuery = useGuardianAccount();
  const student = guardianAccountQuery.data?.students ?? null;
  const { data: records = [], isLoading } = useGuardianTuitionStatus(student?.id);

  const stats = useMemo(() => {
    const totalExpected = records.reduce((s, r) => s + (r.expected_amount ?? 0), 0);
    const totalPaid     = records.reduce((s, r) => s + (r.paid_amount ?? 0), 0);
    const totalPending  = records.reduce((s, r) => s + (r.pending_amount ?? 0), 0);
    const pendingMonths = records.filter((r) => r.status !== "paid").length;
    return { totalExpected, totalPaid, totalPending, pendingMonths };
  }, [records]);

  if (guardianAccountQuery.isLoading || isLoading) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!student) {
    return <EmptyState icon={DollarSign} title="Sin estudiante vinculado" description="Rectoría debe revisar la cuenta." />;
  }

  if (records.length === 0) {
    return <EmptyState icon={DollarSign} title="Sin información de pensiones" description="El colegio aún no ha registrado un perfil de pensión para este estudiante." />;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total esperado */}
        <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500/80" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total esperado</p>
              <p className="mt-1 text-2xl font-black text-foreground">{fmt(stats.totalExpected)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Pagado */}
        <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500/80" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Total pagado</p>
              <p className="mt-1 text-2xl font-black text-foreground">{fmt(stats.totalPaid)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Pendiente */}
        <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${stats.totalPending > 0 ? "bg-rose-500/80" : "bg-slate-300 dark:bg-slate-700"}`} />
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${stats.totalPending > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>
                Total pendiente
              </p>
              <p className={`mt-1 text-2xl font-black ${stats.totalPending > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                {fmt(stats.totalPending)}
              </p>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stats.totalPending > 0 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-muted text-muted-foreground"}`}>
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Meses pendientes */}
        <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${stats.pendingMonths > 0 ? "bg-amber-500/80" : "bg-slate-300 dark:bg-slate-700"}`} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meses pendientes</p>
              <p className={`mt-1 text-2xl font-black ${stats.pendingMonths > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                {stats.pendingMonths}
              </p>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stats.pendingMonths > 0 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>
              <Calendar className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Month-by-month table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="w-full">
          <thead className="bg-secondary/60">
            <tr>
              <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Mes</th>
              <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Esperado</th>
              <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Pagado</th>
              <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Pendiente</th>
              <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Estado</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const cfg = STATUS_CONFIG[r.status ?? "pending"] ?? STATUS_CONFIG["pending"];
              const Icon = cfg.icon;
              return (
                <tr key={r.period_month} className="border-t border-border hover:bg-muted/30 transition-colors duration-150">
                  <td className="px-4 py-4 text-sm font-semibold text-foreground">{monthLabel(r.period_month)}</td>
                  <td className="px-4 py-4 text-sm text-right text-muted-foreground hidden sm:table-cell">{fmt(r.expected_amount)}</td>
                  <td className="px-4 py-4 text-sm text-right text-muted-foreground hidden sm:table-cell">{fmt(r.paid_amount)}</td>
                  <td className="px-4 py-4 text-sm text-right font-semibold text-foreground">{fmt(r.pending_amount)}</td>
                  <td className="px-4 py-4 text-center">
                    <span className={cfg.badge}>
                      <Icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
