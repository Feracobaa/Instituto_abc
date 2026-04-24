import { useState, useMemo } from "react";
import {
  Card,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, TrendingUp, TrendingDown, ClipboardList, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAccountingLedger, useCreateFinancialTransaction, useAccountingTeachers, useInventoryItems } from "@/hooks/useSchoolData";
import { parseMoneyInput, formatMoneyInput, formatCurrency, todayIso } from "@/features/contabilidad/utils";
import { incomeCategories, expenseCategories, categoryLabels } from "@/features/contabilidad/constants";
import { normalizeLegacyAmount } from "@/features/contabilidad/utils";
import type { FinancialTransaction } from "@/hooks/school/types";
import { ContabilidadSectionProps } from "../types";

export function LedgerSection({ selectedMonth, isContable, openDeleteDialog }: ContabilidadSectionProps) {
  const { toast } = useToast();
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

  const monthTotals = useMemo(() => {
    const income = (ledger ?? [])
      .filter((entry) => entry.movement_type === "income")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const expenses = (ledger ?? [])
      .filter((entry) => entry.movement_type === "expense")
      .reduce((sum, entry) => sum + entry.amount, 0);
    return {
      income,
      expenses,
    };
  }, [ledger]);

  const availableCategories = transactionForm.movementType === "income"
    ? incomeCategories
    : expenseCategories;

  const handleTransactionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const transactionAmount = parseMoneyInput(transactionForm.amount);
    if (transactionAmount <= 0) {
      toast({
        title: "Monto invalido",
        description: "Ingresa un monto mayor a cero.",
        variant: "destructive",
      });
      return;
    }

    if (
      (transactionForm.category === "teacher_payment" || transactionForm.category === "suplent_payment")
      && !transactionForm.teacherId
    ) {
      toast({
        title: "Docente requerido",
        description: "Selecciona el docente para este pago.",
        variant: "destructive",
      });
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
  };

  return (
    <TabsContent value="movimientos" className="space-y-4 outline-none">
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="outline" className="bg-background">{formatCurrency(monthTotals.income)} ingresos</Badge>
        <Badge variant="outline" className="bg-background">{formatCurrency(monthTotals.expenses)} egresos</Badge>
      </div>
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_390px]">
          <Card className="p-5 shadow-card xl:order-2 xl:sticky xl:top-24 xl:self-start">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-heading font-bold text-foreground">Nuevo movimiento</h3>
            </div>
            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <select
                  value={transactionForm.movementType}
                  onChange={(event) => {
                    const nextType = event.target.value as FinancialTransaction["movement_type"];
                    const nextCategory = nextType === "income"
                      ? incomeCategories[0].value
                      : expenseCategories[0].value;
                    setTransactionForm((current) => ({
                      ...current,
                      movementType: nextType,
                      category: nextCategory,
                    }));
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={!isContable}
                >
                  <option value="income">Ingreso</option>
                  <option value="expense">Egreso</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <select
                  value={transactionForm.category}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      category: event.target.value as FinancialTransaction["category"],
                    }))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={!isContable}
                >
                  {availableCategories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              {(transactionForm.category === "teacher_payment" || transactionForm.category === "suplent_payment") && (
                <div className="space-y-1.5">
                  <Label>Docente</Label>
                  <select
                    value={transactionForm.teacherId}
                    onChange={(event) =>
                      setTransactionForm((current) => ({ ...current, teacherId: event.target.value }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={!isContable}
                  >
                    <option value="">Selecciona docente</option>
                    {(teachers ?? []).map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
              {transactionForm.category === "inventory_purchase" && (
                <div className="space-y-1.5">
                  <Label>Item de inventario (opcional)</Label>
                  <select
                    value={transactionForm.inventoryItemId}
                    onChange={(event) =>
                      setTransactionForm((current) => ({ ...current, inventoryItemId: event.target.value }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={!isContable}
                  >
                    <option value="">Sin vincular</option>
                    {(inventoryItems ?? []).map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Monto</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={transactionForm.amount}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      amount: formatMoneyInput(event.target.value),
                    }))
                  }
                  disabled={!isContable}
                  placeholder="Ej: 450.000"
                />
                <p className="text-xs text-muted-foreground">
                  Valor digitado: {formatCurrency(parseMoneyInput(transactionForm.amount))}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={transactionForm.transactionDate}
                  onChange={(event) =>
                    setTransactionForm((current) => ({ ...current, transactionDate: event.target.value }))
                  }
                  disabled={!isContable}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Descripcion</Label>
                <Textarea
                  value={transactionForm.description}
                  onChange={(event) =>
                    setTransactionForm((current) => ({ ...current, description: event.target.value }))
                  }
                  disabled={!isContable}
                />
              </div>
              <Button type="submit" className="w-full" disabled={!isContable || createTransaction.isPending}>
                Registrar movimiento
              </Button>
            </form>
          </Card>

          <div className="space-y-4 xl:order-1">
            {/* Ingresos del mes */}
            <Card className="p-5 shadow-card">
              <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <h3 className="font-heading font-bold text-foreground">Ingresos del mes</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {(ledger ?? []).filter((e) => e.movement_type === "income").length} registros
                  </Badge>
                  <Badge variant="outline" className="text-success">
                    Total: {formatCurrency(monthTotals.income)}
                  </Badge>
                </div>
              </div>
              {(() => {
                const incomeEntries = (ledger ?? []).filter((e) => e.movement_type === "income");
                if (incomeEntries.length === 0) {
                  return <p className="text-sm text-muted-foreground">No hay ingresos registrados en este mes.</p>;
                }
                return (
                  <div className="max-h-[320px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Categoria</TableHead>
                          <TableHead>Detalle</TableHead>
                          <TableHead className="whitespace-nowrap">Fecha</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Monto</TableHead>
                          {isContable && <TableHead className="text-right">Accion</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incomeEntries.map((entry) => (
                          <TableRow key={entry.movement_id}>
                            <TableCell className="whitespace-nowrap font-medium">
                              {categoryLabels[entry.category_label] ?? entry.category_label}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {entry.description || "Sin descripcion"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{entry.transaction_date}</TableCell>
                            <TableCell className="whitespace-nowrap text-right">
                              <span className="font-semibold text-success">
                                {formatCurrency(entry.amount)}
                              </span>
                            </TableCell>
                            {isContable && (
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() =>
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
                                    )
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
            </Card>

            {/* Egresos del mes */}
            <Card className="p-5 shadow-card">
              <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <h3 className="font-heading font-bold text-foreground">Egresos del mes</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {(ledger ?? []).filter((e) => e.movement_type === "expense").length} registros
                  </Badge>
                  <Badge variant="outline" className="text-destructive">
                    Total: {formatCurrency(monthTotals.expenses)}
                  </Badge>
                </div>
              </div>
              {(() => {
                const expenseEntries = (ledger ?? []).filter((e) => e.movement_type === "expense");
                if (expenseEntries.length === 0) {
                  return <p className="text-sm text-muted-foreground">No hay egresos registrados en este mes.</p>;
                }
                return (
                  <div className="max-h-[320px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Categoria</TableHead>
                          <TableHead>Detalle</TableHead>
                          <TableHead className="whitespace-nowrap">Fecha</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Monto</TableHead>
                          {isContable && <TableHead className="text-right">Accion</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenseEntries.map((entry) => (
                          <TableRow key={entry.movement_id}>
                            <TableCell className="whitespace-nowrap font-medium">
                              {categoryLabels[entry.category_label] ?? entry.category_label}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {entry.description || "Sin descripcion"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{entry.transaction_date}</TableCell>
                            <TableCell className="whitespace-nowrap text-right">
                              <span className="font-semibold text-destructive">
                                {formatCurrency(entry.amount)}
                              </span>
                            </TableCell>
                            {isContable && (
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() =>
                                    openDeleteDialog({
                                      kind: "financial_transaction",
                                      id: entry.movement_id,
                                      title: "Eliminar movimiento",
                                      description: `Se eliminara el movimiento ${categoryLabels[entry.category_label] ?? entry.category_label}.`,
                                    })
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
            </Card>
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
