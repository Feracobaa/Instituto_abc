import { useState, useMemo } from "react";
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
  Download,
  Sparkles,
  TrendingUp,
  GraduationCap,
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
import { useInstitutionSettings } from "@/hooks/school/useInstitution";
import {
  useAssignmentsList,
  useAssignmentSubmissionsList,
  useCreateAssignment,
  useDeleteAssignment,
  useEvaluateSubmission,
} from "@/hooks/school/useAssignments";
import type { Assignment, AssignmentSubmission } from "@/types/assignments";
import { downloadAssignmentPDF } from "@/utils/assignmentPdfGenerator";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";

export function GestionTareasDocente() {
  const { teacherId, userRole } = useAuth();
  const isRector = userRole === "rector";
  const { data: settings } = useInstitutionSettings();

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
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("all");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");

  // Formulario Crear Tarea
  const [title, setTitle] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  // Métricas / KPIs calculados
  const stats = useMemo(() => {
    const total = assignments.length;
    const now = new Date();
    const active = assignments.filter((a) => new Date(a.due_date) >= now).length;
    const pastDue = total - active;
    const uniqueGrades = new Set(assignments.map((a) => a.grade_id)).size;
    const uniqueSubjects = new Set(assignments.map((a) => a.subject_id)).size;

    return { total, active, pastDue, uniqueGrades, uniqueSubjects };
  }, [assignments]);

  const handleOpenCreate = () => {
    setTitle("");
    setGradeId("");
    setSubjectId("");
    setPeriodId(periodsQuery.data?.find((p) => p.is_active)?.id || "");
    // Por defecto 3 días adelante a las 18:00
    const d = new Date(Date.now() + 86400000 * 3);
    d.setHours(18, 0, 0, 0);
    setDueDate(d.toISOString().slice(0, 16));
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
    if (confirm("¿Estás seguro de eliminar esta tarea y sus entregas asociadas?")) {
      await deleteAssignmentMutation.mutateAsync(id);
    }
  };

  const handleOpenSubmissions = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setSubmissionsDialogOpen(true);
  };

  const handleDownloadPdf = async (assignment: Assignment) => {
    toast.info("Generando guía oficial en PDF con logotipo institucional...");
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
        periodName: assignment.academic_periods?.name || undefined,
        dueDate: assignment.due_date,
        createdDate: assignment.created_at,
        description: assignment.description_json || "Sin instrucciones",
        attachmentUrl: assignment.attachment_url,
      },
      instData
    );
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchSearch =
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.subjects?.name.toLowerCase().includes(search.toLowerCase()) ||
        a.grades?.name.toLowerCase().includes(search.toLowerCase());

      const matchGrade = selectedGradeFilter === "all" || a.grade_id === selectedGradeFilter;
      const matchSubject = selectedSubjectFilter === "all" || a.subject_id === selectedSubjectFilter;

      return matchSearch && matchGrade && matchSubject;
    });
  }, [assignments, search, selectedGradeFilter, selectedSubjectFilter]);

  const formatRelativeTime = (dateStr: string) => {
    const due = new Date(dateStr);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      return { text: "Vencida", isLate: true, isNear: false };
    }
    if (diffDays === 0 || diffDays === 1) {
      return { text: "Vence hoy o mañana", isLate: false, isNear: true };
    }
    return { text: `Vence en ${diffDays} días`, isLate: false, isNear: false };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Principal con Bienvenida y Botón de Acción */}
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

      {/* KPI Cards / Indicadores de Rendimiento */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border bg-card/80 backdrop-blur p-4 shadow-card hover-lift transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Tareas Totales</span>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-foreground">{stats.total}</span>
            <span className="text-xs text-muted-foreground">publicadas</span>
          </div>
        </div>

        <div className="rounded-2xl border bg-card/80 backdrop-blur p-4 shadow-card hover-lift transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Vigentes</span>
            <Clock className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {stats.active}
            </span>
            <span className="text-xs text-muted-foreground">en plazo</span>
          </div>
        </div>

        <div className="rounded-2xl border bg-card/80 backdrop-blur p-4 shadow-card hover-lift transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Grupos Cubiertos</span>
            <GraduationCap className="h-4 w-4 text-violet-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-violet-600 dark:text-violet-400">
              {stats.uniqueGrades}
            </span>
            <span className="text-xs text-muted-foreground">grados</span>
          </div>
        </div>

        <div className="rounded-2xl border bg-card/80 backdrop-blur p-4 shadow-card hover-lift transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Asignaturas</span>
            <TrendingUp className="h-4 w-4 text-cyan-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-cyan-600 dark:text-cyan-400">
              {stats.uniqueSubjects}
            </span>
            <span className="text-xs text-muted-foreground">áreas</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Dinámica */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3.5 rounded-2xl border shadow-card">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, grado o materia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9.5 bg-background text-sm rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Grado */}
          <Select value={selectedGradeFilter} onValueChange={setSelectedGradeFilter}>
            <SelectTrigger className="w-36 text-xs h-9 rounded-xl">
              <SelectValue placeholder="Grado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Grados</SelectItem>
              {gradesQuery.data?.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro Asignatura */}
          <Select value={selectedSubjectFilter} onValueChange={setSelectedSubjectFilter}>
            <SelectTrigger className="w-36 text-xs h-9 rounded-xl">
              <SelectValue placeholder="Materia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Materias</SelectItem>
              {subjectsQuery.data?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid de Tareas */}
      {isLoading ? (
        <div className="flex h-56 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Cargando compromisos académicos...</span>
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
          {filteredAssignments.map((assignment, idx) => {
            const dueDateObj = new Date(assignment.due_date);
            const relTime = formatRelativeTime(assignment.due_date);

            return (
              <div
                key={assignment.id}
                className="group relative flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-card hover-lift transition-all hover:border-primary/40 animate-slide-up"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {/* Header de la tarjeta */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      className={cn(
                        "text-white border-0 text-xs font-semibold px-2.5 py-0.5 rounded-lg shadow-sm",
                        assignment.subjects?.color || "bg-primary"
                      )}
                    >
                      {assignment.subjects?.name || "Asignatura"}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 rounded-lg border-border">
                      {assignment.grades?.name || "Grado"}
                    </Badge>
                  </div>

                  <h3 className="mt-3.5 font-bold text-foreground text-base group-hover:text-primary transition-colors leading-snug line-clamp-2">
                    {assignment.title}
                  </h3>

                  <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {assignment.description_json?.replace(/<[^>]*>?/gm, "") || "Sin instrucciones adicionadas."}
                  </p>
                </div>

                {/* Footer de la tarjeta */}
                <div className="mt-5 pt-3.5 border-t border-border space-y-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      {dueDateObj.toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <Badge
                      variant={relTime.isLate ? "destructive" : relTime.isNear ? "secondary" : "outline"}
                      className={cn(
                        "text-[11px] font-semibold",
                        relTime.isNear && "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      )}
                    >
                      {relTime.text}
                    </Badge>
                  </div>

                  {/* Acciones Rápidas */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 text-xs gap-1.5 font-semibold shadow-soft"
                      onClick={() => handleOpenSubmissions(assignment)}
                    >
                      <UserCheck className="h-3.5 w-3.5" /> Revisar Entregas
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-primary hover:bg-primary/10 hover:border-primary/40 shrink-0"
                      title="Descargar Guía Oficial en PDF con Escudo"
                      onClick={() => void handleDownloadPdf(assignment)}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                      title="Eliminar Tarea"
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
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Publicar Nueva Tarea
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Asigna instrucciones, plazo y genera automáticamente la guía PDF institucional.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <Label htmlFor="title" className="text-xs font-semibold">
                Título de la Tarea o Compromiso *
              </Label>
              <Input
                id="title"
                placeholder="Ej. Guía 3: Ecuaciones de primer grado y problemas de aplicación"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 text-sm rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Grado Escolar *</Label>
                <Select value={gradeId} onValueChange={setGradeId}>
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue placeholder="Seleccionar Grado" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradesQuery.data?.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Asignatura *</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue placeholder="Seleccionar Materia" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectsQuery.data?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Periodo Académico</Label>
                <Select value={periodId} onValueChange={setPeriodId}>
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue placeholder="Periodo Actual" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodsQuery.data?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.is_active ? "(Activo)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dueDate" className="text-xs font-semibold">
                  Fecha y Hora Límite *
                </Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-xs font-semibold">
                Instrucciones y Desarrollo de la Actividad
              </Label>
              <Textarea
                id="description"
                placeholder="Describe paso a paso los ejercicios a resolver en el cuaderno, criterios de evaluación o enlaces..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 min-h-[120px] rounded-xl text-sm leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={() => void handleCreateAssignment()}
              disabled={createAssignmentMutation.isPending}
              className="gap-2 rounded-xl shadow-soft font-semibold"
            >
              {createAssignmentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Publicar Tarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal / Drawer Revisar Entregas */}
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

  const evaluatedCount = submissions.filter((s) => s.status === "evaluated").length;
  const pendingCount = submissions.length - evaluatedCount;

  const handleOpenEvaluate = (sub: AssignmentSubmission) => {
    setActiveSubmission(sub);
    setScore(sub.score ? String(sub.score) : "5.0");
    setFeedback(sub.feedback || "¡Excelente trabajo! Cumple satisfactoriamente con los objetivos propuestos.");
  };

  const handleQuickScore = (val: string, defaultPraise: string) => {
    setScore(val);
    setFeedback(defaultPraise);
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
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl">
        <DialogHeader className="border-b pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Entregas: {assignment.title}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {assignment.grades?.name}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {submissions.length} evidencias recibidas
                </span>
              </div>
            </div>

            {/* Badges de balance */}
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs">
                {evaluatedCount} Evaluadas
              </Badge>
              {pendingCount > 0 && (
                <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-xs">
                  {pendingCount} Pendientes
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-36 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Sin entregas aún"
            description="Ningún estudiante de este grupo ha enviado respuestas o evidencias fotográficas para esta tarea."
          />
        ) : (
          <div className="space-y-3 py-3">
            {submissions.map((sub) => {
              const isEvaluated = sub.status === "evaluated";

              return (
                <div
                  key={sub.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-xl border bg-card p-4 text-xs shadow-sm hover:border-primary/30 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-sm">
                        {sub.students?.full_name || "Estudiante"}
                      </span>
                      {isEvaluated ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold">
                          Nota: {sub.score ?? "Evaluada"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-medium">
                          Evidencia Enviada
                        </Badge>
                      )}
                      {sub.submitted_at && (
                        <span className="text-[11px] text-muted-foreground">
                          • {new Date(sub.submitted_at).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>

                    {sub.submission_text && (
                      <p className="text-muted-foreground line-clamp-2 italic bg-muted/30 p-2 rounded-lg">
                        "{sub.submission_text}"
                      </p>
                    )}

                    {sub.feedback && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                        Retroalimentación: {sub.feedback}
                      </p>
                    )}

                    {sub.file_url && (
                      <div className="pt-1">
                        <a
                          href={sub.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-primary hover:underline font-semibold bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/20"
                        >
                          <Eye className="h-3.5 w-3.5" /> Ver Foto Optimizada del Cuaderno
                        </a>
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant={isEvaluated ? "outline" : "default"}
                    onClick={() => handleOpenEvaluate(sub)}
                    className="gap-1.5 self-start sm:self-center font-semibold rounded-xl"
                  >
                    <Award className="h-3.5 w-3.5 text-primary" />
                    {isEvaluated ? "Modificar Nota" : "Calificar"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de Calificación con Presets Rápidos */}
        {activeSubmission && (
          <Dialog open={Boolean(activeSubmission)} onOpenChange={() => setActiveSubmission(null)}>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-foreground">
                      Calificar a {activeSubmission.students?.full_name}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">
                      Asigna la nota institucional y envía una retroalimentación motivadora.
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Presets de Nota Rápida */}
                <div>
                  <Label className="text-xs font-semibold">Calificación Rápida:</Label>
                  <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickScore("5.0", "¡Excelente trabajo! Desarrollo impecable y completo.")}
                      className={cn("text-xs font-bold rounded-lg", score === "5.0" && "border-emerald-500 bg-emerald-500/15 text-emerald-700")}
                    >
                      ⭐ 5.0 (Excelente)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickScore("4.5", "Muy buen trabajo. Respuestas bien argumentadas.")}
                      className={cn("text-xs font-bold rounded-lg", score === "4.5" && "border-primary bg-primary/15 text-primary")}
                    >
                      👍 4.5 (Sobresaliente)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickScore("4.0", "Buen esfuerzo. Revisar detalles en el desarrollo.")}
                      className={cn("text-xs font-bold rounded-lg", score === "4.0" && "border-amber-500 bg-amber-500/15 text-amber-700")}
                    >
                      ✍️ 4.0 (Aceptable)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickScore("3.5", "Completar ejercicios faltantes para la próxima entrega.")}
                      className={cn("text-xs font-bold rounded-lg", score === "3.5" && "border-rose-500 bg-rose-500/15 text-rose-700")}
                    >
                      ⚠️ 3.5 (Básico)
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="score" className="text-xs font-semibold">
                    Nota Numérica (Escala 1.0 a 5.0) *
                  </Label>
                  <Input
                    id="score"
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="mt-1 text-sm font-bold rounded-xl"
                  />
                </div>

                <div>
                  <Label htmlFor="feedback" className="text-xs font-semibold">
                    Retroalimentación y Comentarios para el Estudiante:
                  </Label>
                  <Textarea
                    id="feedback"
                    placeholder="Escribe comentarios de felicitación o recomendaciones pedagógicas..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="mt-1 min-h-[90px] text-xs rounded-xl leading-relaxed"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setActiveSubmission(null)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button
                  onClick={() => void handleSaveEvaluation()}
                  disabled={evaluateMutation.isPending}
                  className="gap-2 rounded-xl shadow-soft font-semibold"
                >
                  {evaluateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar Calificación
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
