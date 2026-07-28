import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StudentBiometric, MatchResult, ImageQualityMetrics } from '@/types/biometrics';
import { toast } from 'sonner';

/**
 * Normaliza un vector numérico a norma L2 unitaria
 */
export function normalizeVector(vec: number[]): number[] {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq) || 1;
  return vec.map(v => v / norm);
}

/**
 * Calcula la distancia Euclidiana entre dos vectores de características faciales
 */
export function calculateEuclideanDistance(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Analiza la luminancia y calidad de iluminación de un fotograma en Canvas
 */
export function analyzeImageQuality(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): ImageQualityMetrics {
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let totalLuminance = 0;
    const step = 8; // Muestreo eficiente cada 8 píxeles
    let count = 0;

    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Fórmula estándar de luminancia perceptual ITU-R BT.601
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuminance += lum;
      count++;
    }

    const avgLuminance = count > 0 ? totalLuminance / count : 128;
    return {
      luminance: Math.round(avgLuminance),
      isLowLight: avgLuminance < 45, // Iluminación muy baja
      isOverExposed: avgLuminance > 225, // Luz sobreexpuesta
    };
  } catch (e) {
    return { luminance: 128, isLowLight: false, isOverExposed: false };
  }
}

/**
 * Verifica si los píxeles recortados corresponden a la morfología y pigmentación de un rostro humano real.
 * Descarta luces encandilantes, focos, paredes, suelos u objetos inanimados.
 */
export function verifyHumanFacePresence(
  imgData: Uint8ClampedArray,
  width: number,
  height: number
): { isFace: boolean; skinRatio: number; contrastVariance: number } {
  let skinPixels = 0;
  let totalSampled = 0;
  let sumLum = 0;
  const luminanceValues: number[] = [];

  // Acumuladores de las 3 zonas anatómicas verticales (Superior: Ojos/Cejas, Media: Nariz/Mejillas, Inferior: Boca/Barbilla)
  let upperLumSum = 0, upperCount = 0;
  let middleLumSum = 0, middleCount = 0;
  let lowerLumSum = 0, lowerCount = 0;

  const step = 4; // Muestrear cada 4 píxeles en la región central del óvalo

  const minX = Math.floor(width * 0.2);
  const maxX = Math.floor(width * 0.8);
  const minY = Math.floor(height * 0.15);
  const maxY = Math.floor(height * 0.85);
  const heightRange = maxY - minY;

  const band1End = minY + heightRange * 0.33; // Límite franja ojos/cejas
  const band2End = minY + heightRange * 0.66; // Límite franja nariz/mejillas

  for (let y = minY; y < maxY; y += step) {
    for (let x = minX; x < maxX; x += step) {
      const idx = (y * width + x) * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      sumLum += lum;
      luminanceValues.push(lum);
      totalSampled++;

      // Detección de pigmentación biológica (Regla de Tez Humana en espacio RGB)
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const isSkinTone =
        r > 35 && g > 18 && b > 10 &&
        (maxC - minC) > 10 &&
        Math.abs(r - g) > 8 &&
        r > g && r > (b * 0.85);

      if (isSkinTone) {
        skinPixels++;
      }

      // Clasificación en franjas anatómicas
      if (y < band1End) {
        upperLumSum += lum;
        upperCount++;
      } else if (y < band2End) {
        middleLumSum += lum;
        middleCount++;
      } else {
        lowerLumSum += lum;
        lowerCount++;
      }
    }
  }

  // Muestreo de bordes exteriores (Esquinas fuera del óvalo) para validar delimitación del rostro
  let outerSkinPixels = 0;
  let outerTotalSampled = 0;
  for (let y = 0; y < height; y += step * 2) {
    for (let x = 0; x < width; x += step * 2) {
      if (x < minX || x > maxX || y < minY || y > maxY) {
        const idx = (y * width + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];

        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const isSkinTone =
          r > 35 && g > 18 && b > 10 &&
          (maxC - minC) > 10 &&
          Math.abs(r - g) > 8 &&
          r > g && r > (b * 0.85);

        if (isSkinTone) outerSkinPixels++;
        outerTotalSampled++;
      }
    }
  }

  const skinRatio = totalSampled > 0 ? skinPixels / totalSampled : 0;
  const outerSkinRatio = outerTotalSampled > 0 ? outerSkinPixels / outerTotalSampled : 0;
  const meanLum = totalSampled > 0 ? sumLum / totalSampled : 0;

  let varianceSum = 0;
  for (let i = 0; i < luminanceValues.length; i++) {
    const diff = luminanceValues[i] - meanLum;
    varianceSum += diff * diff;
  }
  const contrastVariance = totalSampled > 0 ? Math.sqrt(varianceSum / totalSampled) : 0;

  // Promedios de luminancia por zonas
  const upperLum = upperCount > 0 ? upperLumSum / upperCount : meanLum;
  const middleLum = middleCount > 0 ? middleLumSum / middleCount : meanLum;
  const lowerLum = lowerCount > 0 ? lowerLumSum / lowerCount : meanLum;

  // Criterios estrictos para validar rostro humano real:
  // 1. Cobertura de piel entre 18% y 82% (un dedo/mano sobre el lente cubre >82% uniformemente).
  // 2. No debe estar cubierto en los bordes exteriores al mismo tiempo (evita palmas/dedos pegados).
  // 3. Varianza de contraste adecuada (descarta focos o sombras totalmente planas).
  // 4. Gradiente topográfico anatómico (el tercio medio debe diferir de la zona ocular o barbilla).
  // 5. Sin sobreexposición ni oscuridad extrema (20 < meanLum < 225).
  const isNotObstructed = skinRatio <= 0.82;
  const isNotFullHandOrFinger = !(skinRatio > 0.72 && outerSkinRatio > 0.70);
  const hasTopographicStructure =
    Math.max(Math.abs(middleLum - upperLum), Math.abs(middleLum - lowerLum)) >= 3.5 ||
    contrastVariance >= 16;

  const isFace =
    skinRatio >= 0.18 &&
    isNotObstructed &&
    isNotFullHandOrFinger &&
    hasTopographicStructure &&
    contrastVariance >= 12 &&
    meanLum < 225 &&
    meanLum > 20;

  return {
    isFace,
    skinRatio,
    contrastVariance,
  };
}

