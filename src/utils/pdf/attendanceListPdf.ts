import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getInstInfo, getLastAutoTableY, getLogoBase64 } from "./pdfCore";
import type { AutoTableCell, PdfInstitutionData, Student } from "./types";

export async function generateAttendanceListPDF(
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

  // Borde exterior color lila
  const lilaBorder: [number, number, number] = [180, 130, 255];
  doc.setDrawColor(...lilaBorder);
  doc.setLineWidth(0.5);
  doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

  if (logoB64) {
    try {
      doc.addImage(logoB64, "JPEG", 12, 8, 24, 24);
    } catch {
      // Fallback
    }
  }

  // Título
  doc.setTextColor(240, 90, 70); // Coral
  doc.setFontSize(36);
  doc.setFont("helvetica", "italic");
  doc.text("LISTA de ASISTENCIA", pageWidth / 2 + 10, 24, { align: "center" });

  // 2. Tabla de Datos Generales
  const cyanBg: [number, number, number] = [0, 230, 240];
  const formattedPeriod = periodName || `${new Date().getFullYear()}-1`;
  const formattedTeacher = teacherName || "________________________";
  const formattedSubject = subjectName || "________________________";

  autoTable(doc, {
    startY: 34,
    body: [
      [`Escuela: ${info.name}`, `Profesor:    ${formattedTeacher}`],
      [`Grado/grupo:    ${gradeName.toUpperCase()}`, `Materia:    ${formattedSubject}`],
      [`Ciclo escolar:    ${new Date().getFullYear()}`, `Periodo:    ${formattedPeriod}`],
    ],
    theme: "grid",
    styles: {
      fontSize: 10,
      fontStyle: "bold",
      textColor: 0,
      lineColor: lilaBorder,
      lineWidth: 0.3,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: pageWidth / 2 - 8 },
      1: { cellWidth: pageWidth / 2 - 8 },
    },
    margin: { left: 8 },
    didParseCell: (data) => {
      if (data.row.index === 0 || data.row.index === 2) {
        data.cell.styles.fillColor = cyanBg;
      } else {
        data.cell.styles.fillColor = [255, 255, 255];
      }
    },
  });

  const table1EndY = getLastAutoTableY(doc) + 2;

  // 3. Estructura de la Tabla de Asistencia
  const head: AutoTableCell[][] = [
    [
      { content: "", rowSpan: 2 },
      { content: "Alumnos", rowSpan: 2, styles: { halign: "center", valign: "middle", fontSize: 10 } },
      { content: "Semana 1", colSpan: 5, styles: { fillColor: [255, 245, 180], halign: "center", textColor: 0 } },
      { content: "Semana 2", colSpan: 5, styles: { fillColor: [230, 210, 245], halign: "center", textColor: 0 } },
      { content: "Semana 3", colSpan: 5, styles: { fillColor: [255, 245, 180], halign: "center", textColor: 0 } },
      { content: "Semana 4", colSpan: 5, styles: { fillColor: [210, 245, 210], halign: "center", textColor: 0 } },
      { content: "Semana 5", colSpan: 5, styles: { fillColor: [190, 240, 255], halign: "center", textColor: 0 } },
      {
        content: "\n\n\n\n\n\n\n",
        rowSpan: 2,
        styles: { halign: "center", valign: "middle", fontSize: 3, textColor: [255, 255, 255], cellWidth: 4 },
      },
      {
        content: "\n\n\n\n\n\n\n",
        rowSpan: 2,
        styles: { halign: "center", valign: "middle", fontSize: 3, textColor: [255, 255, 255], cellWidth: 4 },
      },
      {
        content: "\n\n\n\n\n\n\n",
        rowSpan: 2,
        styles: { halign: "center", valign: "middle", fontSize: 3, textColor: [255, 255, 255], cellWidth: 4 },
      },
    ],
    [
      ..."LMMJV".split(""),
      ..."LMMJV".split(""),
      ..."LMMJV".split(""),
      ..."LMMJV".split(""),
      ..."LMMJV".split(""),
    ],
  ];

  const sortedStudents = [...students].sort((a, b) => a.full_name.localeCompare(b.full_name));
  const rowCount = Math.max(23, sortedStudents.length);
  const body = [];

  for (let i = 0; i < rowCount; i++) {
    const sName = i < sortedStudents.length ? sortedStudents[i].full_name.toUpperCase() : "";
    const num = (i + 1).toString().padStart(2, "0");
    body.push([num, sName, ...Array(28).fill("")]);
  }

  autoTable(doc, {
    startY: table1EndY,
    head,
    body,
    theme: "grid",
    margin: { left: 8, right: 8 },
    styles: {
      fontSize: 6,
      cellPadding: 1,
      lineColor: lilaBorder,
      lineWidth: 0.2,
      textColor: 0,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 5, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 45 },
    },
    didParseCell: (data) => {
      const col = data.column.index;
      if (col >= 2 && col <= 6) data.cell.styles.fillColor = [255, 245, 180];
      else if (col >= 7 && col <= 11) data.cell.styles.fillColor = [230, 210, 245];
      else if (col >= 12 && col <= 16) data.cell.styles.fillColor = [255, 245, 180];
      else if (col >= 17 && col <= 21) data.cell.styles.fillColor = [210, 245, 210];
      else if (col >= 22 && col <= 26) data.cell.styles.fillColor = [190, 240, 255];
      else if (col >= 27) data.cell.styles.fillColor = [255, 255, 255];

      if (data.section === "head" && data.row.index === 1) {
        data.cell.styles.halign = "center";
        data.cell.styles.fontStyle = "bold";
      }
    },
    didDrawCell: (data) => {
      if (data.section === "head" && data.row.index === 0 && data.column.index >= 27) {
        let text = "";
        if (data.column.index === 27) text = "Faltas";
        if (data.column.index === 28) text = "Justificadas";
        if (data.column.index === 29) text = "Asistencias";

        doc.setTextColor(0);
        doc.setFontSize(5.5);
        doc.setFont("helvetica", "normal");

        doc.saveGraphicsState();
        const textWidth = doc.getTextWidth(text);
        doc.text(text, data.cell.x + data.cell.width / 2 + 1.5, data.cell.y + data.cell.height / 2 + textWidth / 2, {
          angle: 90,
        });
        doc.restoreGraphicsState();
      }
    },
  });

  const bottomMargin = pageHeight - 8;
  doc.setFillColor(240, 90, 70);
  doc.rect(8, bottomMargin, pageWidth - 16, 4, "F");

  return doc;
}

export async function downloadAttendanceListPDF(
  gradeName: string,
  students: { full_name: string }[],
  periodName: string = "",
  teacherName: string = "",
  subjectName: string = "",
  instData?: PdfInstitutionData
) {
  const doc = await generateAttendanceListPDF(
    gradeName,
    students,
    periodName,
    teacherName,
    subjectName,
    instData
  );
  doc.save(`Asistencia_${gradeName.replace(/\s+/g, "_")}_${subjectName.replace(/\s+/g, "_")}.pdf`);
}
