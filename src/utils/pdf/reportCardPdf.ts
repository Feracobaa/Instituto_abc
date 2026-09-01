import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  centerText,
  drawFooter,
  drawInstitutionalHeader,
  drawSignatures,
  drawWatermark,
  formatAverageForReport,
  formatRankForReport,
  getGradeLabel,
  getInstInfo,
  getLastAutoTableY,
  getLogoBase64,
  getPerformanceColor,
  isPreescolar,
} from "./pdfCore";
import type {
  DetailedGradeRecord,
  GradeTableRow,
  Period,
  PdfInstitutionData,
  ReportCardStudentSummary,
  Student,
  SubjectGroup,
} from "./types";

// ─── Banner de Título ─────────────────────────────────────────────────────────

export function drawTitleBanner(doc: jsPDF, y: number, isPre: boolean): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const bh = 8;

  doc.setFillColor(30, 58, 138); // Azul oscuro institucional
  doc.rect(margin, y, pageWidth - margin * 2, bh, "F");
  doc.setTextColor(255, 255, 255);
  centerText(
    doc,
    isPre
      ? "BOLETÍN DE DESEMPEÑO — NIVEL PREESCOLAR"
      : "BOLETÍN DE CALIFICACIONES — EDUCACIÓN BÁSICA PRIMARIA",
    y + 5.5,
    9,
    "bold"
  );
  doc.setTextColor(0, 0, 0);
  return y + bh + 3;
}

// ─── Bloque Informativo del Estudiante ───────────────────────────────────────

export function drawStudentInfo(
  doc: jsPDF,
  student: Student,
  period: Period,
  y: number,
  reportSummary?: ReportCardStudentSummary,
  deliveryDate?: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const w = pageWidth - margin * 2;
  const isPre = isPreescolar(student.grades?.name ?? undefined);
  const bh = isPre ? 24 : 31;

  // Caja exterior
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, w, bh);

  // Línea divisoria vertical
  doc.line(margin + w * 0.55, y, margin + w * 0.55, y + bh);

  // Fila 1
  const r1y = y + 7;
  const labelGap = 3;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("ESTUDIANTE:", margin + labelGap, r1y);
  doc.setFont("helvetica", "normal");
  doc.text(" " + student.full_name.toUpperCase(), margin + 28, r1y);
  doc.setFont("helvetica", "bold");
  doc.text("GRADO:", margin + w * 0.55 + labelGap, r1y);
  doc.setFont("helvetica", "normal");
  doc.text(
    " " + (student.grades?.name?.toUpperCase() || "N/A"),
    margin + w * 0.55 + 20,
    r1y
  );

  // Fila 2
  const r2y = y + 14;
  doc.setFont("helvetica", "bold");
  doc.text("PERÍODO:", margin + labelGap, r2y);
  doc.setFont("helvetica", "normal");
  doc.text(" " + period.name.toUpperCase(), margin + 28, r2y);
  doc.setFont("helvetica", "bold");
  doc.text("AÑO LECTIVO:", margin + w * 0.55 + labelGap, r2y);
  doc.setFont("helvetica", "normal");
  doc.text(" " + new Date().getFullYear().toString(), margin + w * 0.55 + 30, r2y);

  // Fila 3
  const r3y = y + 21;
  const formattedDeliveryDate = deliveryDate
    ? deliveryDate.split("-").reverse().join("/")
    : new Date().toLocaleDateString("es-CO");

  doc.setFont("helvetica", "bold");
  doc.text("FECHA ENTREGA:", margin + labelGap, r3y);
  doc.setFont("helvetica", "normal");
  doc.text(" " + formattedDeliveryDate, margin + 33, r3y);
  doc.setFont("helvetica", "bold");
  doc.text("DIRECTOR(A) DE GRUPO:", margin + w * 0.55 + labelGap, r3y);
  doc.setFont("helvetica", "normal");
  doc.text(
    ` ${reportSummary?.groupDirectorName || "_______________________"}`,
    margin + w * 0.55 + 42,
    r3y
  );

  if (!isPre) {
    // Fila 4
    const r4y = y + 28;
    doc.setFont("helvetica", "bold");
    doc.text("PROMEDIO BIMESTRAL:", margin + labelGap, r4y);
    doc.setFont("helvetica", "normal");
    doc.text(` ${formatAverageForReport(reportSummary?.periodAverage)}`, margin + 36, r4y);
    doc.setFont("helvetica", "bold");
    doc.text("PUESTO:", margin + w * 0.55 + labelGap, r4y);
    doc.setFont("helvetica", "normal");
    doc.text(
      ` ${formatRankForReport(reportSummary?.rank, reportSummary?.totalStudents)}`,
      margin + w * 0.55 + 18,
      r4y
    );
  }

  return y + bh + 3;
}

