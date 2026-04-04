import { MainLayout } from "@/components/layout/MainLayout";
import { useGrades, useSchedules } from "@/hooks/useSchoolData";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2, Download, Coffee, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadSchedulePDF } from "@/utils/pdfGenerator";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScheduleFormDialog } from "@/components/schedules/ScheduleFormDialog";

const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const Horarios = () => {
  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { userRole, teacherId } = useAuth();
  const isRector = userRole === 'rector';
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  
  // El Rector busca por grado. El Profesor trae todos sus horarios a la vez y luego filtramos localmente.
  const { data: fetchSchedules, isLoading: schedulesLoading } = useSchedules(
    isRector ? (selectedGrade || undefined) : undefined, 
    isRector ? undefined : (teacherId || undefined)
  );

  const schedules = isRector 
    ? fetchSchedules 
    : fetchSchedules?.filter(s => !selectedGrade || s.grade_id === selectedGrade);

  const availableGrades = isRector 
    ? grades 
    : grades?.filter(g => fetchSchedules?.some(s => s.grade_id === g.id));

  const selectedGradeData = grades?.find(g => g.id === selectedGrade);
  const gradeSchedules = schedules?.filter(s => s.grade_id === selectedGrade) || [];

  // Dynamic unique time slots from database!
  const uniqueStartTimes = Array.from(new Set(gradeSchedules.map(s => s.start_time?.slice(0, 5))))
    .filter(t => t !== undefined && t !== null)
    .sort() as string[];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{ day: number, time: string, endTime: string, entry: any }>({ day: 0, time: '', endTime: '', entry: null });

  const getScheduleEntry = (day: number, time: string) =>
    gradeSchedules.find(s => s.day_of_week === day && s.start_time?.slice(0, 5) === time);

  const calculateEndTime = (time: string) => {
    // Simple logic: +1 hour.
    const [h, m] = time.split(':');
    return `${(parseInt(h) + 1).toString().padStart(2, '0')}:${m}`;
  };

  const handleSlotClick = (day: number, time: string) => {
    if (!isRector || !selectedGrade) return;
    const entry = getScheduleEntry(day, time);
    setEditingSlot({
      day,
      time,
      endTime: entry?.end_time?.slice(0, 5) || calculateEndTime(time),
      entry
    });
    setDialogOpen(true);
  };

  const handleGlobalAdd = () => {
    if (!isRector || !selectedGrade) return;
    // Sugerir la hora final del último bloque de la semana (si existe)
    let lastEndTime = "07:00";
    if (gradeSchedules.length > 0) {
      const times = gradeSchedules.map(s => s.end_time?.slice(0, 5)).filter(Boolean).sort() as string[];
      if (times.length > 0) lastEndTime = times[times.length - 1];
    }
    
    setEditingSlot({
      day: 0,
      time: lastEndTime,
      endTime: calculateEndTime(lastEndTime),
      entry: null
    });
    setDialogOpen(true);
  };

  const handleDownloadSchedule = async () => {
    if (!selectedGradeData || !schedules) return;
    await downloadSchedulePDF(selectedGradeData.name, gradeSchedules, uniqueStartTimes);
  };

  const isLoading = gradesLoading || schedulesLoading;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading">Horarios</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Horario de clases por grado</p>
          </div>
          {selectedGrade && schedules && schedules.length > 0 && (
            <div className="flex gap-2">
              {isRector && selectedGrade && (
                <Button onClick={handleGlobalAdd} variant="default" className="gap-2 bg-primary/90 hover:bg-primary">
                  <Clock className="w-4 h-4" />
                  Añadir Nuevo Bloque
                </Button>
              )}
              <Button onClick={handleDownloadSchedule} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Descargar PDF
              </Button>
            </div>
          )}
        </div>

        {/* Grade tabs */}
        <div className="flex gap-2 flex-wrap">
          {availableGrades?.length === 0 && !isRector && (
            <p className="text-sm text-muted-foreground w-full py-4 text-center border-2 border-dashed rounded-lg">
              No tienes materias asignadas en ningún salón todavía.
            </p>
          )}
          {availableGrades?.map((grade) => (
            <button
              key={grade.id}
              onClick={() => setSelectedGrade(grade.id)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium text-sm transition-all",
                selectedGrade === grade.id
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {grade.name}
            </button>
          ))}
        </div>

        {!selectedGrade ? (
          <EmptyState
            title="Selecciona un grado"
            description="Elige un grado para ver su horario semanal de clases."
          />
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card rounded-xl border shadow-card overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary border-b border-border">
                    <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">Hora</th>
                    {dayNames.map((day) => (
                      <th key={day} className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uniqueStartTimes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-muted-foreground border-x border-b border-border">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <Clock className="w-10 h-10 opacity-20" />
                          <p>Aún no has armado el horario para este salón.</p>
                          {isRector && (
                            <Button variant="outline" size="sm" onClick={handleGlobalAdd} className="mt-2">
                              Crear primer bloque de la semana
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : uniqueStartTimes.map((time) => {
                    const rowSchedules = gradeSchedules.filter(s => s.start_time?.slice(0, 5) === time);
                    const displayEndTime = rowSchedules[0]?.end_time?.slice(0, 5) || calculateEndTime(time);

                    return (
                      <tr key={time} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-center border-r border-border font-medium text-foreground bg-secondary/20 w-[110px]">
                          <div className="flex flex-col">
                            <span className="text-base">{time}</span>
                            <span className="text-[11px] text-muted-foreground">{displayEndTime}</span>
                          </div>
                        </td>
                        
                        {days.map((_, day) => {
                          const entry = getScheduleEntry(day, time);
                          
                          let blockContent = null;
                      if (entry) {
                        if ((entry as any).title) {
                          // Rutina
                          blockContent = (
                            <div className="px-3 py-2.5 rounded-lg text-foreground bg-amber-500/20 border border-amber-500/30 hover-lift transition-all flex h-full items-center justify-center min-h-[64px]">
                              <p className="font-bold text-[13px] leading-tight text-amber-700 dark:text-amber-400 group-hover:underline text-center">
                                {(entry as any).title}
                              </p>
                            </div>
                          );
                        } else if (entry.subjects) {
                              // Clase normal
                              blockContent = (
                                <div className={cn(
                                  "px-3 py-2.5 rounded-lg text-white hover-lift transition-all flex flex-col justify-center min-h-[64px] h-full",
                                  entry.subjects.color || 'bg-primary'
                                )}>
                                  <p className="font-bold text-sm leading-tight group-hover:underline">{entry.subjects.name}</p>
                                  <p className="text-[11px] text-white/80 mt-0.5 truncate">{entry.teachers?.full_name}</p>
                                </div>
                              );
                            }
                          }

                          return (
                            <td 
                              key={day} 
                              className={cn("p-1.5 border-r border-border/40", isRector && "cursor-pointer group relative")}
                              onClick={() => isRector && handleSlotClick(day, time)}
                            >
                              {blockContent ? blockContent : (
                                <div className="px-3 py-2.5 rounded-lg bg-secondary/40 border border-dashed border-border/50 text-center min-h-[64px] h-full flex items-center justify-center transition-colors group-hover:bg-primary/10 group-hover:border-primary/30">
                                  {isRector ? (
                                    <Plus className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                                  ) : (
                                    <span className="text-muted-foreground/20">—</span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {isRector && selectedGrade && (
        <ScheduleFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          gradeId={selectedGrade}
          day={editingSlot.day}
          time={editingSlot.time}
          endTime={editingSlot.endTime}
          existingEntry={editingSlot.entry}
        />
      )}
    </MainLayout>
  );
};

export default Horarios;
