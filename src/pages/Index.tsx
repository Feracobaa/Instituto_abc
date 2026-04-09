import { MainLayout } from "@/components/layout/MainLayout";
import { ParentDashboard } from "@/components/dashboard/ParentDashboard";
import { AcademicPeriodsManager } from "@/components/dashboard/AcademicPeriodsManager";
import { QuickActionsBar } from "@/components/dashboard/QuickActionsBar";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  ClipboardList,
  GraduationCap,
  LayoutGrid,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  useAcademicPeriods,
  useGradeRecords,
  useGrades,
  useSchedules,
  useStudents,
  useSubjects,
  useTeachers,
} from "@/hooks/useSchoolData";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const dayNames = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];

function StaffDashboard() {
  const { userRole, user, teacherId } = useAuth();
  const isRector = userRole === "rector";
  const displayName = (user?.user_metadata?.full_name || user?.email || "Usuario").split(" ")[0];

  const { data: teachers, isLoading: teachersLoading } = useTeachers();
  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: subjects } = useSubjects();
  const { data: gradeRecords } = useGradeRecords();
  const { data: schedules } = useSchedules();
  const { data: periods } = useAcademicPeriods();
  const { data: grades } = useGrades();

  const isLoading = teachersLoading || studentsLoading;
  const activePeriod = periods?.find((period) => period.is_active);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos dias" : hour < 18 ? "Buenas tardes" : "Buenas noches";

  const averageGrade = gradeRecords && gradeRecords.length > 0
    ? gradeRecords.reduce((accumulator, record) => accumulator + record.grade, 0) / gradeRecords.length
    : 0;

  const today = new Date().getDay();
  const adjustedDay = today === 0 || today === 6 ? 0 : today - 1;
  const allTodaySchedule = schedules
    ?.filter((schedule) => schedule.day_of_week === adjustedDay)
    .sort((left, right) => (left.start_time || "").localeCompare(right.start_time || ""))
    || [];

  const myTodaySchedule = isRector
    ? allTodaySchedule.slice(0, 4)
    : allTodaySchedule.filter((schedule) => schedule.teacher_id === teacherId).slice(0, 4);

  const recentGrades = isRector
    ? (gradeRecords?.slice(0, 5) || [])
    : (gradeRecords?.filter((record) => record.teacher_id === teacherId)?.slice(0, 5) || []);

  const gradesBelow3 = gradeRecords?.filter((record) => record.grade < 3) || [];

  const gradeAverages = grades?.map((grade) => {
    const gradeStudents = students?.filter((student) => student.grade_id === grade.id) ?? [];
    const studentIds = gradeStudents.map((student) => student.id);
    const records = gradeRecords?.filter((record) => studentIds.includes(record.student_id)) ?? [];
    const average = records.length > 0
      ? records.reduce((accumulator, record) => accumulator + record.grade, 0) / records.length
      : null;

    return { average, count: gradeStudents.length, name: grade.name };
  }) ?? [];

  const studentAverages = students?.map((student) => {
    const records = gradeRecords?.filter((record) => record.student_id === student.id) || [];
    const average = records.length > 0
      ? records.reduce((accumulator, record) => accumulator + record.grade, 0) / records.length
      : 0;

    return { ...student, average, gradesCount: records.length };
  }).filter((student) => student.gradesCount > 0) || [];

  const topStudents = [...studentAverages].sort((left, right) => right.average - left.average).slice(0, 5);
  const myGradeRecords = gradeRecords?.filter((record) => record.teacher_id === teacherId) ?? [];
  const myScheduledGrades = new Set(
    schedules?.filter((schedule) => schedule.teacher_id === teacherId).map((schedule) => schedule.grade_id),
  );
  const myRealStudents = students?.filter((student) => student.grade_id && myScheduledGrades.has(student.grade_id)) || [];
  const studentsWithMyGrade = new Set(myGradeRecords.map((record) => record.student_id));
  const pendingCount = Math.max(0, myRealStudents.length - studentsWithMyGrade.size);

  const getGradeColor = (grade: number) => {
    if (grade >= 4.5) return "bg-emerald-500 text-white";
    if (grade >= 4) return "bg-success text-success-foreground";
    if (grade >= 3) return "bg-warning text-warning-foreground";
    if (grade >= 2) return "bg-orange-500 text-white";
    return "bg-destructive text-destructive-foreground";
  };

  const getBarColor = (average: number | null) => {
    if (average === null) return "bg-muted-foreground/20";
    if (average >= 4) return "bg-success";
    if (average >= 3) return "bg-warning";
    return "bg-destructive";
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {greeting}, {displayName}
            </h1>
            <RoleBadge role={userRole as "rector" | "profesor"} />
          </div>
          <p className="text-sm text-muted-foreground">
            {activePeriod
              ? <>Periodo activo: <span className="font-semibold text-foreground">{activePeriod.name}</span></>
              : "Bienvenido al sistema de gestion escolar"}
          </p>
        </div>
        <QuickActionsBar role={userRole as "rector" | "profesor"} />
      </div>

      {isRector && gradesBelow3.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm font-medium">
            {gradesBelow3.length} calificacion{gradesBelow3.length > 1 ? "es" : ""} con rendimiento bajo (menor a 3.0).
          </p>
        </div>
      )}

      {isRector ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Profesores" value={teachers?.length || 0} icon={Users} description="Docentes activos" variant="rector" />
            <StatCard title="Estudiantes" value={students?.length || 0} icon={GraduationCap} description="Estudiantes matriculados" variant="default" />
            <StatCard title="Materias" value={subjects?.length || 0} icon={BookOpen} description="Materias activas" variant="default" />
            <StatCard
              title="Promedio general"
              value={averageGrade.toFixed(1)}
              icon={ClipboardList}
              description="Calificacion promedio"
              variant={averageGrade < 3 ? "default" : "success"}
              alert={averageGrade > 0 && averageGrade < 3}
            />
          </div>

          <AcademicPeriodsManager periods={periods} />

          {gradeAverages.length > 0 && (
            <div className="rounded-xl border bg-card p-6 shadow-card">
              <div className="mb-5 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-bold text-foreground">Rendimiento por grado</h3>
              </div>
              <div className="space-y-3">
                {gradeAverages.map((grade) => (
                  <div key={grade.name} className="flex items-center gap-3">
                    <span className="w-20 truncate text-sm font-semibold text-foreground">{grade.name}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", getBarColor(grade.average))}
                        style={{ width: grade.average !== null ? `${(grade.average / 5) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-bold text-foreground">
                      {grade.average !== null ? grade.average.toFixed(1) : "—"}
                    </span>
                    <span className="w-16 text-xs text-muted-foreground">{grade.count} alum.</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Mis estudiantes" value={myRealStudents.length} icon={GraduationCap} description="Estudiantes en mis clases" variant="profesor" />
          <StatCard
            title="Pendientes"
            value={pendingCount > 0 ? pendingCount : "✓"}
            icon={ClipboardList}
            description={pendingCount > 0 ? "Sin nota en este periodo" : "Todo al dia"}
            variant={pendingCount > 0 ? "warning" : "success"}
            alert={pendingCount > 5}
          />
          <StatCard
            title="Mi promedio"
            value={myGradeRecords.length > 0
              ? (myGradeRecords.reduce((accumulator, record) => accumulator + record.grade, 0) / myGradeRecords.length).toFixed(1)
              : "—"}
            icon={TrendingUp}
            description="Promedio de mis clases"
            variant="default"
          />
          <StatCard title="Clases hoy" value={myTodaySchedule.length} icon={Calendar} description={dayNames[adjustedDay]} variant="default" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-card">
          {isRector ? (
            <>
              <div className="mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                <h3 className="font-heading font-bold text-foreground">Cuadro de honor</h3>
              </div>
              <div className="space-y-3">
                {topStudents.length > 0 ? topStudents.map((student, index) => (
                  <div key={student.id} className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
                          index === 0
                            ? "bg-yellow-100 text-yellow-700"
                            : index === 1
                              ? "bg-slate-200 text-slate-700"
                              : index === 2
                                ? "bg-orange-100 text-orange-800"
                                : "bg-primary/10 text-primary",
                        )}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{student.full_name}</p>
                        <p className="text-xs text-muted-foreground">{student.grades?.name || "Estudiante"}</p>
                      </div>
                    </div>
                    <div className="rounded bg-success/15 px-2 py-1 text-sm font-bold text-success">
                      {student.average.toFixed(1)}
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Award className="mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Aun no hay calificaciones para el cuadro de honor.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h3 className="font-heading font-bold text-foreground">Mi horario de hoy</h3>
                </div>
                <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
                  {dayNames[adjustedDay]}
                </span>
              </div>
              <div className="space-y-2">
                {myTodaySchedule.length > 0 ? myTodaySchedule.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
                    <div className={cn("h-10 w-1 flex-shrink-0 rounded-full", entry.subjects?.color || "bg-primary")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{entry.subjects?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{entry.grades?.name}</p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                      {entry.start_time.slice(0, 5)}
                    </span>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <LayoutGrid className="mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No hay clases programadas para hoy.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <h3 className="font-heading font-bold text-foreground">Calificaciones recientes</h3>
          </div>
          <div className="space-y-2">
            {recentGrades.length > 0 ? recentGrades.map((record) => (
              <div key={record.id} className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{record.students?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{record.subjects?.name}</p>
                </div>
                <div className={cn("ml-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-base font-bold", getGradeColor(record.grade))}>
                  {record.grade}
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClipboardList className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No hay calificaciones registradas.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const { userRole } = useAuth();

  return (
    <MainLayout>
      {userRole === "parent" ? <ParentDashboard /> : <StaffDashboard />}
    </MainLayout>
  );
}
