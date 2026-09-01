import type { Assignment } from "@/types/assignments";
import type { StudentAssignmentMetrics, TeacherAssignmentStatsData } from "./types";

/**
 * Calcula estadísticas y métricas agregadas para la vista docente
 */
export function calculateTeacherStats(assignments: Assignment[]): TeacherAssignmentStatsData {
  const total = assignments.length;
  const now = new Date();
  const active = assignments.filter((a) => new Date(a.due_date) >= now).length;
  const pastDue = total - active;
  const uniqueGrades = new Set(assignments.map((a) => a.grade_id)).size;
  const uniqueSubjects = new Set(assignments.map((a) => a.subject_id)).size;

  return { total, active, pastDue, uniqueGrades, uniqueSubjects };
}

/**
 * Calcula estadísticas de desempeño y cumplimiento para el estudiante
 */
export function calculateStudentMetrics(assignments: Assignment[]): StudentAssignmentMetrics {
  const total = assignments.length;
  const submitted = assignments.filter((a) => Boolean(a.user_submission?.submitted_at)).length;
  const evaluated = assignments.filter((a) => a.user_submission?.status === "evaluated");
  const evaluatedCount = evaluated.length;

  const scores = evaluated
    .map((a) => a.user_submission?.score)
    .filter((s): s is number => typeof s === "number");
  const avgScore =
    scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : null;

  const pending = assignments.filter(
    (a) => !a.user_submission?.submitted_at && new Date(a.due_date) >= new Date()
  ).length;

  const late = assignments.filter(
    (a) => !a.user_submission?.submitted_at && new Date(a.due_date) < new Date()
  ).length;

  const complianceRate = total > 0 ? Math.round((submitted / total) * 100) : 100;

  return { total, submitted, evaluatedCount, pending, late, avgScore, complianceRate };
}

/**
 * Formatea el tiempo relativo restante para una fecha de entrega
 */
export function formatRelativeDueDate(dateStr: string): {
  text: string;
  isLate: boolean;
  isNear: boolean;
} {
  const due = new Date(dateStr);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return { text: "Vencida", isLate: true, isNear: false };
  }
  if (diffDays === 0 || diffDays === 1) {
    return { text: "Vence hoy o mañana", isLate: false, isNear: true };
  }
  return { text: `Vence en ${diffDays} días`, isLate: false, isNear: false };
}

/**
 * Extrae las asignaturas únicas de una lista de tareas
 */
export function extractUniqueSubjects(assignments: Assignment[]): Array<[string, string]> {
  const map = new Map<string, string>();
  assignments.forEach((a) => {
    if (a.subjects) {
      map.set(a.subjects.id, a.subjects.name);
    }
  });
  return Array.from(map.entries());
}

/**
 * Limpia tags HTML de un texto de descripción
 */
export function sanitizeAssignmentDescription(desc?: string | null): string {
  if (!desc) return "Sin instrucciones adicionales.";
  return desc.replace(/<[^>]*>?/gm, "").trim() || "Sin instrucciones adicionales.";
}

/**
 * Filtra los grados visibles según el rol del usuario (Rector ve todos, Docente solo los asignados)
 */
export function getFilteredGradesForUser<T extends { id: string; name: string }>({
  allGrades,
  teacher,
  teacherSchedules,
  isRector,
}: {
  allGrades?: T[] | null;
  teacher?: { teacher_grade_assignments?: Array<{ grade_id: string }> } | null;
  teacherSchedules?: Array<{ grade_id: string }> | null;
  isRector: boolean;
}): T[] {
  if (!allGrades?.length) return [];
  if (isRector) return allGrades;

  const allowedGradeIds = new Set<string>();

  // 1. Asignaciones directas de grados
  teacher?.teacher_grade_assignments?.forEach((tga) => {
    if (tga.grade_id) allowedGradeIds.add(tga.grade_id);
  });

  // 2. Grados con horarios de clase asignados
  teacherSchedules?.forEach((sch) => {
    if (sch.grade_id) allowedGradeIds.add(sch.grade_id);
  });

  return allGrades.filter((g) => allowedGradeIds.has(g.id));
}

/**
 * Filtra las asignaturas visibles según el rol del usuario y el grado seleccionado
 */
export function getFilteredSubjectsForUser<T extends { id: string; name: string }>({
  allSubjects,
  teacher,
  teacherSchedules,
  selectedGradeId,
  isRector,
}: {
  allSubjects?: T[] | null;
  teacher?: { teacher_subjects?: Array<{ subject_id: string }> } | null;
  teacherSchedules?: Array<{ grade_id: string; subject_id: string }> | null;
  selectedGradeId?: string;
  isRector: boolean;
}): T[] {
  if (!allSubjects?.length) return [];
  if (isRector) return allSubjects;

  const allowedSubjectIds = new Set<string>();

  // Si se seleccionó un grado específico en el formulario, buscamos las materias asignadas a ese grado
  if (selectedGradeId && teacherSchedules?.length) {
    teacherSchedules.forEach((sch) => {
      if (sch.grade_id === selectedGradeId && sch.subject_id) {
        allowedSubjectIds.add(sch.subject_id);
      }
    });
  }

  // Si no hay filtro de grado o no encontramos materias por horario, usamos las materias generales del docente
  if (allowedSubjectIds.size === 0) {
    teacher?.teacher_subjects?.forEach((ts) => {
      if (ts.subject_id) allowedSubjectIds.add(ts.subject_id);
    });

    teacherSchedules?.forEach((sch) => {
      if (sch.subject_id) allowedSubjectIds.add(sch.subject_id);
    });
  }

  return allSubjects.filter((s) => allowedSubjectIds.has(s.id));
}
