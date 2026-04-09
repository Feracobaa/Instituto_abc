export { schoolQueryKeys } from "@/hooks/school/queryKeys";
export type {
  AcademicPeriod,
  Grade,
  GradeRecord,
  GradeRecordFilters,
  PreescolarEvaluation,
  PreescolarEvaluationFilters,
  Schedule,
  ScheduleInsert,
  Student,
  Subject,
  Teacher,
  TeacherBase,
  TeacherGradeAssignment,
  TeacherSubjectAssignment,
} from "@/hooks/school/types";
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
