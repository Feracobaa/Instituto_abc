import { Camera, CheckCheck, Loader2, Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AttendanceActionButtonsProps {
  canEditDate: boolean;
  isSaving: boolean;
  isLoadingBiometrics: boolean;
  hasContext: boolean;
  studentsCount: number;
  onOpenScanner: () => void;
  onMarkAllPresent: () => void;
  onMarkUnmarkedAsAbsent: () => void;
  onSave: () => void;
}

export function AttendanceActionButtons({
  canEditDate,
  isSaving,
  isLoadingBiometrics,
  hasContext,
  studentsCount,
  onOpenScanner,
  onMarkAllPresent,
  onMarkUnmarkedAsAbsent,
  onSave,
}: AttendanceActionButtonsProps) {
  const isActionDisabled =
    !canEditDate
    || isSaving
    || !hasContext
    || studentsCount === 0;

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <Button
        type="button"
        variant="outline"
        onClick={onOpenScanner}
        disabled={isActionDisabled || isLoadingBiometrics}
        className="gap-2 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
      >
        {isLoadingBiometrics ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        Escanear con cámara
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={onMarkAllPresent}
        disabled={isActionDisabled}
        className="gap-1.5"
      >
        <CheckCheck className="h-4 w-4 text-emerald-600" />
        Todos presentes
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={onMarkUnmarkedAsAbsent}
        disabled={isActionDisabled}
        className="gap-1.5"
      >
        <XCircle className="h-4 w-4 text-rose-600" />
        Sin marcar a ausente
      </Button>

      <Button
        type="button"
        onClick={onSave}
        disabled={!canEditDate || isSaving || !hasContext || studentsCount === 0}
        className="gap-2"
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Guardar asistencia
      </Button>
    </div>
  );
}
