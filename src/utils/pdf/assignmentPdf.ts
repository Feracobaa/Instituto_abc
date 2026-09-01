import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  drawInstitutionalHeader,
  drawWatermark,
  loadLogoBase64,
} from "./pdfCore";
import {
  FALLBACK_INST,
  type AssignmentPdfData,
  type AutoTableCapableDoc,
  type PdfInstitutionData,
} from "./types";

function drawTitleBanner(doc: jsPDF, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const height = 8.5;

  doc.setFillColor(30, 58, 138); // Azul institucional
  doc.rect(margin, y, pageWidth - margin * 2, height, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(
    "GUÍA DE APRENDIZAJE, TAREA Y COMPROMISO ACADÉMICO",
    pageWidth / 2,
    y + 5.8,
    { align: "center" }
  );

  return y + height + 3.5;
}

function drawAssignmentFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  instData?: PdfInstitutionData
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const y = pageHeight - 9;
  const instName = instData?.name || FALLBACK_INST.name;

  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.5);
  doc.line(margin, y - 3.5, pageWidth - margin, y - 3.5);

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Documento oficial generado por la Plataforma del ${instName} • Consulta y entrega virtual`,
    margin,
    y
  );
  doc.text(
    `Página ${pageNumber} de ${totalPages}`,
    pageWidth - margin,
    y,
    { align: "right" }
  );
}

function formatLongDate(dateStr?: string | null): string {
  if (!dateStr) return "Sin fecha estipulada";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const formatted = d.toLocaleDateString("es-CO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = d.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${formatted.charAt(0).toUpperCase() + formatted.slice(1)} - ${timeStr}`;
  } catch {
    return dateStr || "Sin fecha";
  }
}

