import { describe, it, expect, vi } from "vitest";
import {
  getInstInfo,
  getGradeLabel,
  getPerformanceColor,
  isPreescolar,
  FALLBACK_INST,
  generateReportCard,
  generateSchedulePDF,
  generateAttendanceListPDF,
  generateGradingTemplatePDF,
  generateAssignmentPDF,
  downloadReportCard,
  downloadSchedulePDF,
  downloadAttendanceListPDF,
  downloadGradingTemplatePDF,
  downloadAssignmentPDF,
  downloadTuitionMonthlyReportPDF,
  downloadPendingTuitionMonthlyReportPDF,
} from "../index";

// Mock fetch para evitar llamadas de red reales en pruebas
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: false,
    blob: () => Promise.resolve(new Blob([])),
  })
);

describe("Motor Modular de Documentos PDF (pdfCore & Utilities)", () => {
  it("resuelve la información institucional por defecto (fallback)", () => {
    const info = getInstInfo();
    expect(info.name).toBe(FALLBACK_INST.name);
    expect(info.rectorName).toBe("RECTOR(A)");
    expect(info.nit).toBe(FALLBACK_INST.nit);
  });

  it("resuelve la información institucional personalizada cuando se provee", () => {
    const custom = {
      name: "Colegio San José",
      nit: "NIT: 900.123.456-7",
      address: "Calle 10 #20-30",
      phone: "3001234567",
      rectorName: "Dra. María Pérez",
    };
    const info = getInstInfo(custom);
    expect(info.name).toBe("Colegio San José");
    expect(info.rectorName).toBe("Dra. María Pérez");
    expect(info.phone).toBe("Tel: 3001234567");
  });

  it("calcula correctamente las etiquetas y colores de desempeño según la escala nacional", () => {
    expect(getGradeLabel(5.0)).toBe("SUPERIOR");
    expect(getGradeLabel(4.6)).toBe("SUPERIOR");
    expect(getGradeLabel(4.5)).toBe("ALTO");
    expect(getGradeLabel(4.0)).toBe("ALTO");
    expect(getGradeLabel(3.5)).toBe("BÁSICO");
    expect(getGradeLabel(3.0)).toBe("BÁSICO");
    expect(getGradeLabel(2.9)).toBe("BAJO");
    expect(getGradeLabel(1.0)).toBe("BAJO");

    expect(getPerformanceColor(4.8)).toEqual([21, 128, 61]);
    expect(getPerformanceColor(4.2)).toEqual([29, 78, 216]);
    expect(getPerformanceColor(3.5)).toEqual([180, 120, 0]);
    expect(getPerformanceColor(2.0)).toEqual([185, 28, 28]);
  });

  it("detecta adecuadamente los grados pertenecientes a preescolar", () => {
    expect(isPreescolar("Transición A")).toBe(true);
    expect(isPreescolar("Jardín")).toBe(true);
    expect(isPreescolar("Pre-Jardín 1")).toBe(true);
    expect(isPreescolar("Párvulo")).toBe(true);
    expect(isPreescolar("Primero B")).toBe(false);
    expect(isPreescolar("Quinto")).toBe(false);
    expect(isPreescolar(undefined)).toBe(false);
  });
});

describe("Generadores Especializados de Documentos PDF", () => {
  it("genera una instancia válida de jsPDF para boletín escolar de Primaria", async () => {
    const student = { full_name: "Juan Pérez", grades: { name: "Quinto A" } };
    const period = { id: "p1", name: "Primer Período" };
    const allPeriods = [{ id: "p1", name: "Primer Período" }];
    const allGradeRecords = [
      {
        period_id: "p1",
        subjects: { id: "s1", name: "Matemáticas" },
        grade: 4.5,
        achievements: "Excelente razonamiento lógico",
        comments: null,
        academic_periods: { name: "Primer Período" },
      },
    ];
    const schedules = [{ subject_id: "s1" }];

    const doc = await generateReportCard(
      student,
      period,
      allGradeRecords,
      schedules,
      allPeriods,
      { periodAverage: 4.5, rank: 1, totalStudents: 20 }
    );

    expect(doc).toBeDefined();
    expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(0);
  });

  it("genera una instancia válida de jsPDF para boletín escolar de Preescolar", async () => {
    const student = { full_name: "Sofía Gómez", grades: { name: "Transición" } };
    const period = { id: "p1", name: "Primer Período" };
    const allPeriods = [{ id: "p1", name: "Primer Período" }];
    const allGradeRecords = [
      {
        period_id: "p1",
        subjects: { id: "s1", name: "Dimensión Cognitiva" },
        grade: 5.0,
        achievements: "Reconoce figuras y colores con fluidez",
        comments: null,
        academic_periods: { name: "Primer Período" },
      },
    ];
    const schedules = [{ subject_id: "s1" }];

    const doc = await generateReportCard(student, period, allGradeRecords, schedules, allPeriods);
    expect(doc).toBeDefined();
  });

  it("genera una instancia válida de jsPDF para Horario de Clases", async () => {
    const schedules = [
      {
        subjects: { name: "Ciencias Naturales", color: "#4CAF50" },
        teachers: { full_name: "Carlos Ruiz" },
        start_time: "07:00:00",
        end_time: "08:00:00",
        day_of_week: 0,
      },
    ];
    const timeSlots = ["07:00"];

    const doc = await generateSchedulePDF("Cuarto A", schedules, timeSlots);
    expect(doc).toBeDefined();
  });

  it("genera una instancia válida de jsPDF para Lista de Asistencia", async () => {
    const students = [{ full_name: "Ana López" }, { full_name: "Bernardo Silva" }];
    const doc = await generateAttendanceListPDF(
      "Segundo",
      students,
      "2026-1",
      "Prof. Laura Martínez",
      "Español"
    );
    expect(doc).toBeDefined();
  });

  it("genera una instancia válida de jsPDF para Plantilla de Notas Docente", async () => {
    const students = [{ full_name: "Carlos Díaz" }];
    const doc = await generateGradingTemplatePDF("Tercero", students, "P1", "Docente X", "Sociales");
    expect(doc).toBeDefined();
  });

  it("genera una instancia válida de jsPDF para Guías y Tareas Académicas", async () => {
    const assignment = {
      title: "Taller de Fracciones y Decimales",
      subjectName: "Matemáticas",
      gradeName: "Quinto",
      teacherName: "Prof. Alberto Gómez",
      dueDate: "2026-09-15T23:59:00",
      description: "Resolver los ejercicios del 1 al 15 de la página 45.",
    };

    const doc = await generateAssignmentPDF(assignment);
    expect(doc).toBeDefined();
  });

  it("verifica que todas las funciones de descarga existan en la fachada unificada", () => {
    expect(typeof downloadReportCard).toBe("function");
    expect(typeof downloadSchedulePDF).toBe("function");
    expect(typeof downloadAttendanceListPDF).toBe("function");
    expect(typeof downloadGradingTemplatePDF).toBe("function");
    expect(typeof downloadAssignmentPDF).toBe("function");
    expect(typeof downloadTuitionMonthlyReportPDF).toBe("function");
    expect(typeof downloadPendingTuitionMonthlyReportPDF).toBe("function");
  });
});
