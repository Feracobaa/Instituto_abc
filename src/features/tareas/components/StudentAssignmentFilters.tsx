import { Award, BookOpen, Clock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StudentAssignmentFilterProps, StudentTabFilter } from "../types";

export function StudentAssignmentFilters({
  selectedTab,
  onTabChange,
  selectedSubject,
  onSubjectChange,
  subjects,
  metrics,
}: StudentAssignmentFilterProps) {
  return (
    <div className="space-y-4">
      {/* KPI Cards / Indicadores de Desempeño del Estudiante */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border bg-card p-3.5 shadow-card">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Cumplimiento</span>
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-foreground">{metrics.complianceRate}%</span>
            <span className="text-[11px] text-muted-foreground">de tareas</span>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-3.5 shadow-card">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Pendientes</span>
            <Clock className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
              {metrics.pending}
            </span>
            <span className="text-[11px] text-muted-foreground">por entregar</span>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-3.5 shadow-card">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Evaluadas</span>
            <Award className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {metrics.evaluatedCount}
            </span>
            <span className="text-[11px] text-muted-foreground">calificadas</span>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-3.5 shadow-card">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Promedio</span>
            <BookOpen className="h-3.5 w-3.5 text-violet-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-violet-600 dark:text-violet-400">
              {metrics.avgScore || "—"}
            </span>
            <span className="text-[11px] text-muted-foreground">/ 5.0</span>
          </div>
        </div>
      </div>

      {/* Tabs y Filtro de Asignatura */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-2.5 rounded-2xl border shadow-card">
        <Tabs
          value={selectedTab}
          onValueChange={(val) => onTabChange(val as StudentTabFilter)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid grid-cols-4 sm:flex bg-muted/60 p-1 rounded-xl h-9">
            <TabsTrigger value="all" className="text-xs rounded-lg font-semibold">
              Todas ({metrics.total})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs rounded-lg font-semibold">
              Pendientes ({metrics.pending})
            </TabsTrigger>
            <TabsTrigger value="submitted" className="text-xs rounded-lg font-semibold">
              Entregadas ({metrics.submitted})
            </TabsTrigger>
            <TabsTrigger value="evaluated" className="text-xs rounded-lg font-semibold">
              Evaluadas ({metrics.evaluatedCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={selectedSubject} onValueChange={onSubjectChange}>
          <SelectTrigger className="w-full sm:w-44 text-xs h-9 rounded-xl">
            <SelectValue placeholder="Materia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las Materias</SelectItem>
            {subjects.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