export async function generateAssignmentPDF(
  assignment: AssignmentPdfData,
  instData?: PdfInstitutionData
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const logoB64 = await loadLogoBase64(instData?.logoUrl);

  if (logoB64) {
    drawWatermark(doc, logoB64, 0.04, 110);
  }

  let y = drawInstitutionalHeader(doc, logoB64, instData);
  y = drawTitleBanner(doc, y);

  const teacherDisplay =
    assignment.teacherName &&
    assignment.teacherName.trim() !== "" &&
    assignment.teacherName !== "Docente"
      ? assignment.teacherName
      : "Docente Titular de la Asignatura";

  const formattedDueDate = formatLongDate(assignment.dueDate);

  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [
      [
        {
          content: "FICHA TÉCNICA Y DATOS GENERALES DE LA ACTIVIDAD",
          colSpan: 4,
          styles: {
            fillColor: [30, 58, 138],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center",
            fontSize: 8.5,
            cellPadding: 2.2,
          },
        },
      ],
    ],
    body: [
      [
        { content: "Título de la Tarea:", styles: { fontStyle: "bold", cellWidth: 36 } },
        { content: assignment.title, colSpan: 3, styles: { fontStyle: "bold", textColor: [30, 58, 138] } },
      ],
      [
        { content: "Asignatura:", styles: { fontStyle: "bold" } },
        { content: assignment.subjectName.toUpperCase() },
        { content: "Grado / Nivel:", styles: { fontStyle: "bold", cellWidth: 30 } },
        { content: assignment.gradeName.toUpperCase() },
      ],
      [
        { content: "Docente Responsable:", styles: { fontStyle: "bold" } },
        {
          content: assignment.teacherEmail
            ? `${teacherDisplay}\n(${assignment.teacherEmail})`
            : teacherDisplay,
        },
        { content: "Período Escolar:", styles: { fontStyle: "bold" } },
        { content: assignment.periodName ? assignment.periodName.toUpperCase() : "Vigente" },
      ],
      [
        { content: "Estudiante / Grupo:", styles: { fontStyle: "bold" } },
        { content: assignment.studentName || `Estudiantes del Grado ${assignment.gradeName}` },
        { content: "Fecha Límite:", styles: { fontStyle: "bold", textColor: [185, 28, 28] } },
        { content: formattedDueDate, styles: { fontStyle: "bold", textColor: [185, 28, 28] } },
      ],
    ],
    styles: {
      fontSize: 7.8,
      cellPadding: 2,
      lineColor: [210, 215, 225],
      lineWidth: 0.2,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { fillColor: [245, 247, 250] },
      2: { fillColor: [245, 247, 250] },
    },
  });

  const lastTableY = (doc as AutoTableCapableDoc).lastAutoTable?.finalY ?? y + 40;
  y = lastTableY + 6;

  const sectionWidth = pageWidth - margin * 2;

  doc.setFillColor(238, 242, 255);
  doc.rect(margin, y, sectionWidth, 7, "F");
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.6);
  doc.line(margin, y, margin, y + 7);

  doc.setTextColor(30, 58, 138);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("1. OBJETIVOS E INSTRUCCIONES DETALLADAS DE LA ACTIVIDAD", margin + 3.5, y + 4.8);

  y += 10.5;

  const cleanDescription =
    (assignment.description || "")
      .replace(/<[^>]*>?/gm, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim() || "Desarrollar la actividad académica siguiendo las indicaciones brindadas en clase.";

  doc.setFontSize(8.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 50, 70);

  const textLines = doc.splitTextToSize(cleanDescription, sectionWidth - 6);
  const lineHeight = 4.2;
  const totalTextHeight = textLines.length * lineHeight;
  const boxHeight = Math.max(totalTextHeight + 6, 26);

  if (y + boxHeight > pageHeight - 45) {
    doc.setFillColor(254, 254, 255);
    doc.setDrawColor(220, 226, 235);
    doc.setLineWidth(0.3);

    for (let i = 0; i < textLines.length; i++) {
      if (y > pageHeight - 30) {
        doc.addPage();
        if (logoB64) drawWatermark(doc, logoB64, 0.04, 110);
        y = drawInstitutionalHeader(doc, logoB64, instData);
        y = drawTitleBanner(doc, y);
      }
      doc.text(textLines[i], margin + 3, y);
      y += lineHeight;
    }
    y += 5;
  } else {
    doc.setFillColor(252, 253, 255);
    doc.setDrawColor(220, 226, 235);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, sectionWidth, boxHeight, "FD");

    doc.text(textLines, margin + 3.5, y + 5);
    y += boxHeight + 6;
  }

  if (y + 35 > pageHeight - 25) {
    doc.addPage();
    if (logoB64) drawWatermark(doc, logoB64, 0.04, 110);
    y = drawInstitutionalHeader(doc, logoB64, instData);
  }

  doc.setFillColor(240, 253, 244);
  doc.rect(margin, y, sectionWidth, 6.5, "F");
  doc.setDrawColor(22, 101, 52);
  doc.setLineWidth(0.6);
  doc.line(margin, y, margin, y + 6.5);

  doc.setTextColor(22, 101, 52);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text("2. CRITERIOS DE PRESENTACIÓN Y PAUTAS DE ENTREGA VIRTUAL", margin + 3.5, y + 4.5);

  y += 9.5;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(209, 230, 215);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, sectionWidth, 23, "FD");

  doc.setFontSize(7.3);
  doc.setTextColor(50, 65, 80);
  doc.setFont("helvetica", "bold");
  doc.text("• Desarrollo en Cuaderno:", margin + 3.5, y + 4.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Realizar el trabajo de forma ordenada con letra clara y legible, rotulando título, fecha y nombre completo.",
    margin + 36,
    y + 4.5
  );

  doc.setFont("helvetica", "bold");
  doc.text("• Evidencia en Escáner:", margin + 3.5, y + 10.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Al cargar la fotografía en el Portal, el Optimizador de Escáner binarizará automáticamente la imagen a B/N (~30 KB).",
    margin + 36,
    y + 10.5
  );

  doc.setFont("helvetica", "bold");
  doc.text("• Entrega Oportuna:", margin + 3.5, y + 16.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Enviar antes de ${formattedDueDate} para optar por la máxima calificación en la rúbrica institucional.`,
    margin + 36,
    y + 16.5
  );

  y += 28;

  if (y + 24 <= pageHeight - 20) {
    const colWidth = (sectionWidth - 16) / 2;

    const x1 = margin + 4;
    doc.setDrawColor(120, 130, 145);
    doc.setLineWidth(0.4);
    doc.line(x1, y + 12, x1 + colWidth, y + 12);

    doc.setFontSize(7.2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(teacherDisplay, x1 + colWidth / 2, y + 15.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Docente Responsable / Asignatura", x1 + colWidth / 2, y + 19, { align: "center" });

    const x2 = margin + colWidth + 16;
    doc.line(x2, y + 12, x2 + colWidth, y + 12);

    doc.setFontSize(7.2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(
      assignment.studentName || "Firma del Estudiante / Acudiente",
      x2 + colWidth / 2,
      y + 15.5,
      { align: "center" }
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Compromiso y Entrega Académica", x2 + colWidth / 2, y + 19, { align: "center" });
  }

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawAssignmentFooter(doc, p, totalPages, instData);
  }

  return doc;
}

export async function downloadAssignmentPDF(
  assignment: AssignmentPdfData,
  instData?: PdfInstitutionData
) {
  const doc = await generateAssignmentPDF(assignment, instData);
  const safeSubject = (assignment.subjectName || "Materia")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .slice(0, 18);
  const safeTitle = (assignment.title || "Tarea")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .slice(0, 24);
  doc.save(`Guia_${safeSubject}_${safeTitle}.pdf`);
}
