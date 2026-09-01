import { describe, it, expect } from "vitest";
import {
  calculateTeacherStats,
  calculateStudentMetrics,
  formatRelativeDueDate,
  extractUniqueSubjects,
  sanitizeAssignmentDescription,
  getFilteredGradesForUser,
  getFilteredSubjectsForUser,
} from "../helpers";
import type { Assignment } from "@/types/assignments";

describe("Tareas Feature Helpers (Lógica y Métricas)", () => {
  const mockAssignments: Assignment[] = [
    {
      id: "a1",
      institution_id: "inst-1",
      teacher_id: "t1",
      grade_id: "g1",
      subject_id: "s1",
      period_id: "p1",
      title: "Guía 1 de Fracciones",
      description_json: "<p>Resolver ejercicios 1 al 10</p>",
      attachment_url: null,
      status: "published",
      due_date: new Date(Date.now() + 86400000 * 5).toISOString(), // Vence en 5 días
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      subjects: { id: "s1", name: "Matemáticas", color: "bg-blue-500" },
      grades: { id: "g1", name: "Quinto A", level: 5 },
      teachers: { id: "t1", full_name: "Prof. Alberto", email: "alberto@test.com" },
      academic_periods: { id: "p1", name: "Periodo 1" },
      user_submission: {
        id: "sub-1",
        institution_id: "inst-1",
        assignment_id: "a1",
        student_id: "st-1",
        status: "evaluated",
        score: 4.8,
        feedback: "Excelente",
        file_url: "https://example.com/foto.jpg",
        submission_text: "Adjunto mi tarea",
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
    {
      id: "a2",
      institution_id: "inst-1",
      teacher_id: "t1",
      grade_id: "g2",
      subject_id: "s2",
      period_id: "p1",
      title: "Cuento Corto",
      description_json: "Escribir un cuento de 2 páginas",
      attachment_url: null,
      status: "published",
      due_date: new Date(Date.now() - 86400000 * 2).toISOString(), // Vencida hace 2 días
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      subjects: { id: "s2", name: "Español", color: "bg-emerald-500" },
      grades: { id: "g2", name: "Tercero B", level: 3 },
      teachers: { id: "t1", full_name: "Prof. Alberto", email: "alberto@test.com" },
      academic_periods: { id: "p1", name: "Periodo 1" },
      user_submission: null,
    },
  ];

  it("calcula estadísticas docentes correctamente", () => {
    const stats = calculateTeacherStats(mockAssignments);
    expect(stats.total).toBe(2);
    expect(stats.active).toBe(1);
    expect(stats.pastDue).toBe(1);
    expect(stats.uniqueGrades).toBe(2);
    expect(stats.uniqueSubjects).toBe(2);
  });

  it("calcula métricas de estudiante y tasa de cumplimiento", () => {
    const metrics = calculateStudentMetrics(mockAssignments);
    expect(metrics.total).toBe(2);
    expect(metrics.submitted).toBe(1);
    expect(metrics.evaluatedCount).toBe(1);
    expect(metrics.avgScore).toBe("4.8");
    expect(metrics.complianceRate).toBe(50);
    expect(metrics.late).toBe(1);
  });

  it("formatea adecuadamente el tiempo relativo de entrega", () => {
    const futureDate = new Date(Date.now() + 86400000 * 4).toISOString();
    const pastDate = new Date(Date.now() - 86400000 * 1).toISOString();

    const futureRel = formatRelativeDueDate(futureDate);
    expect(futureRel.isLate).toBe(false);
    expect(futureRel.text).toContain("Vence en");

    const pastRel = formatRelativeDueDate(pastDate);
    expect(pastRel.isLate).toBe(true);
    expect(pastRel.text).toBe("Vencida");
  });

  it("extrae lista de asignaturas únicas sin duplicados", () => {
    const subjects = extractUniqueSubjects(mockAssignments);
    expect(subjects.length).toBe(2);
    expect(subjects).toEqual([
      ["s1", "Matemáticas"],
      ["s2", "Español"],
    ]);
  });

  it("limpia correctamente tags HTML y espacios de las instrucciones", () => {
    expect(sanitizeAssignmentDescription("<p>Hola <strong>Mundo</strong></p>")).toBe("Hola Mundo");
    expect(sanitizeAssignmentDescription("")).toBe("Sin instrucciones adicionales.");
    expect(sanitizeAssignmentDescription(null)).toBe("Sin instrucciones adicionales.");
  });

  describe("Control de Privacidad de Grados y Materias (Docente vs Rector)", () => {
    const allGrades = [
      { id: "g1", name: "Primero" },
      { id: "g2", name: "Segundo" },
      { id: "g3", name: "Tercero" },
    ];
    const allSubjects = [
      { id: "s1", name: "Matemáticas" },
      { id: "s2", name: "Español" },
      { id: "s3", name: "Ciencias" },
    ];

    it("permite al Rector ver todos los grados y asignaturas", () => {
      const grades = getFilteredGradesForUser({ allGrades, isRector: true });
      expect(grades.length).toBe(3);

      const subjects = getFilteredSubjectsForUser({ allSubjects, isRector: true });
      expect(subjects.length).toBe(3);
    });

    it("restringe al Docente únicamente a sus grados asignados", () => {
      const teacher = {
        teacher_grade_assignments: [{ grade_id: "g1" }],
      };
      const teacherSchedules = [{ grade_id: "g2", subject_id: "s1" }];

      const grades = getFilteredGradesForUser({
        allGrades,
        teacher,
        teacherSchedules,
        isRector: false,
      });

      expect(grades.length).toBe(2);
      expect(grades.map((g) => g.id)).toEqual(["g1", "g2"]);
      expect(grades.some((g) => g.id === "g3")).toBe(false); // No tiene acceso a Tercero
    });

    it("restringe al Docente a las materias asignadas para un grado específico", () => {
      const teacher = {
        teacher_subjects: [{ subject_id: "s1" }, { subject_id: "s2" }],
      };
      const teacherSchedules = [
        { grade_id: "g1", subject_id: "s1" }, // En g1 da Matemáticas
        { grade_id: "g2", subject_id: "s2" }, // En g2 da Español
      ];

      // Al seleccionar g1, solo debe ver Matemáticas
      const subjectsGrade1 = getFilteredSubjectsForUser({
        allSubjects,
        teacher,
        teacherSchedules,
        selectedGradeId: "g1",
        isRector: false,
      });
      expect(subjectsGrade1.map((s) => s.id)).toEqual(["s1"]);

      // Al seleccionar g2, solo debe ver Español
      const subjectsGrade2 = getFilteredSubjectsForUser({
        allSubjects,
        teacher,
        teacherSchedules,
        selectedGradeId: "g2",
        isRector: false,
      });
      expect(subjectsGrade2.map((s) => s.id)).toEqual(["s2"]);
    });
  });
});
