import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";
import { ConfirmActionDialog } from "@/components/ui/ConfirmActionDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDeleteTuitionPayment,
  useDeleteTuitionProfile,
  useInstitutionModuleAccess,
} from "@/hooks/useSchoolData";
import { clampSchoolMonth, toSchoolMonthDate } from "@/features/contabilidad/utils";
import type { PendingDeleteAction } from "@/features/contabilidad/types";

import { ContabilidadSummary } from "@/features/contabilidad/components/ContabilidadSummary";
import { TuitionStatusSection } from "@/features/contabilidad/components/TuitionStatusSection";
import { TuitionConfigSection } from "@/features/contabilidad/components/TuitionConfigSection";
import { ReportsSection } from "@/features/contabilidad/components/ReportsSection";

export default function Pensiones() {
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

  const deleteTuitionPayment = useDeleteTuitionPayment();
  const deleteTuitionProfile = useDeleteTuitionProfile();

  const isDeletePending = deleteTuitionPayment.isPending || deleteTuitionProfile.isPending;

  const handleConfirmDelete = async () => {
    if (!pendingDeleteAction || isDeletePending) return;

    if (pendingDeleteAction.kind === "tuition_payment") {
      await deleteTuitionPayment.mutateAsync(pendingDeleteAction.id);
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
                <GraduationCap className="h-3.5 w-3.5" />
                Gestión de Pensiones
              </Badge>
              {isReadOnly && <Badge variant="outline">Modo lectura</Badge>}
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">Pensiones</h1>
              <p className="text-sm text-muted-foreground">
                Controla los cobros, abonos y perfiles de pensión de los estudiantes.
              </p>
            </div>
          </div>
        </div>

        <ContabilidadSummary selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />

        <Tabs defaultValue="estado-mes" className="space-y-6">
          <TabsList className="bg-muted/50 w-full sm:w-auto overflow-x-auto flex-nowrap justify-start h-auto p-1.5 border border-border">
            <TabsTrigger value="estado-mes" className="px-4 py-2 text-sm">Estado del mes</TabsTrigger>
            <TabsTrigger value="registrar-configurar" className="px-4 py-2 text-sm">Registrar y Configurar</TabsTrigger>
            <TabsTrigger value="reportes" className="px-4 py-2 text-sm">Informes PDF</TabsTrigger>
          </TabsList>
          
          <TuitionStatusSection {...sectionProps} />
          <TuitionConfigSection {...sectionProps} />
          <ReportsSection {...sectionProps} />
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
