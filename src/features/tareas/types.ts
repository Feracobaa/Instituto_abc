import type { Assignment, AssignmentSubmission } from "@/types/assignments";

// ─── Tipos para Gestión Docente ──────────────────────────────────────────────

export interface TeacherAssignmentStatsData {
  total: number;
  active: number;
  pastDue: number;
  uniqueGrades: number;
  uniqueSubjects: number;
}

export interface TeacherAssignmentFilterProps {
  search: string;
  onSearchChange: (val: string) => void;
  selectedGrade: string;
  onGradeChange: (val: string) => void;
  selectedSubject: string;
  onSubjectChange: (val: string) => void;
  grades: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; name: string }>;
  onOpenCreate: () => void;
}

export interface TeacherAssignmentCardProps {
  assignment: Assignment;
  index: number;
  onOpenSubmissions: (assignment: Assignment) => void;
  onDownloadPdf: (assignment: Assignment) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export interface CreateAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onTitleChange: (val: string) => void;
  gradeId: string;
  onGradeIdChange: (val: string) => void;
  subjectId: string;
  onSubjectIdChange: (val: string) => void;
  periodId: string;
  onPeriodIdChange: (val: string) => void;
  dueDate: string;
  onDueDateChange: (val: string) => void;
  description: string;
  onDescriptionChange: (val: string) => void;
  grades: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; name: string }>;
  periods: Array<{ id: string; name: string; is_active?: boolean }>;
  onSubmit: () => Promise<void>;
  isPending: boolean;
}

export interface SubmissionsReviewDialogProps {
  assignment: Assignment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Tipos para Portal Estudiantil y Familias ────────────────────────────────

export interface StudentAssignmentMetrics {
  total: number;
  submitted: number;
  evaluatedCount: number;
  pending: number;
  late: number;
  avgScore: string | null;
  complianceRate: number;
}

export type StudentTabFilter = "all" | "pending" | "submitted" | "evaluated";

export interface StudentAssignmentFilterProps {
  selectedTab: StudentTabFilter;
  onTabChange: (tab: StudentTabFilter) => void;
  selectedSubject: string;
  onSubjectChange: (subjectId: string) => void;
  subjects: Array<[string, string]>; // [id, name]
  metrics: StudentAssignmentMetrics;
}

export interface StudentAssignmentCardProps {
  assignment: Assignment;
  index: number;
  onOpenDetail: (assignment: Assignment) => void;
  onOpenSubmission: (assignment: Assignment) => void;
  onDownloadPdf: (assignment: Assignment) => Promise<void>;
}

export interface AssignmentDetailDialogProps {
  assignment: Assignment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownloadPdf: (assignment: Assignment) => Promise<void>;
}

export interface SubmitAssignmentDialogProps {
  assignment: Assignment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissionText: string;
  onSubmissionTextChange: (val: string) => void;
  selectedFile: File | null;
  filePreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (e: React.MouseEvent) => void;
  onSubmit: () => Promise<void>;
  isPending: boolean;
}

export interface SubmissionFeedbackDialogProps {
  submission: AssignmentSubmission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
