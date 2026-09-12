import React from "react";
import { AlertCircle, ClipboardCheck, Loader2, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";
import type { AttendanceClassContext } from "@/hooks/school/types";

interface AttendanceStateFeedbackProps {
  allClassContextsLength: number;
  canEditDate: boolean;
  isLoading: boolean;
  pageError: unknown;
  selectedContext: AttendanceClassContext | null;
  selectedDate: string;
  studentsCount: number;
}

export const AttendanceStateFeedback: React.FC<AttendanceStateFeedbackProps> = ({
  allClassContextsLength,
  canEditDate,
  isLoading,
  pageError,
  selectedContext,
  selectedDate,
  studentsCount,
}) => {
  if (pageError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No fue posible cargar el módulo</AlertTitle>
        <AlertDescription>{getFriendlyErrorMessage(pageError)}</AlertDescription>
      </Alert>
    );
  }

  if (selectedContext && !canEditDate) {
    return (
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertTitle>Fecha en solo lectura</AlertTitle>
        <AlertDescription>
          La asistencia solo se puede editar para fechas dentro del periodo académico activo.
        </AlertDescription>
      </Alert>
    );
  }

  if (selectedContext && canEditDate && !selectedContext.is_scheduled_for_selected_date) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Sin clase programada ese día</AlertTitle>
        <AlertDescription>
          El docente tiene asignada esta materia, pero no hay bloque de horario en la fecha seleccionada.
        </AlertDescription>
      </Alert>
    );
  }

  if (!selectedDate) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Selecciona una fecha"
        description="Elige la fecha para listar las clases programadas."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (allClassContextsLength === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Sin clases asignadas"
        description="No hay materias académicas asignadas para el docente seleccionado."
      />
    );
  }

  if (!selectedContext) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Selecciona docente, grado y materia"
        description="Debes elegir un contexto de clase para cargar la asistencia."
      />
    );
  }

  if (studentsCount === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Sin estudiantes activos"
        description="El grado seleccionado no tiene estudiantes activos para registrar asistencia."
      />
    );
  }

  return null;
};
