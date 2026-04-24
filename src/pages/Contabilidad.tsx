import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { ConfirmActionDialog } from "@/components/ui/ConfirmActionDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDeleteFinancialTransaction,
  useDeleteInventoryItem,
  useDeleteTuitionPayment,
  useDeleteTuitionProfile
} from "@/hooks/useSchoolData";
import { clampSchoolMonth, toSchoolMonthDate } from "@/features/accounting/utils";
import type { PendingDeleteAction } from "@/features/accounting/types";

import { ContabilidadSummary } from "@/features/contabilidad/components/ContabilidadSummary";
import { TuitionStatusSection } from "@/features/contabilidad/components/TuitionStatusSection";
import { TuitionConfigSection } from "@/features/contabilidad/components/TuitionConfigSection";
import { ReportsSection } from "@/features/contabilidad/components/ReportsSection";
import { LedgerSection } from "@/features/contabilidad/components/LedgerSection";
import { InventorySection } from "@/features/contabilidad/components/InventorySection";

export default function Contabilidad() {
  const { userRole } = useAuth();
  const isContable = userRole === "contable";
  const isReadOnly = userRole === "rector";

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const month = clampSchoolMonth(now.getMonth() + 1);
    return toSchoolMonthDate(now.getFullYear(), month);
  });

  const selectedYear = Number(selectedMonth.slice(0, 4));

  const [pendingDeleteAction, setPendingDeleteAction] = useState<PendingDeleteAction | null>(null);

  const deleteTuitionPayment = useDeleteTuitionPayment();
  const deleteFinancialTransaction = useDeleteFinancialTransaction();
  const deleteInventoryItem = useDeleteInventoryItem();
  const deleteTuitionProfile = useDeleteTuitionProfile();

  const isDeletePending = deleteTuitionPayment.isPending
    || deleteFinancialTransaction.isPending
    || deleteInventoryItem.isPending
    || deleteTuitionProfile.isPending;

  const handleConfirmDelete = async () => {
    if (!pendingDeleteAction || isDeletePending) return;

    if (pendingDeleteAction.kind === "tuition_payment") {
      await deleteTuitionPayment.mutateAsync(pendingDeleteAction.id);
    }
    if (pendingDeleteAction.kind === "financial_transaction") {
      await deleteFinancialTransaction.mutateAsync(pendingDeleteAction.id);
    }
    if (pendingDeleteAction.kind === "inventory_item") {
      await deleteInventoryItem.mutateAsync(pendingDeleteAction.id);
    }
    if (pendingDeleteAction.kind === "tuition_profile_reset") {
      await deleteTuitionProfile.mutateAsync(pendingDeleteAction.studentId);
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
              <h1 className="font-heading text-2xl font-bold text-foreground">Contabilidad</h1>
              <p className="text-sm text-muted-foreground">
                Organiza cobros, egresos e inventario desde una pantalla pensada para operar rapido.
              </p>
            </div>
          </div>
        </div>

        <ContabilidadSummary selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />

        <Accordion type="multiple" defaultValue={["estado-mes"]} className="space-y-4">
          <TuitionStatusSection {...sectionProps} />
          <TuitionConfigSection {...sectionProps} />
          <ReportsSection {...sectionProps} />
          <LedgerSection {...sectionProps} />
          <InventorySection {...sectionProps} />
        </Accordion>

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
