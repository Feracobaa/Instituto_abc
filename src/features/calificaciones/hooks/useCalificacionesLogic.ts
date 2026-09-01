import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/ui/sonner";
import type { PreescolarReportHandle } from "@/components/reports/PreescolarReport";
import { useAuth } from "@/contexts/AuthContext";
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
  getFilteredStudentGradeRecordsForReport,
  isPreescolarGradeName,
  isTeacherAssignedToGrade,
  isTeacherAssignedToSubject,
  isTeacherGroupDirectorForGrade,
} from "@/features/calificaciones/helpers";
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
import { useInstitutionSettings } from "@/hooks/school/useInstitution";
import type { GradeRecord, PreescolarEvaluation, Student } from "@/hooks/useSchoolData";
import { getStudentReportSnapshot } from "@/lib/reportCards";

const MAX_PREESCOLAR_TEXT_LENGTH = 1000;

type PendingDelete =
  | { id: string; kind: "grade" }
  | { id: string; kind: "preescolar" }
  | null;

export function useCalificacionesLogic() {
  const { userRole, teacherId } = useAuth();
  const isRector = userRole === "rector";

  const gradesQuery = useGrades();
  const periodsQuery = useAcademicPeriods();
  const subjectsQuery = useSubjects();
  const teachersQuery = useTeachers();
  const settingsQuery = useInstitutionSettings();

  const grades = gradesQuery.data;
  const periods = periodsQuery.data;
  const subjects = subjectsQuery.data;
  const teachers = teachersQuery.data;
  const settings = settingsQuery.data;

  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EditableGradeRecord | null>(null);
  const [preescolarDialogOpen, setPreescolarDialogOpen] = useState(false);
  const [editingPreescolar, setEditingPreescolar] = useState<EditablePreescolarEvaluation | null>(null);
  const [downloadingStudent, setDownloadingStudent] = useState<Student | null>(null);
  const [downloadingSnapshot, setDownloadingSnapshot] = useState<Awaited<ReturnType<typeof getStudentReportSnapshot>> | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [inlineEditActive, setInlineEditActive] = useState(false);

  const preescolarRef = useRef<PreescolarReportHandle>(null);

  const activePeriod = periods?.find((p) => p.is_active);
  const selectedPeriodData = periods?.find((p) => p.id === selectedPeriod);
  const selectedGradeData = grades?.find((g) => g.id === selectedGrade);
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

  const isGroupDirector = useMemo(() => {
    if (isRector) return true;
    if (!teacherId || !selectedGrade) return false;
    const currentTeacher = teachers?.find((t) => t.id === teacherId);
    return isTeacherGroupDirectorForGrade(currentTeacher, selectedGrade);
  }, [isRector, teacherId, selectedGrade, teachers]);

  useEffect(() => {
    if (!isRector && selectedGrade && availableGrades.length > 0) {
      const canStillAccess = availableGrades.some((g) => g.id === selectedGrade);
      if (!canStillAccess) setSelectedGrade("");
    }
  }, [availableGrades, isRector, selectedGrade]);

  const studentsQuery = useStudents(selectedGrade || undefined);
  const gradeRecordsQuery = useGradeRecords({ periodId: selectedPeriod || undefined });
  const gradeRecordPartialsQuery = useGradeRecordPartials({ periodId: selectedPeriod || undefined });
  const preescolarQuery = usePreescolarEvaluations({ periodId: selectedPeriod || undefined });

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
      const current = partialsMap.get(partial.grade_record_id) ?? [];
      current.push(partial);
      partialsMap.set(partial.grade_record_id, current);
    });
    return partialsMap;
  }, [gradeRecordPartials]);

  useEffect(() => {
    if (!downloadingStudent || !isPreescolar) return;
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
    : (subjects?.filter((s) =>
        teacherSchedules?.some((sch) => sch.grade_id === selectedGrade && sch.subject_id === s.id),
      ) ?? []);

  const teacherOptionsForGradeRecord = getTeacherOptionsForSubject(
    availableTeachersForSelectedGrade,
    editingRecord?.subject_id,
  );

  const filteredStudents = useMemo(() => {
    let result = students?.filter((s) => !selectedGrade || s.grade_id === selectedGrade) ?? [];
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter((s) => s.full_name.toLowerCase().includes(lower));
    }
    return result;
  }, [students, selectedGrade, searchTerm]);

  const isLoading = gradeRecordsQuery.isLoading || gradeRecordPartialsQuery.isLoading || preescolarQuery.isLoading;
  const pageError =
    gradesQuery.error || periodsQuery.error || subjectsQuery.error || teachersQuery.error ||
    teacherSchedulesQuery.error || studentsQuery.error || gradeRecordsQuery.error ||
    gradeRecordPartialsQuery.error || preescolarQuery.error;

  const getStudentRecords = (studentId: string, gradeId: string) =>
    isPreescolar
      ? getVisiblePreescolarEvaluationsForStudent(preescolarRecords, studentId, teacherId, isRector, isGroupDirector)
      : getVisibleGradeRecordsForStudent({ gradeId, gradeRecords, isRector, schedules: teacherSchedules, studentId, teacherId });

  const ensureEditablePeriod = () => {
    if (canManageCurrentPeriod) return true;
    toast.error("Solo el periodo academico activo permite crear, editar o eliminar registros.");
    return false;
  };

  const handleAddGrade = (studentId: string) => {
    if (!ensureEditablePeriod()) return;
    setEditingRecord(buildEmptyGradeRecord(studentId, isRector, teacherId));
    setDialogOpen(true);
  };

  const handleEditGrade = (record: GradeRecord) => {
    if (!ensureEditablePeriod()) return;
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
    if (!ensureEditablePeriod() || !editingRecord || !selectedPeriod) return;
    const draftPartials = editingRecord.partials ?? [];
    const graded = draftPartials.filter((p) => typeof p.grade === "number" && !Number.isNaN(p.grade));
    if (graded.length === 0) {
      toast.error("Debes ingresar al menos una nota de actividad valida.");
      return;
    }
    const hasInvalid = draftPartials.some(
      (p) => typeof p.grade === "number" && (Number.isNaN(p.grade) || p.grade < 1 || p.grade > 5),
    );
    if (hasInvalid) {
      toast.error("Cada nota de actividad debe estar entre 1.0 y 5.0.");
      return;
    }
    const currentTeacherId = isRector ? editingRecord.teacher_id : teacherId;
    if (!currentTeacherId) {
      toast.error("Debes seleccionar el docente responsable.");
      return;
    }
    if (isRector) {
      const teacher = teachers?.find((t) => t.id === currentTeacherId);
      if (!isTeacherAssignedToGrade(teacher, selectedGrade) || !isTeacherAssignedToSubject(teacher, editingRecord.subject_id)) {
        toast.error("El docente seleccionado no esta asignado a ese grado o materia.");
        return;
      }
    }
    const partialSummary = deriveRecordSummaryFromPartials(draftPartials);
    const normalized = graded.map((p, idx) => ({
      activity_name: p.activity_name || `Actividad ${idx + 1}`,
      achievements: p.achievements,
      comments: p.comments,
      grade: p.grade as number,
      partial_index: idx + 1,
    }));
    await upsertGradeRecordPartials.mutateAsync({
      achievements: partialSummary.achievements || editingRecord.achievements || null,
      comments: partialSummary.comments || editingRecord.comments || null,
      id: editingRecord.id,
      partials: normalized,
      period_id: selectedPeriod,
      student_id: editingRecord.student_id,
      subject_id: editingRecord.subject_id,
      teacher_id: currentTeacherId,
    });
    setDialogOpen(false);
    setEditingRecord(null);
  };

  const handleInlineGradeChange = async (record: GradeRecord, newGrade: number) => {
    if (!ensureEditablePeriod() || !selectedPeriod) return;
    const existing = gradeRecordPartialsByRecordId.get(record.id) ?? [];
    const updated = existing.length <= 1
      ? [{ activity_name: existing[0]?.activity_name || "Actividad 1", achievements: existing[0]?.achievements || "", comments: existing[0]?.comments || "", grade: newGrade, partial_index: 1 }]
      : existing.map((p, idx) => ({ activity_name: p.activity_name || `Actividad ${idx + 1}`, achievements: p.achievements || "", comments: p.comments || "", grade: idx === 0 ? newGrade : (typeof p.grade === "number" ? p.grade : 3.0), partial_index: p.partial_index }));
    const currentTeacherId = record.teacher_id || teacherId || "";
    await upsertGradeRecordPartials.mutateAsync({
      achievements: record.achievements || null,
      comments: record.comments || null,
      id: record.id,
      partials: updated,
      period_id: record.period_id || selectedPeriod,
      student_id: record.student_id,
      subject_id: record.subject_id,
      teacher_id: currentTeacherId,
    });
  };

  const requestDeleteGrade = (recordId: string) => {
    if (!ensureEditablePeriod()) return;
    setPendingDelete({ id: recordId, kind: "grade" });
  };

  const handleAddPreescolar = (studentId: string) => {
    if (!ensureEditablePeriod()) return;
    setEditingPreescolar(buildEmptyPreescolarEvaluation(studentId, isRector, teacherId));
    setPreescolarDialogOpen(true);
  };

  const handleEditPreescolar = (record: PreescolarEvaluation) => {
    if (!ensureEditablePeriod()) return;
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
    if (!ensureEditablePeriod() || !editingPreescolar || !selectedPeriod) return;
    if (!editingPreescolar.dimension) {
      toast.error("Debes seleccionar una dimension.");
      return;
    }
    if (editingPreescolar.fortalezas.length > MAX_PREESCOLAR_TEXT_LENGTH || editingPreescolar.debilidades.length > MAX_PREESCOLAR_TEXT_LENGTH || editingPreescolar.recomendaciones.length > MAX_PREESCOLAR_TEXT_LENGTH) {
      toast.error(`Los textos no pueden exceder los ${MAX_PREESCOLAR_TEXT_LENGTH} caracteres.`);
      return;
    }
    const currentTeacherId = isRector ? editingPreescolar.teacher_id : teacherId;
    if (!currentTeacherId) {
      toast.error("Debes seleccionar el docente responsable.");
      return;
    }
    if (isRector) {
      const teacher = teachers?.find((t) => t.id === currentTeacherId);
      if (!isTeacherAssignedToGrade(teacher, selectedGrade)) {
        toast.error("El docente seleccionado no esta asignado al grado elegido.");
        return;
      }
    }
    if (editingPreescolar.id) {
      await updatePreescolarEvaluation.mutateAsync(buildPreescolarUpdatePayload(editingPreescolar, currentTeacherId, isRector));
    } else {
      await createPreescolarEvaluation.mutateAsync(buildPreescolarCreatePayload(editingPreescolar, selectedPeriod, currentTeacherId));
    }
    setPreescolarDialogOpen(false);
    setEditingPreescolar(null);
  };

  const requestDeletePreescolar = (recordId: string) => {
    if (!ensureEditablePeriod()) return;
    setPendingDelete({ id: recordId, kind: "preescolar" });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
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
    if (!selectedPeriod) return;
    const period = periods?.find((item) => item.id === selectedPeriod);
    if (!period) return;

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
      const visibleRecords = getFilteredStudentGradeRecordsForReport({
        gradeId: selectedGrade,
        isGroupDirector,
        isRector,
        records: snapshot.studentGradeRecords,
        schedules: teacherSchedules,
        teacherId,
      });

      if (visibleRecords.length) {
        const { downloadReportCard } = await import("@/utils/pdfGenerator");
        const instData = settings ? {
          name: settings.legal_name || settings.display_name || "",
          nit: settings.nit || undefined,
          address: settings.address || undefined,
          phone: settings.phone || undefined,
          rectorName: settings.rector_name || undefined,
          logoUrl: settings.logo_url || undefined,
        } : undefined;

        const visibleClassSchedules = isRector || isGroupDirector
          ? snapshot.classSchedules
          : snapshot.classSchedules.filter((sch) =>
              teacherSchedules?.some(
                (s) => (!selectedGrade || s.grade_id === selectedGrade) && s.subject_id === sch.subject_id,
              ) ?? false,
            );

        await downloadReportCard(
          { full_name: student.full_name, grades: student.grades },
          { id: period.id, name: period.name },
          visibleRecords,
          visibleClassSchedules,
          periods || [],
          {
            groupDirectorName: snapshot.groupDirectorName,
            periodAverage: isRector || isGroupDirector ? snapshot.periodAverage : null,
            rank: isRector || isGroupDirector ? snapshot.rank : null,
            totalStudents: snapshot.totalStudents,
          },
          deliveryDate,
          instData
        );
      } else {
        toast.error("No tienes calificaciones asignadas para este estudiante en este periodo.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const preescolarPdfRecords = getVisiblePreescolarEvaluationsForStudent(
    downloadingSnapshot?.preescolarEvaluations ?? preescolarRecords,
    downloadingStudent?.id,
    teacherId,
    isRector,
    isGroupDirector,
  );

  return {
    activePeriod,
    availableGrades,
    availableSubjectsForDialog,
    availableTeachersForSelectedGrade,
    canManageCurrentPeriod,
    confirmDelete,
    createPreescolarEvaluation,
    deliveryDate,
    dialogOpen,
    downloadingSnapshot,
    downloadingStudent,
    editingPreescolar,
    editingRecord,
    filteredStudents,
    getStudentRecords,
    handleAddGrade,
    handleAddPreescolar,
    handleDownloadReport,
    handleEditGrade,
    handleEditPreescolar,
    handleInlineGradeChange,
    handleSaveGrade,
    handleSavePreescolar,
    inlineEditActive,
    isLoading,
    isPending: upsertGradeRecordPartials.isPending,
    isPreescolar,
    isRector,
    pageError,
    pendingDelete,
    periods,
    preescolarDialogOpen,
    preescolarPdfRecords,
    preescolarRef,
    requestDeleteGrade,
    requestDeletePreescolar,
    searchTerm,
    selectedGrade,
    selectedGradeData,
    selectedPeriod,
    selectedPeriodData,
    setDeliveryDate,
    setDialogOpen,
    setEditingPreescolar,
    setEditingRecord,
    setInlineEditActive,
    setPendingDelete,
    setPreescolarDialogOpen,
    setSearchTerm,
    setSelectedGrade,
    setSelectedPeriod,
    settings,
    teacherOptionsForGradeRecord,
    updatePreescolarEvaluation,
  };
}
