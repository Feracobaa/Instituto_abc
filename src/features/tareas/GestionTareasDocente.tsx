import { useState } from "react";
import {
  Plus,
  Search,
  BookOpen,
  Calendar,
  UserCheck,
  CheckCircle2,
  Clock,
  Loader2,
  Trash2,
  Eye,
  Award,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useGrades, useSubjects, useAcademicPeriods } from "@/hooks/useSchoolData";
import {
  useAssignmentsList,
  useAssignmentSubmissionsList,
  useCreateAssignment,
  useDeleteAssignment,
  useEvaluateSubmission,
} from "@/hooks/school/useAssignments";
import type { Assignment, AssignmentSubmission } from "@/types/assignments";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";

export function GestionTareasDocente() {
  const { teacherId, userRole } = useAuth();
  const isRector = userRole === "rector";

  const gradesQuery = useGrades();
  const subjectsQuery = useSubjects();
  const periodsQuery = useAcademicPeriods();

  const { data: assignments = [], isLoading } = useAssignmentsList({
    teacherId: isRector ? undefined : teacherId ?? undefined,
  });

  const createAssignmentMutation = useCreateAssignment();
  const deleteAssignmentMutation = useDeleteAssignment();

  // Estados de interfaz
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submissionsDialogOpen, setSubmissionsDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [search, setSearch] = useState("");

  // Formulario Crear Tarea
  const [title, setTitle] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  const handleOpenCreate = () => {
    setTitle("");
    setGradeId("");
    setSubjectId("");
    setPeriodId(periodsQuery.data?.find((p) => p.is_active)?.id || "");
    setDueDate(new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16)); // 3 días por defecto
    setDescription("");
    setCreateDialogOpen(true);
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
    if (confirm("¿Estás seguro de eliminar esta tarea?")) {
      await deleteAssignmentMutation.mutateAsync(id);
    }
  };

  const handleOpenSubmissions = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setSubmissionsDialogOpen(true);
  };

  const filteredAssignments = assignments.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.subjects?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Gestión de Tareas</h1>
          <p className="text-sm text-muted-foreground">
            Crea compromisos académicos para tus grupos y revisa las evidencias enviadas por los estudiantes.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Nueva Tarea
        </Button>
      </div>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título o materia..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid de Tareas */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredAssignments.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No hay tareas publicadas"
          description="Presiona 'Nueva Tarea' para crear el primer compromiso académico."
          action={{ label: "Crear Nueva Tarea", onClick: handleOpenCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((assignment) => {
            const dueDateObj = new Date(assignment.due_date);
            const isPastDue = dueDateObj < new Date();

            return (
              <div key={assignment.id} className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-card">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <Badge className={cn("text-white border-0 text-xs", assignment.subjects?.color || "bg-primary")}>
                      {assignment.subjects?.name}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {assignment.grades?.name}
                    </Badge>
                  </div>

                  <h3 className="mt-3 font-bold text-foreground text-base">{assignment.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {assignment.description_json || "Sin instrucciones."}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      {dueDateObj.toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isPastDue && <span className="text-destructive font-semibold">Vencida</span>}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs gap-1.5"
                      onClick={() => handleOpenSubmissions(assignment)}
                    >
                      <UserCheck className="h-3.5 w-3.5 text-primary" /> Revisar Entregas
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => void handleDelete(assignment.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear Tarea */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Publicar Nueva Tarea</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="title" className="text-xs font-semibold">Título de la Tarea *</Label>
              <Input
                id="title"
                placeholder="Ej. Guía 3: Ecuaciones de primer grado"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Grado *</Label>
                <Select value={gradeId} onValueChange={setGradeId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradesQuery.data?.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Asignatura *</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectsQuery.data?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="dueDate" className="text-xs font-semibold">Fecha y Hora Límite *</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-xs font-semibold">Instrucciones y Desarrollo de la Guía</Label>
              <Textarea
                id="description"
                placeholder="Escribe detalladamente las instrucciones o ejercicios a realizar..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 min-h-[120px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => void handleCreateAssignment()} disabled={createAssignmentMutation.isPending} className="gap-2">
              {createAssignmentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Publicar Tarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Revisar Entregas */}
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

function SubmissionsReviewDialog({
  assignment,
  open,
  onOpenChange,
}: {
  assignment: Assignment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: submissions = [], isLoading } = useAssignmentSubmissionsList(assignment.id);
  const evaluateMutation = useEvaluateSubmission();

  const [activeSubmission, setActiveSubmission] = useState<AssignmentSubmission | null>(null);
  const [score, setScore] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");

  const handleOpenEvaluate = (sub: AssignmentSubmission) => {
    setActiveSubmission(sub);
    setScore(sub.score ? String(sub.score) : "");
    setFeedback(sub.feedback || "");
  };

  const handleSaveEvaluation = async () => {
    if (!activeSubmission) return;
    await evaluateMutation.mutateAsync({
      submission_id: activeSubmission.id,
      score: score ? parseFloat(score) : null,
      feedback,
      status: "evaluated",
    });
    setActiveSubmission(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Entregas: {assignment.title} ({assignment.grades?.name})
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Sin entregas aun"
            description="Ningún estudiante ha enviado respuestas para esta tarea todavía."
          />
        ) : (
          <div className="space-y-3 py-2">
            {submissions.map((sub) => (
              <div key={sub.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-card p-4 text-xs">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm">{sub.students?.full_name || "Estudiante"}</span>
                    {sub.status === "evaluated" ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                        Nota: {sub.score ?? "Evaluada"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Entregada</Badge>
                    )}
                  </div>
                  {sub.submission_text && (
                    <p className="text-muted-foreground line-clamp-2">"{sub.submission_text}"</p>
                  )}
                  {sub.file_url && (
                    <a
                      href={sub.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                    >
                      <Eye className="h-3.5 w-3.5" /> Ver Evidencia Optimizada
                    </a>
                  )}
                </div>

                <Button size="sm" variant="outline" onClick={() => handleOpenEvaluate(sub)} className="gap-1.5 self-start sm:self-center">
                  <Award className="h-3.5 w-3.5 text-primary" /> Evaluar
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Calificación */}
        {activeSubmission && (
          <Dialog open={Boolean(activeSubmission)} onOpenChange={() => setActiveSubmission(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-bold">
                  Calificar a {activeSubmission.students?.full_name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div>
                  <Label htmlFor="score" className="text-xs font-semibold">Nota (1.0 a 5.0)</Label>
                  <Input
                    id="score"
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="feedback" className="text-xs font-semibold">Retroalimentación / Comentarios</Label>
                  <Textarea
                    id="feedback"
                    placeholder="Excelente trabajo, bien desarrollado..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="mt-1 min-h-[80px]"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setActiveSubmission(null)}>Cancelar</Button>
                <Button onClick={() => void handleSaveEvaluation()} disabled={evaluateMutation.isPending} className="gap-2">
                  {evaluateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar Nota
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
