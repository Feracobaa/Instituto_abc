import { BookOpen, Clock, GraduationCap, TrendingUp } from "lucide-react";
import type { TeacherAssignmentStatsData } from "../types";

export function TeacherAssignmentStats({ stats }: { stats: TeacherAssignmentStatsData }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      <div className="rounded-2xl border bg-card/80 backdrop-blur p-4 shadow-card hover-lift transition-all">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">Tareas Totales</span>
          <BookOpen className="h-4 w-4 text-primary" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-foreground">{stats.total}</span>
          <span className="text-xs text-muted-foreground">publicadas</span>
        </div>
      </div>

      <div className="rounded-2xl border bg-card/80 backdrop-blur p-4 shadow-card hover-lift transition-all">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">Vigentes</span>
          <Clock className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {stats.active}
          </span>
          <span className="text-xs text-muted-foreground">en plazo</span>
        </div>
      </div>

      <div className="rounded-2xl border bg-card/80 backdrop-blur p-4 shadow-card hover-lift transition-all">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">Grupos Cubiertos</span>
          <GraduationCap className="h-4 w-4 text-violet-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-violet-600 dark:text-violet-400">
            {stats.uniqueGrades}
          </span>
          <span className="text-xs text-muted-foreground">grados</span>
        </div>
      </div>

      <div className="rounded-2xl border bg-card/80 backdrop-blur p-4 shadow-card hover-lift transition-all">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">Asignaturas</span>
          <TrendingUp className="h-4 w-4 text-cyan-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-cyan-600 dark:text-cyan-400">
            {stats.uniqueSubjects}
          </span>
          <span className="text-xs text-muted-foreground">áreas</span>
        </div>
      </div>
    </div>
  );
}
