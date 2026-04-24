import { CalendarDays, Search } from "lucide-react";
import type { AcademicPeriod, Grade } from "@/hooks/useSchoolData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CalificacionesFiltersProps {
  activePeriodId?: string;
  availableGrades: Grade[];
  deliveryDate: string;
  periods?: AcademicPeriod[] | null;
  selectedGrade: string;
  selectedPeriod: string;
  searchTerm: string;
  setDeliveryDate: (value: string) => void;
  setSelectedGrade: (value: string) => void;
  setSelectedPeriod: (value: string) => void;
  setSearchTerm: (value: string) => void;
}

export function CalificacionesFilters({
  activePeriodId,
  availableGrades,
  deliveryDate,
  periods,
  selectedGrade,
  selectedPeriod,
  searchTerm,
  setDeliveryDate,
  setSelectedGrade,
  setSelectedPeriod,
  setSearchTerm,
}: CalificacionesFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={selectedGrade} onValueChange={setSelectedGrade}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Seleccionar grado" />
        </SelectTrigger>
        <SelectContent>
          {availableGrades.map((grade) => (
            <SelectItem key={grade.id} value={grade.id}>
              {grade.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Seleccionar periodo" />
        </SelectTrigger>
        <SelectContent>
          {periods?.map((period) => (
            <SelectItem key={period.id} value={period.id}>
              {period.name} {period.is_active && "(Activo)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex h-10 flex-1 min-w-[200px] max-w-sm items-center gap-2 rounded-lg border bg-background px-3 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar estudiante..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="h-full w-full border-none bg-transparent p-0 text-sm focus:outline-none"
        />
      </div>

      <div className="flex h-10 items-center gap-2 rounded-lg border bg-background px-3 py-1.5">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="mb-0.5 text-[10px] leading-none text-muted-foreground">
            Fecha entrega PDF
          </span>
          <input
            type="date"
            value={deliveryDate}
            onChange={(event) => setDeliveryDate(event.target.value)}
            className="h-4 w-28 border-none bg-transparent p-0 text-sm leading-none focus:outline-none"
          />
        </div>
      </div>

      {activePeriodId && !selectedPeriod && (
        <button
          onClick={() => setSelectedPeriod(activePeriodId)}
          className="text-xs text-primary underline underline-offset-2"
        >
          Usar periodo activo
        </button>
      )}
    </div>
  );
}
