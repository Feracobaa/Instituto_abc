import type jsPDF from "jspdf";
import type { InstitutionContract } from "./types";
import { sanitizeTextForPdf } from "./contractSanitizer";

/**
 * Renderiza el bloque formal bilateral de firmas (Proveedor Etymon vs. Rector Cliente)
 * con sellos criptográficos y certificación de no repudio según la Ley 527 de 1999 de Colombia.
 */
export function drawBilateralSignaturesBlock(
  doc: jsPDF,
  startY: number,
  contract: InstitutionContract,
  margin: number,
  contentWidth: number
): number {
  const colWidth = (contentWidth - 8) / 2;
  const blockHeight = 44;
  let currentY = startY;

  // Título de la sección de firmas
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("EN CONSTANCIA Y SUSCRIPCIÓN DE LAS PARTES", margin, currentY);
  currentY += 5;

  // 1. Columna Izquierda: EL PROVEEDOR (ETYMON)
  const leftX = margin;
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(leftX, currentY, colWidth, blockHeight, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(13, 148, 136); // teal-600
  doc.text("POR EL PROVEEDOR (LICENCIANTE)", leftX + 4, currentY + 6);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("ETYMON CLOUD S.A.S.", leftX + 4, currentY + 12);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("NIT: 901.845.120-4", leftX + 4, currentY + 17);
  doc.text("Representante: Dirección de Operaciones y Legal", leftX + 4, currentY + 22);
  doc.text("Estado: Emitido y suscrito digitalmente", leftX + 4, currentY + 27);
  doc.text(`Fecha Emisión: ${new Date(contract.created_at).toLocaleDateString("es-CO")}`, leftX + 4, currentY + 32);

  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Infraestructura Segura Certificada - TLS 1.3 / ISO 27001", leftX + 4, currentY + 38);

  // 2. Columna Derecha: EL CLIENTE (LA INSTITUCIÓN EDUCATIVA / RECTOR)
  const rightX = margin + colWidth + 8;
  const isSigned = contract.status === "signed";

  doc.setDrawColor(isSigned ? 153 : 252, isSigned ? 246 : 211, isSigned ? 228 : 77); // emerald or amber
  doc.setFillColor(isSigned ? 240 : 254, isSigned ? 253 : 242, isSigned ? 250 : 242);
  doc.roundedRect(rightX, currentY, colWidth, blockHeight, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(isSigned ? 13 : 217, isSigned ? 148 : 119, isSigned ? 136 : 6); // teal-600 or amber-600
  doc.text("POR EL CLIENTE (INSTITUCIÓN EDUCATIVA)", rightX + 4, currentY + 6);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  const instName = sanitizeTextForPdf(contract.institution_legal_name || "Institución Adscrita");
  doc.text(instName.slice(0, 38), rightX + 4, currentY + 12);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  const nitStr = sanitizeTextForPdf(contract.institution_nit || "NIT por definir");
  doc.text(`NIT: ${nitStr}`, rightX + 4, currentY + 17);

  const rectorStr = sanitizeTextForPdf(contract.signer_name || contract.rector_name || "Rector(a) Titular");
  doc.text(`Rector(a): ${rectorStr}`, rightX + 4, currentY + 22);

  if (isSigned) {
    const docId = sanitizeTextForPdf(contract.signer_document_id || "Verificada");
    doc.text(`C.C.: ${docId} (Firma Electrónica Ratificada)`, rightX + 4, currentY + 27);
    const dateStr = contract.signed_at ? new Date(contract.signed_at).toLocaleString("es-CO") : "Registrada";
    doc.text(`Fecha y Hora: ${dateStr}`, rightX + 4, currentY + 32);

    doc.setFontSize(6.5);
    doc.setTextColor(13, 148, 136);
    doc.text("Aceptación legal vinculante conforme a Ley 527 de 1999", rightX + 4, currentY + 38);
  } else {
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text("Estado: PENDIENTE DE FIRMA DIGITAL DEL RECTOR", rightX + 4, currentY + 27);
    doc.text("Gestión: Requiere suscripción en portal Etymon", rightX + 4, currentY + 32);

    doc.setFontSize(6.5);
    doc.setTextColor(146, 64, 14);
    doc.text("Firma pendiente - No formalizado hasta su ratificación", rightX + 4, currentY + 38);
  }

  currentY += blockHeight + 4;

  // 3. Recuadro Inferior de Certificación y Sello SHA-256
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, contentWidth, 14, 1.5, 1.5, "FD");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text("CERTIFICACIÓN DE FIRMA DIGITAL Y NO REPUDIO (REPÚBLICA DE COLOMBIA - LEY 527 DE 1999)", margin + 3, currentY + 4.5);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const hash = contract.signature_hash || contract.content_hash;
  doc.text(`Huella Criptográfica SHA-256: ${hash}`, margin + 3, currentY + 8.5);
  doc.text(
    "El presente documento goza de plena validez jurídica y probatoria. La integridad del contenido está garantizada por sellado criptográfico.",
    margin + 3,
    currentY + 12
  );

  return currentY + 18;
}
