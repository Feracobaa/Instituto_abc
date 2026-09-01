import { BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CreateAssignmentDialogProps } from "../types";

export function CreateAssignmentDialog({
  open,
  onOpenChange,
  title,
  onTitleChange,
  gradeId,
  onGradeIdChange,
  subjectId,
  onSubjectIdChange,
  periodId,
  onPeriodIdChange,
  dueDate,
  onDueDateChange,
  description,
  onDescriptionChange,
  grades,
  subjects,
  periods,
  onSubmit,
  isPending,
}: CreateAssignmentDialogProps) {
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
                Publicar Nueva Tarea
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Asigna instrucciones, plazo y genera automáticamente la guía PDF institucional.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div>
            <Label htmlFor="title" className="text-xs font-semibold">
              Título de la Tarea o Compromiso *
            </Label>
            <Input
              id="title"
              placeholder="Ej. Guía 3: Ecuaciones de primer grado y problemas de aplicación"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="mt-1 text-sm rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Grado Escolar *</Label>
              <Select value={gradeId} onValueChange={onGradeIdChange}>
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="Seleccionar Grado" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Asignatura *</Label>
              <Select value={subjectId} onValueChange={onSubjectIdChange}>
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="Seleccionar Materia" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Periodo Académico</Label>
              <Select value={periodId} onValueChange={onPeriodIdChange}>
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="Periodo Actual" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.is_active ? "(Activo)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dueDate" className="text-xs font-semibold">
                Fecha y Hora Límite *
              </Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => onDueDateChange(e.target.value)}
                className="mt-1 rounded-xl"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-xs font-semibold">
              Instrucciones y Desarrollo de la Actividad
            </Label>
            <Textarea
              id="description"
              placeholder="Describe paso a paso los ejercicios a resolver en el cuaderno, criterios de evaluación o enlaces..."
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="mt-1 min-h-[120px] rounded-xl text-sm leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={() => void onSubmit()}
            disabled={isPending}
            className="gap-2 rounded-xl shadow-soft font-semibold"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Publicar Tarea
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
