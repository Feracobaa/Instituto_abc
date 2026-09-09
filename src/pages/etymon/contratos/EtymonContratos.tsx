import { useState } from "react";
import { FilePlus2, FileCheck2, Shield, ScrollText, Loader2 } from "lucide-react";
import { ProviderLayout } from "@/components/provider/ProviderLayout";
import {
  useProviderContracts,
  useProviderLegalTemplates,
  useProviderGenerateContract,
  useProviderSendContract,
  useProviderRevokeContract,
  useProviderContractAuditLogs,
  useProviderInstitutionSummaries,
} from "@/hooks/provider";
import type { InstitutionContract, PlatformContractType } from "@/features/contracts/types";
import { ContratosKpiSummary } from "./components/ContratosKpiSummary";
import { ContratosTableSection } from "./components/ContratosTableSection";
import { GenerateContractModal } from "./components/GenerateContractModal";
import { ContractPreviewDrawer } from "./components/ContractPreviewDrawer";
import { LegalTemplatesSection } from "./components/LegalTemplatesSection";
import { ContractAuditLogsSection } from "./components/ContractAuditLogsSection";

export default function EtymonContratos() {
  const [activeTab, setActiveTab] = useState<"contracts" | "templates" | "audit">("contracts");
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [previewContract, setPreviewContract] = useState<InstitutionContract | null>(null);

  const { data: contracts = [], isLoading: contractsLoading } = useProviderContracts();
  const { data: templates = [], isLoading: templatesLoading } = useProviderLegalTemplates();
  const { data: summaries = [], isLoading: summariesLoading } = useProviderInstitutionSummaries();
  const { data: auditLogs = [], isLoading: auditLoading } = useProviderContractAuditLogs();

  const generateMutation = useProviderGenerateContract();
  const sendMutation = useProviderSendContract();
  const revokeMutation = useProviderRevokeContract();

  const institutionsList = summaries.map((s) => ({
    id: s.institution.id,
    name: s.institution.name,
  }));

  const handleGenerateSubmit = async (payload: {
    institutionId: string;
    templateCode: PlatformContractType;
    customTitle?: string;
    planName?: string;
    planPriceCop?: number;
    billingCycle?: string;
    validUntil?: string;
  }) => {
    await generateMutation.mutateAsync(payload);
  };

  const handleSendContract = async (contractId: string) => {
    await sendMutation.mutateAsync(contractId);
    if (previewContract && previewContract.id === contractId) {
      setPreviewContract({ ...previewContract, status: "sent" });
    }
  };

  const handleRevokeContract = async (contractId: string) => {
    const reason = window.prompt("Motivo formal de la revocación del contrato:");
    if (!reason) return;
    await revokeMutation.mutateAsync({ contractId, reason });
  };

  const isLoading = contractsLoading || templatesLoading || summariesLoading;

  return (
    <ProviderLayout
      title="Contratos y Legitimidad"
      subtitle="Formalización legal del servicio SaaS, plantillas regulatorias y firma digital de rectores"
    >
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Top bar with Tabs & CTA */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 rounded-xl border [border-color:var(--et-border)] bg-[var(--et-chip-bg)] p-1">
            <button
              onClick={() => setActiveTab("contracts")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "contracts"
                  ? "bg-[var(--et-nav-active-bg)] text-[var(--et-text)] font-bold shadow-sm"
                  : "text-[var(--et-text-muted)] hover:text-[var(--et-text)]"
              }`}
            >
              <FileCheck2 className="h-3.5 w-3.5 text-cyan-400" />
              <span>Contratos Emitidos</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-cyan-400/10 text-cyan-400 font-semibold">
                {contracts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("templates")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "templates"
                  ? "bg-[var(--et-nav-active-bg)] text-[var(--et-text)] font-bold shadow-sm"
                  : "text-[var(--et-text-muted)] hover:text-[var(--et-text)]"
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span>Plantillas Maestras</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-emerald-400/10 text-emerald-400 font-semibold">
                {templates.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "audit"
                  ? "bg-[var(--et-nav-active-bg)] text-[var(--et-text)] font-bold shadow-sm"
                  : "text-[var(--et-text-muted)] hover:text-[var(--et-text)]"
              }`}
            >
              <ScrollText className="h-3.5 w-3.5 text-indigo-400" />
              <span>Auditoría Forense</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-indigo-400/10 text-indigo-400 font-semibold">
                {auditLogs.length}
              </span>
            </button>
          </div>

          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="etymon-btn-primary flex items-center gap-2 text-xs px-4 py-2"
          >
            <FilePlus2 className="h-4 w-4" />
            Generar Contrato para Colegio
          </button>
        </div>

        {/* KPIs */}
        <ContratosKpiSummary contracts={contracts} />

        {/* Tab Content */}
        {isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          </div>
        ) : activeTab === "contracts" ? (
          <ContratosTableSection
            contracts={contracts}
            institutions={institutionsList}
            onViewContract={(c) => setPreviewContract(c)}
            onSendContract={handleSendContract}
            onRevokeContract={handleRevokeContract}
            onOpenGenerateModal={() => setIsGenerateModalOpen(true)}
            isSending={sendMutation.isPending}
          />
        ) : activeTab === "templates" ? (
          <LegalTemplatesSection templates={templates} />
        ) : (
          <ContractAuditLogsSection logs={auditLogs} isLoading={auditLoading} />
        )}

        {/* Modal de Generación */}
        <GenerateContractModal
          isOpen={isGenerateModalOpen}
          onClose={() => setIsGenerateModalOpen(false)}
          institutions={summaries}
          templates={templates}
          onSubmit={handleGenerateSubmit}
          isLoading={generateMutation.isPending}
        />

        {/* Visor de Previsualización y Sello */}
        <ContractPreviewDrawer
          contract={previewContract}
          isOpen={Boolean(previewContract)}
          onClose={() => setPreviewContract(null)}
          onSendContract={handleSendContract}
          isSending={sendMutation.isPending}
        />
      </div>
    </ProviderLayout>
  );
}
