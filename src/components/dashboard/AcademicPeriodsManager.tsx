import { useMemo, useState } from "react";
import { CalendarRange, Loader2, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AcademicPeriod } from "@/hooks/useSchoolData";
import { useSetAcademicPeriodState } from "@/hooks/useSchoolData";
import { cn } from "@/lib/utils";

interface AcademicPeriodsManagerProps {
  periods?: AcademicPeriod[] | null;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function AcademicPeriodsManager({ periods }: AcademicPeriodsManagerProps) {
  const setAcademicPeriodState = useSetAcademicPeriodState();
  const [workingPeriodId, setWorkingPeriodId] = useState<string | null>(null);

  const sortedPeriods = useMemo(
    () => [...(periods ?? [])].sort((left, right) => left.start_date.localeCompare(right.start_date)),
    [periods],
  );

  const activePeriods = sortedPeriods.filter((period) => period.is_active);
  const hasNoActivePeriod = activePeriods.length === 0;
  const hasMultipleActivePeriods = activePeriods.length > 1;

  const handleToggle = async (period: AcademicPeriod, shouldActivate: boolean) => {
    setWorkingPeriodId(period.id);
    try {
      await setAcademicPeriodState.mutateAsync({
        id: period.id,
        is_active: shouldActivate,
      });
    } finally {
      setWorkingPeriodId(null);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-card animate-slide-up">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            <h3 className="font-heading font-bold text-foreground">Control de Bimestres</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            El rector decide que bimestre queda activo para registrar o editar calificaciones.
          </p>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          Solo rector
        </span>
      </div>

      {hasNoActivePeriod && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          No hay ningun bimestre activo. La plataforma quedara en solo lectura para notas y
          evaluaciones hasta que actives uno.
        </div>
      )}

      {hasMultipleActivePeriods && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Se detectaron varios bimestres activos. Al activar uno desde aqui, los demas quedaran
          desactivados automaticamente.
        </div>
      )}

      {sortedPeriods.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
          <Lock className="mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">No hay bimestres configurados</p>
          <p className="text-xs text-muted-foreground">
            Crea los periodos academicos en la base antes de operar calificaciones por bimestre.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedPeriods.map((period) => {
            const isWorking = setAcademicPeriodState.isPending && workingPeriodId === period.id;

            return (
              <div
                key={period.id}
                className={cn(
                  "flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
                  period.is_active
                    ? "border-success/30 bg-success/5"
                    : "border-border bg-background",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-foreground">{period.name}</p>
                    {period.is_active ? (
                      <span className="rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                        Activo
                      </span>
                    ) : (
                      <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(period.start_date)} - {formatDate(period.end_date)}
                  </p>
                </div>

                <div className="flex gap-2">
                  {period.is_active ? (
                    <Button
                      variant="outline"
                      onClick={() => handleToggle(period, false)}
                      disabled={setAcademicPeriodState.isPending}
                    >
                      {isWorking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Desactivar
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleToggle(period, true)}
                      disabled={setAcademicPeriodState.isPending}
                      className="gap-2"
                    >
                      {isWorking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldAlert className="h-4 w-4" />
                      )}
                      Activar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
