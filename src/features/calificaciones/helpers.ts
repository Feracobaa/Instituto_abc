import type { SchoolInfo, StudentInfo } from "@/components/reports/PreescolarReport";
import type {
  Grade,
  GradeRecord,
  GradeRecordPartial,
  PreescolarEvaluation,
  Schedule,
  Student,
  Subject,
  Teacher,
} from "@/hooks/useSchoolData";
import type {
  EditableGradeRecord,
  EditablePartialGrade,
  EditablePreescolarEvaluation,
  GradeRecordVisibilityInput,
  PreescolarReportPayloadInput,
} from "@/features/calificaciones/types";
import { formatReportAverage, formatReportRank } from "@/lib/reportCardFormatting";
import { PREESCOLAR_DEFAULT_FORTALEZAS } from "@/utils/constants";

const PREESCOLAR_TERMS = ["parvulo", "pre-jardin", "jardin", "transicion", "preescolar"];

export const gradeLegendItems = [
  { color: "bg-emerald-500", label: "Superior (4.6 - 5.0)" },
  { color: "bg-success", label: "Alto (4.0 - 4.5)" },
  { color: "bg-warning", label: "Basico (3.0 - 3.9)" },
  { color: "bg-orange-500", label: "Bajo (2.0 - 2.9)" },
  { color: "bg-destructive", label: "Muy Bajo (1.0 - 1.9)" },
] as const;

const preescolarSchoolInfo: SchoolInfo = {
  republic: "REPUBLICA DE COLOMBIA",
  ministry: "MINISTERIO DE EDUCACION NACIONAL",
  department: "DEPARTAMENTO DEL MAGDALENA",
  city: "Cienaga, Magdalena",
  name: "INSTITUCION EDUCATIVA INSTITUTO PEDAGOGICO ABC",
  address: "Calle 7 #14-42 - Cienaga, Magdalena",
  phoneNit: "Tel: 3104755752   NIT: 39.144.200-1",
  logoUrl: "/logo-iabc.jpg",
};

export function normalizeSearchText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function isPreescolarGradeName(gradeName?: string | null) {
  const normalized = normalizeSearchText(gradeName);
  return PREESCOLAR_TERMS.some((term) => normalized.includes(term));
}

export function getGradeSublabel(grade: number) {
  if (grade >= 4.6) return "Superior";
  if (grade >= 4.0) return "Alto";
  if (grade >= 3.0) return "Basico";
  if (grade >= 2.0) return "Bajo";
  return "Muy Bajo";
}

export function getGradeColor(grade: number) {
  if (grade >= 4.6) return "bg-emerald-500 text-white";
  if (grade >= 4.0) return "bg-success text-success-foreground";
  if (grade >= 3.0) return "bg-warning text-warning-foreground";
  if (grade >= 2.0) return "bg-orange-500 text-white";
  return "bg-destructive text-destructive-foreground";
}

export function buildDefaultPartialGrades(): EditablePartialGrade[] {
  return [{
    activity_name: "Actividad 1",
    achievements: "",
    comments: "",
    grade: "",
    partial_index: 1,
  }];
}

export function calculateWeightedFinalGrade(
  partials?: Array<{
    grade: number | "" | null;
  }>,
) {
  const validPartials = (partials ?? []).filter(
    (partial) =>
      typeof partial.grade === "number"
      && !Number.isNaN(partial.grade),
  );

  if (validPartials.length === 0) {
    return null;
  }

  const totalGrades = validPartials.reduce(
    (accumulator, partial) => accumulator + (partial.grade as number),
    0,
  );

  return Number((totalGrades / validPartials.length).toFixed(1));
}

export function buildEditablePartialsFromExisting(
  partials?: GradeRecordPartial[] | null,
  fallbackGrade?: number | null,
): EditablePartialGrade[] {
  if (partials && partials.length > 0) {
    return [...partials]
      .sort((first, second) => first.partial_index - second.partial_index)
      .map((partial, index) => ({
        activity_name: partial.activity_name ?? `Actividad ${index + 1}`,
        achievements: partial.achievements ?? "",
        comments: partial.comments ?? "",
        grade: typeof partial.grade === "number" ? partial.grade : "",
        partial_index: index + 1,
      }));
  }

  return [{
    activity_name: "Actividad 1",
    achievements: "",
    comments: "",
    grade: typeof fallbackGrade === "number" ? fallbackGrade : "",
    partial_index: 1,
  }];
}

