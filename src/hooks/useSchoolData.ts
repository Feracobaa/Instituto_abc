export { schoolQueryKeys } from "@/hooks/school/queryKeys";
export type {
  AcademicPeriod,
  AttendanceClassContext,
  AttendanceClassFilters,
  AttendanceSaveRow,
  AttendanceStatus,
  Grade,
  GuardianAccount,
  GuardianGradeRecord,
  GuardianSchedule,
  Institution,
  InstitutionSettings,
  GradeRecord,
  GradeRecordFilters,
  GradeRecordPartial,
  GradeRecordPartialFilters,
  PreescolarEvaluation,
  PreescolarEvaluationFilters,
  ProvisionGuardianAccountResult,
  Schedule,
  ScheduleInsert,
  StudentAttendance,
  StudentAttendanceFilters,
  Student,
  StudentGuardianAccountBase,
  Subject,
  Teacher,
  TeacherBase,
  TeacherGradeAssignment,
  TeacherSubjectAssignment,
} from "@/hooks/school/types";
export {
  useAttendanceClassContexts,
  useAttendanceStudents,
  useSaveStudentAttendance,
  useStudentAttendance,
} from "@/hooks/school/useAttendance";
export {
  useGuardianAccount,
  useGuardianAccounts,
  useGuardianGradeRecords,
  useGuardianSchedules,
  useProvisionGuardianAccounts,
  useUpdateGuardianProfile,
} from "@/hooks/school/useGuardianPortal";
export {
  useAcademicPeriods,
  useCreateAcademicPeriods,
  useCreateSubject,
  useGrades,
  useSetAcademicPeriodState,
  useSubjects,
  useUpdateSubject,
} from "@/hooks/school/useAcademicData";
export {
  useCreateTeacher,
  useDeleteTeacher,
  useTeachers,
  useUpdateTeacher,
} from "@/hooks/school/useTeachers";
export {
  useCreateStudent,
  useDeleteStudent,
  useStudents,
  useUpdateStudent,
} from "@/hooks/school/useStudents";
export {
  useCreateSchedule,
  useDeleteSchedule,
  useSchedules,
} from "@/hooks/school/useSchedules";
export {
  useCreateGradeRecord,
  useDeleteGradeRecord,
  useGradeRecords,
  useUpdateGradeRecord,
} from "@/hooks/school/useGradeRecords";
export {
  useGradeRecordPartials,
  useUpsertGradeRecordPartials,
} from "@/hooks/school/useGradeRecordPartials";
export {
  useCreatePreescolarEvaluation,
  useDeletePreescolarEvaluation,
  usePreescolarEvaluations,
  useUpdatePreescolarEvaluation,
} from "@/hooks/school/usePreescolarEvaluations";
export {
  useAccountingLedger,
  useAccountingStudents,
  useBulkAssignTuitionProfiles,
  useCreateFinancialTransaction,
  useCreateInventoryItem,
  useCreateTuitionProfile,
  useDeleteFinancialTransaction,
  useDeleteInventoryItem,
  useDeleteTuitionPayment,
  useDeleteTuitionProfile,
  useFinancialTransactions,
  useInventoryItems,
  useRegisterStudentPayment,
  useTuitionPayments,
  useTuitionMonthStatus,
  useTuitionProfiles,
  useTuitionSummary,
  useUpdateTuitionProfile,
  useUpdateInventoryItem,
  useAccountingTeachers,
  useSendPaymentNotification,
} from "@/hooks/school/useAccounting";
export {
  useInstitutionModuleAccess,
  useInstitutionSettings,
} from "@/hooks/school/useInstitution";
