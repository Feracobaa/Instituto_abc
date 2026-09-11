import { UserRound, GraduationCap, BookOpen, Clock, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AttendanceClassContext } from "@/hooks/school/types";
import type { ActiveClassScheduleInfo } from "../hooks/useCurrentClassAutoDetect";

interface OptionItem {
  id: string;
  name: string;
}

interface AttendanceFilterHeaderProps {
  activeClass?: ActiveClassScheduleInfo | null;
  gradeOptions: OptionItem[];
  isRector: boolean;
  onApplyActiveClass?: () => void;
  onDateChange: (date: string) => void;
  onGradeChange: (gradeId: string) => void;
  onSubjectChange: (subjectId: string) => void;
  onTeacherChange: (teacherId: string) => void;
  selectedContext: AttendanceClassContext | null;
  selectedDate: string;
  selectedGrade: string;
  selectedSubject: string;
  selectedTeacher: string;
  subjectOptions: OptionItem[];
  teacherOptions: OptionItem[];
}

export function AttendanceFilterHeader({
  activeClass,
  gradeOptions,
  isRector,
  onApplyActiveClass,
  onDateChange,
  onGradeChange,
  onSubjectChange,
  onTeacherChange,
  selectedContext,
  selectedDate,
  selectedGrade,
  selectedSubject,
  selectedTeacher,
  subjectOptions,
  teacherOptions,
}: AttendanceFilterHeaderProps) {
  const isCurrentClassSelected =
    Boolean(activeClass && selectedContext) &&
    activeClass?.gradeId === selectedContext?.grade_id &&
    activeClass?.subjectId === selectedContext?.subject_id;

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card space-y-4">
      {/* Sugerencia inteligente de clase activa según horario */}
      {activeClass && !isCurrentClassSelected && onApplyActiveClass && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <div className="text-xs">
              <span className="font-semibold text-foreground">Clase en curso detectada: </span>
              <span className="text-primary font-bold">{activeClass.gradeName} - {activeClass.subjectName}</span>
              <span className="text-muted-foreground ml-1.5">({activeClass.startTime} - {activeClass.endTime})</span>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={onApplyActiveClass}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Cargar esta clase
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Fecha</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(event) => onDateChange(event.target.value)}
            className="w-full"
          />
        </div>

        {isRector && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Docente</Label>
            <Select value={selectedTeacher} onValueChange={onTeacherChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar docente" />
              </SelectTrigger>
              <SelectContent>
                {teacherOptions.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Grado</Label>
          <Select value={selectedGrade} onValueChange={onGradeChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar grado" />
            </SelectTrigger>
            <SelectContent>
              {gradeOptions.map((grade) => (
                <SelectItem key={grade.id} value={grade.id}>
                  {grade.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Materia</Label>
          <Select value={selectedSubject} onValueChange={onSubjectChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar materia" />
            </SelectTrigger>
            <SelectContent>
              {subjectOptions.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedContext && (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <UserRound className="h-4 w-4 text-primary" />
            <span>Docente: <span className="font-semibold text-foreground">{selectedContext.teacher_name}</span></span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span>Grado: <span className="font-semibold text-foreground">{selectedContext.grade_name}</span></span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground sm:col-span-2 xl:col-span-1">
            <BookOpen className="h-4 w-4 text-primary" />
            <span>Materia: <span className="font-semibold text-foreground">{selectedContext.subject_name}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
