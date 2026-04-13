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
  guardianAccounts: {
    all: ["guardian_accounts"] as const,
    self: ["guardian_accounts", "self"] as const,
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
  guardianGradeRecords: {
    all: ["guardian_grade_records"] as const,
    list: (studentId?: string, periodId?: string) =>
      ["guardian_grade_records", studentId ?? null, periodId ?? null] as const,
  },
  guardianSchedules: {
    all: ["guardian_schedules"] as const,
    list: (gradeId?: string) => ["guardian_schedules", gradeId ?? null] as const,
  },
  preescolarEvaluations: {
    all: ["preescolar_evaluations"] as const,
    list: (filters?: PreescolarEvaluationFilters) =>
      ["preescolar_evaluations", filters?.studentId ?? null, filters?.periodId ?? null] as const,
  },
  accounting: {
    tuitionProfiles: ["accounting", "tuition_profiles"] as const,
    tuitionSummary: ["accounting", "tuition_summary"] as const,
    tuitionMonthStatus: (periodMonth?: string) =>
      ["accounting", "tuition_month_status", periodMonth ?? null] as const,
    payments: (periodMonth?: string) =>
      ["accounting", "tuition_payments", periodMonth ?? null] as const,
    ledger: (periodMonth?: string) => ["accounting", "ledger", periodMonth ?? null] as const,
    transactions: (filters?: { periodMonth?: string; movementType?: string; category?: string }) =>
      ["accounting", "transactions", filters?.periodMonth ?? null, filters?.movementType ?? null, filters?.category ?? null] as const,
    inventory: ["accounting", "inventory"] as const,
    students: ["accounting", "students"] as const,
  },
};