// ─── Leyenda de Escala Valorativa ───────────────────────────────────────────

export function drawScaleLegend(doc: jsPDF, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const w = pageWidth - margin * 2;
  const bh = 9;

  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.rect(margin, y, w, bh);

  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("ESCALA VALORACIÓN:", margin + 2, y + 5.5);

  const labels = [
    { label: "SUPERIOR", range: "4.6–5.0", color: [21, 128, 61] as [number, number, number] },
    { label: "ALTO", range: "4.0–4.5", color: [29, 78, 216] as [number, number, number] },
    { label: "BÁSICO", range: "3.0–3.9", color: [180, 120, 0] as [number, number, number] },
    { label: "BAJO", range: "1.0–2.9", color: [185, 28, 28] as [number, number, number] },
  ];

  const titleWidth = doc.getTextWidth("ESCALA VALORACIÓN:") + 4;
  const startX = margin + 2 + titleWidth;
  const availableWidth = w - titleWidth - 4;
  const itemWidth = availableWidth / labels.length;

  labels.forEach((l, i) => {
    const px = startX + i * itemWidth;
    doc.setFillColor(...l.color);
    doc.rect(px, y + 3.5, 2.5, 2.5, "F");
    doc.setFontSize(5.5);
    doc.setTextColor(...l.color);
    doc.setFont("helvetica", "bold");
    doc.text(l.label, px + 4, y + 5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(`(${l.range})`, px + 4 + doc.getTextWidth(l.label) + 0.8, y + 5.5);
  });
  doc.setTextColor(0, 0, 0);

  return y + bh + 2;
}

// ─── Tabla de Calificaciones Primaria ────────────────────────────────────────

export function buildPrimariaTable(
  doc: jsPDF,
  subjectsMap: Record<string, SubjectGroup>,
  _period: Period,
  _allPeriods: Period[],
  startY: number
): number {
  interface Row {
    data: GradeTableRow;
    finalGrade: number | null;
    perf: number | null;
  }
  const rows: Row[] = [];

  Object.values(subjectsMap).forEach((subj) => {
    const gr1 = subj.grades["1"]?.grade as number | undefined;
    const gr2 = subj.grades["2"]?.grade as number | undefined;
    const gr3 = subj.grades["3"]?.grade as number | undefined;
    const gr4 = subj.grades["4"]?.grade as number | undefined;

    const allFourExist =
      gr1 !== undefined && gr2 !== undefined && gr3 !== undefined && gr4 !== undefined;
    const finalGrade = allFourExist ? +((gr1 + gr2 + gr3 + gr4) / 4).toFixed(1) : null;

    const currentAchievements = (subj.currentRecord?.achievements || "").trim();
    const currentComments = (subj.currentRecord?.comments || "").trim();
    const displayText = currentAchievements || currentComments || "-";
    const currentGrade = subj.currentRecord?.grade ?? null;

    rows.push({
      data: [
        subj.name.toUpperCase(),
        subj.ihs || "-",
        gr1 !== undefined ? gr1.toFixed(1) : "",
        gr2 !== undefined ? gr2.toFixed(1) : "",
        gr3 !== undefined ? gr3.toFixed(1) : "",
        gr4 !== undefined ? gr4.toFixed(1) : "",
        finalGrade !== null ? finalGrade.toFixed(1) : "",
        displayText,
        currentGrade !== null ? getGradeLabel(currentGrade) : "-",
      ],
      perf: currentGrade,
      finalGrade,
    });
  });

  const HEAD_FILL: [number, number, number] = [30, 58, 138];
  const HEAD_BG2: [number, number, number] = [59, 91, 179];

  autoTable(doc, {
    startY,
    head: [
      [
        {
          content: "ÁREAS / ASIGNATURAS",
          rowSpan: 2,
          styles: { halign: "center", valign: "middle", fillColor: HEAD_FILL },
        },
        {
          content: "IHS",
          rowSpan: 2,
          styles: { halign: "center", valign: "middle", fillColor: HEAD_FILL },
        },
        {
          content: "CALIFICACIONES POR PERÍODO",
          colSpan: 5,
          styles: { halign: "center", fillColor: HEAD_BG2 },
        },
        {
          content: "FORTALEZAS Y\nDEBILIDADES",
          rowSpan: 2,
          styles: { halign: "center", valign: "middle", fillColor: HEAD_FILL },
        },
        {
          content: "NIVEL DE\nDESEMPEÑO",
          rowSpan: 2,
          styles: { halign: "center", valign: "middle", fillColor: HEAD_FILL },
        },
      ],
      [
        { content: "P1", styles: { halign: "center", fillColor: HEAD_BG2 } },
        { content: "P2", styles: { halign: "center", fillColor: HEAD_BG2 } },
        { content: "P3", styles: { halign: "center", fillColor: HEAD_BG2 } },
        { content: "P4", styles: { halign: "center", fillColor: HEAD_BG2 } },
        { content: "DEF", styles: { halign: "center", fillColor: HEAD_BG2 } },
      ],
    ],
    body: rows.map((r) => r.data),
    theme: "grid",
    headStyles: {
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: "bold", fontSize: 7 },
      1: { cellWidth: 8, halign: "center", fontSize: 7 },
      2: { cellWidth: 10, halign: "center", fontSize: 7.5 },
      3: { cellWidth: 10, halign: "center", fontSize: 7.5 },
      4: { cellWidth: 10, halign: "center", fontSize: 7.5 },
      5: { cellWidth: 10, halign: "center", fontSize: 7.5 },
      6: { cellWidth: 10, halign: "center", fontStyle: "bold", fontSize: 7.5 },
      7: { cellWidth: "auto", fontSize: 6.5, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 } },
      8: { cellWidth: 21, halign: "center", fontStyle: "bold", fontSize: 6.5 },
    },
    styles: {
      fontSize: 7,
      cellPadding: { top: 1.8, bottom: 1.8, left: 1.5, right: 1.5 },
      valign: "middle",
      lineColor: [160, 160, 160],
      lineWidth: 0.3,
    },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index === 8) {
        const row = rows[hookData.row.index];
        if (row?.perf !== null && row?.perf !== undefined) {
          const [r, g, b] = getPerformanceColor(row.perf);
          hookData.cell.styles.textColor = [r, g, b];
        }
      }
      if (hookData.section === "body" && hookData.column.index === 6) {
        const row = rows[hookData.row.index];
        if (row?.finalGrade !== null && row?.finalGrade !== undefined) {
          const [r, g, b] = getPerformanceColor(row.finalGrade);
          hookData.cell.styles.textColor = [r, g, b];
        }
      }
      if (hookData.section === "body" && hookData.column.index >= 2 && hookData.column.index <= 5) {
        const val = parseFloat(hookData.cell.raw as string);
        if (!isNaN(val)) {
          const [r, g, b] = getPerformanceColor(val);
          hookData.cell.styles.textColor = [r, g, b];
        }
      }
    },
  });

  return getLastAutoTableY(doc);
}

