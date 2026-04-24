import { useState, useMemo, useEffect } from "react";
import {
  Card,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, ClipboardList, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTuitionMonthStatus, useAccountingLedger, useInstitutionSettings } from "@/hooks/useSchoolData";
import { formatCurrency, monthLabel, normalizeLegacyAmount, statusVariant, toSchoolMonthDate } from "@/features/contabilidad/utils";
import { SCHOOL_MONTH_START, SCHOOL_MONTH_END } from "@/features/contabilidad/constants";
import { ContabilidadSectionProps } from "../types";

export function ReportsSection({ selectedMonth, selectedYear }: ContabilidadSectionProps) {
  const { toast } = useToast();
  const [reportMonth, setReportMonth] = useState<string>(selectedMonth);
  const { data: reportMonthStatus, isLoading: reportMonthStatusLoading } = useTuitionMonthStatus(reportMonth);
  const { data: reportLedger } = useAccountingLedger(reportMonth);
  const { data: institutionSettings } = useInstitutionSettings();
  const institutionName = institutionSettings?.display_name?.trim() || "Instituto Pedagogico ABC";

  useEffect(() => {
    setReportMonth(selectedMonth);
  }, [selectedMonth]);

  const schoolMonthOptions = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("es-CO", { month: "long" });
    return Array.from({ length: SCHOOL_MONTH_END - SCHOOL_MONTH_START + 1 }, (_, index) => {
      const month = SCHOOL_MONTH_START + index;
      const value = toSchoolMonthDate(selectedYear, month);
      const labelRaw = formatter.format(new Date(selectedYear, month - 1, 1));
      return {
        value,
        label: labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1),
      };
    });
  }, [selectedYear]);

  const reportMonthLabel = monthLabel(reportMonth);

  const reportRows = useMemo(() => {
    return [...(reportMonthStatus ?? [])].sort((a, b) => a.student_name.localeCompare(b.student_name));
  }, [reportMonthStatus]);

  const pendingReportRows = useMemo(
    () => reportRows.filter((row) => normalizeLegacyAmount(row.pending_amount) > 0),
    [reportRows],
  );

  const reportTotals = useMemo(() => {
    const paidCount = reportRows.filter((row) => row.status === "paid").length;
    const partialCount = reportRows.filter((row) => row.status === "partial").length;
    const unpaidCount = reportRows.filter((row) => row.status === "unpaid").length;
    const collectedAmount = reportRows.reduce((sum, row) => sum + normalizeLegacyAmount(row.paid_amount), 0);
    const pendingAmount = reportRows.reduce((sum, row) => sum + normalizeLegacyAmount(row.pending_amount), 0);

    return {
      paidCount,
      partialCount,
      unpaidCount,
      collectedAmount,
      pendingAmount,
    };
  }, [reportRows]);

  const handleDownloadTuitionReport = async () => {
    if (reportRows.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay estudiantes en el mes seleccionado para generar el informe.",
        variant: "destructive",
      });
      return;
    }

    const { downloadTuitionMonthlyReportPDF } = await import("@/utils/accountingPdf");
    const reportIncomeEntries = (reportLedger ?? []).filter((e) => e.movement_type === "income");
    const reportExpenseEntries = (reportLedger ?? []).filter((e) => e.movement_type === "expense");
    const reportIncomeTotal = reportIncomeEntries.reduce((sum, e) => sum + e.amount, 0);
    const reportExpenseTotal = reportExpenseEntries.reduce((sum, e) => sum + e.amount, 0);
    
    downloadTuitionMonthlyReportPDF({
      institutionName,
      periodMonth: reportMonth,
      monthLabel: reportMonthLabel,
      rows: reportRows.map((row) => ({
        studentName: row.student_name,
        status: row.status,
        expectedAmount: normalizeLegacyAmount(row.expected_amount),
        paidAmount: normalizeLegacyAmount(row.paid_amount),
        pendingAmount: normalizeLegacyAmount(row.pending_amount),
      })),
      financialSummary: {
        incomeCount: reportIncomeEntries.length,
        incomeTotal: reportIncomeTotal,
        expenseCount: reportExpenseEntries.length,
        expenseTotal: reportExpenseTotal,
      },
    });

    toast({
      title: "Informe generado",
      description: `Se descargo el PDF de ${reportMonthLabel}.`,
    });
  };

  const handleDownloadPendingTuitionReport = async () => {
    if (pendingReportRows.length === 0) {
      toast({
        title: "Sin cartera pendiente",
        description: "Todos los estudiantes tienen el mes cancelado en el periodo consultado.",
      });
      return;
    }

    const { downloadPendingTuitionMonthlyReportPDF } = await import("@/utils/accountingPdf");
    const reportIncomeEntries = (reportLedger ?? []).filter((e) => e.movement_type === "income");
    const reportExpenseEntries = (reportLedger ?? []).filter((e) => e.movement_type === "expense");
    const reportIncomeTotal = reportIncomeEntries.reduce((sum, e) => sum + e.amount, 0);
    const reportExpenseTotal = reportExpenseEntries.reduce((sum, e) => sum + e.amount, 0);

    downloadPendingTuitionMonthlyReportPDF({
      institutionName,
      periodMonth: reportMonth,
      monthLabel: reportMonthLabel,
      rows: pendingReportRows.map((row) => ({
        studentName: row.student_name,
        status: row.status,
        expectedAmount: normalizeLegacyAmount(row.expected_amount),
        paidAmount: normalizeLegacyAmount(row.paid_amount),
        pendingAmount: normalizeLegacyAmount(row.pending_amount),
      })),
      financialSummary: {
        incomeCount: reportIncomeEntries.length,
        incomeTotal: reportIncomeTotal,
        expenseCount: reportExpenseEntries.length,
        expenseTotal: reportExpenseTotal,
      },
    });

    toast({
      title: "Informe de no cancelados generado",
      description: `Se descargo el PDF de cartera pendiente de ${reportMonthLabel}.`,
    });
  };

  return (
    <TabsContent value="reportes" className="space-y-4 outline-none">
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="outline" className="bg-background">{reportTotals.paidCount} pagados</Badge>
        <Badge variant="outline" className="bg-background">{pendingReportRows.length} con saldo pendiente</Badge>
      </div>
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-heading font-bold text-foreground">Generar informe</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Mes del informe</Label>
                <select
                  value={reportMonth}
                  onChange={(event) => setReportMonth(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {schoolMonthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} {selectedYear}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Mes seleccionado</span>
                  <span className="font-medium text-foreground">{reportMonthLabel}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Total recaudado</span>
                  <span className="font-semibold text-success">
                    {formatCurrency(reportTotals.collectedAmount)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Saldo pendiente</span>
                  <span className="font-semibold text-destructive">
                    {formatCurrency(reportTotals.pendingAmount)}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                className="w-full gap-2"
                onClick={() => void handleDownloadTuitionReport()}
                disabled={reportMonthStatusLoading || reportRows.length === 0}
              >
                <Download className="h-4 w-4" />
                Generar PDF mensual
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => void handleDownloadPendingTuitionReport()}
                disabled={reportMonthStatusLoading || pendingReportRows.length === 0}
              >
                <Download className="h-4 w-4" />
                PDF alumnos no cancelados
              </Button>
              <p className="text-xs text-muted-foreground">
                Este informe incluye estudiantes con saldo pendiente (parcial o no pago) en el mes consultado.
              </p>
            </div>
          </Card>

          <Card className="p-5 shadow-card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-bold text-foreground">Vista previa del informe</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">{reportTotals.paidCount} pagados</Badge>
                <Badge variant="outline">{reportTotals.partialCount} parciales</Badge>
                <Badge variant="outline">{reportTotals.unpaidCount} no pagados</Badge>
              </div>
            </div>
            {reportMonthStatusLoading ? (
              <p className="text-sm text-muted-foreground">Cargando estado del mes...</p>
            ) : reportRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay datos para este mes.</p>
            ) : (
              <div className="max-h-[480px] w-full overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estudiante</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Cuota</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Pagado</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Pendiente</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportRows.map((row) => (
                      <TableRow key={`${row.student_id}-${row.period_month}`}>
                        <TableCell className="font-medium">{row.student_name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(normalizeLegacyAmount(row.expected_amount))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(normalizeLegacyAmount(row.paid_amount))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-destructive">
                          {formatCurrency(normalizeLegacyAmount(row.pending_amount))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={statusVariant(row.status)}>
                            {row.status === "paid" ? "Pagado" : row.status === "partial" ? "Parcial" : "No pago"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
    </TabsContent>
  );
}