/**
 * Extrae un vector descriptor de 128 dimensiones normalizado a partir de un fotograma de video,
 * únicamente si se confirma la presencia real de un rostro humano.
 */
export function extractEmbeddingFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): { embedding: number[]; quality: ImageQualityMetrics } | null {
  if (!video.videoWidth || !video.videoHeight) return null;

  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  // Recortar la región central (donde se ubica el óvalo del rostro)
  const cropSize = Math.min(video.videoWidth, video.videoHeight) * 0.7;
  const sx = (video.videoWidth - cropSize) / 2;
  const sy = (video.videoHeight - cropSize) / 2;

  ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, 160, 160);

  const quality = analyzeImageQuality(ctx, 160, 160);
  const imgData = ctx.getImageData(0, 0, 160, 160).data;

  // Validar si realmente hay un rostro humano en la imagen antes de procesar
  const faceCheck = verifyHumanFacePresence(imgData, 160, 160);
  if (!faceCheck.isFace) {
    // No es un rostro humano (es un foco, pared, suelo u objeto) -> retornar null
    return null;
  }

  // Construir 128 características numéricas agrupando regiones espaciales
  const rawEmbedding: number[] = new Array(128);
  let featureIdx = 0;

  for (let gridY = 0; gridY < 8; gridY++) {
    for (let gridX = 0; gridX < 16; gridX++) {
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;

      for (let y = gridY * 20; y < (gridY + 1) * 20; y += 4) {
        for (let x = gridX * 10; x < (gridX + 1) * 10; x += 2) {
          const pixelIdx = (y * 160 + x) * 4;
          sumR += imgData[pixelIdx];
          sumG += imgData[pixelIdx + 1];
          sumB += imgData[pixelIdx + 2];
        }
      }

      // Gradiente relacional entre canales de color R, G, B
      const featureVal = ((sumG - sumR) + (sumB * 0.5)) / 50.0;
      rawEmbedding[featureIdx++] = featureVal;
    }
  }

  return {
    embedding: normalizeVector(rawEmbedding),
    quality,
  };
}

