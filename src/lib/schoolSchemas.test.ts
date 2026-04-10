import { describe, expect, it } from "vitest";
import { teacherFormSchema } from "@/lib/schoolSchemas";

describe("teacherFormSchema", () => {
  it("permite dejar al docente sin direccion de grupo", () => {
    const result = teacherFormSchema.safeParse({
      director_grade_ids: [],
      email: "docente@abc.edu.co",
      full_name: "Docente Uno",
      grade_ids: ["grado-1"],
      phone: "",
      subject_ids: ["materia-1"],
    });

    expect(result.success).toBe(true);
  });

  it("permite asignar varios grados como direccion de grupo", () => {
    const result = teacherFormSchema.safeParse({
      director_grade_ids: ["grado-1", "grado-2"],
      email: "docente@abc.edu.co",
      full_name: "Docente Uno",
      grade_ids: ["grado-1", "grado-2"],
      phone: "",
      subject_ids: ["materia-1"],
    });

    expect(result.success).toBe(true);
  });

  it("rechaza grados dirigidos fuera de los grados asignados", () => {
    const result = teacherFormSchema.safeParse({
      director_grade_ids: ["grado-2"],
      email: "docente@abc.edu.co",
      full_name: "Docente Uno",
      grade_ids: ["grado-1"],
      phone: "",
      subject_ids: ["materia-1"],
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.flatten().fieldErrors.director_grade_ids?.[0]).toContain(
        "grados dirigidos",
      );
    }
  });
});
