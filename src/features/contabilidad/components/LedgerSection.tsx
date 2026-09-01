import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { useAccountingLedger, useCreateFinancialTransaction, useAccountingTeachers, useInventoryItems } from "@/hooks/useSchoolData";
import { normalizeLegacyAmount, formatCurrency, todayIso, parseMoneyInput } from "@/features/contabilidad/utils";
import { categoryLabels } from "@/features/contabilidad/constants";
import type { FinancialTransaction, AccountingLedgerEntry } from "@/hooks/school/types";
import { ContabilidadSectionProps } from "../types";
import { LedgerCreateTransactionSheet } from "./ledger/LedgerCreateTransactionSheet";
import { LedgerMovementCard } from "./ledger/LedgerMovementCard";

export function LedgerSection({ selectedMonth, isContable, openDeleteDialog }: ContabilidadSectionProps) {
  const { data: ledger } = useAccountingLedger(selectedMonth);
  const { data: teachers } = useAccountingTeachers();
  const { data: inventoryItems } = useInventoryItems();
  const createTransaction = useCreateFinancialTransaction();

  const [transactionForm, setTransactionForm] = useState({
    movementType: "expense" as FinancialTransaction["movement_type"],
    category: "rent" as FinancialTransaction["category"],
    amount: "",
    transactionDate: todayIso(),
    description: "",
    teacherId: "",
    inventoryItemId: "",
  });

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const monthTotals = useMemo(() => {
    const income = (ledger ?? [])
      .filter((entry) => entry.movement_type === "income")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const expenses = (ledger ?? [])
      .filter((entry) => entry.movement_type === "expense")
      .reduce((sum, entry) => sum + entry.amount, 0);
    return { income, expenses };
  }, [ledger]);

  const handleTransactionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const transactionAmount = parseMoneyInput(transactionForm.amount);
    if (transactionAmount <= 0) {
      toast({ title: "Monto invalido", description: "Ingresa un monto mayor a cero.", variant: "destructive" });
      return;
    }

    if (
      (transactionForm.category === "teacher_payment" || transactionForm.category === "suplent_payment")
      && !transactionForm.teacherId
    ) {
      toast({ title: "Docente requerido", description: "Selecciona el docente para este pago.", variant: "destructive" });
      return;
    }

    await createTransaction.mutateAsync({
      movement_type: transactionForm.movementType,
      category: transactionForm.category,
      teacher_id: transactionForm.teacherId || null,
      inventory_item_id: transactionForm.inventoryItemId || null,
      period_month: selectedMonth,
      transaction_date: transactionForm.transactionDate,
      amount: transactionAmount,
      description: transactionForm.description || null,
    });

    setTransactionForm((current) => ({
      ...current,
      amount: "",
      description: "",
      teacherId: "",
      inventoryItemId: "",
    }));

    setIsSheetOpen(false);
  };

  const handleDeleteEntry = (entry: AccountingLedgerEntry) => {
    openDeleteDialog(
      entry.category_label === "tuition"
        ? {
            kind: "tuition_payment",
            id: entry.movement_id,
            title: "Eliminar pago de pension",
            description: `Se eliminara este pago de ${formatCurrency(normalizeLegacyAmount(entry.amount))}.`,
          }
        : {
            kind: "financial_transaction",
            id: entry.movement_id,
            title: "Eliminar movimiento",
            description: `Se eliminara el movimiento ${categoryLabels[entry.category_label] ?? entry.category_label}.`,
          },
    );
  };

  const incomeEntries = useMemo(() => (ledger ?? []).filter((e) => e.movement_type === "income"), [ledger]);
  const expenseEntries = useMemo(() => (ledger ?? []).filter((e) => e.movement_type === "expense"), [ledger]);

  return (
    <TabsContent value="movimientos" className="space-y-4 outline-none">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-background">{formatCurrency(monthTotals.income)} ingresos</Badge>
          <Badge variant="outline" className="bg-background">{formatCurrency(monthTotals.expenses)} egresos</Badge>
        </div>
        {isContable && (
          <LedgerCreateTransactionSheet
            isSheetOpen={isSheetOpen}
            setIsSheetOpen={setIsSheetOpen}
            transactionForm={transactionForm}
            setTransactionForm={setTransactionForm}
            teachers={teachers}
            inventoryItems={inventoryItems}
            isContable={isContable}
            isPending={createTransaction.isPending}
            onSubmit={handleTransactionSubmit}
          />
        )}
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <LedgerMovementCard
            movementType="income"
            title="Ingresos del mes"
            entries={incomeEntries}
            selectedMonth={selectedMonth}
            totalAmount={monthTotals.income}
            isContable={isContable}
            onDelete={handleDeleteEntry}
          />

          <LedgerMovementCard
            movementType="expense"
            title="Egresos del mes"
            entries={expenseEntries}
            selectedMonth={selectedMonth}
            totalAmount={monthTotals.expenses}
            isContable={isContable}
            onDelete={handleDeleteEntry}
          />
        </div>
      </div>
    </TabsContent>
  );
}
