import * as faceapi from '@vladmandic/face-api';
import { ExtractedBiometricSample, ImageQualityMetrics } from '../types';
import { normalizeVector } from './vectorMath';
import {
  applyYuvClaheEqualization,
  analyzeImageQuality,
} from './imageQuality';

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
 * Valida que los 68 puntos de referencia sigan la fisionomía geométrica real de un rostro humano.
 * Descarta dedos, manos, reflejos u objetos que puedan generar falsas detecciones.
 */
export function isValidFaceGeometry(
  box: { width: number; height: number },
  landmarks: { x: number; y: number }[]
): boolean {
  if (!landmarks || landmarks.length < 68) return false;

  // 1. Proporción de aspecto de la caja (un rostro humano tiene proporción entre 0.70 y 1.70)
  const aspect = box.height / box.width;
  if (aspect < 0.70 || aspect > 1.70) return false;

  // 2. Centros de los ojos (Ojo izq: 36-41, Ojo der: 42-47)
  const leftEyeX = (landmarks[36].x + landmarks[39].x) / 2;
  const leftEyeY = (landmarks[36].y + landmarks[39].y) / 2;
  const rightEyeX = (landmarks[42].x + landmarks[45].x) / 2;
  const rightEyeY = (landmarks[42].y + landmarks[45].y) / 2;

  // Distancia interocular horizontal
  const eyeDistance = Math.hypot(rightEyeX - leftEyeX, rightEyeY - leftEyeY);
  const eyeToBoxRatio = eyeDistance / box.width;

  // En un rostro real, la distancia entre pupilas representa entre el 18% y el 55% del ancho del rostro
  if (eyeToBoxRatio < 0.18 || eyeToBoxRatio > 0.58) return false;

  // 3. Coherencia vertical: Ojos -> Nariz (30) -> Boca (62/66)
  const avgEyesY = (leftEyeY + rightEyeY) / 2;
  const noseTipY = landmarks[30].y;
  const mouthY = (landmarks[62].y + landmarks[66].y) / 2;

  // La nariz debe situarse por debajo de la línea interocular
  if (noseTipY <= avgEyesY + 4) return false;

  // La boca debe situarse por debajo de la punta de la nariz
  if (mouthY <= noseTipY + 4) return false;

  // 4. Proporción y extensión de ojos individuales (descarta dedos y manos donde los puntos se aplastan)
  const leftEyeWidth = Math.hypot(landmarks[39].x - landmarks[36].x, landmarks[39].y - landmarks[36].y);
  const rightEyeWidth = Math.hypot(landmarks[45].x - landmarks[42].x, landmarks[45].y - landmarks[42].y);
  if (leftEyeWidth / box.width < 0.08 || rightEyeWidth / box.width < 0.08) return false;

  // 5. Extensión de comisura bucal (descarta objetos sin estructura labial humana)
  const mouthWidth = Math.hypot(landmarks[54].x - landmarks[48].x, landmarks[54].y - landmarks[48].y);
  if (mouthWidth / box.width < 0.16 || mouthWidth / box.width > 0.65) return false;

  return true;
}

/**
export interface FaceDetectionRoi {
  xMax: number;
  xMin: number;
  yMax: number;
  yMin: number;
}

export interface FaceDetectionWithLandmarksResult {
  box: { height: number; width: number; x: number; y: number };
  embedding: number[];
  landmarks: { x: number; y: number }[];
  quality: ImageQualityMetrics;
  score: number;
}

/**
 * Detecta un rostro y extrae tanto los 68 landmarks como el descriptor 128D,
 * con soporte para recorte ROI (Región de Interés) para aislar la interacción en el óvalo.
 */
export async function detectFaceWithLandmarks(
  video: HTMLVideoElement,
  canvas?: HTMLCanvasElement,
  withDescriptor = true,
  roi?: FaceDetectionRoi
): Promise<FaceDetectionWithLandmarksResult | null> {
  const vWidth = video.videoWidth;
  const vHeight = video.videoHeight;
  if (!vWidth || !vHeight) return null;

  const isLoaded = await loadFaceApiModels();
  if (!isLoaded) return null;

  try {
    const cropX = roi ? Math.round(vWidth * roi.xMin) : 0;
    const cropY = roi ? Math.round(vHeight * roi.yMin) : 0;
    const cropW = roi ? Math.round(vWidth * (roi.xMax - roi.xMin)) : vWidth;
    const cropH = roi ? Math.round(vHeight * (roi.yMax - roi.yMin)) : vHeight;

    const workCanvas = canvas || document.createElement('canvas');
    if (workCanvas.width !== cropW || workCanvas.height !== cropH) {
      workCanvas.width = cropW;
      workCanvas.height = cropH;
    }
    const ctx = workCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    let qualityMetrics: ImageQualityMetrics = {
      isBlurred: false,
      isLowLight: false,
      isOverexposed: false,
      luminance: 100,
    };

    // Pre-procesamiento de imagen CLAHE solo para la extracción final del descriptor 128D
    if (withDescriptor) {
      qualityMetrics = analyzeImageQuality(ctx, cropW, cropH);
      if (qualityMetrics.isLowLight || qualityMetrics.luminance < 85) {
        applyYuvClaheEqualization(ctx, cropW, cropH);
      }
    }

    // Filtro TinyFaceDetector: umbral de 0.52 para rechazar dedos/manos y mantener rostros reales
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.52,
    });

    const detectionTask = faceapi
      .detectSingleFace(workCanvas, options)
      .withFaceLandmarks();

    const detection = withDescriptor
      ? await detectionTask.withFaceDescriptor()
      : await detectionTask;

    if (!detection) return null;

    const { box, score } = detection.detection;
    const rawLandmarks = detection.landmarks.positions;

    const boundingBox = {
      x: Math.max(0, Math.round(box.x + cropX)),
      y: Math.max(0, Math.round(box.y + cropY)),
      width: Math.round(box.width),
      height: Math.round(box.height),
    };

    const landmarks = rawLandmarks.map((p) => ({
      x: Math.round(p.x + cropX),
      y: Math.round(p.y + cropY),
    }));

    // Validación geométrica de fisionomía humana
    if (!isValidFaceGeometry(boundingBox, landmarks)) {
      return null;
    }

    const rawDescriptor =
      withDescriptor && 'descriptor' in detection
        ? Array.from((detection as { descriptor: Float32Array }).descriptor)
        : [];

    return {
      box: boundingBox,
      embedding: rawDescriptor.length > 0 ? normalizeVector(rawDescriptor) : [],
      landmarks,
      quality: {
        ...qualityMetrics,
        boundingBox,
        livenessScore: Math.round(score * 100),
      },
      score,
    };
  } catch (e) {
    console.warn('Error en detección con landmarks:', e);
    return null;
  }
}

/**
 * Extrae un descriptor biométrico profundo de 128 dimensiones utilizando CNN (ResNet-34)
 */
export async function extractEmbeddingFromVideo(
  video: HTMLVideoElement,
  canvas?: HTMLCanvasElement
): Promise<ExtractedBiometricSample | null> {
  const result = await detectFaceWithLandmarks(video, canvas, true);
  if (!result || result.embedding.length === 0) return null;
  return {
    embedding: result.embedding,
    quality: {
      ...result.quality,
      isAligned: true,
    },
  };
}
