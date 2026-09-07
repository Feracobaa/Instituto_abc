import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAcademicPeriods, useSchedules } from "@/hooks/useSchoolData";
import {
  useAttendanceClassContexts,
  useAttendanceStudents,
  useSaveStudentAttendance,
  useStudentAttendance,
} from "../hooks/useAttendance";
import { useAttendanceSelection, buildTodayISODate } from "../hooks/useAttendanceSelection";
import { useAttendanceDraft } from "../hooks/useAttendanceDraft";
import { toast } from "@/components/ui/sonner";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";
import {
  buildAttendanceSaveRows,
  isDateWithinPeriod,
} from "@/features/asistencias/helpers";
import { useBiometrics } from "@/hooks/school/useBiometrics";
import type { StudentBiometric } from "@/types/biometrics";
import { AttendanceFilterHeader } from "./AttendanceFilterHeader";
import { AttendanceSummaryBadges } from "./AttendanceSummaryBadges";
import { AttendanceActionButtons } from "./AttendanceActionButtons";
import { AttendanceStudentTable } from "./AttendanceStudentTable";
import { AttendanceStateFeedback } from "./AttendanceStateFeedback";
import { ClassFacialScannerModal } from "../scanner";

export function AsistenciasContainer() {
  const { teacherId, userRole } = useAuth();
  const isMobile = useIsMobile();
  const isRector = userRole === "rector";

  const [selectedDate, setSelectedDate] = useState(buildTodayISODate);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [registeredBiometrics, setRegisteredBiometrics] = useState<StudentBiometric[]>([]);

  const { getBiometricsForStudents, loading: isLoadingBiometrics } = useBiometrics();
  const periodsQuery = useAcademicPeriods();
  const schedulesQuery = useSchedules();

  const periods = periodsQuery.data;
  const activePeriod = periods?.find((period) => period.is_active) ?? null;

  const classContextsQuery = useAttendanceClassContexts({
    date: selectedDate,
    teacherId: isRector ? undefined : teacherId || undefined,
  });

  const allClassContexts = useMemo(
    () => classContextsQuery.data ?? [],
    [classContextsQuery.data],
  );

  const {
    activeClass,
    applyActiveClass,
    gradeOptions,
    selectedContext,
    selectedGrade,
    selectedSubject,
    selectedTeacher,
    setSelectedGrade,
    setSelectedSubject,
    setSelectedTeacher,
    subjectOptions,
    teacherOptions,
  } = useAttendanceSelection({
    allClassContexts,
    isRector,
    rawSchedules: schedulesQuery.data,
    selectedDate,
    teacherId,
  });

  const canEditDate = isDateWithinPeriod(selectedDate, activePeriod);

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

  const {
    attendanceSummary,
    draftMap,
    markAllPresent,
    markUnmarkedAsAbsent,
    setDraftNote,
    setDraftStatus,
  } = useAttendanceDraft({
    attendanceRecords,
    contextKey,
    selectedContext,
    students,
  });

  const saveAttendance = useSaveStudentAttendance();

  const pageError =
    periodsQuery.error || classContextsQuery.error || studentsQuery.error || attendanceQuery.error;
  const isLoading =
    periodsQuery.isLoading ||
    classContextsQuery.isLoading ||
    studentsQuery.isLoading ||
    attendanceQuery.isLoading;

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

  const handleSave = async () => {
    if (!selectedContext) {
      toast.error("Selecciona docente, grado y materia para continuar.");
      return;
    }
    if (!canEditDate) {
      toast.error("Solo puedes editar asistencia para fechas dentro del periodo activo.");
      return;
    }
    if (!selectedContext.is_scheduled_for_selected_date) {
      toast.error("No hay clase programada para esta fecha.");
      return;
    }
    const { missingStudentIds, rows } = buildAttendanceSaveRows(students, draftMap);
    if (missingStudentIds.length > 0) {
      toast.error("Debes marcar estado para todos los estudiantes antes de guardar.");
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
      toast.error(getFriendlyErrorMessage(error));
    }
  };

  const hasContent = Boolean(
    selectedDate && !isLoading && allClassContexts.length > 0 && selectedContext && students.length > 0
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-gradient-to-br from-background via-background to-muted/60 p-5 shadow-card">
        <h1 className="font-heading text-2xl font-bold text-foreground">Asistencias</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro diario por fecha, grado y materia para profesores y rectoría.
        </p>
      </div>

      <AttendanceFilterHeader
        activeClass={activeClass}
        onApplyActiveClass={() => applyActiveClass()}
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

      <AttendanceStateFeedback
        pageError={pageError}
        selectedContext={selectedContext}
        canEditDate={canEditDate}
        selectedDate={selectedDate}
        isLoading={isLoading}
        allClassContextsLength={allClassContexts.length}
        studentsCount={students.length}
      />

      {hasContent && (
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

      {/* Escáner Facial por Materia (Inspirado en Software-Asistencia) */}
      {isScannerOpen && selectedContext && (
        <ClassFacialScannerModal
          classContext={{
            grade_name: selectedContext.grade_name,
            subject_name: selectedContext.subject_name,
            teacher_name: selectedContext.teacher_name,
          }}
          students={students}
          draftMap={draftMap}
          registeredBiometrics={registeredBiometrics}
          onMarkStudent={(studentId, status) => {
            setDraftStatus(studentId, status);
          }}
          onMarkUnmarkedAsAbsent={markUnmarkedAsAbsent}
          onSaveAndClose={async () => {
            markUnmarkedAsAbsent();
            await handleSave();
            setIsScannerOpen(false);
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
}
