import type { Tables, TablesInsert } from "@/integrations/types";

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

export type Student = Tables<"students"> & {
  grades: Grade | null;
};

export type Schedule = Tables<"schedules"> & {
  grades: Grade | null;
  subjects: Subject | null;
  teachers: TeacherBase | null;
};

export type GradeRecord = Tables<"grade_records"> & {
  academic_periods: AcademicPeriod | null;
  students: Student | null;
  subjects: Subject | null;
  teachers: TeacherBase | null;
};

export type PreescolarEvaluation = Tables<"preescolar_evaluations">;

export type ScheduleInsert = TablesInsert<"schedules">;

export interface GradeRecordFilters {
  studentId?: string;
  periodId?: string;
}

export interface PreescolarEvaluationFilters {
  studentId?: string;
  periodId?: string;
}
