import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { FileText, Plus } from "lucide-react";
import { formatCurrency, formatMoneyInput, parseMoneyInput } from "@/features/contabilidad/utils";
import { incomeCategories, expenseCategories } from "@/features/contabilidad/constants";
import type { FinancialTransaction, InventoryItem, Teacher } from "@/hooks/school/types";

interface LedgerCreateTransactionSheetProps {
  isSheetOpen: boolean;
  setIsSheetOpen: (open: boolean) => void;
  transactionForm: {
    movementType: FinancialTransaction["movement_type"];
    category: FinancialTransaction["category"];
    amount: string;
    transactionDate: string;
    description: string;
    teacherId: string;
    inventoryItemId: string;
  };
  setTransactionForm: React.Dispatch<
    React.SetStateAction<{
      movementType: FinancialTransaction["movement_type"];
      category: FinancialTransaction["category"];
      amount: string;
      transactionDate: string;
      description: string;
      teacherId: string;
      inventoryItemId: string;
    }>
  >;
  teachers?: Array<{ id: string; full_name: string; is_active?: boolean | null }>;
  inventoryItems?: InventoryItem[];
  isContable: boolean;
  isPending: boolean;
  onSubmit: (event: React.FormEvent) => void;
}

export function LedgerCreateTransactionSheet({
  isSheetOpen,
  setIsSheetOpen,
  transactionForm,
  setTransactionForm,
  teachers,
  inventoryItems,
  isContable,
  isPending,
  onSubmit,
}: LedgerCreateTransactionSheetProps) {
  const availableCategories = transactionForm.movementType === "income"
    ? incomeCategories
    : expenseCategories;

  return (
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
        <form onSubmit={onSubmit} className="space-y-4">
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
          <Button type="submit" className="w-full" disabled={!isContable || isPending}>
            Registrar movimiento
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
