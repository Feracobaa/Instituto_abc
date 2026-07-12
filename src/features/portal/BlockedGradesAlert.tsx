import { Lock, CreditCard, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface BlockedGradesAlertProps {
  onGoToPensiones?: () => void;
}

export function BlockedGradesAlert({ onGoToPensiones }: BlockedGradesAlertProps) {
  const navigate = useNavigate();

  const handleGoToPensiones = () => {
    if (onGoToPensiones) {
      onGoToPensiones();
    } else {
      navigate("/portal?tab=pensiones");
    }
  };

  return (
    <div className="relative mx-auto my-8 max-w-2xl overflow-hidden rounded-2xl border border-destructive/20 bg-card p-8 shadow-2xl transition-all duration-300 hover:shadow-destructive/5 dark:bg-slate-900/40 dark:backdrop-blur-sm">
      {/* Decorative gradient blur background */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-destructive/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative space-y-6 text-center">
        {/* Animated/Glowing Lock Icon Container */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-8 ring-destructive/5 dark:bg-destructive/20 dark:ring-destructive/10">
          <Lock className="h-10 w-10 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Visualización Bloqueada
          </h2>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            Las calificaciones y el boletín de este período no están disponibles debido a que la cuenta presenta saldos pendientes en las pensiones escolares.
          </p>
        </div>

        {/* Steps Card */}
        <div className="rounded-xl border border-border bg-muted/30 p-6 text-left dark:bg-slate-950/20">
          <h3 className="mb-3 text-sm font-bold text-foreground flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-xs font-semibold text-amber-600 dark:text-amber-400">!</span>
            ¿Cómo restablecer el acceso?
          </h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">1</span>
              <span>
                Consulte la pestaña <strong className="text-foreground">Pensiones</strong> para revisar el detalle e historial de sus meses pendientes.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">2</span>
              <span>
                Realice el pago de los meses en mora por los medios oficiales habilitados por la institución.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">3</span>
              <span>
                Una vez la administración registre el abono, el bloqueo se levantará de forma automática y podrá descargar su boletín.
              </span>
            </li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={handleGoToPensiones}
            className="w-full gap-2 font-semibold shadow-md sm:w-auto"
          >
            <CreditCard className="h-4 w-4" />
            Ver Pensiones Pendientes
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open("https://wa.me/573000000000", "_blank")}
            className="w-full gap-2 sm:w-auto"
          >
            <HelpCircle className="h-4 w-4" />
            Contactar Soporte
          </Button>
        </div>
      </div>
    </div>
  );
}
