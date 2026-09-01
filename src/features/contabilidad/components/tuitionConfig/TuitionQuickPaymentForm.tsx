import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Wallet } from "lucide-react";
import { formatCurrency, formatMoneyInput, parseMoneyInput, normalizeLegacyAmount } from "@/features/contabilidad/utils";
import type { TuitionMonthStatus, TuitionProfile } from "@/hooks/school/types";

interface StudentOption {
  id: string;
  full_name: string;
}

interface MonthOption {
  value: string;
  label: string;
}

interface TuitionQuickPaymentFormProps {
  paymentForm: {
    studentId: string;
    periodMonth: string;
    amount: string;
    paymentDate: string;
    notes: string;
  };
  setPaymentForm: React.Dispatch<
    React.SetStateAction<{
      studentId: string;
      periodMonth: string;
      amount: string;
      paymentDate: string;
      notes: string;
    }>
  >;
  studentsReadyForPayments: StudentOption[];
  schoolMonthOptions: MonthOption[];
  schoolYearStatusMap: Map<string, TuitionMonthStatus>;
  selectedPaymentProfile?: TuitionProfile;
  selectedPaymentStatus?: TuitionMonthStatus;
  selectedPaymentMonthLabel: string;
  selectedYear: number;
  isContable: boolean;
  isPending: boolean;
  onPaymentSubmit: (event: React.FormEvent) => void;
  getSuggestedPeriodMonth: (studentId: string) => string;
}

export function TuitionQuickPaymentForm({
  paymentForm,
  setPaymentForm,
  studentsReadyForPayments,
  schoolMonthOptions,
  schoolYearStatusMap,
  selectedPaymentProfile,
  selectedPaymentStatus,
  selectedPaymentMonthLabel,
  selectedYear,
  isContable,
  isPending,
  onPaymentSubmit,
  getSuggestedPeriodMonth,
}: TuitionQuickPaymentFormProps) {
  return (
    <Card className="p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <h3 className="font-heading font-bold text-foreground">Registrar pago</h3>
      </div>
      <form onSubmit={onPaymentSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Estudiante</Label>
          <SearchableSelect
            value={paymentForm.studentId}
            onValueChange={(studentId) => {
              setPaymentForm((current) => ({
                ...current,
                studentId,
                periodMonth: studentId ? getSuggestedPeriodMonth(studentId) : current.periodMonth,
              }));
            }}
            options={studentsReadyForPayments.map((student) => ({
              value: student.id,
              label: student.full_name,
            }))}
            placeholder="Busca un estudiante..."
            searchPlaceholder="Escribe un nombre..."
            emptyMessage="Ningun estudiante coincide."
            disabled={!isContable}
          />
          {studentsReadyForPayments.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Solo aparecen estudiantes con pension configurada para este periodo.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Mes que pago</Label>
          <select
            value={paymentForm.periodMonth}
            onChange={(event) =>
              setPaymentForm((current) => ({ ...current, periodMonth: event.target.value }))
            }
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={!isContable}
          >
            {schoolMonthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} {selectedYear}
              </option>
            ))}
          </select>
        </div>

        {paymentForm.studentId && (
          <div className="rounded-lg border border-dashed bg-muted/20 p-3">
            <p className="text-xs font-medium text-foreground">Control anual (febrero a noviembre)</p>
            <div className="mt-2 space-y-1 text-xs">
              {schoolMonthOptions.map((option) => {
                const row = schoolYearStatusMap.get(`${paymentForm.studentId}-${option.value}`);
                return (
                  <div key={option.value} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{option.label}</span>
                    <span className="font-medium text-foreground">
                      {row ? formatCurrency(normalizeLegacyAmount(row.paid_amount)) : formatCurrency(0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {paymentForm.studentId && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cuota ({selectedPaymentMonthLabel})</span>
              <span className="font-medium text-foreground">
                {formatCurrency(
                  selectedPaymentStatus?.expected_amount ??
                  normalizeLegacyAmount(selectedPaymentProfile?.monthly_tuition ?? 0),
                )}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted-foreground">Saldo actual</span>
              <span className="font-medium text-foreground">
                {selectedPaymentStatus
                  ? formatCurrency(selectedPaymentStatus.pending_amount)
                  : selectedPaymentProfile
                    ? formatCurrency(normalizeLegacyAmount(selectedPaymentProfile.monthly_tuition))
                    : "Sin perfil"}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Monto abonado</Label>
          <Input
            type="text"
            inputMode="numeric"
            value={paymentForm.amount}
            onChange={(event) =>
              setPaymentForm((current) => ({
                ...current,
                amount: formatMoneyInput(event.target.value),
              }))
            }
            disabled={!isContable}
            placeholder="Ej: 60.000"
          />
          <p className="text-xs text-muted-foreground">
            Valor digitado: {formatCurrency(parseMoneyInput(paymentForm.amount))}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Fecha de pago</Label>
          <Input
            type="date"
            value={paymentForm.paymentDate}
            onChange={(event) =>
              setPaymentForm((current) => ({ ...current, paymentDate: event.target.value }))
            }
            disabled={!isContable}
          />
          <p className="text-xs text-muted-foreground">
            El dia solo es informativo. Lo que cuenta en cartera es el mes pagado.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Observacion</Label>
          <Textarea
            value={paymentForm.notes}
            onChange={(event) =>
              setPaymentForm((current) => ({ ...current, notes: event.target.value }))
            }
            disabled={!isContable}
            placeholder="Ej: Abono en efectivo"
          />
        </div>

        <Button type="submit" className="w-full" disabled={!isContable || isPending}>
          Registrar pago del mes
        </Button>
      </form>
    </Card>
  );
}
