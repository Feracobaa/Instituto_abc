/**
 * assignmentPdfGenerator.ts
 * Utilidad de Reconstrucción y Generación de Guías Académicas y Tareas en PDF.
 * Formato oficial institucional con membrete oficial, logotipo, metadatos,
 * instrucciones formateadas, pautas de evaluación y pie de página de seguridad.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FALLBACK_INST, type PdfInstitutionData } from "@/utils/pdfGenerator";

export interface AssignmentPdfData {
  title: string;
  subjectName: string;
  gradeName: string;
  teacherName: string;
  teacherEmail?: string | null;
  studentName?: string;
  periodName?: string;
  dueDate: string;
  createdDate?: string;
  description: string;
  attachmentUrl?: string | null;
}

interface AutoTableCapableDoc extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

interface GStateCapableDoc extends jsPDF {
  GState: new (options: { opacity: number }) => unknown;
  setGState: (state: unknown) => void;
}

/**
 * Carga el logotipo institucional en Base64 para el documento
 */
async function loadLogoBase64(url?: string): Promise<string | null> {
  try {
    const targetUrl = url || "/logo-iabc.jpg";
    const response = await fetch(targetUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function setDocumentOpacity(doc: jsPDF, opacity: number) {
  const pdf = doc as Partial<GStateCapableDoc>;
  if (pdf.GState && pdf.setGState) {
    pdf.setGState(new pdf.GState({ opacity }));
  }
}

function drawWatermark(doc: jsPDF, logoB64: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  setDocumentOpacity(doc, 0.04);
  const sz = 110;
  try {
    doc.addImage(logoB64, "JPEG", (pageWidth - sz) / 2, (pageHeight - sz) / 2, sz, sz);
  } catch {
    // Ignorar si el formato no es compatible
  }
  setDocumentOpacity(doc, 1);
}

function drawInstitutionalHeader(
  doc: jsPDF,
  logoB64: string | null,
  instData?: PdfInstitutionData
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const instName = (instData?.name || FALLBACK_INST.name).toUpperCase();
  const address = instData?.address || FALLBACK_INST.address;
  const phone = instData?.phone ? `Tel: ${instData.phone}` : FALLBACK_INST.phone;
  const nit = instData?.nit ? `NIT: ${instData.nit}` : FALLBACK_INST.nit;

  // Doble marco institucional
  doc.setDrawColor(30, 58, 138); // Azul institucional
  doc.setLineWidth(0.8);
  doc.rect(margin, 8, pageWidth - margin * 2, 36);

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.25);
  doc.rect(margin + 1.2, 9.2, pageWidth - margin * 2 - 2.4, 33.6);

  // Logotipo institucional izquierdo
  if (logoB64) {
    try {
      doc.addImage(logoB64, "JPEG", margin + 3.5, 11, 24, 24);
    } catch {
      // Fallback silencioso si la imagen no puede ser decodificada
    }
  }

  // Logotipo institucional derecho (espejado para balance oficial)
  if (logoB64) {
    try {
      doc.addImage(logoB64, "JPEG", pageWidth - margin - 27.5, 11, 24, 24);
    } catch {
      // Fallback silencioso
    }
  }

  // Bloque de texto central
  doc.setTextColor(30, 41, 59); // Slate oscuro
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(FALLBACK_INST.republic, pageWidth / 2, 14, { align: "center" });
  doc.text(FALLBACK_INST.ministry, pageWidth / 2, 18, { align: "center" });
  doc.text(FALLBACK_INST.department, pageWidth / 2, 22, { align: "center" });

  doc.setFontSize(9.5);
  doc.setTextColor(30, 58, 138);
  doc.text(instName, pageWidth / 2, 28, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`${address}  •  ${phone}  •  ${nit}`, pageWidth / 2, 34, { align: "center" });
  doc.text("SISTEMA DE GESTIÓN EDUCATIVA Y COMPROMISO ACADÉMICO", pageWidth / 2, 38.5, { align: "center" });

  return 47;
}

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

function drawFooter(doc: jsPDF, pageNumber: number, totalPages: number, instData?: PdfInstitutionData) {
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

/**
 * Formatea fechas en formato amigable en español
 */
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
    // Capitalizar primer letra del día
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

  // Cargar logotipo
  const logoB64 = await loadLogoBase64(instData?.logoUrl);

  // 1. Marca de agua
  if (logoB64) {
    drawWatermark(doc, logoB64);
  }

  // 2. Encabezado institucional oficial
  let y = drawInstitutionalHeader(doc, logoB64, instData);

  // 3. Cintillo de Título
  y = drawTitleBanner(doc, y);

  // 4. Metadatos de la Tarea (Grid Estructurada)
  const teacherDisplay = assignment.teacherName && assignment.teacherName.trim() !== "" && assignment.teacherName !== "Docente"
    ? assignment.teacherName
    : "Docente Titular de la Asignatura";

  const formattedDueDate = formatLongDate(assignment.dueDate);
  const formattedCreatedDate = formatLongDate(assignment.createdDate);

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

  // 5. Sección de Instrucciones y Contenido Pedagógico
  const sectionWidth = pageWidth - margin * 2;

  // Encabezado de sección
  doc.setFillColor(238, 242, 255); // Indigo muy claro
  doc.rect(margin, y, sectionWidth, 7, "F");
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.6);
  doc.line(margin, y, margin, y + 7); // Barra lateral de acento azul

  doc.setTextColor(30, 58, 138);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("1. OBJETIVOS E INSTRUCCIONES DETALLADAS DE LA ACTIVIDAD", margin + 3.5, y + 4.8);

  y += 10.5;

  // Formatear descripción limpia
  const cleanDescription = (assignment.description || "")
    .replace(/<[^>]*>?/gm, "") // Remover tags HTML
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

  // Dibujar caja contenedora de instrucciones
  const boxHeight = Math.max(totalTextHeight + 6, 26);

  // Verificar si cabe en la página actual
  if (y + boxHeight > pageHeight - 45) {
    // Si no cabe completo, escribir línea a línea con paginación
    doc.setFillColor(254, 254, 255);
    doc.setDrawColor(220, 226, 235);
    doc.setLineWidth(0.3);

    for (let i = 0; i < textLines.length; i++) {
      if (y > pageHeight - 30) {
        doc.addPage();
        if (logoB64) drawWatermark(doc, logoB64);
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

  // 6. Sección de Pautas de Entrega y Optimizador de Escáner
  if (y + 35 > pageHeight - 25) {
    doc.addPage();
    if (logoB64) drawWatermark(doc, logoB64);
    y = drawInstitutionalHeader(doc, logoB64, instData);
  }

  doc.setFillColor(240, 253, 244); // Verde sutil para pautas
  doc.rect(margin, y, sectionWidth, 6.5, "F");
  doc.setDrawColor(22, 101, 52); // Verde esmeralda
  doc.setLineWidth(0.6);
  doc.line(margin, y, margin, y + 6.5);

  doc.setTextColor(22, 101, 52);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text("2. CRITERIOS DE PRESENTACIÓN Y PAUTAS DE ENTREGA VIRTUAL", margin + 3.5, y + 4.5);

  y += 9.5;

  // Caja de recomendaciones
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

  // 7. Bloque de Firmas y Compromiso Escolar
  if (y + 24 <= pageHeight - 20) {
    const colWidth = (sectionWidth - 16) / 2;

    // Firma Docente
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

    // Firma Estudiante / Acudiente
    const x2 = margin + colWidth + 16;
    doc.line(x2, y + 12, x2 + colWidth, y + 12);

    doc.setFontSize(7.2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(assignment.studentName || "Firma del Estudiante / Acudiente", x2 + colWidth / 2, y + 15.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Compromiso y Entrega Académica", x2 + colWidth / 2, y + 19, { align: "center" });
  }

  // 8. Dibujar pie de página en todas las páginas generadas
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, p, totalPages, instData);
  }

  return doc;
}

export async function downloadAssignmentPDF(
  assignment: AssignmentPdfData,
  instData?: PdfInstitutionData
) {
  const doc = await generateAssignmentPDF(assignment, instData);
  const safeSubject = (assignment.subjectName || "Materia").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 18);
  const safeTitle = (assignment.title || "Tarea").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 24);
  doc.save(`Guia_${safeSubject}_${safeTitle}.pdf`);
}
