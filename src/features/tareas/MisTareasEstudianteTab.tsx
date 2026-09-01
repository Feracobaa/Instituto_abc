import { useMemo, useRef, useState } from "react";
import { BookOpen, GraduationCap, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/sonner";
import { useAssignmentsList, useSubmitAssignment } from "@/hooks/school/useAssignments";
import { useInstitutionSettings } from "@/hooks/school/useInstitution";
import { useGuardianAccount } from "@/hooks/useSchoolData";
import type { Assignment, AssignmentSubmission } from "@/types/assignments";
import { downloadAssignmentPDF } from "@/utils/assignmentPdfGenerator";
import {
  AssignmentDetailDialog,
  StudentAssignmentCard,
  StudentAssignmentFilters,
  SubmissionFeedbackDialog,
  SubmitAssignmentDialog,
} from "./components";
import { calculateStudentMetrics, extractUniqueSubjects } from "./helpers";
import type { StudentTabFilter } from "./types";

export default function MisTareasEstudianteTab() {
  const guardianQuery = useGuardianAccount();
  const { data: settings } = useInstitutionSettings();
  const student = guardianQuery.data?.students ?? null;
  const gradeId = student?.grade_id ?? undefined;

  const { data: assignments = [], isLoading } = useAssignmentsList({
    gradeId,
    studentId: student?.id,
  });

  const submitMutation = useSubmitAssignment();

  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedTab, setSelectedTab] = useState<StudentTabFilter>("all");
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [activeFeedbackSubmission, setActiveFeedbackSubmission] = useState<AssignmentSubmission | null>(null);

  // Formulario de Entrega
  const [submissionText, setSubmissionText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subjects = useMemo(() => extractUniqueSubjects(assignments), [assignments]);
  const metrics = useMemo(() => calculateStudentMetrics(assignments), [assignments]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchSubject = selectedSubject === "all" || a.subject_id === selectedSubject;
      const isSubmitted = Boolean(a.user_submission?.submitted_at);
      const isEvaluated = a.user_submission?.status === "evaluated";

      let matchTab = true;
      if (selectedTab === "pending") {
        matchTab = !isSubmitted;
      } else if (selectedTab === "submitted") {
        matchTab = isSubmitted;
      } else if (selectedTab === "evaluated") {
        matchTab = isEvaluated;
      }

      return matchSubject && matchTab;
    });
  }, [assignments, selectedSubject, selectedTab]);

  const handleOpenDetail = (assignment: Assignment) => {
    setActiveAssignment(assignment);
    setDetailModalOpen(true);
  };

  const handleOpenSubmission = (assignment: Assignment) => {
    if (assignment.user_submission?.status === "evaluated") {
      setActiveFeedbackSubmission(assignment.user_submission);
      setFeedbackModalOpen(true);
      return;
    }

    setActiveAssignment(assignment);
    setSubmissionText(assignment.user_submission?.submission_text || "");
    setSelectedFile(null);
    setFilePreview(assignment.user_submission?.file_url || null);
    setSubmissionModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendSubmission = async () => {
    if (!student || !activeAssignment) return;
    if (!submissionText.trim() && !selectedFile && !filePreview) {
      toast.error("Por favor adjunta una foto de tu cuaderno o escribe tu respuesta.");
      return;
    }

    await submitMutation.mutateAsync({
      assignment_id: activeAssignment.id,
      student_id: student.id,
      submission_text: submissionText,
      file: selectedFile,
    });

    setSubmissionModalOpen(false);
    setSelectedFile(null);
  };

  const handleDownloadPdf = async (assignment: Assignment) => {
    toast.info("Generando guía oficial en PDF con membrete institucional...");
    const instData = settings
      ? {
          name: settings.legal_name || settings.display_name || "",
          nit: settings.nit || undefined,
          address: settings.address || undefined,
          phone: settings.phone || undefined,
          rectorName: settings.rector_name || undefined,
          logoUrl: settings.logo_url || undefined,
        }
      : undefined;

    await downloadAssignmentPDF(
      {
        title: assignment.title,
        subjectName: assignment.subjects?.name || "Asignatura",
        gradeName: assignment.grades?.name || "Grado",
        teacherName: assignment.teachers?.full_name || "Docente Titular",
        teacherEmail: assignment.teachers?.email || null,
        studentName: student?.full_name || undefined,
        periodName: assignment.academic_periods?.name || undefined,
        dueDate: assignment.due_date,
        createdDate: assignment.created_at,
        description: assignment.description_json || "Sin descripción",
        attachmentUrl: assignment.attachment_url,
      },
      instData
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header del Estudiante */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Tareas y Compromisos Escolares
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Consulta las guías de clase, sube tus evidencias fotográficas y revisa tus calificaciones.
          </p>
        </div>
      </div>

      {/* Métricas y Filtros */}
      <StudentAssignmentFilters
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        selectedSubject={selectedSubject}
        onSubjectChange={setSelectedSubject}
        subjects={subjects}
        metrics={metrics}
      />

      {/* Grid de Tareas del Estudiante */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Cargando tareas del estudiante...</span>
          </div>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Sin tareas pendientes"
          description={
            selectedTab !== "all" || selectedSubject !== "all"
              ? "No hay compromisos con los filtros seleccionados."
              : "¡Excelente! Estás al día con todas tus actividades académicas."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredAssignments.map((assignment, idx) => (
            <StudentAssignmentCard
              key={assignment.id}
              assignment={assignment}
              index={idx}
              onOpenDetail={handleOpenDetail}
              onOpenSubmission={handleOpenSubmission}
              onDownloadPdf={handleDownloadPdf}
            />
          ))}
        </div>
      )}

      {/* Modal Detalle de Tarea */}
      <AssignmentDetailDialog
        assignment={activeAssignment}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onDownloadPdf={handleDownloadPdf}
      />

      {/* Modal Entrega de Tarea */}
      <SubmitAssignmentDialog
        assignment={activeAssignment}
        open={submissionModalOpen}
        onOpenChange={setSubmissionModalOpen}
        submissionText={submissionText}
        onSubmissionTextChange={setSubmissionText}
        selectedFile={selectedFile}
        filePreview={filePreview}
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
        onRemoveFile={handleRemoveFile}
        onSubmit={handleSendSubmission}
        isPending={submitMutation.isPending}
      />

      {/* Modal Retroalimentación Docente */}
      <SubmissionFeedbackDialog
        submission={activeFeedbackSubmission}
        open={feedbackModalOpen}
        onOpenChange={setFeedbackModalOpen}
      />
    </div>
  );
}
