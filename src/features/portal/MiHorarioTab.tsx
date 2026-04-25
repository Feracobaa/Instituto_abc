import { Calendar, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useGuardianAccount, useGuardianSchedules } from "@/hooks/useSchoolData";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

export default function MiHorarioTab() {
  const guardianAccountQuery = useGuardianAccount();
  const student = guardianAccountQuery.data?.students ?? null;
  const schedulesQuery = useGuardianSchedules(student?.grade_id ?? undefined);
  const schedules = schedulesQuery.data ?? [];
  const uniqueTimes = Array.from(new Set(schedules.map((s) => s.start_time.slice(0, 5)))).sort();

  if (guardianAccountQuery.isLoading || schedulesQuery.isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return <EmptyState icon={Calendar} title="Sin estudiante vinculado" description="Rectoría debe revisar la cuenta del portal estudiantil." />;
  }

  if (uniqueTimes.length === 0) {
    return <EmptyState icon={Calendar} title="Sin bloques de horario" description="Cuando rectoría organice el horario, aparecerá aquí." />;
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/60">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hora</th>
              {DAY_NAMES.map((d) => (
                <th key={d} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {uniqueTimes.map((time) => (
              <tr key={time} className="border-t border-border">
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">{time}</td>
                {DAY_NAMES.map((_, dayIndex) => {
                  const entry = schedules.find((s) => s.day_of_week === dayIndex && s.start_time.slice(0, 5) === time);
                  return (
                    <td key={`${time}-${dayIndex}`} className="px-2 py-2 align-top">
                      {entry ? (
                        <div className={cn(
                          "min-h-[72px] rounded-lg px-3 py-2 text-white",
                          entry.title
                            ? "border border-amber-500/30 bg-amber-500/30 text-amber-950 dark:text-amber-100"
                            : entry.subjects?.color || "bg-primary",
                        )}>
                          <p className="text-sm font-semibold">{entry.title || entry.subjects?.name || "Bloque"}</p>
                          <p className="mt-1 text-xs opacity-85">{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}</p>
                        </div>
                      ) : (
                        <div className="min-h-[72px] rounded-lg border border-dashed border-border bg-secondary/30" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
