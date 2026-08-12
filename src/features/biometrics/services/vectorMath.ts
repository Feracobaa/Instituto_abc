/**
 * Operaciones matemáticas vectoriales y normalización geométrica para biometría facial
 */

/**
 * Normaliza un vector numérico a norma L2 unitaria: v / ||v||2
 */
export function normalizeVector(vec: number[]): number[] {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    const val = vec[i];
    if (typeof val === 'number' && Number.isFinite(val)) {
      sumSq += val * val;
    }
  }
  const norm = Math.sqrt(sumSq) || 1;
  return vec.map((v) => (Number.isFinite(v) ? v / norm : 0));
}

/**
 * Calcula la distancia Euclidiana entre dos vectores de características faciales
 */
export function calculateEuclideanDistance(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Calcula la similitud Coseno entre dos vectores normalizados L2 (Rango -1 a 1)
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct;
}

/**
 * Calcula el vector centroide promedio de múltiples capturas biométricas y lo normaliza
 */
export function computeCentroidEmbedding(embeddings: number[][]): number[] {
  if (!embeddings || !embeddings.length) return [];
  const dim = embeddings[0].length;
  if (!dim) return [];

  const centroid = new Array(dim).fill(0);

  for (const emb of embeddings) {
    if (emb.length !== dim) continue;
    for (let i = 0; i < dim; i++) {
      centroid[i] += emb[i];
    }
  }

  for (let i = 0; i < dim; i++) {
    centroid[i] /= embeddings.length;
  }

  return normalizeVector(centroid);
}

/**
 * Valida la dispersión intra-clase entre un conjunto de muestras biométricas.
 * Si alguna distancia euclidiana por pares supera maxDistance (0.45), retorna isValid = false
 * para evitar templates contaminados por intrusos o movimiento brusco.
 */
export function validateIntraClassDispersion(
  samples: number[][],
  maxDistance = 0.45
): { isValid: boolean; maxPairwiseDistance: number } {
  if (!samples || samples.length < 2) {
    return { isValid: true, maxPairwiseDistance: 0 };
  }

  let maxDist = 0;
  const normalizedSamples = samples.map(normalizeVector);

  for (let i = 0; i < normalizedSamples.length; i++) {
    for (let j = i + 1; j < normalizedSamples.length; j++) {
      const dist = calculateEuclideanDistance(normalizedSamples[i], normalizedSamples[j]);
      if (dist > maxDist) {
        maxDist = dist;
      }
      if (dist > maxDistance) {
        return { isValid: false, maxPairwiseDistance: dist };
      }
    }
  }

  return { isValid: true, maxPairwiseDistance: maxDist };
}

