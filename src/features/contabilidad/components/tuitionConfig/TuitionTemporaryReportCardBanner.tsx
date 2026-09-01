import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface TuitionTemporaryReportCardBannerProps {
  allowReportsOnDebtTemp?: boolean | null;
  isPending: boolean;
  onToggleTempPermission: () => void;
}

export function TuitionTemporaryReportCardBanner({
  allowReportsOnDebtTemp,
  isPending,
  onToggleTempPermission,
}: TuitionTemporaryReportCardBannerProps) {
  return (
    <Card className="border-amber-500/20 bg-amber-500/5 p-4 shadow-sm mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full bg-amber-500 ${allowReportsOnDebtTemp ? "animate-pulse" : ""}`} />
            Permiso Temporal de Boletines
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            Al activar esta opción, los acudientes podrán visualizar y descargar los boletines académicos 
            de forma inmediata en su portal, incluso si presentan saldos pendientes de pago en pensiones.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant={allowReportsOnDebtTemp ? "destructive" : "default"}
            onClick={onToggleTempPermission}
            disabled={isPending}
            size="sm"
            className="font-semibold"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : allowReportsOnDebtTemp ? (
              "Desactivar Descarga Temporal"
            ) : (
              "Permitir Descarga Temporal"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
