import { describe, expect, it } from 'vitest';
import {
  normalizeVector,
  calculateEuclideanDistance,
  calculateCosineSimilarity,
  computeCentroidEmbedding,
} from '@/features/biometrics/services/vectorMath';

describe('Biometric Vector Mathematics & Normalization', () => {
  it('normaliza vectores a norma L2 unitaria (||v|| = 1.0)', () => {
    const rawVector = Array.from({ length: 128 }, (_, i) => i + 1);
    const normalized = normalizeVector(rawVector);

    expect(normalized).toHaveLength(128);

    // Calcular norma euclidiana del vector normalizado
    let sumSq = 0;
    for (const val of normalized) {
      sumSq += val * val;
    }
    const norm = Math.sqrt(sumSq);
    expect(norm).toBeCloseTo(1.0, 5);
  });

  it('maneja vectores nulos o de ceros sin producir NaN o Infinity', () => {
    const zeroVector = new Array(128).fill(0);
    const normalized = normalizeVector(zeroVector);

    expect(normalized).toHaveLength(128);
    for (const val of normalized) {
      expect(Number.isFinite(val)).toBe(true);
      expect(val).toBe(0);
    }
  });

  it('calcula la distancia euclidiana correctamente entre vectores', () => {
    const vecA = normalizeVector(new Array(128).fill(1));
    const vecB = normalizeVector(new Array(128).fill(1));

    // Vectores idénticos deben tener distancia 0
    expect(calculateEuclideanDistance(vecA, vecB)).toBeCloseTo(0.0, 5);

    // Vectores con longitud dispar deben retornar Infinity
    expect(calculateEuclideanDistance([1, 2], [1, 2, 3])).toBe(Infinity);
  });

  it('calcula la similitud coseno correctamente (rango -1 a 1)', () => {
    const vecA = normalizeVector([1, 0, 0, 0]);
    const vecB = normalizeVector([1, 0, 0, 0]);
    const vecOpposite = normalizeVector([-1, 0, 0, 0]);
    const vecOrthogonal = normalizeVector([0, 1, 0, 0]);

    // Vectores idénticos -> Similitud = 1.0
    expect(calculateCosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 5);

    // Vectores opuestos -> Similitud = -1.0
    expect(calculateCosineSimilarity(vecA, vecOpposite)).toBeCloseTo(-1.0, 5);

    // Vectores ortogonales -> Similitud = 0.0
    expect(calculateCosineSimilarity(vecA, vecOrthogonal)).toBeCloseTo(0.0, 5);
  });

  it('calcula el vector centroide promedio de 3 muestras multi-captura y lo normaliza', () => {
    const sample1 = normalizeVector(Array.from({ length: 128 }, () => 0.5));
    const sample2 = normalizeVector(Array.from({ length: 128 }, () => 0.6));
    const sample3 = normalizeVector(Array.from({ length: 128 }, () => 0.7));

    const centroid = computeCentroidEmbedding([sample1, sample2, sample3]);

    expect(centroid).toHaveLength(128);

    // Verificar norma unitaria del centroide
    let sumSq = 0;
    for (const val of centroid) {
      sumSq += val * val;
    }
    expect(Math.sqrt(sumSq)).toBeCloseTo(1.0, 5);
  });

  it('retorna array vacío si computeCentroidEmbedding recibe lista vacía', () => {
    expect(computeCentroidEmbedding([])).toEqual([]);
  });
});
