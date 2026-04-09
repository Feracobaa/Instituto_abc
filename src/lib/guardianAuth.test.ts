import { describe, expect, it } from "vitest";
import { buildGuardianAuthEmail, isLikelyEmailLogin } from "@/lib/guardianAuth";

describe("guardianAuth", () => {
  it("convierte un username en el correo sintetico interno", () => {
    expect(buildGuardianAuthEmail("Fmvega")).toBe("fmvega@familias.iabc.local");
  });

  it("detecta cuando el identificador ya es un email", () => {
    expect(isLikelyEmailLogin("rectoria@abc.edu.co")).toBe(true);
    expect(isLikelyEmailLogin("fmvega")).toBe(false);
  });
});
