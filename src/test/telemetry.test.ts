import { describe, expect, it, beforeEach } from 'vitest';
import { biometricTelemetry } from '@/features/biometrics/services/biometricTelemetry';

describe('Biometric Telemetry & Audit Formatting', () => {
  beforeEach(() => {
    biometricTelemetry.reset();
  });

  it('calcula la latencia promedio y percentil 95 (P95) correctamente', () => {
    // Registrar 100 muestras de latencia
    for (let i = 1; i <= 100; i++) {
      biometricTelemetry.recordInferenceLatency(i); // 1ms a 100ms
    }

    const snapshot = biometricTelemetry.getSnapshot();

    expect(snapshot.totalFramesAnalyzed).toBe(100);
    // Promedio de 1 a 100 es 50.5
    expect(snapshot.averageInferenceLatencyMs).toBeCloseTo(50.5, 1);
    // P95 debe ser aproximadamente 96ms
    expect(snapshot.p95InferenceLatencyMs).toBeGreaterThanOrEqual(95);
  });

  it('registra métricas de calidad de fotogramas (blur, low light, spoof)', () => {
    biometricTelemetry.recordFrameQuality({
      luminance: 30,
      isLowLight: true,
      isOverExposed: false,
      livenessScore: 40,
      isSpoof: true,
      isBlurred: true,
      blurScore: 15,
    });

    biometricTelemetry.recordFrameQuality({
      luminance: 120,
      isLowLight: false,
      isOverExposed: false,
      livenessScore: 90,
      isSpoof: false,
      isBlurred: false,
      blurScore: 80,
    });

    const snapshot = biometricTelemetry.getSnapshot();

    expect(snapshot.spoofRejections).toBe(1);
    expect(snapshot.blurRejections).toBe(1);
    expect(snapshot.lowLightDetections).toBe(1);
    expect(snapshot.averageLivenessScore).toBe(65); // (40 + 90) / 2
  });

  it('registra la tasa de éxito de emparejamientos biométricos', () => {
    biometricTelemetry.recordMatchAttempt(true);
    biometricTelemetry.recordMatchAttempt(true);
    biometricTelemetry.recordMatchAttempt(false);

    const snapshot = biometricTelemetry.getSnapshot();

    expect(snapshot.totalMatchesAttempted).toBe(3);
    expect(snapshot.successfulMatches).toBe(2);
  });

  it('reinicia todas las métricas al llamar a reset()', () => {
    biometricTelemetry.recordInferenceLatency(45);
    biometricTelemetry.recordMatchAttempt(true);

    biometricTelemetry.reset();

    const snapshot = biometricTelemetry.getSnapshot();
    expect(snapshot.totalFramesAnalyzed).toBe(0);
    expect(snapshot.totalMatchesAttempted).toBe(0);
    expect(snapshot.successfulMatches).toBe(0);
  });
});
