import { supabase } from "@/integrations/supabase/client";
import type { PreescolarEvaluation } from "@/hooks/useSchoolData";
import type { DetailedGradeRecord } from "@/utils/pdfGenerator";
import { formatReportAverage, formatReportRank } from "@/lib/reportCardFormatting";

export interface ReportCardSummary {
  groupDirectorName: string | null;
  periodAverage: number | null;
  rank: number | null;
  totalStudents: number;
}

export interface ReportCardSnapshot extends ReportCardSummary {
  classSchedules: { subject_id: string }[];
  preescolarEvaluations: PreescolarEvaluation[];
  studentGradeRecords: DetailedGradeRecord[];
}

type RawReportCardSnapshot = {
  class_schedules?: { subject_id: string | null }[];
  grade_rank?: number | null;
  group_director_name?: string | null;
  period_average?: number | null;
  preescolar_evaluations?: PreescolarEvaluation[];
  student_grade_records?: DetailedGradeRecord[];
  total_students?: number | null;
};

function normalizeReportCardSnapshot(
  payload: RawReportCardSnapshot | null | undefined,
): ReportCardSnapshot {
  return {
    classSchedules:
      payload?.class_schedules?.filter(
        (schedule): schedule is { subject_id: string } => Boolean(schedule?.subject_id),
      ) ?? [],
    groupDirectorName: payload?.group_director_name ?? null,
    periodAverage:
      typeof payload?.period_average === "number" ? payload.period_average : null,
    preescolarEvaluations: payload?.preescolar_evaluations ?? [],
    rank: typeof payload?.grade_rank === "number" ? payload.grade_rank : null,
    studentGradeRecords: payload?.student_grade_records ?? [],
    totalStudents: typeof payload?.total_students === "number" ? payload.total_students : 0,
  };
}

export async function getStudentReportSnapshot(studentId: string, periodId: string) {
  const { data, error } = await supabase.rpc("get_student_report_snapshot", {
    p_period_id: periodId,
    p_student_id: studentId,
  });

  if (error) {
    throw error;
  }

  return normalizeReportCardSnapshot(data as RawReportCardSnapshot | null);
}

export { formatReportAverage, formatReportRank };
