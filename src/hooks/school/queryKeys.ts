import type {
  StudentAttendanceFilters,
  GradeRecordFilters,
  GradeRecordPartialFilters,
  PreescolarEvaluationFilters,
} from "@/hooks/school/types";

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
  gradeRecordPartials: {
    all: ["grade_record_partials"] as const,
    list: (filters?: GradeRecordPartialFilters) =>
      [
        "grade_record_partials",
        filters?.gradeRecordId ?? null,
        filters?.studentId ?? null,
        filters?.periodId ?? null,
      ] as const,
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
  attendance: {
    all: ["student_attendance"] as const,
    list: (filters?: StudentAttendanceFilters) =>
      [
        "student_attendance",
        filters?.date ?? null,
        filters?.gradeId ?? null,
        filters?.subjectId ?? null,
        filters?.teacherId ?? null,
        filters?.studentId ?? null,
      ] as const,
    classContexts: (date?: string, teacherId?: string) =>
      ["student_attendance_classes", date ?? null, teacherId ?? null] as const,
    students: (gradeId?: string) =>
      ["student_attendance_students", gradeId ?? null] as const,
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
  institution: {
    all: ["institution"] as const,
    modules: ["institution", "modules"] as const,
    settings: ["institution", "settings"] as const,
  },
  provider: {
    moduleCatalog: ["provider", "module_catalog"] as const,
    dashboard: ["provider", "dashboard"] as const,
    institutions: ["provider", "institutions"] as const,
    institutionModulesRoot: ["provider", "institution_modules"] as const,
    institutionModules: (institutionId?: string) =>
      ["provider", "institution_modules", institutionId ?? "none"] as const,
    drift: ["provider", "identity_drift"] as const,
    plans: ["provider", "plans"] as const,
    planModulesRoot: ["provider", "plan_modules"] as const,
    planModules: (planId?: string) =>
      ["provider", "plan_modules", planId ?? "none"] as const,
    supportContext: ["provider", "support_context"] as const,
    subscriptions: ["provider", "subscriptions"] as const,
    auditLogs: (institutionId?: string) =>
      ["provider", "audit_logs", institutionId ?? "all"] as const,
  },
};
