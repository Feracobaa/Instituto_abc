import { useState, useMemo } from "react";
import {
  Card,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, ClipboardList, Users, Trash2, RotateCcw } from "lucide-react";
import { useTuitionPayments, useTuitionMonthStatus, useTuitionSummary, useAccountingStudents, useTuitionProfiles } from "@/hooks/useSchoolData";
import { formatCurrency, monthLabel, normalizeLegacyAmount, statusVariant } from "@/features/accounting/utils";
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
    <AccordionItem value="estado-mes" className="overflow-hidden rounded-xl border bg-card shadow-card">
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="flex w-full items-center justify-between gap-3 pr-2 text-left">
          <div>
            <p className="text-sm font-semibold text-foreground">Estado del mes</p>
            <p className="text-xs text-muted-foreground">Resumen de cobros y cartera de {selectedMonthLabel}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{pendingCount} pendientes</Badge>
            <Badge variant="outline">{(tuitionPayments ?? []).length} pagos</Badge>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 px-4 pb-4">
        <div className="grid gap-4 xl:grid-cols-3">
          {/* Pagos del periodo */}
          <Card className="p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <h3 className="font-heading font-bold text-foreground">Pagos del periodo</h3>
            </div>
            {(tuitionPayments ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay pagos registrados para este mes.</p>
            ) : (
              <div className="max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Estudiante</TableHead>
                      <TableHead className="whitespace-nowrap">Fecha</TableHead>
                      <TableHead className="whitespace-nowrap">Monto</TableHead>
                      {isContable && <TableHead className="whitespace-nowrap text-right">Accion</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tuitionPayments?.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.students?.full_name ?? "Sin nombre"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{payment.payment_date}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatCurrency(normalizeLegacyAmount(payment.amount))}</TableCell>
                        {isContable && (
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() =>
                                openDeleteDialog({
                                  kind: "tuition_payment",
                                  id: payment.id,
                                  title: "Eliminar pago de pension",
                                  description: `Se eliminara el pago de ${payment.students?.full_name ?? "estudiante"} por ${formatCurrency(normalizeLegacyAmount(payment.amount))}.`,
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          {/* Estado del mes */}
          <Card className="p-5 shadow-card">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-bold text-foreground">Cobros del mes</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">{pendingCount} pendientes</Badge>
                <Badge variant="outline">{studentsWithoutProfile.length} sin perfil</Badge>
              </div>
            </div>
            {monthStatusLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : (monthStatus ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay registros para este mes.</p>
            ) : (
              <div className="max-h-[360px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
                    <TableRow>
                      <TableHead>Estudiante</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Cuota</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Pagado</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Pendiente</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Estado</TableHead>
                      {isContable && <TableHead className="text-right">Accion</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthStatus?.map((row) => {
                      const paymentIds =
                        paymentsByStudent.byId.get(row.student_id) ??
                        paymentsByStudent.byName.get(row.student_name) ??
                        [];
                      const hasPay = paymentIds.length > 0;
                      return (
                        <TableRow key={row.student_id}>
                          <TableCell className="font-medium">{row.student_name}</TableCell>
                          <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                            {formatCurrency(normalizeLegacyAmount(row.expected_amount))}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right tabular-nums">
                            {formatCurrency(normalizeLegacyAmount(row.paid_amount))}
                          </TableCell>
                          <TableCell className={cn(
                            "whitespace-nowrap text-right tabular-nums font-semibold",
                            row.pending_amount > 0 ? "text-destructive" : "text-success",
                          )}>
                            {formatCurrency(normalizeLegacyAmount(row.pending_amount))}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={statusVariant(row.status)} className="text-xs">
                              {row.status === "paid" ? "Al dia" : row.status === "partial" ? "Parcial" : "Pend."}
                            </Badge>
                          </TableCell>
                          {isContable && (
                            <TableCell className="text-right">
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
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
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
      </AccordionContent>
    </AccordionItem>
  );
}
