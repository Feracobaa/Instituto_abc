import { Camera, Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SubmitAssignmentDialogProps } from "../types";

export function SubmitAssignmentDialog({
  assignment,
  open,
  onOpenChange,
  submissionText,
  onSubmissionTextChange,
  selectedFile,
  filePreview,
  fileInputRef,
  onFileChange,
  onRemoveFile,
  onSubmit,
  isPending,
}: SubmitAssignmentDialogProps) {
  if (!assignment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Entregar Evidencia: {assignment.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Toma una foto de tu cuaderno o adjunta tu respuesta escrita.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Opción 1: Subir Foto / Cámara */}
          <div>
            <Label className="text-xs font-semibold">Foto del Cuaderno / Evidencia:</Label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={onFileChange}
              className="hidden"
              id="assignment-file-upload"
            />

            {filePreview ? (
              <div className="mt-2 relative rounded-xl overflow-hidden border bg-muted/20 p-2 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={filePreview}
                    alt="Evidencia"
                    className="h-14 w-14 object-cover rounded-lg border shadow-sm"
                  />
                  <div>
                    <span className="font-bold text-foreground block text-xs">
                      {selectedFile ? selectedFile.name : "Foto de evidencia adjuntada"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : "Lista para enviar"}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onRemoveFile}
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 border-2 border-dashed rounded-xl p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="flex justify-center gap-2 text-primary">
                  <Camera className="h-6 w-6" />
                  <ImageIcon className="h-6 w-6" />
                </div>
                <p className="mt-2 font-bold text-foreground text-xs">
                  Toma una foto con la cámara o selecciona de la galería
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  El Optimizador de Escáner mejorará automáticamente la nitidez en B/N
                </p>
              </div>
            )}
          </div>

          {/* Opción 2: Comentarios / Respuesta Escrita */}
          <div>
            <Label htmlFor="submission-text" className="text-xs font-semibold">
              Mensaje o Desarrollo de la Actividad (Opcional):
            </Label>
            <Textarea
              id="submission-text"
              placeholder="Escribe aquí tus conclusiones, dudas para el docente o respuestas..."
              value={submissionText}
              onChange={(e) => onSubmissionTextChange(e.target.value)}
              className="mt-1 min-h-[90px] text-xs rounded-xl leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl text-xs">
            Cancelar
          </Button>
          <Button
            onClick={() => void onSubmit()}
            disabled={isPending}
            className="gap-2 rounded-xl shadow-soft font-semibold text-xs"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar Entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
