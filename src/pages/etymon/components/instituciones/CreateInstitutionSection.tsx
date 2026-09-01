import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProviderFloatingInput, ProviderFloatingTextarea } from "@/components/provider/ProviderFloatingField";
import type { SubscriptionPlan } from "@/hooks/school/types";
import { ColorInput } from "./ColorInput";
import { BrandPreview } from "./BrandPreview";
import {
  CreateInstitutionForm,
  FontFamilyValue,
  VisualStyleValue,
  billingStatuses,
  brandPresets,
  fontFamilyOptions,
  subscriptionStatuses,
  visualStyleOptions,
} from "./types";

interface CreateInstitutionSectionProps {
  createForm: CreateInstitutionForm;
  setCreateForm: React.Dispatch<React.SetStateAction<CreateInstitutionForm>>;
  plans?: SubscriptionPlan[];
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "cover") => void;
  applyPreset: (preset: (typeof brandPresets)[number]) => void;
}

export function CreateInstitutionSection({
  createForm,
  setCreateForm,
  plans,
  isPending,
  onSubmit,
  onFileUpload,
  applyPreset,
}: CreateInstitutionSectionProps) {
  return (
    <section className="etymon-surface p-5">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Nueva Institución</h3>
          <p className="mt-1 text-sm text-slate-500">Crea una institución con personalización visual completa desde el primer día.</p>
        </div>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
      </header>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <ProviderFloatingInput
              label="Identificador único (Slug)"
              value={createForm.slug}
              onChange={(event) => setCreateForm((current) => ({ ...current, slug: event.target.value.toLowerCase() }))}
              required
            />
          </div>
          <div className="lg:col-span-4">
            <ProviderFloatingInput
              label="Nombre de la institución"
              value={createForm.name}
              onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </div>
          <div className="lg:col-span-4">
            <ProviderFloatingInput
              label="Nombre a mostrar"
              value={createForm.display_name}
              onChange={(event) => setCreateForm((current) => ({ ...current, display_name: event.target.value }))}
            />
          </div>

          <div className="lg:col-span-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Plan inicial</p>
            <Select
              value={createForm.planId || "none"}
              onValueChange={(value) => setCreateForm((current) => ({ ...current, planId: value === "none" ? "" : value }))}
            >
              <SelectTrigger className="etymon-input h-12 text-slate-100">
                <SelectValue placeholder="Seleccionar plan" />
              </SelectTrigger>
              <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-slate-100">
                <SelectItem value="none">Sin plan activo</SelectItem>
                {(plans ?? []).map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Estado de suscripción</p>
            <Select
              value={createForm.subscriptionStatus}
              onValueChange={(value) => setCreateForm((current) => ({ ...current, subscriptionStatus: value }))}
            >
              <SelectTrigger className="etymon-input h-12 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-slate-100">
                {subscriptionStatuses.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Estado de cobro</p>
            <Select
              value={createForm.billingStatus}
              onValueChange={(value) => setCreateForm((current) => ({ ...current, billingStatus: value }))}
            >
              <SelectTrigger className="etymon-input h-12 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-slate-100">
                {billingStatuses.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-3 flex items-end">
            <Button type="submit" disabled={isPending} className="etymon-btn-primary h-12 w-full">
              Crear institución
            </Button>
          </div>

          <div className="lg:col-span-12">
            <ProviderFloatingTextarea
              label="Notas operativas"
              value={createForm.notes}
              onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="etymon-surface-soft p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Brand Kit Inicial</h4>
              <div className="flex flex-wrap gap-2">
                {brandPresets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-full border border-[var(--et-border)] px-2 py-0.5 text-[10px] text-slate-400 transition-colors hover:text-slate-200"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Logo (Escudo)</p>
                <div className="flex flex-col gap-2">
                  <ProviderFloatingInput
                    label="URL (o sube archivo abajo)"
                    value={createForm.logo_url}
                    onChange={(event) => setCreateForm((current) => ({ ...current, logo_url: event.target.value }))}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="text-xs text-slate-400 file:mr-2 file:rounded-full file:border-0 file:bg-[var(--et-accent-soft)] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[var(--et-accent)] hover:file:bg-[var(--et-accent)] hover:file:text-white"
                    onChange={(e) => onFileUpload(e, "logo")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Portada</p>
                <div className="flex flex-col gap-2">
                  <ProviderFloatingInput
                    label="URL (o sube archivo abajo)"
                    value={createForm.cover_image_url}
                    onChange={(event) => setCreateForm((current) => ({ ...current, cover_image_url: event.target.value }))}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="text-xs text-slate-400 file:mr-2 file:rounded-full file:border-0 file:bg-[var(--et-accent-soft)] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[var(--et-accent)] hover:file:bg-[var(--et-accent)] hover:file:text-white"
                    onChange={(e) => onFileUpload(e, "cover")}
                  />
                </div>
              </div>

              <ColorInput
                label="Color primario"
                value={createForm.primary_color}
                onChange={(value) => setCreateForm((current) => ({ ...current, primary_color: value }))}
              />
              <ColorInput
                label="Color secundario"
                value={createForm.secondary_color}
                onChange={(value) => setCreateForm((current) => ({ ...current, secondary_color: value }))}
              />
              <ColorInput
                label="Color acento"
                value={createForm.accent_color}
                onChange={(value) => setCreateForm((current) => ({ ...current, accent_color: value }))}
              />

              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Tipografía</p>
                  <Select
                    value={createForm.font_family}
                    onValueChange={(value) => setCreateForm((current) => ({ ...current, font_family: value as FontFamilyValue }))}
                  >
                    <SelectTrigger className="etymon-input h-11 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-slate-100">
                      {fontFamilyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Estilo visual</p>
                  <Select
                    value={createForm.visual_style}
                    onValueChange={(value) => setCreateForm((current) => ({ ...current, visual_style: value as VisualStyleValue }))}
                  >
                    <SelectTrigger className="etymon-input h-11 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-slate-100">
                      {visualStyleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <BrandPreview title="Nueva Institución" branding={createForm} />
        </section>
      </form>
    </section>
  );
}
