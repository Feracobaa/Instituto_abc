import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getInstInfo, getLogoBase64, setDocumentOpacity } from "./pdfCore";
import type { PdfInstitutionData } from "./types";

export async function generateGradingTemplatePDF(
  gradeName: string,
  students: { full_name: string }[],
  periodName: string = "",
  teacherName: string = "",
  subjectName: string = "",
  instData?: PdfInstitutionData
) {
  const info = getInstInfo(instData);
  const doc = new jsPDF("portrait");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logoB64 = await getLogoBase64(info.logoUrl);

  if (logoB64) {
    setDocumentOpacity(doc, 0.05);
    try {
      doc.addImage(logoB64, "JPEG", (pageWidth - 120) / 2, (pageHeight - 120) / 2, 120, 120);
    } catch {
      // Fallback
    }
    setDocumentOpacity(doc, 1);
  }

  // Título Superior
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 28, "F");

  if (logoB64) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(12, 4, 20, 20, 2, 2, "F");
      doc.addImage(logoB64, "JPEG", 13, 5, 18, 18);
    } catch {
      // Fallback
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(info.name, pageWidth / 2, 12, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`PLANTILLA PARA NOTAS — GRADO ${gradeName.toUpperCase()}`, pageWidth / 2, 20, {
    align: "center",
  });

  const formattedPeriod = periodName || "______";
  const formattedTeacher = teacherName || "________________________";
  const formattedSubject = subjectName || "________________________";

  // Campos de encabezado
  doc.setTextColor(0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(
    `DOCENTE:  ${formattedTeacher}      ASIGNATURA:  ${formattedSubject}      PERÍODO:  ${formattedPeriod}`,
    14,
    38
  );

  const head = [["N°", "NOMBRES Y APELLIDOS", "N1", "N2", "N3", "N4", "N5", "DEF", "OBSERVACIONES"]];
  const sortedStudents = [...students].sort((a, b) => a.full_name.localeCompare(b.full_name));

  const body = sortedStudents.map((student, index) => {
    return [
      (index + 1).toString(),
      student.full_name.toUpperCase(),
      "", "", "", "", "", "", "", // celdas en blanco para diligenciar
    ];
  });

  const HEAD_FILL: [number, number, number] = [30, 58, 138];

  autoTable(doc, {
    startY: 45,
    head,
    body,
    theme: "grid",
    headStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: "bold", fontSize: 8, halign: "center" },
    columnStyles: {
      0: { cellWidth: 10, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 65 },
      2: { cellWidth: 12, halign: "center" },
      3: { cellWidth: 12, halign: "center" },
      4: { cellWidth: 12, halign: "center" },
      5: { cellWidth: 12, halign: "center" },
      6: { cellWidth: 12, halign: "center" },
      7: { cellWidth: 15, halign: "center", fontStyle: "bold" },
      8: { cellWidth: "auto" },
    },
    styles: { fontSize: 8, cellPadding: 2, valign: "middle", lineColor: [180, 180, 180], minCellHeight: 7 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Pie de página
  const footerY = pageHeight - 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, footerY - 4, pageWidth - 14, footerY - 4);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `${info.name}  •  Generado el ${new Date().toLocaleDateString("es-CO")}`,
    pageWidth / 2,
    footerY + 2,
    { align: "center" }
  );

  return doc;
}

export async function downloadGradingTemplatePDF(
  gradeName: string,
  students: { full_name: string }[],
  periodName: string = "",
  teacherName: string = "",
  subjectName: string = "",
  instData?: PdfInstitutionData
) {
  const doc = await generateGradingTemplatePDF(
    gradeName,
    students,
    periodName,
    teacherName,
    subjectName,
    instData
  );
  doc.save(`Plantilla_Notas_${gradeName.replace(/\s+/g, "_")}_${subjectName.replace(/\s+/g, "_")}.pdf`);
}
