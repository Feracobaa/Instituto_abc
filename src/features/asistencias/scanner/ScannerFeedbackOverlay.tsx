import React, { useEffect } from "react";
import { CheckCircle, Clock, Info } from "lucide-react";
import type { MatchEvent } from "./types";
import { voiceFeedback } from "@/utils/voiceFeedback";

interface ScannerFeedbackOverlayProps {
  isMuted?: boolean;
  lastMatch: MatchEvent | null;
}

export const ScannerFeedbackOverlay: React.FC<ScannerFeedbackOverlayProps> = ({
  isMuted = false,
  lastMatch,
}) => {
  useEffect(() => {
    if (!lastMatch) return;

    if (!isMuted) {
      if (lastMatch.isAlreadyRegistered) {
        voiceFeedback.notifyAlreadyMarked(lastMatch.studentName);
      } else {
        voiceFeedback.playSound("success");
        voiceFeedback.speak(`Presente, ${lastMatch.studentName}`);
      }
    }
  }, [lastMatch, isMuted]);

  if (!lastMatch) return null;

  const isAlready = Boolean(lastMatch.isAlreadyRegistered);

  return (
    <div className="absolute inset-x-0 bottom-20 z-20 flex justify-center px-4">
      <div
        className={`flex animate-in fade-in zoom-in-95 items-center gap-3.5 rounded-2xl border px-5 py-3.5 shadow-2xl backdrop-blur-xl duration-200 ${
          isAlready
            ? "border-amber-500/40 bg-slate-950/90"
            : "border-emerald-500/40 bg-slate-950/90"
        }`}
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            isAlready
              ? "bg-amber-500/20 text-amber-400"
              : "bg-emerald-500/20 text-emerald-400"
          }`}
        >
          {isAlready ? <Info className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                isAlready ? "text-amber-400" : "text-emerald-400"
              }`}
            >
              {isAlready ? "Ya Registrado" : "Registrado"}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <h4 className="text-base font-bold text-white">
            {lastMatch.studentName}
          </h4>
          {isAlready && (
            <p className="text-[11px] text-amber-300/80">
              Asistencia ya registrada en esta clase
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
