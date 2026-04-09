import type { GradeRecordFilters, PreescolarEvaluationFilters } from "@/hooks/school/types";

export const schoolQueryKeys = {
  subjects: {
    all: ["subjects"] as const,
  },
  grades: {
    all: ["grades"] as const,
  },
  teachers: {
    all: ["teachers"] as const,
  },
  students: {
    all: ["students"] as const,
    list: (gradeId?: string) => ["students", gradeId ?? "all"] as const,
  },
  academicPeriods: {
    all: ["academic_periods"] as const,
  },
  schedules: {
    all: ["schedules"] as const,
    list: (gradeId?: string, teacherId?: string) =>
      ["schedules", gradeId ?? "all", teacherId ?? "all"] as const,
  },
  gradeRecords: {
    all: ["grade_records"] as const,
    list: (filters?: GradeRecordFilters) =>
      ["grade_records", filters?.studentId ?? null, filters?.periodId ?? null] as const,
  },
  preescolarEvaluations: {
    all: ["preescolar_evaluations"] as const,
    list: (filters?: PreescolarEvaluationFilters) =>
      ["preescolar_evaluations", filters?.studentId ?? null, filters?.periodId ?? null] as const,
  },
};
