import type jsPDF from "jspdf";

// ─── Tipos e Interfaces de la Institución ────────────────────────────────────

export interface PdfInstitutionData {
  name: string;
  nit?: string;
  address?: string;
  phone?: string;
  rectorName?: string;
  logoUrl?: string;
}

export const FALLBACK_INST = {
  republic: "REPÚBLICA DE COLOMBIA",
  ministry: "MINISTERIO DE EDUCACIÓN NACIONAL",
  department: "DEPARTAMENTO DEL MAGDALENA",
  name: "INSTITUCIÓN EDUCATIVA INSTITUTO PEDAGÓGICO ABC",
  address: "Calle 7 #14-42 - Ciénaga, Magdalena",
  phone: "Tel: 3104755752",
  nit: "NIT: 39.144.200-1",
};

export const PREESCOLAR_GRADES = [
  "párvulo", "pre-jardín", "jardín", "transición", "preescolar",
  "parvulo", "pre-jardin", "jardin", "transicion",
];

// ─── Tipos e Interfaces de Calificaciones y Boletines ────────────────────────

export interface DetailedGradeRecord {
  period_id: string;
  subjects: { id: string; name: string } | null;
  grade: number;
  achievements: string | null;
  comments: string | null;
  academic_periods: { name: string } | null;
}

export interface Student {
  full_name: string;
  grades: { name: string } | null;
}

export interface ReportCardStudentSummary {
  groupDirectorName?: string | null;
  periodAverage?: number | null;
  rank?: number | null;
  totalStudents?: number;
}

export interface Period {
  id: string;
  name: string;
}

export interface SubjectGroup {
  currentRecord: DetailedGradeRecord | null;
  grades: Record<string, DetailedGradeRecord>;
  ihs: number;
  name: string;
}

export type GradeTableRow = Array<string | number>;

export type AutoTableCell = string | {
  colSpan?: number;
  content: string;
  rowSpan?: number;
  styles?: Record<string, unknown>;
};

// ─── Tipos para Horarios ──────────────────────────────────────────────────────

export interface ScheduleEntry {
  subjects: { name: string; color: string } | null;
  teachers: { full_name: string } | null;
  start_time: string | null;
  end_time: string | null;
  day_of_week: number;
}

// ─── Tipos para Guías y Tareas Académicas ────────────────────────────────────

export interface AssignmentPdfData {
  title: string;
  subjectName: string;
  gradeName: string;
  teacherName: string;
  teacherEmail?: string | null;
  studentName?: string;
  periodName?: string;
  dueDate: string;
  createdDate?: string;
  description: string;
  attachmentUrl?: string | null;
}

// ─── Tipos Contables y Financieros ───────────────────────────────────────────

export interface TuitionMonthlyReportRow {
  studentName: string;
  status: string;
  expectedAmount: number;
  paidAmount: number;
  pendingAmount: number;
}

export interface MonthlyFinancialSummary {
  incomeCount: number;
  incomeTotal: number;
  expenseCount: number;
  expenseTotal: number;
}

export interface DownloadTuitionMonthlyReportPDFParams {
  institutionName?: string;
  periodMonth: string;
  monthLabel: string;
  rows: TuitionMonthlyReportRow[];
  financialSummary?: MonthlyFinancialSummary;
}

export interface DownloadPendingTuitionMonthlyReportPDFParams {
  institutionName?: string;
  periodMonth: string;
  monthLabel: string;
  rows: TuitionMonthlyReportRow[];
  financialSummary?: MonthlyFinancialSummary;
}

// ─── Tipos Extendidos de jsPDF ────────────────────────────────────────────────

export type AutoTableCapableDoc = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

export type GStateCapableDoc = {
  GState?: new (options: { opacity: number }) => unknown;
  setGState?: (state: unknown) => unknown;
};
