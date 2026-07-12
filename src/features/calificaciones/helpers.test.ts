import { describe, expect, it } from "vitest";
import {
  buildEditablePartialsFromExisting,
  buildGradeRecordCreatePayload,
  buildGradeRecordUpdatePayload,
  calculateWeightedFinalGrade,
  buildPreescolarCreatePayload,
  buildPreescolarReportPayload,
  buildPreescolarUpdatePayload,
  getAvailableGradesForRole,
  getTeacherOptionsForSubject,
  getTeacherSubjectsForTeacher,
  getVisibleGradeRecordsForStudent,
  isPreescolarGradeName,
} from "@/features/calificaciones/helpers";
import type { Grade, GradeRecord, Schedule, Subject, Teacher } from "@/hooks/useSchoolData";

const gradeA = { id: "grade-a", level: 1, name: "Primero A" } as Grade;
const gradeB = { id: "grade-b", level: 2, name: "Transicion" } as Grade;

const math = { id: "subject-math", name: "Matematicas" } as Subject;
const english = { id: "subject-english", name: "Ingles" } as Subject;

const teacherAna = {
  id: "teacher-ana",
  teacher_grade_assignments: [{ grade_id: "grade-a" }],
  teacher_subjects: [{ subject_id: "subject-math" }],
} as Teacher;

const teacherLuis = {
  id: "teacher-luis",
  teacher_grade_assignments: [{ grade_id: "grade-a" }],
  teacher_subjects: [{ subject_id: "subject-english" }],
} as Teacher;

describe("calificaciones helpers", () => {
  it("detecta nombres de preescolar con y sin tildes", () => {
    expect(isPreescolarGradeName("Transicion")).toBe(true);
    expect(isPreescolarGradeName("Pre-jardin")).toBe(true);
    expect(isPreescolarGradeName("Primero A")).toBe(false);
  });

  it("filtra grados disponibles para profesor segun horarios", () => {
    const schedules = [{ grade_id: "grade-b" }] as Schedule[];

    expect(getAvailableGradesForRole([gradeA, gradeB], schedules, true)).toEqual([gradeA, gradeB]);
    expect(getAvailableGradesForRole([gradeA, gradeB], schedules, false)).toEqual([gradeB]);
  });

  it("obtiene materias y docentes segun asignaciones reales", () => {
    expect(
      getTeacherSubjectsForTeacher([teacherAna, teacherLuis], [math, english], "teacher-ana"),
    ).toEqual([math]);

    expect(getTeacherOptionsForSubject([teacherAna, teacherLuis], "subject-english")).toEqual([
      teacherLuis,
    ]);
  });

  it("mantiene visibilidad de notas propias o de materias agendadas", () => {
    const records = [
      {
        id: "record-own",
        student_id: "student-1",
        subject_id: "subject-math",
        teacher_id: "teacher-ana",
      },
      {
        id: "record-scheduled",
        student_id: "student-1",
        subject_id: "subject-english",
        teacher_id: "teacher-luis",
      },
      {
        id: "record-other-student",
        student_id: "student-2",
        subject_id: "subject-math",
        teacher_id: "teacher-ana",
      },
    ] as GradeRecord[];

    const schedules = [
      { grade_id: "grade-a", subject_id: "subject-english" },
    ] as Schedule[];

    expect(
      getVisibleGradeRecordsForStudent({
        gradeId: "grade-a",
        gradeRecords: records,
        isRector: false,
        schedules,
        studentId: "student-1",
        teacherId: "teacher-ana",
      }).map((record) => record.id),
    ).toEqual(["record-own", "record-scheduled"]);
  });

  it("arma payloads consistentes para notas y preescolar", () => {
    expect(
      buildGradeRecordCreatePayload(
        {
          achievements: "Buen trabajo",
          comments: "Sin novedad",
          grade: 4.5,
          student_id: "student-1",
          subject_id: "subject-math",
          teacher_id: "teacher-ana",
        },
        "period-1",
        "teacher-ana",
      ),
    ).toEqual({
      achievements: "Buen trabajo",
      comments: "Sin novedad",
      grade: 4.5,
      period_id: "period-1",
      student_id: "student-1",
      subject_id: "subject-math",
      teacher_id: "teacher-ana",
    });

    expect(
      buildGradeRecordUpdatePayload(
        {
          achievements: "Buen trabajo",
          comments: "Ajustado",
          grade: 4.8,
          id: "record-1",
          student_id: "student-1",
          subject_id: "subject-math",
          teacher_id: "teacher-ana",
        },
        "teacher-luis",
        true,
      ),
    ).toEqual({
      achievements: "Buen trabajo",
      comments: "Ajustado",
      grade: 4.8,
      id: "record-1",
      teacher_id: "teacher-luis",
    });

    expect(
      buildPreescolarCreatePayload(
        {
          debilidades: "",
          dimension: "Dimension cognitiva",
          fortalezas: "Avanza bien",
          recomendaciones: "Seguir practicando",
          student_id: "student-1",
          teacher_id: "teacher-ana",
        },
        "period-1",
        "teacher-ana",
      ),
    ).toEqual({
      debilidades: "",
      dimension: "Dimension cognitiva",
      fortalezas: "Avanza bien",
      period_id: "period-1",
      recomendaciones: "Seguir practicando",
      student_id: "student-1",
      teacher_id: "teacher-ana",
    });

    expect(
      buildPreescolarUpdatePayload(
        {
          debilidades: "Le cuesta iniciar",
          dimension: "Dimension cognitiva",
          fortalezas: "Avanza bien",
          id: "pre-1",
          recomendaciones: "Seguir practicando",
          student_id: "student-1",
          teacher_id: "teacher-ana",
        },
        "teacher-ana",
        false,
      ),
    ).toEqual({
      debilidades: "Le cuesta iniciar",
      fortalezas: "Avanza bien",
      id: "pre-1",
      recomendaciones: "Seguir practicando",
      teacher_id: undefined,
    });
  });

  it("calcula promedio simple de actividades y omite vacias", () => {
    expect(
      calculateWeightedFinalGrade([
        { grade: 4.0 },
        { grade: 5.0 },
        { grade: 3.0 },
        { grade: 4.0 },
      ]),
    ).toBe(4);

    expect(
      calculateWeightedFinalGrade([
        { grade: 4.0 },
        { grade: "" },
        { grade: 5.0 },
      ]),
    ).toBe(4.5);

    expect(calculateWeightedFinalGrade([{ grade: "" }])).toBeNull();
  });

  it("crea una actividad inicial para el dialogo usando fallback legacy", () => {
    const partials = buildEditablePartialsFromExisting(undefined, 4.2);

    expect(partials).toHaveLength(1);
    expect(partials[0]).toMatchObject({
      activity_name: "Actividad 1",
      grade: 4.2,
      partial_index: 1,
    });
  });

  it("arma el payload del reporte de preescolar con fecha visible", () => {
    const payload = buildPreescolarReportPayload({
      deliveryDate: "2026-04-08",
      gradeName: "Transicion",
      periodName: "Primer Periodo",
      student: { full_name: "Ana Perez" } as never,
    });

    expect(payload.studentInfo).toMatchObject({
      deliveryDate: "08/04/2026",
      grade: "Transicion",
      name: "Ana Perez",
      period: "Primer Periodo",
    });
    expect(payload.schoolInfo.name).toContain("INSTITUTO PEDAGOGICO ABC");
  });
});
