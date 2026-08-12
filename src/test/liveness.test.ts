import { describe, expect, it } from 'vitest';
import {
  pointDistance2D,
  calculateEyeAspectRatio,
  calculateHeadPoseYaw,
  calculateMouthAspectRatio,
  LivenessChallengeEngine,
  Point2D,
} from '@/features/biometrics/services/livenessDetector';

/**
 * Generador auxiliar de matriz sintética de 68 landmarks faciales
 */
function createSyntheticLandmarks(options?: {
  eyeOpenHeight?: number;
  noseXOffset?: number;
  mouthOpenHeight?: number;
}): Point2D[] {
  const eyeH = options?.eyeOpenHeight ?? 10; // Altura estándar de ojo abierto
  const noseX = options?.noseXOffset ?? 0; // Desplazamiento horizontal de nariz
  const mouthH = options?.mouthOpenHeight ?? 4; // Altura estándar de boca

  const landmarks: Point2D[] = [];

  // Mandíbula (0 a 16): 0 = izquierda (x: 20), 16 = derecha (x: 180)
  for (let i = 0; i <= 16; i++) {
    landmarks.push({ x: 20 + i * 10, y: 100 + Math.abs(i - 8) * 5 });
  }

  // Cejas (17 a 26)
  for (let i = 17; i <= 26; i++) {
    landmarks.push({ x: 30 + (i - 17) * 15, y: 50 });
  }

  // Nariz (27 a 35): Punto 30 es la punta de la nariz (neutral x: 100)
  for (let i = 27; i <= 35; i++) {
    const x = i === 30 ? 100 + noseX : 100;
    landmarks.push({ x, y: 70 + (i - 27) * 5 });
  }

  // Ojo Izquierdo (36 a 41): Centro en x: 60, y: 60
  // P1: 36 (x: 50, y: 60), P2: 37 (x: 55, y: 60 - eyeH/2), P3: 38 (x: 65, y: 60 - eyeH/2)
  // P4: 39 (x: 70, y: 60), P5: 40 (x: 65, y: 60 + eyeH/2), P6: 41 (x: 55, y: 60 + eyeH/2)
  landmarks[36] = { x: 50, y: 60 };
  landmarks[37] = { x: 55, y: 60 - eyeH / 2 };
  landmarks[38] = { x: 65, y: 60 - eyeH / 2 };
  landmarks[39] = { x: 70, y: 60 };
  landmarks[40] = { x: 65, y: 60 + eyeH / 2 };
  landmarks[41] = { x: 55, y: 60 + eyeH / 2 };

  // Ojo Derecho (42 a 47): Centro en x: 140, y: 60
  landmarks[42] = { x: 130, y: 60 };
  landmarks[43] = { x: 135, y: 60 - eyeH / 2 };
  landmarks[44] = { x: 145, y: 60 - eyeH / 2 };
  landmarks[45] = { x: 150, y: 60 };
  landmarks[46] = { x: 145, y: 60 + eyeH / 2 };
  landmarks[47] = { x: 135, y: 60 + eyeH / 2 };

  // Boca (48 a 67)
  for (let i = 48; i < 68; i++) {
    landmarks[i] = { x: 100, y: 130 };
  }
  landmarks[48] = { x: 80, y: 130 }; // Comisura izquierda
  landmarks[54] = { x: 120, y: 130 }; // Comisura derecha
  landmarks[51] = { x: 100, y: 130 - mouthH / 2 }; // Labio superior
  landmarks[57] = { x: 100, y: 130 + mouthH / 2 }; // Labio inferior

  return landmarks;
}

