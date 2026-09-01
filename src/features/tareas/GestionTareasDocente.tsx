import { useMemo, useState } from "react";
import { BookOpen, Loader2, Plus, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAssignmentsList,
  useCreateAssignment,
  useDeleteAssignment,
} from "@/hooks/school/useAssignments";
import { useInstitutionSettings } from "@/hooks/school/useInstitution";
import {
  useAcademicPeriods,
  useGrades,
  useSchedules,
  useSubjects,
  useTeachers,
} from "@/hooks/useSchoolData";
import type { Assignment } from "@/types/assignments";
import { downloadAssignmentPDF } from "@/utils/assignmentPdfGenerator";
import {
  CreateAssignmentDialog,
  SubmissionsReviewDialog,
  TeacherAssignmentCard,
  TeacherAssignmentFilters,
  TeacherAssignmentStats,
} from "./components";
import {
  calculateTeacherStats,
  getFilteredGradesForUser,
  getFilteredSubjectsForUser,
} from "./helpers";

export function GestionTareasDocente() {
  const { teacherId, userRole } = useAuth();
  const isRector = userRole === "rector";
  const { data: settings } = useInstitutionSettings();

  const gradesQuery = useGrades();
  const subjectsQuery = useSubjects();
  const periodsQuery = useAcademicPeriods();
  const teachersQuery = useTeachers();
  const schedulesQuery = useSchedules(undefined, isRector ? undefined : teacherId || undefined);

  const { data: assignments = [], isLoading } = useAssignmentsList({
    teacherId: isRector ? undefined : teacherId ?? undefined,
  });

  const createAssignmentMutation = useCreateAssignment();
  const deleteAssignmentMutation = useDeleteAssignment();

  // Docente actual para aplicar control de privacidad
  const currentTeacher = useMemo(() => {
    if (isRector || !teacherId) return null;
    return teachersQuery.data?.find((t) => t.id === teacherId) ?? null;
  }, [isRector, teacherId, teachersQuery.data]);

  // Grados y Asignaturas filtradas por política de privacidad
  const allowedGrades = useMemo(() => {
    return getFilteredGradesForUser({
      allGrades: gradesQuery.data,
      teacher: currentTeacher,
      teacherSchedules: schedulesQuery.data,
      isRector,
    });
  }, [gradesQuery.data, currentTeacher, schedulesQuery.data, isRector]);

  const allowedSubjects = useMemo(() => {
    return getFilteredSubjectsForUser({
      allSubjects: subjectsQuery.data,
      teacher: currentTeacher,
      teacherSchedules: schedulesQuery.data,
      isRector,
    });
  }, [subjectsQuery.data, currentTeacher, schedulesQuery.data, isRector]);

  // Estados locales de la vista
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submissionsDialogOpen, setSubmissionsDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [search, setSearch] = useState("");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("all");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");

  // Formulario Crear Tarea
  const [title, setTitle] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  // Materias contextuales al grado seleccionado en el formulario
  const formSubjects = useMemo(() => {
    return getFilteredSubjectsForUser({
      allSubjects: subjectsQuery.data,
      teacher: currentTeacher,
      teacherSchedules: schedulesQuery.data,
      selectedGradeId: gradeId || undefined,
      isRector,
    });
  }, [subjectsQuery.data, currentTeacher, schedulesQuery.data, gradeId, isRector]);

  const stats = useMemo(() => calculateTeacherStats(assignments), [assignments]);

  const handleOpenCreate = () => {
    const initGrade = allowedGrades.length === 1 ? allowedGrades[0].id : "";
    const ctxSubjects = getFilteredSubjectsForUser({
      allSubjects: subjectsQuery.data,
      teacher: currentTeacher,
      teacherSchedules: schedulesQuery.data,
      selectedGradeId: initGrade || undefined,
      isRector,
    });
    setTitle("");
    setGradeId(initGrade);
    setSubjectId(ctxSubjects.length === 1 ? ctxSubjects[0].id : "");
    setPeriodId(periodsQuery.data?.find((p) => p.is_active)?.id || "");
    const d = new Date(Date.now() + 86400000 * 3);
    d.setHours(18, 0, 0, 0);
    setDueDate(d.toISOString().slice(0, 16));
    setDescription("");
    setCreateDialogOpen(true);
  };

  const handleGradeChangeInForm = (newGradeId: string) => {
    setGradeId(newGradeId);
    const ctx = getFilteredSubjectsForUser({
      allSubjects: subjectsQuery.data,
      teacher: currentTeacher,
      teacherSchedules: schedulesQuery.data,
      selectedGradeId: newGradeId,
      isRector,
    });
    setSubjectId(ctx.length === 1 ? ctx[0].id : ctx.some((s) => s.id === subjectId) ? subjectId : "");
  };

  const handleCreateAssignment = async () => {
    if (!teacherId && !isRector) {
      toast.error("Debes tener un perfil docente vinculado para publicar tareas.");
      return;
    }
    if (!title || !gradeId || !subjectId || !dueDate) {
      toast.error("Por favor completa los campos obligatorios (Título, Grado, Materia, Fecha).");
      return;
    }

    await createAssignmentMutation.mutateAsync({
      teacher_id: teacherId || assignments[0]?.teacher_id || "00000000-0000-0000-0000-000000000000",
      grade_id: gradeId,
      subject_id: subjectId,
      period_id: periodId || null,
      title,
      description_json: description,
      due_date: new Date(dueDate).toISOString(),
    });

    setCreateDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta tarea y sus entregas asociadas?")) {
      await deleteAssignmentMutation.mutateAsync(id);
    }
  };

  const handleDownloadPdf = async (a: Assignment) => {
    toast.info("Generando guía oficial en PDF...");
    await downloadAssignmentPDF(
      {
        title: a.title,
        subjectName: a.subjects?.name || "Asignatura",
        gradeName: a.grades?.name || "Grado",
        teacherName: a.teachers?.full_name || "Docente Titular",
        teacherEmail: a.teachers?.email || null,
        periodName: a.academic_periods?.name || undefined,
        dueDate: a.due_date,
        createdDate: a.created_at,
        description: a.description_json || "Sin instrucciones",
        attachmentUrl: a.attachment_url,
      },
      settings ? { name: settings.legal_name || settings.display_name || "", logoUrl: settings.logo_url || undefined } : undefined
    );
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchSearch =
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.subjects?.name.toLowerCase().includes(search.toLowerCase()) ||
        a.grades?.name.toLowerCase().includes(search.toLowerCase());
      return (
        matchSearch &&
        (selectedGradeFilter === "all" || a.grade_id === selectedGradeFilter) &&
        (selectedSubjectFilter === "all" || a.subject_id === selectedSubjectFilter)
      );
    });
  }, [assignments, search, selectedGradeFilter, selectedSubjectFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Gestión de Tareas y Compromisos
            </h1>
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary font-medium text-xs">
              <Sparkles className="h-3 w-3 text-primary" /> Módulo Académico
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Diseña guías oficiales, programa fechas límite y califica las evidencias enviadas por los estudiantes.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 shadow-soft hover-lift font-semibold">
          <Plus className="h-4 w-4" /> Publicar Nueva Tarea
        </Button>
      </div>

      <TeacherAssignmentStats stats={stats} />

      <TeacherAssignmentFilters
        search={search}
        onSearchChange={setSearch}
        selectedGrade={selectedGradeFilter}
        onGradeChange={setSelectedGradeFilter}
        selectedSubject={selectedSubjectFilter}
        onSubjectChange={setSelectedSubjectFilter}
        grades={allowedGrades}
        subjects={allowedSubjects}
        onOpenCreate={handleOpenCreate}
      />

      {isLoading ? (
        <div className="flex h-56 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground font-medium">
              Cargando compromisos académicos...
            </span>
          </div>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No hay tareas publicadas"
          description={
            search || selectedGradeFilter !== "all" || selectedSubjectFilter !== "all"
              ? "No se encontraron tareas con los filtros aplicados. Intenta restablecer la búsqueda."
              : "Presiona 'Publicar Nueva Tarea' para crear el primer compromiso académico del grupo."
          }
          action={{ label: "Publicar Nueva Tarea", onClick: handleOpenCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredAssignments.map((assignment, idx) => (
            <TeacherAssignmentCard
              key={assignment.id}
              assignment={assignment}
              index={idx}
              onOpenSubmissions={(a) => {
                setSelectedAssignment(a);
                setSubmissionsDialogOpen(true);
              }}
              onDownloadPdf={handleDownloadPdf}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CreateAssignmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title={title}
        onTitleChange={setTitle}
        gradeId={gradeId}
        onGradeIdChange={handleGradeChangeInForm}
        subjectId={subjectId}
        onSubjectIdChange={setSubjectId}
        periodId={periodId}
        onPeriodIdChange={setPeriodId}
        dueDate={dueDate}
        onDueDateChange={setDueDate}
        description={description}
        onDescriptionChange={setDescription}
        grades={allowedGrades}
        subjects={formSubjects}
        periods={periodsQuery.data || []}
        onSubmit={handleCreateAssignment}
        isPending={createAssignmentMutation.isPending}
      />

      {selectedAssignment && (
        <SubmissionsReviewDialog
          assignment={selectedAssignment}
          open={submissionsDialogOpen}
          onOpenChange={setSubmissionsDialogOpen}
        />
      )}
    </div>
  );
}
