/**
 * Detector adaptativo de parpadeo humano para verificación de vida (Liveness Anti-Spoofing).
 *
 * En lugar de usar umbrales estáticos fijos (que fallan con gafas, ojos rasgados o distancias variables),
 * este módulo calcula la caída porcentual relativa (Relative EAR Drop) respecto a la línea base
 * fisiológica del usuario, garantizando detección en parpadeos rápidos de 1 o más fotogramas.
 */

export type BlinkPhase =
  | 'idle'
  | 'waiting'
  | 'closing_detected'
  | 'passed';

export interface BlinkEvaluation {
  baselineEar: number;
  currentEar: number;
  dropPercentage: number;
  instruction: string;
  isPassed: boolean;
  phase: BlinkPhase;
  progress: number;
}

export interface AdaptiveBlinkTrackerConfig {
  /**
   * Caída porcentual mínima para considerar el ojo cerrado.
   * Por defecto 0.15 (15% de reducción respecto a su baseline).
   */
  dropThreshold?: number;
  /**
   * Tiempo mínimo en ms para considerar el cierre válido.
   */
  minDurationMs?: number;
  /**
   * Tiempo máximo en ms antes de descartar el cierre (ojos cerrados > 1.5s no es parpadeo).
   */
  maxDurationMs?: number;
  /**
   * Tiempo de espera en ms tras el cual se aumenta la sensibilidad.
   */
  escalateTimeoutMs?: number;
}

export class AdaptiveBlinkTracker {
  private phase: BlinkPhase = 'idle';
  private baselineEar = 0;
  private closingTimestamp = 0;
  private startTrackingTimestamp = 0;
  private minEarDuringBlink = 1.0;

  private dropThreshold: number;
  private minDurationMs: number;
  private maxDurationMs: number;
  private escalateTimeoutMs: number;

  constructor(config?: AdaptiveBlinkTrackerConfig) {
    this.dropThreshold = config?.dropThreshold ?? 0.15;
    this.minDurationMs = config?.minDurationMs ?? 0;
    this.maxDurationMs = config?.maxDurationMs ?? 1500;
    this.escalateTimeoutMs = config?.escalateTimeoutMs ?? 1500;
  }

  public reset(): void {
    this.phase = 'idle';
    this.baselineEar = 0;
    this.closingTimestamp = 0;
    this.startTrackingTimestamp = 0;
    this.minEarDuringBlink = 1.0;
  }

  public getPhase(): BlinkPhase {
    return this.phase;
  }

  public getBaseline(): number {
    return this.baselineEar;
  }

  public isPassed(): boolean {
    return this.phase === 'passed';
  }

