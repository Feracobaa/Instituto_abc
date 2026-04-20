import type { Enums, Tables, TablesInsert } from "@/integrations/types";

export type AcademicPeriod = Tables<"academic_periods">;
export type Grade = Tables<"grades">;
export type Subject = Tables<"subjects">;
export type TeacherBase = Tables<"teachers">;

export type TeacherSubjectAssignment = Tables<"teacher_subjects"> & {
  subjects: Subject | null;
};

export type TeacherGradeAssignment = Tables<"teacher_grade_assignments"> & {
  grades: Grade | null;
};

export type Teacher = TeacherBase & {
  teacher_grade_assignments: TeacherGradeAssignment[] | null;
  teacher_subjects: TeacherSubjectAssignment[] | null;
};

export type StudentGuardianAccountBase = Tables<"student_guardian_accounts">;

export type Student = Tables<"students"> & {
  grades: Grade | null;
};

export type GuardianAccount = StudentGuardianAccountBase & {
  students: Student | null;
};

export type Schedule = Tables<"schedules"> & {
  grades: Grade | null;
  subjects: Subject | null;
  teachers: TeacherBase | null;
};

export type AttendanceStatus = Enums<"attendance_status_enum">;

export type StudentAttendance = Tables<"student_attendance"> & {
  academic_periods: AcademicPeriod | null;
  grades: Grade | null;
  students: Student | null;
  subjects: Subject | null;
  teachers: TeacherBase | null;
};

export interface AttendanceClassContext {
  grade_id: string;
  grade_name: string;
  subject_id: string;
  subject_name: string;
  teacher_id: string;
  teacher_name: string;
}

export type GradeRecord = Tables<"grade_records"> & {
  academic_periods: AcademicPeriod | null;
  students: Student | null;
  subjects: Subject | null;
  teachers: TeacherBase | null;
};

export interface GradeRecordPartial {
  activity_name: string | null;
  achievements: string | null;
  comments: string | null;
  created_at: string;
  grade: number | null;
  grade_record_id: string;
  id: string;
  partial_index: number;
  updated_at: string;
  grade_records: Pick<
    GradeRecord,
    "id" | "period_id" | "student_id" | "subject_id" | "teacher_id"
  > | null;
}

export type PreescolarEvaluation = Tables<"preescolar_evaluations">;
export type GuardianGradeRecord = Tables<"grade_records"> & {
  academic_periods: AcademicPeriod | null;
  subjects: Subject | null;
};

export type GuardianSchedule = Tables<"schedules"> & {
  grades: Grade | null;
  subjects: Subject | null;
};

export type ScheduleInsert = TablesInsert<"schedules">;

export interface GradeRecordFilters {
  studentId?: string;
  periodId?: string;
}

export interface GradeRecordPartialFilters {
  gradeRecordId?: string;
  periodId?: string;
  studentId?: string;
}

export interface PreescolarEvaluationFilters {
  studentId?: string;
  periodId?: string;
}

export interface StudentAttendanceFilters {
  date?: string;
  gradeId?: string;
  studentId?: string;
  subjectId?: string;
  teacherId?: string;
}

export interface AttendanceClassFilters {
  date?: string;
  teacherId?: string;
}

export interface AttendanceSaveRow {
  justification_note?: string | null;
  status: AttendanceStatus;
  student_id: string;
}

export interface ProvisionGuardianAccountResult {
  message?: string;
  status: "already_exists" | "created" | "error" | "skipped_missing_grade";
  studentId: string;
  studentName: string;
  temporaryPassword?: string;
  username?: string;
}

export interface ReportCardSnapshot {
  classSchedules: { subject_id: string }[];
  groupDirectorName: string | null;
  periodAverage: number | null;
  preescolarEvaluations: PreescolarEvaluation[];
  rank: number | null;
  studentGradeRecords: import("@/utils/pdfGenerator").DetailedGradeRecord[];
  totalStudents: number;
}

export type TuitionProfile = Tables<"student_tuition_profiles">;
export type TuitionPayment = Tables<"student_tuition_payments">;
export type FinancialTransaction = Omit<Tables<"financial_transactions">, "category"> & {
  category: Tables<"financial_transactions">["category"] | "internet" | "suplent_payment";
};
export type InventoryItem = Tables<"inventory_items">;
export type TuitionMonthStatus = Tables<"student_tuition_month_status">;
export type TuitionSummary = Tables<"student_tuition_summary">;
export type AccountingLedgerEntry = Tables<"accounting_ledger">;
