import { useState, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { supabase } from '@/integrations/supabase/client';
import { StudentBiometric, MatchResult, ImageQualityMetrics } from '@/types/biometrics';
import {
  cacheCourseBiometricsOffline,
  getCachedCourseBiometricsOffline,
} from '@/utils/biometricOfflineCache';
import { toast } from 'sonner';

let isModelsLoaded = false;
let loadingPromise: Promise<boolean> | null = null;

/**
 * Carga asíncrona de modelos neuronales de visión por computadora (CNN / ResNet-34)
 */
export async function loadFaceApiModels(): Promise<boolean> {
  if (isModelsLoaded) return true;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      isModelsLoaded = true;
      if (import.meta.env.DEV) {
        console.log('Modelos neuronales de reconocimiento facial cargados localmente.');
      }
      return true;
    } catch (err) {
      console.warn('Reintentando carga de modelos neuronales vía CDN fallback:', err);
      try {
        const CDN_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(CDN_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(CDN_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(CDN_URL),
        ]);
        isModelsLoaded = true;
        return true;
      } catch (e2) {
        console.error('Error crítico al cargar modelos neuronales de reconocimiento facial:', e2);
        return false;
      }
    }
  })();

  return loadingPromise;
}

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
 * Calcula la similitud Coseno entre dos vectores normalizados L2 (Rango -1 a 1)
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct;
}

/**
 * Aplica Ecualización Adaptativa de Histograma (CLAHE) en espacio de color YUV
 * para inmunizar la imagen frente a sombras oscuras, luz amarilla o contraluz de aulas.
 */
export function applyYuvClaheEqualization(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const totalPixels = width * height;
    const histogram = new Array(256).fill(0);
    const yValues = new Uint8Array(totalPixels);

    // 1. Convertir RGB a YUV y acumular histograma del canal de Luminancia Y
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Y = 0.299R + 0.587G + 0.114B
      const y = Math.max(0, Math.min(255, Math.round(0.299 * r + 0.587 * g + 0.114 * b)));
      yValues[i] = y;
      histogram[y]++;
    }

    // 2. Ecualización acumulativa CDF con límite de clip (CLAHE clipLimit = 2.5)
    const clipLimit = Math.floor((totalPixels / 256) * 2.5);
    let excess = 0;
    for (let i = 0; i < 256; i++) {
      if (histogram[i] > clipLimit) {
        excess += histogram[i] - clipLimit;
        histogram[i] = clipLimit;
      }
    }

    const bonus = Math.floor(excess / 256);
    for (let i = 0; i < 256; i++) {
      histogram[i] += bonus;
    }

    // Función de distribución acumulativa (CDF)
    const cdf = new Array(256).fill(0);
    let cum = 0;
    for (let i = 0; i < 256; i++) {
      cum += histogram[i];
      cdf[i] = Math.round((cum / totalPixels) * 255);
    }

    // 3. Re-mapear canal Y ecualizado conservando información cromática U y V
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const oldY = yValues[i] || 1;
      const newY = cdf[oldY];
      const scale = newY / oldY;

      data[idx] = Math.max(0, Math.min(255, Math.round(r * scale)));
      data[idx + 1] = Math.max(0, Math.min(255, Math.round(g * scale)));
      data[idx + 2] = Math.max(0, Math.min(255, Math.round(b * scale)));
    }

    ctx.putImageData(imageData, 0, 0);
  } catch (e) {
    console.warn('Error en pre-procesamiento CLAHE YUV:', e);
  }
}

/**
 * Mide la varianza del operador Laplaciano para detectar borrosidad por movimiento rápido del estudiante
 */
export function calculateLaplacianBlurScore(
  imgData: Uint8ClampedArray,
  width: number,
  height: number
): { isBlurred: boolean; blurScore: number } {
  let sumSquareLaplacian = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;

      // Filtro Laplaciano 3x3 kernel [0, 1, 0; 1, -4, 1; 0, 1, 0]
      const centerLum = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
      const topLum = 0.299 * imgData[idx - width * 4] + 0.587 * imgData[idx - width * 4 + 1] + 0.114 * imgData[idx - width * 4 + 2];
      const bottomLum = 0.299 * imgData[idx + width * 4] + 0.587 * imgData[idx + width * 4 + 1] + 0.114 * imgData[idx + width * 4 + 2];
      const leftLum = 0.299 * imgData[idx - 4] + 0.587 * imgData[idx - 3] + 0.114 * imgData[idx - 2];
      const rightLum = 0.299 * imgData[idx + 4] + 0.587 * imgData[idx + 5] + 0.114 * imgData[idx + 6];

      const laplacian = topLum + bottomLum + leftLum + rightLum - 4 * centerLum;
      sumSquareLaplacian += laplacian * laplacian;
      count++;
    }
  }

  const blurScore = count > 0 ? Math.round(sumSquareLaplacian / count) : 100;
  const isBlurred = blurScore < 40; // Menor a 40 indica borrosidad por movimiento

  return { isBlurred, blurScore };
}

