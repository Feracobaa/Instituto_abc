import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeacherAssignmentFilterProps } from "../types";

export function TeacherAssignmentFilters({
  search,
  onSearchChange,
  selectedGrade,
  onGradeChange,
  selectedSubject,
  onSubjectChange,
  grades,
  subjects,
  onOpenCreate,
}: TeacherAssignmentFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3.5 rounded-2xl border shadow-card">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título, grado o materia..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9.5 bg-background text-sm rounded-xl"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Filtro Grado */}
        <Select value={selectedGrade} onValueChange={onGradeChange}>
          <SelectTrigger className="w-36 text-xs h-9 rounded-xl">
            <SelectValue placeholder="Grado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los Grados</SelectItem>
            {grades.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro Asignatura */}
        <Select value={selectedSubject} onValueChange={onSubjectChange}>
          <SelectTrigger className="w-36 text-xs h-9 rounded-xl">
            <SelectValue placeholder="Materia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las Materias</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={onOpenCreate} size="sm" className="gap-1.5 rounded-xl shadow-soft font-semibold text-xs h-9">
          <Plus className="h-4 w-4" /> Nueva Tarea
        </Button>
      </div>
    </div>
  );
}
