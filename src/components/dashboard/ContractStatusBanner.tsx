import { useState } from "react";
import { ShieldAlert, AlertTriangle, CalendarRange, Clock, Copy, Check, Info } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ContractStatusBannerProps {
  daysRemaining: number;
  periodEnd: string;
}

export function ContractStatusBanner({ daysRemaining, periodEnd }: ContractStatusBannerProps) {
  const [hasCopied, setHasCopied] = useState(false);

  // Asegurarnos de que no rompa si viene una fecha con formato alternativo
  let formattedDate = periodEnd;
  try {
    const parts = periodEnd.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      formattedDate = format(new Date(year, month, day), "dd 'de' MMMM 'de' yyyy", { locale: es });
    } else {
      formattedDate = format(new Date(periodEnd + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: es });
    }
  } catch (error) {
    console.error("Error formatting contract period end date:", error);
  }

  const isCritical = daysRemaining <= 3;
  const isUrgent = daysRemaining <= 10;
  const remainingDaysFormatted = daysRemaining === 1 ? "1 día" : `${daysRemaining} días`;
  const countdownLabel = daysRemaining === 1 ? "Queda 1 día restante" : `Quedan ${daysRemaining} días`;

  const handleCopyNotice = async () => {
    const noticeText = `[Aviso Institucional - Licencia de Servicio]\nLe informamos que la licencia institucional de uso de la plataforma académica está programada para finalizar el ${formattedDate} (${countdownLabel}). Se solicita gestionar oportunamente la renovación correspondiente con el área de administración para garantizar la continuidad ininterrumpida de los servicios escolares.`;
    try {
      await navigator.clipboard.writeText(noticeText);
      setHasCopied(true);
      toast.success("Detalle del aviso copiado al portapapeles para gestión administrativa.");
      setTimeout(() => setHasCopied(false), 2500);
    } catch {
      toast.error("No fue posible copiar el texto al portapapeles.");
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 sm:p-5 transition-all duration-300",
        "backdrop-blur-2xl -webkit-backdrop-blur-2xl shadow-xl",
        "animate-in fade-in slide-in-from-top-2 duration-500",
        isCritical
          ? "bg-gradient-to-br from-rose-600/25 via-slate-950/90 to-rose-950/50 border border-rose-500/60 shadow-[0_10px_35px_rgba(225,29,72,0.28),inset_0_1.5px_2px_rgba(255,255,255,0.3)]"
          : isUrgent
          ? "bg-gradient-to-br from-rose-500/15 via-slate-950/80 to-rose-950/35 border border-rose-500/40 shadow-[0_8px_30px_rgba(225,29,72,0.18),inset_0_1px_1.5px_rgba(255,255,255,0.25)]"
          : "bg-gradient-to-br from-amber-500/15 via-slate-950/80 to-amber-950/35 border border-amber-500/40 shadow-[0_8px_30px_rgba(245,158,11,0.18),inset_0_1px_1.5px_rgba(255,255,255,0.25)]"
      )}
    >
      {/* Specular Liquid Glass Top Highlight Bar */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent to-transparent",
          isUrgent ? "via-rose-300/80 dark:via-rose-200/90" : "via-amber-300/80 dark:via-amber-200/90"
        )}
      />

      {/* Dynamic Animated Glare Sheen Sweep */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="animate-liquid-glare absolute -inset-y-full -left-1/3 w-1/2 bg-gradient-to-r from-transparent via-white/20 dark:via-white/12 to-transparent pointer-events-none" />
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row items-start gap-4">
        {/* Glowing Glass Icon Badge */}
        <div
          className={cn(
            "relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl",
            "backdrop-blur-md transition-all duration-300",
            isCritical
              ? "bg-rose-500/25 text-rose-300 border border-rose-400/50 shadow-[0_0_25px_rgba(244,63,94,0.4)]"
              : isUrgent
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
              : "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
          )}
        >
          {isCritical ? (
            <ShieldAlert className="h-7 w-7 animate-pulse text-rose-400" />
          ) : isUrgent ? (
            <AlertTriangle className="h-7 w-7 text-rose-400" />
          ) : (
            <CalendarRange className="h-7 w-7 text-amber-400" />
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 space-y-2 min-w-0">
          {/* Executive Badges & Status */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider",
                isCritical
                  ? "bg-rose-500/30 text-rose-200 border border-rose-400/50 shadow-[0_0_12px_rgba(244,63,94,0.25)]"
                  : isUrgent
                  ? "bg-rose-500/20 text-rose-200 border border-rose-500/40"
                  : "bg-amber-500/20 text-amber-200 border border-amber-500/40"
              )}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
                    isUrgent ? "bg-rose-400" : "bg-amber-400"
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex h-2 w-2 rounded-full",
                    isUrgent ? "bg-rose-500" : "bg-amber-500"
                  )}
                />
              </span>
              {isCritical ? "Vencimiento Inminente" : isUrgent ? "Atención Requerida" : "Aviso Preventivo"}
            </span>

            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-200 bg-white/10 px-2.5 py-0.5 rounded-md border border-white/15 backdrop-blur-md">
              <Clock className="h-3 w-3 text-slate-300" />
              {countdownLabel}
            </span>
          </div>

          {/* Heading */}
          <h4 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0 text-rose-400" />
            Aviso Importante: Licencia del Servicio
          </h4>

          {/* Formal Body Paragraph with High Contrast Highlights */}
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
            Le informamos que la licencia de uso institucional de la plataforma está programada para finalizar el{" "}
            <strong className="inline-block font-bold text-white bg-white/15 px-2 py-0.5 rounded-md border border-white/20 shadow-sm mx-1">
              {formattedDate}
            </strong>{" "}
            (
            <span
              className={cn(
                "font-extrabold underline decoration-2 underline-offset-2",
                isUrgent
                  ? "text-rose-300 decoration-rose-400/70"
                  : "text-amber-300 decoration-amber-400/70"
              )}
            >
              quedan {remainingDaysFormatted}
            </span>
            ). Le sugerimos gestionar a la brevedad con el área de administración la renovación correspondiente para evitar interrupciones en la disponibilidad del servicio y salvaguardar el acceso a los módulos académicos.
          </p>

          {/* Executive Footer Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 mt-2 border-t border-white/10">
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Plataforma: <span className="font-semibold text-white">Etymon Cloud SaaS</span>
              </span>
              <span>•</span>
              <span>Gestión de Licenciamiento Institucional</span>
            </div>

            <button
              onClick={handleCopyNotice}
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                "backdrop-blur-md shadow-sm active:scale-95 cursor-pointer",
                "bg-white/15 hover:bg-white/25 active:bg-white/30",
                "border border-white/20 hover:border-white/35",
                "text-white hover:text-white"
              )}
              title="Copiar detalles oficiales del aviso al portapapeles"
            >
              {hasCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-bold">¡Aviso Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-300" />
                  <span>Copiar Aviso Oficial</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
