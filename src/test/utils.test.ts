import { describe, expect, it } from "vitest";
import { getRelativeLuminance, adjustLuminanceForDarkMode, hexToHSL } from "@/lib/utils";

describe("color utilities", () => {
  it("calcula la luminancia relativa sRGB correctamente", () => {
    // Amarillo puro tiene luminancia muy alta
    const yellowLuminance = getRelativeLuminance("#FFFF00");
    expect(yellowLuminance).toBeGreaterThan(0.9);

    // Azul puro tiene luminancia baja
    const blueLuminance = getRelativeLuminance("#0000FF");
    expect(blueLuminance).toBeLessThan(0.1);

    // Blanco y negro extremos
    expect(getRelativeLuminance("#FFFFFF")).toBeCloseTo(1.0, 2);
    expect(getRelativeLuminance("#000000")).toBeCloseTo(0.0, 2);
  });

  it("calibra la claridad en colores de alta luminancia para modo oscuro", () => {
    // Amarillo puro (#FFFF00) -> HSL original: "60 100% 50%"
    // Al ser luminancia > 0.6, se calibra la claridad al 48% -> "60 100% 48%"
    const calibratedYellow = adjustLuminanceForDarkMode("#FFFF00");
    expect(calibratedYellow).toBe("60 100% 48%");

    // Un color oscuro como azul marino (#000080) -> HSL original: "240 100% 25%"
    // Debe permanecer inalterado (claridad 25%)
    const calibratedNavy = adjustLuminanceForDarkMode("#000080");
    const originalNavy = hexToHSL("#000080");
    expect(calibratedNavy).toBe(originalNavy);
  });
});