export function deriveRecordSummaryFromPartials(
  partials?: EditablePartialGrade[],
) {
  const achievements =
    partials?.find((partial) => partial.achievements.trim().length > 0)?.achievements ?? "";
  const comments =
    partials?.find((partial) => partial.comments.trim().length > 0)?.comments ?? "";

  return { achievements, comments };
}

export function buildEmptyGradeRecord(
  studentId: string,
  isRector: boolean,
  teacherId?: string | null,
): EditableGradeRecord {
  return {
    achievements: "",
    comments: "",
    final_grade: null,
    partials: buildDefaultPartialGrades(),
    student_id: studentId,
    subject_id: "",
    teacher_id: isRector ? "" : teacherId ?? "",
  };
}

export function buildEmptyPreescolarEvaluation(
  studentId: string,
  isRector: boolean,
  teacherId?: string | null,
): EditablePreescolarEvaluation {
  return {
    debilidades: "",
    dimension: "",
    fortalezas: "",
    recomendaciones: "",
    student_id: studentId,
    teacher_id: isRector ? "" : teacherId ?? "",
  };
}

export function applyPreescolarDimensionSelection(
  draft: EditablePreescolarEvaluation,
  dimension: string,
): EditablePreescolarEvaluation {
  return {
    ...draft,
    dimension,
    fortalezas:
      !draft.id && !draft.fortalezas
        ? PREESCOLAR_DEFAULT_FORTALEZAS[dimension] ?? ""
        : draft.fortalezas,
  };
}

export function getAvailableGradesForRole(
  grades?: Grade[] | null,
  schedules?: Schedule[] | null,
  isRector = false,
) {
  if (!grades?.length) {
    return [];
  }

  if (isRector) {
    return grades;
  }

  const allowedGradeIds = new Set(
    (schedules ?? [])
      .map((schedule) => schedule.grade_id)
      .filter((gradeId): gradeId is string => Boolean(gradeId)),
  );

  return grades.filter((grade) => allowedGradeIds.has(grade.id));
}

export function getTeachersForGrade(teachers?: Teacher[] | null, gradeId?: string) {
  if (!teachers?.length || !gradeId) {
    return [];
  }

  return teachers.filter((teacher) => isTeacherAssignedToGrade(teacher, gradeId));
}

export function getTeacherSubjectsForTeacher(
  teachers?: Teacher[] | null,
  subjects?: Subject[] | null,
  teacherId?: string | null,
) {
  if (!teachers?.length || !subjects?.length || !teacherId) {
    return [];
  }

  const selectedTeacher = teachers.find((teacher) => teacher.id === teacherId);
  const subjectIds = new Set(
    selectedTeacher?.teacher_subjects?.map((assignment) => assignment.subject_id) ?? [],
  );

  return subjects.filter((subject) => subjectIds.has(subject.id));
}

export function getTeacherOptionsForSubject(teachers: Teacher[], subjectId?: string) {
  if (!subjectId) {
    return teachers;
  }

  return teachers.filter((teacher) => isTeacherAssignedToSubject(teacher, subjectId));
}

export function isTeacherAssignedToGrade(
  teacher?: Pick<Teacher, "teacher_grade_assignments"> | null,
  gradeId?: string,
) {
  if (!teacher || !gradeId) {
    return false;
  }

  return (
    teacher.teacher_grade_assignments?.some((assignment) => assignment.grade_id === gradeId) ?? false
  );
}

export function isTeacherAssignedToSubject(
  teacher?: Pick<Teacher, "teacher_subjects"> | null,
  subjectId?: string,
) {
  if (!teacher || !subjectId) {
    return false;
  }

  return teacher.teacher_subjects?.some((assignment) => assignment.subject_id === subjectId) ?? false;
}

