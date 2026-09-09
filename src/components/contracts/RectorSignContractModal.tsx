import { useState } from "react";
import { X, ShieldCheck, FileText, CheckSquare, Square, Loader2, Download } from "lucide-react";
import type { InstitutionContract } from "@/features/contracts/types";
import { useSignInstitutionContract } from "@/hooks/provider/useProviderContracts";
import { generateContractPdf } from "@/features/contracts/contractPdfGenerator";
import { toast } from "@/components/ui/sonner";

interface RectorSignContractModalProps {
  contract: InstitutionContract | null;
  isOpen: boolean;
  onClose: () => void;
  defaultRectorName?: string;
}

export function RectorSignContractModal({
  contract,
  isOpen,
  onClose,
  defaultRectorName = "",
}: RectorSignContractModalProps) {
  const [signerName, setSignerName] = useState(defaultRectorName);
  const [signerDoc, setSignerDoc] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedDpa, setAcceptedDpa] = useState(false);
  const [acceptedElectronicSig, setAcceptedElectronicSig] = useState(false);

  const signMutation = useSignInstitutionContract();

  if (!isOpen || !contract) return null;

  const canSign =
    signerName.trim().length > 3 &&
    signerDoc.trim().length > 4 &&
    acceptedTerms &&
    acceptedDpa &&
    acceptedElectronicSig;

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSign) {
      toast.error("Por favor confirme su identidad y acepte todas las cláusulas requeridas.");
      return;
    }

    await signMutation.mutateAsync({
      contractId: contract.id,
      signerName: signerName.trim(),
      signerDocumentId: signerDoc.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card text-card-foreground w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                Firma y Legitimidad Jurídica
              </p>
              <h3 className="text-sm font-bold">{contract.title}</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-primary">{contract.contract_number}</span>
              <button
                type="button"
                onClick={() => generateContractPdf(contract)}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar Borrador en PDF
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              <strong>Institución:</strong> {contract.institution_legal_name} • <strong>Vigencia:</strong> Desde{" "}
              {contract.valid_from}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background p-4 max-h-52 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap select-text font-sans">
            {contract.content_markdown}
          </div>

          {/* Formulario de Validación de Identidad del Rector */}
          <form onSubmit={handleSign} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold mb-1">
                  Nombre Completo del Representante Legal
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Ej. Carlos Mario Restrepo"
                  required
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">
                  Cédula de Ciudadanía (C.C.)
                </label>
                <input
                  type="text"
                  value={signerDoc}
                  onChange={(e) => setSignerDoc(e.target.value)}
                  placeholder="Ej. 1020304050"
                  required
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs"
                />
              </div>
            </div>

            {/* Checkboxes Legales Obligatorios */}
            <div className="space-y-2.5 rounded-xl border border-border bg-muted/20 p-3.5">
              <label
                onClick={() => setAcceptedTerms(!acceptedTerms)}
                className="flex items-start gap-2.5 cursor-pointer select-none text-[11px]"
              >
                <span className="mt-0.5 text-primary">
                  {acceptedTerms ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                </span>
                <span>
                  Declaro en mi calidad de Rector(a) y Representante Legal haber leído y aceptado íntegramente las
                  cláusulas del <strong>Contrato Marco de Servicios SaaS de Etymon</strong>.
                </span>
              </label>

              <label
                onClick={() => setAcceptedDpa(!acceptedDpa)}
                className="flex items-start gap-2.5 cursor-pointer select-none text-[11px]"
              >
                <span className="mt-0.5 text-primary">
                  {acceptedDpa ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                </span>
                <span>
                  Autorizo y formalizo la transmisión y tratamiento de datos personales de menores de edad conforme a la{" "}
                  <strong>Ley 1581 de 2012</strong> y <strong>Decreto 1377 de 2013</strong> de Colombia.
                </span>
              </label>

              <label
                onClick={() => setAcceptedElectronicSig(!acceptedElectronicSig)}
                className="flex items-start gap-2.5 cursor-pointer select-none text-[11px]"
              >
                <span className="mt-0.5 text-primary">
                  {acceptedElectronicSig ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                </span>
                <span>
                  Otorgo plena validez jurídica a mi <strong>Firma Electrónica Digital</strong> y renuncio a cualquier
                  excepción de no repudio, bajo el amparo de la <strong>Ley 527 de 1999</strong>.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                disabled={signMutation.isPending}
                className="h-9 px-4 rounded-lg border border-border text-xs hover:bg-muted font-medium transition-colors"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={!canSign || signMutation.isPending}
                className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {signMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Firmar y Ratificar Contrato Digitalmente
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