// ─── Tabla de Calificaciones Preescolar ──────────────────────────────────────

export function buildPreescolarTable(
  doc: jsPDF,
  subjectsMap: Record<string, SubjectGroup>,
  _period: Period,
  _allPeriods: Period[],
  startY: number
): number {
  const rows: GradeTableRow[] = [];

  Object.values(subjectsMap).forEach((subj) => {
    const gr1 = subj.grades["1"]?.grade as number | undefined;
    const gr2 = subj.grades["2"]?.grade as number | undefined;
    const gr3 = subj.grades["3"]?.grade as number | undefined;
    const gr4 = subj.grades["4"]?.grade as number | undefined;

    const achievements = (
      subj.currentRecord?.achievements || subj.currentRecord?.comments || ""
    ).trim();
    const currentGrade = subj.currentRecord?.grade ?? null;

    rows.push([
      subj.name.toUpperCase(),
      subj.ihs || "-",
      gr1 !== undefined ? gr1.toFixed(1) : "",
      gr2 !== undefined ? gr2.toFixed(1) : "",
      gr3 !== undefined ? gr3.toFixed(1) : "",
      gr4 !== undefined ? gr4.toFixed(1) : "",
      achievements || "-",
      currentGrade !== null ? getGradeLabel(currentGrade) : "-",
    ]);
  });

  const HEAD_FILL: [number, number, number] = [30, 58, 138];

  autoTable(doc, {
    startY,
    head: [
      [
        { content: "DIMENSIONES / ASPECTOS", styles: { halign: "center", fillColor: HEAD_FILL } },
        { content: "I.H.", styles: { halign: "center", fillColor: HEAD_FILL } },
        { content: "P1", styles: { halign: "center", fillColor: HEAD_FILL } },
        { content: "P2", styles: { halign: "center", fillColor: HEAD_FILL } },
        { content: "P3", styles: { halign: "center", fillColor: HEAD_FILL } },
        { content: "P4", styles: { halign: "center", fillColor: HEAD_FILL } },
        { content: "LOGROS Y DIFICULTADES", styles: { halign: "center", fillColor: HEAD_FILL } },
        { content: "NIVEL DE DESEMPEÑO", styles: { halign: "center", fillColor: HEAD_FILL } },
      ],
    ],
    body: rows,
    theme: "grid",
    headStyles: { textColor: 255, fontStyle: "bold", fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: "bold", fontSize: 8 },
      1: { cellWidth: 8, halign: "center", fontSize: 8 },
      2: { cellWidth: 10, halign: "center", fontSize: 8 },
      3: { cellWidth: 10, halign: "center", fontSize: 8 },
      4: { cellWidth: 10, halign: "center", fontSize: 8 },
      5: { cellWidth: 10, halign: "center", fontSize: 8 },
      6: { cellWidth: "auto", fontSize: 7.5 },
      7: { cellWidth: 25, halign: "center", fontStyle: "bold", fontSize: 7.5 },
    },
    styles: { fontSize: 8, cellPadding: 2, valign: "middle", lineColor: [180, 180, 180] },
    alternateRowStyles: { fillColor: [245, 248, 255] },
  });

  return getLastAutoTableY(doc);
}

