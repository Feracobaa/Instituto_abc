import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ScrollText } from "lucide-react";
import { ProviderLayout } from "@/components/provider/ProviderLayout";
import { ProviderEmptyState } from "@/components/provider/ProviderEmptyState";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProviderAuditLogs, useProviderInstitutionSummaries } from "@/hooks/provider";

export default function EtymonAuditoria() {
  const navigate = useNavigate();
  const [institutionFilter, setInstitutionFilter] = useState<string>("all");
  const { data: summaries } = useProviderInstitutionSummaries();
  const { data: logs, isLoading } = useProviderAuditLogs(institutionFilter === "all" ? null : institutionFilter);

  const groupedLogs = useMemo(() => {
    const rows = logs ?? [];
    return rows.reduce<Record<string, typeof rows>>((accumulator, current) => {
      const dateKey = new Date(current.created_at).toLocaleDateString("es-CO");
      accumulator[dateKey] = accumulator[dateKey] ?? [];
      accumulator[dateKey].push(current);
      return accumulator;
    }, {});
  }, [logs]);

  return (
    <ProviderLayout title="Auditoria" subtitle="Trazabilidad de acciones criticas, soporte y cambios comerciales">
      <section className="etymon-surface p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-cyan-300" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Eventos de proveedor</h3>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="w-full sm:w-80">
              <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
                <SelectTrigger className="etymon-input h-11 border-[#2d2d2d] bg-[#151515] text-slate-100">
                  <SelectValue placeholder="Filtrar por institucion" />
                </SelectTrigger>
                <SelectContent className="border-[#2d2d2d] bg-[#161616] text-slate-100">
                  <SelectItem value="all">Todas las instituciones</SelectItem>
                  {(summaries ?? []).map((summary) => (
                    <SelectItem key={summary.institution.id} value={summary.institution.id}>
                      {summary.institution.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="etymon-btn-outline" onClick={() => navigate("/etymon/soporte")}>Ir a soporte</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedLogs).map(([day, dayLogs]) => (
              <div key={day} className="rounded-lg border border-[#2d2d2d] bg-[#171717] p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{day}</p>
                <div className="space-y-2">
                  {dayLogs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-[#2d2d2d] bg-[#141414] p-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-slate-100">{log.action}</p>
                        <p className="text-[11px] text-slate-500">{new Date(log.created_at).toLocaleTimeString("es-CO")}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        Tabla: {log.table_name}
                        {log.record_id ? ` | Registro: ${log.record_id}` : ""}
                      </p>
                      {log.details ? (
                        <pre className="mt-2 overflow-x-auto rounded-lg border border-[#2d2d2d] bg-[#121212] p-2 text-[11px] text-slate-400">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ProviderEmptyState
            title="Sin eventos para este filtro"
            description="Ajusta el filtro por institucion o realiza una accion critica en ETYMON para validar trazabilidad en tiempo real."
            ctaLabel="Abrir instituciones"
            onCtaClick={() => navigate("/etymon/instituciones")}
          />
        )}
      </section>
    </ProviderLayout>
  );
}
