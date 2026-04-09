import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { PreescolarReportHandle } from "@/components/reports/PreescolarReport";
import { MainLayout } from "@/components/layout/MainLayout";
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
import type { Student } from "@/hooks/useSchoolData";
import { supabase } from "@/integrations/supabase/client";
import type { DetailedGradeRecord } from "@/utils/pdfGenerator";

export default function MisNotas() {
  const guardianAccountQuery = useGuardianAccount();
  const periodsQuery = useAcademicPeriods();
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [downloadingStudent, setDownloadingStudent] = useState<Student | null>(null);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const preescolarRef = useRef<PreescolarReportHandle>(null);

  const student = guardianAccountQuery.data?.students ?? null;
  const periods = useMemo(() => periodsQuery.data ?? [], [periodsQuery.data]);
  const activePeriod = periods.find((period) => period.is_active);
  const selectedPeriodData = periods.find((period) => period.id === selectedPeriod) ?? null;
  const isPreescolar = isPreescolarGradeName(student?.grades?.name);
  const deliveryDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!selectedPeriod && periods.length > 0) {
      setSelectedPeriod(activePeriod?.id || periods[0].id);
    }
  }, [activePeriod?.id, periods, selectedPeriod]);

  const gradeRecordsQuery = useGuardianGradeRecords(student?.id, selectedPeriod || undefined);
  const preescolarQuery = usePreescolarEvaluations({
    studentId: student?.id,
    periodId: selectedPeriod || undefined,
  });

  const gradeRecords = gradeRecordsQuery.data ?? [];
  const preescolarRecords = useMemo(() => preescolarQuery.data ?? [], [preescolarQuery.data]);
  const averageGrade = gradeRecords.length > 0
    ? gradeRecords.reduce((accumulator, record) => accumulator + record.grade, 0) / gradeRecords.length
    : null;

  const groupedPreescolar = useMemo(() => {
    return preescolarRecords.reduce<Record<string, typeof preescolarRecords>>((accumulator, record) => {
      accumulator[record.dimension] = [...(accumulator[record.dimension] ?? []), record];
      return accumulator;
    }, {});
  }, [preescolarRecords]);

  useEffect(() => {
    if (!downloadingStudent || !isPreescolar) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        if (!preescolarRef.current) {
          throw new Error("No fue posible preparar el boletin para descargar.");
        }

        toast.info(`Generando boletin para ${downloadingStudent.full_name}...`);
        await preescolarRef.current.exportPDF();
      } catch (error) {
        console.error(error);
        toast.error("No fue posible descargar el boletin.");
      } finally {
        setDownloadingStudent(null);
        setIsDownloadingReport(false);
      }
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [downloadingStudent, isPreescolar]);

  const handleDownloadReport = async () => {
    if (!student || !selectedPeriodData) {
      toast.error("Selecciona un bimestre valido antes de descargar el boletin.");
      return;
    }

    if (isPreescolar) {
      if (preescolarRecords.length === 0) {
        toast.error("Aun no hay evaluaciones registradas para generar el boletin.");
        return;
      }

      setIsDownloadingReport(true);
      setDownloadingStudent(student);
      return;
    }

    if (gradeRecords.length === 0) {
      toast.error("Aun no hay calificaciones registradas para generar el boletin.");
      return;
    }

    setIsDownloadingReport(true);

    try {
      const { data: allRecords, error: recordsError } = await supabase
        .from("grade_records")
        .select(`
          period_id,
          grade,
          achievements,
          comments,
          subjects (id, name),
          academic_periods (name)
        `)
        .eq("student_id", student.id);

      if (recordsError) {
        throw recordsError;
      }

      const { data: classSchedules, error: schedulesError } = await supabase
        .from("schedules")
        .select("subject_id")
        .eq("grade_id", student.grade_id);

      if (schedulesError) {
        throw schedulesError;
      }

      if (!allRecords?.length) {
        toast.error("No hay informacion suficiente para generar el boletin.");
        return;
      }

      const { downloadReportCard } = await import("@/utils/pdfGenerator");
      await downloadReportCard(
        { full_name: student.full_name, grades: student.grades },
        { id: selectedPeriodData.id, name: selectedPeriodData.name },
        allRecords as DetailedGradeRecord[],
        classSchedules ?? [],
        periods,
        deliveryDate,
      );
    } catch (error) {
      console.error(error);
      toast.error("No fue posible descargar el boletin.");
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const isLoading = guardianAccountQuery.isLoading
    || periodsQuery.isLoading
    || gradeRecordsQuery.isLoading
    || preescolarQuery.isLoading;

  const canDownloadReport = Boolean(
    student
    && selectedPeriodData
    && (
      isPreescolar
        ? preescolarRecords.length > 0
        : gradeRecords.length > 0
    ),
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Mis notas</h1>
            <p className="text-sm text-muted-foreground">
              Seguimiento academico de {student?.full_name || "tu estudiante"}.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:max-w-sm">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar bimestre" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => void handleDownloadReport()}
              disabled={!canDownloadReport || isDownloadingReport}
              className="gap-2"
            >
              {isDownloadingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Descargar boletin
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !student ? (
          <EmptyState
            icon={ClipboardList}
            title="No hay estudiante vinculado"
            description="Rectoria debe revisar la vinculacion de esta cuenta del portal estudiantil."
          />
        ) : isPreescolar ? (
          Object.keys(groupedPreescolar).length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Aun no hay evaluaciones cualitativas"
              description="Cuando el docente registre observaciones para este bimestre, apareceran aqui."
            />
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedPreescolar).map(([dimension, records]) => (
                <div key={dimension} className="rounded-xl border bg-card p-5 shadow-card">
                  <h2 className="mb-3 font-semibold text-foreground">{dimension}</h2>
                  <div className="space-y-3">
                    {records.map((record) => (
                      <div key={record.id} className="rounded-lg bg-secondary/40 p-4 text-sm">
                        <p><span className="font-semibold text-foreground">Fortalezas:</span> {record.fortalezas || "Sin registrar"}</p>
                        <p className="mt-2"><span className="font-semibold text-foreground">Debilidades:</span> {record.debilidades || "Sin registrar"}</p>
                        <p className="mt-2"><span className="font-semibold text-foreground">Recomendaciones:</span> {record.recomendaciones || "Sin registrar"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : gradeRecords.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Aun no hay calificaciones"
            description="Cuando el docente registre notas para este bimestre, las veras aqui."
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">Promedio del bimestre</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{averageGrade?.toFixed(1) || "-"}</p>
            </div>

            <div className="overflow-hidden rounded-xl border bg-card shadow-card">
              <table className="w-full">
                <thead className="bg-secondary/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Materia</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nota</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logros</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeRecords.map((record) => (
                    <tr key={record.id} className="border-t border-border">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{record.subjects?.name || "Materia"}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{record.grade.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{record.achievements || "Sin comentario"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{record.comments || "Sin observaciones"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <PreescolarPdfRenderer
        deliveryDate={deliveryDate}
        downloadingStudent={downloadingStudent}
        gradeName={student?.grades?.name}
        isPreescolar={isPreescolar}
        periodName={selectedPeriodData?.name}
        preescolarRef={preescolarRef}
        records={preescolarRecords}
      />
    </MainLayout>
  );
}
