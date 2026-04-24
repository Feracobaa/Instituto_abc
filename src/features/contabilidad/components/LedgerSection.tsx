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
import { PaginatedTable } from "@/components/ui/PaginatedTable";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { FileText, TrendingUp, TrendingDown, ClipboardList, Trash2, Plus, FileSpreadsheet, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAccountingLedger, useCreateFinancialTransaction, useAccountingTeachers, useInventoryItems } from "@/hooks/useSchoolData";
import { normalizeLegacyAmount, monthLabel } from "@/features/contabilidad/utils";
import { exportToCSV, exportToPDF } from "@/features/contabilidad/exportUtils";
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

  const [isSheetOpen, setIsSheetOpen] = useState(false);

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

    setIsSheetOpen(false);
  };

  return (
    <TabsContent value="movimientos" className="space-y-4 outline-none">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-background">{formatCurrency(monthTotals.income)} ingresos</Badge>
          <Badge variant="outline" className="bg-background">{formatCurrency(monthTotals.expenses)} egresos</Badge>
        </div>
        {isContable && (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Registrar Movimiento
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto border-l sm:rounded-l-2xl shadow-card">
              <SheetHeader className="mb-5 text-left">
                <SheetTitle className="flex items-center gap-2 font-heading">
                  <FileText className="h-4 w-4 text-primary" />
                  Nuevo movimiento
                </SheetTitle>
                <SheetDescription>
                  Registra un nuevo ingreso o egreso en el libro mayor.
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleTransactionSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select
                    value={transactionForm.movementType}
                    onValueChange={(val) => {
                      const nextType = val as FinancialTransaction["movement_type"];
                      const nextCategory = nextType === "income"
                        ? incomeCategories[0].value
                        : expenseCategories[0].value;
                      setTransactionForm((current) => ({
                        ...current,
                        movementType: nextType,
                        category: nextCategory,
                      }));
                    }}
                    disabled={!isContable}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Ingreso</SelectItem>
                      <SelectItem value="expense">Egreso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select
                    value={transactionForm.category}
                    onValueChange={(val) =>
                      setTransactionForm((current) => ({
                        ...current,
                        category: val as FinancialTransaction["category"],
                      }))
                    }
                    disabled={!isContable}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(transactionForm.category === "teacher_payment" || transactionForm.category === "suplent_payment") && (
                  <div className="space-y-1.5">
                    <Label>Docente</Label>
                    <SearchableSelect
                      value={transactionForm.teacherId}
                      onValueChange={(val) =>
                        setTransactionForm((current) => ({ ...current, teacherId: val }))
                      }
                      options={(teachers ?? []).map((teacher) => ({
                        value: teacher.id,
                        label: teacher.full_name,
                      }))}
                      placeholder="Busca un docente..."
                      searchPlaceholder="Escribe un nombre..."
                      emptyMessage="Ningun docente coincide."
                      disabled={!isContable}
                    />
                  </div>
                )}
                {transactionForm.category === "inventory_purchase" && (
                  <div className="space-y-1.5">
                    <Label>Item de inventario (opcional)</Label>
                    <SearchableSelect
                      value={transactionForm.inventoryItemId}
                      onValueChange={(val) =>
                        setTransactionForm((current) => ({ ...current, inventoryItemId: val }))
                      }
                      options={[
                        { value: "", label: "Sin vincular" },
                        ...(inventoryItems ?? []).map((item) => ({
                          value: item.id,
                          label: item.name,
                        })),
                      ]}
                      placeholder="Vincula un item..."
                      searchPlaceholder="Busca un item..."
                      emptyMessage="Ningun item coincide."
                      disabled={!isContable}
                    />
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
            </SheetContent>
          </Sheet>
        )}
      </div>
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
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
                  <div className="flex gap-1 ml-auto">
                    <Button
                      variant="outline"
                      size="xs"
                      className="h-7 text-[10px] gap-1"
                      onClick={() => {
                        const entries = (ledger ?? []).filter((e) => e.movement_type === "income");
                        exportToCSV({
                          title: `Ingresos - ${monthLabel(selectedMonth)}`,
                          filename: `Ingresos_${selectedMonth}`,
                          columns: [
                            { header: "Categoria", accessor: (e) => categoryLabels[e.category_label] ?? e.category_label },
                            { header: "Detalle", accessor: (e) => e.description || "" },
                            { header: "Fecha", accessor: (e) => e.transaction_date },
                            { header: "Monto", accessor: (e) => e.amount },
                          ],
                          data: entries,
                        });
                      }}
                    >
                      <FileSpreadsheet className="h-3 w-3" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      className="h-7 text-[10px] gap-1"
                      onClick={() => {
                        const entries = (ledger ?? []).filter((e) => e.movement_type === "income");
                        exportToPDF({
                          title: "Reporte de Ingresos",
                          subtitle: `Periodo: ${monthLabel(selectedMonth)}`,
                          filename: `Ingresos_${selectedMonth}`,
                          columns: [
                            { header: "Categoria", accessor: (e) => categoryLabels[e.category_label] ?? e.category_label },
                            { header: "Detalle", accessor: (e) => e.description || "" },
                            { header: "Fecha", accessor: (e) => e.transaction_date },
                            { header: "Monto", accessor: (e) => formatCurrency(e.amount) },
                          ],
                          data: entries,
                        });
                      }}
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </Button>
                  </div>
                </div>
              </div>
              <PaginatedTable
                data={(ledger ?? []).filter((e) => e.movement_type === "income")}
                getRowKey={(entry) => entry.movement_id}
                searchFn={(entry) =>
                  `${categoryLabels[entry.category_label] ?? entry.category_label} ${entry.description ?? ""}`
                }
                searchPlaceholder="Buscar ingreso..."
                pageSize={8}
                emptyMessage="No hay ingresos registrados en este mes."
                emptyIcon={TrendingUp}
                columns={[
                  {
                    key: "category",
                    header: "Categoria",
                    headerClassName: "whitespace-nowrap",
                    cellClassName: "whitespace-nowrap font-medium",
                    render: (entry) => categoryLabels[entry.category_label] ?? entry.category_label,
                  },
                  {
                    key: "description",
                    header: "Detalle",
                    cellClassName: "text-muted-foreground",
                    render: (entry) => entry.description || "Sin descripcion",
                  },
                  {
                    key: "date",
                    header: "Fecha",
                    headerClassName: "whitespace-nowrap",
                    cellClassName: "whitespace-nowrap",
                    render: (entry) => entry.transaction_date,
                  },
                  {
                    key: "amount",
                    header: "Monto",
                    headerClassName: "whitespace-nowrap text-right",
                    cellClassName: "whitespace-nowrap text-right",
                    render: (entry) => (
                      <span className="font-semibold text-success">
                        {formatCurrency(entry.amount)}
                      </span>
                    ),
                  },
                  ...(isContable
                    ? [
                        {
                          key: "action",
                          header: "Accion",
                          headerClassName: "text-right",
                          cellClassName: "text-right",
                          render: (entry: any) => (
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
                          ),
                        },
                      ]
                    : []),
                ]}
              />
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
                  <div className="flex gap-1 ml-auto">
                    <Button
                      variant="outline"
                      size="xs"
                      className="h-7 text-[10px] gap-1"
                      onClick={() => {
                        const entries = (ledger ?? []).filter((e) => e.movement_type === "expense");
                        exportToCSV({
                          title: `Egresos - ${monthLabel(selectedMonth)}`,
                          filename: `Egresos_${selectedMonth}`,
                          columns: [
                            { header: "Categoria", accessor: (e) => categoryLabels[e.category_label] ?? e.category_label },
                            { header: "Detalle", accessor: (e) => e.description || "" },
                            { header: "Fecha", accessor: (e) => e.transaction_date },
                            { header: "Monto", accessor: (e) => e.amount },
                          ],
                          data: entries,
                        });
                      }}
                    >
                      <FileSpreadsheet className="h-3 w-3" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      className="h-7 text-[10px] gap-1"
                      onClick={() => {
                        const entries = (ledger ?? []).filter((e) => e.movement_type === "expense");
                        exportToPDF({
                          title: "Reporte de Egresos",
                          subtitle: `Periodo: ${monthLabel(selectedMonth)}`,
                          filename: `Egresos_${selectedMonth}`,
                          columns: [
                            { header: "Categoria", accessor: (e) => categoryLabels[e.category_label] ?? e.category_label },
                            { header: "Detalle", accessor: (e) => e.description || "" },
                            { header: "Fecha", accessor: (e) => e.transaction_date },
                            { header: "Monto", accessor: (e) => formatCurrency(e.amount) },
                          ],
                          data: entries,
                        });
                      }}
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </Button>
                  </div>
                </div>
              </div>
              <PaginatedTable
                data={(ledger ?? []).filter((e) => e.movement_type === "expense")}
                getRowKey={(entry) => entry.movement_id}
                searchFn={(entry) =>
                  `${categoryLabels[entry.category_label] ?? entry.category_label} ${entry.description ?? ""}`
                }
                searchPlaceholder="Buscar egreso..."
                pageSize={8}
                emptyMessage="No hay egresos registrados en este mes."
                emptyIcon={TrendingDown}
                columns={[
                  {
                    key: "category",
                    header: "Categoria",
                    headerClassName: "whitespace-nowrap",
                    cellClassName: "whitespace-nowrap font-medium",
                    render: (entry) => categoryLabels[entry.category_label] ?? entry.category_label,
                  },
                  {
                    key: "description",
                    header: "Detalle",
                    cellClassName: "text-muted-foreground",
                    render: (entry) => entry.description || "Sin descripcion",
                  },
                  {
                    key: "date",
                    header: "Fecha",
                    headerClassName: "whitespace-nowrap",
                    cellClassName: "whitespace-nowrap",
                    render: (entry) => entry.transaction_date,
                  },
                  {
                    key: "amount",
                    header: "Monto",
                    headerClassName: "whitespace-nowrap text-right",
                    cellClassName: "whitespace-nowrap text-right",
                    render: (entry) => (
                      <span className="font-semibold text-destructive">
                        {formatCurrency(entry.amount)}
                      </span>
                    ),
                  },
                  ...(isContable
                    ? [
                        {
                          key: "action",
                          header: "Accion",
                          headerClassName: "text-right",
                          cellClassName: "text-right",
                          render: (entry: any) => (
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
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            </Card>
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
