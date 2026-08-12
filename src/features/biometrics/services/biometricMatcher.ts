import { MatchResult, StudentBiometricRecord } from '../types';
import {
  normalizeVector,
  calculateEuclideanDistance,
  calculateCosineSimilarity,
} from './vectorMath';

/**
 * Encuentra el estudiante con mayor similitud a partir de un vector escaneado,
 * aplicando validación dual (Distancia Euclidiana + Similitud Coseno) y prueba de margen de Lowe.
 */
export function matchBiometricLocal(
  scannedEmbedding: number[],
  registeredBiometrics: StudentBiometricRecord[],
  tolerance = 0.52
): MatchResult | null {
  if (!registeredBiometrics.length || !scannedEmbedding || scannedEmbedding.length !== 128) {
    return null;
  }

  const normalizedScan = normalizeVector(scannedEmbedding);

  let bestMatch: MatchResult | null = null;
  let minDistance = Infinity;
  let maxCosineSim = -1;
  let secondMinDistance = Infinity;

  for (const bio of registeredBiometrics) {
    if (!bio.embedding || bio.embedding.length !== 128) continue;

    const normalizedBio = normalizeVector(bio.embedding);
    const dist = calculateEuclideanDistance(normalizedScan, normalizedBio);
    const cosineSim = calculateCosineSimilarity(normalizedScan, normalizedBio);

    if (dist < minDistance) {
      secondMinDistance = minDistance;
      minDistance = dist;
      maxCosineSim = cosineSim;
      bestMatch = {
        student_id: bio.student_id,
        distance: dist,
        confidence: Math.max(0, Math.min(100, Math.round(cosineSim * 100))),
        cosineSimilarity: cosineSim,
      };
    } else if (dist < secondMinDistance) {
      secondMinDistance = dist;
    }
  }

  // Requerir evaluación dual: Distancia Euclidiana <= tolerancia (0.52) Y Similitud Coseno >= 0.78
  if (!bestMatch || minDistance > tolerance || maxCosineSim < 0.78) {
    return null;
  }

  // Ratio Test de Lowe: si el segundo candidato está demasiado cercano al primero,
  // se considera ambiguo para prevenir falsos reconocimientos entre familiares o fisionomías parecidas.
  const marginRatio =
    secondMinDistance !== Infinity && secondMinDistance > 0
      ? minDistance / secondMinDistance
      : 0;

  bestMatch.secondBestDistance = secondMinDistance;
  bestMatch.marginRatio = marginRatio;

  // Si la ambigüedad es muy alta (ratio > 0.94), rechazar coincidencia por seguridad
  if (registeredBiometrics.length > 1 && marginRatio > 0.94) {
    if (import.meta.env.DEV) {
      console.warn('Emparejamiento rechazado por ambigüedad biométrica (Lowe Ratio Test):', {
        minDistance,
        secondMinDistance,
        marginRatio,
        maxCosineSim,
      });
    }
    return null;
  }

  return bestMatch;
}
