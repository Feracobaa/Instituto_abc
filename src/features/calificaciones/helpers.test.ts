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
  getFilteredStudentGradeRecordsForReport,
  getVisiblePreescolarEvaluationsForStudent,
  isPreescolarGradeName,
  isTeacherGroupDirectorForGrade,
} from "@/features/calificaciones/helpers";
import type { Grade, GradeRecord, PreescolarEvaluation, Schedule, Subject, Teacher } from "@/hooks/useSchoolData";

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

  it("identifica si un docente es Director de Grupo de un grado", () => {
    const directorTeacher = {
      id: "t-dir",
      teacher_grade_assignments: [{ grade_id: "grade-a", is_group_director: true }],
    } as Teacher;

    const normalTeacher = {
      id: "t-norm",
      teacher_grade_assignments: [{ grade_id: "grade-a", is_group_director: false }],
    } as Teacher;

    expect(isTeacherGroupDirectorForGrade(directorTeacher, "grade-a")).toBe(true);
    expect(isTeacherGroupDirectorForGrade(normalTeacher, "grade-a")).toBe(false);
    expect(isTeacherGroupDirectorForGrade(directorTeacher, "grade-b")).toBe(false);
  });

  it("filtra registros de boletin para que un docente no director solo exporte sus propias materias", () => {
    const studentRecords = [
      { id: "r1", student_id: "s1", subject_id: "subject-math", teacher_id: "teacher-ana", grade: 4.8 },
      { id: "r2", student_id: "s1", subject_id: "subject-english", teacher_id: "teacher-luis", grade: 3.5 },
    ] as GradeRecord[];

    const schedulesAna = [{ grade_id: "grade-a", subject_id: "subject-math" }] as Schedule[];

    // 1. Rector ve todas las materias
    const rectorRecords = getFilteredStudentGradeRecordsForReport({
      gradeId: "grade-a",
      isGroupDirector: false,
      isRector: true,
      records: studentRecords,
      schedules: schedulesAna,
      teacherId: "teacher-ana",
    });
    expect(rectorRecords).toHaveLength(2);

    // 2. Director de grupo ve todas las materias del grado
    const directorRecords = getFilteredStudentGradeRecordsForReport({
      gradeId: "grade-a",
      isGroupDirector: true,
      isRector: false,
      records: studentRecords,
      schedules: schedulesAna,
      teacherId: "teacher-ana",
    });
    expect(directorRecords).toHaveLength(2);

    // 3. Docente no director SOLO ve su propia materia (Matemáticas)
    const anaRecords = getFilteredStudentGradeRecordsForReport({
      gradeId: "grade-a",
      isGroupDirector: false,
      isRector: false,
      records: studentRecords,
      schedules: schedulesAna,
      teacherId: "teacher-ana",
    });
    expect(anaRecords).toHaveLength(1);
    expect(anaRecords[0].subject_id).toBe("subject-math");
  });

  it("filtra evaluaciones de preescolar por privacidad del docente", () => {
    const evals = [
      { id: "e1", student_id: "s1", dimension: "Cognitiva", teacher_id: "teacher-ana" },
      { id: "e2", student_id: "s1", dimension: "Corporal", teacher_id: "teacher-luis" },
    ] as PreescolarEvaluation[];

    // Rector ve todo
    expect(getVisiblePreescolarEvaluationsForStudent(evals, "s1", "teacher-ana", true, false)).toHaveLength(2);

    // Docente no director solo ve sus evaluaciones
    const anaEvals = getVisiblePreescolarEvaluationsForStudent(evals, "s1", "teacher-ana", false, false);
    expect(anaEvals).toHaveLength(1);
    expect(anaEvals[0].id).toBe("e1");
  });
});
