import { describe, expect, it } from 'vitest';
import {
  calculateLaplacianBlurScore,
  verifyHumanFacePresence,
} from '@/features/biometrics/services/imageQuality';
import { matchBiometricLocal } from '@/features/biometrics/services/biometricMatcher';
import { normalizeVector } from '@/features/biometrics/services/vectorMath';
import { StudentBiometricRecord } from '@/features/biometrics/types';

describe('Image Quality & Preprocessing Algorithms', () => {
  it('detecta imágenes uniformes o completamente planas como borrosas (blurScore bajo)', () => {
    const width = 100;
    const height = 100;
    // Imagen completamente gris uniforme (sin bordes)
    const flatImageData = new Uint8ClampedArray(width * height * 4).fill(128);

    const { isBlurred, blurScore } = calculateLaplacianBlurScore(flatImageData, width, height);

    expect(isBlurred).toBe(true);
    expect(blurScore).toBeLessThan(40);
  });

  it('asigna un blurScore alto a imágenes con patrones de bordes contrastados y nítidos', () => {
    const width = 100;
    const height = 100;
    const sharpPattern = new Uint8ClampedArray(width * height * 4);

    // Crear un patrón de cuadrícula de alta frecuencia (blanco y negro alternado)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isWhite = (x % 4 < 2) !== (y % 4 < 2);
        const val = isWhite ? 255 : 0;
        sharpPattern[idx] = val;
        sharpPattern[idx + 1] = val;
        sharpPattern[idx + 2] = val;
        sharpPattern[idx + 3] = 255;
      }
    }

    const { isBlurred, blurScore } = calculateLaplacianBlurScore(sharpPattern, width, height);

    expect(isBlurred).toBe(false);
    expect(blurScore).toBeGreaterThan(100);
  });

  it('descarta imágenes sin pigmentación de piel humana o morfología facial', () => {
    const width = 100;
    const height = 100;
    // Imagen verde/azulada (pasto, cielo o pared)
    const nonSkinImage = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < nonSkinImage.length; i += 4) {
      nonSkinImage[i] = 20; // R
      nonSkinImage[i + 1] = 180; // G
      nonSkinImage[i + 2] = 220; // B
      nonSkinImage[i + 3] = 255;
    }

    const result = verifyHumanFacePresence(nonSkinImage, width, height);
    expect(result.isFace).toBe(false);
    expect(result.skinRatio).toBe(0);
  });
});

describe('Biometric Local Matcher & Lowe Margin Ratio', () => {
  it('empareja correctamente al mejor candidato si cumple con distancia y similitud', () => {
    const baseVector = normalizeVector(Array.from({ length: 128 }, (_, i) => i + 1));
    const identicalVector = [...baseVector];

    const gallery: StudentBiometricRecord[] = [
      {
        id: '1',
        student_id: 'student-alpha',
        embedding: identicalVector,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        student_id: 'student-beta',
        embedding: normalizeVector(Array.from({ length: 128 }, (_, i) => 128 - i)),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const match = matchBiometricLocal(baseVector, gallery, 0.52);

    expect(match).not.toBeNull();
    expect(match?.student_id).toBe('student-alpha');
    expect(match?.distance).toBeCloseTo(0.0, 5);
    expect(match?.cosineSimilarity).toBeCloseTo(1.0, 5);
  });

  it('rechaza el emparejamiento si la distancia supera la tolerancia establecida', () => {
    const scanVector = normalizeVector(Array.from({ length: 128 }, (_, i) => (i % 2 === 0 ? 1 : -1)));
    const galleryVector = normalizeVector(Array.from({ length: 128 }, (_, i) => (i % 2 === 0 ? -1 : 1)));

    const gallery: StudentBiometricRecord[] = [
      {
        id: '1',
        student_id: 'student-distant',
        embedding: galleryVector,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Con tolerancia 0.52, dos vectores opuestos (d ~ 2.0) deben ser rechazados
    const match = matchBiometricLocal(scanVector, gallery, 0.52);
    expect(match).toBeNull();
  });

  it('rechaza por ambigüedad si el segundo mejor candidato está demasiado cerca (Lowe Ratio > 0.94)', () => {
    const scan = normalizeVector(Array.from({ length: 128 }, () => 1));

    // Candidato 1: Muy cercano
    const cand1 = normalizeVector(scan.map((v, i) => (i === 0 ? v + 0.1 : v)));
    // Candidato 2: Prácticamente idéntico (distancia casi igual, ratio > 0.94)
    const cand2 = normalizeVector(scan.map((v, i) => (i === 1 ? v + 0.102 : v)));

    const gallery: StudentBiometricRecord[] = [
      {
        id: '1',
        student_id: 'hermano-1',
        embedding: cand1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        student_id: 'hermano-2',
        embedding: cand2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const match = matchBiometricLocal(scan, gallery, 0.52);

    // Debe ser rechazado por ambigüedad para evitar falsos positivos entre personas muy parecidas
    expect(match).toBeNull();
  });
});
