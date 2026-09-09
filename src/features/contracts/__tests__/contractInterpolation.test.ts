import { describe, it, expect } from "vitest";
import {
  interpolateContractMarkdown,
  computeSha256,
  formatCurrencyCop,
} from "../contractInterpolation";

describe("contractInterpolation", () => {
  it("interpola correctamente todas las variables del contrato", () => {
    const template = `
# CONTRATO {{CONTRACT_NUMBER}}
Institución: {{INSTITUTION_NAME}}
NIT: {{NIT}}
Rector: {{RECTOR_NAME}}
Plan: {{PLAN_NAME}}
Valor: {{PRICE_COP}}
    `.trim();

    const variables = {
      contractNumber: "ETM-2026-COL-001",
      institutionName: "Colegio San José",
      nit: "900123456-7",
      rectorName: "Dra. María Gómez",
      planName: "Plan Integral Gold",
      priceCop: 2500000,
    };

    const rendered = interpolateContractMarkdown(template, variables);

    expect(rendered).toContain("CONTRATO ETM-2026-COL-001");
    expect(rendered).toContain("Colegio San José");
    expect(rendered).toContain("900123456-7");
    expect(rendered).toContain("Dra. María Gómez");
    expect(rendered).toContain("Plan Integral Gold");
    expect(rendered).toContain("$");
    expect(rendered).toContain("2.500.000");
  });

  it("utiliza valores por defecto si no se suministran variables", () => {
    const template = "Contrato {{CONTRACT_NUMBER}} para {{INSTITUTION_NAME}}";
    const rendered = interpolateContractMarkdown(template, {});
    expect(rendered).toContain("ETM-2026-PENDING");
    expect(rendered).toContain("Institución Adscrita");
  });

  it("sanitiza emojis y símbolos en los nombres de planes interpolados", () => {
    const template = "Plan contratado: {{PLAN_NAME}}";
    const rendered = interpolateContractMarkdown(template, {
      planName: "📦 Plan Integral (Anual) 🚀",
    });
    expect(rendered).toBe("Plan contratado: Plan Integral (Anual)");
    expect(rendered).not.toContain("Ø");
    expect(rendered).not.toContain("Ü");
  });

  it("calcula un hash SHA-256 consistente de 64 caracteres", async () => {
    const text = "Texto legal inmutable de prueba";
    const hash = await computeSha256(text);

    expect(hash).toHaveLength(64);
    expect(typeof hash).toBe("string");

    // Determinismo
    const hash2 = await computeSha256(text);
    expect(hash).toBe(hash2);
  });

  it("formatea moneda colombiana adecuadamente", () => {
    const formatted = formatCurrencyCop(1500000);
    expect(formatted).toContain("1.500.000");
  });
});
