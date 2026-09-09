import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InstitutionContract } from "./types";
import { formatCurrencyCop } from "./contractInterpolation";

export function generateContractPdf(contract: InstitutionContract) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // 1. Encabezado Oficial Etymon
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(0, 231, 167); // Etymon Accent Emerald/Cyan
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("ETYMON", margin, 14);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("SaaS de Gobernanza y Gestión Escolar Integral", margin, 20);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`CONTRATO N°: ${contract.contract_number}`, pageWidth - margin, 14, { align: "right" });
  doc.text(`ESTADO: ${contract.status.toUpperCase()}`, pageWidth - margin, 20, { align: "right" });

  // 2. Título y Ficha Resumen
  let currentY = 38;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(contract.title.toUpperCase(), margin, currentY);

  currentY += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Versión: ${contract.version} | Emitido: ${new Date(contract.created_at).toLocaleDateString("es-CO")}`, margin, currentY);

  // Tabla de Identificación de Partes
  const partyRows = [
    ["Institución Educativa:", contract.institution_legal_name || "Colegio Adscrito"],
    ["NIT Institucional:", contract.institution_nit || "No registrado"],
    ["Rector(a) / Representante:", contract.rector_name || "Representante Legal"],
    ["Cédula del Rector:", contract.rector_document_id || "Por registrar"],
    ["Plan y Cobertura:", `${contract.plan_name || "Plan SaaS"} (${contract.billing_cycle === "monthly" ? "Mensual" : "Anual"})`],
    ["Canon del Servicio:", `${formatCurrencyCop(Number(contract.plan_price_cop || 0))} COP`],
    ["Vigencia:", `Desde ${contract.valid_from} ${contract.valid_until ? `hasta ${contract.valid_until}` : "(Renovación Automática)"}`],
  ];

  autoTable(doc, {
    startY: currentY + 4,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50, fillColor: [248, 250, 252] },
      1: { cellWidth: contentWidth - 50 },
    },
    body: partyRows,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 3. Cuerpo del Contrato (Texto Markdown renderizado a texto limpio)
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);

  const cleanText = contract.content_markdown
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/---/g, "__________________________________________________");

  const splitLines = doc.splitTextToSize(cleanText, contentWidth);

  for (let i = 0; i < splitLines.length; i++) {
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 22;
    }
    const line = splitLines[i];
    if (line.includes("CLÁUSULA") || line.includes("OBJETO") || line.includes("VALIDEZ")) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
    }
    doc.text(line, margin, currentY);
    currentY += 4.5;
  }

  // 4. Sección de Firma y Sello Digital de No Repudio
  if (currentY > pageHeight - 55) {
    doc.addPage();
    currentY = 25;
  } else {
    currentY += 8;
  }

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(contract.status === "signed" ? 240 : 254, contract.status === "signed" ? 253 : 242, contract.status === "signed" ? 250 : 242);
  doc.roundedRect(margin, currentY, contentWidth, 38, 2, 2, "FD");

  if (contract.status === "signed") {
    doc.setTextColor(13, 148, 136); // teal-600
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("FIRMA DIGITAL Y ACEPTACIÓN LEGAL REGISTRADA (LEY 527 DE 1999)", margin + 5, currentY + 7);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(`Firmado por: ${contract.signer_name || contract.rector_name || "Rector"}`, margin + 5, currentY + 14);
    doc.text(`Identificación: ${contract.signer_document_id || "Verificada"}`, margin + 5, currentY + 19);
    doc.text(`Fecha y Hora: ${contract.signed_at ? new Date(contract.signed_at).toLocaleString("es-CO") : "Registrado"}`, margin + 5, currentY + 24);
    doc.text(`Dirección IP y Origen: ${contract.signature_metadata?.ip_address || "Seguro / HTTPS"}`, margin + 5, currentY + 29);
    doc.text(`Sello Criptográfico SHA-256: ${contract.signature_hash || contract.content_hash}`, margin + 5, currentY + 34);
  } else {
    doc.setTextColor(217, 119, 6); // amber-600
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("DOCUMENTO PENDIENTE DE FIRMA DIGITAL DEL RECTOR", margin + 5, currentY + 8);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Este instrumento legal ha sido emitido por Etymon y se encuentra en espera de la ratificación", margin + 5, currentY + 16);
    doc.text("digital del Representante Legal de la institución a través de la plataforma escolar.", margin + 5, currentY + 22);
    doc.text(`Hash previo del documento: ${contract.content_hash}`, margin + 5, currentY + 29);
  }

  // 5. Pie de página en todas las hojas
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Etymon — Contrato ${contract.contract_number} | Página ${p} de ${totalPages} | Validez jurídica Ley 527/1999`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  doc.save(`${contract.contract_number}_${contract.status.toUpperCase()}.pdf`);
}
