export { schoolQueryKeys } from "@/hooks/school/queryKeys";
export type {
  AcademicPeriod,
  Grade,
  GuardianAccount,
  GuardianGradeRecord,
  GuardianSchedule,
  GradeRecord,
  GradeRecordFilters,
  PreescolarEvaluation,
  PreescolarEvaluationFilters,
  ProvisionGuardianAccountResult,
  Schedule,
  ScheduleInsert,
  Student,
  StudentGuardianAccountBase,
  Subject,
  Teacher,
  TeacherBase,
  TeacherGradeAssignment,
  TeacherSubjectAssignment,
} from "@/hooks/school/types";
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
} from "@/hooks/school/useAccounting";
