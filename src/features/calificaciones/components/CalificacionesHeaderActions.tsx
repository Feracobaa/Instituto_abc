import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Edit3, Loader2 } from "lucide-react";

interface CalificacionesHeaderActionsProps {
  isPreescolar: boolean;
  inlineEditActive: boolean;
  onToggleInlineEdit: () => void;
  deliveryDate: string;
  onDeliveryDateChange: (date: string) => void;
  isDownloadingAll: boolean;
  onDownloadAllReports: () => void;
  canDownloadAll: boolean;
}

export function CalificacionesHeaderActions({
  isPreescolar,
  inlineEditActive,
  onToggleInlineEdit,
  deliveryDate,
  onDeliveryDateChange,
  isDownloadingAll,
  onDownloadAllReports,
  canDownloadAll,
}: CalificacionesHeaderActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isPreescolar && (
        <Button
          type="button"
          variant={inlineEditActive ? "default" : "outline"}
          size="sm"
          onClick={onToggleInlineEdit}
          className="gap-1.5"
        >
          <Edit3 className="h-4 w-4" />
          {inlineEditActive ? "Finalizar Edición" : "Edición Rápida"}
        </Button>
      )}

      {!isPreescolar && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={deliveryDate}
            onChange={(e) => onDeliveryDateChange(e.target.value)}
            className="h-9 w-36 text-xs"
            title="Fecha de entrega para el boletín"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDownloadAllReports}
            disabled={!canDownloadAll || isDownloadingAll}
            className="gap-1.5"
          >
            {isDownloadingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Boletines del Grupo
          </Button>
        </div>
      )}
    </div>
  );
}
