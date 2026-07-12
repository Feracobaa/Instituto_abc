import { describe, expect, it } from "vitest";
import { findScheduleConflicts, getScheduleDraftsForSave } from "@/features/horarios/conflicts";
import type { Grade, Schedule, Teacher } from "@/hooks/useSchoolData";

describe("schedule conflicts", () => {
  const grades = [
    { id: "grade-1", name: "Primero" },
    { id: "grade-2", name: "Segundo" },
  ] as Grade[];

  const teachers = [{ id: "teacher-1", full_name: "Ana Perez" }] as Teacher[];

  const schedules = [
    {
      day_of_week: 0,
      end_time: "08:00:00",
      grade_id: "grade-1",
      id: "schedule-1",
      start_time: "07:00:00",
      teacher_id: "teacher-1",
      grades: { name: "Primero" },
      teachers: { full_name: "Ana Perez" },
    },
  ] as Schedule[];

  it("detecta cruce por grado y por docente", () => {
    const conflicts = findScheduleConflicts(
      {
        dayOfWeek: 0,
        endTime: "07:30",
        gradeId: "grade-1",
        startTime: "06:45",
        teacherId: "teacher-1",
      },
      schedules,
      grades,
      teachers,
    );

    expect(conflicts.map((conflict) => conflict.type)).toEqual(["grade", "teacher"]);
  });

  it("genera borradores para toda la semana cuando corresponde", () => {
    expect(
      getScheduleDraftsForSave("grade-1", "07:00", "08:00", "teacher-1", undefined, true).map(
        (draft) => draft.dayOfWeek,
      ),
    ).toEqual([0, 1, 2, 3, 4]);
  });
});