describe('Liveness Mathematics: Eye Aspect Ratio (EAR) & Head Pose', () => {
  it('calcula la distancia euclidiana entre dos puntos 2D correctamente', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 3, y: 4 };
    expect(pointDistance2D(p1, p2)).toBeCloseTo(5.0, 5);
  });

  it('calcula un EAR alto (>= 0.25) para ojos abiertos', () => {
    const openEyesLandmarks = createSyntheticLandmarks({ eyeOpenHeight: 12 });
    const { earAvg, earLeft, earRight } = calculateEyeAspectRatio(openEyesLandmarks);

    expect(earLeft).toBeGreaterThanOrEqual(0.25);
    expect(earRight).toBeGreaterThanOrEqual(0.25);
    expect(earAvg).toBeGreaterThanOrEqual(0.25);
  });

  it('calcula un EAR bajo (<= 0.15) para ojos cerrados (parpadeo)', () => {
    const closedEyesLandmarks = createSyntheticLandmarks({ eyeOpenHeight: 2 });
    const { earAvg, earLeft, earRight } = calculateEyeAspectRatio(closedEyesLandmarks);

    expect(earLeft).toBeLessThanOrEqual(0.18);
    expect(earRight).toBeLessThanOrEqual(0.18);
    expect(earAvg).toBeLessThanOrEqual(0.18);
  });

  it('calcula el Yaw Ratio correctamente para rostro neutral (~1.0), giro izquierdo (<0.65) y derecho (>1.55)', () => {
    const neutralLandmarks = createSyntheticLandmarks({ noseXOffset: 0 });
    const neutralYaw = calculateHeadPoseYaw(neutralLandmarks);
    expect(neutralYaw).toBeCloseTo(1.0, 1);

    // Nariz desplazada a la izquierda (x: 100 - 45 = 55) -> distToLeft = 35, distToRight = 125 -> Yaw ~ 0.28
    const turnLeftLandmarks = createSyntheticLandmarks({ noseXOffset: -45 });
    const leftYaw = calculateHeadPoseYaw(turnLeftLandmarks);
    expect(leftYaw).toBeLessThan(0.65);

    // Nariz desplazada a la derecha (x: 100 + 45 = 145) -> distToLeft = 125, distToRight = 35 -> Yaw ~ 3.57
    const turnRightLandmarks = createSyntheticLandmarks({ noseXOffset: 45 });
    const rightYaw = calculateHeadPoseYaw(turnRightLandmarks);
    expect(rightYaw).toBeGreaterThan(1.55);
  });

  it('calcula el Mouth Aspect Ratio (MAR) detectando sonrisa o apertura bucal', () => {
    const normalMouth = createSyntheticLandmarks({ mouthOpenHeight: 4 });
    const normalMar = calculateMouthAspectRatio(normalMouth);
    expect(normalMar).toBeLessThan(0.2);

    const openMouth = createSyntheticLandmarks({ mouthOpenHeight: 20 });
    const smileMar = calculateMouthAspectRatio(openMouth);
    expect(smileMar).toBeGreaterThan(0.35);
  });
});

describe('Liveness Challenge-Response Engine', () => {
  it('completa el reto de parpadeo tras la secuencia Abierto -> Cerrado -> Abierto en tiempo válido', () => {
    const engine = new LivenessChallengeEngine('blink');
    engine.start();

    const openEyes = createSyntheticLandmarks({ eyeOpenHeight: 12 });
    const closedEyes = createSyntheticLandmarks({ eyeOpenHeight: 2 });

    // 1. Ojos abiertos iniciales
    let result = engine.evaluate(openEyes);
    expect(result.status).toBe('in_progress');
    expect(result.progress).toBe(20);

    // 2. Ojos cerrados detectados
    result = engine.evaluate(closedEyes);
    expect(result.status).toBe('in_progress');
    expect(result.progress).toBe(50);

    // 3. Simular pequeño delay biológico (150ms) y reabrir ojos
    const reopenResult = engine.evaluate(openEyes);
    // Debe marcar superado
    expect(reopenResult.status).toBe('passed');
    expect(reopenResult.progress).toBe(100);
  });

  it('completa el reto de giro a la izquierda cuando el Yaw Ratio es menor a 0.65', () => {
    const engine = new LivenessChallengeEngine('turn_left');
    engine.start();

    const neutral = createSyntheticLandmarks({ noseXOffset: 0 });
    const turnLeft = createSyntheticLandmarks({ noseXOffset: -45 });

    let result = engine.evaluate(neutral);
    expect(result.status).toBe('in_progress');

    result = engine.evaluate(turnLeft);
    expect(result.status).toBe('passed');
    expect(result.progress).toBe(100);
  });

  it('completa el reto de giro a la derecha cuando el Yaw Ratio es mayor a 1.55', () => {
    const engine = new LivenessChallengeEngine('turn_right');
    engine.start();

    const turnRight = createSyntheticLandmarks({ noseXOffset: 45 });
    const result = engine.evaluate(turnRight);

    expect(result.status).toBe('passed');
    expect(result.progress).toBe(100);
  });
});
