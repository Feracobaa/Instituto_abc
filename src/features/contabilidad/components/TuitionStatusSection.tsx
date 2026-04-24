import { useState, useMemo } from "react";
import {
  Card,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import { PaginatedTable } from "@/components/ui/PaginatedTable";
import { Wallet, ClipboardList, Users, Trash2, RotateCcw, FileSpreadsheet, Download } from "lucide-react";
import { useTuitionPayments, useTuitionMonthStatus, useTuitionSummary, useAccountingStudents, useTuitionProfiles } from "@/hooks/useSchoolData";
import { formatCurrency, monthLabel, normalizeLegacyAmount, statusVariant } from "@/features/contabilidad/utils";
import { exportToCSV, exportToPDF } from "@/features/contabilidad/exportUtils";
import { cn } from "@/lib/utils";
import { ContabilidadSectionProps } from "../types";

export function TuitionStatusSection({ selectedMonth, isContable, openDeleteDialog }: ContabilidadSectionProps) {
  const { data: monthStatus, isLoading: monthStatusLoading } = useTuitionMonthStatus(selectedMonth);
  const { data: tuitionPayments } = useTuitionPayments(selectedMonth);
  const { data: tuitionSummary } = useTuitionSummary();
  const { data: students } = useAccountingStudents();
  const { data: tuitionProfiles } = useTuitionProfiles();

  const [ignoredDebtors, setIgnoredDebtors] = useState<Set<string>>(new Set());

  const selectedMonthLabel = monthLabel(selectedMonth);

  const pendingCount = useMemo(
    () => (monthStatus ?? []).filter((row) => row.pending_amount > 0).length,
    [monthStatus],
  );

  const topDebtors = useMemo(() => {
    return [...(tuitionSummary ?? [])]
      .sort((a, b) => b.total_pending - a.total_pending)
      .slice(0, 6);
  }, [tuitionSummary]);

  const profilesByStudent = useMemo(() => {
    return new Map((tuitionProfiles ?? []).map((profile) => [profile.student_id, profile]));
  }, [tuitionProfiles]);

  const studentsWithoutProfile = useMemo(() => {
    return (students ?? []).filter((student) => !profilesByStudent.has(student.id));
  }, [profilesByStudent, students]);

  const paymentsByStudent = useMemo(() => {
    const byId = new Map<string, string[]>();
    const byName = new Map<string, string[]>();
    (tuitionPayments ?? []).forEach((p) => {
      const sid = p.student_id ?? "";
      const name = p.students?.full_name ?? "";
      if (sid) {
        if (!byId.has(sid)) byId.set(sid, []);
        byId.get(sid)!.push(p.id);
      }
      if (name) {
        if (!byName.has(name)) byName.set(name, []);
        byName.get(name)!.push(p.id);
      }
    });
    return { byId, byName };
  }, [tuitionPayments]);

  return (
    <TabsContent value="estado-mes" className="space-y-4 outline-none">
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="outline" className="bg-background">{pendingCount} pendientes</Badge>
        <Badge variant="outline" className="bg-background">{(tuitionPayments ?? []).length} pagos</Badge>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
          {/* Pagos del periodo */}
          <Card className="p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <h3 className="font-heading font-bold text-foreground">Pagos del periodo</h3>
            </div>
            <PaginatedTable
              data={tuitionPayments ?? []}
              getRowKey={(p) => p.id}
              searchFn={(p) => p.students?.full_name ?? ""}
              searchPlaceholder="Buscar estudiante..."
              pageSize={8}
              emptyMessage="No hay pagos registrados para este mes."
              emptyIcon={Wallet}
              columns={[
                {
                  key: "student",
                  header: "Estudiante",
                  cellClassName: "font-medium",
                  render: (p) => p.students?.full_name ?? "Sin nombre",
                },
                {
                  key: "date",
                  header: "Fecha",
                  headerClassName: "whitespace-nowrap",
                  cellClassName: "whitespace-nowrap",
                  render: (p) => p.payment_date,
                },
                {
                  key: "amount",
                  header: "Monto",
                  headerClassName: "whitespace-nowrap",
                  cellClassName: "whitespace-nowrap",
                  render: (p) => formatCurrency(normalizeLegacyAmount(p.amount)),
                },
                ...(isContable
                  ? [
                      {
                        key: "action",
                        header: "Accion",
                        headerClassName: "whitespace-nowrap text-right",
                        cellClassName: "text-right",
                        render: (p: any) => (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              openDeleteDialog({
                                kind: "tuition_payment",
                                id: p.id,
                                title: "Eliminar pago de pension",
                                description: `Se eliminara el pago de ${p.students?.full_name ?? "estudiante"} por ${formatCurrency(normalizeLegacyAmount(p.amount))}.`,
                              })
                            }
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

          {/* Estado del mes */}
          <Card className="p-5 shadow-card">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-bold text-foreground">Cobros del mes</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">{pendingCount} pendientes</Badge>
                  <Badge variant="outline">{studentsWithoutProfile.length} sin perfil</Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="xs"
                    className="h-7 text-[10px] gap-1"
                    onClick={() => {
                      exportToCSV({
                        title: `Estado de Pensiones - ${monthLabel(selectedMonth)}`,
                        filename: `Pensiones_${selectedMonth}`,
                        columns: [
                          { header: "Estudiante", accessor: (row) => row.student_name },
                          { header: "Cuota", accessor: (row) => row.expected_amount },
                          { header: "Pagado", accessor: (row) => row.paid_amount },
                          { header: "Pendiente", accessor: (row) => row.pending_amount },
                          { header: "Estado", accessor: (row) => row.status === "paid" ? "Al dia" : row.status === "partial" ? "Parcial" : "Pendiente" },
                        ],
                        data: monthStatus ?? [],
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
                        title: "Reporte de Estado de Pensiones",
                        subtitle: `Periodo: ${monthLabel(selectedMonth)}`,
                        filename: `Pensiones_${selectedMonth}`,
                        columns: [
                          { header: "Estudiante", accessor: (row) => row.student_name },
                          { header: "Cuota", accessor: (row) => formatCurrency(row.expected_amount) },
                          { header: "Pagado", accessor: (row) => formatCurrency(row.paid_amount) },
                          { header: "Pendiente", accessor: (row) => formatCurrency(row.pending_amount) },
                          { header: "Estado", accessor: (row) => row.status === "paid" ? "Al dia" : row.status === "partial" ? "Parcial" : "Pendiente" },
                        ],
                        data: monthStatus ?? [],
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
              data={monthStatus ?? []}
              getRowKey={(row) => row.student_id}
              searchFn={(row) => row.student_name}
              searchPlaceholder="Buscar estudiante..."
              pageSize={10}
              isLoading={monthStatusLoading}
              emptyMessage="No hay registros para este mes."
              emptyIcon={ClipboardList}
                filterOptions={[
                  { value: "pending", label: "Pendientes" },
                  { value: "partial", label: "Parciales" },
                  { value: "paid", label: "Al día" },
                ]}
                filterFn={(row, filterValue) => row.status === filterValue}
                columns={[
                  {
                    key: "student",
                    header: "Estudiante",
                    cellClassName: "font-medium",
                    render: (row) => row.student_name,
                  },
                  {
                    key: "expected",
                    header: "Cuota",
                    headerClassName: "whitespace-nowrap text-right",
                    cellClassName: "whitespace-nowrap text-right tabular-nums text-muted-foreground",
                    render: (row) => formatCurrency(normalizeLegacyAmount(row.expected_amount)),
                  },
                  {
                    key: "paid",
                    header: "Pagado",
                    headerClassName: "whitespace-nowrap text-right",
                    cellClassName: "whitespace-nowrap text-right tabular-nums",
                    render: (row) => formatCurrency(normalizeLegacyAmount(row.paid_amount)),
                  },
                  {
                    key: "pending",
                    header: "Pendiente",
                    headerClassName: "whitespace-nowrap text-right",
                    cellClassName: "whitespace-nowrap text-right tabular-nums font-semibold",
                    render: (row) => (
                      <span className={row.pending_amount > 0 ? "text-destructive" : "text-success"}>
                        {formatCurrency(normalizeLegacyAmount(row.pending_amount))}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    header: "Estado",
                    headerClassName: "whitespace-nowrap text-right",
                    cellClassName: "text-right",
                    render: (row) => (
                      <Badge variant={statusVariant(row.status)} className="text-xs">
                        {row.status === "paid" ? "Al dia" : row.status === "partial" ? "Parcial" : "Pend."}
                      </Badge>
                    ),
                  },
                  ...(isContable
                    ? [
                        {
                          key: "actions",
                          header: "Accion",
                          headerClassName: "text-right",
                          cellClassName: "text-right",
                          render: (row: any) => {
                            const paymentIds =
                              paymentsByStudent.byId.get(row.student_id) ??
                              paymentsByStudent.byName.get(row.student_name) ??
                              [];
                            const hasPay = paymentIds.length > 0;
                            return (
                              <div className="flex items-center justify-end gap-1">
                                {hasPay && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    title={"Borrar pago de " + row.student_name + " en este mes"}
                                    onClick={() =>
                                      openDeleteDialog({
                                        kind: "tuition_payment",
                                        id: paymentIds[paymentIds.length - 1],
                                        title: "Borrar pago del mes",
                                        description:
                                          "Se eliminara el pago registrado de " +
                                          row.student_name +
                                          " en este periodo. El perfil de pension se conserva.",
                                      })
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-orange-500 hover:text-orange-600"
                                  title={"Resetear todo de " + row.student_name + " (perfil + pagos)"}
                                  onClick={() =>
                                    openDeleteDialog({
                                      kind: "tuition_profile_reset",
                                      studentId: row.student_id,
                                      title: "Resetear estudiante",
                                      description:
                                        "Se eliminará el perfil de pensión y TODOS los pagos de " +
                                        row.student_name +
                                        ". Deberás volver a configurar su pensión desde cero.",
                                    })
                                  }
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            );
                          },
                        },
                      ]
                    : []),
                ]}
              />
          </Card>

          {/* Cartera prioritaria */}
          <Card className="p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-bold text-foreground">Cartera prioritaria</h3>
              </div>
              {ignoredDebtors.size > 0 && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  onClick={() => setIgnoredDebtors(new Set())}
                >
                  Mostrar todos
                </button>
              )}
            </div>
            <div className="space-y-2 text-sm">
              {topDebtors.length === 0 ? (
                <p className="text-muted-foreground">No hay deudas registradas.</p>
              ) : (
                topDebtors.map((debtor, index) => {
                  const isIgnored = ignoredDebtors.has(debtor.student_id);
                  return (
                    <div
                      key={debtor.student_id}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2 transition-opacity",
                        isIgnored && "opacity-40",
                      )}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className={cn(
                          "truncate",
                          isIgnored ? "text-muted-foreground line-through" : "text-foreground",
                        )}>
                          {index + 1}. {debtor.student_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{debtor.pending_months} meses pendientes</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={cn(
                          "font-semibold",
                          isIgnored
                            ? "text-muted-foreground"
                            : debtor.total_pending > 0
                              ? "text-destructive"
                              : "text-success",
                        )}>
                          {formatCurrency(debtor.total_pending)}
                        </span>
                        <button
                          type="button"
                          title={isIgnored ? "Reactivar" : "Ignorar temporalmente"}
                          onClick={() =>
                            setIgnoredDebtors((prev) => {
                              const next = new Set(prev);
                              if (next.has(debtor.student_id)) next.delete(debtor.student_id);
                              else next.add(debtor.student_id);
                              return next;
                            })
                          }
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs transition-colors",
                            isIgnored
                              ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
                              : "border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground hover:text-foreground",
                          )}
                        >
                          {isIgnored ? "+" : "-"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Estudiantes pendientes de configurar: {studentsWithoutProfile.length}
            </p>
          </Card>
        </div>
    </TabsContent>
  );
}
