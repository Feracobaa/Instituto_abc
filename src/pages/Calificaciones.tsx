import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ClipboardList, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import type { PreescolarReportHandle } from "@/components/reports/PreescolarReport";
import { MainLayout } from "@/components/layout/MainLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConfirmActionDialog } from "@/components/ui/ConfirmActionDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { CalificacionesFilters } from "@/features/calificaciones/CalificacionesFilters";
import { CalificacionesTable } from "@/features/calificaciones/CalificacionesTable";
import { GradeLegend } from "@/features/calificaciones/GradeLegend";
import { GradeRecordDialog } from "@/features/calificaciones/GradeRecordDialog";
import {
  buildEditablePartialsFromExisting,
  buildEmptyGradeRecord,
  buildEmptyPreescolarEvaluation,
  buildPreescolarCreatePayload,
  buildPreescolarUpdatePayload,
  calculateWeightedFinalGrade,
  deriveRecordSummaryFromPartials,
  getAvailableGradesForRole,
  getTeacherOptionsForSubject,
  getTeachersForGrade,
  getTeacherSubjectsForTeacher,
  getVisibleGradeRecordsForStudent,
  getVisiblePreescolarEvaluationsForStudent,
  isPreescolarGradeName,
  isTeacherAssignedToGrade,
  isTeacherAssignedToSubject,
} from "@/features/calificaciones/helpers";
import { PreescolarEvaluationDialog } from "@/features/calificaciones/PreescolarEvaluationDialog";
import { PreescolarPdfRenderer } from "@/features/calificaciones/PreescolarPdfRenderer";
import type {
  EditableGradeRecord,
  EditablePreescolarEvaluation,
} from "@/features/calificaciones/types";
import {
  useAcademicPeriods,
  useCreatePreescolarEvaluation,
  useDeleteGradeRecord,
  useDeletePreescolarEvaluation,
  useGradeRecordPartials,
  useGradeRecords,
  useGrades,
  usePreescolarEvaluations,
  useSchedules,
  useStudents,
  useSubjects,
  useTeachers,
  useUpdatePreescolarEvaluation,
  useUpsertGradeRecordPartials,
} from "@/hooks/useSchoolData";
import type { GradeRecord, PreescolarEvaluation, Student } from "@/hooks/useSchoolData";
import { getStudentReportSnapshot } from "@/lib/reportCards";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";

const MAX_PREESCOLAR_TEXT_LENGTH = 1000;

type PendingDelete =
  | { id: string; kind: "grade" }
  | { id: string; kind: "preescolar" }
  | null;