export function getVisibleGradeRecordsForStudent({
  gradeId,
  gradeRecords,
  isRector,
  schedules,
  studentId,
  teacherId,
}: GradeRecordVisibilityInput) {
  return (gradeRecords ?? []).filter((record) => {
    if (record.student_id !== studentId) {
      return false;
    }

    if (isRector) {
      return true;
    }

    if (teacherId && record.teacher_id === teacherId) {
      return true;
    }

    return (
      schedules?.some(
        (schedule) => schedule.grade_id === gradeId && schedule.subject_id === record.subject_id,
      ) ?? false
    );
  });
}

export function getVisiblePreescolarEvaluationsForStudent(
  evaluations?: PreescolarEvaluation[] | null,
  studentId?: string,
) {
  if (!studentId) {
    return [];
  }

  return (evaluations ?? []).filter((evaluation) => evaluation.student_id === studentId);
}

export function isPreescolarEvaluationRecord(
  record: GradeRecord | PreescolarEvaluation,
): record is PreescolarEvaluation {
  return "dimension" in record;
}

export function buildGradeRecordCreatePayload(
  draft: EditableGradeRecord,
  periodId: string,
  teacherId: string,
) {
  const finalGrade = typeof draft.grade === "number"
    ? draft.grade
    : typeof draft.final_grade === "number"
      ? draft.final_grade
      : calculateWeightedFinalGrade(draft.partials) ?? 3;

  return {
    achievements: draft.achievements,
    comments: draft.comments,
    grade: finalGrade,
    period_id: periodId,
    student_id: draft.student_id,
    subject_id: draft.subject_id,
    teacher_id: teacherId,
  };
}

export function buildGradeRecordUpdatePayload(
  draft: EditableGradeRecord,
  teacherId: string,
  isRector: boolean,
) {
  const finalGrade = typeof draft.grade === "number"
    ? draft.grade
    : typeof draft.final_grade === "number"
      ? draft.final_grade
      : calculateWeightedFinalGrade(draft.partials) ?? 3;

  return {
    achievements: draft.achievements,
    comments: draft.comments,
    grade: finalGrade,
    id: draft.id as string,
    teacher_id: isRector ? teacherId : undefined,
  };
}

export function buildPreescolarCreatePayload(
  draft: EditablePreescolarEvaluation,
  periodId: string,
  teacherId: string,
) {
  return {
    debilidades: draft.debilidades,
    dimension: draft.dimension,
    fortalezas: draft.fortalezas,
    period_id: periodId,
    recomendaciones: draft.recomendaciones,
    student_id: draft.student_id,
    teacher_id: teacherId,
  };
}

export function buildPreescolarUpdatePayload(
  draft: EditablePreescolarEvaluation,
  teacherId: string,
  isRector: boolean,
) {
  return {
    debilidades: draft.debilidades,
    fortalezas: draft.fortalezas,
    id: draft.id as string,
    recomendaciones: draft.recomendaciones,
    teacher_id: isRector ? teacherId : undefined,
  };
}

export function formatDeliveryDate(deliveryDate: string) {
  if (!deliveryDate) {
    return new Date().toLocaleDateString("es-CO");
  }

  return deliveryDate.split("-").reverse().join("/");
}

export function buildPreescolarReportPayload({
  deliveryDate,
  groupDirectorName,
  gradeName,
  periodName,
  reportSummary,
  student,
}: PreescolarReportPayloadInput): {
  schoolInfo: SchoolInfo;
  studentInfo: StudentInfo;
} {
  return {
    schoolInfo: preescolarSchoolInfo,
    studentInfo: {
      average: formatReportAverage(reportSummary?.periodAverage ?? null),
      deliveryDate: formatDeliveryDate(deliveryDate),
      director: groupDirectorName || "_______________________",
      grade: gradeName || "Preescolar",
      name: student.full_name,
      period: periodName || "Primer Periodo",
      rank: formatReportRank(reportSummary?.rank ?? null, reportSummary?.totalStudents ?? 0),
      year: new Date().getFullYear().toString(),
    },
  };
}