  /**
   * Procesa la medición de EAR en el fotograma actual y actualiza la máquina de estados.
   */
  public update(earAvg: number, earLeft?: number, earRight?: number): BlinkEvaluation {
    const now = Date.now();
    const effectiveEar = Math.max(0.01, earAvg);

    // 1. Inicialización de línea base individual
    if (this.phase === 'idle' || this.baselineEar === 0) {
      this.phase = 'waiting';
      this.startTrackingTimestamp = now;
      this.baselineEar = effectiveEar;

      return {
        baselineEar: this.baselineEar,
        currentEar: effectiveEar,
        dropPercentage: 0,
        instruction: 'Parpadee para verificar',
        isPassed: false,
        phase: 'waiting',
        progress: 20,
      };
    }

    // Si ya completó con éxito, mantener estado
    if (this.phase === 'passed') {
      return {
        baselineEar: this.baselineEar,
        currentEar: effectiveEar,
        dropPercentage: 0,
        instruction: '¡Parpadeo verificado!',
        isPassed: true,
        phase: 'passed',
        progress: 100,
      };
    }

    // 2. Comportamiento en fases activas ('waiting' y 'closing_detected')
    const waitingElapsed = now - this.startTrackingTimestamp;

    // Sensibilidad dinámica: si lleva más de 1.5s esperando, relajar umbral para captura inmediata
    const currentDropThreshold =
      waitingElapsed > this.escalateTimeoutMs
        ? Math.max(0.09, this.dropThreshold * 0.60)
        : this.dropThreshold;

    // Caída porcentual respecto a la línea base individual
    const dropPercentage = (this.baselineEar - effectiveEar) / this.baselineEar;

    // Condición de ojo cerrado adaptativa
    let singleEyeDrop = false;
    if (earLeft !== undefined && earRight !== undefined && this.baselineEar > 0) {
      const dropL = (this.baselineEar - earLeft) / this.baselineEar;
      const dropR = (this.baselineEar - earRight) / this.baselineEar;
      if (dropL >= currentDropThreshold || dropR >= currentDropThreshold) {
        singleEyeDrop = true;
      }
    }

    const isClosed =
      dropPercentage >= currentDropThreshold ||
      singleEyeDrop ||
      (this.baselineEar >= 0.22 && effectiveEar <= 0.17);

    // FASE A: Esperando parpadeo
    if (this.phase === 'waiting') {
      if (isClosed) {
        this.phase = 'closing_detected';
        this.closingTimestamp = now;
        this.minEarDuringBlink = effectiveEar;

        return {
          baselineEar: this.baselineEar,
          currentEar: effectiveEar,
          dropPercentage,
          instruction: '¡Ojos cerrados detectados! Ahora ábralos',
          isPassed: false,
          phase: this.phase,
          progress: 50,
        };
      }

      // Si los ojos siguen abiertos normalmente, adaptar suavemente la línea base
      if (dropPercentage < 0.08) {
        if (effectiveEar > this.baselineEar) {
          this.baselineEar = this.baselineEar * 0.70 + effectiveEar * 0.30;
        } else {
          this.baselineEar = this.baselineEar * 0.92 + effectiveEar * 0.08;
        }
      }

      const instruction =
        waitingElapsed > this.escalateTimeoutMs
          ? 'Parpadee suavemente frente a la cámara'
          : 'Parpadee para verificar';

      return {
        baselineEar: this.baselineEar,
        currentEar: effectiveEar,
        dropPercentage,
        instruction,
        isPassed: false,
        phase: 'waiting',
        progress: 20,
      };
    }

    // FASE B: Cierre detectado -> Esperando reapertura
    if (this.phase === 'closing_detected') {
      const closedDuration = now - this.closingTimestamp;
      this.minEarDuringBlink = Math.min(this.minEarDuringBlink, effectiveEar);

      // Si permanece con los ojos cerrados por más tiempo del biológicamente normal (>1500ms)
      if (closedDuration > this.maxDurationMs) {
        this.phase = 'waiting';
        this.startTrackingTimestamp = now;
        return {
          baselineEar: this.baselineEar,
          currentEar: effectiveEar,
          dropPercentage,
          instruction: 'Abra los ojos frente a la cámara',
          isPassed: false,
          phase: 'waiting',
          progress: 20,
        };
      }

      // Condición de reapertura:
      // a) Recuperó el 85% de su baseline
      // b) O subió al menos un 6% o 0.02 por encima del mínimo alcanzado en el cierre
      // c) O la caída porcentual se redujo a menos del 8%
      const recoveredThreshold = this.baselineEar * 0.85;
      const recoveryFromMin = effectiveEar - this.minEarDuringBlink;
      const isReopened =
        effectiveEar >= recoveredThreshold ||
        recoveryFromMin >= Math.max(0.02, this.baselineEar * 0.06) ||
        dropPercentage <= 0.08;

      if (isReopened && closedDuration >= this.minDurationMs) {
        this.phase = 'passed';
        return {
          baselineEar: this.baselineEar,
          currentEar: effectiveEar,
          dropPercentage,
          instruction: '¡Parpadeo verificado!',
          isPassed: true,
          phase: 'passed',
          progress: 100,
        };
      }

      return {
        baselineEar: this.baselineEar,
        currentEar: effectiveEar,
        dropPercentage,
        instruction: 'Abra los ojos suavemente',
        isPassed: false,
        phase: 'closing_detected',
        progress: 65,
      };
    }

    return {
      baselineEar: this.baselineEar,
      currentEar: effectiveEar,
      dropPercentage: 0,
      instruction: 'Parpadee para verificar',
      isPassed: false,
      phase: this.phase,
      progress: 20,
    };
  }
}
