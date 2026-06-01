import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, Download, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import type { PreescolarReportHandle } from "@/components/reports/PreescolarReport";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PreescolarPdfRenderer } from "@/features/calificaciones/PreescolarPdfRenderer";
import { isPreescolarGradeName } from "@/features/calificaciones/helpers";
import {
  useAcademicPeriods,
  useGuardianAccount,
  useGuardianGradeRecords,
  usePreescolarEvaluations,
} from "@/hooks/useSchoolData";
import { useInstitutionSettings } from "@/hooks/school/useInstitution";
import { useGuardianTuitionStatus } from "@/hooks/school/useGuardianPortalExtras";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Student } from "@/hooks/useSchoolData";
import { getStudentReportSnapshot } from "@/lib/reportCards";
import { getGradeColor } from "@/features/calificaciones/helpers";
import { cn } from "@/lib/utils";

export default function MisNotasTab() {
  const guardianAccountQuery = useGuardianAccount();
  const periodsQuery = useAcademicPeriods();
  const { data: settings } = useInstitutionSettings();
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [downloadingStudent, setDownloadingStudent] = useState<Student | null>(null);
  const [downloadingSnapshot, setDownloadingSnapshot] = useState<Awaited<ReturnType<typeof getStudentReportSnapshot>> | null>(null);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const preescolarRef = useRef<PreescolarReportHandle>(null);

  const student = guardianAccountQuery.data?.students ?? null;
  const periods = useMemo(() => periodsQuery.data ?? [], [periodsQuery.data]);
  const activePeriod = periods.find((p) => p.is_active);
  const selectedPeriodData = periods.find((p) => p.id === selectedPeriod) ?? null;
  const isPreescolar = isPreescolarGradeName(student?.grades?.name);
  const deliveryDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!selectedPeriod && periods.length > 0) {
      setSelectedPeriod(activePeriod?.id || periods[0].id);
    }
  }, [activePeriod?.id, periods, selectedPeriod]);

  const gradeRecordsQuery = useGuardianGradeRecords(student?.id, selectedPeriod || undefined);
  const preescolarQuery = usePreescolarEvaluations({ studentId: student?.id, periodId: selectedPeriod || undefined });
  const { data: tuitionRecords = [], isLoading: isLoadingTuition } = useGuardianTuitionStatus(student?.id);

  const hasPendingDebt = useMemo(() => {
    if (!settings?.block_reports_on_debt) return false;
    return tuitionRecords.some((r) => (r.pending_amount ?? 0) > 0);
  }, [settings?.block_reports_on_debt, tuitionRecords]);

  const gradeRecords = gradeRecordsQuery.data ?? [];
  const preescolarRecords = useMemo(() => preescolarQuery.data ?? [], [preescolarQuery.data]);
  const averageGrade = gradeRecords.length > 0
    ? gradeRecords.reduce((acc, r) => acc + r.grade, 0) / gradeRecords.length
    : null;

  const groupedPreescolar = useMemo(() =>
    preescolarRecords.reduce<Record<string, typeof preescolarRecords>>((acc, r) => {
      acc[r.dimension] = [...(acc[r.dimension] ?? []), r];
      return acc;
    }, {}),
    [preescolarRecords]
  );

  useEffect(() => {
    if (!downloadingStudent || !isPreescolar) return;
    const id = window.setTimeout(async () => {
      try {
        if (!preescolarRef.current) throw new Error();
        toast.info(`Generando boletin...`);
        await preescolarRef.current.exportPDF();
      } catch { toast.error("No fue posible descargar el boletin."); }
      finally { setDownloadingStudent(null); setDownloadingSnapshot(null); setIsDownloadingReport(false); }
    }, 600);
    return () => window.clearTimeout(id);
  }, [downloadingStudent, isPreescolar]);

  const handleDownloadReport = async () => {
    if (!student || !selectedPeriodData) return toast.error("Selecciona un bimestre valido.");
    if (hasPendingDebt) {
      return toast.error("Descarga bloqueada: Su cuenta presenta saldos pendientes en pensiones.");
    }
    if (isPreescolar) {
      if (!preescolarRecords.length) return toast.error("Sin evaluaciones para generar el boletin.");
      try {
        setIsDownloadingReport(true);
        setDownloadingSnapshot(await getStudentReportSnapshot(student.id, selectedPeriodData.id));
        setDownloadingStudent(student);
      } catch { toast.error("No fue posible preparar el boletin."); setIsDownloadingReport(false); }
      return;
    }
    if (!gradeRecords.length) return toast.error("Sin calificaciones para generar el boletin.");
    setIsDownloadingReport(true);
    try {
      const snap = await getStudentReportSnapshot(student.id, selectedPeriodData.id);
      if (!snap.studentGradeRecords.length) return toast.error("No hay informacion suficiente.");
      const { downloadReportCard } = await import("@/utils/pdfGenerator");
      const instData = settings ? {
        name: settings.legal_name || settings.display_name || "",
        nit: settings.nit || undefined,
        address: settings.address || undefined,
        phone: settings.phone || undefined,
        rectorName: settings.rector_name || undefined,
        logoUrl: settings.logo_url || undefined,
      } : undefined;
      await downloadReportCard(
        { full_name: student.full_name, grades: student.grades },
        { id: selectedPeriodData.id, name: selectedPeriodData.name },
        snap.studentGradeRecords, snap.classSchedules, periods,
        { groupDirectorName: snap.groupDirectorName, periodAverage: snap.periodAverage, rank: snap.rank, totalStudents: snap.totalStudents },
        deliveryDate,
        instData
      );
    } catch { toast.error("No fue posible descargar el boletin."); }
    finally { setIsDownloadingReport(false); }
  };

  const isLoading = guardianAccountQuery.isLoading || periodsQuery.isLoading || gradeRecordsQuery.isLoading || preescolarQuery.isLoading || isLoadingTuition;
  const canDownload = Boolean(student && selectedPeriodData && (isPreescolar ? preescolarRecords.length > 0 : gradeRecords.length > 0) && !hasPendingDebt);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Seguimiento académico de <span className="font-medium text-foreground">{student?.full_name || "tu estudiante"}</span>.</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Seleccionar bimestre" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => void handleDownloadReport()} disabled={!canDownload || isDownloadingReport} size="sm" className="gap-2">
            {isDownloadingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : (hasPendingDebt ? <Lock className="h-4 w-4" /> : <Download className="h-4 w-4" />)}
            Boletín
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : hasPendingDebt ? (
        <div className="rounded-xl border bg-card p-8 text-center shadow-card space-y-6 max-w-2xl mx-auto my-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Visualización de Calificaciones Bloqueada</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Las calificaciones y el boletín de este bimestre no están disponibles debido a que la cuenta presenta saldos pendientes en las pensiones escolares.
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4 border text-left text-xs space-y-2">
            <p className="font-semibold text-foreground">¿Cómo solucionar esto?</p>
            <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
              <li>Diríjase a la pestaña de <strong>Pensiones</strong> para revisar el detalle de su cuenta de cobro.</li>
              <li>Realice el pago de los meses pendientes.</li>
              <li>Una vez la administración registre sus abonos en el sistema, la visualización y descarga de calificaciones se habilitará inmediatamente.</li>
            </ol>
          </div>
        </div>
      ) : !student ? (
        <EmptyState icon={ClipboardList} title="Sin estudiante vinculado" description="Rectoría debe revisar la vinculación de esta cuenta." />
      ) : isPreescolar ? (
        Object.keys(groupedPreescolar).length === 0 ? (
          <EmptyState icon={ClipboardList} title="Sin evaluaciones cualitativas" description="El docente aún no ha registrado observaciones para este bimestre." />
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedPreescolar).map(([dim, records]) => (
              <div key={dim} className="rounded-xl border bg-card p-5 shadow-card">
                <h2 className="mb-3 font-semibold text-foreground">{dim}</h2>
                <div className="space-y-3">
                  {records.map((r) => (
                    <div key={r.id} className="rounded-lg bg-secondary/40 p-4 text-sm space-y-1.5">
                      <p><span className="font-semibold text-foreground">Fortalezas:</span> {r.fortalezas || "Sin registrar"}</p>
                      <p><span className="font-semibold text-foreground">Debilidades:</span> {r.debilidades || "Sin registrar"}</p>
                      <p><span className="font-semibold text-foreground">Recomendaciones:</span> {r.recomendaciones || "Sin registrar"}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : gradeRecords.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Sin calificaciones" description="El docente aún no ha registrado notas para este bimestre." />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1 rounded-xl border bg-card p-4 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Promedio del bimestre</p>
              <p className={cn("mt-1 text-4xl font-bold", averageGrade && averageGrade < 3 ? "text-destructive" : "text-foreground")}>{averageGrade?.toFixed(1) ?? "-"}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Materias</p>
              <p className="mt-1 text-4xl font-bold text-foreground">{gradeRecords.length}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Por mejorar</p>
              <p className="mt-1 text-4xl font-bold text-destructive">{gradeRecords.filter(r => r.grade < 3).length}</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border bg-card shadow-card">
            <table className="w-full">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Materia</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nota</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Logros</th>
                </tr>
              </thead>
              <tbody>
                {gradeRecords.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{r.subjects?.name || "Materia"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg font-bold text-sm", getGradeColor(r.grade))}>
                        {r.grade.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{r.achievements || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PreescolarPdfRenderer
        deliveryDate={deliveryDate}
        downloadingStudent={downloadingStudent}
        gradeName={student?.grades?.name}
        groupDirectorName={downloadingSnapshot?.groupDirectorName}
        isPreescolar={isPreescolar}
        periodName={selectedPeriodData?.name}
        preescolarRef={preescolarRef}
        records={downloadingSnapshot?.preescolarEvaluations ?? preescolarRecords}
        institutionSettings={settings || undefined}
        reportSummary={downloadingSnapshot ? { periodAverage: downloadingSnapshot.periodAverage, rank: downloadingSnapshot.rank, totalStudents: downloadingSnapshot.totalStudents } : undefined}
      />
    </div>
  );
}
