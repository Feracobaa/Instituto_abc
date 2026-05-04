import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { ConfirmActionDialog } from "@/components/ui/ConfirmActionDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDeleteFinancialTransaction,
  useDeleteInventoryItem,
  useInstitutionModuleAccess,
} from "@/hooks/useSchoolData";
import { clampSchoolMonth, toSchoolMonthDate } from "@/features/contabilidad/utils";
import type { PendingDeleteAction } from "@/features/contabilidad/types";

import { ContabilidadSummary } from "@/features/contabilidad/components/ContabilidadSummary";
import { LedgerSection } from "@/features/contabilidad/components/LedgerSection";
import { InventorySection } from "@/features/contabilidad/components/InventorySection";

export default function Contabilidad() {
  const { userRole } = useAuth();
  const { data: moduleAccess } = useInstitutionModuleAccess();
  
  const isContable = userRole === "contable";
  const isReadOnly = moduleAccess?.["contabilidad"]?.access_level === "readonly";

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const month = clampSchoolMonth(now.getMonth() + 1);
    return toSchoolMonthDate(now.getFullYear(), month);
  });

  const selectedYear = Number(selectedMonth.slice(0, 4));

  const [pendingDeleteAction, setPendingDeleteAction] = useState<PendingDeleteAction | null>(null);

  const deleteFinancialTransaction = useDeleteFinancialTransaction();
  const deleteInventoryItem = useDeleteInventoryItem();

  const isDeletePending = deleteFinancialTransaction.isPending || deleteInventoryItem.isPending;

  const handleConfirmDelete = async () => {
    if (!pendingDeleteAction || isDeletePending) return;

    if (pendingDeleteAction.kind === "financial_transaction") {
      await deleteFinancialTransaction.mutateAsync(pendingDeleteAction.id);
    }
    if (pendingDeleteAction.kind === "inventory_item") {
      await deleteInventoryItem.mutateAsync(pendingDeleteAction.id);
    }

    setPendingDeleteAction(null);
  };

  const sectionProps = {
    selectedMonth,
    selectedYear,
    isContable,
    openDeleteDialog: setPendingDeleteAction,
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Espacio de trabajo contable
              </Badge>
              {isReadOnly && <Badge variant="outline">Modo lectura</Badge>}
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">Contabilidad General</h1>
              <p className="text-sm text-muted-foreground">
                Organiza ingresos, egresos e inventario de la institucion.
              </p>
            </div>
          </div>
        </div>

        <ContabilidadSummary selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />

        <Tabs defaultValue="movimientos" className="space-y-6">
          <TabsList className="bg-muted/50 w-full sm:w-auto overflow-x-auto flex-nowrap justify-start h-auto p-1.5 border border-border">
            <TabsTrigger value="movimientos" className="px-4 py-2 text-sm">Movimientos (Libro Mayor)</TabsTrigger>
            <TabsTrigger value="inventario" className="px-4 py-2 text-sm">Inventario</TabsTrigger>
          </TabsList>
          
          <LedgerSection {...sectionProps} />
          <InventorySection {...sectionProps} />
        </Tabs>

        <ConfirmActionDialog
          open={Boolean(pendingDeleteAction)}
          onOpenChange={(open) => {
            if (!open) setPendingDeleteAction(null);
          }}
          title={pendingDeleteAction?.title ?? "Confirmar eliminacion"}
          description={pendingDeleteAction?.description ?? ""}
          actionLabel={isDeletePending ? "Eliminando..." : "Eliminar"}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </MainLayout>
  );
}
