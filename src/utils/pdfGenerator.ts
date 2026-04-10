import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface DetailedGradeRecord {
  period_id: string;
  subjects: { id: string; name: string } | null;
  grade: number;
  achievements: string | null;
  comments: string | null;
  academic_periods: { name: string } | null;
}

interface Student {
  full_name: string;
  grades: { name: string } | null;
}

export interface ReportCardStudentSummary {
  groupDirectorName?: string | null;
  periodAverage?: number | null;
  rank?: number | null;
  totalStudents?: number;
}

interface Period {
  id: string;
  name: string;
}

interface SubjectGroup {
  currentRecord: DetailedGradeRecord | null;
  grades: Record<string, DetailedGradeRecord>;
  ihs: number;
  name: string;
}

type GradeTableRow = Array<string | number>;
type AutoTableCell = string | {
  colSpan?: number;
  content: string;
  rowSpan?: number;
  styles?: Record<string, unknown>;
};

type AutoTableCapableDoc = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

type GStateCapableDoc = jsPDF & {
  GState: new (options: { opacity: number }) => unknown;
  setGState: (state: unknown) => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const INST = {
  republic: 'REPÚBLICA DE COLOMBIA',
  ministry: 'MINISTERIO DE EDUCACIÓN NACIONAL',
  department: 'DEPARTAMENTO DEL MAGDALENA',
  name: 'INSTITUCIÓN EDUCATIVA INSTITUTO PEDAGÓGICO ABC',
  address: 'Calle 7 #14-42 - Ciénaga, Magdalena',
  phone: 'Tel: 3104755752',
  nit: 'NIT: 39.144.200-1',
};

const PREESCOLAR_GRADES = [
  'párvulo', 'pre-jardín', 'jardín', 'transición', 'preescolar',
  'parvulo', 'pre-jardin', 'jardin', 'transicion',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPreescolar(gradeName?: string): boolean {
  if (!gradeName) return false;
  return PREESCOLAR_GRADES.some(g => gradeName.toLowerCase().includes(g));
}

function getGradeLabel(grade: number): string {
  if (grade >= 4.6) return 'SUPERIOR';
  if (grade >= 4.0) return 'ALTO';
  if (grade >= 3.0) return 'BÁSICO';
  return 'BAJO';
}

function getPerformanceColor(grade: number): [number, number, number] {
  if (grade >= 4.6) return [21, 128, 61];   // green
  if (grade >= 4.0) return [29, 78, 216];   // blue
  if (grade >= 3.0) return [180, 120, 0];   // amber
  return [185, 28, 28];                      // red
}

async function getLogoBase64(): Promise<string | null> {
  try {
    const response = await fetch('/logo-iabc.jpg');
    const blob = await response.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function centerText(doc: jsPDF, text: string, y: number, fontSize: number, style: 'bold' | 'normal' | 'bolditalic' = 'normal') {
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', style);
  doc.text(text, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
}

function getLastAutoTableY(doc: jsPDF): number {
  return (doc as AutoTableCapableDoc).lastAutoTable?.finalY ?? 0;
}

function formatAverageForReport(periodAverage?: number | null) {
  return typeof periodAverage === 'number' ? periodAverage.toFixed(2) : '-';
}

function formatRankForReport(rank?: number | null, totalStudents?: number) {
  if (!rank || !totalStudents) {
    return '-';
  }

  return `${rank} de ${totalStudents}`;
}

function setDocumentOpacity(doc: jsPDF, opacity: number) {
  const pdf = doc as Partial<GStateCapableDoc>;

  if (pdf.GState && pdf.setGState) {
    pdf.setGState(new pdf.GState({ opacity }));
  }
}

// ─── Header ───────────────────────────────────────────────────────────────────

async function drawHeader(doc: jsPDF, logoB64: string | null): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Outer border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.2);
  doc.rect(margin, 8, pageWidth - margin * 2, 43);

  // Inner border (double line effect)
  doc.setLineWidth(0.3);
  doc.rect(margin + 1.5, 9.5, pageWidth - margin * 2 - 3, 40);

  // Logo left side
  if (logoB64) {
    doc.addImage(logoB64, 'JPEG', margin + 4, 12, 28, 28);
  }

  // Logo right side (same logo, mirrored position)
  if (logoB64) {
    doc.addImage(logoB64, 'JPEG', pageWidth - margin - 32, 12, 28, 28);
  }

  // Center text block
  doc.setTextColor(0, 0, 0);
  centerText(doc, INST.republic, 18, 7, 'bold');
  centerText(doc, INST.ministry, 23, 7, 'bold');
  centerText(doc, INST.department, 28, 7.5, 'bold');
  centerText(doc, INST.name, 34, 9, 'bold');
  centerText(doc, INST.address, 39, 6.5, 'normal');
  centerText(doc, `${INST.phone}   ${INST.nit}`, 44, 6, 'normal');

  return 57; // nextY after header
}

// ─── Title Banner ─────────────────────────────────────────────────────────────

function drawTitleBanner(doc: jsPDF, y: number, isPre: boolean): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const bh = 8;

  doc.setFillColor(30, 58, 138); // dark blue
  doc.rect(margin, y, pageWidth - margin * 2, bh, 'F');
  doc.setTextColor(255, 255, 255);
  centerText(doc, isPre
    ? 'BOLETÍN DE DESEMPEÑO — NIVEL PREESCOLAR'
    : 'BOLETÍN DE CALIFICACIONES — EDUCACIÓN BÁSICA PRIMARIA',
    y + 5.5, 9, 'bold'
  );
  doc.setTextColor(0, 0, 0);
  return y + bh + 3;
}

// ─── Student Info Block ───────────────────────────────────────────────────────

function drawStudentInfo(
  doc: jsPDF,
  student: Student,
  period: Period,
  y: number,
  reportSummary?: ReportCardStudentSummary,
  deliveryDate?: string,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const w = pageWidth - margin * 2;
  const bh = 31;

  // Outer box
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, w, bh);

  // Dividing vertical lines
  doc.line(margin + w * 0.55, y, margin + w * 0.55, y + bh);

  // Row 1
  const r1y = y + 7;
  const labelGap = 3;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold'); doc.text('ESTUDIANTE:', margin + labelGap, r1y);
  doc.setFont('helvetica', 'normal'); doc.text(' ' + student.full_name.toUpperCase(), margin + 28, r1y);
  doc.setFont('helvetica', 'bold'); doc.text('GRADO:', margin + w * 0.55 + labelGap, r1y);
  doc.setFont('helvetica', 'normal'); doc.text(' ' + (student.grades?.name?.toUpperCase() || 'N/A'), margin + w * 0.55 + 20, r1y);

  // Row 2
  const r2y = y + 14;
  doc.setFont('helvetica', 'bold'); doc.text('PERÍODO:', margin + labelGap, r2y);
  doc.setFont('helvetica', 'normal'); doc.text(' ' + period.name.toUpperCase(), margin + 28, r2y);
  doc.setFont('helvetica', 'bold'); doc.text('AÑO LECTIVO:', margin + w * 0.55 + labelGap, r2y);
  doc.setFont('helvetica', 'normal'); doc.text(' ' + new Date().getFullYear().toString(), margin + w * 0.55 + 30, r2y);

  // Row 3
  const r3y = y + 21;
  const formattedDeliveryDate = deliveryDate
    ? deliveryDate.split('-').reverse().join('/')
    : new Date().toLocaleDateString('es-CO');

  doc.setFont('helvetica', 'bold'); doc.text('FECHA ENTREGA:', margin + labelGap, r3y);
  doc.setFont('helvetica', 'normal'); doc.text(' ' + formattedDeliveryDate, margin + 33, r3y);
  doc.setFont('helvetica', 'bold'); doc.text('DIRECTOR(A) DE GRUPO:', margin + w * 0.55 + labelGap, r3y);
  doc.setFont('helvetica', 'normal');
  doc.text(` ${reportSummary?.groupDirectorName || '_______________________'}`, margin + w * 0.55 + 42, r3y);

  // Row 4
  const r4y = y + 28;
  doc.setFont('helvetica', 'bold'); doc.text('PROMEDIO BIMESTRAL:', margin + labelGap, r4y);
  doc.setFont('helvetica', 'normal');
  doc.text(` ${formatAverageForReport(reportSummary?.periodAverage)}`, margin + 36, r4y);
  doc.setFont('helvetica', 'bold'); doc.text('PUESTO:', margin + w * 0.55 + labelGap, r4y);
  doc.setFont('helvetica', 'normal');
  doc.text(` ${formatRankForReport(reportSummary?.rank, reportSummary?.totalStudents)}`, margin + w * 0.55 + 18, r4y);

  return y + bh + 3;
}

// ─── Scale Legend ─────────────────────────────────────────────────────────────

function drawScaleLegend(doc: jsPDF, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const w = pageWidth - margin * 2;
  const bh = 9;

  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.rect(margin, y, w, bh);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('ESCALA VALORACIÓN:', margin + 2, y + 5.5);

  const labels = [
    { label: 'SUPERIOR', range: '4.6–5.0', color: [21, 128, 61] as [number, number, number] },
    { label: 'ALTO', range: '4.0–4.5', color: [29, 78, 216] as [number, number, number] },
    { label: 'BÁSICO', range: '3.0–3.9', color: [180, 120, 0] as [number, number, number] },
    { label: 'BAJO', range: '1.0–2.9', color: [185, 28, 28] as [number, number, number] },
  ];

  // Calculate total content width to distribute evenly
  const titleWidth = doc.getTextWidth('ESCALA VALORACIÓN:') + 4;
  const startX = margin + 2 + titleWidth;
  const availableWidth = w - titleWidth - 4;
  const itemWidth = availableWidth / labels.length;

  labels.forEach((l, i) => {
    const px = startX + i * itemWidth;
    doc.setFillColor(...l.color);
    doc.rect(px, y + 3.5, 2.5, 2.5, 'F');
    doc.setFontSize(5.5);
    doc.setTextColor(...l.color);
    doc.setFont('helvetica', 'bold');
    doc.text(l.label, px + 4, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`(${l.range})`, px + 4 + doc.getTextWidth(l.label) + 0.8, y + 5.5);
  });
  doc.setTextColor(0, 0, 0);

  return y + bh + 2;
}

// ─── Grade Table — PRIMARIA ───────────────────────────────────────────────────

function buildPrimariaTable(
  doc: jsPDF,
  subjectsMap: Record<string, SubjectGroup>,
  period: Period,
  allPeriods: Period[],
  startY: number
): number {
  interface Row {
    data: GradeTableRow;
    finalGrade: number | null;
    perf: number | null;
  }
  const rows: Row[] = [];

  const P = (n: string) => n.replace(/[^0-9]/g, '') || n;

  Object.values(subjectsMap).forEach((subj) => {
    // Extract grade for each specific period
    const gr1 = subj.grades['1']?.grade as number | undefined;
    const gr2 = subj.grades['2']?.grade as number | undefined;
    const gr3 = subj.grades['3']?.grade as number | undefined;
    const gr4 = subj.grades['4']?.grade as number | undefined;

    // ⚠️ FINAL solo se calcula si TODOS los 4 períodos tienen nota
    const allFourExist = gr1 !== undefined && gr2 !== undefined && gr3 !== undefined && gr4 !== undefined;
    const finalGrade = allFourExist
      ? +((gr1 + gr2 + gr3 + gr4) / 4).toFixed(1)
      : null;

    // Achievements/comments del período actual solamente
    const currentAchievements = (subj.currentRecord?.achievements || '').trim();
    const currentComments = (subj.currentRecord?.comments || '').trim();
    const displayText = currentAchievements || currentComments || '-';

    // Performance label del período actual
    const currentGrade = subj.currentRecord?.grade ?? null;

    rows.push({
      data: [
        subj.name.toUpperCase(),
        subj.ihs || '-',
        gr1 !== undefined ? gr1.toFixed(1) : '',
        gr2 !== undefined ? gr2.toFixed(1) : '',
        gr3 !== undefined ? gr3.toFixed(1) : '',
        gr4 !== undefined ? gr4.toFixed(1) : '',
        finalGrade !== null ? finalGrade.toFixed(1) : '',
        displayText,
        currentGrade !== null ? getGradeLabel(currentGrade) : '-',
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
        { content: 'ÁREAS / ASIGNATURAS', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: HEAD_FILL } },
        { content: 'IHS', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: HEAD_FILL } },
        { content: 'CALIFICACIONES POR PERÍODO', colSpan: 5, styles: { halign: 'center', fillColor: HEAD_BG2 } },
        { content: 'FORTALEZAS Y\nDEBILIDADES', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: HEAD_FILL } },
        { content: 'NIVEL DE\nDESEMPEÑO', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: HEAD_FILL } },
      ],
      [
        { content: 'P1', styles: { halign: 'center', fillColor: HEAD_BG2 } },
        { content: 'P2', styles: { halign: 'center', fillColor: HEAD_BG2 } },
        { content: 'P3', styles: { halign: 'center', fillColor: HEAD_BG2 } },
        { content: 'P4', styles: { halign: 'center', fillColor: HEAD_BG2 } },
        { content: 'DEF', styles: { halign: 'center', fillColor: HEAD_BG2 } },
      ],
    ],
    body: rows.map(r => r.data),
    theme: 'grid',
    headStyles: {
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold', fontSize: 7 },        // Asignaturas
      1: { cellWidth: 8, halign: 'center', fontSize: 7 },         // IHS
      2: { cellWidth: 10, halign: 'center', fontSize: 7.5 },       // P1
      3: { cellWidth: 10, halign: 'center', fontSize: 7.5 },       // P2
      4: { cellWidth: 10, halign: 'center', fontSize: 7.5 },       // P3
      5: { cellWidth: 10, halign: 'center', fontSize: 7.5 },       // P4
      6: { cellWidth: 10, halign: 'center', fontStyle: 'bold', fontSize: 7.5 }, // DEF (wider to avoid split)
      7: { cellWidth: 'auto', fontSize: 6.5, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 } }, // Fortalezas
      8: { cellWidth: 21, halign: 'center', fontStyle: 'bold', fontSize: 6.5 }, // Desempeño
    },
    styles: {
      fontSize: 7,
      cellPadding: { top: 1.8, bottom: 1.8, left: 1.5, right: 1.5 },
      valign: 'middle',
      lineColor: [160, 160, 160],
      lineWidth: 0.3,
    },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    didParseCell: (hookData) => {
      // Color performance column text by grade level
      if (hookData.section === 'body' && hookData.column.index === 8) {
        const row = rows[hookData.row.index];
        if (row?.perf !== null && row?.perf !== undefined) {
          const [r, g, b] = getPerformanceColor(row.perf);
          hookData.cell.styles.textColor = [r, g, b];
        }
      }
      // Color DEF column based on final grade
      if (hookData.section === 'body' && hookData.column.index === 6) {
        const row = rows[hookData.row.index];
        if (row?.finalGrade !== null && row?.finalGrade !== undefined) {
          const [r, g, b] = getPerformanceColor(row.finalGrade);
          hookData.cell.styles.textColor = [r, g, b];
        }
      }
      // Color individual period grades
      if (hookData.section === 'body' && hookData.column.index >= 2 && hookData.column.index <= 5) {
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

// ─── Grade Table — PREESCOLAR ─────────────────────────────────────────────────

function buildPreescolarTable(
  doc: jsPDF,
  subjectsMap: Record<string, SubjectGroup>,
  period: Period,
  allPeriods: Period[],
  startY: number
): number {
  const rows: GradeTableRow[] = [];

  Object.values(subjectsMap).forEach((subj) => {
    // Grades are already mapped as '1','2','3','4' in subjectsMap
    const gr1 = subj.grades['1']?.grade as number | undefined;
    const gr2 = subj.grades['2']?.grade as number | undefined;
    const gr3 = subj.grades['3']?.grade as number | undefined;
    const gr4 = subj.grades['4']?.grade as number | undefined;

    const achievements = (subj.currentRecord?.achievements || subj.currentRecord?.comments || '').trim();
    const currentGrade = subj.currentRecord?.grade ?? null;

    rows.push([
      subj.name.toUpperCase(),
      subj.ihs || '-',
      gr1 !== undefined ? gr1.toFixed(1) : '',
      gr2 !== undefined ? gr2.toFixed(1) : '',
      gr3 !== undefined ? gr3.toFixed(1) : '',
      gr4 !== undefined ? gr4.toFixed(1) : '',
      achievements || '-',
      currentGrade !== null ? getGradeLabel(currentGrade) : '-',
    ]);
  });

  const HEAD_FILL: [number, number, number] = [30, 58, 138];

  autoTable(doc, {
    startY,
    head: [[
      { content: 'DIMENSIONES / ASPECTOS', styles: { halign: 'center', fillColor: HEAD_FILL } },
      { content: 'I.H.', styles: { halign: 'center', fillColor: HEAD_FILL } },
      { content: 'P1', styles: { halign: 'center', fillColor: HEAD_FILL } },
      { content: 'P2', styles: { halign: 'center', fillColor: HEAD_FILL } },
      { content: 'P3', styles: { halign: 'center', fillColor: HEAD_FILL } },
      { content: 'P4', styles: { halign: 'center', fillColor: HEAD_FILL } },
      { content: 'LOGROS Y DIFICULTADES', styles: { halign: 'center', fillColor: HEAD_FILL } },
      { content: 'NIVEL DE DESEMPEÑO', styles: { halign: 'center', fillColor: HEAD_FILL } },
    ]],
    body: rows,
    theme: 'grid',
    headStyles: { textColor: 255, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold', fontSize: 8 },
      1: { cellWidth: 8, halign: 'center', fontSize: 8 },
      2: { cellWidth: 10, halign: 'center', fontSize: 8 },
      3: { cellWidth: 10, halign: 'center', fontSize: 8 },
      4: { cellWidth: 10, halign: 'center', fontSize: 8 },
      5: { cellWidth: 10, halign: 'center', fontSize: 8 },
      6: { cellWidth: 'auto', fontSize: 7.5 },
      7: { cellWidth: 25, halign: 'center', fontStyle: 'bold', fontSize: 7.5 },
    },
    styles: { fontSize: 8, cellPadding: 2, valign: 'middle', lineColor: [180, 180, 180] },
    alternateRowStyles: { fillColor: [245, 248, 255] },
  });

  return getLastAutoTableY(doc);
}

// ─── Observations Section ─────────────────────────────────────────────────────

function drawObservations(doc: jsPDF, y: number, text: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const w = pageWidth - margin * 2;

  // Title bar
  doc.setFillColor(30, 58, 138);
  doc.rect(margin, y, w, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('OBSERVACIONES GENERALES DEL PERÍODO', margin + 3, y + 4.2);
  doc.setTextColor(0, 0, 0);

  // Content box
  const boxH = 22;
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.rect(margin, y + 6, w, boxH);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  const wrapped = doc.splitTextToSize(text || 'Sin observaciones para este período.', w - 6);
  doc.text(wrapped, margin + 3, y + 11);

  return y + 6 + boxH + 3;
}

// ─── Signatures ───────────────────────────────────────────────────────────────

function drawSignatures(doc: jsPDF, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const usableWidth = pageWidth - margin * 2;
  const lineLen = 50;
  const spacing = (usableWidth - lineLen * 3) / 2; // even gaps between the 3 blocks

  const positions = [
    { x: margin, label: 'RECTOR(A)', sub: 'Firma y Sello' },
    { x: margin + lineLen + spacing, label: 'DIRECTOR(A) DE GRUPO', sub: 'Firma' },
    { x: margin + (lineLen + spacing) * 2, label: 'ACUDIENTE', sub: 'Firma y C.C.' },
  ];

  doc.setFontSize(7.5);
  positions.forEach(({ x, label, sub }) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.line(x, y + 16, x + lineLen, y + 16);
    doc.setFont('helvetica', 'bold');
    doc.text(label, x + lineLen / 2, y + 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text(sub, x + lineLen / 2, y + 24, { align: 'center' });
    doc.setFontSize(7.5);
  });

  return y + 30;
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function drawFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const y = pageHeight - 10;

  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.8);
  doc.line(margin, y - 4, pageWidth - margin, y - 4);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  doc.text(
    `${INST.name}  •  ${INST.address}  •  ${INST.nit}`,
    pageWidth / 2, y,
    { align: 'center' }
  );
  doc.setTextColor(0, 0, 0);
}

// ─── Watermark ────────────────────────────────────────────────────────────────

function drawWatermark(doc: jsPDF, logoB64: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  setDocumentOpacity(doc, 0.05);
  const sz = 120;
  doc.addImage(logoB64, 'JPEG', (pageWidth - sz) / 2, (pageHeight - sz) / 2, sz, sz);
  setDocumentOpacity(doc, 1);
}

// ─── Main Export Entry Point ──────────────────────────────────────────────────

export async function generateReportCard(
  student: Student,
  period: Period,
  allGradeRecords: DetailedGradeRecord[],
  classSchedules: { subject_id: string }[],
  allPeriods: Period[],
  reportSummary?: ReportCardStudentSummary,
  deliveryDate?: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' });
  const logoB64 = await getLogoBase64();

  if (logoB64) drawWatermark(doc, logoB64);

  // 1. Header
  let y = await drawHeader(doc, logoB64);

  // 2. Title banner
  const isPre = isPreescolar(student.grades?.name);
  y = drawTitleBanner(doc, y, isPre);

  // 3. Student info
  y = drawStudentInfo(doc, student, period, y, reportSummary, deliveryDate);

  // 4. Scale legend
  y = drawScaleLegend(doc, y);

  // 5. Build period_id → column index map
  //    allPeriods comes sorted by start_date from the DB query.
  //    Index 0 → column "1" (P1), Index 1 → column "2" (P2), etc.
  const periodIdToIndex: Record<string, string> = {};
  allPeriods.forEach((p, idx) => {
    periodIdToIndex[p.id] = String(idx + 1); // '1', '2', '3', '4'
  });

  // 6. Build subjects map
  const subjectsMap: Record<string, SubjectGroup> = {};

  allGradeRecords.forEach(record => {
    if (!record.subjects) return;
    const sid = record.subjects.id;
    if (!subjectsMap[sid]) {
      subjectsMap[sid] = {
        name: record.subjects.name,
        ihs: classSchedules.filter(s => s.subject_id === sid).length,
        grades: {},
        currentRecord: null,
      };
    }

    // Use period_id to determine column key ('1','2','3','4')
    const colKey = periodIdToIndex[record.period_id];
    if (colKey) {
      subjectsMap[sid].grades[colKey] = record;
    }

    if (record.period_id === period.id) {
      subjectsMap[sid].currentRecord = record;
    }
  });

  // 6. Grade table
  let tableEndY: number;
  if (isPre) {
    tableEndY = buildPreescolarTable(doc, subjectsMap, period, allPeriods, y + 2);
  } else {
    tableEndY = buildPrimariaTable(doc, subjectsMap, period, allPeriods, y + 2);
  }

  y = tableEndY + 4;

  // 7. Observations (use first subject's comments as general observation)
  const obsText = Object.values(subjectsMap)
    .map(s => s.currentRecord?.comments)
    .filter(Boolean)
    .join(' | ') || '';
  y = drawObservations(doc, y, obsText);

  // 8. Signatures
  y = drawSignatures(doc, y);

  // 9. Footer
  drawFooter(doc);

  return doc;
}

export async function downloadReportCard(
  student: Student,
  period: Period,
  allGradeRecords: DetailedGradeRecord[],
  classSchedules: { subject_id: string }[],
  allPeriods: Period[],
  reportSummary?: ReportCardStudentSummary,
  deliveryDate?: string
) {
  const doc = await generateReportCard(
    student,
    period,
    allGradeRecords,
    classSchedules,
    allPeriods,
    reportSummary,
    deliveryDate,
  );
  const name = `Boletin_${student.full_name.replace(/\s+/g, '_')}_${period.name.replace(/\s+/g, '_')}.pdf`;
  doc.save(name);
}

// ─── Schedule PDF (unchanged logic, kept for compatibility) ───────────────────

const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

interface ScheduleEntry {
  subjects: { name: string; color: string } | null;
  teachers: { full_name: string } | null;
  start_time: string | null;
  end_time: string | null;
  day_of_week: number;
}

export async function generateSchedulePDF(
  gradeName: string,
  schedules: ScheduleEntry[],
  timeSlots: string[]
) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logoB64 = await getLogoBase64();

  if (logoB64) {
    setDocumentOpacity(doc, 0.08);
    doc.addImage(logoB64, 'JPEG', (pageWidth - 140) / 2, (pageHeight - 140) / 2, 140, 140);
    setDocumentOpacity(doc, 1);
  }

  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 40, 'F');
  if (logoB64) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(10, 5, 30, 30, 3, 3, 'F');
    doc.addImage(logoB64, 'JPEG', 12, 7, 26, 26);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(INST.name, pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text(`HORARIO DE CLASES — ${gradeName.toUpperCase()}`, pageWidth / 2, 30, { align: 'center' });

  const getEntry = (day: number, time: string) =>
    schedules.find(s => s.day_of_week === day && s.start_time?.slice(0, 5) === time);

  const body = timeSlots.map(time => {
    const row: string[] = [time];
    for (let d = 0; d < 5; d++) {
      const e = getEntry(d, time);
      row.push(e?.subjects
        ? `${e.subjects.name}\n${e.teachers?.full_name || ''}\n${e.start_time?.slice(0, 5)} – ${e.end_time?.slice(0, 5)}`
        : '—');
    }
    return row;
  });

  autoTable(doc, {
    startY: 50,
    head: [['Hora', ...dayNames]],
    body,
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 11 },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 50, halign: 'center' },
      2: { cellWidth: 50, halign: 'center' },
      3: { cellWidth: 50, halign: 'center' },
      4: { cellWidth: 50, halign: 'center' },
      5: { cellWidth: 50, halign: 'center' },
    },
    styles: { fontSize: 9, cellPadding: 4, valign: 'middle' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  const footerY = pageHeight - 12;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, footerY - 4, pageWidth - 14, footerY - 4);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`${INST.name}  •  ${new Date().toLocaleDateString('es-CO')}`, pageWidth / 2, footerY, { align: 'center' });

  return doc;
}

