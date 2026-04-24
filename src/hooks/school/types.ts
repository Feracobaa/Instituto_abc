import type { Database, Enums, Tables, TablesInsert } from "@/integrations/types";

// ============================================================================
// USER & AUTHENTICATION TYPES (Synchronized with BD - 22 Apr 2026)
// ============================================================================

/** User role enum - matches BD public.user_role_enum */
export type UserRoleEnum = "rector" | "profesor" | "parent" | "admin" | "contable";

/** User role assignment - from user_roles table */
export interface UserRole {
  id: string; // uuid
  user_id: string; // uuid
  role: UserRoleEnum;
  institution_id: string; // uuid
}

/** User profile - from profiles table */
export interface Profile {
  id: string; // uuid
  user_id: string; // uuid
  full_name: string;
  email: string;
  phone?: string | null;
  created_at: string; // timestamp
  updated_at: string; // timestamp
  institution_id: string; // uuid
}

// ============================================================================
// SCHOOL STRUCTURE TYPES
// ============================================================================

export type AcademicPeriod = Tables<"academic_periods">;
export type Grade = Tables<"grades">;
export type Subject = Tables<"subjects">;

// ============================================================================
// TEACHER TYPES - Complete & Type-Safe
// ============================================================================
// Based on BD table: public.teachers
// Migración ensures data integrity

export interface TeacherBase {
  id: string; // uuid
  user_id?: string | null; // uuid - FK to auth.users
  full_name: string;
  email: string;
  phone?: string | null;
  is_active?: boolean | null;
  created_at: string; // timestamp
  updated_at: string; // timestamp
  institution_id: string; // uuid
}

export type TeacherSubjectAssignment = Tables<"teacher_subjects"> & {
  subjects: Subject | null;
};

export type TeacherGradeAssignment = Tables<"teacher_grade_assignments"> & {
  grades: Grade | null;
};

export type Teacher = TeacherBase & {
  teacher_grade_assignments?: TeacherGradeAssignment[] | null;
  teacher_subjects?: TeacherSubjectAssignment[] | null;
};

// ============================================================================
// STUDENT TYPES - Complete & Type-Safe
// ============================================================================
// Based on BD table: public.students

export interface StudentBase {
  id: string; // uuid
  full_name: string;
  grade_id?: string | null; // uuid - FK to grades
  guardian_name?: string | null;
  guardian_phone?: string | null;
  is_active?: boolean | null;
  created_at: string; // timestamp
  updated_at: string; // timestamp
  address?: string | null;
  birth_date?: string | null; // date
  institution_id: string; // uuid
}

export type Student = StudentBase & {
  grades?: Grade | null;
};

export type StudentGuardianAccountBase = Tables<"student_guardian_accounts">;

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
  is_scheduled_for_selected_date: boolean;
  subject_id: string;
  subject_name: string;
  teacher_id: string;
  teacher_name: string;
}

// ============================================================================
// GRADE RECORDS - CRITICAL FOR RLS & SECURITY
// ============================================================================
// Migración 20260422_32 ensures teacher_id is NOT NULL
// RLS Policy: Users can only see/modify grades where teacher_id = auth.uid()

export interface GradeRecordBase {
  id: string; // uuid
  student_id: string; // uuid
  subject_id: string; // uuid
  teacher_id: string; // uuid - MUST NOT BE NULL (RLS requirement)
  period_id: string; // uuid
  grade: number; // numeric
  comments?: string | null;
  achievements?: string | null;
  created_at: string; // timestamp
  updated_at: string; // timestamp
  institution_id: string; // uuid
}

export type GradeRecord = GradeRecordBase & {
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
export type FinancialTransaction = Tables<"financial_transactions">;
export type InventoryItem = Tables<"inventory_items">;
export type TuitionMonthStatus = Tables<"student_tuition_month_status">;
export type TuitionSummary = Tables<"student_tuition_summary">;
export type AccountingLedgerEntry = Tables<"accounting_ledger">;

export type Institution = Tables<"institutions">;
export type InstitutionSettings = Tables<"institution_settings">;
export type InstitutionMembership = Tables<"institution_memberships">;
export type SubscriptionPlan = Tables<"subscription_plans">;
export type InstitutionSubscription = Tables<"institution_subscriptions">;
export type ProviderUser = Tables<"provider_users">;
export type ProviderSupportSession = Tables<"provider_support_sessions">;
export type ProviderAuditLog = Tables<"provider_audit_logs">;
export type ProviderModule = Tables<"provider_modules">;
export type ProviderCustomerAccount = Tables<"provider_customer_accounts">;
export type SubscriptionPlanModule = Tables<"subscription_plan_modules">;
export type InstitutionModuleOverride = Tables<"institution_module_overrides">;
export type ProviderOnboardingChecklist = Tables<"provider_onboarding_checklists">;

export type ProviderSupportContext =
  Database["public"]["Functions"]["provider_get_support_context"]["Returns"][number] | null;
export type IdentityDriftRow =
  Database["public"]["Functions"]["provider_detect_identity_drift"]["Returns"][number];
export type CurrentInstitutionModuleAccessRow =
  Database["public"]["Functions"]["get_current_institution_module_access"]["Returns"][number];
export type ProviderInstitutionModuleRow =
  Database["public"]["Functions"]["provider_get_institution_modules"]["Returns"][number];
