import { ScrollText, ShieldCheck, Clock, User, Globe } from "lucide-react";
import type { PlatformContractAuditLog } from "@/features/contracts/types";

interface ContractAuditLogsSectionProps {
  logs: PlatformContractAuditLog[];
  isLoading: boolean;
}

export function ContractAuditLogsSection({ logs, isLoading }: ContractAuditLogsSectionProps) {
  return (
    <div className="etymon-surface p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-[var(--et-text)]">Pista de Auditoría Forense y No Repudio</h3>
        </div>
        <p className="text-xs text-[var(--et-text-subtle)] mt-1">
          Registro inmutable protegido contra modificación o borrado. Cada evento contractual almacena sellos
          cronológicos, direcciones IP y hashes probatorios.
        </p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-[var(--et-text-muted)]">Cargando eventos de auditoría...</div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center text-xs text-[var(--et-text-muted)] rounded-lg border [border-color:var(--et-border)]">
          No hay registros de auditoría contractual aún.
        </div>
      ) : (
        <div className="space-y-2.5">
          {logs.map((log) => {
            const actionBadgeColor =
              log.action === "SIGN"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : log.action === "SEND"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : log.action === "REVOKE"
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";

            return (
              <div
                key={log.id}
                className="rounded-xl border [border-color:var(--et-border)] bg-[var(--et-chip-bg)] p-3.5 space-y-2 transition-all hover:bg-white/[0.01]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${actionBadgeColor}`}>
                      {log.action}
                    </span>
                    <span className="text-xs font-semibold text-[var(--et-text)]">
                      {(log.details?.contract_number as string) || "Evento Contractual"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--et-text-muted)]">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(log.created_at).toLocaleString("es-CO")}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--et-text-subtle)]">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3 text-slate-400" />
                    Rol: <strong className="text-[var(--et-text)] capitalize">{log.actor_role}</strong>
                  </span>

                  {log.ip_address && (
                    <span className="flex items-center gap-1 font-mono text-[10px]">
                      <Globe className="h-3 w-3 text-slate-400" />
                      IP: {log.ip_address}
                    </span>
                  )}

                  {log.details?.signature_seal ? (
                    <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-400">
                      <ShieldCheck className="h-3 w-3" />
                      Sello Criptográfico Verificado
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
