import { Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProviderFloatingInput } from "@/components/provider/ProviderFloatingField";
import { BrandingFormState } from "./types";

interface InstitutionGeneralTabProps {
  brandingForm: BrandingFormState;
  setBrandingForm: React.Dispatch<React.SetStateAction<BrandingFormState>>;
  onSave: () => void;
  isSaving: boolean;
}

export function InstitutionGeneralTab({
  brandingForm,
  setBrandingForm,
  onSave,
  isSaving,
}: InstitutionGeneralTabProps) {
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="etymon-surface-soft p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--et-border)] pb-3 mb-1">
          <Building className="h-4 w-4 text-[var(--et-accent)]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--et-text-subtle)]">
            Información Operativa / PDFs
          </h4>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ProviderFloatingInput
            label="Nombre Legal (opcional)"
            value={brandingForm.legal_name}
            onChange={(event) =>
              setBrandingForm((current) => ({ ...current, legal_name: event.target.value }))
            }
          />
          <ProviderFloatingInput
            label="NIT"
            value={brandingForm.nit}
            onChange={(event) =>
              setBrandingForm((current) => ({ ...current, nit: event.target.value }))
            }
          />
          <ProviderFloatingInput
            label="Dirección"
            value={brandingForm.address}
            onChange={(event) =>
              setBrandingForm((current) => ({ ...current, address: event.target.value }))
            }
          />
          <ProviderFloatingInput
            label="Teléfono"
            value={brandingForm.phone}
            onChange={(event) =>
              setBrandingForm((current) => ({ ...current, phone: event.target.value }))
            }
          />
        </div>
        <ProviderFloatingInput
          label="Nombre del Rector(a)"
          value={brandingForm.rector_name}
          onChange={(event) =>
            setBrandingForm((current) => ({ ...current, rector_name: event.target.value }))
          }
        />
        <div className="flex items-center gap-2.5 py-2 border-t border-[var(--et-border)] mt-4">
          <input
            type="checkbox"
            id="block_reports_on_debt"
            checked={brandingForm.block_reports_on_debt}
            onChange={(e) =>
              setBrandingForm((current) => ({ ...current, block_reports_on_debt: e.target.checked }))
            }
            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-[var(--et-accent)] focus:ring-[var(--et-accent)]"
          />
          <label
            htmlFor="block_reports_on_debt"
            className="text-xs font-semibold text-[var(--et-text-subtle)] cursor-pointer select-none"
          >
            Bloquear descarga de boletines por mora comercial
          </label>
        </div>
        <Button
          className="etymon-btn-primary w-full h-11"
          onClick={onSave}
          disabled={isSaving}
        >
          Guardar Datos Operativos
        </Button>
      </div>
    </div>
  );
}