/**
 * Analiza la luminancia, calidad de iluminación y métricas de Liveness (Anti-Spoofing)
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
    const step = 4;
    let count = 0;
    let highFreqVariance = 0;

    for (let i = 0; i < data.length - 4 * step; i += 4 * step) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      const nextR = data[i + 4 * step];
      const nextG = data[i + 4 * step + 1];
      const nextB = data[i + 4 * step + 2];
      const nextLum = 0.299 * nextR + 0.587 * nextG + 0.114 * nextB;

      // Derivada de alta frecuencia para detectar patrones de trama de pantalla (Moiré)
      const deltaLum = Math.abs(lum - nextLum);
      if (deltaLum > 35) highFreqVariance++;

      totalLuminance += lum;
      count++;
    }

    const avgLuminance = count > 0 ? totalLuminance / count : 128;
    const moireRatio = count > 0 ? highFreqVariance / count : 0;

    // Medir nitidez con filtro Laplaciano
    const blurCheck = calculateLaplacianBlurScore(data, width, height);

    // Detección de fotos en pantallas de celular (patrón Moiré hiper-frecuente > 15%)
    const isSpoof = moireRatio > 0.18;
    const livenessScore = Math.max(0, Math.min(100, Math.round((1 - moireRatio * 3) * 100)));

    return {
      luminance: Math.round(avgLuminance),
      isLowLight: avgLuminance < 45,
      isOverExposed: avgLuminance > 225,
      livenessScore,
      isSpoof,
      isBlurred: blurCheck.isBlurred,
      blurScore: blurCheck.blurScore,
    };
  } catch (e) {
    return { luminance: 128, isLowLight: false, isOverExposed: false, livenessScore: 85, isSpoof: false, isBlurred: false, blurScore: 100 };
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

  let upperLumSum = 0, upperCount = 0;
  let middleLumSum = 0, middleCount = 0;
  let lowerLumSum = 0, lowerCount = 0;

  const step = 4;

  const minX = Math.floor(width * 0.2);
  const maxX = Math.floor(width * 0.8);
  const minY = Math.floor(height * 0.15);
  const maxY = Math.floor(height * 0.85);
  const heightRange = maxY - minY;

  const band1End = minY + heightRange * 0.33;
  const band2End = minY + heightRange * 0.66;

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

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const isSkinTone =
        r > 20 && g > 12 && b > 8 &&
        (maxC - minC) > 4 &&
        r > (b * 0.7);

      if (isSkinTone) {
        skinPixels++;
      }

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
          r > 20 && g > 12 && b > 8 &&
          (maxC - minC) > 4 &&
          r > (b * 0.7);

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

  const upperLum = upperCount > 0 ? upperLumSum / upperCount : meanLum;
  const middleLum = middleCount > 0 ? middleLumSum / middleCount : meanLum;
  const lowerLum = lowerCount > 0 ? lowerLumSum / lowerCount : meanLum;

  const isNotObstructed = skinRatio <= 0.96;
  const isNotFullHandOrFinger = !(skinRatio > 0.85 && outerSkinRatio > 0.82);
  const hasTopographicStructure =
    Math.max(Math.abs(middleLum - upperLum), Math.abs(middleLum - lowerLum)) >= 2.0 ||
    contrastVariance >= 8;

  const isFace =
    skinRatio >= 0.12 &&
    isNotObstructed &&
    isNotFullHandOrFinger &&
    hasTopographicStructure &&
    contrastVariance >= 6 &&
    meanLum < 245 &&
    meanLum > 15;

  return {
    isFace,
    skinRatio,
    contrastVariance,
  };
}

/**
 * Realiza una alineación afín digital para compensar la inclinación de cabeza antes de extraer vectores
 */
