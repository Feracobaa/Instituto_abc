import { useMemo, useState } from "react";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  Upload,
  AlertCircle,
  Camera,
  Sparkles,
  Award,
  TrendingUp,
  GraduationCap,
  MessageSquareQuote,
  Check,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useGuardianAccount } from "@/hooks/useSchoolData";
import { useAssignmentsList, useSubmitAssignment } from "@/hooks/school/useAssignments";
import { useInstitutionSettings } from "@/hooks/school/useInstitution";
import type { Assignment } from "@/types/assignments";
import { downloadAssignmentPDF } from "@/utils/assignmentPdfGenerator";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";

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
  const [selectedTab, setSelectedTab] = useState<"all" | "pending" | "submitted" | "evaluated">("all");
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);

  // Formulario de Entrega
  const [submissionText, setSubmissionText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Filtros de asignaturas únicas
  const subjects = useMemo(() => {
    const map = new Map<string, string>();
    assignments.forEach((a) => {
      if (a.subjects) {
        map.set(a.subjects.id, a.subjects.name);
      }
    });
    return Array.from(map.entries());
  }, [assignments]);

  // Estadísticas del Estudiante
  const metrics = useMemo(() => {
    const total = assignments.length;
    const submitted = assignments.filter((a) => Boolean(a.user_submission?.submitted_at)).length;
    const evaluated = assignments.filter((a) => a.user_submission?.status === "evaluated");
    const evaluatedCount = evaluated.length;

    const scores = evaluated
      .map((a) => a.user_submission?.score)
      .filter((s): s is number => typeof s === "number");
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;

    const pending = assignments.filter(
      (a) => !a.user_submission?.submitted_at && new Date(a.due_date) >= new Date()
    ).length;

    const late = assignments.filter(
      (a) => !a.user_submission?.submitted_at && new Date(a.due_date) < new Date()
    ).length;

    const complianceRate = total > 0 ? Math.round((submitted / total) * 100) : 100;

    return { total, submitted, evaluatedCount, pending, late, avgScore, complianceRate };
  }, [assignments]);

  // Tareas filtradas por pestaña y materia
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchSubject = selectedSubject === "all" || a.subject_id === selectedSubject;
      const isSubmitted = Boolean(a.user_submission?.submitted_at);
      const isEvaluated = a.user_submission?.status === "evaluated";
      const isPastDue = new Date(a.due_date) < new Date();

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

  const handleSendSubmission = async () => {
    if (!student || !activeAssignment) return;
    if (!submissionText.trim() && !selectedFile && !filePreview) {
      toast.error("Ingresa una respuesta escrita o adjunta una foto de tu cuaderno escolar.");
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

  const formatCountdown = (dateStr: string) => {
    const due = new Date(dateStr);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      return { text: "Plazo vencido", isLate: true, isNear: false };
    }
    if (diffDays === 0 || diffDays === 1) {
      return { text: "¡Vence hoy o mañana!", isLate: false, isNear: true };
    }
    return { text: `Quedan ${diffDays} días`, isLate: false, isNear: false };
  };

  if (isLoading || guardianQuery.isLoading) {
    return (
      <div className="flex h-56 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium">Cargando cuaderno y tareas...</span>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Sin estudiante vinculado"
        description="Rectoría debe verificar la vinculación del estudiante a este usuario para habilitar las tareas."
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner de Bienvenida y Rendimiento Académico */}
      <div className="rounded-3xl border bg-gradient-to-r from-primary/10 via-card to-emerald-500/10 p-5 sm:p-6 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5 rounded-lg shadow-sm">
                Estudiante Titular
              </Badge>
              {metrics.avgScore && (
                <Badge variant="outline" className="border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold text-xs gap-1">
                  <Award className="h-3 w-3" /> Promedio Tareas: {metrics.avgScore}
                </Badge>
              )}
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-extrabold text-foreground">
              ¡Hola, {student.full_name}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Aquí puedes consultar tus compromisos académicos, descargar las guías oficiales en PDF y subir fotos del cuaderno.
            </p>
          </div>

          {/* Medidor de Cumplimiento */}
          <div className="flex items-center gap-3 bg-card/80 backdrop-blur rounded-2xl p-3.5 border shadow-sm self-start md:self-center">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
              {metrics.complianceRate}%
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Tasa de Cumplimiento</p>
              <p className="text-[11px] text-muted-foreground">
                {metrics.submitted} de {metrics.total} tareas entregadas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Tabs de Navegación */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Pestañas de Estado */}
        <div className="flex items-center gap-1.5 bg-muted/50 p-1.5 rounded-2xl border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTab("all")}
            className={cn(
              "text-xs font-semibold rounded-xl h-8 px-3 transition-all",
              selectedTab === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Todas ({metrics.total})
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTab("pending")}
            className={cn(
              "text-xs font-semibold rounded-xl h-8 px-3 transition-all",
              selectedTab === "pending" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Pendientes ({metrics.pending + metrics.late})
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTab("submitted")}
            className={cn(
              "text-xs font-semibold rounded-xl h-8 px-3 transition-all",
              selectedTab === "submitted" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Entregadas ({metrics.submitted})
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTab("evaluated")}
            className={cn(
              "text-xs font-semibold rounded-xl h-8 px-3 transition-all",
              selectedTab === "evaluated" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Calificadas ({metrics.evaluatedCount})
          </Button>
        </div>

        {/* Filtro por Materia */}
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-48 text-xs h-9 rounded-xl">
            <SelectValue placeholder="Filtrar por Materia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las Materias</SelectItem>
            {subjects.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid de Tareas Estudiantiles */}
      {filteredAssignments.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Sin tareas en esta categoría"
          description="¡Buen trabajo! No tienes tareas pendientes bajo este filtro actualmente."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredAssignments.map((assignment, idx) => {
            const isSubmitted = Boolean(assignment.user_submission?.submitted_at);
            const isEvaluated = assignment.user_submission?.status === "evaluated";
            const dueDateObj = new Date(assignment.due_date);
            const countdown = formatCountdown(assignment.due_date);

            return (
              <div
                key={assignment.id}
                className={cn(
                  "group relative flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-card hover-lift transition-all animate-slide-up",
                  isEvaluated
                    ? "border-emerald-500/40 hover:border-emerald-500"
                    : isSubmitted
                    ? "border-primary/40 hover:border-primary"
                    : countdown.isNear
                    ? "border-amber-500/40 hover:border-amber-500"
                    : "hover:border-primary/30"
                )}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div>
                  {/* Header de la Tarjeta */}
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      className={cn(
                        "text-white border-0 text-xs font-semibold px-2.5 py-0.5 rounded-lg shadow-sm",
                        assignment.subjects?.color || "bg-primary"
                      )}
                    >
                      {assignment.subjects?.name || "Asignatura"}
                    </Badge>

                    {isEvaluated ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold text-xs gap-1">
                        <Award className="h-3 w-3" /> Nota: {assignment.user_submission?.score ?? "5.0"}
                      </Badge>
                    ) : isSubmitted ? (
                      <Badge className="bg-primary/10 text-primary border-primary/20 font-semibold text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Entregada
                      </Badge>
                    ) : countdown.isLate ? (
                      <Badge variant="destructive" className="font-semibold text-xs gap-1">
                        <AlertCircle className="h-3 w-3" /> Plazo Vencido
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] font-semibold",
                          countdown.isNear && "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        )}
                      >
                        <Clock className="h-3 w-3 mr-1" /> {countdown.text}
                      </Badge>
                    )}
                  </div>

                  <h3 className="mt-3.5 font-bold text-foreground text-base group-hover:text-primary transition-colors leading-snug line-clamp-2">
                    {assignment.title}
                  </h3>

                  <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {assignment.description_json?.replace(/<[^>]*>?/gm, "") || "Sin instrucciones detalladas."}
                  </p>

                  {/* Burbuja de Retroalimentación del Docente */}
                  {isEvaluated && assignment.user_submission?.feedback && (
                    <div className="mt-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                      <MessageSquareQuote className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          Mensaje del Docente:
                        </p>
                        <p className="italic leading-relaxed">{assignment.user_submission.feedback}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer de la Tarjeta */}
                <div className="mt-5 pt-3.5 border-t border-border space-y-3.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Límite: {dueDateObj.toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                    </span>
                    <span className="truncate max-w-[130px] font-medium text-foreground">
                      {assignment.teachers?.full_name || "Docente"}
                    </span>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs gap-1.5 rounded-xl font-semibold hover:border-primary/40"
                      onClick={() => handleOpenDetail(assignment)}
                    >
                      <FileText className="h-3.5 w-3.5 text-primary" /> Ver Guía
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-primary hover:bg-primary/10 hover:border-primary/40 shrink-0 rounded-xl"
                      title="Descargar Guía Oficial en PDF con Escudo"
                      onClick={() => void handleDownloadPdf(assignment)}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      className={cn(
                        "flex-1 text-xs gap-1.5 rounded-xl font-semibold shadow-soft",
                        isSubmitted
                          ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          : "bg-primary text-primary-foreground"
                      )}
                      onClick={() => handleOpenSubmission(assignment)}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {isSubmitted ? "Editar Entrega" : "Entregar Tarea"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalle de Guía Oficial */}
      {activeAssignment && (
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge
                  className={cn(
                    "text-white border-0 text-xs font-semibold px-2.5 py-0.5 rounded-lg",
                    activeAssignment.subjects?.color || "bg-primary"
                  )}
                >
                  {activeAssignment.subjects?.name}
                </Badge>
                <span className="text-xs text-muted-foreground">• {activeAssignment.grades?.name}</span>
              </div>
              <DialogTitle className="text-xl font-bold text-foreground mt-2">
                {activeAssignment.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary/50 p-3.5 text-xs">
                <div>
                  <span className="font-semibold text-foreground">Docente Titular:</span>{" "}
                  {activeAssignment.teachers?.full_name || "Docente"}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Fecha Límite:</span>{" "}
                  {new Date(activeAssignment.due_date).toLocaleString("es-CO")}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-1.5 uppercase text-[11px] tracking-wider">
                  Instrucciones y Desarrollo de la Guía:
                </h4>
                <div className="rounded-xl border bg-card p-4 text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm">
                  {activeAssignment.description_json || "Sin instrucciones detalladas."}
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => void handleDownloadPdf(activeAssignment)}
                className="gap-2 text-xs rounded-xl"
              >
                <Download className="h-4 w-4 text-primary" /> Descargar Guía Oficial en PDF
              </Button>
              <Button
                onClick={() => {
                  setDetailModalOpen(false);
                  handleOpenSubmission(activeAssignment);
                }}
                className="gap-2 text-xs rounded-xl shadow-soft font-semibold"
              >
                <Upload className="h-4 w-4" /> Ir a Entregar Tarea
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Entrega con Dropzone Táctil y Cámara */}
      {activeAssignment && (
        <Dialog open={submissionModalOpen} onOpenChange={setSubmissionModalOpen}>
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    Entrega: {activeAssignment.title}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    {activeAssignment.subjects?.name} • Docente: {activeAssignment.teachers?.full_name}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div>
                <Label htmlFor="submission_text" className="text-xs font-semibold">
                  Respuesta o Comentarios de tu Entrega:
                </Label>
                <Textarea
                  id="submission_text"
                  placeholder="Escribe aquí tu solución, enlaces a documentos o comentarios para el docente..."
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  className="mt-1 min-h-[90px] rounded-xl text-sm leading-relaxed"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Adjuntar Foto del Cuaderno (Optimizador de Escáner B/N):
                </Label>
                <div className="mt-1.5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-5 text-center hover:bg-secondary/40 transition-colors">
                  {filePreview ? (
                    <div className="space-y-2.5 w-full">
                      <img
                        src={filePreview}
                        alt="Evidencia seleccionada"
                        className="max-h-48 mx-auto rounded-xl border object-contain shadow-sm"
                      />
                      <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-semibold">
                        <Check className="h-4 w-4" /> Foto lista para enviar y optimizar
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="p-3 bg-primary/10 rounded-2xl text-primary mb-2">
                        <Camera className="h-6 w-6" />
                      </div>
                      <p className="text-xs font-semibold text-foreground">
                        Toma una foto con tu celular o arrastra la imagen del cuaderno
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        El sistema reducirá el peso de ~5 MB a ~30 KB conservando legibilidad
                      </p>
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="mt-3 text-xs max-w-xs rounded-xl"
                  />
                </div>
              </div>

              {activeAssignment.user_submission?.feedback && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-900 dark:text-emerald-200">
                  <span className="font-bold">Retroalimentación actual del profesor:</span>{" "}
                  {activeAssignment.user_submission.feedback}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setSubmissionModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={() => void handleSendSubmission()}
                disabled={submitMutation.isPending}
                className="gap-2 rounded-xl shadow-soft font-semibold"
              >
                {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar y Enviar Tarea
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
