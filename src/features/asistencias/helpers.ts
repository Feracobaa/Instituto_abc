import type {
  AcademicPeriod,
  AttendanceClassContext,
  AttendanceSaveRow,
  AttendanceStatus,
  Schedule,
  Student,
  StudentAttendance,
} from "@/hooks/school/types";

export interface AttendanceDraftRow {
  justification_note: string;
  status: AttendanceStatus | "";
}

export type AttendanceDraftMap = Record<string, AttendanceDraftRow>;

export function getScheduleDayIndex(attendanceDate: string): number | null {
  if (!attendanceDate) {
    return null;
  }

  const parsed = new Date(`${attendanceDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const jsDay = parsed.getDay();
  if (jsDay === 0 || jsDay === 6) {
    return null;
  }

  return jsDay - 1;
}

export function isDateWithinPeriod(
  attendanceDate: string,
  period?: Pick<AcademicPeriod, "end_date" | "start_date"> | null,
) {
  if (!attendanceDate || !period) {
    return false;
  }

  return attendanceDate >= period.start_date && attendanceDate <= period.end_date;
}

export function isScheduleActiveOnDate(
  schedule: Pick<Schedule, "end_date" | "start_date">,
  attendanceDate: string,
) {
  if (!attendanceDate) {
    return false;
  }

  if (schedule.start_date && schedule.start_date > attendanceDate) {
    return false;
  }

  if (schedule.end_date && schedule.end_date < attendanceDate) {
    return false;
  }

  return true;
}

export function buildAttendanceClassContexts(
  schedules: Schedule[] | null | undefined,
  attendanceDate: string,
): AttendanceClassContext[] {
  const scheduleDayIndex = getScheduleDayIndex(attendanceDate);

  if (!schedules?.length || scheduleDayIndex === null) {
    return [];
  }

  const contextsByKey = new Map<string, AttendanceClassContext>();

  schedules.forEach((schedule) => {
    if (
      schedule.day_of_week !== scheduleDayIndex
      || !schedule.grade_id
      || !schedule.subject_id
      || !schedule.teacher_id
      || !isScheduleActiveOnDate(schedule, attendanceDate)
    ) {
      return;
    }

    const key = `${schedule.grade_id}|${schedule.subject_id}|${schedule.teacher_id}`;

    if (!contextsByKey.has(key)) {
      contextsByKey.set(key, {
        grade_id: schedule.grade_id,
        grade_name: schedule.grades?.name ?? "Sin grado",
        subject_id: schedule.subject_id,
        subject_name: schedule.subjects?.name ?? "Sin materia",
        teacher_id: schedule.teacher_id,
        teacher_name: schedule.teachers?.full_name ?? "Sin docente",
      });
    }
  });

  return [...contextsByKey.values()].sort((left, right) => {
    const gradeCompare = left.grade_name.localeCompare(right.grade_name, "es");
    if (gradeCompare !== 0) {
      return gradeCompare;
    }

    const subjectCompare = left.subject_name.localeCompare(right.subject_name, "es");
    if (subjectCompare !== 0) {
      return subjectCompare;
    }

    return left.teacher_name.localeCompare(right.teacher_name, "es");
  });
}

export function buildAttendanceDraftFromData(
  students: Student[] | null | undefined,
  records: StudentAttendance[] | null | undefined,
): AttendanceDraftMap {
  const recordsByStudentId = new Map<string, StudentAttendance>();

  (records ?? []).forEach((record) => {
    recordsByStudentId.set(record.student_id, record);
  });

  const draft: AttendanceDraftMap = {};

  (students ?? []).forEach((student) => {
    const existing = recordsByStudentId.get(student.id);

    draft[student.id] = {
      justification_note: existing?.justification_note ?? "",
      status: existing?.status ?? "",
    };
  });

  return draft;
}

export function buildAttendanceSaveRows(
  students: Student[] | null | undefined,
  draftMap: AttendanceDraftMap,
): {
  missingStudentIds: string[];
  rows: AttendanceSaveRow[];
} {
  const missingStudentIds: string[] = [];
  const rows: AttendanceSaveRow[] = [];

  (students ?? []).forEach((student) => {
    const draft = draftMap[student.id];

    if (!draft?.status) {
      missingStudentIds.push(student.id);
      return;
    }

    rows.push({
      justification_note:
        draft.status === "justified"
          ? (draft.justification_note.trim() || null)
          : null,
      status: draft.status,
      student_id: student.id,
    });
  });

  return { missingStudentIds, rows };
}
