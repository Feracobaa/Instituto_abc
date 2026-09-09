import { useState } from "react";
import {
  Shield,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Plus,
  Copy,
  Download,
  Edit3,
  Search,
  Check,
} from "lucide-react";
import type { PlatformLegalTemplate } from "@/features/contracts/types";
import { toast } from "@/components/ui/sonner";
import { CreateOrUploadTemplateModal } from "./CreateOrUploadTemplateModal";

interface LegalTemplatesSectionProps {
  templates: PlatformLegalTemplate[];
}

export function LegalTemplatesSection({ templates }: LegalTemplatesSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PlatformLegalTemplate | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = (t: PlatformLegalTemplate) => {
    navigator.clipboard.writeText(t.content_markdown);
    setCopiedId(t.id);
    toast.success(`Plantilla "${t.name}" copiada al portapapeles.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (t: PlatformLegalTemplate) => {
    const blob = new Blob([t.content_markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${t.code}_v${t.version}.md`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Archivo ${t.code}.md descargado.`);
  };

  const handleEdit = (t: PlatformLegalTemplate) => {
    setEditingTemplate(t);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="etymon-surface p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--et-text)]">
                Catálogo de Plantillas Legales y Regulatorias
              </h3>
              <p className="text-[11px] text-[var(--et-text-subtle)]">
                {templates.length} plantillas maestras disponibles para emisión de contratos SaaS y DPA
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--et-text-muted)]" />
            <input
              type="text"
              placeholder="Buscar plantilla..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="etymon-input pl-8 text-xs py-1.5 w-48"
            />
          </div>

          <button
            onClick={handleCreateNew}
            className="etymon-btn-primary flex items-center gap-1.5 text-xs px-3.5 py-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Crear o Subir Plantilla
          </button>
        </div>
      </div>

      {/* Templates List */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.length === 0 ? (
          <div className="etymon-surface p-12 text-center text-xs text-[var(--et-text-muted)]">
            No se encontraron plantillas. Pulsa "Crear o Subir Plantilla" para agregar una nueva.
          </div>
        ) : (
          filtered.map((tpl) => {
            const isExpanded = expandedId === tpl.id;

            return (
              <div
                key={tpl.id}
                className="etymon-surface overflow-hidden transition-all border [border-color:var(--et-border)] hover:border-cyan-500/30"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xs font-bold text-[var(--et-text)]">{tpl.name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                          v{tpl.version}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          {tpl.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--et-text-subtle)] mt-1">{tpl.description}</p>
                    </div>
                  </div>

                  {/* Actions per card */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleCopy(tpl)}
                      title="Copiar texto Markdown"
                      className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-400 hover:text-white transition-colors"
                    >
                      {copiedId === tpl.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>

                    <button
                      onClick={() => handleDownload(tpl)}
                      title="Descargar archivo .md"
                      className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-400 hover:text-white transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => handleEdit(tpl)}
                      title="Editar plantilla"
                      className="p-1.5 rounded-lg hover:bg-cyan-500/10 text-cyan-400 transition-colors"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                      className="etymon-btn-ghost flex items-center gap-1 text-[11px] py-1 px-2"
                    >
                      {isExpanded ? "Ocultar" : "Ver Cláusulas"}
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t [border-color:var(--et-border)] bg-[var(--et-chip-bg)] p-4 text-xs space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[10px] text-[var(--et-text-muted)] font-mono">
                      <span>Vista previa de cláusulas y variables</span>
                      <span>Modificado: {new Date(tpl.updated_at).toLocaleDateString("es-CO")}</span>
                    </div>

                    <div className="rounded-lg border [border-color:var(--et-border)] bg-black/50 p-4 text-[11px] leading-relaxed text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono max-h-80 select-text">
                      {tpl.content_markdown}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <CreateOrUploadTemplateModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTemplate(null);
        }}
        editingTemplate={editingTemplate}
      />
    </div>
  );
}