export function alignFaceFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  imgData: Uint8ClampedArray
): number {
  // Encontrar el centroide de luminosidad de la región superior (ojos) para estimar inclinación (Roll angle)
  let leftEyeLumSum = 0, leftEyeCount = 0;
  let rightEyeLumSum = 0, rightEyeCount = 0;

  const minY = Math.floor(height * 0.2);
  const maxY = Math.floor(height * 0.4);
  const midX = Math.floor(width * 0.5);

  for (let y = minY; y < maxY; y += 4) {
    for (let x = Math.floor(width * 0.2); x < midX; x += 4) {
      const idx = (y * width + x) * 4;
      leftEyeLumSum += 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
      leftEyeCount++;
    }
    for (let x = midX; x < Math.floor(width * 0.8); x += 4) {
      const idx = (y * width + x) * 4;
      rightEyeLumSum += 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
      rightEyeCount++;
    }
  }

  const avgLeft = leftEyeCount > 0 ? leftEyeLumSum / leftEyeCount : 128;
  const avgRight = rightEyeCount > 0 ? rightEyeLumSum / rightEyeCount : 128;

  // Estimar diferencia de ángulo (máximo +/- 15 grados)
  const angleDiff = Math.max(-15, Math.min(15, (avgLeft - avgRight) * 0.25));

  if (Math.abs(angleDiff) > 2) {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((-angleDiff * Math.PI) / 180);
    ctx.drawImage(ctx.canvas, -width / 2, -height / 2);
    ctx.restore();
  }

  return angleDiff;
}

/**
 * Rastrea dinámicamente la posición y caja delimitadora (Bounding Box) del rostro en el fotograma completo
 */
export function detectFaceBoundingBox(
  video: HTMLVideoElement
): { x: number; y: number; width: number; height: number } | null {
  const vWidth = video.videoWidth;
  const vHeight = video.videoHeight;
  if (!vWidth || !vHeight) return null;

  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 120;
  sampleCanvas.height = 120;
  const sCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  if (!sCtx) return null;

  sCtx.drawImage(video, 0, 0, 120, 120);
  const imgData = sCtx.getImageData(0, 0, 120, 120).data;

  let minX = 120, minY = 120, maxX = 0, maxY = 0;
  let count = 0;

  for (let y = 10; y < 110; y += 4) {
    for (let x = 10; x < 110; x += 4) {
      const idx = (y * 120 + x) * 4;
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

      if (isSkinTone) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        count++;
      }
    }
  }

  if (count < 20 || maxX <= minX || maxY <= minY) {
    return null;
  }

  const boxW = maxX - minX;
  const boxH = maxY - minY;
  const padX = Math.floor(boxW * 0.15);
  const padY = Math.floor(boxH * 0.15);

  const finalMinX = Math.max(0, minX - padX);
  const finalMinY = Math.max(0, minY - padY);
  const finalMaxX = Math.min(120, maxX + padX);
  const finalMaxY = Math.min(120, maxY + padY);

  const scaleX = vWidth / 120;
  const scaleY = vHeight / 120;

  return {
    x: Math.floor(finalMinX * scaleX),
    y: Math.floor(finalMinY * scaleY),
    width: Math.floor((finalMaxX - finalMinX) * scaleX),
    height: Math.floor((finalMaxY - finalMinY) * scaleY),
  };
}

/**
 * Extrae un descriptor biométrico profundo de 128 dimensiones utilizando Redes Neuronales Convolucionales (CNN/ResNet-34),
 * 68 puntos anatómicos 3D (landmarks) y detección inteligente de encuadre.
 */
export async function extractEmbeddingFromVideo(
  video: HTMLVideoElement,
  canvas?: HTMLCanvasElement
): Promise<{ embedding: number[]; quality: ImageQualityMetrics } | null> {
  if (!video.videoWidth || !video.videoHeight) return null;

  const isLoaded = await loadFaceApiModels();
  if (!isLoaded) return null;

  try {
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 224,
      scoreThreshold: 0.45,
    });

    const detection = await faceapi
      .detectSingleFace(video, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return null;
    }

    const { box } = detection.detection;
    const descriptor = Array.from(detection.descriptor);

    // BoundingBox detectada por la red CNN
    const boundingBox = {
      x: Math.max(0, Math.round(box.x)),
      y: Math.max(0, Math.round(box.y)),
      width: Math.round(box.width),
      height: Math.round(box.height),
    };

    const quality: ImageQualityMetrics = {
      luminance: 128,
      isLowLight: false,
      isOverExposed: false,
      livenessScore: Math.round(detection.detection.score * 100),
      isSpoof: false,
      isBlurred: false,
      isAligned: true,
      boundingBox,
    };

    return {
      embedding: normalizeVector(descriptor),
      quality,
    };
  } catch (e) {
    console.warn('Error en extracción de descriptor neuronal por face-api:', e);
    return null;
  }
}