export async function downloadSchedulePDF(
  gradeName: string,
  schedules: ScheduleEntry[],
  timeSlots: string[]
) {
  const doc = await generateSchedulePDF(gradeName, schedules, timeSlots);
  doc.save(`Horario_${gradeName.replace(/\\s+/g, '_')}.pdf`);
}

// ─── Attendance List PDF ──────────────────────────────────────────────────────

export async function generateAttendanceListPDF(
  gradeName: string,
  students: { full_name: string }[],
  periodName: string = '',
  teacherName: string = '',
  subjectName: string = ''
) {
  const doc = new jsPDF('portrait');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logoB64 = await getLogoBase64();

  // Outer border with lila color
  doc.setDrawColor(180, 130, 255);
  doc.setLineWidth(0.5);
  doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

  if (logoB64) {
    doc.addImage(logoB64, 'JPEG', 12, 8, 24, 24);
  }

  // Title
  doc.setTextColor(240, 90, 70); // Coral/Orange
  doc.setFontSize(36);
  // Using helvetica bold-italic as a fallback for decorative/cursive
  doc.setFont('helvetica', 'italic');
  doc.text('LISTA de ASISTENCIA', pageWidth / 2 + 10, 24, { align: 'center' });

  // 2. Tabla de Datos Generales
  const cyanBg: [number, number, number] = [0, 230, 240];
  const lilaBorder: [number, number, number] = [180, 130, 255];
  
  const formattedPeriod = periodName || `${new Date().getFullYear()}-1`;
  const formattedTeacher = teacherName || '________________________';
  const formattedSubject = subjectName || '________________________';

  autoTable(doc, {
    startY: 34,
    body: [
      [`Escuela: ${INST.name}`, `Profesor:    ${formattedTeacher}`],
      [`Grado/grupo:    ${gradeName.toUpperCase()}`, `Materia:    ${formattedSubject}`],
      [`Ciclo escolar:    ${new Date().getFullYear()}`, `Periodo:    ${formattedPeriod}`]
    ],
    theme: 'grid',
    styles: { 
      fontSize: 10, 
      fontStyle: 'bold', 
      textColor: 0, 
      lineColor: lilaBorder, 
      lineWidth: 0.3,
      cellPadding: 2.5
    },
    columnStyles: {
      0: { cellWidth: pageWidth / 2 - 8 },
      1: { cellWidth: pageWidth / 2 - 8 }
    },
    margin: { left: 8 },
    didParseCell: (data) => {
      // Row 0 and Row 2 have cyan background
      if (data.row.index === 0 || data.row.index === 2) {
        data.cell.styles.fillColor = cyanBg;
      } else {
        data.cell.styles.fillColor = [255, 255, 255];
      }
    }
  });

  const table1EndY = getLastAutoTableY(doc) + 2;

  // 3. Estructura de la Tabla de Asistencia
  // Prepare headers
  const head: AutoTableCell[][] = [
    [
      { content: '', rowSpan: 2 },
      { content: 'Alumnos', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontSize: 10 } },
      { content: 'Semana 1', colSpan: 5, styles: { fillColor: [255, 245, 180], halign: 'center', textColor: 0 } },
      { content: 'Semana 2', colSpan: 5, styles: { fillColor: [230, 210, 245], halign: 'center', textColor: 0 } },
      { content: 'Semana 3', colSpan: 5, styles: { fillColor: [255, 245, 180], halign: 'center', textColor: 0 } },
      { content: 'Semana 4', colSpan: 5, styles: { fillColor: [210, 245, 210], halign: 'center', textColor: 0 } },
      { content: 'Semana 5', colSpan: 5, styles: { fillColor: [190, 240, 255], halign: 'center', textColor: 0 } },
      // Use vertical newlines to force row height and keep column narrow, text will be invisible and overdrawn later
      { content: '\n\n\n\n\n\n\n', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontSize: 3, textColor: [255,255,255], cellWidth: 4 } }, 
      { content: '\n\n\n\n\n\n\n', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontSize: 3, textColor: [255,255,255], cellWidth: 4 } },
      { content: '\n\n\n\n\n\n\n', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontSize: 3, textColor: [255,255,255], cellWidth: 4 } }
    ],
    [
      // Días (5 x 5 = 25 columnas)
      ...'LMMJV'.split(''),
      ...'LMMJV'.split(''),
      ...'LMMJV'.split(''),
      ...'LMMJV'.split(''),
      ...'LMMJV'.split('')
    ]
  ];

  // Prepare body: 23 rows or students.length
  const sortedStudents = [...students].sort((a, b) => a.full_name.localeCompare(b.full_name));
  const rowCount = Math.max(23, sortedStudents.length);
  const body = [];

  for (let i = 0; i < rowCount; i++) {
    const sName = i < sortedStudents.length ? sortedStudents[i].full_name.toUpperCase() : '';
    const num = (i + 1).toString().padStart(2, '0');
    // 27 empty strings for days (25) + resumen (3) - wait 25 + 3 = 28 empty elements
    body.push([num, sName, ...Array(28).fill('')]);
  }

  autoTable(doc, {
    startY: table1EndY,
    head,
    body,
    theme: 'grid',
    margin: { left: 8, right: 8 },
    styles: { 
      fontSize: 6, 
      cellPadding: 1, 
      lineColor: lilaBorder, 
      lineWidth: 0.2, 
      textColor: 0 
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 5, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 45 },
      // Días: 2 to 26
      // Resumen: 27, 28, 29
    },
    didParseCell: (data) => {
      // Set background colors for days columns
      const col = data.column.index;
      if (col >= 2 && col <= 6) data.cell.styles.fillColor = [255, 245, 180]; // Sem 1
      else if (col >= 7 && col <= 11) data.cell.styles.fillColor = [230, 210, 245]; // Sem 2
      else if (col >= 12 && col <= 16) data.cell.styles.fillColor = [255, 245, 180]; // Sem 3
      else if (col >= 17 && col <= 21) data.cell.styles.fillColor = [210, 245, 210]; // Sem 4
      else if (col >= 22 && col <= 26) data.cell.styles.fillColor = [190, 240, 255]; // Sem 5
      else if (col >= 27) data.cell.styles.fillColor = [255, 255, 255]; // Resumen (white background)

      // Set 'L M M J V' headers to center alignment and bold
      if (data.section === 'head' && data.row.index === 1) {
        data.cell.styles.halign = 'center';
        data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawCell: (data) => {
      // Draw vertical text for Resumen headers
      if (data.section === 'head' && data.row.index === 0 && data.column.index >= 27) {
        let text = '';
        if (data.column.index === 27) text = 'Faltas';
        if (data.column.index === 28) text = 'Justificadas';
        if (data.column.index === 29) text = 'Asistencias';
        
        doc.setTextColor(0);
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        
        // Save current graphics state
        doc.saveGraphicsState();
        const textWidth = doc.getTextWidth(text);
        // Center text vertically by moving y down by half text width
        doc.text(text, data.cell.x + data.cell.width / 2 + 1.5, data.cell.y + data.cell.height / 2 + textWidth / 2, { angle: 90 });
        doc.restoreGraphicsState();
      }
    }
  });

  // Bottom color bar (naranja)
  const bottomMargin = pageHeight - 8;
  doc.setFillColor(240, 90, 70);
  doc.rect(8, bottomMargin, pageWidth - 16, 4, 'F');

  return doc;
}