const Calificaciones = () => {
  const { userRole, teacherId } = useAuth();
  const isRector = userRole === "rector";

  const gradesQuery = useGrades();
  const periodsQuery = useAcademicPeriods();
  const subjectsQuery = useSubjects();
  const teachersQuery = useTeachers();

  const grades = gradesQuery.data;
  const periods = periodsQuery.data;
  const subjects = subjectsQuery.data;
  const teachers = teachersQuery.data;

  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EditableGradeRecord | null>(null);
  const [preescolarDialogOpen, setPreescolarDialogOpen] = useState(false);
  const [editingPreescolar, setEditingPreescolar] =
    useState<EditablePreescolarEvaluation | null>(null);
  const [downloadingStudent, setDownloadingStudent] = useState<Student | null>(null);
  const [downloadingSnapshot, setDownloadingSnapshot] = useState<Awaited<
    ReturnType<typeof getStudentReportSnapshot>
  > | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  const preescolarRef = useRef<PreescolarReportHandle>(null);

  const activePeriod = periods?.find((period) => period.is_active);
  const selectedPeriodData = periods?.find((period) => period.id === selectedPeriod);
  const selectedGradeData = grades?.find((grade) => grade.id === selectedGrade);
  const isPreescolar = isPreescolarGradeName(selectedGradeData?.name);
  const canManageCurrentPeriod = Boolean(activePeriod && activePeriod.id === selectedPeriod);

  useEffect(() => {
    if (activePeriod && !selectedPeriod) {
      setSelectedPeriod(activePeriod.id);
    }
  }, [activePeriod, selectedPeriod]);

  const teacherSchedulesQuery = useSchedules(
    undefined,
    isRector ? undefined : teacherId || undefined,
  );
  const teacherSchedules = teacherSchedulesQuery.data;

  const availableGrades = getAvailableGradesForRole(grades, teacherSchedules, isRector);
  const availableTeachersForSelectedGrade = getTeachersForGrade(teachers, selectedGrade);

  useEffect(() => {
    if (!isRector && selectedGrade && availableGrades.length > 0) {
      const canStillAccessGrade = availableGrades.some((grade) => grade.id === selectedGrade);
      if (!canStillAccessGrade) {
        setSelectedGrade("");
      }
    }
  }, [availableGrades, isRector, selectedGrade]);

  const studentsQuery = useStudents(selectedGrade || undefined);
  const gradeRecordsQuery = useGradeRecords({
    periodId: selectedPeriod || undefined,
  });
  const gradeRecordPartialsQuery = useGradeRecordPartials({
    periodId: selectedPeriod || undefined,
  });
  const preescolarQuery = usePreescolarEvaluations({
    periodId: selectedPeriod || undefined,
  });

  const students = studentsQuery.data;
  const gradeRecords = gradeRecordsQuery.data;
  const gradeRecordPartials = gradeRecordPartialsQuery.data;
  const preescolarRecords = preescolarQuery.data;

  const upsertGradeRecordPartials = useUpsertGradeRecordPartials();
  const deleteGradeRecord = useDeleteGradeRecord();
  const createPreescolarEvaluation = useCreatePreescolarEvaluation();
  const updatePreescolarEvaluation = useUpdatePreescolarEvaluation();
  const deletePreescolarEvaluation = useDeletePreescolarEvaluation();

  const gradeRecordPartialsByRecordId = useMemo(() => {
    const partialsMap = new Map<string, NonNullable<typeof gradeRecordPartials>>();

    (gradeRecordPartials ?? []).forEach((partial) => {
      const currentPartials = partialsMap.get(partial.grade_record_id) ?? [];
      currentPartials.push(partial);
      partialsMap.set(partial.grade_record_id, currentPartials);
    });

    return partialsMap;
  }, [gradeRecordPartials]);

  useEffect(() => {
    if (!downloadingStudent || !isPreescolar) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        if (preescolarRef.current) {
          toast.info(`Generando PDF para ${downloadingStudent.full_name}...`);
          await preescolarRef.current.exportPDF();
        }
      } catch (error) {
        console.error(error);
        toast.error("Hubo un error exportando el PDF.");
      } finally {
        setDownloadingStudent(null);
        setDownloadingSnapshot(null);
      }
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [downloadingStudent, isPreescolar]);

  const availableSubjectsForDialog = isRector
    ? getTeacherSubjectsForTeacher(teachers, subjects, editingRecord?.teacher_id)
    : (subjects?.filter((subject) =>
        teacherSchedules?.some(
          (schedule) => schedule.grade_id === selectedGrade && schedule.subject_id === subject.id,
        ),
      ) ?? []);

  const teacherOptionsForGradeRecord = getTeacherOptionsForSubject(
    availableTeachersForSelectedGrade,
    editingRecord?.subject_id,
  );

  const filteredStudents = useMemo(() => {
    let result = students?.filter(
      (student) => !selectedGrade || student.grade_id === selectedGrade,
    ) ?? [];
    
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter((student) => student.full_name.toLowerCase().includes(lowerTerm));
    }
    return result;
  }, [students, selectedGrade, searchTerm]);
  const isLoading =
    gradeRecordsQuery.isLoading || gradeRecordPartialsQuery.isLoading || preescolarQuery.isLoading;

  const pageError =
    gradesQuery.error ||
    periodsQuery.error ||
    subjectsQuery.error ||
    teachersQuery.error ||
    teacherSchedulesQuery.error ||
    studentsQuery.error ||
    gradeRecordsQuery.error ||
    gradeRecordPartialsQuery.error ||
    preescolarQuery.error;

  const getStudentRecords = (studentId: string, gradeId: string) =>
    isPreescolar
      ? getVisiblePreescolarEvaluationsForStudent(preescolarRecords, studentId)
      : getVisibleGradeRecordsForStudent({
          gradeId,
          gradeRecords,
          isRector,
          schedules: teacherSchedules,
          studentId,
          teacherId,
        });

  const ensureEditablePeriod = () => {
    if (canManageCurrentPeriod) {
      return true;
    }

    toast.error("Solo el periodo academico activo permite crear, editar o eliminar registros.");
    return false;
  };

  const handleAddGrade = (studentId: string) => {
    if (!ensureEditablePeriod()) {
      return;
    }

    setEditingRecord(buildEmptyGradeRecord(studentId, isRector, teacherId));
    setDialogOpen(true);
  };

  const handleEditGrade = (record: GradeRecord) => {
    if (!ensureEditablePeriod()) {
      return;
    }

    const editablePartials = buildEditablePartialsFromExisting(
      gradeRecordPartialsByRecordId.get(record.id),
      record.grade,
    );
    const partialSummary = deriveRecordSummaryFromPartials(editablePartials);

    setEditingRecord({
      achievements: partialSummary.achievements || record.achievements || "",
      comments: partialSummary.comments || record.comments || "",
      final_grade: calculateWeightedFinalGrade(editablePartials) ?? record.grade,
      id: record.id,
      partials: editablePartials,
      student_id: record.student_id,
      subject_id: record.subject_id,
      teacher_id: record.teacher_id || "",
    });
    setDialogOpen(true);
  };

  const handleSaveGrade = async () => {
    if (!ensureEditablePeriod() || !editingRecord || !selectedPeriod) {
      return;
    }

    const draftPartials = editingRecord.partials ?? [];
    const gradedActivities = draftPartials.filter(
      (partial) => typeof partial.grade === "number" && !Number.isNaN(partial.grade),
    );

    if (gradedActivities.length === 0) {
      toast.error("Debes ingresar al menos una nota de actividad valida.");
      return;
    }

    const hasInvalidGrade = draftPartials.some(
      (partial) =>
        typeof partial.grade === "number"
        && (Number.isNaN(partial.grade) || partial.grade < 1 || partial.grade > 5),
    );

    if (hasInvalidGrade) {
      toast.error("Cada nota de actividad debe estar entre 1.0 y 5.0.");
      return;
    }

    const currentTeacherId = isRector ? editingRecord.teacher_id : teacherId;
    if (!currentTeacherId) {
      toast.error("Debes seleccionar el docente responsable.");
      return;
    }

    if (isRector) {
      const selectedTeacher = teachers?.find((teacher) => teacher.id === currentTeacherId);

      if (
        !isTeacherAssignedToGrade(selectedTeacher, selectedGrade) ||
        !isTeacherAssignedToSubject(selectedTeacher, editingRecord.subject_id)
      ) {
        toast.error("El docente seleccionado no esta asignado a ese grado o materia.");
        return;
      }
    }

    const partialSummary = deriveRecordSummaryFromPartials(draftPartials);
    const normalizedPartials = gradedActivities
      .map((partial, index) => ({
        activity_name: partial.activity_name || `Actividad ${index + 1}`,
        achievements: partial.achievements,
        comments: partial.comments,
        grade: partial.grade as number,
        partial_index: index + 1,
      }));

    await upsertGradeRecordPartials.mutateAsync({
      achievements: partialSummary.achievements || editingRecord.achievements || null,
      comments: partialSummary.comments || editingRecord.comments || null,
      id: editingRecord.id,
      partials: normalizedPartials,
      period_id: selectedPeriod,
      student_id: editingRecord.student_id,
      subject_id: editingRecord.subject_id,
      teacher_id: currentTeacherId,
    });

    setDialogOpen(false);
    setEditingRecord(null);
  };

  const requestDeleteGrade = (recordId: string) => {
    if (!ensureEditablePeriod()) {
      return;
    }

    setPendingDelete({ id: recordId, kind: "grade" });
  };

  const handleAddPreescolar = (studentId: string) => {
    if (!ensureEditablePeriod()) {
      return;
    }

    setEditingPreescolar(buildEmptyPreescolarEvaluation(studentId, isRector, teacherId));
    setPreescolarDialogOpen(true);
  };

  const handleEditPreescolar = (record: PreescolarEvaluation) => {
    if (!ensureEditablePeriod()) {
      return;
    }

    setEditingPreescolar({
      debilidades: record.debilidades || "",
      dimension: record.dimension,
      fortalezas: record.fortalezas || "",
      id: record.id,
      recomendaciones: record.recomendaciones || "",
      student_id: record.student_id,
      teacher_id: record.teacher_id || "",
    });
    setPreescolarDialogOpen(true);
  };

  const handleSavePreescolar = async () => {
    if (!ensureEditablePeriod() || !editingPreescolar || !selectedPeriod) {
      return;
    }

    if (!editingPreescolar.dimension) {
      toast.error("Debes seleccionar una dimension.");
      return;
    }

    if (
      editingPreescolar.fortalezas.length > MAX_PREESCOLAR_TEXT_LENGTH ||
      editingPreescolar.debilidades.length > MAX_PREESCOLAR_TEXT_LENGTH ||
      editingPreescolar.recomendaciones.length > MAX_PREESCOLAR_TEXT_LENGTH
    ) {
      toast.error(
        `Los textos no pueden exceder los ${MAX_PREESCOLAR_TEXT_LENGTH} caracteres.`,
      );
      return;
    }

    const currentTeacherId = isRector ? editingPreescolar.teacher_id : teacherId;
    if (!currentTeacherId) {
      toast.error("Debes seleccionar el docente responsable.");
      return;
    }

    if (isRector) {
      const selectedTeacher = teachers?.find((teacher) => teacher.id === currentTeacherId);
      if (!isTeacherAssignedToGrade(selectedTeacher, selectedGrade)) {
        toast.error("El docente seleccionado no esta asignado al grado elegido.");
        return;
      }
    }

    if (editingPreescolar.id) {
      await updatePreescolarEvaluation.mutateAsync(
        buildPreescolarUpdatePayload(editingPreescolar, currentTeacherId, isRector),
      );
    } else {
      await createPreescolarEvaluation.mutateAsync(
        buildPreescolarCreatePayload(editingPreescolar, selectedPeriod, currentTeacherId),
      );
    }

    setPreescolarDialogOpen(false);
    setEditingPreescolar(null);
  };

  const requestDeletePreescolar = (recordId: string) => {
    if (!ensureEditablePeriod()) {
      return;
    }

    setPendingDelete({ id: recordId, kind: "preescolar" });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    try {
      if (pendingDelete.kind === "grade") {
        await deleteGradeRecord.mutateAsync(pendingDelete.id);
      } else {
        await deletePreescolarEvaluation.mutateAsync(pendingDelete.id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setPendingDelete(null);
    }
  };

  const handleDownloadReport = async (student: Student) => {
    if (!selectedPeriod) {
      return;
    }

    const period = periods?.find((item) => item.id === selectedPeriod);
    if (!period) {
      return;
    }

    if (isPreescolar) {
      try {
        const snapshot = await getStudentReportSnapshot(student.id, selectedPeriod);
        setDownloadingSnapshot(snapshot);
        setDownloadingStudent(student);
      } catch (error) {
        console.error(error);
        toast.error("No fue posible preparar el boletin.");
      }
      return;
    }

    try {
      const snapshot = await getStudentReportSnapshot(student.id, selectedPeriod);

      if (snapshot.studentGradeRecords.length) {
        const { downloadReportCard } = await import("@/utils/pdfGenerator");
        await downloadReportCard(
          { full_name: student.full_name, grades: student.grades },
          { id: period.id, name: period.name },
          snapshot.studentGradeRecords,
          snapshot.classSchedules,
          periods || [],
          {
            groupDirectorName: snapshot.groupDirectorName,
            periodAverage: snapshot.periodAverage,
            rank: snapshot.rank,
            totalStudents: snapshot.totalStudents,
          },
          deliveryDate,
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const preescolarPdfRecords = getVisiblePreescolarEvaluationsForStudent(
    downloadingSnapshot?.preescolarEvaluations ?? preescolarRecords,
    downloadingStudent?.id,
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Calificaciones</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isPreescolar
              ? "Evaluaciones cualitativas para preescolar."
              : "Registro de calificaciones por periodo."}
          </p>
        </div>

        <CalificacionesFilters
          activePeriodId={activePeriod?.id}
          availableGrades={availableGrades}
          deliveryDate={deliveryDate}
          periods={periods}
          selectedGrade={selectedGrade}
          selectedPeriod={selectedPeriod}
          searchTerm={searchTerm}
          setDeliveryDate={setDeliveryDate}
          setSelectedGrade={setSelectedGrade}
          setSelectedPeriod={setSelectedPeriod}
          setSearchTerm={setSearchTerm}
        />

        {pageError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No fue posible cargar el modulo</AlertTitle>
            <AlertDescription>{getFriendlyErrorMessage(pageError)}</AlertDescription>
          </Alert>
        )}

        {selectedPeriod && !canManageCurrentPeriod && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Periodo en solo lectura</AlertTitle>
            <AlertDescription>
              {selectedPeriodData?.name || "El periodo seleccionado"} no es el periodo activo. Se
              pueden consultar notas y descargar reportes, pero no crear, editar ni eliminar
              registros.
            </AlertDescription>
          </Alert>
        )}

        {!selectedGrade || !selectedPeriod ? (
          <EmptyState
            icon={ClipboardList}
            title="Selecciona un grado y un periodo"
            description="Elige el grado y el periodo academico para ver y gestionar las calificaciones."
          />
        ) : isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <CalificacionesTable
            canManageRecords={canManageCurrentPeriod}
            students={filteredStudents}
            isPreescolar={isPreescolar}
            getRecordsForStudent={getStudentRecords}
            onAddGrade={handleAddGrade}
            onAddPreescolar={handleAddPreescolar}
            onDeleteGrade={requestDeleteGrade}
            onDeletePreescolar={requestDeletePreescolar}
            onDownloadReport={handleDownloadReport}
            onEditGrade={handleEditGrade}
            onEditPreescolar={handleEditPreescolar}
          />
        )}

        {!isPreescolar && <GradeLegend />}
      </div>

      <GradeRecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingRecord={editingRecord}
        setEditingRecord={setEditingRecord}
        isPending={upsertGradeRecordPartials.isPending}
        isRector={isRector}
        availableTeachersForSelectedGrade={availableTeachersForSelectedGrade}
        availableSubjects={availableSubjectsForDialog}
        teacherOptionsForRecord={teacherOptionsForGradeRecord}
        onSave={handleSaveGrade}
      />

      <PreescolarEvaluationDialog
        open={preescolarDialogOpen}
        onOpenChange={setPreescolarDialogOpen}
        editingPreescolar={editingPreescolar}
        setEditingPreescolar={setEditingPreescolar}
        isPending={
          createPreescolarEvaluation.isPending || updatePreescolarEvaluation.isPending
        }
        isRector={isRector}
        availableTeachersForSelectedGrade={availableTeachersForSelectedGrade}
        onSave={handleSavePreescolar}
      />

      <ConfirmActionDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        title={
          pendingDelete?.kind === "preescolar"
            ? "Eliminar evaluacion cualitativa?"
            : "Eliminar calificacion?"
        }
        description="Esta accion no se puede deshacer."
        actionLabel="Eliminar"
        onConfirm={confirmDelete}
      />

      <PreescolarPdfRenderer
        deliveryDate={deliveryDate}
        downloadingStudent={downloadingStudent}
        gradeName={selectedGradeData?.name}
        groupDirectorName={downloadingSnapshot?.groupDirectorName}
        isPreescolar={isPreescolar}
        periodName={selectedPeriodData?.name}
        preescolarRef={preescolarRef}
        records={preescolarPdfRecords}
        reportSummary={
          downloadingSnapshot
            ? {
                periodAverage: downloadingSnapshot.periodAverage,
                rank: downloadingSnapshot.rank,
                totalStudents: downloadingSnapshot.totalStudents,
              }
            : undefined
        }
      />
    </MainLayout>
  );
};

export default Calificaciones;
