import type { Dispatch, RefObject, SetStateAction } from "react";
import type { PreescolarReportHandle } from "@/components/reports/PreescolarReport";
import type {
  GradeRecord,
  PreescolarEvaluation,
  Schedule,
  Student,
  Subject,
  Teacher,
} from "@/hooks/useSchoolData";

export type EditableGradeRecord = {
  achievements: string;
  comments: string;
  grade: number | "";
  id?: string;
  student_id: string;
  subject_id: string;
  teacher_id: string;
};

export type EditablePreescolarEvaluation = {
  debilidades: string;
  dimension: string;
  fortalezas: string;
  id?: string;
  recomendaciones: string;
  student_id: string;
  teacher_id: string;
};

export type CalificacionTableRecord = GradeRecord | PreescolarEvaluation;

export interface GradeRecordVisibilityInput {
  gradeId: string;
  gradeRecords?: GradeRecord[] | null;
  isRector: boolean;
  schedules?: Schedule[] | null;
  studentId: string;
  teacherId?: string | null;
}

export interface PreescolarReportPayloadInput {
  deliveryDate: string;
  gradeName?: string | null;
  periodName?: string | null;
  student: Student;
}

export interface PreescolarRendererProps {
  deliveryDate: string;
  downloadingStudent: Student | null;
  gradeName?: string | null;
  isPreescolar: boolean;
  periodName?: string | null;
  preescolarRef: RefObject<PreescolarReportHandle | null>;
  records: PreescolarEvaluation[];
}

export interface GradeRecordDialogProps {
  availableSubjects: Subject[];
  availableTeachersForSelectedGrade: Teacher[];
  editingRecord: EditableGradeRecord | null;
  isPending: boolean;
  isRector: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void | Promise<void>;
  open: boolean;
  setEditingRecord: Dispatch<SetStateAction<EditableGradeRecord | null>>;
  teacherOptionsForRecord: Teacher[];
}

export interface PreescolarEvaluationDialogProps {
  availableTeachersForSelectedGrade: Teacher[];
  editingPreescolar: EditablePreescolarEvaluation | null;
  isPending: boolean;
  isRector: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void | Promise<void>;
  open: boolean;
  setEditingPreescolar: Dispatch<SetStateAction<EditablePreescolarEvaluation | null>>;
}