export async function downloadAttendanceListPDF(
  gradeName: string,
  students: { full_name: string }[],
  periodName: string = '',
  teacherName: string = '',
  subjectName: string = ''
) {
  const doc = await generateAttendanceListPDF(gradeName, students, periodName, teacherName, subjectName);
  doc.save(`Asistencia_${gradeName.replace(/\\s+/g, '_')}_${subjectName.replace(/\\s+/g, '_')}.pdf`);
}

// ─── Grading Template PDF ─────────────────────────────────────────────────────

export async function generateGradingTemplatePDF(
  gradeName: string,
  students: { full_name: string }[],
  periodName: string = '',
  teacherName: string = '',
  subjectName: string = ''
) {
  const doc = new jsPDF('portrait');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logoB64 = await getLogoBase64();

  if (logoB64) {
    setDocumentOpacity(doc, 0.05);
    doc.addImage(logoB64, 'JPEG', (pageWidth - 120) / 2, (pageHeight - 120) / 2, 120, 120);
    setDocumentOpacity(doc, 1);
  }

  // Header Title
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 28, 'F');
  
  if (logoB64) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, 4, 20, 20, 2, 2, 'F');
    doc.addImage(logoB64, 'JPEG', 13, 5, 18, 18);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(INST.name, pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`PLANTILLA PARA NOTAS — GRADO ${gradeName.toUpperCase()}`, pageWidth / 2, 20, { align: 'center' });

  const formattedPeriod = periodName || '______';
  const formattedTeacher = teacherName || '________________________';
  const formattedSubject = subjectName || '________________________';

  // Fields to fill by teacher
  doc.setTextColor(0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`DOCENTE:  ${formattedTeacher}      ASIGNATURA:  ${formattedSubject}      PERÍODO:  ${formattedPeriod}`, 14, 38);

  const head = [['N°', 'NOMBRES Y APELLIDOS', 'N1', 'N2', 'N3', 'N4', 'N5', 'DEF', 'OBSERVACIONES']];

  // Sort students alphabetically
  const sortedStudents = [...students].sort((a, b) => a.full_name.localeCompare(b.full_name));

  const body = sortedStudents.map((student, index) => {
    return [
      (index + 1).toString(),
      student.full_name.toUpperCase(),
      '', '', '', '', '', '', '' // empty cells
    ];
  });

  const HEAD_FILL: [number, number, number] = [30, 58, 138];

  autoTable(doc, {
    startY: 45,
    head,
    body,
    theme: 'grid',
    headStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 65 },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 12, halign: 'center' },
      7: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
      8: { cellWidth: 'auto' }, // observaciones
    },
    styles: { fontSize: 8, cellPadding: 2, valign: 'middle', lineColor: [180, 180, 180], minCellHeight: 7 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Footer
  const footerY = pageHeight - 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, footerY - 4, pageWidth - 14, footerY - 4);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`${INST.name}  •  Generado el ${new Date().toLocaleDateString('es-CO')}`, pageWidth / 2, footerY + 2, { align: 'center' });

  return doc;
}

export async function downloadGradingTemplatePDF(
  gradeName: string,
  students: { full_name: string }[],
  periodName: string = '',
  teacherName: string = '',
  subjectName: string = ''
) {
  const doc = await generateGradingTemplatePDF(gradeName, students, periodName, teacherName, subjectName);
  doc.save(`Plantilla_Notas_${gradeName.replace(/\\s+/g, '_')}_${subjectName.replace(/\\s+/g, '_')}.pdf`);
}
