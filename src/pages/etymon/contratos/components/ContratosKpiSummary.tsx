import { FileCheck, Clock, ShieldCheck, TrendingUp, AlertTriangle } from "lucide-react";
import type { InstitutionContract } from "@/features/contracts/types";

interface ContratosKpiSummaryProps {
  contracts: InstitutionContract[];
}

export function ContratosKpiSummary({ contracts }: ContratosKpiSummaryProps) {
  const total = contracts.length;
  const signed = contracts.filter((c) => c.status === "signed" || c.status === "active").length;
  const pending = contracts.filter((c) => c.status === "sent").length;
  const drafts = contracts.filter((c) => c.status === "draft").length;
  const revoked = contracts.filter((c) => c.status === "revoked").length;
  const complianceRate = total > 0 ? Math.round((signed / total) * 100) : 100;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Total Contratos */}
      <div className="etymon-surface group relative overflow-hidden p-5 transition-all duration-300 hover:border-cyan-500/40">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-cyan-500/5 blur-2xl group-hover:bg-cyan-500/10 transition-colors" />
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--et-text-muted)]">
            Total Emitidos
          </p>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <FileCheck className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-[var(--et-text)]">{total}</span>
          <span className="text-xs text-[var(--et-text-muted)]">acuerdos</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--et-text-subtle)] border-t [border-color:var(--et-border)] pt-2.5">
          <span>{drafts} en borrador</span>
          <span className="font-mono text-cyan-400">Activos</span>
        </div>
      </div>

      {/* Firmados y Vigentes */}
      <div className="etymon-surface group relative overflow-hidden p-5 transition-all duration-300 hover:border-emerald-500/40">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--et-text-muted)]">
            Firmados y Vigentes
          </p>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-emerald-400">{signed}</span>
          <span className="text-xs text-emerald-500/80 font-medium">100% legítimos</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--et-text-subtle)] border-t [border-color:var(--et-border)] pt-2.5">
          <span className="text-emerald-400/90 font-medium">Con sello digital</span>
          <span className="font-mono text-[10px] text-emerald-400">Ley 527/1999</span>
        </div>
      </div>

      {/* Pendientes por Rector */}
      <div className="etymon-surface group relative overflow-hidden p-5 transition-all duration-300 hover:border-amber-500/40">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-amber-500/5 blur-2xl group-hover:bg-amber-500/10 transition-colors" />
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--et-text-muted)]">
            Pendientes por Rector
          </p>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <Clock className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-amber-400">{pending}</span>
          <span className="text-xs text-amber-500/80">en espera de firma</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--et-text-subtle)] border-t [border-color:var(--et-border)] pt-2.5">
          <span>{pending > 0 ? "Requieren recordatorio" : "Sin pendientes"}</span>
          {pending > 0 && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />}
        </div>
      </div>

      {/* Índice de Legitimidad */}
      <div className="etymon-surface group relative overflow-hidden p-5 transition-all duration-300 hover:border-indigo-500/40">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-indigo-500/5 blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--et-text-muted)]">
            Índice de Legitimidad
          </p>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-[var(--et-text)]">{complianceRate}%</span>
          <span className="text-xs text-[var(--et-text-muted)]">cobertura formal</span>
        </div>
        {/* Progress bar */}
        <div className="mt-3 space-y-1.5 border-t [border-color:var(--et-border)] pt-2.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${complianceRate}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-[var(--et-text-muted)]">
            <span>{revoked} revocados</span>
            <span className="font-mono">SaaS Compliance</span>
          </div>
        </div>
      </div>
    </section>
  );
}
