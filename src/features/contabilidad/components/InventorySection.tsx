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
import { Package, ClipboardList, Trash2, Plus, FileSpreadsheet, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useInventoryItems, useCreateInventoryItem } from "@/hooks/useSchoolData";
import { parseMoneyInput, formatMoneyInput, formatCurrency, todayIso } from "@/features/contabilidad/utils";
import { exportToCSV, exportToPDF } from "@/features/contabilidad/exportUtils";
import type { InventoryItem } from "@/hooks/school/types";
import { ContabilidadSectionProps } from "../types";

export function InventorySection({ isContable, openDeleteDialog }: ContabilidadSectionProps) {
  const { toast } = useToast();
  const { data: inventoryItems } = useInventoryItems();
  const createInventoryItem = useCreateInventoryItem();

  const [inventoryForm, setInventoryForm] = useState({
    name: "",
    acquisitionDate: todayIso(),
    totalCost: "",
    paymentMode: "paid" as InventoryItem["payment_mode"],
    outstandingDebt: "0",
    notes: "",
  });

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const financedInventory = useMemo(() => {
    return (inventoryItems ?? []).filter((item) => item.payment_mode === "financed");
  }, [inventoryItems]);

  const inventoryOutstanding = useMemo(() => {
    return financedInventory.reduce((sum, item) => sum + item.outstanding_debt, 0);
  }, [financedInventory]);

  const handleInventorySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const totalCost = parseMoneyInput(inventoryForm.totalCost);
    if (!inventoryForm.name.trim() || totalCost <= 0) {
      toast({
        title: "Datos incompletos",
        description: "Ingresa nombre y costo del item.",
        variant: "destructive",
      });
      return;
    }

    const outstandingDebt = parseMoneyInput(inventoryForm.outstandingDebt);

    if (
      inventoryForm.paymentMode === "financed" &&
      (outstandingDebt <= 0 || outstandingDebt > totalCost)
    ) {
      toast({
        title: "Deuda invalida",
        description: "La deuda financiada debe ser mayor a cero y no superar el costo total.",
        variant: "destructive",
      });
      return;
    }

    await createInventoryItem.mutateAsync({
      name: inventoryForm.name.trim(),
      description: null,
      acquisition_date: inventoryForm.acquisitionDate,
      total_cost: totalCost,
      payment_mode: inventoryForm.paymentMode,
      outstanding_debt: inventoryForm.paymentMode === "financed" ? outstandingDebt : 0,
      notes: inventoryForm.notes || null,
    });

    setInventoryForm({
      name: "",
      acquisitionDate: todayIso(),
      totalCost: "",
      paymentMode: "paid",
      outstandingDebt: "0",
      notes: "",
    });

    setIsSheetOpen(false);
  };

  return (
    <TabsContent value="inventario" className="space-y-4 outline-none">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-background">{inventoryItems?.length ?? 0} items</Badge>
          <Badge variant="outline" className="bg-background">{financedInventory.length} financiados</Badge>
        </div>
        {isContable && (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Registrar Item
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto border-l sm:rounded-l-2xl shadow-card">
              <SheetHeader className="mb-5 text-left">
                <SheetTitle className="flex items-center gap-2 font-heading">
                  <Package className="h-4 w-4 text-primary" />
                  Nuevo item
                </SheetTitle>
                <SheetDescription>
                  Registra un nuevo item en el inventario de la institucion.
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleInventorySubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nombre</Label>
                  <Input
                    value={inventoryForm.name}
                    onChange={(event) =>
                      setInventoryForm((current) => ({ ...current, name: event.target.value }))
                    }
                    disabled={!isContable}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Costo total</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={inventoryForm.totalCost}
                    onChange={(event) =>
                      setInventoryForm((current) => ({
                        ...current,
                        totalCost: formatMoneyInput(event.target.value),
                      }))
                    }
                    disabled={!isContable}
                    placeholder="Ej: 1.250.000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor digitado: {formatCurrency(parseMoneyInput(inventoryForm.totalCost))}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Forma de pago</Label>
                  <Select
                    value={inventoryForm.paymentMode}
                    onValueChange={(val) => {
                      const nextMode = val as InventoryItem["payment_mode"];
                      setInventoryForm((current) => ({
                        ...current,
                        paymentMode: nextMode,
                        outstandingDebt: nextMode === "paid" ? "0" : current.outstandingDebt,
                      }));
                    }}
                    disabled={!isContable}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Pagado</SelectItem>
                      <SelectItem value="financed">Financiado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Deuda pendiente</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={inventoryForm.outstandingDebt}
                    onChange={(event) =>
                      setInventoryForm((current) => ({
                        ...current,
                        outstandingDebt: formatMoneyInput(event.target.value),
                      }))
                    }
                    disabled={!isContable || inventoryForm.paymentMode === "paid"}
                    placeholder="Ej: 300.000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor digitado: {formatCurrency(parseMoneyInput(inventoryForm.outstandingDebt))}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha de compra</Label>
                  <Input
                    type="date"
                    value={inventoryForm.acquisitionDate}
                    onChange={(event) =>
                      setInventoryForm((current) => ({ ...current, acquisitionDate: event.target.value }))
                    }
                    disabled={!isContable}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Notas</Label>
                  <Textarea
                    value={inventoryForm.notes}
                    onChange={(event) =>
                      setInventoryForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    disabled={!isContable}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={!isContable || createInventoryItem.isPending}>
                  Registrar item
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        )}
      </div>
      <div className="space-y-4">
          <Card className="p-5 shadow-card">
            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-bold text-foreground">Inventario</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{inventoryItems?.length ?? 0} items</Badge>
                  <Badge variant="outline">{financedInventory.length} financiados</Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="xs"
                    className="h-7 text-[10px] gap-1"
                    onClick={() => {
                      exportToCSV({
                        title: "Inventario Institucional",
                        filename: "Inventario",
                        columns: [
                          { header: "Item", accessor: (i) => i.name },
                          { header: "Fecha", accessor: (i) => i.acquisition_date },
                          { header: "Modo", accessor: (i) => i.payment_mode === "financed" ? "Financiado" : "Pagado" },
                          { header: "Costo Total", accessor: (i) => i.total_cost },
                          { header: "Deuda Pendiente", accessor: (i) => i.outstanding_debt },
                        ],
                        data: inventoryItems ?? [],
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
                      exportToPDF({
                        title: "Inventario de la Institución",
                        filename: "Inventario",
                        columns: [
                          { header: "Item", accessor: (i) => i.name },
                          { header: "Fecha", accessor: (i) => i.acquisition_date },
                          { header: "Modo", accessor: (i) => i.payment_mode === "financed" ? "Financiado" : "Pagado" },
                          { header: "Costo Total", accessor: (i) => formatCurrency(i.total_cost) },
                          { header: "Deuda Pendiente", accessor: (i) => formatCurrency(i.outstanding_debt) },
                        ],
                        data: inventoryItems ?? [],
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
              data={inventoryItems ?? []}
              getRowKey={(item) => item.id}
              searchFn={(item) => item.name}
              searchPlaceholder="Buscar item..."
              pageSize={10}
              emptyMessage="No hay inventario registrado."
              emptyIcon={Package}
              filterOptions={[
                { value: "paid", label: "Pagados" },
                { value: "financed", label: "Financiados" },
              ]}
              filterFn={(item, filterValue) => item.payment_mode === filterValue}
              columns={[
                {
                  key: "name",
                  header: "Item",
                  cellClassName: "font-medium",
                  render: (item) => item.name,
                },
                {
                  key: "date",
                  header: "Fecha",
                  headerClassName: "whitespace-nowrap",
                  cellClassName: "whitespace-nowrap",
                  render: (item) => item.acquisition_date,
                },
                {
                  key: "mode",
                  header: "Modo",
                  headerClassName: "whitespace-nowrap",
                  cellClassName: "whitespace-nowrap",
                  render: (item) => item.payment_mode === "financed" ? "Financiado" : "Pagado",
                },
                {
                  key: "cost",
                  header: "Costo",
                  headerClassName: "whitespace-nowrap",
                  cellClassName: "whitespace-nowrap",
                  render: (item) => formatCurrency(item.total_cost),
                },
                {
                  key: "outstanding",
                  header: "Pendiente",
                  headerClassName: "whitespace-nowrap text-right",
                  cellClassName: "whitespace-nowrap text-right",
                  render: (item) => formatCurrency(item.outstanding_debt),
                },
                ...(isContable
                  ? [
                      {
                        key: "action",
                        header: "Accion",
                        headerClassName: "text-right",
                        cellClassName: "text-right",
                        render: (item: any) => (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              openDeleteDialog({
                                kind: "inventory_item",
                                id: item.id,
                                title: "Eliminar item de inventario",
                                description: `Se eliminara "${item.name}" del inventario.`,
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
            <p className="mt-3 text-xs text-muted-foreground">
              Saldo pendiente financiado: {formatCurrency(inventoryOutstanding)}
            </p>
          </Card>
        </div>
    </TabsContent>
  );
}
