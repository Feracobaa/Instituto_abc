import { describe, expect, it } from "vitest";
import { sanitizeTextForPdf } from "../contractSanitizer";

describe("contractSanitizer", () => {
  it("elimina emojis de planes y textos evitando glifos corruptos como Ø=Üž", () => {
    // Emojis que típicamente producen \uD83D\uDCE6 o similares
    const input = "📦 Plan Integral (Anual) 💼";
    const result = sanitizeTextForPdf(input);
    expect(result).toBe("Plan Integral (Anual)");
    expect(result).not.toContain("Ø");
    expect(result).not.toContain("Ü");
    expect(result).not.toContain("ž");
  });

  it("preserva caracteres acentuados, eñes y signos propios del español", () => {
    const input = "¡Atención! La institución educativa celebró el contrato en Bogotá, Nariño y Boyacá.";
    const result = sanitizeTextForPdf(input);
    expect(result).toBe("¡Atención! La institución educativa celebró el contrato en Bogotá, Nariño y Boyacá.");
  });

  it("normaliza comillas tipográficas, guiones largos y espacios especiales", () => {
    const input = "“Cláusula Primera” — Canon: $ 300.000 COP";
    const result = sanitizeTextForPdf(input);
    expect(result).toBe('"Cláusula Primera" - Canon: $ 300.000 COP');
  });

  it("maneja entradas nulas, vacías o indefinidas sin arrojar errores", () => {
    expect(sanitizeTextForPdf(null)).toBe("");
    expect(sanitizeTextForPdf(undefined)).toBe("");
    expect(sanitizeTextForPdf("   ")).toBe("");
  });
});
