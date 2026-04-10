import { describe, expect, it } from "vitest";
import { formatReportAverage, formatReportRank } from "@/lib/reportCardFormatting";

describe("reportCards helpers", () => {
  it("formatea el promedio con un decimal igual que la plataforma", () => {
    expect(formatReportAverage(4.15)).toBe("4.2");
    expect(formatReportAverage(null)).toBe("-");
  });

  it("formatea el puesto con el total del curso", () => {
    expect(formatReportRank(1, 3)).toBe("1 de 3");
    expect(formatReportRank(null, 3)).toBe("-");
  });
});
