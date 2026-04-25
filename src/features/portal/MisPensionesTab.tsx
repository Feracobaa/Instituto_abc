import { useMemo } from "react";
import { CheckCircle2, AlertCircle, XCircle, DollarSign, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useGuardianAccount } from "@/hooks/useSchoolData";
import { useGuardianTuitionStatus } from "@/hooks/school/useGuardianPortalExtras";
import { cn } from "@/lib/utils";

import { normalizeLegacyAmount } from "@/features/contabilidad/utils";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; classes: string; badge: string }> = {
  paid:      { label: "Al día",    icon: CheckCircle2, classes: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  pending:   { label: "Pendiente", icon: AlertCircle,  classes: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",     badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  partial:   { label: "Parcial",   icon: AlertCircle,  classes: "text-blue-600 bg-blue-50 dark:bg-blue-950/40",        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total esperado</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{fmt(stats.totalExpected)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Pagado</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{fmt(stats.totalPaid)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Pendiente</p>
          <p className={cn("mt-1 text-2xl font-bold", stats.totalPending > 0 ? "text-rose-600" : "text-foreground")}>
            {fmt(stats.totalPending)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Meses pendientes</p>
          <p className={cn("mt-1 text-2xl font-bold", stats.pendingMonths > 0 ? "text-amber-600" : "text-foreground")}>
            {stats.pendingMonths}
          </p>
        </div>
      </div>

      {/* Month-by-month table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <table className="w-full">
          <thead className="bg-secondary/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mes</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Esperado</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Pagado</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pendiente</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const cfg = STATUS_CONFIG[r.status ?? "pending"] ?? STATUS_CONFIG["pending"];
              const Icon = cfg.icon;
              return (
                <tr key={r.period_month} className="border-t border-border">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{monthLabel(r.period_month)}</td>
                  <td className="px-4 py-3 text-sm text-right text-muted-foreground hidden sm:table-cell">{fmt(r.expected_amount)}</td>
                  <td className="px-4 py-3 text-sm text-right text-muted-foreground hidden sm:table-cell">{fmt(r.paid_amount)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-foreground">{fmt(r.pending_amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", cfg.badge)}>
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
