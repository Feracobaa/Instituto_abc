import { describe, expect, it } from 'vitest';
import {
  normalizeVector,
  calculateEuclideanDistance,
  computeCentroidEmbedding,
  validateIntraClassDispersion,
} from '@/features/biometrics/services/vectorMath';

describe('Multi-Sample Biometric Enrollment & Intra-Class Dispersion', () => {
  it('valida exitosamente la dispersión entre 3 muestras consistentes del mismo sujeto (distancia <= 0.45)', () => {
    const baseVector = normalizeVector(Array.from({ length: 128 }, (_, i) => i + 1));

    // Muestra 1: Frontal
    const sampleFrontal = [...baseVector];
    // Muestra 2: Giro leve izquierda (pequeña variación geométrica d ~ 0.15)
    const sampleLeft = normalizeVector(baseVector.map((v, i) => (i < 20 ? v + 0.05 : v)));
    // Muestra 3: Giro leve derecha (pequeña variación geométrica d ~ 0.18)
    const sampleRight = normalizeVector(baseVector.map((v, i) => (i > 100 ? v + 0.06 : v)));

    const result = validateIntraClassDispersion([sampleFrontal, sampleLeft, sampleRight], 0.45);

    expect(result.isValid).toBe(true);
    expect(result.maxPairwiseDistance).toBeLessThanOrEqual(0.45);
  });

  it('rechaza el grupo de muestras si una pertenece a un intruso o hubo movimiento caótico (distancia > 0.45)', () => {
    const personAVector = normalizeVector(Array.from({ length: 128 }, (_, i) => i + 1));
    const personBVector = normalizeVector(Array.from({ length: 128 }, (_, i) => 128 - i)); // Vector opuesto / intruso

    const sample1 = [...personAVector];
    const sample2 = normalizeVector(personAVector.map((v, i) => (i < 10 ? v + 0.02 : v)));
    const sample3Intruder = [...personBVector]; // Intruso entra al encuadre

    const result = validateIntraClassDispersion([sample1, sample2, sample3Intruder], 0.45);

    // Debe detectar la anomalía y marcar inválido
    expect(result.isValid).toBe(false);
    expect(result.maxPairwiseDistance).toBeGreaterThan(0.45);
  });

  it('calcula el centroide 3D equilibrado a partir de las 3 muestras multi-ángulo', () => {
    const s1 = normalizeVector(Array.from({ length: 128 }, () => 1.0));
    const s2 = normalizeVector(Array.from({ length: 128 }, (v, i) => (i % 2 === 0 ? 1.2 : 0.8)));
    const s3 = normalizeVector(Array.from({ length: 128 }, (v, i) => (i % 2 === 1 ? 1.2 : 0.8)));

    const centroid = computeCentroidEmbedding([s1, s2, s3]);

    expect(centroid).toHaveLength(128);

    // Comprobar norma unitaria del centroide
    let sumSq = 0;
    for (const val of centroid) {
      sumSq += val * val;
    }
    expect(Math.sqrt(sumSq)).toBeCloseTo(1.0, 5);

    // La distancia del centroide a cada una de las 3 muestras debe ser simétrica y reducida
    const d1 = calculateEuclideanDistance(centroid, s1);
    const d2 = calculateEuclideanDistance(centroid, s2);
    const d3 = calculateEuclideanDistance(centroid, s3);

    expect(d1).toBeLessThan(0.30);
    expect(d2).toBeLessThan(0.30);
    expect(d3).toBeLessThan(0.30);
  });
});
