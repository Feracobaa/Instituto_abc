/**
 * assignmentPdfGenerator.ts
 * Utilidad de Reconstrucción Virtual de PDFs para Tareas.
 * Toma el contenido estructurado (JSON/texto) de la tarea y genera el PDF
 * dinámicamente en el cliente sin ocupar espacio en Supabase Storage.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FALLBACK_INST, PdfInstitutionData } from "@/utils/pdfGenerator";

export interface AssignmentPdfData {
  title: string;
  subjectName: string;
  gradeName: string;
  teacherName: string;
  dueDate: string;
  createdDate?: string;
  description: string;
  attachmentUrl?: string | null;
}

export async function generateAssignmentPDF(
  assignment: AssignmentPdfData,
  instData?: PdfInstitutionData
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const instName = instData?.name || FALLBACK_INST.name;

  // Header Institucional
  doc.setFillColor(30, 58, 138); // Azul institucional
  doc.rect(0, 0, pageWidth, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(instName.toUpperCase(), pageWidth / 2, 14, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("GUÍA DE TRABAJO Y COMPROMISO ACADÉMICO", pageWidth / 2, 23, { align: "center" });

  let y = 40;

  // Metadatos de la Tarea (Tabla Informativa)
  const formattedDueDate = assignment.dueDate
    ? new Date(assignment.dueDate).toLocaleDateString("es-CO", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Sin fecha";

  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [
      [
        { content: "DATOS GENERALES DE LA TAREA", colSpan: 2, styles: { fillColor: [30, 58, 138], halign: "center" } },
      ],
    ],
    body: [
      ["Título de la Tarea:", assignment.title],
      ["Asignatura:", assignment.subjectName.toUpperCase()],
      ["Grado:", assignment.gradeName.toUpperCase()],
      ["Docente Responsable:", assignment.teacherName],
      ["Fecha Límite de Entrega:", formattedDueDate],
    ],
    headStyles: { textColor: 255, fontStyle: "bold", fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: "bold", fontSize: 8.5 },
      1: { cellWidth: "auto", fontSize: 8.5 },
    },
    styles: { cellPadding: 2.5, lineColor: [200, 200, 200] },
  });

  const lastTableY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 90;
  y = lastTableY + 8;

  // Banner Sección Descripción / Instrucciones
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
  doc.setDrawColor(209, 213, 219);
  doc.rect(margin, y, pageWidth - margin * 2, 8, "S");

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.text("INSTRUCCIONES Y CONTENIDO DE LA ACTIVIDAD", margin + 4, y + 5.5);

  y += 12;

  // Texto de la instrucción / descripción
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);

  const cleanDescription = assignment.description.replace(/<[^>]*>?/gm, ""); // strip HTML tags
  const splitText = doc.splitTextToSize(cleanDescription || "Sin instrucciones detalladas.", pageWidth - margin * 2);
  doc.text(splitText, margin, y);

  y += splitText.length * 5 + 10;

  // Pie de Página
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.6);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(107, 114, 128);
  doc.text(
    `Documento generado virtualmente por el Portal del Instituto ABC • Imprime o descarga bajo demanda`,
    pageWidth / 2,
    pageHeight - 9,
    { align: "center" }
  );

  return doc;
}

export async function downloadAssignmentPDF(
  assignment: AssignmentPdfData,
  instData?: PdfInstitutionData
) {
  const doc = await generateAssignmentPDF(assignment, instData);
  const safeTitle = assignment.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
  doc.save(`Tarea_${assignment.subjectName}_${safeTitle}.pdf`);
}
