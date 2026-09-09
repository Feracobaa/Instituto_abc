import { useState, useEffect } from "react";
import { X, FilePlus2, Loader2, Building, Shield, DollarSign, Calendar } from "lucide-react";
import type { PlatformContractType, PlatformLegalTemplate, GenerateContractPayload } from "@/features/contracts/types";
import type { ProviderInstitutionSummary } from "@/hooks/provider";

interface GenerateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutions: ProviderInstitutionSummary[];
  templates: PlatformLegalTemplate[];
  onSubmit: (payload: GenerateContractPayload) => Promise<void>;
  isLoading: boolean;
}

export function GenerateContractModal({
  isOpen,
  onClose,
  institutions,
  templates,
  onSubmit,
  isLoading,
}: GenerateContractModalProps) {
  const [selectedInstId, setSelectedInstId] = useState("");
  const [templateCode, setTemplateCode] = useState<PlatformContractType>("SAAS_SERVICE_AGREEMENT");
  const [customTitle, setCustomTitle] = useState("");
  const [planName, setPlanName] = useState("");
  const [planPriceCop, setPlanPriceCop] = useState<number>(0);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [validUntil, setValidUntil] = useState("");

  const activeInstitution = institutions.find((i) => i.institution.id === selectedInstId);
  const selectedTemplate = templates.find((t) => t.code === templateCode);

  useEffect(() => {
    if (institutions.length > 0 && !selectedInstId) {
      setSelectedInstId(institutions[0].institution.id);
    }
  }, [institutions, selectedInstId]);

  useEffect(() => {
    if (activeInstitution) {
      const plan = activeInstitution.subscription?.subscription_plans;
      setPlanName(plan?.name || "Plan Institucional Etymon");
      setPlanPriceCop(plan ? Math.round(plan.monthly_price_cents / 100) : 1500000);
    }
  }, [activeInstitution]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstId) return;

    await onSubmit({
      institutionId: selectedInstId,
      templateCode,
      customTitle: customTitle || undefined,
      planName,
      planPriceCop,
      billingCycle,
      validUntil: validUntil || undefined,
      institutionName: activeInstitution?.settings?.legal_name || activeInstitution?.institution.name,
      institutionNit: activeInstitution?.settings?.nit,
      rectorName: activeInstitution?.settings?.rector_name,
      rectorDocumentId: activeInstitution?.settings?.phone,
      address: activeInstitution?.settings?.address,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="etymon-surface w-full max-w-2xl overflow-hidden shadow-2xl border [border-color:var(--et-border)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b [border-color:var(--et-border)] px-6 py-4 bg-[var(--et-panel-bg)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <FilePlus2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--et-text)]">Generar Nuevo Contrato Formal</h3>
              <p className="text-[11px] text-[var(--et-text-muted)]">
                Emite un instrumento vinculante individualizado con membrete y validación de firma digital
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Institution selector with card info */}
          <div>
            <label className="block font-semibold text-[var(--et-text)] mb-1">Institución Educativa Destinataria</label>
            <div className="relative">
              <Building className="absolute left-3 top-2.5 h-4 w-4 text-[var(--et-text-muted)]" />
              <select
                value={selectedInstId}
                onChange={(e) => setSelectedInstId(e.target.value)}
                required
                className="etymon-input pl-9 w-full py-2 text-xs"
              >
                {institutions.map((item) => (
                  <option key={item.institution.id} value={item.institution.id}>
                    {item.institution.name} {item.settings?.nit ? `• NIT: ${item.settings.nit}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {activeInstitution && (
              <div className="mt-2.5 p-3 rounded-xl border [border-color:var(--et-border)] bg-[var(--et-chip-bg)] grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-[var(--et-text-muted)]">Representante Legal:</span>{" "}
                  <strong className="text-[var(--et-text)]">{activeInstitution.settings?.rector_name || "Por registrar"}</strong>
                </div>
                <div>
                  <span className="text-[var(--et-text-muted)]">NIT:</span>{" "}
                  <strong className="text-[var(--et-text)] font-mono">{activeInstitution.settings?.nit || "Sin NIT"}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Template selector with preview */}
          <div>
            <label className="block font-semibold text-[var(--et-text)] mb-1">Plantilla Legal Base</label>
            <div className="relative">
              <Shield className="absolute left-3 top-2.5 h-4 w-4 text-[var(--et-text-muted)]" />
              <select
                value={templateCode}
                onChange={(e) => setTemplateCode(e.target.value as PlatformContractType)}
                className="etymon-input pl-9 w-full py-2 text-xs"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.code}>
                    {tpl.name} (v{tpl.version})
                  </option>
                ))}
              </select>
            </div>
            {selectedTemplate && (
              <p className="mt-1 text-[11px] text-[var(--et-text-subtle)] leading-relaxed">
                {selectedTemplate.description}
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block font-semibold text-[var(--et-text)] mb-1">Título del Contrato</label>
            <input
              type="text"
              placeholder={selectedTemplate?.name || "Ej. Contrato Marco SaaS 2026"}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="etymon-input w-full py-2 text-xs"
            />
          </div>

          {/* Plan & Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[var(--et-text)] mb-1">Nombre del Plan</label>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                className="etymon-input w-full py-2 text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--et-text)] mb-1">Canon Mensual (COP)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-[var(--et-text-muted)]" />
                <input
                  type="number"
                  value={planPriceCop}
                  onChange={(e) => setPlanPriceCop(Number(e.target.value))}
                  className="etymon-input pl-9 w-full py-2 text-xs font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Billing cycle & Validity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[var(--et-text)] mb-1">Ciclo de Facturación</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value)}
                className="etymon-input w-full py-2 text-xs"
              >
                <option value="monthly">Mensual</option>
                <option value="annual">Anual (Anticipado)</option>
                <option value="semester">Semestral</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[var(--et-text)] mb-1">Vigencia Hasta (Opcional)</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-[var(--et-text-muted)]" />
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="etymon-input pl-9 w-full py-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t [border-color:var(--et-border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="etymon-btn-ghost text-xs px-4 py-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="etymon-btn-primary flex items-center gap-1.5 text-xs px-5 py-2 font-semibold"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
              Generar Contrato Institucional
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
