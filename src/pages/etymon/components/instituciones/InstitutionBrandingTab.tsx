import React from "react";
import { Loader2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProviderFloatingInput } from "@/components/provider/ProviderFloatingField";
import { ColorInput } from "./ColorInput";
import { BrandPreview } from "./BrandPreview";
import {
  BrandingFormState,
  FontFamilyValue,
  VisualStyleValue,
  brandPresets,
  fontFamilyOptions,
  visualStyleOptions,
} from "./types";

interface InstitutionBrandingTabProps {
  brandingForm: BrandingFormState;
  setBrandingForm: React.Dispatch<React.SetStateAction<BrandingFormState>>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "cover") => void;
  isUploadingLogo: boolean;
  isUploadingCover: boolean;
  applyPreset: (preset: (typeof brandPresets)[number]) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function InstitutionBrandingTab({
  brandingForm,
  setBrandingForm,
  onFileUpload,
  isUploadingLogo,
  isUploadingCover,
  applyPreset,
  onSave,
  isSaving,
}: InstitutionBrandingTabProps) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr,0.9fr]">
      <div className="etymon-surface-soft p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--et-border)] pb-3 mb-1">
          <Palette className="h-4 w-4 text-[var(--et-accent)]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--et-text-subtle)]">
            Configuración de Identidad Visual
          </h4>
        </div>
        <ProviderFloatingInput
          label="Nombre a mostrar"
          value={brandingForm.display_name}
          onChange={(event) =>
            setBrandingForm((current) => ({ ...current, display_name: event.target.value }))
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--et-text-muted)]">
              Escudo / Logotipo
            </p>
            <ProviderFloatingInput
              label="URL"
              value={brandingForm.logo_url}
              onChange={(event) =>
                setBrandingForm((current) => ({ ...current, logo_url: event.target.value }))
              }
            />
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                className="text-[10px] text-slate-400 file:mr-2 file:rounded-full file:border-0 file:bg-[var(--et-accent-soft)] file:px-2.5 file:py-1 file:text-[10px] file:font-semibold file:text-[var(--et-accent)] hover:file:bg-[var(--et-accent)] hover:file:text-white"
                onChange={(e) => onFileUpload(e, "logo")}
                disabled={isUploadingLogo}
              />
              {isUploadingLogo && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--et-text-muted)]">
              Portada de acceso
            </p>
            <ProviderFloatingInput
              label="URL"
              value={brandingForm.cover_image_url}
              onChange={(event) =>
                setBrandingForm((current) => ({ ...current, cover_image_url: event.target.value }))
              }
            />
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                className="text-[10px] text-slate-400 file:mr-2 file:rounded-full file:border-0 file:bg-[var(--et-accent-soft)] file:px-2.5 file:py-1 file:text-[10px] file:font-semibold file:text-[var(--et-accent)] hover:file:bg-[var(--et-accent)] hover:file:text-white"
                onChange={(e) => onFileUpload(e, "cover")}
                disabled={isUploadingCover}
              />
              {isUploadingCover && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ColorInput
            label="Color primario"
            value={brandingForm.primary_color}
            onChange={(value) =>
              setBrandingForm((current) => ({ ...current, primary_color: value }))
            }
          />
          <ColorInput
            label="Color secundario"
            value={brandingForm.secondary_color}
            onChange={(value) =>
              setBrandingForm((current) => ({ ...current, secondary_color: value }))
            }
          />
        </div>
        <ColorInput
          label="Color acento"
          value={brandingForm.accent_color}
          onChange={(value) =>
            setBrandingForm((current) => ({ ...current, accent_color: value }))
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--et-text-muted)]">
              Tipografía
            </p>
            <Select
              value={brandingForm.font_family}
              onValueChange={(value) =>
                setBrandingForm((current) => ({
                  ...current,
                  font_family: value as FontFamilyValue,
                }))
              }
            >
              <SelectTrigger className="etymon-input h-10 text-xs text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-xs text-slate-100">
                {fontFamilyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--et-text-muted)]">
              Estilo visual
            </p>
            <Select
              value={brandingForm.visual_style}
              onValueChange={(value) =>
                setBrandingForm((current) => ({
                  ...current,
                  visual_style: value as VisualStyleValue,
                }))
              }
            >
              <SelectTrigger className="etymon-input h-10 text-xs text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-xs text-slate-100">
                {visualStyleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2 border-t border-[var(--et-border)] pt-3 mt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--et-text-muted)]">
            Paletas preestablecidas
          </p>
          <div className="flex flex-wrap gap-2">
            {brandPresets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => applyPreset(preset)}
                className="rounded-full border border-[var(--et-border)] bg-[var(--et-chip-bg)] px-3 py-1 text-[10px] text-[var(--et-text-subtle)] transition-colors hover:text-white hover:border-[var(--et-accent)]"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <Button className="etymon-btn-primary w-full h-11" onClick={onSave} disabled={isSaving}>
          Guardar Identidad
        </Button>
      </div>

      <div className="space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--et-text-muted)] px-1">
          Identidad Activa
        </p>
        <BrandPreview title="Identidad activa" branding={brandingForm} />
      </div>
    </div>
  );
}
