import type { Grade, Schedule, Teacher } from "@/hooks/useSchoolData";

export interface ScheduleDraft {
  dayOfWeek: number;
  endTime: string;
  gradeId: string;
  scheduleId?: string;
  startTime: string;
  teacherId?: string;
}

export interface ScheduleConflict {
  conflictingSchedule: Schedule;
  dayOfWeek: number;
  message: string;
  type: "grade" | "teacher";
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && endA > startB;
}

export function findScheduleConflicts(
  draft: ScheduleDraft,
  schedules: Schedule[],
  grades?: Grade[] | null,
  teachers?: Teacher[] | null,
) {
  return schedules.flatMap((schedule) => {
    if (!schedule.start_time || !schedule.end_time) {
      return [];
    }

    if (schedule.id === draft.scheduleId || schedule.day_of_week !== draft.dayOfWeek) {
      return [];
    }

    const scheduleStart = schedule.start_time.slice(0, 5);
    const scheduleEnd = schedule.end_time.slice(0, 5);

    if (!overlaps(draft.startTime, draft.endTime, scheduleStart, scheduleEnd)) {
      return [];
    }

    const conflicts: ScheduleConflict[] = [];

    if (schedule.grade_id === draft.gradeId) {
      const gradeName =
        grades?.find((grade) => grade.id === draft.gradeId)?.name ||
        schedule.grades?.name ||
        "el grado seleccionado";

      conflicts.push({
        conflictingSchedule: schedule,
        dayOfWeek: draft.dayOfWeek,
        message: `Ya existe un bloque cruzado en ${gradeName} entre ${scheduleStart} y ${scheduleEnd}.`,
        type: "grade",
      });
    }

    if (draft.teacherId && schedule.teacher_id === draft.teacherId) {
      const teacherName =
        teachers?.find((teacher) => teacher.id === draft.teacherId)?.full_name ||
        schedule.teachers?.full_name ||
        "el docente seleccionado";
      const conflictGrade = schedule.grades?.name || "otro grado";

      conflicts.push({
        conflictingSchedule: schedule,
        dayOfWeek: draft.dayOfWeek,
        message: `${teacherName} ya tiene clase en ${conflictGrade} entre ${scheduleStart} y ${scheduleEnd}.`,
        type: "teacher",
      });
    }

    return conflicts;
  });
}

export function getScheduleDraftsForSave(
  gradeId: string,
  startTime: string,
  endTime: string,
  teacherId?: string,
  scheduleId?: string,
  repeatAllWeek = false,
  dayOfWeek = 0,
) {
  const days = repeatAllWeek ? [0, 1, 2, 3, 4] : [dayOfWeek];

  return days.map((day) => ({
    dayOfWeek: day,
    endTime,
    gradeId,
    scheduleId,
    startTime,
    teacherId,
  }));
}
