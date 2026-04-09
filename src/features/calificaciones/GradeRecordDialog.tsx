import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getGradeColor, getGradeSublabel } from "@/features/calificaciones/helpers";
import type { GradeRecordDialogProps } from "@/features/calificaciones/types";
import { cn } from "@/lib/utils";

export function GradeRecordDialog({
  availableSubjects,
  availableTeachersForSelectedGrade,
  editingRecord,
  isPending,
  isRector,
  onOpenChange,
  onSave,
  open,
  setEditingRecord,
  teacherOptionsForRecord,
}: GradeRecordDialogProps) {
  const editableGradeValue =
    editingRecord && typeof editingRecord.grade === "number" && !Number.isNaN(editingRecord.grade)
      ? editingRecord.grade
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingRecord?.id ? "Editar calificacion" : "Nueva calificacion"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!editingRecord?.id && (
            <>
              {isRector && (
                <div className="space-y-2">
                  <Label>Docente responsable</Label>
                  <Select
                    value={editingRecord?.teacher_id}
                    onValueChange={(value) =>
                      setEditingRecord((previous) =>
                        previous ? { ...previous, teacher_id: value, subject_id: "" } : null,
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
                  {availableTeachersForSelectedGrade.length === 0 && (
                    <p className="text-xs text-destructive">
                      No hay docentes asignados a este grado. Asignalos desde Profesores antes de
                      registrar notas.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Materia</Label>
                <Select
                  value={editingRecord?.subject_id}
                  onValueChange={(value) =>
                    setEditingRecord((previous) =>
                      previous ? { ...previous, subject_id: value } : null,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar materia" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isRector && !editingRecord?.teacher_id && (
                  <p className="text-xs text-muted-foreground">
                    Primero selecciona el docente para mostrar solo las materias que realmente dicta.
                  </p>
                )}
              </div>
            </>
          )}

          {isRector && editingRecord?.id && (
            <div className="space-y-2">
              <Label>Docente responsable</Label>
              <Select
                value={editingRecord.teacher_id}
                onValueChange={(value) =>
                  setEditingRecord((previous) =>
                    previous ? { ...previous, teacher_id: value } : null,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar docente" />
                </SelectTrigger>
                <SelectContent>
                  {teacherOptionsForRecord.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Calificacion (1.0 a 5.0)</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                className="h-12 w-32 text-center text-lg font-bold"
                value={editingRecord?.grade ?? ""}
                onChange={(event) =>
                  setEditingRecord((previous) =>
                    previous
                      ? {
                          ...previous,
                          grade:
                            event.target.value === ""
                              ? ""
                              : parseFloat(event.target.value),
                        }
                      : null,
                  )
                }
              />
              {editableGradeValue !== null && (
                <div
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-bold shadow-sm",
                    getGradeColor(editableGradeValue),
                  )}
                >
                  {getGradeSublabel(editableGradeValue)}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Logros</Label>
            <Textarea
              placeholder="Describe los logros alcanzados..."
              value={editingRecord?.achievements || ""}
              onChange={(event) =>
                setEditingRecord((previous) =>
                  previous ? { ...previous, achievements: event.target.value } : null,
                )
              }
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              placeholder="Observaciones adicionales..."
              value={editingRecord?.comments || ""}
              onChange={(event) =>
                setEditingRecord((previous) =>
                  previous ? { ...previous, comments: event.target.value } : null,
                )
              }
              rows={2}
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
                (!editingRecord?.id && !editingRecord?.subject_id) ||
                (isRector && !editingRecord?.teacher_id)
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
