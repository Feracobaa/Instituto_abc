import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TimePicker } from "@/components/ui/time-picker";
import { useSubjects, useTeachers, useCreateSchedule, useDeleteSchedule } from "@/hooks/useSchoolData";
import { Loader2, Trash2 } from "lucide-react";

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gradeId: string;
  day: number;
  time: string;
  endTime: string;
  existingEntry?: any;
}

const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export function ScheduleFormDialog({ 
  open, onOpenChange, gradeId, day, time, endTime, existingEntry 
}: ScheduleFormDialogProps) {
  
  const { data: subjects } = useSubjects();
  const { data: teachers } = useTeachers();
  const createSchedule = useCreateSchedule();
  const deleteSchedule = useDeleteSchedule();
  
  const [isRoutine, setIsRoutine] = useState(false);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  
  const [startTime, setStartTime] = useState(time || "07:00");
  const [closeTime, setCloseTime] = useState(endTime || "08:00");
  const [repeatAllWeek, setRepeatAllWeek] = useState(false);

  useEffect(() => {
    if (existingEntry) {
      if (existingEntry.title) {
        setIsRoutine(true);
        setTitle(existingEntry.title);
        setSubjectId("");
        setTeacherId("");
      } else {
        setIsRoutine(false);
        setSubjectId(existingEntry.subject_id || "");
        setTeacherId(existingEntry.teacher_id || "");
        setTitle("");
      }
      setStartTime(existingEntry.start_time?.slice(0, 5) || "07:00");
      setCloseTime(existingEntry.end_time?.slice(0, 5) || "08:00");
      setRepeatAllWeek(false);
    } else {
      setIsRoutine(false);
      setTitle("");
      setSubjectId("");
      setTeacherId("");
      setStartTime(time || "07:00");
      setCloseTime(endTime || "08:00");
      setRepeatAllWeek(false);
    }
  }, [existingEntry, time, endTime, open]);

  const handleSave = async () => {
    if (isRoutine && !title.trim()) return;
    if (!isRoutine && (!subjectId || !teacherId)) return;

    if (existingEntry) {
      await deleteSchedule.mutateAsync(existingEntry.id);
    }

    const payloadTemplate = {
      grade_id: gradeId,
      start_time: `${startTime}:00`,
      end_time: `${closeTime}:00`,
      title: isRoutine ? title.trim().toUpperCase() : null,
      subject_id: isRoutine ? null : subjectId,
      teacher_id: isRoutine ? null : teacherId
    };

    if (repeatAllWeek && !existingEntry) {
      const arr = [0, 1, 2, 3, 4].map(d => ({
        ...payloadTemplate,
        day_of_week: d
      }));
      await createSchedule.mutateAsync(arr);
    } else {
      await createSchedule.mutateAsync({
        ...payloadTemplate,
        day_of_week: existingEntry ? existingEntry.day_of_week : day
      });
    }

    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!existingEntry) return;
    await deleteSchedule.mutateAsync(existingEntry.id);
    onOpenChange(false);
  };

  const isPending = createSchedule.isPending || deleteSchedule.isPending;

  const availableTeachers = teachers?.filter(t => 
    t.teacher_subjects?.some((ts: any) => ts.subject_id === subjectId)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existingEntry ? 'Editar Bloque de Horario' : 'Nuevo Bloque de Horario'}</DialogTitle>
          <DialogDescription>
            {existingEntry 
              ? `${dayNames[existingEntry.day_of_week]}` 
              : `${dayNames[day]} (Puedes repetirlo para toda la semana)`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-3">
          {/* Tiempos (Editables mediante componente Premium tipo móvil) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Hora de Inicio</Label>
              <TimePicker value={startTime} onChange={setStartTime} label="00:00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Hora Fin</Label>
              <TimePicker value={closeTime} onChange={setCloseTime} label="00:00" />
            </div>
          </div>

          {!existingEntry && (
            <div className="flex items-center space-x-2 pt-1 border-b border-border/50 pb-3">
              <Switch checked={repeatAllWeek} onCheckedChange={setRepeatAllWeek} id="repeat" />
              <Label htmlFor="repeat" className="cursor-pointer">Repetir de Lunes a Viernes a esta misma hora</Label>
            </div>
          )}

          {/* Switch Rutina vs Materia */}
          <div className="flex items-center space-x-2 py-1">
            <Switch checked={isRoutine} onCheckedChange={setIsRoutine} id="routine" />
            <Label htmlFor="routine" className="cursor-pointer text-primary font-medium">Es un espacio libre/rutina (Descanso, Devocional...)</Label>
          </div>

          {isRoutine ? (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label>Título de la Rutina</Label>
              <Input 
                placeholder="Ej. DEVOCIONAL, DESCANSO, ALMUERZO..." 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-2">
                <Label>Materia</Label>
                <select
                  value={subjectId}
                  onChange={(e) => {
                    setSubjectId(e.target.value);
                    setTeacherId(""); 
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none"
                >
                  <option value="" disabled>Selecciona una materia...</option>
                  {subjects?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Profesor a cargo</Label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  disabled={!subjectId}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none disabled:opacity-50"
                >
                  <option value="" disabled>
                    {subjectId ? "Selecciona el profesor listado..." : "Primero selecciona una materia"}
                  </option>
                  {availableTeachers?.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
                {subjectId && availableTeachers?.length === 0 && (
                  <p className="text-xs text-destructive mt-1">Nadie puede dictar esta materia actualmente.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-2">
          {existingEntry ? (
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {deleteSchedule.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Borrar
            </Button>
          ) : <div />}
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isPending || (isRoutine ? !title.trim() : (!subjectId || !teacherId))}>
              {createSchedule.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar Bloque
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
