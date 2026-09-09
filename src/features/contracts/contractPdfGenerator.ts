import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InstitutionContract } from "./types";
import { formatCurrencyCop } from "./contractInterpolation";
import { sanitizeTextForPdf } from "./contractSanitizer";
import { drawBilateralSignaturesBlock } from "./contractPdfSignatures";

interface ClauseBlock {
  header: string;
  body: string;
}

/**
 * Parsea el cuerpo markdown de un contrato en bloques atómicos de cláusulas.
 */
function parseContractClauses(markdown: string): { preamble: string; clauses: ClauseBlock[] } {
  const clean = markdown.replace(/\*\*/g, "").replace(/^#+\s+/gm, "");
  const lines = clean.split("\n");

  let preamble = "";
  const clauses: ClauseBlock[] = [];
  let currentClause: ClauseBlock | null = null;
  let isParsingClauses = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (currentClause && currentClause.body) {
        currentClause.body += "\n";
      }
      continue;
    }

    // Detectar inicio de cláusula (e.g. "CLÁUSULA PRIMERA: OBJETO" o "1. OBJETO")
    const isClauseHeader = /^CLÁUSULA\s+[A-ZÁÉÍÓÚÑ0-9]+[:\.\-—]/i.test(line) || /^CLÁUSULA\s+[A-ZÁÉÍÓÚÑ]+/i.test(line);

    if (isClauseHeader) {
      isParsingClauses = true;
      if (currentClause) {
        clauses.push({
          header: sanitizeTextForPdf(currentClause.header),
          body: sanitizeTextForPdf(currentClause.body),
        });
      }
      currentClause = { header: line, body: "" };
    } else if (!isParsingClauses) {
      if (!line.startsWith("---") && !line.startsWith("===")) {
        preamble += (preamble ? "\n" : "") + line;
      }
    } else if (currentClause) {
      currentClause.body += (currentClause.body ? " " : "") + line;
    }
  }

  if (currentClause) {
    clauses.push({
      header: sanitizeTextForPdf(currentClause.header),
      body: sanitizeTextForPdf(currentClause.body),
    });
  }

  return { preamble: sanitizeTextForPdf(preamble), clauses };
}

/**
 * Genera el documento PDF formal de un contrato institucional con diagramación ejecutiva,
 * sanitización de glifos Unicode, control de viudas/huérfanas y firmas bilaterales.
 */
export function generateContractPdf(contract: InstitutionContract) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const bottomSafeLimit = pageHeight - 20;

  // 1. Membrete Oficial Etymon (Página 1)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 26, "F");

  doc.setTextColor(0, 231, 167); // Etymon Emerald Accent
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("ETYMON", margin, 13);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("SaaS de Gobernanza y Gestión Escolar Integral", margin, 19);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const contractNum = sanitizeTextForPdf(contract.contract_number || "ETM-PENDING");
  const statusStr = sanitizeTextForPdf((contract.status || "draft").toUpperCase());
  doc.text(`CONTRATO N°: ${contractNum}`, pageWidth - margin, 13, { align: "right" });
  doc.text(`ESTADO: ${statusStr}`, pageWidth - margin, 19, { align: "right" });

  // 2. Título Formal y Ficha de Partes
  let currentY = 34;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const contractTitle = sanitizeTextForPdf((contract.title || "CONTRATO INSTITUCIONAL").toUpperCase());
  doc.text(contractTitle, margin, currentY);

  currentY += 5;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const createdDate = new Date(contract.created_at || Date.now()).toLocaleDateString("es-CO");
  doc.text(`Versión: ${sanitizeTextForPdf(contract.version || "1.0")} | Emitido: ${createdDate}`, margin, currentY);

  // Tabla de Identificación de Partes
  const partyRows = [
    ["Institución Educativa:", sanitizeTextForPdf(contract.institution_legal_name || "Institución Adscrita")],
    ["NIT Institucional:", sanitizeTextForPdf(contract.institution_nit || "Pendiente de registro")],
    ["Rector(a) / Representante:", sanitizeTextForPdf(contract.rector_name || "Representante Legal")],
    ["Cédula del Rector:", sanitizeTextForPdf(contract.rector_document_id || "Por registrar")],
    ["Plan y Cobertura:", `${sanitizeTextForPdf(contract.plan_name || "Plan Integral")} (${contract.billing_cycle === "annual" ? "Anual" : "Mensual"})`],
    ["Canon del Servicio:", `${formatCurrencyCop(Number(contract.plan_price_cop || 0))} COP`],
    ["Vigencia del Acuerdo:", `Desde ${sanitizeTextForPdf(contract.valid_from || "Fecha de emisión")} ${contract.valid_until ? `hasta ${sanitizeTextForPdf(contract.valid_until)}` : "(Renovación Periódica Automática)"}`],
  ];

  autoTable(doc, {
    startY: currentY + 3,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 48, fillColor: [248, 250, 252] },
      1: { cellWidth: contentWidth - 48 },
    },
    body: partyRows,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 3. Preámbulo y Consideraciones Iniciales
  const { preamble, clauses } = parseContractClauses(contract.content_markdown);

  if (preamble) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    const preambleLines = doc.splitTextToSize(preamble, contentWidth);

    if (currentY + preambleLines.length * 3.8 > bottomSafeLimit) {
      doc.addPage();
      currentY = 24;
    }

    doc.text(preambleLines, margin, currentY);
    currentY += preambleLines.length * 3.8 + 4;
  }

  // Línea divisoria previa a cláusulas
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  currentY += 5;

  // 4. Renderizado Atómico de Cláusulas (Con control anti-ruptura de páginas)
  for (const clause of clauses) {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    const headerLines = doc.splitTextToSize(clause.header, contentWidth);
    const headerHeight = headerLines.length * 4.2;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const bodyLines = doc.splitTextToSize(clause.body, contentWidth);
    const bodyHeight = bodyLines.length * 3.8;
    const totalClauseHeight = headerHeight + bodyHeight + 5;

    // Si la cláusula completa no cabe en la página actual, saltar a página nueva ANTES de imprimir
    if (currentY + totalClauseHeight > bottomSafeLimit) {
      doc.addPage();
      currentY = 24;
    }

    // Dibujar encabezado en negrita
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(headerLines, margin, currentY);
    currentY += headerHeight + 1;

    // Dibujar cuerpo de la cláusula
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text(bodyLines, margin, currentY);
    currentY += bodyHeight + 4;
  }

  // 5. Bloque Bilateral de Firmas y Certificación Legal
  if (currentY + 68 > bottomSafeLimit) {
    doc.addPage();
    currentY = 24;
  } else {
    currentY += 4;
  }

  drawBilateralSignaturesBlock(doc, currentY, contract, margin, contentWidth);

  // 6. Encabezados de continuidad y Pies de página en todas las hojas
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Header sutil en hojas posteriores a la primera
    if (p > 1) {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "normal");
      doc.text(contractTitle, margin, 12);
      doc.text(contractNum, pageWidth - margin, 12, { align: "right" });
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 14, pageWidth - margin, 14);
    }

    // Pie de página oficial
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Etymon — Contrato ${contractNum} | Página ${p} de ${totalPages} | Validez jurídica Ley 527/1999`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  doc.save(`${contractNum}_${statusStr}.pdf`);
}
