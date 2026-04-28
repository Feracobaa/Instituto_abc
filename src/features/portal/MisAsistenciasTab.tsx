import { useMemo } from "react";
import { CheckCircle2, XCircle, AlertCircle, Calendar, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useGuardianAccount } from "@/hooks/useSchoolData";
import { useGuardianStudentAttendance } from "@/hooks/school/useGuardianPortalExtras";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; classes: string }> = {
  present:   { label: "Presente",    icon: CheckCircle2, classes: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
  absent:    { label: "Ausente",     icon: XCircle,      classes: "text-rose-600 bg-rose-50 dark:bg-rose-950/40" },
  justified:{ label: "Justificado", icon: AlertCircle,  classes: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
};

export default function MisAsistenciasTab() {
  const guardianAccountQuery = useGuardianAccount();
  const student = guardianAccountQuery.data?.students ?? null;
  const { data: records = [], isLoading } = useGuardianStudentAttendance(student?.id);

  const stats = useMemo(() => ({
    present:    records.filter((r) => r.status === "present").length,
    absent:     records.filter((r) => r.status === "absent").length,
    justified:  records.filter((r) => r.status === "justified").length,
    total:       records.length,
  }), [records]);

  if (guardianAccountQuery.isLoading || isLoading) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!student) {
    return <EmptyState icon={Calendar} title="Sin estudiante vinculado" description="Rectoría debe revisar la cuenta." />;
  }

  if (records.length === 0) {
    return <EmptyState icon={Calendar} title="Sin registros de asistencia" description="Aún no hay registros para este estudiante." />;
  }

  const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Asistencia</p>
          <p className={cn("mt-1 text-3xl font-bold", attendanceRate >= 80 ? "text-emerald-600" : "text-rose-600")}>
            {attendanceRate}%
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Presentes</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{stats.present}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Ausencias</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{stats.absent}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Justificadas</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{stats.justified}</p>
        </div>
      </div>

      {/* Record list */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <table className="w-full">
          <thead className="bg-secondary/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Materia</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG["present"];
              const Icon = cfg.icon;
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 text-sm text-foreground">
                    {format(new Date(r.attendance_date + "T12:00:00"), "dd MMM yyyy", { locale: es })}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                    {r.subjects?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", cfg.classes)}>
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
