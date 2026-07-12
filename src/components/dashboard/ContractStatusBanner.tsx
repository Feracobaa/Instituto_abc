import { CalendarRange, Info } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ContractStatusBannerProps {
  daysRemaining: number;
  periodEnd: string;
}

export function ContractStatusBanner({ daysRemaining, periodEnd }: ContractStatusBannerProps) {
  // Asegurarnos de que no rompa si viene una fecha rara
  let formattedDate = periodEnd;
  try {
    formattedDate = format(new Date(periodEnd), "dd 'de' MMMM 'de' yyyy", { locale: es });
  } catch (error) {
    console.error("Error formatting contract period end date:", error);
  }

  const isUrgent = daysRemaining <= 10;

  return (
    <div className={`flex items-start gap-4 rounded-xl border p-4 shadow-sm transition-all duration-300 ${
      isUrgent 
        ? "border-destructive/30 bg-destructive/5 text-destructive dark:bg-destructive/10" 
        : "border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-300"
    }`}>
      <div className={`rounded-lg p-2 shrink-0 ${isUrgent ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
        <CalendarRange className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-bold flex items-center gap-1.5">
          <Info className="h-4 w-4 shrink-0" />
          Aviso Importante: Licencia del Servicio
        </h4>
        <p className="text-xs leading-relaxed opacity-95">
          Le informamos que la licencia de uso institucional de la plataforma está programada para finalizar el **{formattedDate}** (quedan **{daysRemaining}** días). 
          Le sugerimos gestionar a la brevedad con el área de administración la renovación correspondiente para evitar interrupciones en la disponibilidad del servicio.
        </p>
      </div>
    </div>
  );
}
