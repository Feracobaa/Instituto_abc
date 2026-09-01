import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginatedTable } from "@/components/ui/PaginatedTable";
import { TrendingUp, TrendingDown, Trash2, FileSpreadsheet, Download } from "lucide-react";
import { formatCurrency, monthLabel } from "@/features/contabilidad/utils";
import { exportToCSV, exportToPDF } from "@/features/contabilidad/exportUtils";
import { categoryLabels } from "@/features/contabilidad/constants";
import type { AccountingLedgerEntry } from "@/hooks/school/types";

interface LedgerMovementCardProps {
  movementType: "income" | "expense";
  title: string;
  entries: AccountingLedgerEntry[];
  selectedMonth: string;
  totalAmount: number;
  isContable: boolean;
  onDelete: (entry: AccountingLedgerEntry) => void;
}

export function LedgerMovementCard({
  movementType,
  title,
  entries,
  selectedMonth,
  totalAmount,
  isContable,
  onDelete,
}: LedgerMovementCardProps) {
  const isIncome = movementType === "income";
  const Icon = isIncome ? TrendingUp : TrendingDown;
  const colorClass = isIncome ? "text-success" : "text-destructive";

  return (
    <Card className="p-5 shadow-card">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${colorClass}`} />
          <h3 className="font-heading font-bold text-foreground">{title}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {entries.length} registros
          </Badge>
          <Badge variant="outline" className={colorClass}>
            Total: {formatCurrency(totalAmount)}
          </Badge>
          <div className="flex gap-1 ml-auto">
            <Button
              variant="outline"
              size="xs"
              className="h-7 text-[10px] gap-1"
              onClick={() => {
                exportToCSV({
                  title: `${title} - ${monthLabel(selectedMonth)}`,
                  filename: `${title}_${selectedMonth}`,
                  columns: [
                    { header: "Categoria", accessor: (e) => categoryLabels[e.category_label] ?? e.category_label },
                    { header: "Detalle", accessor: (e) => e.description || "" },
                    { header: "Fecha", accessor: (e) => e.transaction_date },
                    { header: "Monto", accessor: (e) => e.amount },
                  ],
                  data: entries,
                });
              }}
            >
              <FileSpreadsheet className="h-3 w-3" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="xs"
              className="h-7 text-[10px] gap-1"
              onClick={() => {
                exportToPDF({
                  title: `Reporte de ${title}`,
                  subtitle: `Periodo: ${monthLabel(selectedMonth)}`,
                  filename: `${title}_${selectedMonth}`,
                  columns: [
                    { header: "Categoria", accessor: (e) => categoryLabels[e.category_label] ?? e.category_label },
                    { header: "Detalle", accessor: (e) => e.description || "" },
                    { header: "Fecha", accessor: (e) => e.transaction_date },
                    { header: "Monto", accessor: (e) => formatCurrency(e.amount) },
                  ],
                  data: entries,
                });
              }}
            >
              <Download className="h-3 w-3" />
              PDF
            </Button>
          </div>
        </div>
      </div>
      <PaginatedTable
        data={entries}
        getRowKey={(entry) => entry.movement_id}
        searchFn={(entry) =>
          `${categoryLabels[entry.category_label] ?? entry.category_label} ${entry.description ?? ""}`
        }
        searchPlaceholder={`Buscar ${isIncome ? "ingreso" : "egreso"}...`}
        pageSize={8}
        emptyMessage={`No hay ${isIncome ? "ingresos" : "egresos"} registrados en este mes.`}
        emptyIcon={Icon}
        columns={[
          {
            key: "category",
            header: "Categoria",
            headerClassName: "whitespace-nowrap",
            cellClassName: "whitespace-nowrap font-medium",
            render: (entry) => categoryLabels[entry.category_label] ?? entry.category_label,
          },
          {
            key: "description",
            header: "Detalle",
            cellClassName: "text-muted-foreground",
            render: (entry) => entry.description || "Sin descripcion",
          },
          {
            key: "date",
            header: "Fecha",
            headerClassName: "whitespace-nowrap",
            cellClassName: "whitespace-nowrap",
            render: (entry) => entry.transaction_date,
          },
          {
            key: "amount",
            header: "Monto",
            headerClassName: "whitespace-nowrap text-right",
            cellClassName: "whitespace-nowrap text-right",
            render: (entry) => (
              <span className={`font-semibold ${colorClass}`}>
                {formatCurrency(entry.amount)}
              </span>
            ),
          },
          ...(isContable
            ? [
                {
                  key: "action",
                  header: "Accion",
                  headerClassName: "text-right",
                  cellClassName: "text-right",
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  render: (entry: any) => (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Eliminar movimiento ${entry.description || categoryLabels[entry.category_label] || ""}`}
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(entry)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ),
                },
              ]
            : []),
        ]}
      />
    </Card>
  );
}
