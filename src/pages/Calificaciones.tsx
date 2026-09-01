import { MainLayout } from "@/components/layout/MainLayout";
import { ConfirmActionDialog } from "@/components/ui/ConfirmActionDialog";
import { CalificacionesFilters } from "@/features/calificaciones/CalificacionesFilters";
import { CalificacionesTable } from "@/features/calificaciones/CalificacionesTable";
import { GradeLegend } from "@/features/calificaciones/GradeLegend";
import { GradeRecordDialog } from "@/features/calificaciones/GradeRecordDialog";
import { PreescolarEvaluationDialog } from "@/features/calificaciones/PreescolarEvaluationDialog";
import { PreescolarPdfRenderer } from "@/features/calificaciones/PreescolarPdfRenderer";
import { useCalificacionesLogic } from "@/features/calificaciones/hooks/useCalificacionesLogic";
import { CalificacionesStatusAlerts } from "@/features/calificaciones/components/CalificacionesStatusAlerts";

const Calificaciones = () => {
  const logic = useCalificacionesLogic();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Calificaciones</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {logic.isPreescolar
              ? "Evaluaciones cualitativas para preescolar."
              : "Registro de calificaciones por periodo."}
          </p>
        </div>

        <CalificacionesFilters
          activePeriodId={logic.activePeriod?.id}
          availableGrades={logic.availableGrades}
          deliveryDate={logic.deliveryDate}
          periods={logic.periods}
          selectedGrade={logic.selectedGrade}
          selectedPeriod={logic.selectedPeriod}
          searchTerm={logic.searchTerm}
          setDeliveryDate={logic.setDeliveryDate}
          setSelectedGrade={logic.setSelectedGrade}
          setSelectedPeriod={logic.setSelectedPeriod}
          setSearchTerm={logic.setSearchTerm}
          inlineEditActive={logic.inlineEditActive}
          onToggleInlineEdit={logic.setInlineEditActive}
          canEdit={logic.canManageCurrentPeriod}
        />

        <CalificacionesStatusAlerts
          pageError={logic.pageError}
          selectedGrade={logic.selectedGrade}
          selectedPeriod={logic.selectedPeriod}
          canManageCurrentPeriod={logic.canManageCurrentPeriod}
          isLoading={logic.isLoading}
          hasStudents={logic.filteredStudents.length > 0}
          searchTerm={logic.searchTerm}
        />

        {logic.selectedGrade && logic.selectedPeriod && !logic.isLoading && logic.filteredStudents.length > 0 && (
          <CalificacionesTable
            canManageRecords={logic.canManageCurrentPeriod}
            students={logic.filteredStudents}
            isPreescolar={logic.isPreescolar}
            getRecordsForStudent={logic.getStudentRecords}
            onAddGrade={logic.handleAddGrade}
            onAddPreescolar={logic.handleAddPreescolar}
            onDeleteGrade={logic.requestDeleteGrade}
            onDeletePreescolar={logic.requestDeletePreescolar}
            onDownloadReport={logic.handleDownloadReport}
            onEditGrade={logic.handleEditGrade}
            onEditPreescolar={logic.handleEditPreescolar}
            inlineEditActive={logic.inlineEditActive}
            onInlineGradeChange={logic.handleInlineGradeChange}
          />
        )}

        {!logic.isPreescolar && <GradeLegend />}
      </div>

      <GradeRecordDialog
        open={logic.dialogOpen}
        onOpenChange={logic.setDialogOpen}
        editingRecord={logic.editingRecord}
        setEditingRecord={logic.setEditingRecord}
        isPending={logic.isPending}
        isRector={logic.isRector}
        availableTeachersForSelectedGrade={logic.availableTeachersForSelectedGrade}
        availableSubjects={logic.availableSubjectsForDialog}
        teacherOptionsForRecord={logic.teacherOptionsForGradeRecord}
        onSave={logic.handleSaveGrade}
      />

      <PreescolarEvaluationDialog
        open={logic.preescolarDialogOpen}
        onOpenChange={logic.setPreescolarDialogOpen}
        editingPreescolar={logic.editingPreescolar}
        setEditingPreescolar={logic.setEditingPreescolar}
        isPending={logic.createPreescolarEvaluation.isPending || logic.updatePreescolarEvaluation.isPending}
        isRector={logic.isRector}
        availableTeachersForSelectedGrade={logic.availableTeachersForSelectedGrade}
        onSave={logic.handleSavePreescolar}
      />

      <ConfirmActionDialog
        open={Boolean(logic.pendingDelete)}
        onOpenChange={(open) => {
          if (!open) logic.setPendingDelete(null);
        }}
        title={
          logic.pendingDelete?.kind === "preescolar"
            ? "Eliminar evaluacion cualitativa?"
            : "Eliminar calificacion?"
        }
        description="Esta accion no se puede deshacer."
        actionLabel="Eliminar"
        onConfirm={logic.confirmDelete}
      />

      <PreescolarPdfRenderer
        deliveryDate={logic.deliveryDate}
        downloadingStudent={logic.downloadingStudent}
        gradeName={logic.selectedGradeData?.name}
        groupDirectorName={logic.downloadingSnapshot?.groupDirectorName}
        isPreescolar={logic.isPreescolar}
        periodName={logic.selectedPeriodData?.name}
        preescolarRef={logic.preescolarRef}
        records={logic.preescolarPdfRecords}
        institutionSettings={logic.settings || undefined}
        reportSummary={
          logic.downloadingSnapshot
            ? {
                periodAverage: logic.downloadingSnapshot.periodAverage,
                rank: logic.downloadingSnapshot.rank,
                totalStudents: logic.downloadingSnapshot.totalStudents,
              }
            : undefined
        }
      />
    </MainLayout>
  );
};

export default Calificaciones;
