import { ImageQualityMetrics } from '../types';

export interface BiometricTelemetrySnapshot {
  totalFramesAnalyzed: number;
  totalMatchesAttempted: number;
  successfulMatches: number;
  averageInferenceLatencyMs: number;
  p95InferenceLatencyMs: number;
  averageLivenessScore: number;
  spoofRejections: number;
  blurRejections: number;
  lowLightDetections: number;
  timestamp: string;
}

class BiometricTelemetryService {
  private latencies: number[] = [];
  private livenessScores: number[] = [];
  private totalFrames = 0;
  private matchAttempts = 0;
  private matchSuccesses = 0;
  private spoofCount = 0;
  private blurCount = 0;
  private lowLightCount = 0;

  /**
   * Registra una métrica de tiempo de inferencia de la red neuronal
   */
  public recordInferenceLatency(latencyMs: number): void {
    if (typeof latencyMs === 'number' && Number.isFinite(latencyMs) && latencyMs >= 0) {
      this.latencies.push(latencyMs);
      this.totalFrames++;
      // Mantener tamaño de buffer razonable (últimos 500 cuadros)
      if (this.latencies.length > 500) {
        this.latencies.shift();
      }
    }
  }

  /**
   * Registra métricas de calidad de imagen por cuadro
   */
  public recordFrameQuality(quality: ImageQualityMetrics): void {
    if (!quality) return;

    if (typeof quality.livenessScore === 'number') {
      this.livenessScores.push(quality.livenessScore);
      if (this.livenessScores.length > 500) {
        this.livenessScores.shift();
      }
    }

    if (quality.isSpoof) this.spoofCount++;
    if (quality.isBlurred) this.blurCount++;
    if (quality.isLowLight) this.lowLightCount++;
  }

  /**
   * Registra el resultado de un intento de matching
   */
  public recordMatchAttempt(isSuccess: boolean): void {
    this.matchAttempts++;
    if (isSuccess) {
      this.matchSuccesses++;
    }
  }

  /**
   * Obtiene una instantánea consolidada de la salud y rendimiento del motor biométrico
   */
  public getSnapshot(): BiometricTelemetrySnapshot {
    const latenciesSorted = [...this.latencies].sort((a, b) => a - b);
    const avgLatency =
      this.latencies.length > 0
        ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
        : 0;

    const p95Idx = Math.floor(latenciesSorted.length * 0.95);
    const p95Latency = latenciesSorted.length > 0 ? latenciesSorted[p95Idx] : 0;

    const avgLiveness =
      this.livenessScores.length > 0
        ? this.livenessScores.reduce((a, b) => a + b, 0) / this.livenessScores.length
        : 85;

    return {
      totalFramesAnalyzed: this.totalFrames,
      totalMatchesAttempted: this.matchAttempts,
      successfulMatches: this.matchSuccesses,
      averageInferenceLatencyMs: Number(avgLatency.toFixed(1)),
      p95InferenceLatencyMs: Number(p95Latency.toFixed(1)),
      averageLivenessScore: Number(avgLiveness.toFixed(1)),
      spoofRejections: this.spoofCount,
      blurRejections: this.blurCount,
      lowLightDetections: this.lowLightCount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reinicia todos los acumuladores de telemetría
   */
  public reset(): void {
    this.latencies = [];
    this.livenessScores = [];
    this.totalFrames = 0;
    this.matchAttempts = 0;
    this.matchSuccesses = 0;
    this.spoofCount = 0;
    this.blurCount = 0;
    this.lowLightCount = 0;
  }
}

export const biometricTelemetry = new BiometricTelemetryService();
