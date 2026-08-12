import {
  LivenessChallenge,
  LivenessChallengeType,
  LivenessEvaluationResult,
  LivenessStatus,
} from '../types';

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Calcula la distancia Euclidiana 2D entre dos puntos de landmarks
 */
export function pointDistance2D(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calcula el Eye Aspect Ratio (EAR) para medir el grado de apertura ocular.
 * Utiliza 6 puntos de referencia por cada ojo (Landmarks 36-41 y 42-47).
 * Fórmula: EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
 */
export function calculateEyeAspectRatio(landmarks: Point2D[]): {
  earLeft: number;
  earRight: number;
  earAvg: number;
} {
  if (!landmarks || landmarks.length < 68) {
    return { earLeft: 0.3, earRight: 0.3, earAvg: 0.3 };
  }

  // Ojo Izquierdo (Puntos 36 a 41)
  const lP1 = landmarks[36];
  const lP2 = landmarks[37];
  const lP3 = landmarks[38];
  const lP4 = landmarks[39];
  const lP5 = landmarks[40];
  const lP6 = landmarks[41];

  const lVertical1 = pointDistance2D(lP2, lP6);
  const lVertical2 = pointDistance2D(lP3, lP5);
  const lHorizontal = pointDistance2D(lP1, lP4);
  const earLeft = lHorizontal > 0 ? (lVertical1 + lVertical2) / (2 * lHorizontal) : 0.3;

  // Ojo Derecho (Puntos 42 a 47)
  const rP1 = landmarks[42];
  const rP2 = landmarks[43];
  const rP3 = landmarks[44];
  const rP4 = landmarks[45];
  const rP5 = landmarks[46];
  const rP6 = landmarks[47];

  const rVertical1 = pointDistance2D(rP2, rP6);
  const rVertical2 = pointDistance2D(rP3, rP5);
  const rHorizontal = pointDistance2D(rP1, rP4);
  const earRight = rHorizontal > 0 ? (rVertical1 + rVertical2) / (2 * rHorizontal) : 0.3;

  const earAvg = (earLeft + earRight) / 2;

  return { earLeft, earRight, earAvg };
}

/**
 * Estima la rotación horizontal de la cabeza (Yaw Ratio) a partir de la distancia
 * de la punta de la nariz (Punto 30) respecto a los bordes de la mandíbula (Puntos 0 y 16).
 * Neutral: ~1.0, Giro a la Izquierda: < 0.65, Giro a la Derecha: > 1.55
 */
export function calculateHeadPoseYaw(landmarks: Point2D[]): number {
  if (!landmarks || landmarks.length < 68) {
    return 1.0;
  }

  const leftJaw = landmarks[0];
  const rightJaw = landmarks[16];
  const noseTip = landmarks[30];

  const distToLeft = pointDistance2D(noseTip, leftJaw);
  const distToRight = pointDistance2D(noseTip, rightJaw);

  if (distToRight === 0) return 2.0;
  return distToLeft / distToRight;
}

/**
 * Calcula el Mouth Aspect Ratio (MAR) para detectar sonrisas o apertura bucal.
 * Puntos: Comisuras (48, 54), Labio superior (51), Labio inferior (57)
 */
export function calculateMouthAspectRatio(landmarks: Point2D[]): number {
  if (!landmarks || landmarks.length < 68) {
    return 0.1;
  }

  const leftCorner = landmarks[48];
  const rightCorner = landmarks[54];
  const topLip = landmarks[51];
  const bottomLip = landmarks[57];

  const vertical = pointDistance2D(topLip, bottomLip);
  const horizontal = pointDistance2D(leftCorner, rightCorner);

  if (horizontal === 0) return 0.1;
  return vertical / horizontal;
}

/**
 * Catálogo predefinido de retos interactivos de prueba de vida
 */
export const LIVENESS_CHALLENGES: Record<LivenessChallengeType, LivenessChallenge> = {
  blink: {
    type: 'blink',
    prompt: 'Parpadee suavemente',
    subPrompt: 'Cierre y abra los ojos frente a la cámara',
    durationMs: 8000,
  },
  turn_left: {
    type: 'turn_left',
    prompt: 'Gire la cabeza a su izquierda',
    subPrompt: 'Mueva levemente el rostro hacia la izquierda',
    durationMs: 8000,
  },
  turn_right: {
    type: 'turn_right',
    prompt: 'Gire la cabeza a su derecha',
    subPrompt: 'Mueva levemente el rostro hacia la derecha',
    durationMs: 8000,
  },
  smile: {
    type: 'smile',
    prompt: 'Sonría a la cámara',
    subPrompt: 'Muestre una leve sonrisa para verificar movimiento',
    durationMs: 8000,
  },
};

/**
 * Motor interactivo de Reto-Respuesta para detección de vida activa (Anti-Spoofing)
 */
export class LivenessChallengeEngine {
  private activeChallenge: LivenessChallenge | null = null;
  private status: LivenessStatus = 'idle';
  private startTime = 0;
  private blinkState: 'OPEN' | 'CLOSED' = 'OPEN';
  private eyeClosedTimestamp = 0;
  private progress = 0;

  constructor(preferredChallengeType?: LivenessChallengeType) {
    this.initChallenge(preferredChallengeType);
  }

  private initChallenge(type?: LivenessChallengeType): void {
    if (type && LIVENESS_CHALLENGES[type]) {
      this.activeChallenge = LIVENESS_CHALLENGES[type];
    } else {
      const types: LivenessChallengeType[] = ['blink', 'turn_left', 'turn_right'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      this.activeChallenge = LIVENESS_CHALLENGES[randomType];
    }
  }

  public start(): void {
    this.status = 'in_progress';
    this.startTime = Date.now();
    this.progress = 0;
    this.blinkState = 'OPEN';
    this.eyeClosedTimestamp = 0;
  }

  public reset(newChallengeType?: LivenessChallengeType): void {
    this.initChallenge(newChallengeType);
    this.status = 'idle';
    this.progress = 0;
    this.blinkState = 'OPEN';
    this.eyeClosedTimestamp = 0;
  }

  public getStatus(): LivenessStatus {
    return this.status;
  }

  public getActiveChallenge(): LivenessChallenge | null {
    return this.activeChallenge;
  }

  /**
   * Evalúa los landmarks en el fotograma actual contra el reto activo
   */
  public evaluate(landmarks: Point2D[]): LivenessEvaluationResult {
    if (this.status !== 'in_progress' || !this.activeChallenge) {
      return {
        status: this.status,
        progress: this.progress,
        activeChallenge: this.activeChallenge,
        message: this.status === 'passed' ? 'Prueba de vida superada' : 'Esperando inicio...',
        metrics: { ear: 0.3, yawRatio: 1.0, mar: 0.1 },
      };
    }

    const now = Date.now();
    const elapsed = now - this.startTime;

    // Verificar si expiró el tiempo límite
    if (elapsed > this.activeChallenge.durationMs) {
      this.status = 'timeout';
      return {
        status: 'timeout',
        progress: 0,
        activeChallenge: this.activeChallenge,
        message: 'Tiempo de verificación agotado. Por favor, reintente.',
        metrics: { ear: 0.3, yawRatio: 1.0, mar: 0.1 },
      };
    }

    const { earAvg } = calculateEyeAspectRatio(landmarks);
    const yawRatio = calculateHeadPoseYaw(landmarks);
    const mar = calculateMouthAspectRatio(landmarks);

    let message = this.activeChallenge.prompt;

    switch (this.activeChallenge.type) {
      case 'blink': {
        // Umbrales de parpadeo: Cerrado (EAR <= 0.18), Abierto (EAR >= 0.25)
        if (this.blinkState === 'OPEN') {
          if (earAvg <= 0.19) {
            this.blinkState = 'CLOSED';
            this.eyeClosedTimestamp = now;
            this.progress = 50;
            message = 'Ojos cerrados detectados... ahora ábralos';
          } else {
            this.progress = 20;
          }
        } else if (this.blinkState === 'CLOSED') {
          const closeDuration = now - this.eyeClosedTimestamp;
          if (earAvg >= 0.25) {
            // El parpadeo humano típico dura entre 80ms y 900ms (máx 1.2s)
            if (closeDuration <= 1200) {
              this.status = 'passed';
              this.progress = 100;
              message = '¡Parpadeo natural verificado!';
            } else {
              // Si duró demasiado, reiniciar estado
              this.blinkState = 'OPEN';
              this.progress = 20;
            }
          } else if (closeDuration > 1500) {
            // Ojos cerrados por más de 1.5s (no es parpadeo)
            this.blinkState = 'OPEN';
            this.progress = 20;
          } else {
            this.progress = 65;
            message = 'Abra los ojos suavemente';
          }
        }
        break;
      }

      case 'turn_left': {
        if (yawRatio < 0.65) {
          this.status = 'passed';
          this.progress = 100;
          message = '¡Giro a la izquierda verificado!';
        } else {
          // Progreso gradual mientras gira
          const diff = Math.max(0, 1.0 - yawRatio);
          this.progress = Math.min(90, Math.round((diff / 0.35) * 100));
          message = this.activeChallenge.prompt;
        }
        break;
      }

      case 'turn_right': {
        if (yawRatio > 1.55) {
          this.status = 'passed';
          this.progress = 100;
          message = '¡Giro a la derecha verificado!';
        } else {
          // Progreso gradual mientras gira
          const diff = Math.max(0, yawRatio - 1.0);
          this.progress = Math.min(90, Math.round((diff / 0.55) * 100));
          message = this.activeChallenge.prompt;
        }
        break;
      }

      case 'smile': {
        if (mar > 0.35) {
          this.status = 'passed';
          this.progress = 100;
          message = '¡Sonrisa verificada!';
        } else {
          this.progress = Math.min(90, Math.round((mar / 0.35) * 100));
          message = this.activeChallenge.prompt;
        }
        break;
      }
    }

    return {
      status: this.status,
      progress: this.progress,
      activeChallenge: this.activeChallenge,
      message,
      metrics: {
        ear: Number(earAvg.toFixed(3)),
        yawRatio: Number(yawRatio.toFixed(3)),
        mar: Number(mar.toFixed(3)),
      },
    };
  }
}
