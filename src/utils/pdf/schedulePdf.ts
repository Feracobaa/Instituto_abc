import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getInstInfo, getLogoBase64, setDocumentOpacity } from "./pdfCore";
import type { PdfInstitutionData, ScheduleEntry } from "./types";

const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

export async function generateSchedulePDF(
  gradeName: string,
  schedules: ScheduleEntry[],
  timeSlots: string[],
  instData?: PdfInstitutionData
) {
  const info = getInstInfo(instData);
  const doc = new jsPDF("landscape");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logoB64 = await getLogoBase64(info.logoUrl);

  if (logoB64) {
    setDocumentOpacity(doc, 0.08);
    try {
      doc.addImage(logoB64, "JPEG", (pageWidth - 140) / 2, (pageHeight - 140) / 2, 140, 140);
    } catch {
      // Fallback
    }
    setDocumentOpacity(doc, 1);
  }

  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 40, "F");
  if (logoB64) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(10, 5, 30, 30, 3, 3, "F");
      doc.addImage(logoB64, "JPEG", 12, 7, 26, 26);
    } catch {
      // Fallback
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(info.name, pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text(`HORARIO DE CLASES — ${gradeName.toUpperCase()}`, pageWidth / 2, 30, { align: "center" });

  const getEntry = (day: number, time: string) =>
    schedules.find((s) => s.day_of_week === day && s.start_time?.slice(0, 5) === time);

  const body = timeSlots.map((time) => {
    const row: string[] = [time];
    for (let d = 0; d < 5; d++) {
      const e = getEntry(d, time);
      row.push(
        e?.subjects
          ? `${e.subjects.name}\n${e.teachers?.full_name || ""}\n${e.start_time?.slice(0, 5)} – ${e.end_time?.slice(0, 5)}`
          : "—"
      );
    }
    return row;
  });

  autoTable(doc, {
    startY: 50,
    head: [["Hora", ...dayNames]],
    body,
    theme: "grid",
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold", halign: "center", fontSize: 11 },
    columnStyles: {
      0: { cellWidth: 25, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 50, halign: "center" },
      2: { cellWidth: 50, halign: "center" },
      3: { cellWidth: 50, halign: "center" },
      4: { cellWidth: 50, halign: "center" },
      5: { cellWidth: 50, halign: "center" },
    },
    styles: { fontSize: 9, cellPadding: 4, valign: "middle" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  const footerY = pageHeight - 12;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, footerY - 4, pageWidth - 14, footerY - 4);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`${info.name}  •  ${new Date().toLocaleDateString("es-CO")}`, pageWidth / 2, footerY, { align: "center" });

  return doc;
}

export async function downloadSchedulePDF(
  gradeName: string,
  schedules: ScheduleEntry[],
  timeSlots: string[],
  instData?: PdfInstitutionData
) {
  const doc = await generateSchedulePDF(gradeName, schedules, timeSlots, instData);
  doc.save(`Horario_${gradeName.replace(/\s+/g, "_")}.pdf`);
}
