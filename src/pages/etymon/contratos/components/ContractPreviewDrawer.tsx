import { useState } from "react";
import {
  X,
  Download,
  Send,
  ShieldCheck,
  Clock,
  Hash,
  CheckCircle2,
  Copy,
  Check,
  FileText,
  Lock,
} from "lucide-react";
import type { InstitutionContract } from "@/features/contracts/types";
import { generateContractPdf } from "@/features/contracts/contractPdfGenerator";
import { formatCurrencyCop } from "@/features/contracts/contractInterpolation";
import { toast } from "@/components/ui/sonner";

interface ContractPreviewDrawerProps {
  contract: InstitutionContract | null;
  isOpen: boolean;
  onClose: () => void;
  onSendContract: (contractId: string) => void;
  isSending: boolean;
}

export function ContractPreviewDrawer({
  contract,
  isOpen,
  onClose,
  onSendContract,
  isSending,
}: ContractPreviewDrawerProps) {
  const [copiedHash, setCopiedHash] = useState(false);

  if (!isOpen || !contract) return null;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(contract.signature_hash || contract.content_hash);
    setCopiedHash(true);
    toast.success("Sello criptográfico copiado.");
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="etymon-surface w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border [border-color:var(--et-border)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b [border-color:var(--et-border)] px-6 py-4 bg-[var(--et-panel-bg)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-cyan-400">{contract.contract_number}</span>
                <span className="text-xs text-[var(--et-text-muted)]">• {contract.institution_legal_name}</span>
              </div>
              <h3 className="text-sm font-bold text-[var(--et-text)]">{contract.title}</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Legal Details Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 border-b [border-color:var(--et-border)] bg-[var(--et-chip-bg)] text-xs">
          <div>
            <p className="text-[10px] text-[var(--et-text-muted)] uppercase font-semibold">Representante Legal</p>
            <p className="font-bold text-[var(--et-text)] truncate">{contract.rector_name || "Por definir"}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--et-text-muted)] uppercase font-semibold">NIT Institucional</p>
            <p className="font-bold text-[var(--et-text)] font-mono">{contract.institution_nit || "No registrado"}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--et-text-muted)] uppercase font-semibold">Canon Mensual</p>
            <p className="font-bold text-emerald-400 font-mono">{formatCurrencyCop(Number(contract.plan_price_cop || 0))}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--et-text-muted)] uppercase font-semibold">Estado Actual</p>
            <p className="font-bold uppercase text-[11px] text-cyan-400 tracking-wider">{contract.status}</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs leading-relaxed text-[var(--et-text)]">
          {/* Sello de Autenticidad */}
          <div className="rounded-xl border [border-color:var(--et-border)] bg-[var(--et-panel-bg)] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {contract.status === "signed" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-400" />
                )}
                <h4 className="text-xs font-bold text-[var(--et-text)]">
                  {contract.status === "signed"
                    ? "Certificación de Firma Digital Vinculante (Ley 527/1999)"
                    : "Certificación Legal Pendiente de Ratificación"}
                </h4>
              </div>

              <button
                onClick={handleCopyHash}
                className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:underline"
              >
                {copiedHash ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                Copiar Hash
              </button>
            </div>

            {contract.status === "signed" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[var(--et-text-subtle)] pt-1">
                <p>
                  <strong className="text-[var(--et-text)]">Firmado por:</strong> {contract.signer_name} (CC:{" "}
                  {contract.signer_document_id})
                </p>
                <p>
                  <strong className="text-[var(--et-text)]">Fecha y Hora:</strong>{" "}
                  {contract.signed_at ? new Date(contract.signed_at).toLocaleString("es-CO") : "Registrado"}
                </p>
                <div className="col-span-1 sm:col-span-2 rounded-lg bg-black/40 p-2.5 border [border-color:var(--et-border)] font-mono text-[10px] text-cyan-300 break-all flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>SHA-256: {contract.signature_hash}</span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-[var(--et-text-subtle)]">
                Este instrumento está preparado para su envío al Rector. Al ser firmado digitalmente, se encriptará un
                sello de no repudio garantizando integridad y autenticidad plena ante el Ministerio de Educación.
              </p>
            )}
          </div>

          {/* Cláusulas del Contrato */}
          <div className="rounded-xl border [border-color:var(--et-border)] bg-black/30 p-5 whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-200 select-text">
            {contract.content_markdown}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t [border-color:var(--et-border)] px-6 py-3.5 bg-[var(--et-panel-bg)]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--et-text-muted)] font-mono">
              Hash base: {contract.content_hash.slice(0, 16)}...
            </span>
          </div>

          <div className="flex items-center gap-2">
            {contract.status === "draft" && (
              <button
                onClick={() => onSendContract(contract.id)}
                disabled={isSending}
                className="etymon-btn-primary flex items-center gap-1.5 text-xs px-4 py-2 font-semibold"
              >
                <Send className="h-3.5 w-3.5" />
                Despachar al Rector
              </button>
            )}

            <button
              onClick={() => generateContractPdf(contract)}
              className="etymon-btn-outline flex items-center gap-1.5 text-xs px-4 py-2 font-semibold"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              Descargar PDF Oficial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
