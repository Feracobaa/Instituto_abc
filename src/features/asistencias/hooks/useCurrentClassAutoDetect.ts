import { useMemo } from "react";
import type { AttendanceClassContext, Schedule } from "@/hooks/school/types";
import { getScheduleDayIndex, isScheduleActiveOnDate } from "../helpers";

export interface ActiveClassScheduleInfo {
  context: AttendanceClassContext;
  endTime: string;
  gradeId: string;
  gradeName: string;
  startTime: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return -1;
  const parts = timeStr.split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

export function useCurrentClassAutoDetect(
  schedules: Schedule[] | null | undefined,
  selectedDate: string,
  teacherId?: string,
): {
  activeClass: ActiveClassScheduleInfo | null;
  hasActiveClass: boolean;
} {
  return useMemo(() => {
    if (!schedules?.length || !selectedDate) {
      return { activeClass: null, hasActiveClass: false };
    }

    const todayDayIndex = getScheduleDayIndex(selectedDate);
    if (todayDayIndex === null) {
      return { activeClass: null, hasActiveClass: false };
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Buscar si hay un bloque en este momento para la fecha y el docente
    const matchingSchedule = schedules.find((s) => {
      if (!s.grade_id || !s.subject_id || !s.teacher_id) return false;
      if (teacherId && s.teacher_id !== teacherId) return false;
      if (s.day_of_week !== todayDayIndex) return false;
      if (!isScheduleActiveOnDate(s, selectedDate)) return false;

      const startMin = parseTimeToMinutes(s.start_time);
      const endMin = parseTimeToMinutes(s.end_time);

      if (startMin < 0 || endMin < 0) return false;

      // Clase activa: la hora actual se encuentra dentro del rango de clase (o con 10 min de anticipación)
      return currentMinutes >= startMin - 10 && currentMinutes <= endMin;
    });

    if (!matchingSchedule) {
      return { activeClass: null, hasActiveClass: false };
    }

    const activeClass: ActiveClassScheduleInfo = {
      context: {
        grade_id: matchingSchedule.grade_id!,
        grade_name: matchingSchedule.grades?.name ?? "Sin grado",
        is_scheduled_for_selected_date: true,
        subject_id: matchingSchedule.subject_id!,
        subject_name: matchingSchedule.subjects?.name ?? "Sin materia",
        teacher_id: matchingSchedule.teacher_id!,
        teacher_name: matchingSchedule.teachers?.full_name ?? "Sin docente",
      },
      endTime: matchingSchedule.end_time.substring(0, 5),
      gradeId: matchingSchedule.grade_id!,
      gradeName: matchingSchedule.grades?.name ?? "Sin grado",
      startTime: matchingSchedule.start_time.substring(0, 5),
      subjectId: matchingSchedule.subject_id!,
      subjectName: matchingSchedule.subjects?.name ?? "Sin materia",
      teacherId: matchingSchedule.teacher_id!,
      teacherName: matchingSchedule.teachers?.full_name ?? "Sin docente",
    };

    return { activeClass, hasActiveClass: true };
  }, [schedules, selectedDate, teacherId]);
}
