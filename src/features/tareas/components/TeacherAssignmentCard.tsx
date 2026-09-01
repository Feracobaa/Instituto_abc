import { Calendar, Download, Trash2, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeDueDate, sanitizeAssignmentDescription } from "../helpers";
import type { TeacherAssignmentCardProps } from "../types";

export function TeacherAssignmentCard({
  assignment,
  index,
  onOpenSubmissions,
  onDownloadPdf,
  onDelete,
}: TeacherAssignmentCardProps) {
  const dueDateObj = new Date(assignment.due_date);
  const relTime = formatRelativeDueDate(assignment.due_date);

  return (
    <div
      className="group relative flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-card hover-lift transition-all hover:border-primary/40 animate-slide-up"
      style={{ animationDelay: `${index * 0.05}s` }}
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
            onClick={() => onOpenSubmissions(assignment)}
          >
            <UserCheck className="h-3.5 w-3.5" /> Revisar Entregas
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-primary hover:bg-primary/10 hover:border-primary/40 shrink-0"
            title="Descargar Guía Oficial en PDF con Escudo"
            onClick={() => void onDownloadPdf(assignment)}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
            title="Eliminar Tarea"
            onClick={() => void onDelete(assignment.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
