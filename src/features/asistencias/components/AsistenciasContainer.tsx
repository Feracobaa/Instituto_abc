import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ClipboardCheck, Loader2, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAcademicPeriods } from "@/hooks/useSchoolData";
import {
  useAttendanceClassContexts,
  useAttendanceStudents,
  useSaveStudentAttendance,
  useStudentAttendance,
} from "../hooks/useAttendance";
import type { AttendanceStatus } from "@/hooks/school/types";
import { toast } from "@/components/ui/sonner";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";
import {
  buildAttendanceDraftFromData,
  buildAttendanceSaveRows,
  isDateWithinPeriod,
  type AttendanceDraftMap,
} from "@/features/asistencias/helpers";
import { MobileFacialScanner } from "@/components/biometrics/MobileFacialScanner";
import { useBiometrics } from "@/hooks/school/useBiometrics";
import type { StudentBiometric } from "@/types/biometrics";
import { AttendanceFilterHeader } from "./AttendanceFilterHeader";
import { AttendanceSummaryBadges } from "./AttendanceSummaryBadges";
import { AttendanceActionButtons } from "./AttendanceActionButtons";
import { AttendanceStudentTable } from "./AttendanceStudentTable";

function buildTodayISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AsistenciasContainer() {
  const { teacherId, userRole } = useAuth();
  const isMobile = useIsMobile();
  const isRector = userRole === "rector";

  const [selectedDate, setSelectedDate] = useState(buildTodayISODate);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [draftMap, setDraftMap] = useState<AttendanceDraftMap>({});
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [registeredBiometrics, setRegisteredBiometrics] = useState<StudentBiometric[]>([]);

  const { getBiometricsForStudents, loading: isLoadingBiometrics } = useBiometrics();

  const periodsQuery = useAcademicPeriods();
  const classContextsQuery = useAttendanceClassContexts({
    date: selectedDate,
    teacherId: isRector ? undefined : teacherId || undefined,
  });

  const periods = periodsQuery.data;
  const allClassContexts = useMemo(
    () => classContextsQuery.data ?? [],
    [classContextsQuery.data],
  );

  const activePeriod = periods?.find((period) => period.is_active) ?? null;
  const canEditDate = isDateWithinPeriod(selectedDate, activePeriod);

  const teacherOptions = useMemo(() => {
    const optionsMap = new Map<string, { id: string; name: string }>();
    allClassContexts.forEach((context) => {
      if (!optionsMap.has(context.teacher_id)) {
        optionsMap.set(context.teacher_id, {
          id: context.teacher_id,
          name: context.teacher_name,
        });
      }
    });
    return [...optionsMap.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [allClassContexts]);

  useEffect(() => {
    if (!isRector && teacherId) {
      setSelectedTeacher(teacherId);
      return;
    }
    if (isRector && !selectedTeacher && teacherOptions.length === 1) {
      setSelectedTeacher(teacherOptions[0].id);
    }
  }, [isRector, selectedTeacher, teacherId, teacherOptions]);

  useEffect(() => {
    if (isRector && selectedTeacher && !teacherOptions.some((opt) => opt.id === selectedTeacher)) {
      setSelectedTeacher("");
    }
  }, [isRector, selectedTeacher, teacherOptions]);

  const teacherScopedContexts = useMemo(() => {
    if (!isRector || !selectedTeacher) return allClassContexts;
    return allClassContexts.filter((c) => c.teacher_id === selectedTeacher);
  }, [allClassContexts, isRector, selectedTeacher]);

  const gradeOptions = useMemo(() => {
    const optionsMap = new Map<string, { id: string; name: string }>();
    teacherScopedContexts.forEach((c) => {
      if (!optionsMap.has(c.grade_id)) {
        optionsMap.set(c.grade_id, { id: c.grade_id, name: c.grade_name });
      }
    });
    return [...optionsMap.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [teacherScopedContexts]);

  useEffect(() => {
    if (selectedGrade && !gradeOptions.some((opt) => opt.id === selectedGrade)) {
      setSelectedGrade("");
      setSelectedSubject("");
    }
  }, [selectedGrade, gradeOptions]);

  const gradeScopedContexts = useMemo(() => {
    if (!selectedGrade) return teacherScopedContexts;
    return teacherScopedContexts.filter((c) => c.grade_id === selectedGrade);
  }, [selectedGrade, teacherScopedContexts]);

  const subjectOptions = useMemo(() => {
    const optionsMap = new Map<string, { id: string; name: string }>();
    gradeScopedContexts.forEach((c) => {
      if (!optionsMap.has(c.subject_id)) {
        optionsMap.set(c.subject_id, { id: c.subject_id, name: c.subject_name });
      }
    });
    return [...optionsMap.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [gradeScopedContexts]);

  useEffect(() => {
    if (selectedSubject && !subjectOptions.some((opt) => opt.id === selectedSubject)) {
      setSelectedSubject("");
    }
  }, [selectedSubject, subjectOptions]);

  const effectiveTeacherId = isRector ? selectedTeacher : teacherId || "";

  const selectedContext = useMemo(() => {
    if (!selectedGrade || !selectedSubject || !effectiveTeacherId) return null;
    return (
      allClassContexts.find(
        (c) =>
          c.grade_id === selectedGrade
          && c.subject_id === selectedSubject
          && c.teacher_id === effectiveTeacherId,
      ) ?? null
    );
  }, [allClassContexts, effectiveTeacherId, selectedGrade, selectedSubject]);

  const studentsQuery = useAttendanceStudents(selectedContext?.grade_id);
  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);

  const attendanceQuery = useStudentAttendance(
    selectedContext
      ? {
          date: selectedDate,
          gradeId: selectedContext.grade_id,
          subjectId: selectedContext.subject_id,
          teacherId: selectedContext.teacher_id,
        }
      : undefined,
  );

  const attendanceRecords = useMemo(() => attendanceQuery.data ?? [], [attendanceQuery.data]);
  const contextKey = selectedContext
    ? `${selectedDate}|${selectedContext.grade_id}|${selectedContext.subject_id}|${selectedContext.teacher_id}`
    : "";

  const attendanceSummary = useMemo(() => {
    const summary = { present: 0, absent: 0, justified: 0, pending: 0 };
    students.forEach((student) => {
      const status = draftMap[student.id]?.status;
      if (!status) {
        summary.pending += 1;
        return;
      }
      summary[status] += 1;
    });
    return summary;
  }, [draftMap, students]);

  useEffect(() => {
    if (!selectedContext) {
      setDraftMap({});
      return;
    }
    setDraftMap((prevDraft) => {
      const initial = buildAttendanceDraftFromData(students, attendanceRecords);
      const merged = { ...initial };
      Object.keys(prevDraft).forEach((studentId) => {
        if (prevDraft[studentId]?.status) {
          merged[studentId] = prevDraft[studentId];
        }
      });
      return merged;
    });
  }, [attendanceRecords, contextKey, selectedContext, students]);

  const saveAttendance = useSaveStudentAttendance();

  const pageError =
    periodsQuery.error || classContextsQuery.error || studentsQuery.error || attendanceQuery.error;
  const isLoading =
    periodsQuery.isLoading
    || classContextsQuery.isLoading
    || studentsQuery.isLoading
    || attendanceQuery.isLoading;

  const setDraftStatus = (studentId: string, status: AttendanceStatus | "") => {
    setDraftMap((prev) => ({
      ...prev,
      [studentId]: {
        justification_note: status === "justified" ? (prev[studentId]?.justification_note ?? "") : "",
        status,
      },
    }));
  };

  const setDraftNote = (studentId: string, value: string) => {
    setDraftMap((prev) => ({
      ...prev,
      [studentId]: {
        justification_note: value,
        status: prev[studentId]?.status ?? "",
      },
    }));
  };

  const handleOpenScanner = async () => {
    if (!students.length) {
      toast.warning("No hay estudiantes en la lista para escanear.");
      return;
    }
    try {
      const biometrics = await getBiometricsForStudents(students.map((s) => s.id));
      if (!biometrics.length) {
        toast.info("Ningún estudiante de este grado tiene huella facial registrada aún.");
      }
      setRegisteredBiometrics(biometrics);
      setIsScannerOpen(true);
    } catch {
      toast.error("Error al cargar las huellas faciales del curso.");
    }
  };

  const markAllPresent = () => {
    setDraftMap((prev) => {
      const next = { ...prev };
      students.forEach((s) => {
        next[s.id] = { justification_note: "", status: "present" };
      });
      return next;
    });
  };

  const markUnmarkedAsAbsent = () => {
    setDraftMap((prev) => {
      const next = { ...prev };
      students.forEach((s) => {
        if (!next[s.id]?.status) {
          next[s.id] = { justification_note: "", status: "absent" };
        }
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedContext) {
      toast({ description: "Selecciona docente, grado y materia para continuar.", title: "Faltan filtros", variant: "destructive" });
      return;
    }
    if (!canEditDate) {
      toast({ description: "Solo puedes editar asistencia para fechas dentro del periodo academico activo.", title: "Fecha en modo solo lectura", variant: "destructive" });
      return;
    }
    if (!selectedContext.is_scheduled_for_selected_date) {
      toast({ description: "No hay clase programada para ese docente, grado y materia en la fecha seleccionada.", title: "Clase no programada", variant: "destructive" });
      return;
    }
    const { missingStudentIds, rows } = buildAttendanceSaveRows(students, draftMap);
    if (missingStudentIds.length > 0) {
      toast({ description: "Debes marcar estado para todos los estudiantes antes de guardar.", title: "Lista incompleta", variant: "destructive" });
      return;
    }
    try {
      await saveAttendance.mutateAsync({
        attendance_date: selectedDate,
        grade_id: selectedContext.grade_id,
        rows,
        subject_id: selectedContext.subject_id,
        teacher_id: selectedContext.teacher_id,
      });
    } catch (error) {
      toast({ description: getFriendlyErrorMessage(error), title: "No fue posible guardar la asistencia", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-gradient-to-br from-background via-background to-muted/60 p-5 shadow-card">
        <h1 className="font-heading text-2xl font-bold text-foreground">Asistencias</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro diario por fecha, grado y materia para profesores y rectoria.
        </p>
      </div>

      <AttendanceFilterHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        isRector={isRector}
        selectedTeacher={selectedTeacher}
        onTeacherChange={setSelectedTeacher}
        teacherOptions={teacherOptions}
        selectedGrade={selectedGrade}
        onGradeChange={setSelectedGrade}
        gradeOptions={gradeOptions}
        selectedSubject={selectedSubject}
        onSubjectChange={setSelectedSubject}
        subjectOptions={subjectOptions}
        selectedContext={selectedContext}
      />

      {pageError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No fue posible cargar el modulo</AlertTitle>
          <AlertDescription>{getFriendlyErrorMessage(pageError)}</AlertDescription>
        </Alert>
      )}

      {selectedContext && !canEditDate && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Fecha en solo lectura</AlertTitle>
          <AlertDescription>
            La asistencia solo se puede editar para fechas dentro del periodo academico activo.
          </AlertDescription>
        </Alert>
      )}

      {selectedContext && canEditDate && !selectedContext.is_scheduled_for_selected_date && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sin clase programada ese dia</AlertTitle>
          <AlertDescription>
            El docente tiene asignada esta materia en el grado, pero no hay bloque de horario en la
            fecha seleccionada.
          </AlertDescription>
        </Alert>
      )}

      {!selectedDate ? (
        <EmptyState icon={ClipboardCheck} title="Selecciona una fecha" description="Elige la fecha para listar las clases programadas." />
      ) : isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : allClassContexts.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Sin clases asignadas" description="No hay materias academicas asignadas para el docente seleccionado." />
      ) : !selectedContext ? (
        <EmptyState icon={ClipboardCheck} title="Selecciona docente, grado y materia" description="Debes elegir un contexto de clase para cargar la asistencia." />
      ) : students.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Sin estudiantes activos" description="El grado seleccionado no tiene estudiantes activos para registrar asistencia." />
      ) : (
        <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-card">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <AttendanceSummaryBadges studentsCount={students.length} attendanceSummary={attendanceSummary} />
            <AttendanceActionButtons
              canEditDate={canEditDate}
              isSaving={saveAttendance.isPending}
              isLoadingBiometrics={isLoadingBiometrics}
              hasContext={Boolean(selectedContext?.is_scheduled_for_selected_date)}
              studentsCount={students.length}
              onOpenScanner={handleOpenScanner}
              onMarkAllPresent={markAllPresent}
              onMarkUnmarkedAsAbsent={markUnmarkedAsAbsent}
              onSave={handleSave}
            />
          </div>

          <AttendanceStudentTable
            students={students}
            draftMap={draftMap}
            isMobile={isMobile}
            canEditDate={canEditDate}
            isSaving={saveAttendance.isPending}
            onSetDraftStatus={setDraftStatus}
            onSetDraftNote={setDraftNote}
          />
        </div>
      )}

      {isScannerOpen && selectedContext && (
        <MobileFacialScanner
          students={students.map((s) => ({ id: s.id, name: s.full_name }))}
          registeredBiometrics={registeredBiometrics}
          offlineContext={{
            gradeId: selectedContext.grade_id,
            subjectId: selectedContext.subject_id,
            teacherId: selectedContext.teacher_id,
          }}
          onAttendanceMarked={(studentId, status) => {
            setDraftStatus(studentId, status);
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
}
