import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportColumn {
  header: string;
  accessor: (row: any) => string | number;
}

interface ExportOptions {
  /** Report title */
  title: string;
  /** Subtitle (e.g. period) */
  subtitle?: string;
  /** Column definitions */
  columns: ExportColumn[];
  /** Data rows */
  data: any[];
  /** Filename without extension */
  filename: string;
}

/** Export data as a CSV file (Excel-compatible) */
export function exportToCSV({ title, columns, data, filename }: ExportOptions) {
  const BOM = "\uFEFF"; // UTF-8 BOM for Excel
  const separator = ";"; // semicolon works better with Excel in most locales

  const headerRow = columns.map((col) => `"${col.header}"`).join(separator);
  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        const val = col.accessor(row);
        return typeof val === "number" ? val : `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(separator),
  );

  const csv = BOM + [headerRow, ...dataRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

/** Export data as a PDF table */
export function exportToPDF({ title, subtitle, columns, data, filename }: ExportOptions) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });

  // Title
  doc.setFontSize(14);
  doc.text(title, 14, 15);

  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(subtitle, 14, 21);
    doc.setTextColor(0, 0, 0);
  }

  const head = [columns.map((c) => c.header)];
  const body = data.map((row) =>
    columns.map((col) => {
      const val = col.accessor(row);
      return typeof val === "number" ? val.toLocaleString("es-CO") : String(val);
    }),
  );

  autoTable(doc, {
    head,
    body,
    startY: subtitle ? 26 : 22,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}.pdf`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
