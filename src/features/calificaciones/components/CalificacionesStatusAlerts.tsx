import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertCircle, ClipboardList, Loader2, Lock } from "lucide-react";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";

interface CalificacionesStatusAlertsProps {
  pageError: unknown;
  selectedGrade: string;
  selectedPeriod: string;
  canManageCurrentPeriod: boolean;
  isLoading: boolean;
  hasStudents: boolean;
  searchTerm: string;
}

export function CalificacionesStatusAlerts({
  pageError,
  selectedGrade,
  selectedPeriod,
  canManageCurrentPeriod,
  isLoading,
  hasStudents,
  searchTerm,
}: CalificacionesStatusAlertsProps) {
  if (pageError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No fue posible cargar el modulo de calificaciones</AlertTitle>
        <AlertDescription>{getFriendlyErrorMessage(pageError)}</AlertDescription>
      </Alert>
    );
  }

  if (selectedGrade && selectedPeriod && !canManageCurrentPeriod) {
    return (
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertTitle>Periodo en modo solo lectura</AlertTitle>
        <AlertDescription>
          Solo el periodo academico activo permite crear, editar o eliminar registros de calificacion.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedGrade || !selectedPeriod) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Selecciona grado y periodo"
        description="Debes seleccionar al menos un grado y un periodo academico para listar los estudiantes."
      />
    );
  }

  if (!hasStudents) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Sin estudiantes"
        description={
          searchTerm
            ? "No se encontraron estudiantes con el criterio de busqueda."
            : "No hay estudiantes registrados en este grado."
        }
      />
    );
  }

  return null;
}
