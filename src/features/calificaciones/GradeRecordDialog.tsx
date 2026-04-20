import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  buildDefaultPartialGrades,
  calculateWeightedFinalGrade,
  getGradeColor,
  getGradeSublabel,
} from "@/features/calificaciones/helpers";
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
  const partials = editingRecord?.partials ?? buildDefaultPartialGrades();
  const weightedFinal = calculateWeightedFinalGrade(partials);
  const finalGrade =
    typeof weightedFinal === "number"
      ? weightedFinal
      : typeof editingRecord?.final_grade === "number"
        ? editingRecord.final_grade
        : null;

  const hasAtLeastOneGrade = partials.some(
    (partial) => typeof partial.grade === "number" && !Number.isNaN(partial.grade),
  );

  const updatePartial = (
    partialIndex: number,
    patch: Partial<(typeof partials)[number]>,
  ) => {
    setEditingRecord((previous) => {
      if (!previous) {
        return previous;
      }

      const previousPartials = previous.partials ?? buildDefaultPartialGrades();
      const nextPartials = previousPartials.map((partial) =>
        partial.partial_index === partialIndex ? { ...partial, ...patch } : partial,
      );

      return {
        ...previous,
        final_grade: calculateWeightedFinalGrade(nextPartials),
        partials: nextPartials,
      };
    });
  };

  const addActivity = () => {
    setEditingRecord((previous) => {
      if (!previous) {
        return previous;
      }

      const previousPartials = previous.partials ?? buildDefaultPartialGrades();
      const nextIndex = previousPartials.length + 1;
      const nextPartials = [
        ...previousPartials,
        {
          activity_name: `Actividad ${nextIndex}`,
          achievements: "",
          comments: "",
          grade: "",
          partial_index: nextIndex,
        },
      ];

      return {
        ...previous,
        final_grade: calculateWeightedFinalGrade(nextPartials),
        partials: nextPartials,
      };
    });
  };

  const removeActivity = (partialIndex: number) => {
    setEditingRecord((previous) => {
      if (!previous) {
        return previous;
      }

      const previousPartials = previous.partials ?? buildDefaultPartialGrades();
      if (previousPartials.length <= 1) {
        return previous;
      }

      const filteredPartials = previousPartials
        .filter((partial) => partial.partial_index !== partialIndex)
        .map((partial, index) => ({
          ...partial,
          activity_name: partial.activity_name || `Actividad ${index + 1}`,
          partial_index: index + 1,
        }));

      return {
        ...previous,
        final_grade: calculateWeightedFinalGrade(filteredPartials),
        partials: filteredPartials,
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
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

          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label className="text-sm">Nota final automatica</Label>
              <div className="text-sm text-muted-foreground">
                Promedio simple de las actividades registradas
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-24 items-center justify-center rounded-lg border bg-muted text-lg font-bold">
                {typeof finalGrade === "number" ? finalGrade.toFixed(1) : "-"}
              </div>
              {typeof finalGrade === "number" && (
                <div
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-bold shadow-sm",
                    getGradeColor(finalGrade),
                  )}
                >
                  {getGradeSublabel(finalGrade)}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Actividades evaluadas</Label>
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={addActivity}>
              <Plus className="h-3.5 w-3.5" />
              Agregar actividad
            </Button>
          </div>

          <div className="space-y-3">
            {partials.map((partial) => (
              <div key={partial.partial_index} className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Actividad {partial.partial_index}</Label>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={partials.length <= 1}
                    onClick={() => removeActivity(partial.partial_index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Nombre de actividad</Label>
                  <Input
                    value={partial.activity_name}
                    onChange={(event) =>
                      updatePartial(partial.partial_index, { activity_name: event.target.value })
                    }
                    placeholder={`Actividad ${partial.partial_index}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Nota de actividad (1.0 a 5.0)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    value={partial.grade}
                    onChange={(event) =>
                      updatePartial(
                        partial.partial_index,
                        {
                          grade:
                            event.target.value === ""
                              ? ""
                              : parseFloat(event.target.value),
                        },
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Logros de la actividad</Label>
                  <Textarea
                    placeholder="Logros de esta actividad..."
                    rows={2}
                    value={partial.achievements}
                    onChange={(event) =>
                      updatePartial(partial.partial_index, { achievements: event.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Observaciones de la actividad</Label>
                  <Textarea
                    placeholder="Observaciones de esta actividad..."
                    rows={2}
                    value={partial.comments}
                    onChange={(event) =>
                      updatePartial(partial.partial_index, { comments: event.target.value })
                    }
                  />
                </div>
              </div>
            ))}
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
                (isRector && !editingRecord?.teacher_id) ||
                !hasAtLeastOneGrade
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
