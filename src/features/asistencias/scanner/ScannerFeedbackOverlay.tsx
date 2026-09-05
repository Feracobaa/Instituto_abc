import React, { useEffect } from "react";
import { CheckCircle, Clock } from "lucide-react";
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
      voiceFeedback.playSound("success");
      voiceFeedback.speak(`Presente, ${lastMatch.studentName}`);
    }
  }, [lastMatch, isMuted]);

  if (!lastMatch) return null;

  return (
    <div className="absolute inset-x-0 bottom-20 z-20 flex justify-center px-4">
      <div className="flex animate-in fade-in zoom-in-95 items-center gap-3.5 rounded-2xl border border-emerald-500/40 bg-slate-950/90 px-5 py-3.5 shadow-2xl backdrop-blur-xl duration-200">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
          <CheckCircle className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Registrado
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <h4 className="text-base font-bold text-white">
            {lastMatch.studentName}
          </h4>
        </div>
      </div>
    </div>
  );
};
