import { MainLayout } from "@/components/layout/MainLayout";
import { AcademicPeriodsManager } from "@/components/dashboard/AcademicPeriodsManager";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActionsBar } from "@/components/dashboard/QuickActionsBar";
import { RoleBadge } from "@/components/ui/RoleBadge";
import {
  Users, GraduationCap, BookOpen, ClipboardList, Award,
  Loader2, Calendar, LayoutGrid, AlertTriangle, TrendingUp
} from "lucide-react";
import {
  useTeachers, useStudents, useSubjects, useGradeRecords,
  useSchedules, useAcademicPeriods, useGrades
} from "@/hooks/useSchoolData";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const Index = () => {
  const { userRole, user, teacherId } = useAuth();
  const isRector = userRole === 'rector';
  const displayName = (user?.user_metadata?.full_name || user?.email || 'Usuario').split(' ')[0];

  const { data: teachers, isLoading: teachersLoading } = useTeachers();
  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: subjects } = useSubjects();
  const { data: gradeRecords } = useGradeRecords();
  const { data: schedules } = useSchedules();
  const { data: periods } = useAcademicPeriods();
  const { data: grades } = useGrades();

  const isLoading = teachersLoading || studentsLoading;

  const activePeriod = periods?.find(p => p.is_active);

  // Hour greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  // General average
  const averageGrade = gradeRecords && gradeRecords.length > 0
    ? (gradeRecords.reduce((acc, r) => acc + r.grade, 0) / gradeRecords.length)
    : 0;

  // Today's schedule
  const today = new Date().getDay();
  const adjustedDay = today === 0 || today === 6 ? 0 : today - 1;
  const allTodaySchedule = schedules
    ?.filter(s => s.day_of_week === adjustedDay)
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')) || [];

  // Profesor-specific: filter today's schedule by this teacher
  const myTodaySchedule = isRector
    ? allTodaySchedule.slice(0, 4)
    : allTodaySchedule.filter(s => s.teacher_id === teacherId).slice(0, 4);

  // Recent grades
  const recentGrades = isRector 
    ? (gradeRecords?.slice(0, 5) || [])
    : (gradeRecords?.filter(r => r.teacher_id === teacherId)?.slice(0, 5) || []);

  // Rector alert: grades below threshold
  const gradesBelow3 = gradeRecords?.filter(r => r.grade < 3) || [];
  const hasAlert = gradesBelow3.length > 0;

  // Per-grade averages (Rector)
  const gradeAverages = grades?.map(grade => {
    const gradeStudents = students?.filter(s => s.grade_id === grade.id) ?? [];
    const studentIds = gradeStudents.map(s => s.id);
    const records = gradeRecords?.filter(r => studentIds.includes(r.student_id)) ?? [];
    const avg = records.length > 0
      ? records.reduce((a, r) => a + r.grade, 0) / records.length
      : null;
    return { name: grade.name, avg, count: gradeStudents.length };
  }) ?? [];

  // Top 5 Students Global (Rector)
  const studentAverages = students?.map(student => {
    const records = gradeRecords?.filter(r => r.student_id === student.id) || [];
    const avg = records.length > 0 ? records.reduce((a, r) => a + r.grade, 0) / records.length : 0;
    return { ...student, avg, gradesCount: records.length };
  }).filter(s => s.gradesCount > 0) || [];
  const topStudents = [...studentAverages].sort((a, b) => b.avg - a.avg).slice(0, 5);

  const myGradeRecords = gradeRecords?.filter(r => r.teacher_id === teacherId) ?? [];
  
  // Calculate my real students (the ones in my grades)
  const myScheduledGrades = new Set(schedules?.filter(s => s.teacher_id === teacherId).map(s => s.grade_id));
  const myRealStudents = students?.filter(s => s.grade_id && myScheduledGrades.has(s.grade_id)) || [];
  
  const studentsWithMyGrade = new Set(myGradeRecords.map(r => r.student_id));
  // Limit pending count to the students that actually belong to me
  const pendingCount = Math.max(0, myRealStudents.length - studentsWithMyGrade.size);

  const getGradeColor = (grade: number) => {
    if (grade >= 4.5) return 'bg-emerald-500 text-white';
    if (grade >= 4) return 'bg-success text-success-foreground';
    if (grade >= 3) return 'bg-warning text-warning-foreground';
    if (grade >= 2) return 'bg-orange-500 text-white';
    return 'bg-destructive text-destructive-foreground';
  };

  const getBarColor = (avg: number | null) => {
    if (avg === null) return 'bg-muted-foreground/20';
    if (avg >= 4) return 'bg-success';
    if (avg >= 3) return 'bg-warning';
    return 'bg-destructive';
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">

        {/* === GREETING HEADER === */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-foreground font-heading">
                {greeting}, {displayName} 👋
              </h1>
              <RoleBadge role={userRole as 'rector' | 'profesor'} />
            </div>
            <p className="text-sm text-muted-foreground">
              {activePeriod
                ? <>Período activo: <span className="font-semibold text-foreground">{activePeriod.name}</span></>
                : 'Bienvenido al sistema de gestión escolar'
              }
            </p>
          </div>
          <QuickActionsBar role={userRole as 'rector' | 'profesor'} />
        </div>

        {/* === RECTOR STAT CARDS === */}
        {isRector && (
          <>
            {hasAlert && (
              <div className="flex items-center gap-3 px-4 py-3 bg-destructive/8 border border-destructive/25 rounded-xl text-destructive animate-fade-in">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm font-medium">
                  {gradesBelow3.length} calificacion{gradesBelow3.length > 1 ? 'es' : ''} con rendimiento bajo (menor a 3.0). Revisa las calificaciones.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Profesores"
                value={teachers?.length || 0}
                icon={Users}
                description="Docentes activos"
                variant="rector"
              />
              <StatCard
                title="Estudiantes"
                value={students?.length || 0}
                icon={GraduationCap}
                description="Estudiantes matriculados"
                variant="default"
              />
              <StatCard
                title="Materias"
                value={subjects?.length || 0}
                icon={BookOpen}
                description="Materias activas"
                variant="default"
              />
              <StatCard
                title="Promedio General"
                value={averageGrade.toFixed(1)}
                icon={ClipboardList}
                description="Calificación promedio"
                variant={averageGrade < 3 ? 'default' : 'success'}
                alert={averageGrade > 0 && averageGrade < 3}
              />
            </div>

            <AcademicPeriodsManager periods={periods} />

            {/* Promedio por grado */}
            {gradeAverages.length > 0 && (
              <div className="bg-card rounded-xl border shadow-card p-6 animate-slide-up">
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-foreground font-heading">Rendimiento por Grado</h3>
                </div>
                <div className="space-y-3">
                  {gradeAverages.map((g) => (
                    <div key={g.name} className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground w-20 truncate">{g.name}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-700", getBarColor(g.avg))}
                          style={{ width: g.avg !== null ? `${(g.avg / 5) * 100}%` : '0%' }}
                        />
                      </div>
                      <span className="text-sm font-bold w-8 text-right text-foreground">
                        {g.avg !== null ? g.avg.toFixed(1) : '—'}
                      </span>
                      <span className="text-xs text-muted-foreground w-16">{g.count} alum.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* === PROFESOR STAT CARDS === */}
        {!isRector && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Mis Estudiantes"
              value={myRealStudents.length}
              icon={GraduationCap}
              description="Estudiantes en mis clases"
              variant="profesor"
            />
            <StatCard
              title="Calificaciones Pendientes"
              value={pendingCount > 0 ? pendingCount : '✓'}
              icon={ClipboardList}
              description={pendingCount > 0 ? "Sin nota este período" : "Todo al día"}
              variant={pendingCount > 0 ? 'warning' : 'success'}
              alert={pendingCount > 5}
            />
            <StatCard
              title="Mi Promedio"
              value={myGradeRecords.length > 0
                ? (myGradeRecords.reduce((a, r) => a + r.grade, 0) / myGradeRecords.length).toFixed(1)
                : '—'
              }
              icon={TrendingUp}
              description="Promedio de mis clases"
              variant="default"
            />
            <StatCard
              title="Clases Hoy"
              value={myTodaySchedule.length}
              icon={Calendar}
              description={dayNames[adjustedDay]}
              variant="default"
            />
          </div>
        )}

        {/* === BOTTOM PANELS === */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Bottom Panel: Honor Roll for Rector, Schedule for Profesor */}
          <div className="bg-card rounded-xl border shadow-card p-6 animate-slide-up">
            {isRector ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-bold text-foreground font-heading">Cuadro de Honor Top 5</h3>
                </div>
                <div className="space-y-3">
                  {topStudents.length > 0 ? topStudents.map((student, i) => (
                    <div key={student.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm",
                          i === 0 ? "bg-yellow-100 text-yellow-700" :
                          i === 1 ? "bg-slate-200 text-slate-700" :
                          i === 2 ? "bg-orange-100 text-orange-800" : "bg-primary/10 text-primary"
                        )}>
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{student.full_name}</p>
                          <p className="text-xs text-muted-foreground">{student.grades?.name || 'Estudiante'}</p>
                        </div>
                      </div>
                      <div className="px-2 py-1 rounded bg-success/15 text-success font-bold text-sm shadow-sm">
                        {student.avg.toFixed(1)}
                      </div>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Award className="w-8 h-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">Aún no hay calificaciones para el cuadro de honor</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-foreground font-heading">Mi Horario de Hoy</h3>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                    {dayNames[adjustedDay]}
                  </span>
                </div>
                <div className="space-y-2">
                  {myTodaySchedule.length > 0 ? myTodaySchedule.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
                    >
                      <div className={cn("w-1 h-10 rounded-full flex-shrink-0", entry.subjects?.color || 'bg-primary')} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{entry.subjects?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.grades?.name}{entry.teachers?.full_name && ` • ${entry.teachers.full_name}`}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-semibold text-muted-foreground tabular-nums flex-shrink-0">
                        {entry.start_time?.slice(0, 5)}
                      </span>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <LayoutGrid className="w-8 h-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">No hay clases programadas para hoy</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Recent grades */}
          <div className="bg-card rounded-xl border shadow-card p-6 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-foreground font-heading">Calificaciones Recientes</h3>
            </div>
            <div className="space-y-2">
              {recentGrades.length > 0 ? recentGrades.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{record.students?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{record.subjects?.name}</p>
                  </div>
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base flex-shrink-0 ml-3",
                    getGradeColor(record.grade)
                  )}>
                    {record.grade}
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ClipboardList className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No hay calificaciones registradas</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default Index;
