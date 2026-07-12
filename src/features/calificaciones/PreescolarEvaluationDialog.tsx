import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyPreescolarDimensionSelection } from "@/features/calificaciones/helpers";
import type { PreescolarEvaluationDialogProps } from "@/features/calificaciones/types";
import { PREESCOLAR_DIMENSIONS } from "@/utils/constants";

export function PreescolarEvaluationDialog({
  availableTeachersForSelectedGrade,
  editingPreescolar,
  isPending,
  isRector,
  onOpenChange,
  onSave,
  open,
  setEditingPreescolar,
}: PreescolarEvaluationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editingPreescolar?.id ? "Editar dimension" : "Nueva evaluacion (dimension)"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!editingPreescolar?.id && (
            <>
              {isRector && (
                <div className="space-y-2">
                  <Label>Docente responsable</Label>
                  <Select
                    value={editingPreescolar?.teacher_id}
                    onValueChange={(value) =>
                      setEditingPreescolar((previous) =>
                        previous ? { ...previous, teacher_id: value } : null,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar docente" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeachersForSelectedGrade.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Dimension a evaluar</Label>
                <Select
                  value={editingPreescolar?.dimension}
                  onValueChange={(value) =>
                    setEditingPreescolar((previous) =>
                      previous ? applyPreescolarDimensionSelection(previous, value) : null,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar dimension" />
                  </SelectTrigger>
                  <SelectContent>
                    {PREESCOLAR_DIMENSIONS.map((dimension) => (
                      <SelectItem key={dimension} value={dimension}>
                        {dimension}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {isRector && editingPreescolar?.id && (
            <div className="space-y-2">
              <Label>Docente responsable</Label>
              <Select
                value={editingPreescolar.teacher_id}
                onValueChange={(value) =>
                  setEditingPreescolar((previous) =>
                    previous ? { ...previous, teacher_id: value } : null,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar docente" />
                </SelectTrigger>
                <SelectContent>
                  {availableTeachersForSelectedGrade.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="mt-4 rounded-lg bg-blue-50/50 p-3 text-sm text-muted-foreground dark:bg-blue-900/20">
            Las fortalezas aparecen por defecto, pero puedes editarlas. Las debilidades y
            recomendaciones son opcionales.
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-emerald-700 dark:text-emerald-400">
              Fortalezas
            </Label>
            <Textarea
              placeholder="Describe las fortalezas en esta dimension..."
              value={editingPreescolar?.fortalezas || ""}
              maxLength={1000}
              onChange={(event) =>
                setEditingPreescolar((previous) =>
                  previous ? { ...previous, fortalezas: event.target.value } : null,
                )
              }
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-rose-700 dark:text-rose-400">
              Debilidades (opcional)
            </Label>
            <Textarea
              placeholder="Describe las debilidades en esta dimension..."
              value={editingPreescolar?.debilidades || ""}
              maxLength={1000}
              onChange={(event) =>
                setEditingPreescolar((previous) =>
                  previous ? { ...previous, debilidades: event.target.value } : null,
                )
              }
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-blue-700 dark:text-blue-400">
              Recomendaciones (opcional)
            </Label>
            <Textarea
              placeholder="Recomendaciones para superar las debilidades..."
              value={editingPreescolar?.recomendaciones || ""}
              maxLength={1000}
              onChange={(event) =>
                setEditingPreescolar((previous) =>
                  previous ? { ...previous, recomendaciones: event.target.value } : null,
                )
              }
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={onSave}
              disabled={
                isPending ||
                (!editingPreescolar?.id && !editingPreescolar?.dimension) ||
                (isRector && !editingPreescolar?.teacher_id)
              }
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
