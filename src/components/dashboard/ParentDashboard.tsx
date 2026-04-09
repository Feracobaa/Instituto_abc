import { Calendar, ClipboardList, Loader2, MapPin, Phone, Users } from "lucide-react";
import { QuickActionsBar } from "@/components/dashboard/QuickActionsBar";
import { StatCard } from "@/components/dashboard/StatCard";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  useAcademicPeriods,
  useGuardianAccount,
  useGuardianGradeRecords,
  useGuardianSchedules,
  usePreescolarEvaluations,
} from "@/hooks/useSchoolData";
import { isPreescolarGradeName } from "@/features/calificaciones/helpers";

const dayNames = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];

export function ParentDashboard() {
  const guardianAccountQuery = useGuardianAccount();
  const periodsQuery = useAcademicPeriods();

  const student = guardianAccountQuery.data?.students ?? null;
  const periods = periodsQuery.data ?? [];
  const activePeriod = periods.find((period) => period.is_active) ?? periods[0];
  const isPreescolar = isPreescolarGradeName(student?.grades?.name);

  const gradeRecordsQuery = useGuardianGradeRecords(student?.id, activePeriod?.id);
  const preescolarQuery = usePreescolarEvaluations({
    studentId: student?.id,
    periodId: activePeriod?.id,
  });
  const schedulesQuery = useGuardianSchedules(student?.grade_id ?? undefined);

  const isLoading = guardianAccountQuery.isLoading
    || periodsQuery.isLoading
    || gradeRecordsQuery.isLoading
    || preescolarQuery.isLoading
    || schedulesQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return (
      <EmptyState
        icon={Users}
        title="No encontramos tu estudiante vinculado"
        description="Pide al rector revisar la cuenta del portal estudiantil para vincularla correctamente al estudiante."
      />
    );
  }

  const gradeRecords = gradeRecordsQuery.data ?? [];
  const preescolarRecords = preescolarQuery.data ?? [];
  const schedules = schedulesQuery.data ?? [];

  const today = new Date().getDay();
  const adjustedDay = today === 0 || today === 6 ? null : today - 1;
  const todaySchedule = adjustedDay === null
    ? []
    : schedules
        .filter((schedule) => schedule.day_of_week === adjustedDay)
        .slice()
        .sort((left, right) => left.start_time.localeCompare(right.start_time));

  const averageGrade = gradeRecords.length > 0
    ? gradeRecords.reduce((accumulator, record) => accumulator + record.grade, 0) / gradeRecords.length
    : null;

  const needsOnboarding = Boolean(
    guardianAccountQuery.data?.must_change_password
    || !guardianAccountQuery.data?.onboarding_completed_at,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Bienvenido, {student.guardian_name || guardianAccountQuery.data?.username || "Acudiente"}
            </h1>
            <RoleBadge role="parent" />
          </div>
          <p className="text-sm text-muted-foreground">
            Seguimiento academico de <span className="font-semibold text-foreground">{student.full_name}</span>
            {" "}({student.grades?.name || "Sin grado"})
          </p>
        </div>
        <QuickActionsBar role="parent" />
      </div>

      {needsOnboarding && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Antes de seguir, completa tu perfil y cambia la contrasena inicial desde la pestaña{" "}
          <span className="font-semibold">Mi Perfil</span>.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Estudiante"
          value={student.full_name}
          icon={Users}
          description={student.grades?.name || "Sin grado"}
          variant="default"
        />
        <StatCard
          title={isPreescolar ? "Evaluaciones" : "Promedio actual"}
          value={isPreescolar ? preescolarRecords.length : averageGrade?.toFixed(1) || "—"}
          icon={ClipboardList}
          description={activePeriod?.name || "Sin bimestre activo"}
          variant={isPreescolar ? "default" : averageGrade && averageGrade >= 3 ? "success" : "default"}
        />
        <StatCard
          title="Clases hoy"
          value={todaySchedule.length}
          icon={Calendar}
          description={adjustedDay === null ? "Fin de semana" : dayNames[adjustedDay]}
          variant="default"
        />
        <StatCard
          title="Perfil"
          value={needsOnboarding ? "Pendiente" : "Completo"}
          icon={MapPin}
          description="Datos del acudiente"
          variant={needsOnboarding ? "warning" : "success"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            <h3 className="font-heading font-bold text-foreground">Datos rapidos</h3>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <span className="font-semibold text-foreground">Acudiente:</span>{" "}
              {student.guardian_name || "Pendiente por completar"}
            </div>
            <div>
              <span className="font-semibold text-foreground">Telefono:</span>{" "}
              {student.guardian_phone || "Pendiente por completar"}
            </div>
            <div>
              <span className="font-semibold text-foreground">Direccion:</span>{" "}
              {student.address || "Pendiente por completar"}
            </div>
            <div>
              <span className="font-semibold text-foreground">Bimestre visible:</span>{" "}
              {activePeriod?.name || "Consulta historica"}
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="font-heading font-bold text-foreground">Horario de hoy</h3>
          </div>
          <div className="space-y-3">
            {todaySchedule.length > 0 ? todaySchedule.map((entry) => (
              <div key={entry.id} className="rounded-lg bg-secondary/50 p-3">
                <p className="text-sm font-semibold text-foreground">
                  {entry.title || entry.subjects?.name || "Bloque"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                </p>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">
                No hay clases programadas para hoy.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
