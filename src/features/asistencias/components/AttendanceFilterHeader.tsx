import { UserRound, GraduationCap, BookOpen } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AttendanceClassContext } from "@/hooks/school/types";

interface OptionItem {
  id: string;
  name: string;
}

interface AttendanceFilterHeaderProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  isRector: boolean;
  selectedTeacher: string;
  onTeacherChange: (teacherId: string) => void;
  teacherOptions: OptionItem[];
  selectedGrade: string;
  onGradeChange: (gradeId: string) => void;
  gradeOptions: OptionItem[];
  selectedSubject: string;
  onSubjectChange: (subjectId: string) => void;
  subjectOptions: OptionItem[];
  selectedContext: AttendanceClassContext | null;
}

export function AttendanceFilterHeader({
  selectedDate,
  onDateChange,
  isRector,
  selectedTeacher,
  onTeacherChange,
  teacherOptions,
  selectedGrade,
  onGradeChange,
  gradeOptions,
  selectedSubject,
  onSubjectChange,
  subjectOptions,
  selectedContext,
}: AttendanceFilterHeaderProps) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
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
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
