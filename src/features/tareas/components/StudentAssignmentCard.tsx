import { Award, Calendar, CheckCircle2, Download, Eye, FileText, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeDueDate, sanitizeAssignmentDescription } from "../helpers";
import type { StudentAssignmentCardProps } from "../types";

export function StudentAssignmentCard({
  assignment,
  index,
  onOpenDetail,
  onOpenSubmission,
  onDownloadPdf,
}: StudentAssignmentCardProps) {
  const dueDateObj = new Date(assignment.due_date);
  const relTime = formatRelativeDueDate(assignment.due_date);
  const isSubmitted = Boolean(assignment.user_submission?.submitted_at);
  const isEvaluated = assignment.user_submission?.status === "evaluated";

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-card hover-lift transition-all animate-slide-up",
        isEvaluated
          ? "border-emerald-500/30 hover:border-emerald-500/50"
          : isSubmitted
            ? "border-primary/30 hover:border-primary/50"
            : "hover:border-primary/40"
      )}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div>
        {/* Header de la tarjeta */}
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
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 font-bold text-xs">
              <Award className="h-3 w-3" /> Nota: {assignment.user_submission?.score ?? "—"}
            </Badge>
          ) : isSubmitted ? (
            <Badge className="bg-primary/10 text-primary border-primary/30 gap-1 font-semibold text-xs">
              <CheckCircle2 className="h-3 w-3" /> Entregada
            </Badge>
          ) : (
            <Badge
              variant={relTime.isLate ? "destructive" : relTime.isNear ? "secondary" : "outline"}
              className={cn(
                "text-[11px] font-semibold",
                relTime.isNear && "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              )}
            >
              {relTime.text}
            </Badge>
          )}
        </div>

        <h3 className="mt-3.5 font-bold text-foreground text-base group-hover:text-primary transition-colors leading-snug line-clamp-2">
          {assignment.title}
        </h3>

        <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
          {sanitizeAssignmentDescription(assignment.description_json)}
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
          <span className="text-[11px] text-muted-foreground font-medium">
            {assignment.teachers?.full_name || "Docente"}
          </span>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs gap-1.5 font-semibold rounded-xl"
            onClick={() => onOpenDetail(assignment)}
          >
            <FileText className="h-3.5 w-3.5" /> Ver Guía
          </Button>

          <Button
            variant={isEvaluated ? "outline" : "default"}
            size="sm"
            className={cn(
              "flex-1 text-xs gap-1.5 font-semibold rounded-xl shadow-soft",
              isEvaluated && "text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/10"
            )}
            onClick={() => onOpenSubmission(assignment)}
          >
            {isEvaluated ? (
              <>
                <Eye className="h-3.5 w-3.5" /> Ver Calificación
              </>
            ) : isSubmitted ? (
              <>
                <Upload className="h-3.5 w-3.5" /> Modificar Entrega
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" /> Entregar Tarea
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0"
            title="Descargar Guía en PDF"
            onClick={() => void onDownloadPdf(assignment)}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
