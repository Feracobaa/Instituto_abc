import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/ui/ConfirmActionDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TimePicker } from "@/components/ui/time-picker";
import { useToast } from "@/hooks/use-toast";
import { useCreateSchedule, useDeleteSchedule, useGrades, useSchedules, useSubjects, useTeachers } from "@/hooks/useSchoolData";
import type { Schedule } from "@/hooks/useSchoolData";
import { findScheduleConflicts, getScheduleDraftsForSave } from "@/features/horarios/conflicts";
import { getFieldErrors, scheduleFormSchema } from "@/lib/schoolSchemas";

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gradeId: string;
  day: number;
  time: string;
  endTime: string;
  existingEntry?: Schedule | null;
}

const dayNames = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];

type ScheduleFormData = {
  endTime: string;
  isRoutine: boolean;
  startTime: string;
  subjectId: string;
  teacherId: string;
  title: string;
};

export function ScheduleFormDialog({
  open,
  onOpenChange,
  gradeId,
  day,
  time,
  endTime,
  existingEntry,
}: ScheduleFormDialogProps) {
  const { data: subjects } = useSubjects();
  const { data: teachers } = useTeachers();
  const { data: grades } = useGrades();
  const { data: allSchedules } = useSchedules();
  const createSchedule = useCreateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const { toast } = useToast();

  const [repeatAllWeek, setRepeatAllWeek] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<ScheduleFormData>({
    endTime: endTime || "08:00",
    isRoutine: false,
    startTime: time || "07:00",
    subjectId: "",
    teacherId: "",
    title: "",
  });

  useEffect(() => {
    if (existingEntry) {
      setFormData({
        endTime: existingEntry.end_time?.slice(0, 5) || "08:00",
        isRoutine: Boolean(existingEntry.title),
        startTime: existingEntry.start_time?.slice(0, 5) || "07:00",
        subjectId: existingEntry.subject_id || "",
        teacherId: existingEntry.teacher_id || "",
        title: existingEntry.title || "",
      });
      setRepeatAllWeek(false);
    } else {
      setFormData({
        endTime: endTime || "08:00",
        isRoutine: false,
        startTime: time || "07:00",
        subjectId: "",
        teacherId: "",
        title: "",
      });
      setRepeatAllWeek(false);
    }

    setErrors({});
  }, [existingEntry, open, time, endTime]);

  const updateField = <K extends keyof ScheduleFormData>(field: K, value: ScheduleFormData[K]) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => {
      if (!previous[field]) {
        return previous;
      }

      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const selectedGrade = grades?.find((grade) => grade.id === gradeId);
  const visibleSubjects = subjects?.filter(
    (subject) => subject.grade_level === null || subject.grade_level === selectedGrade?.level,
  );

  const availableTeachers = teachers?.filter((teacher) =>
    teacher.teacher_subjects?.some((assignment) => assignment.subject_id === formData.subjectId),
  );

  const scheduleDrafts = getScheduleDraftsForSave(
    gradeId,
    formData.startTime,
    formData.endTime,
    formData.isRoutine ? undefined : formData.teacherId,
    existingEntry?.id,
    repeatAllWeek && !existingEntry,
    existingEntry ? existingEntry.day_of_week : day,
  );

  const scheduleConflicts = useMemo(
    () =>
      scheduleDrafts.flatMap((draft) =>
        findScheduleConflicts(draft, allSchedules ?? [], grades, teachers),
      ),
    [allSchedules, grades, scheduleDrafts, teachers],
  );

  const handleSave = async () => {
    const validation = scheduleFormSchema.safeParse(formData);
    if (!validation.success) {
      setErrors(getFieldErrors(validation.error));
      toast({
        title: "Revisa el formulario",
        description: "Corrige los campos marcados antes de guardar el horario.",
        variant: "destructive",
      });
      return;
    }

    if (
      !validation.data.isRoutine &&
      !availableTeachers?.some((teacher) => teacher.id === validation.data.teacherId)
    ) {
      setErrors((previous) => ({
        ...previous,
        teacherId: "El docente seleccionado ya no aparece asignado a esta materia.",
      }));
      return;
    }

    if (scheduleConflicts.length > 0) {
      toast({
        title: "Hay cruces de horario",
        description: "Corrige los cruces detectados antes de guardar este bloque.",
        variant: "destructive",
      });
      return;
    }

    const payloadTemplate = {
      end_time: `${validation.data.endTime}:00`,
      grade_id: gradeId,
      start_time: `${validation.data.startTime}:00`,
      subject_id: validation.data.isRoutine ? null : validation.data.subjectId,
      teacher_id: validation.data.isRoutine ? null : validation.data.teacherId,
      title: validation.data.isRoutine ? validation.data.title.trim().toUpperCase() : null,
    };

    try {
      if (existingEntry) {
        await deleteSchedule.mutateAsync(existingEntry.id);
      }

      if (repeatAllWeek && !existingEntry) {
        await createSchedule.mutateAsync(
          [0, 1, 2, 3, 4].map((dayOfWeek) => ({
            ...payloadTemplate,
            day_of_week: dayOfWeek,
          })),
        );
      } else {
        await createSchedule.mutateAsync({
          ...payloadTemplate,
          day_of_week: existingEntry ? existingEntry.day_of_week : day,
        });
      }

      setErrors({});
      onOpenChange(false);
    } catch {
      // El hook ya reporta el error legible.
    }
  };

  const handleDelete = async () => {
    if (!existingEntry) {
      return;
    }

    try {
      await deleteSchedule.mutateAsync(existingEntry.id);
      setDeleteDialogOpen(false);
      onOpenChange(false);
    } catch {
      // El hook ya muestra el error.
    }
  };

  const isPending = createSchedule.isPending || deleteSchedule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existingEntry ? "Editar bloque de horario" : "Nuevo bloque de horario"}</DialogTitle>
          <DialogDescription>
            {existingEntry
              ? dayNames[existingEntry.day_of_week]
              : `${dayNames[day]} (puedes repetirlo para toda la semana)`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Hora de inicio
              </Label>
              <TimePicker value={formData.startTime} onChange={(value) => updateField("startTime", value)} label="00:00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Hora fin
              </Label>
              <TimePicker value={formData.endTime} onChange={(value) => updateField("endTime", value)} label="00:00" />
              {errors.endTime && <p className="text-xs text-destructive">{errors.endTime}</p>}
            </div>
          </div>

          {!existingEntry && (
            <div className="flex items-center space-x-2 border-b border-border/50 pb-3 pt-1">
              <Switch checked={repeatAllWeek} onCheckedChange={setRepeatAllWeek} id="repeat" />
              <Label htmlFor="repeat" className="cursor-pointer">
                Repetir de lunes a viernes a esta misma hora
              </Label>
            </div>
          )}

          <div className="flex items-center space-x-2 py-1">
            <Switch
              checked={formData.isRoutine}
              onCheckedChange={(checked) => {
                updateField("isRoutine", checked);
                if (checked) {
                  updateField("subjectId", "");
                  updateField("teacherId", "");
                } else {
                  updateField("title", "");
                }
              }}
              id="routine"
            />
            <Label htmlFor="routine" className="cursor-pointer font-medium text-primary">
              Es un espacio libre o rutina
            </Label>
          </div>

          {formData.isRoutine ? (
            <div className="space-y-2">
              <Label>Titulo de la rutina</Label>
              <Input
                placeholder="Ej. DEVOCIONAL, DESCANSO, ALMUERZO..."
                value={formData.title}
                onChange={(event) => updateField("title", event.target.value)}
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Materia</Label>
                <select
                  value={formData.subjectId}
                  onChange={(event) => {
                    updateField("subjectId", event.target.value);
                    updateField("teacherId", "");
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none"
                >
                  <option value="" disabled>
                    Selecciona una materia...
                  </option>
                  {visibleSubjects?.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                {errors.subjectId && <p className="text-xs text-destructive">{errors.subjectId}</p>}
              </div>

              <div className="space-y-2">
                <Label>Docente a cargo</Label>
                <select
                  value={formData.teacherId}
                  onChange={(event) => updateField("teacherId", event.target.value)}
                  disabled={!formData.subjectId}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none disabled:opacity-50"
                >
                  <option value="" disabled>
                    {formData.subjectId
                      ? "Selecciona el docente listado..."
                      : "Primero selecciona una materia"}
                  </option>
                  {availableTeachers?.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.full_name}
                    </option>
                  ))}
                </select>
                {errors.teacherId && <p className="text-xs text-destructive">{errors.teacherId}</p>}
                {formData.subjectId && availableTeachers?.length === 0 && (
                  <p className="mt-1 text-xs text-destructive">
                    No hay docentes asignados a esta materia en este momento.
                  </p>
                )}
              </div>
            </div>
          )}

          {scheduleConflicts.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Cruces detectados</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  {scheduleConflicts.map((conflict, index) => (
                    <li key={`${conflict.type}-${conflict.conflictingSchedule.id}-${index}`}>
                      {conflict.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-between pt-2">
          {existingEntry ? (
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} disabled={isPending}>
              {deleteSchedule.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Borrar
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending || scheduleConflicts.length > 0}>
              {createSchedule.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar bloque
            </Button>
          </div>
        </div>

        <ConfirmActionDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Eliminar bloque de horario?"
          description="Esta accion eliminara el bloque seleccionado del horario actual."
          actionLabel="Eliminar bloque"
          onConfirm={handleDelete}
        />
      </DialogContent>
    </Dialog>
  );
}
