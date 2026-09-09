import { useState, useRef } from "react";
import { X, Upload, Plus, FileText, Sparkles, Loader2, Code2, Eye } from "lucide-react";
import type { PlatformContractType, PlatformLegalTemplate } from "@/features/contracts/types";
import { useProviderUpsertLegalTemplate } from "@/hooks/provider/useProviderContracts";
import { toast } from "@/components/ui/sonner";

interface CreateOrUploadTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTemplate?: PlatformLegalTemplate | null;
}

const TEMPLATE_CODES: { code: PlatformContractType; label: string }[] = [
  { code: "SAAS_SERVICE_AGREEMENT", label: "Contrato Marco SaaS" },
  { code: "DATA_PROCESSING_AGREEMENT", label: "Acuerdo DPA / Habeas Data Menores" },
  { code: "TERMS_AND_CONDITIONS", label: "Términos y Condiciones de Uso" },
  { code: "SLA_SECURITY_POLICY", label: "Política de SLA y Ciberseguridad" },
  { code: "MASTER_COMPLIANCE_PACK", label: "Paquete Integral de Legitimidad" },
];

const VARIABLE_TAGS = [
  "{{CONTRACT_NUMBER}}",
  "{{INSTITUTION_NAME}}",
  "{{NIT}}",
  "{{RECTOR_NAME}}",
  "{{ADDRESS}}",
  "{{PLAN_NAME}}",
  "{{PRICE_COP}}",
  "{{DATE}}",
];

export function CreateOrUploadTemplateModal({
  isOpen,
  onClose,
  editingTemplate,
}: CreateOrUploadTemplateModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upsertMutation = useProviderUpsertLegalTemplate();

  const [name, setName] = useState(editingTemplate?.name || "");
  const [code, setCode] = useState<PlatformContractType>(editingTemplate?.code || "SAAS_SERVICE_AGREEMENT");
  const [version, setVersion] = useState(editingTemplate?.version || "1.0");
  const [description, setDescription] = useState(editingTemplate?.description || "");
  const [contentMarkdown, setContentMarkdown] = useState(editingTemplate?.content_markdown || "");
  const [previewMode, setPreviewMode] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setContentMarkdown(text);
        if (!name) setName(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
        toast.success(`Archivo "${file.name}" cargado exitosamente.`);
      }
    };
    reader.readAsText(file);
  };

  const handleInsertVariable = (variable: string) => {
    setContentMarkdown((prev) => `${prev} ${variable} `);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contentMarkdown.trim()) {
      toast.error("Por favor completa el nombre y el contenido de la plantilla.");
      return;
    }

    await upsertMutation.mutateAsync({
      id: editingTemplate?.id,
      name: name.trim(),
      code,
      version: version.trim() || "1.0",
      description: description.trim() || "Plantilla legal institucional",
      content_markdown: contentMarkdown,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="etymon-surface w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border [border-color:var(--et-border)]">
        <div className="flex items-center justify-between border-b [border-color:var(--et-border)] px-6 py-4 bg-[var(--et-panel-bg)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--et-text)]">
                {editingTemplate ? "Editar Plantilla Legal" : "Crear o Subir Plantilla Contractual"}
              </h3>
              <p className="text-[11px] text-[var(--et-text-muted)]">
                Redacta o importa un documento en formato Markdown con variables dinámicas
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[var(--et-text)] mb-1">Nombre de la Plantilla</label>
              <input
                type="text"
                placeholder="Ej. Contrato Marco SaaS Edición 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="etymon-input w-full"
              />
            </div>
            <div>
              <label className="block font-semibold text-[var(--et-text)] mb-1">Versión</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="etymon-input w-full font-mono text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[var(--et-text)] mb-1">Código y Tipo de Acuerdo</label>
              <select
                value={code}
                onChange={(e) => setCode(e.target.value as PlatformContractType)}
                className="etymon-input w-full"
              >
                {TEMPLATE_CODES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label} ({item.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[var(--et-text)] mb-1">Descripción Breve</label>
              <input
                type="text"
                placeholder="Finalidad del instrumento legal..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="etymon-input w-full"
              />
            </div>
          </div>

          {/* Barra de Subida de Archivos y Variables */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border [border-color:var(--et-border)] bg-[var(--et-chip-bg)]">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".md,.txt"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="etymon-btn-outline flex items-center gap-1.5 text-xs py-1 px-2.5"
              >
                <Upload className="h-3.5 w-3.5 text-cyan-400" />
                Subir Archivo (.md / .txt)
              </button>

              <button
                type="button"
                onClick={() => setPreviewMode(!previewMode)}
                className="etymon-btn-ghost flex items-center gap-1.5 text-xs py-1 px-2.5"
              >
                {previewMode ? <Code2 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {previewMode ? "Editar Código" : "Vista Previa"}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1 text-[10px]">
              <span className="text-[var(--et-text-muted)] mr-1">Insertar:</span>
              {VARIABLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleInsertVariable(tag)}
                  className="px-1.5 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-mono transition-colors"
                >
                  {tag.replace(/[{}]/g, "")}
                </button>
              ))}
            </div>
          </div>

          {/* Editor / Previewer */}
          {previewMode ? (
            <div className="rounded-xl border [border-color:var(--et-border)] bg-black/40 p-4 min-h-[260px] max-h-[360px] overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-6 text-slate-200 select-text">
              {contentMarkdown || "No hay contenido redactado para previsualizar."}
            </div>
          ) : (
            <textarea
              rows={12}
              value={contentMarkdown}
              onChange={(e) => setContentMarkdown(e.target.value)}
              placeholder="# Escribe aquí las cláusulas del contrato en Markdown..."
              className="etymon-input w-full font-mono text-[11px] leading-relaxed resize-y"
              required
            />
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t [border-color:var(--et-border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={upsertMutation.isPending}
              className="etymon-btn-ghost text-xs px-4 py-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={upsertMutation.isPending}
              className="etymon-btn-primary flex items-center gap-1.5 text-xs px-4 py-2"
            >
              {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {editingTemplate ? "Guardar Cambios" : "Publicar Plantilla"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
