import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatMoneyInput, parseMoneyInput, toSchoolMonthInput } from "@/features/contabilidad/utils";
import { SCHOOL_MONTH_START, SCHOOL_MONTH_END } from "@/features/contabilidad/constants";

interface TuitionBulkAssignFormProps {
  bulkForm: {
    monthlyTuition: string;
    chargeStartMonth: string;
    chargeEndMonth: string;
    overwrite: boolean;
  };
  setBulkForm: React.Dispatch<
    React.SetStateAction<{
      monthlyTuition: string;
      chargeStartMonth: string;
      chargeEndMonth: string;
      overwrite: boolean;
    }>
  >;
  selectedYear: number;
  isContable: boolean;
  isPending: boolean;
  onBulkSubmit: (event: React.FormEvent) => void;
}

export function TuitionBulkAssignForm({
  bulkForm,
  setBulkForm,
  selectedYear,
  isContable,
  isPending,
  onBulkSubmit,
}: TuitionBulkAssignFormProps) {
  return (
    <form onSubmit={onBulkSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Valor mensual</Label>
        <Input
          type="text"
          inputMode="numeric"
          value={bulkForm.monthlyTuition}
          onChange={(event) =>
            setBulkForm((current) => ({
              ...current,
              monthlyTuition: formatMoneyInput(event.target.value),
            }))
          }
          disabled={!isContable}
          placeholder="Ej: 120.000"
        />
        <p className="text-xs text-muted-foreground">
          Valor digitado: {formatCurrency(parseMoneyInput(bulkForm.monthlyTuition))}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Mes inicio</Label>
        <Input
          type="month"
          value={bulkForm.chargeStartMonth}
          onChange={(event) =>
            setBulkForm((current) => ({ ...current, chargeStartMonth: event.target.value }))
          }
          min={toSchoolMonthInput(selectedYear, SCHOOL_MONTH_START)}
          max={toSchoolMonthInput(selectedYear, SCHOOL_MONTH_END)}
          disabled={!isContable}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Mes fin (opcional)</Label>
        <Input
          type="month"
          value={bulkForm.chargeEndMonth}
          onChange={(event) =>
            setBulkForm((current) => ({ ...current, chargeEndMonth: event.target.value }))
          }
          min={toSchoolMonthInput(selectedYear, SCHOOL_MONTH_START)}
          max={toSchoolMonthInput(selectedYear, SCHOOL_MONTH_END)}
          disabled={!isContable}
        />
      </div>
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="flex items-start gap-2">
          <Checkbox
            id="bulk-overwrite"
            checked={bulkForm.overwrite}
            onCheckedChange={(checked) =>
              setBulkForm((current) => ({ ...current, overwrite: Boolean(checked) }))
            }
            disabled={!isContable}
          />
          <div className="space-y-1">
            <Label htmlFor="bulk-overwrite" className="text-sm">
              Actualizar perfiles existentes
            </Label>
            <p className="text-xs text-muted-foreground">
              Usalo solo si quieres cambiar el valor o las fechas para todos.
            </p>
          </div>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={!isContable || isPending}>
        Asignar a todos los estudiantes
      </Button>
    </form>
  );
}
