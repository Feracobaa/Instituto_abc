import React from "react";
import type { BlinkPhase, ClassScannerState, DistanceStatus } from "./types";
import { Sparkles, Eye, EyeOff, CheckCircle2, AlertTriangle, UserCheck } from "lucide-react";

interface ScannerOvalGuideProps {
  blinkPhase?: BlinkPhase;
  distanceStatus: DistanceStatus;
  earValue?: number;
  instructionText: string;
  state: ClassScannerState;
}

export const ScannerOvalGuide: React.FC<ScannerOvalGuideProps> = ({
  blinkPhase,
  distanceStatus,
  instructionText,
  state,
}) => {
  let borderColor = "border-sky-400/60";
  let glowEffect = "shadow-[0_0_20px_rgba(56,189,248,0.3)]";
  let badgeColor = "bg-sky-500/20 text-sky-200 border-sky-400/40";
  let Icon = Sparkles;

  if (state === "matched") {
    borderColor = "border-emerald-400";
    glowEffect = "shadow-[0_0_35px_rgba(52,211,153,0.7)]";
    badgeColor = "bg-emerald-500/30 text-emerald-200 border-emerald-400";
    Icon = CheckCircle2;
  } else if (state === "already_marked") {
    borderColor = "border-sky-400";
    glowEffect = "shadow-[0_0_35px_rgba(56,189,248,0.7)]";
    badgeColor = "bg-sky-500/30 text-sky-200 border-sky-400";
    Icon = UserCheck;
  } else if (state === "blink_required") {
    if (blinkPhase === "closing_detected") {
      borderColor = "border-cyan-400 animate-pulse";
      glowEffect = "shadow-[0_0_35px_rgba(34,211,238,0.7)]";
      badgeColor = "bg-cyan-500/30 text-cyan-200 border-cyan-400";
      Icon = EyeOff;
    } else {
      borderColor = "border-amber-400 animate-pulse";
      glowEffect = "shadow-[0_0_30px_rgba(251,191,36,0.6)]";
      badgeColor = "bg-amber-500/30 text-amber-200 border-amber-400";
      Icon = Eye;
    }
  } else if (distanceStatus === "too_far" || distanceStatus === "too_close") {
    borderColor = "border-amber-400/80";
    glowEffect = "shadow-[0_0_20px_rgba(251,191,36,0.3)]";
    badgeColor = "bg-amber-500/20 text-amber-200 border-amber-400/40";
    Icon = AlertTriangle;
  } else if (state === "unrecognized") {
    borderColor = "border-rose-400";
    glowEffect = "shadow-[0_0_25px_rgba(244,63,94,0.5)]";
    badgeColor = "bg-rose-500/20 text-rose-200 border-rose-400";
  }

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-4 sm:p-6">
      {/* Máscara oscura con corte de óvalo central mediante SVG */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <mask id="oval-cutout">
            <rect width="100%" height="100%" fill="white" />
            <ellipse cx="50%" cy="46%" rx="140" ry="180" fill="black" />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(3, 7, 18, 0.65)"
          mask="url(#oval-cutout)"
        />
      </svg>

      {/* Indicador de estado superior */}
      <div className="relative z-10 mt-2 flex items-center gap-2 rounded-full border px-4 py-1.5 backdrop-blur-md transition-all duration-300">
        <span
          className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${badgeColor} rounded-full border px-3 py-1`}
        >
          <Icon className="h-3.5 w-3.5" />
          {state === "ready" && "Esperando estudiante"}
          {state === "analyzing" && "Enfocando rostro"}
          {state === "blink_required" &&
            (blinkPhase === "closing_detected"
              ? "¡Cierre captado! Abra los ojos"
              : "Parpadee para verificar")}
          {state === "matched" && "¡Asistencia confirmada!"}
          {state === "already_marked" && "Asistencia ya registrada"}
          {state === "cooldown" && "Siguiente estudiante..."}
          {state === "unrecognized" && "Rostro no registrado"}
        </span>
      </div>

      {/* Borde físico del óvalo guía (inspirado en Software-Asistencia) */}
      <div
        className={`absolute top-[46%] -translate-y-1/2 rounded-[50%] border-2 transition-all duration-300 ${borderColor} ${glowEffect}`}
        style={{
          height: "360px",
          width: "280px",
        }}
      >
        <div className="absolute -left-2 -top-2 h-5 w-5 border-l-2 border-t-2 border-current opacity-80" />
        <div className="absolute -right-2 -top-2 h-5 w-5 border-r-2 border-t-2 border-current opacity-80" />
        <div className="absolute -bottom-2 -left-2 h-5 w-5 border-b-2 border-l-2 border-current opacity-80" />
        <div className="absolute -bottom-2 -right-2 h-5 w-5 border-b-2 border-r-2 border-current opacity-80" />
      </div>

      {/* Franja de instrucción dinámica inferior */}
      <div className="relative z-10 mb-3 w-full max-w-sm text-center">
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-2.5 shadow-2xl backdrop-blur-md">
          <p className="text-sm font-medium text-white/90 drop-shadow">
            {instructionText}
          </p>
          {state === "blink_required" && (
            <>
              <p
                className={`mt-1 text-xs animate-pulse ${
                  blinkPhase === "closing_detected"
                    ? "font-semibold text-cyan-300"
                    : "text-amber-300/90"
                }`}
              >
                {blinkPhase === "closing_detected"
                  ? "¡Excelente! Ahora abra los ojos suavemente"
                  : "Cierre y abra los ojos de forma natural"}
              </p>
              {typeof earValue === "number" && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Apertura:
                  </span>
                  <div className="h-1.5 w-24 overflow-hidden rounded-full border border-white/10 bg-slate-800">
                    <div
                      className={`h-full transition-all duration-75 ${
                        blinkPhase === "closing_detected" ? "bg-cyan-400" : "bg-amber-400"
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(8, Math.round((earValue / 0.35) * 100)))}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-300">
                    {Math.round(earValue * 100)}%
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
