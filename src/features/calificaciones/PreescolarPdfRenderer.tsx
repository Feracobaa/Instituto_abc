import PreescolarReport from "@/components/reports/PreescolarReport";
import { buildPreescolarReportPayload } from "@/features/calificaciones/helpers";
import type { PreescolarRendererProps } from "@/features/calificaciones/types";

export function PreescolarPdfRenderer({
  deliveryDate,
  downloadingStudent,
  gradeName,
  groupDirectorName,
  isPreescolar,
  periodName,
  preescolarRef,
  records,
  reportSummary,
}: PreescolarRendererProps) {
  if (!downloadingStudent || !isPreescolar) {
    return null;
  }

  const { schoolInfo, studentInfo } = buildPreescolarReportPayload({
    deliveryDate,
    groupDirectorName,
    gradeName,
    periodName,
    reportSummary,
    student: downloadingStudent,
  });

  return (
    <div style={{ position: "fixed", left: "-9999px", top: "-9999px" }}>
      <PreescolarReport
        ref={preescolarRef}
        student={studentInfo}
        dimensions={records}
        schoolInfo={schoolInfo}
        id="hidden-preescolar-print"
      />
    </div>
  );
}
