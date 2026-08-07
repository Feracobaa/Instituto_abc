export type AssignmentStatus = "draft" | "published" | "archived";
export type SubmissionStatus = "pending" | "submitted" | "evaluated" | "late";

export interface Assignment {
  id: string;
  institution_id: string;
  teacher_id: string;
  grade_id: string;
  subject_id: string;
  period_id?: string | null;
  title: string;
  description_json?: string | null;
  due_date: string;
  attachment_url?: string | null;
  status: AssignmentStatus;
  created_at: string;
  updated_at: string;
  teachers?: { id: string; full_name: string; email: string } | null;
  grades?: { id: string; name: string; level: number } | null;
  subjects?: { id: string; name: string; color?: string | null } | null;
  academic_periods?: { id: string; name: string } | null;
  submissions_count?: number;
  user_submission?: AssignmentSubmission | null;
}

export interface AssignmentSubmission {
  id: string;
  institution_id: string;
  assignment_id: string;
  student_id: string;
  status: SubmissionStatus;
  submitted_at?: string | null;
  submission_text?: string | null;
  file_url?: string | null;
  feedback?: string | null;
  score?: number | null;
  created_at: string;
  updated_at: string;
  students?: { id: string; full_name: string; grade_id?: string | null } | null;
  assignments?: Assignment | null;
}

export interface CreateAssignmentPayload {
  teacher_id: string;
  grade_id: string;
  subject_id: string;
  period_id?: string | null;
  title: string;
  description_json?: string;
  due_date: string;
  attachment_url?: string | null;
  status?: AssignmentStatus;
}

export interface SubmitAssignmentPayload {
  assignment_id: string;
  student_id: string;
  submission_text?: string;
  file?: File | Blob | null;
  file_url?: string | null;
}

export interface EvaluateSubmissionPayload {
  submission_id: string;
  score?: number | null;
  feedback?: string | null;
  status?: SubmissionStatus;
}
