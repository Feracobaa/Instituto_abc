import jsPDF from "jspdf";
import { formatReportAverage } from "@/lib/reportCardFormatting";
import {
  FALLBACK_INST,
  PREESCOLAR_GRADES,
  type AutoTableCapableDoc,
  type GStateCapableDoc,
  type PdfInstitutionData,
} from "./types";

// ─── Memoria Caché de Logotipos ──────────────────────────────────────────────

const logoCache = new Map<string, string>();

/**
 * Carga el logotipo institucional en Base64 con soporte de caché en memoria
 */
export async function loadLogoBase64(url?: string): Promise<string | null> {
  const targetUrl = url || "/logo-iabc.jpg";

  if (logoCache.has(targetUrl)) {
    return logoCache.get(targetUrl) ?? null;
  }

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result) {
          logoCache.set(targetUrl, result);
        }
        resolve(result);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Alias retrocompatible para loadLogoBase64
 */
export const getLogoBase64 = loadLogoBase64;

// ─── Resolución de Información Institucional ─────────────────────────────────

export function getInstInfo(inst?: PdfInstitutionData) {
  return {
    republic: FALLBACK_INST.republic,
    ministry: FALLBACK_INST.ministry,
    department: FALLBACK_INST.department,
    name: inst?.name || FALLBACK_INST.name,
    address: inst?.address || FALLBACK_INST.address,
    phone: inst?.phone ? `Tel: ${inst.phone}` : FALLBACK_INST.phone,
    nit: inst?.nit ? `NIT: ${inst.nit}` : FALLBACK_INST.nit,
    rectorName: inst?.rectorName || "RECTOR(A)",
    logoUrl: inst?.logoUrl,
  };
}

// ─── Utilidades de Dibujo y Posicionamiento ───────────────────────────────────

export function centerText(
  doc: jsPDF,
  text: string,
  y: number,
  fontSize: number,
  style: "bold" | "normal" | "bolditalic" | "italic" = "normal"
) {
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", style);
  doc.text(text, doc.internal.pageSize.getWidth() / 2, y, { align: "center" });
}

export function getLastAutoTableY(doc: jsPDF): number {
  return (doc as AutoTableCapableDoc).lastAutoTable?.finalY ?? 0;
}

export function setDocumentOpacity(doc: jsPDF, opacity: number) {
  const pdf = doc as unknown as GStateCapableDoc;
  if (pdf.GState && pdf.setGState) {
    pdf.setGState(new pdf.GState({ opacity }));
  }
}

// ─── Membrete Institucional Oficial ──────────────────────────────────────────

export function drawInstitutionalHeader(
  doc: jsPDF,
  logoB64: string | null,
  instData?: PdfInstitutionData
): number {
  const info = getInstInfo(instData);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Borde exterior
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.2);
  doc.rect(margin, 8, pageWidth - margin * 2, 43);

  // Borde interior (efecto doble línea)
  doc.setLineWidth(0.3);
  doc.rect(margin + 1.5, 9.5, pageWidth - margin * 2 - 3, 40);

  // Logo lateral izquierdo
  if (logoB64) {
    try {
      doc.addImage(logoB64, "JPEG", margin + 4, 12, 28, 28);
    } catch {
      // Fallback silencioso si falla la imagen
    }
  }

  // Logo lateral derecho (espejado)
  if (logoB64) {
    try {
      doc.addImage(logoB64, "JPEG", pageWidth - margin - 32, 12, 28, 28);
    } catch {
      // Fallback silencioso
    }
  }

  // Bloque textual central
  doc.setTextColor(0, 0, 0);
  centerText(doc, info.republic, 18, 7, "bold");
  centerText(doc, info.ministry, 23, 7, "bold");
  centerText(doc, info.department, 28, 7.5, "bold");
  centerText(doc, info.name, 34, 9, "bold");
  centerText(doc, info.address, 39, 6.5, "normal");
  centerText(doc, `${info.phone}   ${info.nit}`, 44, 6, "normal");

  return 57; // Próximo Y
}

/**
 * Alias retrocompatible para drawInstitutionalHeader
 */
export const drawHeader = async (
  doc: jsPDF,
  logoB64: string | null,
  instData?: PdfInstitutionData
): Promise<number> => {
  return drawInstitutionalHeader(doc, logoB64, instData);
};

// ─── Marca de Agua Institucional ─────────────────────────────────────────────

export function drawWatermark(
  doc: jsPDF,
  logoB64: string,
  opacity: number = 0.05,
  size: number = 120
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  setDocumentOpacity(doc, opacity);
  try {
    doc.addImage(logoB64, "JPEG", (pageWidth - size) / 2, (pageHeight - size) / 2, size, size);
  } catch {
    // Ignorar si el formato no es compatible
  }
  setDocumentOpacity(doc, 1);
}

// ─── Firmas y Pie de Página ──────────────────────────────────────────────────

export function drawSignatures(
  doc: jsPDF,
  y: number,
  instData?: PdfInstitutionData
): number {
  const info = getInstInfo(instData);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const usableWidth = pageWidth - margin * 2;
  const lineLen = 50;
  const spacing = (usableWidth - lineLen * 3) / 2;

  const positions = [
    { x: margin, label: info.rectorName, sub: "Firma y Sello" },
    { x: margin + lineLen + spacing, label: "DIRECTOR(A) DE GRUPO", sub: "Firma" },
    { x: margin + (lineLen + spacing) * 2, label: "ACUDIENTE", sub: "Firma y C.C." },
  ];

  doc.setFontSize(7.5);
  positions.forEach(({ x, label, sub }) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.line(x, y + 16, x + lineLen, y + 16);
    doc.setFont("helvetica", "bold");
    doc.text(label, x + lineLen / 2, y + 20, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(sub, x + lineLen / 2, y + 24, { align: "center" });
    doc.setFontSize(7.5);
  });

  return y + 30;
}

export function drawFooter(doc: jsPDF, instData?: PdfInstitutionData) {
  const info = getInstInfo(instData);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const y = pageHeight - 10;

  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.8);
  doc.line(margin, y - 4, pageWidth - margin, y - 4);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(80, 80, 80);
  doc.text(
    `${info.name}  •  ${info.address}  •  ${info.nit}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );
  doc.setTextColor(0, 0, 0);
}

// ─── Evaluadores Pedagógicos y Formateadores ─────────────────────────────────

export function isPreescolar(gradeName?: string): boolean {
  if (!gradeName) return false;
  return PREESCOLAR_GRADES.some((g) => gradeName.toLowerCase().includes(g));
}

export function getGradeLabel(grade: number): string {
  if (grade >= 4.6) return "SUPERIOR";
  if (grade >= 4.0) return "ALTO";
  if (grade >= 3.0) return "BÁSICO";
  return "BAJO";
}

export function getPerformanceColor(grade: number): [number, number, number] {
  if (grade >= 4.6) return [21, 128, 61]; // verde
  if (grade >= 4.0) return [29, 78, 216]; // azul
  if (grade >= 3.0) return [180, 120, 0]; // ámbar
  return [185, 28, 28]; // rojo
}

export function formatAverageForReport(periodAverage?: number | null) {
  return formatReportAverage(periodAverage ?? null);
}

export function formatRankForReport(rank?: number | null, totalStudents?: number) {
  if (!rank || !totalStudents) {
    return "-";
  }
  return `${rank} de ${totalStudents}`;
}
