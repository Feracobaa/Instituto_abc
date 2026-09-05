import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCurrentClassAutoDetect } from "../hooks/useCurrentClassAutoDetect";
import type { Schedule } from "@/hooks/school/types";

describe("useCurrentClassAutoDetect", () => {
  const mockSchedules: Schedule[] = [
    {
      id: "sch-1",
      institution_id: "inst-1",
      day_of_week: 0, // Lunes
      start_time: "08:00:00",
      end_time: "09:00:00",
      grade_id: "grade-1",
      subject_id: "subj-1",
      teacher_id: "teacher-1",
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      created_at: new Date().toISOString(),
      title: null,
      grades: {
        id: "grade-1",
        name: "9°A",
        institution_id: "inst-1",
        academic_level: "secundaria",
        created_at: new Date().toISOString(),
      },
      subjects: {
        id: "subj-1",
        name: "Matemáticas",
        institution_id: "inst-1",
        grade_level: null,
        created_at: new Date().toISOString(),
      },
      teachers: {
        id: "teacher-1",
        full_name: "Prof. Roberto Gómez",
        email: "roberto@colegio.edu",
        user_id: "user-1",
        institution_id: "inst-1",
        is_active: true,
        phone: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
  ];

  it("retorna null si no hay horarios o fecha seleccionada", () => {
    const { result } = renderHook(() =>
      useCurrentClassAutoDetect([], "2026-09-04", "teacher-1")
    );
    expect(result.current.hasActiveClass).toBe(false);
    expect(result.current.activeClass).toBeNull();
  });

  it("retorna null si el día de la semana no coincide con el horario", () => {
    // 2026-09-04 es viernes (day_of_week: 4). mockSchedules tiene lunes (day_of_week: 0)
    const { result } = renderHook(() =>
      useCurrentClassAutoDetect(mockSchedules, "2026-09-04", "teacher-1")
    );
    expect(result.current.hasActiveClass).toBe(false);
    expect(result.current.activeClass).toBeNull();
  });
});
