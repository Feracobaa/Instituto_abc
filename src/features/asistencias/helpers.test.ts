import { describe, expect, it } from "vitest";
import type { Schedule, Student, StudentAttendance } from "@/hooks/school/types";
import {
  buildAttendanceClassContexts,
  buildAttendanceDraftFromData,
  buildAttendanceSaveRows,
  getScheduleDayIndex,
  isDateWithinPeriod,
} from "@/features/asistencias/helpers";

describe("asistencias helpers", () => {
  it("convierte fecha a indice de horario lunes-viernes", () => {
    expect(getScheduleDayIndex("2026-04-20")).toBe(0); // lunes
    expect(getScheduleDayIndex("2026-04-24")).toBe(4); // viernes
    expect(getScheduleDayIndex("2026-04-25")).toBeNull(); // sabado
  });

  it("filtra contextos validos por fecha, dia y deduplica bloques", () => {
    const schedules = [
      {
        day_of_week: 0,
        end_date: null,
        grade_id: "grade-a",
        id: "s1",
        start_date: null,
        subject_id: "subject-math",
        teacher_id: "teacher-1",
        grades: { id: "grade-a", level: 1, name: "Primero" },
        subjects: { color: "bg-blue-500", created_at: "", grade_level: 1, id: "subject-math", name: "Matematicas", parent_id: null },
        teachers: { created_at: "", email: "t1@x.com", full_name: "Ana", id: "teacher-1", is_active: true, phone: null, updated_at: "", user_id: "u1" },
      },
      {
        day_of_week: 0,
        end_date: null,
        grade_id: "grade-a",
        id: "s2",
        start_date: null,
        subject_id: "subject-math",
        teacher_id: "teacher-1",
        grades: { id: "grade-a", level: 1, name: "Primero" },
        subjects: { color: "bg-blue-500", created_at: "", grade_level: 1, id: "subject-math", name: "Matematicas", parent_id: null },
        teachers: { created_at: "", email: "t1@x.com", full_name: "Ana", id: "teacher-1", is_active: true, phone: null, updated_at: "", user_id: "u1" },
      },
      {
        day_of_week: 1,
        end_date: null,
        grade_id: "grade-a",
        id: "s3",
        start_date: null,
        subject_id: "subject-math",
        teacher_id: "teacher-1",
        grades: { id: "grade-a", level: 1, name: "Primero" },
        subjects: { color: "bg-blue-500", created_at: "", grade_level: 1, id: "subject-math", name: "Matematicas", parent_id: null },
        teachers: { created_at: "", email: "t1@x.com", full_name: "Ana", id: "teacher-1", is_active: true, phone: null, updated_at: "", user_id: "u1" },
      },
      {
        day_of_week: 0,
        end_date: "2026-04-10",
        grade_id: "grade-b",
        id: "s4",
        start_date: null,
        subject_id: "subject-eng",
        teacher_id: "teacher-2",
        grades: { id: "grade-b", level: 2, name: "Segundo" },
        subjects: { color: "bg-green-500", created_at: "", grade_level: 2, id: "subject-eng", name: "Ingles", parent_id: null },
        teachers: { created_at: "", email: "t2@x.com", full_name: "Luis", id: "teacher-2", is_active: true, phone: null, updated_at: "", user_id: "u2" },
      },
    ] as unknown as Schedule[];

    const contexts = buildAttendanceClassContexts(schedules, "2026-04-20");

    expect(contexts).toHaveLength(1);
    expect(contexts[0]).toMatchObject({
      grade_id: "grade-a",
      subject_id: "subject-math",
      teacher_id: "teacher-1",
    });
  });

  it("arma borrador desde registros guardados y valida payload completo", () => {
    const students = [
      { id: "student-1", full_name: "Ana" },
      { id: "student-2", full_name: "Luis" },
    ] as unknown as Student[];

    const records = [
      { student_id: "student-1", status: "present", justification_note: null },
    ] as unknown as StudentAttendance[];

    const draft = buildAttendanceDraftFromData(students, records);
    expect(draft["student-1"].status).toBe("present");
    expect(draft["student-2"].status).toBe("");

    const payload = buildAttendanceSaveRows(students, {
      ...draft,
      "student-2": {
        justification_note: "Cita medica",
        status: "justified",
      },
    });

    expect(payload.missingStudentIds).toEqual([]);
    expect(payload.rows).toEqual([
      { justification_note: null, status: "present", student_id: "student-1" },
      { justification_note: "Cita medica", status: "justified", student_id: "student-2" },
    ]);
  });

  it("detecta fechas fuera del periodo activo", () => {
    expect(
      isDateWithinPeriod("2026-04-20", {
        end_date: "2026-05-30",
        start_date: "2026-02-01",
      }),
    ).toBe(true);

    expect(
      isDateWithinPeriod("2026-06-01", {
        end_date: "2026-05-30",
        start_date: "2026-02-01",
      }),
    ).toBe(false);
  });
});
