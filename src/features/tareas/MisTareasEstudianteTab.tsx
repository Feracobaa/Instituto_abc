import { useMemo, useState } from "react";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Filter,
  Loader2,
  Upload,
  AlertCircle,
  Camera,
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
import type { Assignment } from "@/types/assignments";
import { downloadAssignmentPDF } from "@/utils/assignmentPdfGenerator";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";

export default function MisTareasEstudianteTab() {
  const guardianQuery = useGuardianAccount();
  const student = guardianQuery.data?.students ?? null;
  const gradeId = student?.grade_id ?? undefined;

  const { data: assignments = [], isLoading } = useAssignmentsList({
    gradeId,
    studentId: student?.id,
  });

  const submitMutation = useSubmitAssignment();

  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
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

  // Tareas filtradas
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchSubject = selectedSubject === "all" || a.subject_id === selectedSubject;
      const isSubmitted = Boolean(a.user_submission?.submitted_at);
      const isPastDue = new Date(a.due_date) < new Date();

      let matchStatus = true;
      if (selectedStatus === "pending") {
        matchStatus = !isSubmitted && !isPastDue;
      } else if (selectedStatus === "submitted") {
        matchStatus = isSubmitted;
      } else if (selectedStatus === "late") {
        matchStatus = !isSubmitted && isPastDue;
      }

      return matchSubject && matchStatus;
    });
  }, [assignments, selectedSubject, selectedStatus]);

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
      toast.error("Ingresa una respuesta en texto o adjunta una foto de tu cuaderno.");
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
    toast.info("Generando reconstrucción virtual del PDF...");
    await downloadAssignmentPDF({
      title: assignment.title,
      subjectName: assignment.subjects?.name || "Asignatura",
      gradeName: assignment.grades?.name || "Grado",
      teacherName: assignment.teachers?.full_name || "Docente",
      dueDate: assignment.due_date,
      description: assignment.description_json || "Sin descripción",
    });
  };

  if (isLoading || guardianQuery.isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Sin estudiante vinculado"
        description="Rectoría debe verificar la vinculación del estudiante a este usuario."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Controles de Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground">Tareas Asignadas</h2>
          <p className="text-sm text-muted-foreground">
            Consulta tus deberes, descarga guías e integra evidencias en blanco y negro de tus cuadernos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Materia" />
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

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Estados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="submitted">Entregadas</SelectItem>
              <SelectItem value="late">Vencidas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de Tareas */}
      {filteredAssignments.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Sin tareas registradas"
          description="No se encontraron tareas asignadas para el filtro seleccionado."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((assignment) => {
            const isSubmitted = Boolean(assignment.user_submission?.submitted_at);
            const isEvaluated = assignment.user_submission?.status === "evaluated";
            const dueDateObj = new Date(assignment.due_date);
            const isPastDue = dueDateObj < new Date();

            return (
              <div
                key={assignment.id}
                className="group relative flex flex-col justify-between rounded-xl border bg-card p-5 shadow-card hover-lift transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <Badge className={cn("text-white border-0 text-xs", assignment.subjects?.color || "bg-primary")}>
                      {assignment.subjects?.name || "Materia"}
                    </Badge>
                    {isEvaluated ? (
                      <Badge variant="outline" className="border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        Nota: {assignment.user_submission?.score ?? "Evaluada"}
                      </Badge>
                    ) : isSubmitted ? (
                      <Badge variant="outline" className="border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Entregada
                      </Badge>
                    ) : isPastDue ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" /> Vencida
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" /> Pendiente
                      </Badge>
                    )}
                  </div>

                  <h3 className="mt-3 font-bold text-foreground text-base group-hover:text-primary transition-colors">
                    {assignment.title}
                  </h3>

                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {assignment.description_json?.replace(/<[^>]*>?/gm, "") || "Sin descripción."}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Límite: {dueDateObj.toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                    </span>
                    <span className="truncate max-w-[120px]">{assignment.teachers?.full_name}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs gap-1.5"
                      onClick={() => handleOpenDetail(assignment)}
                    >
                      <FileText className="h-3.5 w-3.5" /> Ver Guía
                    </Button>

                    <Button
                      size="sm"
                      className={cn("flex-1 text-xs gap-1.5", isSubmitted && "bg-secondary text-secondary-foreground hover:bg-secondary/80")}
                      onClick={() => handleOpenSubmission(assignment)}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {isSubmitted ? "Editar Entrega" : "Entregar"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalle de Tarea & Reconstrucción Virtual PDF */}
      {activeAssignment && (
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge className={cn("text-white border-0 text-xs", activeAssignment.subjects?.color || "bg-primary")}>
                  {activeAssignment.subjects?.name}
                </Badge>
                <span className="text-xs text-muted-foreground">• {activeAssignment.grades?.name}</span>
              </div>
              <DialogTitle className="text-xl font-bold text-foreground mt-2">
                {activeAssignment.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/50 p-3 text-xs">
                <div>
                  <span className="font-semibold text-foreground">Docente:</span> {activeAssignment.teachers?.full_name}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Fecha Límite:</span>{" "}
                  {new Date(activeAssignment.due_date).toLocaleString("es-CO")}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-1.5 uppercase text-xs tracking-wider">
                  Instrucciones de la Actividad:
                </h4>
                <div className="rounded-lg border bg-card p-4 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {activeAssignment.description_json || "Sin instrucciones adicionadas."}
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => void handleDownloadPdf(activeAssignment)}
                className="gap-2 text-xs"
              >
                <Download className="h-4 w-4" /> Reconstruir y Exportar PDF Virtual
              </Button>
              <Button onClick={() => { setDetailModalOpen(false); handleOpenSubmission(activeAssignment); }} className="gap-2 text-xs">
                <Upload className="h-4 w-4" /> Ir a Entregar Tarea
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Entrega con Optimizador de Escáner */}
      {activeAssignment && (
        <Dialog open={submissionModalOpen} onOpenChange={setSubmissionModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Entrega de Tarea: {activeAssignment.title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="submission_text" className="text-xs font-semibold">
                  Respuesta o Comentarios de Entrega:
                </Label>
                <Textarea
                  id="submission_text"
                  placeholder="Escribe aquí tu respuesta, enlace o comentarios para el profesor..."
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  className="mt-1 min-h-[100px]"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Adjuntar Evidencia de Cuaderno (Optimizador de Escáner):</Label>
                <div className="mt-1.5 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-4 text-center hover:bg-secondary/40 transition-colors">
                  {filePreview ? (
                    <div className="space-y-2 w-full">
                      <img src={filePreview} alt="Evidencia previa" className="max-h-48 mx-auto rounded border object-contain" />
                      <p className="text-xs text-muted-foreground">Foto seleccionada (se aplicará binarización B/N al enviar)</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Camera className="h-8 w-8 text-primary mb-2" />
                      <p className="text-xs font-medium text-foreground">Toma una foto o selecciona la imagen del cuaderno</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Se reducirá automáticamente de 5 MB a ~30 KB</p>
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="mt-3 text-xs max-w-xs"
                  />
                </div>
              </div>

              {activeAssignment.user_submission?.feedback && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                  <span className="font-bold">Retroalimentación del Docente:</span> {activeAssignment.user_submission.feedback}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setSubmissionModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void handleSendSubmission()} disabled={submitMutation.isPending} className="gap-2">
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
