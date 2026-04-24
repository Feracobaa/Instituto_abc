import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProviderKpiCardProps {
  points: number[];
  subtitle?: string;
  title: string;
  trendLabel: string;
  trend: "up" | "down";
  value: string;
}

function normalizePoints(points: number[]) {
  if (points.length === 0) return "";

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 100 - ((point - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");
}

export function ProviderKpiCard({ points, subtitle, title, trend, trendLabel, value }: ProviderKpiCardProps) {
  const polylinePoints = normalizePoints(points);
  const trendClass = trend === "up" ? "text-emerald-300" : "text-rose-300";
  const gradientId = `line-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <section className="etymon-surface group p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-semibold leading-none text-slate-100 md:text-4xl">{value}</p>
          {subtitle ? <p className="mt-2 text-xs text-slate-500">{subtitle}</p> : null}
        </div>

        <div className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium", trendClass)}>
          {trend === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          <span>{trendLabel}</span>
        </div>
      </header>

      <div className="mt-4 h-14 w-full overflow-hidden rounded-md border border-white/5 bg-black/20 px-1 py-1">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="200%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#00e7a7" stopOpacity="1" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.3" />
              <animate attributeName="x1" values="0%;-100%" dur="3s" repeatCount="indefinite" />
              <animate attributeName="x2" values="200%;100%" dur="3s" repeatCount="indefinite" />
            </linearGradient>
            
            <filter id={`${gradientId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <polyline
            points={polylinePoints}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="100"
            className="animate-draw-line"
            filter={`url(#${gradientId}-glow)`}
          />
        </svg>
      </div>
    </section>
  );
}
