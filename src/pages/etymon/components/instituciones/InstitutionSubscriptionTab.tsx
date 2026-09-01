import { Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProviderFloatingInput, ProviderFloatingTextarea } from "@/components/provider/ProviderFloatingField";
import type { SubscriptionPlan } from "@/hooks/school/types";
import { billingStatuses, commercialStatuses, subscriptionStatuses } from "./types";

interface InstitutionSubscriptionTabProps {
  subscriptionForm: {
    current_period_end: string;
    current_period_start: string;
    notes: string;
    plan_id: string;
    status: (typeof subscriptionStatuses)[number];
  };
  setSubscriptionForm: React.Dispatch<
    React.SetStateAction<{
      current_period_end: string;
      current_period_start: string;
      notes: string;
      plan_id: string;
      status: (typeof subscriptionStatuses)[number];
    }>
  >;
  commercialForm: {
    billing_status: (typeof billingStatuses)[number];
    commercial_status: (typeof commercialStatuses)[number];
    notes: string;
  };
  setCommercialForm: React.Dispatch<
    React.SetStateAction<{
      billing_status: (typeof billingStatuses)[number];
      commercial_status: (typeof commercialStatuses)[number];
      notes: string;
    }>
  >;
  plans?: SubscriptionPlan[];
  onSaveSubscription: () => void;
  isSavingSubscription: boolean;
  onSaveCommercial: () => void;
  isSavingCommercial: boolean;
}

export function InstitutionSubscriptionTab({
  subscriptionForm,
  setSubscriptionForm,
  commercialForm,
  setCommercialForm,
  plans,
  onSaveSubscription,
  isSavingSubscription,
  onSaveCommercial,
  isSavingCommercial,
}: InstitutionSubscriptionTabProps) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr,0.9fr]">
      {/* Subscription details */}
      <div className="etymon-surface-soft p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--et-border)] pb-3 mb-1">
          <Building className="h-4 w-4 text-[var(--et-accent)]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--et-text-subtle)]">
            Suscripción Académica
          </h4>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--et-text-muted)]">
              Plan Asociado
            </p>
            <Select
              value={subscriptionForm.plan_id || "none"}
              onValueChange={(value) =>
                setSubscriptionForm((current) => ({
                  ...current,
                  plan_id: value === "none" ? "" : value,
                }))
              }
            >
              <SelectTrigger className="etymon-input h-10 text-xs text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-xs text-slate-100">
                <SelectItem value="none">Sin plan activo</SelectItem>
                {(plans ?? []).map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--et-text-muted)]">
              Estado de Suscripción
            </p>
            <Select
              value={subscriptionForm.status}
              onValueChange={(value) =>
                setSubscriptionForm((current) => ({
                  ...current,
                  status: value as (typeof subscriptionStatuses)[number],
                }))
              }
            >
              <SelectTrigger className="etymon-input h-10 text-xs text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-xs text-slate-100">
                {subscriptionStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ProviderFloatingInput
            type="date"
            label="Inicio del ciclo"
            value={subscriptionForm.current_period_start}
            onChange={(event) =>
              setSubscriptionForm((current) => ({
                ...current,
                current_period_start: event.target.value,
              }))
            }
          />
          <ProviderFloatingInput
            type="date"
            label="Vencimiento del ciclo"
            value={subscriptionForm.current_period_end}
            onChange={(event) =>
              setSubscriptionForm((current) => ({
                ...current,
                current_period_end: event.target.value,
              }))
            }
          />
        </div>
        <ProviderFloatingTextarea
          label="Notas de suscripción interna"
          value={subscriptionForm.notes}
          onChange={(event) =>
            setSubscriptionForm((current) => ({ ...current, notes: event.target.value }))
          }
        />
        <Button
          className="etymon-btn-primary w-full h-11"
          onClick={onSaveSubscription}
          disabled={isSavingSubscription}
        >
          Guardar Suscripción
        </Button>
      </div>

      {/* Commercial Account */}
      <div className="etymon-surface-soft p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--et-border)] pb-3 mb-1">
          <Building className="h-4 w-4 text-[var(--et-accent)]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--et-text-subtle)]">
            Cuenta Comercial y Cobro
          </h4>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--et-text-muted)]">
              Estado Comercial
            </p>
            <Select
              value={commercialForm.commercial_status}
              onValueChange={(value) =>
                setCommercialForm((current) => ({
                  ...current,
                  commercial_status: value as (typeof commercialStatuses)[number],
                }))
              }
            >
              <SelectTrigger className="etymon-input h-10 text-xs text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-xs text-slate-100">
                {commercialStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--et-text-muted)]">
              Estado de Cobros
            </p>
            <Select
              value={commercialForm.billing_status}
              onValueChange={(value) =>
                setCommercialForm((current) => ({
                  ...current,
                  billing_status: value as (typeof billingStatuses)[number],
                }))
              }
            >
              <SelectTrigger className="etymon-input h-10 text-xs text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-xs text-slate-100">
                {billingStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <ProviderFloatingTextarea
          label="Notas comerciales y de cobro"
          value={commercialForm.notes}
          onChange={(event) =>
            setCommercialForm((current) => ({ ...current, notes: event.target.value }))
          }
        />
        <Button
          className="etymon-btn-outline w-full h-11"
          onClick={onSaveCommercial}
          disabled={isSavingCommercial}
        >
          Guardar Datos Comerciales
        </Button>
      </div>
    </div>
  );
}
