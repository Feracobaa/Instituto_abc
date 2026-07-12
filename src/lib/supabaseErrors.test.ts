import { describe, expect, it } from "vitest";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";

describe("getFriendlyErrorMessage", () => {
  it("traduce errores de RLS a un mensaje util", () => {
    expect(
      getFriendlyErrorMessage({
        code: "42501",
        message: "new row violates row-level security policy",
      }),
    ).toContain("No tienes permisos");
  });

  it("mantiene un fallback legible para errores desconocidos", () => {
    expect(getFriendlyErrorMessage({ message: "Algo raro paso" })).toBe("Algo raro paso");
    expect(getFriendlyErrorMessage(undefined)).toContain("Ocurrio un error inesperado");
  });
});
