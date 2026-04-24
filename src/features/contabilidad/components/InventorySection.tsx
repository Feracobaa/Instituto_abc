import { useState, useMemo } from "react";
import {
  Card,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, ClipboardList, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useInventoryItems, useCreateInventoryItem } from "@/hooks/useSchoolData";
import { parseMoneyInput, formatMoneyInput, formatCurrency, todayIso } from "@/features/accounting/utils";
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
  };

  return (
    <AccordionItem value="inventario" className="overflow-hidden rounded-xl border bg-card shadow-card">
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="flex w-full items-center justify-between gap-3 pr-2 text-left">
          <div>
            <p className="text-sm font-semibold text-foreground">Inventario</p>
            <p className="text-xs text-muted-foreground">Compras, financiacion y deuda pendiente</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{inventoryItems?.length ?? 0} items</Badge>
            <Badge variant="outline">{financedInventory.length} financiados</Badge>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 px-4 pb-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_390px]">
          <Card className="p-5 shadow-card xl:order-2 xl:sticky xl:top-24 xl:self-start">
            <div className="mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <h3 className="font-heading font-bold text-foreground">Nuevo item</h3>
            </div>
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
                <select
                  value={inventoryForm.paymentMode}
                  onChange={(event) => {
                    const nextMode = event.target.value as InventoryItem["payment_mode"];
                    setInventoryForm((current) => ({
                      ...current,
                      paymentMode: nextMode,
                      outstandingDebt: nextMode === "paid" ? "0" : current.outstandingDebt,
                    }));
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={!isContable}
                >
                  <option value="paid">Pagado</option>
                  <option value="financed">Financiado</option>
                </select>
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
          </Card>

          <Card className="p-5 shadow-card xl:order-1">
            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-bold text-foreground">Inventario</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{inventoryItems?.length ?? 0} items</Badge>
                <Badge variant="outline">{financedInventory.length} financiados</Badge>
              </div>
            </div>
            {(inventoryItems ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay inventario registrado.</p>
            ) : (
              <div className="max-h-[560px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="whitespace-nowrap">Fecha</TableHead>
                      <TableHead className="whitespace-nowrap">Modo</TableHead>
                      <TableHead className="whitespace-nowrap">Costo</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Pendiente</TableHead>
                      {isContable && <TableHead className="text-right">Accion</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryItems?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="whitespace-nowrap">{item.acquisition_date}</TableCell>
                        <TableCell className="whitespace-nowrap">{item.payment_mode === "financed" ? "Financiado" : "Pagado"}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatCurrency(item.total_cost)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          {formatCurrency(item.outstanding_debt)}
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
                                  kind: "inventory_item",
                                  id: item.id,
                                  title: "Eliminar item de inventario",
                                  description: `Se eliminara "${item.name}" del inventario.`,
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
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Saldo pendiente financiado: {formatCurrency(inventoryOutstanding)}
            </p>
          </Card>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
