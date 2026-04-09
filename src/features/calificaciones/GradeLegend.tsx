import { gradeLegendItems } from "@/features/calificaciones/helpers";
import { cn } from "@/lib/utils";

export function GradeLegend() {
  return (
    <div className="flex flex-wrap gap-4">
      {gradeLegendItems.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={cn("h-3 w-3 rounded-sm", color)} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}
