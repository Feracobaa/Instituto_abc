import { useState } from "react";
import {
  Download,
  Eye,
  FileText,
  Search,
  Send,
  XCircle,
  Building2,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus,
} from "lucide-react";
import type { InstitutionContract, PlatformContractStatus } from "@/features/contracts/types";
import { generateContractPdf } from "@/features/contracts/contractPdfGenerator";
import { formatCurrencyCop } from "@/features/contracts/contractInterpolation";

interface ContratosTableSectionProps {
  contracts: InstitutionContract[];
  institutions: Array<{ id: string; name: string }>;
  onViewContract: (contract: InstitutionContract) => void;
  onSendContract: (contractId: string) => void;
  onRevokeContract: (contractId: string) => void;
  onOpenGenerateModal: () => void;
  isSending: boolean;
}

const statusConfig: Record<
  PlatformContractStatus,
  { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  draft: { label: "Borrador", bg: "bg-slate-500/10 border-slate-500/20", text: "text-slate-400", icon: FileText },
  sent: { label: "Pendiente Rector", bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", icon: Clock },
  signed: { label: "Firmado Digital", bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400", icon: CheckCircle2 },
  active: { label: "Vigente", bg: "bg-teal-500/10 border-teal-500/30", text: "text-teal-400", icon: CheckCircle2 },
  expired: { label: "Vencido", bg: "bg-orange-500/10 border-orange-500/20", text: "text-orange-400", icon: Clock },
  revoked: { label: "Revocado", bg: "bg-red-500/10 border-red-500/20", text: "text-red-400", icon: XCircle },
};

export function ContratosTableSection({
  contracts,
  institutions,
  onViewContract,
  onSendContract,
  onRevokeContract,
  onOpenGenerateModal,
  isSending,
}: ContratosTableSectionProps) {
  const [search, setSearch] = useState("");
  const [selectedInst, setSelectedInst] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const filtered = contracts.filter((c) => {
    const matchSearch =
      c.contract_number.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.institution_legal_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.rector_name || "").toLowerCase().includes(search.toLowerCase());

    const matchInst = selectedInst === "all" || c.institution_id === selectedInst;
    const matchStatus = selectedStatus === "all" || c.status === selectedStatus;

    return matchSearch && matchInst && matchStatus;
  });

  const countByStatus = (st: string) => (st === "all" ? contracts.length : contracts.filter((c) => c.status === st).length);

  return (
    <div className="etymon-surface p-5 space-y-4">
      {/* Filters bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-[var(--et-text-muted)]" />
          <input
            type="text"
            placeholder="Buscar por N° contrato, colegio, rector o NIT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="etymon-input pl-10 text-xs w-full py-2"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedInst}
            onChange={(e) => setSelectedInst(e.target.value)}
            className="etymon-input text-xs py-2 px-3"
          >
            <option value="all">Todas las Instituciones ({institutions.length})</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>

          <button
            onClick={onOpenGenerateModal}
            className="etymon-btn-primary flex items-center gap-1.5 text-xs px-3.5 py-2 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Nuevo Contrato
          </button>
        </div>
      </div>

      {/* Status pills selector */}
      <div className="flex flex-wrap items-center gap-1.5 border-b [border-color:var(--et-border)] pb-3">
        {[
          { id: "all", label: "Todos" },
          { id: "draft", label: "Borradores" },
          { id: "sent", label: "Pendientes Firma" },
          { id: "signed", label: "Firmados" },
          { id: "revoked", label: "Revocados" },
        ].map((tab) => {
          const isActive = selectedStatus === tab.id;
          const count = countByStatus(tab.id);

          return (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold"
                  : "text-[var(--et-text-muted)] hover:text-[var(--et-text)] hover:bg-white/[0.02]"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? "bg-cyan-400 text-black font-bold" : "bg-slate-800 text-slate-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border [border-color:var(--et-border)]">
        <table className="w-full text-left text-xs">
          <thead className="border-b [border-color:var(--et-border)] [background:var(--et-panel-bg)] font-medium text-[var(--et-text-muted)]">
            <tr>
              <th className="px-4 py-3.5">N° Contrato / Tipo</th>
              <th className="px-4 py-3.5">Institución & Rector</th>
              <th className="px-4 py-3.5">Canon Mensual</th>
              <th className="px-4 py-3.5">Estado</th>
              <th className="px-4 py-3.5">Emisión / Vigencia</th>
              <th className="px-4 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y [divide-color:var(--et-border)]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <div className="mx-auto max-w-sm space-y-3">
                    <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mx-auto">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-[var(--et-text)]">No hay contratos que mostrar</p>
                    <p className="text-xs text-[var(--et-text-subtle)]">
                      Aún no has emitido contratos para este filtro. Comienza generando el primero para una institución.
                    </p>
                    <button
                      onClick={onOpenGenerateModal}
                      className="etymon-btn-primary mx-auto inline-flex items-center gap-1.5 text-xs px-4 py-2 mt-2"
                    >
                      <Plus className="h-4 w-4" />
                      Generar Primer Contrato
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((contract) => {
                const conf = statusConfig[contract.status] || statusConfig.draft;
                const StatusIcon = conf.icon;

                return (
                  <tr key={contract.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-3.5 font-medium text-[var(--et-text)]">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-[var(--et-text)] tracking-tight font-mono">{contract.contract_number}</p>
                          <p className="text-[11px] text-[var(--et-text-subtle)] truncate max-w-xs">{contract.title}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 font-semibold text-[var(--et-text)]">
                        <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{contract.institution_legal_name || "Institución"}</span>
                      </div>
                      <p className="text-[11px] text-[var(--et-text-muted)] mt-0.5">
                        Rector: <strong className="text-[var(--et-text-subtle)]">{contract.rector_name || "Sin registrar"}</strong>
                      </p>
                    </td>

                    <td className="px-4 py-3.5 font-semibold text-emerald-400 font-mono">
                      {formatCurrencyCop(Number(contract.plan_price_cop || 0))}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-xs ${conf.bg} ${conf.text}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {conf.label}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-[var(--et-text-muted)] text-[11px]">
                      <p>{new Date(contract.created_at).toLocaleDateString("es-CO")}</p>
                      <p className="text-[10px] text-[var(--et-text-subtle)]">
                        {contract.valid_until ? `Hasta: ${contract.valid_until}` : "Renovación Anual"}
                      </p>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewContract(contract)}
                          title="Ver detalle del contrato"
                          className="p-2 rounded-lg hover:bg-cyan-500/10 text-cyan-400 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {contract.status === "draft" && (
                          <button
                            onClick={() => onSendContract(contract.id)}
                            disabled={isSending}
                            title="Despachar a firma del rector"
                            className="p-2 rounded-lg hover:bg-amber-500/10 text-amber-400 transition-colors"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          onClick={() => generateContractPdf(contract)}
                          title="Descargar PDF formal con sellos"
                          className="p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-400 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </button>

                        {contract.status !== "revoked" && (
                          <button
                            onClick={() => onRevokeContract(contract.id)}
                            title="Revocar contrato formalmente"
                            className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
