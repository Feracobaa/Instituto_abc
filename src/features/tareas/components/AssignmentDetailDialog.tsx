import { BookOpen, Calendar, Download, FileText, User } from "lucide-react";
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
import type { AssignmentDetailDialogProps } from "../types";

export function AssignmentDetailDialog({
  assignment,
  open,
  onOpenChange,
  onDownloadPdf,
}: AssignmentDetailDialogProps) {
  if (!assignment) return null;

  const dueDateObj = new Date(assignment.due_date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {assignment.title}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs font-semibold">
                    {assignment.subjects?.name}
                  </Badge>
                  <span>• {assignment.grades?.name}</span>
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Metadatos */}
          <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-xl border">
            <div>
              <span className="text-[11px] text-muted-foreground font-semibold uppercase flex items-center gap-1">
                <User className="h-3 w-3" /> Docente
              </span>
              <p className="font-bold text-foreground mt-0.5">
                {assignment.teachers?.full_name || "Docente Titular"}
              </p>
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground font-semibold uppercase flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Plazo Límite
              </span>
              <p className="font-bold text-foreground mt-0.5">
                {dueDateObj.toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {/* Instrucciones */}
          <div>
            <span className="text-xs font-bold text-foreground">Instrucciones y Objetivos:</span>
            <div className="mt-1.5 p-3.5 bg-card rounded-xl border text-muted-foreground text-xs leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
              {assignment.description_json?.replace(/<[^>]*>?/gm, "") || "Sin instrucciones específicas."}
            </div>
          </div>

          {/* Adjuntos */}
          {assignment.attachment_url && (
            <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 flex items-center justify-between">
              <span className="font-semibold text-primary text-xs flex items-center gap-1.5">
                <FileText className="h-4 w-4" /> Material Complementario Adjunto
              </span>
              <a
                href={assignment.attachment_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-primary hover:underline"
              >
                Abrir Archivo
              </a>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => void onDownloadPdf(assignment)}
            className="gap-1.5 rounded-xl text-xs font-semibold"
          >
            <Download className="h-4 w-4" /> Descargar Guía PDF
          </Button>
          <Button onClick={() => onOpenChange(false)} className="rounded-xl text-xs font-semibold">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
