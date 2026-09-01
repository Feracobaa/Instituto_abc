import { useState } from "react";
import { Award, BookOpen, Eye, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAssignmentSubmissionsList, useEvaluateSubmission } from "@/hooks/school/useAssignments";
import type { AssignmentSubmission } from "@/types/assignments";
import type { SubmissionsReviewDialogProps } from "../types";

export function SubmissionsReviewDialog({
  assignment,
  open,
  onOpenChange,
}: SubmissionsReviewDialogProps) {
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
              <DialogDescription asChild>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {assignment.grades?.name}
                  </Badge>
                  <span>{submissions.length} evidencias recibidas</span>
                </div>
              </DialogDescription>
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
                          •{" "}
                          {new Date(sub.submitted_at).toLocaleString("es-CO", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
                    <DialogDescription className="text-xs text-muted-foreground">
                      Asigna la nota institucional y envía una retroalimentación motivadora.
                    </DialogDescription>
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
                      className={cn(
                        "text-xs font-bold rounded-lg",
                        score === "5.0" && "border-emerald-500 bg-emerald-500/15 text-emerald-700"
                      )}
                    >
                      ⭐ 5.0 (Excelente)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickScore("4.5", "Muy buen trabajo. Respuestas bien argumentadas.")}
                      className={cn(
                        "text-xs font-bold rounded-lg",
                        score === "4.5" && "border-primary bg-primary/15 text-primary"
                      )}
                    >
                      👍 4.5 (Sobresaliente)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickScore("4.0", "Buen esfuerzo. Revisar detalles en el desarrollo.")}
                      className={cn(
                        "text-xs font-bold rounded-lg",
                        score === "4.0" && "border-amber-500 bg-amber-500/15 text-amber-700"
                      )}
                    >
                      ✍️ 4.0 (Aceptable)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickScore("3.5", "Completar ejercicios faltantes para la próxima entrega.")}
                      className={cn(
                        "text-xs font-bold rounded-lg",
                        score === "3.5" && "border-rose-500 bg-rose-500/15 text-rose-700"
                      )}
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