// ─── Observaciones Generales ─────────────────────────────────────────────────

export function drawObservations(doc: jsPDF, y: number, text: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const w = pageWidth - margin * 2;

  doc.setFillColor(30, 58, 138);
  doc.rect(margin, y, w, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("OBSERVACIONES GENERALES DEL PERÍODO", margin + 3, y + 4.2);
  doc.setTextColor(0, 0, 0);

  const boxH = 22;
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.rect(margin, y + 6, w, boxH);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const wrapped = doc.splitTextToSize(text || "Sin observaciones para este período.", w - 6);
  doc.text(wrapped, margin + 3, y + 11);

  return y + 6 + boxH + 3;
}

// ─── Generador Principal de Boletines ─────────────────────────────────────────

export async function generateReportCard(
  student: Student,
  period: Period,
  allGradeRecords: DetailedGradeRecord[],
  classSchedules: { subject_id: string }[],
  allPeriods: Period[],
  reportSummary?: ReportCardStudentSummary,
  deliveryDate?: string,
  instData?: PdfInstitutionData
) {
  const info = getInstInfo(instData);
  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });
  const logoB64 = await getLogoBase64(info.logoUrl);

  if (logoB64) drawWatermark(doc, logoB64);

  // 1. Encabezado institucional
  let y = drawInstitutionalHeader(doc, logoB64, instData);

  // 2. Banner de título
  const isPre = isPreescolar(student.grades?.name ?? undefined);
  y = drawTitleBanner(doc, y, isPre);

  // 3. Información del estudiante
  y = drawStudentInfo(doc, student, period, y, reportSummary, deliveryDate);

  // 4. Leyenda de escala
  y = drawScaleLegend(doc, y);

  // 5. Mapeo de periodos
  const periodIdToIndex: Record<string, string> = {};
  allPeriods.forEach((p, idx) => {
    periodIdToIndex[p.id] = String(idx + 1);
  });

  // 6. Mapeo de asignaturas
  const subjectsMap: Record<string, SubjectGroup> = {};
  allGradeRecords.forEach((record) => {
    if (!record.subjects) return;
    const sid = record.subjects.id;
    if (!subjectsMap[sid]) {
      subjectsMap[sid] = {
        name: record.subjects.name,
        ihs: classSchedules.filter((s) => s.subject_id === sid).length,
        grades: {},
        currentRecord: null,
      };
    }

    const colKey = periodIdToIndex[record.period_id];
    if (colKey) {
      subjectsMap[sid].grades[colKey] = record;
    }

    if (record.period_id === period.id) {
      subjectsMap[sid].currentRecord = record;
    }
  });

  // 7. Renderizado de tabla
  let tableEndY: number;
  if (isPre) {
    tableEndY = buildPreescolarTable(doc, subjectsMap, period, allPeriods, y + 2);
  } else {
    tableEndY = buildPrimariaTable(doc, subjectsMap, period, allPeriods, y + 2);
  }

  y = tableEndY + 4;

  // 8. Observaciones
  const obsText =
    Object.values(subjectsMap)
      .map((s) => s.currentRecord?.comments)
      .filter(Boolean)
      .join(" | ") || "";
  y = drawObservations(doc, y, obsText);

  // 9. Firmas
  y = drawSignatures(doc, y, instData);

  // 10. Pie de página
  drawFooter(doc, instData);

  return doc;
}

export async function downloadReportCard(
  student: Student,
  period: Period,
  allGradeRecords: DetailedGradeRecord[],
  classSchedules: { subject_id: string }[],
  allPeriods: Period[],
  reportSummary?: ReportCardStudentSummary,
  deliveryDate?: string,
  instData?: PdfInstitutionData
) {
  const doc = await generateReportCard(
    student,
    period,
    allGradeRecords,
    classSchedules,
    allPeriods,
    reportSummary,
    deliveryDate,
    instData
  );
  const name = `Boletin_${student.full_name.replace(/\s+/g, "_")}_${period.name.replace(/\s+/g, "_")}.pdf`;
  doc.save(name);
}
