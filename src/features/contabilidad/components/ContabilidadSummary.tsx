import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calculator, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, monthLabel, clampSchoolMonth, toSchoolMonthDate } from "@/features/contabilidad/utils";
import { useTuitionMonthStatus, useAccountingLedger, useTuitionSummary } from "@/hooks/useSchoolData";

interface ContabilidadSummaryProps {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
}

export function ContabilidadSummary({ selectedMonth, setSelectedMonth }: ContabilidadSummaryProps) {
  const { data: monthStatus } = useTuitionMonthStatus(selectedMonth);
  const { data: ledger } = useAccountingLedger(selectedMonth);
  const { data: tuitionSummary } = useTuitionSummary();

  const monthTotals = useMemo(() => {
    const tuitionIncome = (monthStatus ?? []).reduce((sum, row) => sum + row.paid_amount, 0);
    const income = (ledger ?? [])
      .filter((entry) => entry.movement_type === "income")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const expenses = (ledger ?? [])
      .filter((entry) => entry.movement_type === "expense")
      .reduce((sum, entry) => sum + entry.amount, 0);
    return {
      tuitionIncome,
      income,
      expenses,
      balance: income - expenses,
    };
  }, [ledger, monthStatus]);

  const totalAnnualDebt = useMemo(() => {
    return (tuitionSummary ?? []).reduce((sum, row) => sum + row.total_pending, 0);
  }, [tuitionSummary]);

  const setMonthFromInput = (value: string) => {
    if (!value) return;
    const [yearString, monthStringValue] = value.split("-");
    const year = Number(yearString);
    const month = clampSchoolMonth(Number(monthStringValue));
    setSelectedMonth(toSchoolMonthDate(year, month));
  };

  const selectedMonthLabel = monthLabel(selectedMonth);

  return (
    <>
      <div className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-stretch">
        <Card className="flex-1 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-card">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Periodo activo</p>
              <p className="font-heading text-lg font-semibold text-foreground">{selectedMonthLabel}</p>
            </div>
            <Input
              type="month"
              value={selectedMonth.slice(0, 7)}
              onChange={(event) => setMonthFromInput(event.target.value)}
              className="w-full sm:w-[170px]"
            />
          </CardContent>
        </Card>
        <Card className={cn(
          "shadow-card border",
          totalAnnualDebt > 0
            ? "border-destructive/30 bg-destructive/5"
            : "border-success/30 bg-success/5",
        )}>
          <CardContent className="flex flex-col justify-center p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Deuda anual total</p>
            <p className={cn(
              "font-heading text-lg font-semibold",
              totalAnnualDebt > 0 ? "text-destructive" : "text-success",
            )}>
              {formatCurrency(totalAnnualDebt)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-card border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Pensiones cobradas</p>
              <p className="text-lg font-semibold text-primary">{formatCurrency(monthTotals.tuitionIncome)}</p>
            </div>
            <Wallet className="h-4 w-4 text-primary" />
          </CardContent>
        </Card>
        <Card className="shadow-card border-success/20 bg-success/5">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Ingresos del mes</p>
              <p className="text-lg font-semibold text-success">{formatCurrency(monthTotals.income)}</p>
            </div>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardContent>
        </Card>
        <Card className="shadow-card border-destructive/20 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Egresos del mes</p>
              <p className="text-lg font-semibold text-destructive">{formatCurrency(monthTotals.expenses)}</p>
            </div>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardContent>
        </Card>
        <Card className={cn(
          "shadow-card border",
          monthTotals.balance >= 0
            ? "border-success/20 bg-success/5"
            : "border-destructive/20 bg-destructive/5",
        )}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Balance</p>
              <p
                className={cn(
                  "text-lg font-semibold",
                  monthTotals.balance >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {formatCurrency(monthTotals.balance)}
              </p>
            </div>
            <Calculator className={cn("h-4 w-4", monthTotals.balance >= 0 ? "text-success" : "text-destructive")} />
          </CardContent>
        </Card>
      </div>
      
      {/* Banner contextual: el selector de mes afecta todas las secciones */}
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-primary">Periodo activo:</span>
        <span>{selectedMonthLabel}</span>
        <span className="mx-1 text-border">·</span>
        <span>Las secciones de Pensiones, Movimientos e Inventario reflejan el mes seleccionado arriba.</span>
      </div>
    </>
  );
}
