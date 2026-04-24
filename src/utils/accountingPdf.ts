import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/features/contabilidad/utils";

export interface TuitionMonthlyReportRow {
  studentName: string;
  status: string;
  expectedAmount: number;
  paidAmount: number;
  pendingAmount: number;
}

export interface MonthlyFinancialSummary {
  incomeCount: number;
  incomeTotal: number;
  expenseCount: number;
  expenseTotal: number;
}

interface DownloadTuitionMonthlyReportPDFParams {
  institutionName?: string;
  periodMonth: string;
  monthLabel: string;
  rows: TuitionMonthlyReportRow[];
  financialSummary?: MonthlyFinancialSummary;
}

interface DownloadPendingTuitionMonthlyReportPDFParams {
  institutionName?: string;
  periodMonth: string;
  monthLabel: string;
  rows: TuitionMonthlyReportRow[];
  financialSummary?: MonthlyFinancialSummary;
}

type AutoTableCapableDoc = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

const normalizeFileName = (value: string) => {
  return value
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .replace(/_+/g, "_");
};

const statusLabel = (status: string) => {
  if (status === "paid") return "Pagado";
  if (status === "partial") return "Parcial";
  return "No pago";
};

export function downloadTuitionMonthlyReportPDF({
  institutionName = "Instituto Pedagogico ABC",
  periodMonth,
  monthLabel,
  rows,
  financialSummary,
}: DownloadTuitionMonthlyReportPDFParams) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();

  const paidCount = rows.filter((row) => row.status === "paid").length;
  const partialCount = rows.filter((row) => row.status === "partial").length;
  const unpaidCount = rows.filter((row) => row.status === "unpaid").length;
  const totalExpected = rows.reduce((sum, row) => sum + row.expectedAmount, 0);
  const totalPaid = rows.reduce((sum, row) => sum + row.paidAmount, 0);
  const totalPending = rows.reduce((sum, row) => sum + row.pendingAmount, 0);

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(institutionName, pageWidth / 2, 10, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Informe mensual de pensiones - ${monthLabel}`, pageWidth / 2, 16, { align: "center" });

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(9);
  doc.text(`Periodo: ${periodMonth.slice(0, 7)}`, 14, 31);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-CO")}`, pageWidth - 14, 31, { align: "right" });

  autoTable(doc, {
    startY: 35,
    head: [["#", "Estudiante", "Estado", "Cuota", "Pagado", "Pendiente"]],
    body: rows.map((row, index) => [
      String(index + 1),
      row.studentName,
      statusLabel(row.status),
      formatCurrency(row.expectedAmount),
      formatCurrency(row.paidAmount),
      formatCurrency(row.pendingAmount),
    ]),
    styles: {
      fontSize: 8.5,
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: 68 },
      2: { halign: "center", cellWidth: 26 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 28 },
      5: { halign: "right", cellWidth: 28 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const tableEndY = (doc as AutoTableCapableDoc).lastAutoTable?.finalY ?? 35;
  let summaryStartY = tableEndY + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text("Resumen de pensiones", 14, summaryStartY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Estudiantes pagados: ${paidCount}`, 14, summaryStartY + 6);
  doc.text(`Estudiantes parciales: ${partialCount}`, 14, summaryStartY + 12);
  doc.text(`Estudiantes no pagados: ${unpaidCount}`, 14, summaryStartY + 18);

  doc.text(`Cuota esperada: ${formatCurrency(totalExpected)}`, pageWidth - 14, summaryStartY + 6, { align: "right" });
  doc.text(`Total recaudado: ${formatCurrency(totalPaid)}`, pageWidth - 14, summaryStartY + 12, { align: "right" });
  doc.text(`Total pendiente: ${formatCurrency(totalPending)}`, pageWidth - 14, summaryStartY + 18, { align: "right" });

  // Financial summary (income / expenses)
  if (financialSummary) {
    summaryStartY += 28;

    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(14, summaryStartY - 4, pageWidth - 14, summaryStartY - 4);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text("Resumen financiero del mes", 14, summaryStartY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    // Income
    doc.setTextColor(22, 163, 74);
    doc.text(
      `Ingresos: ${financialSummary.incomeCount} registros - ${formatCurrency(financialSummary.incomeTotal)}`,
      14,
      summaryStartY + 7,
    );

    // Expenses
    doc.setTextColor(220, 38, 38);
    doc.text(
      `Egresos: ${financialSummary.expenseCount} registros - ${formatCurrency(financialSummary.expenseTotal)}`,
      14,
      summaryStartY + 13,
    );

    // Balance
    const balance = financialSummary.incomeTotal - financialSummary.expenseTotal;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(balance >= 0 ? 22 : 220, balance >= 0 ? 163 : 38, balance >= 0 ? 74 : 38);
    doc.text(
      `Balance neto: ${formatCurrency(balance)}`,
      pageWidth - 14,
      summaryStartY + 13,
      { align: "right" },
    );
  }

  const safeMonth = normalizeFileName(monthLabel);
  doc.save(`Informe_Pensiones_${safeMonth}.pdf`);
}

export function downloadPendingTuitionMonthlyReportPDF({
  institutionName = "Instituto Pedagogico ABC",
  periodMonth,
  monthLabel,
  rows,
  financialSummary,
}: DownloadPendingTuitionMonthlyReportPDFParams) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();

  const partialCount = rows.filter((row) => row.status === "partial").length;
  const unpaidCount = rows.filter((row) => row.status === "unpaid").length;
  const totalExpected = rows.reduce((sum, row) => sum + row.expectedAmount, 0);
  const totalPaid = rows.reduce((sum, row) => sum + row.paidAmount, 0);
  const totalPending = rows.reduce((sum, row) => sum + row.pendingAmount, 0);

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(institutionName, pageWidth / 2, 10, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Informe de cartera pendiente - ${monthLabel}`, pageWidth / 2, 16, { align: "center" });

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(9);
  doc.text(`Periodo: ${periodMonth.slice(0, 7)}`, 14, 31);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-CO")}`, pageWidth - 14, 31, { align: "right" });

  autoTable(doc, {
    startY: 35,
    head: [["#", "Estudiante", "Estado", "Cuota", "Pagado", "Pendiente"]],
    body: rows.map((row, index) => [
      String(index + 1),
      row.studentName,
      statusLabel(row.status),
      formatCurrency(row.expectedAmount),
      formatCurrency(row.paidAmount),
      formatCurrency(row.pendingAmount),
    ]),
    styles: {
      fontSize: 8.5,
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [127, 29, 29],
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: 68 },
      2: { halign: "center", cellWidth: 26 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 28 },
      5: { halign: "right", cellWidth: 28 },
    },
    alternateRowStyles: {
      fillColor: [255, 245, 245],
    },
  });

  const tableEndY = (doc as AutoTableCapableDoc).lastAutoTable?.finalY ?? 35;
  let summaryStartY = tableEndY + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text("Resumen de cartera pendiente", 14, summaryStartY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Estudiantes con deuda: ${rows.length}`, 14, summaryStartY + 6);
  doc.text(`Sin pago del mes: ${unpaidCount}`, 14, summaryStartY + 12);
  doc.text(`Con pago parcial: ${partialCount}`, 14, summaryStartY + 18);

  doc.text(`Cuota esperada: ${formatCurrency(totalExpected)}`, pageWidth - 14, summaryStartY + 6, { align: "right" });
  doc.text(`Total abonado: ${formatCurrency(totalPaid)}`, pageWidth - 14, summaryStartY + 12, { align: "right" });
  doc.text(`Saldo pendiente: ${formatCurrency(totalPending)}`, pageWidth - 14, summaryStartY + 18, { align: "right" });

  if (financialSummary) {
    summaryStartY += 28;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(14, summaryStartY - 4, pageWidth - 14, summaryStartY - 4);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text("Resumen financiero del mes", 14, summaryStartY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    doc.setTextColor(22, 163, 74);
    doc.text(
      `Ingresos: ${financialSummary.incomeCount} registros - ${formatCurrency(financialSummary.incomeTotal)}`,
      14,
      summaryStartY + 7,
    );

    doc.setTextColor(220, 38, 38);
    doc.text(
      `Egresos: ${financialSummary.expenseCount} registros - ${formatCurrency(financialSummary.expenseTotal)}`,
      14,
      summaryStartY + 13,
    );

    const balance = financialSummary.incomeTotal - financialSummary.expenseTotal;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(balance >= 0 ? 22 : 220, balance >= 0 ? 163 : 38, balance >= 0 ? 74 : 38);
    doc.text(
      `Balance neto: ${formatCurrency(balance)}`,
      pageWidth - 14,
      summaryStartY + 13,
      { align: "right" },
    );
  }

  const safeMonth = normalizeFileName(monthLabel);
  doc.save(`Informe_No_Cancelados_${safeMonth}.pdf`);
}