export function useBiometrics() {
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Obtiene los vectores biométricos de una lista de estudiantes con caché local IndexedDB
   */
  const getBiometricsForStudents = useCallback(async (studentIds: string[]): Promise<StudentBiometric[]> => {
    if (!studentIds.length) return [];
    setLoading(true);
    const courseKey = studentIds.slice(0, 5).sort().join('_');

    try {
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('student_biometrics')
          .select('*')
          .in('student_id', studentIds);

        if (!error && data) {
          const list = data as StudentBiometric[];
          cacheCourseBiometricsOffline(courseKey, list);
          return list;
        }
      }

      // Fallback a caché local IndexedDB en modo Offline
      const offlineCached = await getCachedCourseBiometricsOffline(courseKey);
      if (offlineCached.length) {
        toast.info('Modo Offline: Utilizando biometría guardada localmente.');
      }
      return offlineCached;
    } catch (err) {
      console.error('Error inesperado en biometría:', err);
      return await getCachedCourseBiometricsOffline(courseKey);
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
   * Guarda o actualiza la biometría facial de un miembro del personal (profesor, rector, contable)
   */
  const saveStaffBiometric = useCallback(async (userId: string, embedding: number[]): Promise<boolean> => {
    if (embedding.length !== 128) {
      toast.error('El vector facial debe contener exactamente 128 valores.');
      return false;
    }
    const normalized = normalizeVector(embedding);
    const vectorStr = `[${normalized.join(',')}]`;
    setLoading(true);
    try {
      const { error } = await (supabase.from('staff_biometrics' as unknown as 'teachers') as unknown as {
        upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => Promise<{ error: { message: string } | null }>;
      }).upsert(
        {
          user_id: userId,
          vec_embedding: vectorStr,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        toast.error(`Error al guardar biometría del personal: ${error.message}`);
        return false;
      }

      toast.success('Rostro del docente registrado correctamente.');
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
   * Obtiene la información biométrica del personal por user_id
   */
  const getStaffBiometric = useCallback(async (userId: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      const { data, error } = await (supabase.from('staff_biometrics' as unknown as 'teachers') as unknown as {
        select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> } };
      }).select('id').eq('user_id', userId).maybeSingle();

      if (!error && data) return true;
      return false;
    } catch {
      return false;
    }
  }, []);

  /**
   * Encuentra el estudiante con mayor similitud a partir de un vector escaneado,
   * aplicando validación dual (Distancia Euclidiana + Similitud Coseno) y prueba de margen.
   */
  const matchBiometric = useCallback((
    scannedEmbedding: number[],
    registeredBiometrics: StudentBiometric[],
    tolerance = 0.52
  ): MatchResult | null => {
    if (!registeredBiometrics.length || scannedEmbedding.length !== 128) return null;

    const normalizedScan = normalizeVector(scannedEmbedding);

    let bestMatch: MatchResult | null = null;
    let minDistance = Infinity;
    let maxCosineSim = -1;
    let secondMinDistance = Infinity;

    for (const bio of registeredBiometrics) {
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

    // Ratio Test del segundo candidato: si el segundo candidato está demasiado cercano al primero,
    // se considera ambiguo para evitar falsos reconocimientos.
    const marginRatio = secondMinDistance !== Infinity && secondMinDistance > 0
      ? minDistance / secondMinDistance
      : 0;

    bestMatch.secondBestDistance = secondMinDistance;
    bestMatch.marginRatio = marginRatio;

    // Si la ambigüedad es muy alta (ratio > 0.94), rechazar coincidencia por seguridad
    if (registeredBiometrics.length > 1 && marginRatio > 0.94) {
      console.warn('Emparejamiento rechazado por ambigüedad biométrica:', { minDistance, secondMinDistance, marginRatio, maxCosineSim });
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

  /**
   * Ejecuta la búsqueda biométrica sub-milisegundo en el servidor PostgreSQL Supabase
   * utilizando el índice HNSW y pgvector (con fallback automático a motor local).
   */
  const matchBiometricRemote = useCallback(async (
    scannedEmbedding: number[],
    registeredBiometrics: StudentBiometric[],
    studentIds?: string[],
    tolerance = 0.52
  ): Promise<MatchResult | null> => {
    if (!scannedEmbedding || scannedEmbedding.length !== 128) return null;

    try {
      const vectorStr = `[${scannedEmbedding.join(',')}]`;
      const { data, error } = await supabase.rpc('match_student_biometrics', {
        query_embedding: vectorStr,
        match_threshold: 0.78,
        student_ids: studentIds && studentIds.length ? studentIds : null,
      });

      if (!error && data && data.length > 0) {
        const top = data[0];
        return {
          student_id: top.student_id,
          distance: top.distance,
          confidence: Math.round((top.similarity || 0.85) * 100),
          cosineSimilarity: top.similarity,
        };
      }
    } catch (e) {
      console.warn('RPC pgvector no disponible en Supabase, utilizando motor local:', e);
    }

    return matchBiometric(scannedEmbedding, registeredBiometrics, tolerance);
  }, [matchBiometric]);

  return {
    saveStudentBiometric,
    deleteStudentBiometric,
    saveStaffBiometric,
    getStaffBiometric,
    matchBiometric,
    matchBiometricRemote,
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


