import { Award, CheckCircle2, MessageSquareQuote } from "lucide-react";
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
import type { SubmissionFeedbackDialogProps } from "../types";

export function SubmissionFeedbackDialog({
  submission,
  open,
  onOpenChange,
}: SubmissionFeedbackDialogProps) {
  if (!submission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Evaluación y Calificación Obtenida
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Retroalimentación oficial registrada por tu docente titular.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Tarjeta de Nota */}
          <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 block">
                Calificación Asignada:
              </span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {submission.score !== null && submission.score !== undefined
                  ? Number(submission.score).toFixed(1)
                  : "—"}
              </span>
              <span className="text-xs text-muted-foreground"> / 5.0</span>
            </div>
            <Badge className="bg-emerald-600 text-white font-bold text-xs gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Evaluada
            </Badge>
          </div>

          {/* Comentarios Pedagógicos */}
          <div>
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <MessageSquareQuote className="h-3.5 w-3.5 text-primary" /> Observaciones del Docente:
            </span>
            <div className="mt-1.5 p-3.5 bg-muted/40 rounded-xl border text-foreground text-xs leading-relaxed italic">
              "{submission.feedback || "¡Buen trabajo! Cumple con los objetivos de la actividad."}"
            </div>
          </div>

          {/* Fecha de Entrega */}
          {submission.submitted_at && (
            <p className="text-[11px] text-muted-foreground text-center">
              Entregado el:{" "}
              {new Date(submission.submitted_at).toLocaleString("es-CO", {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="rounded-xl text-xs font-semibold w-full">
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