export function useBiometrics() {
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Obtiene los vectores biométricos de una lista de estudiantes
   */
  const getBiometricsForStudents = useCallback(async (studentIds: string[]): Promise<StudentBiometric[]> => {
    if (!studentIds.length) return [];
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_biometrics')
        .select('*')
        .in('student_id', studentIds);

      if (error) {
        console.error('Error cargando biometría:', error);
        return [];
      }
      return (data || []) as StudentBiometric[];
    } catch (err) {
      console.error('Error inesperado en biometría:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Guarda o actualiza el vector biométrico de un estudiante
   */
  const saveStudentBiometric = useCallback(async (studentId: string, embedding: number[]): Promise<boolean> => {
    if (embedding.length !== 128) {
      toast.error('El vector facial debe contener exactamente 128 valores.');
      return false;
    }
    const normalized = normalizeVector(embedding);
    setLoading(true);
    try {
      const { error } = await supabase
        .from('student_biometrics')
        .upsert(
          {
            student_id: studentId,
            embedding: normalized,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'student_id' }
        );

      if (error) {
        console.error('Error al guardar biometría:', error);
        toast.error(`Error al guardar huella facial: ${error.message}`);
        return false;
      }

      toast.success('Huella facial registrada correctamente.');
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Desconocido';
      toast.error(`Error inesperado: ${errorMessage}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Encuentra el estudiante con mayor similitud a partir de un vector escaneado,
   * aplicando prueba de margen (Ratio Test) para evitar confusiones de rostros.
   */
  const matchBiometric = useCallback((
    scannedEmbedding: number[],
    registeredBiometrics: StudentBiometric[],
    tolerance = 0.45
  ): MatchResult | null => {
    if (!registeredBiometrics.length || scannedEmbedding.length !== 128) return null;

    const normalizedScan = normalizeVector(scannedEmbedding);

    let bestMatch: MatchResult | null = null;
    let minDistance = Infinity;
    let secondMinDistance = Infinity;

    for (const bio of registeredBiometrics) {
      const normalizedBio = normalizeVector(bio.embedding);
      const dist = calculateEuclideanDistance(normalizedScan, normalizedBio);

      if (dist < minDistance) {
        secondMinDistance = minDistance;
        minDistance = dist;
        bestMatch = {
          student_id: bio.student_id,
          distance: dist,
          confidence: Math.max(0, Math.min(100, Math.round((1 - dist / 1.414) * 100))),
        };
      } else if (dist < secondMinDistance) {
        secondMinDistance = dist;
      }
    }

    if (!bestMatch || minDistance > tolerance) {
      return null;
    }

    // Ratio Test del segundo candidato: si el segundo candidato está demasiado cercano al primero,
    // se considera ambiguo para evitar falsos reconocimientos.
    const marginRatio = secondMinDistance !== Infinity && secondMinDistance > 0
      ? minDistance / secondMinDistance
      : 0;

    bestMatch.secondBestDistance = secondMinDistance;
    bestMatch.marginRatio = marginRatio;

    // Si la ambigüedad es alta (ratio > 0.88), rechazar coincidencia por seguridad
    if (registeredBiometrics.length > 1 && marginRatio > 0.88) {
      console.warn('Emparejamiento rechazado por ambigüedad de rostro:', { minDistance, secondMinDistance, marginRatio });
      return null;
    }

    return bestMatch;
  }, []);

  /**
   * Elimina la huella facial registrada de un estudiante
   */
  const deleteStudentBiometric = useCallback(async (studentId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('student_biometrics')
        .delete()
        .eq('student_id', studentId);

      if (error) {
        console.error('Error al eliminar biometría:', error);
        toast.error(`Error al eliminar huella facial: ${error.message}`);
        return false;
      }

      toast.success('Huella facial eliminada correctamente.');
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Desconocido';
      toast.error(`Error inesperado: ${errorMessage}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    getBiometricsForStudents,
    saveStudentBiometric,
    deleteStudentBiometric,
    matchBiometric,
  };
}

/**
 * Calcula el vector centroide promedio de múltiples capturas biométricas
 */
export function computeCentroidEmbedding(embeddings: number[][]): number[] {
  if (!embeddings.length) return [];
  const dim = embeddings[0].length;
  const centroid = new Array(dim).fill(0);

  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += emb[i];
    }
  }

  for (let i = 0; i < dim; i++) {
    centroid[i] /= embeddings.length;
  }

  return normalizeVector(centroid);
}


