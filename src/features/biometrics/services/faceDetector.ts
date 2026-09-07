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

  return true;
}

/**
 * Extrae un descriptor biométrico profundo de 128 dimensiones utilizando CNN (ResNet-34)
 */
export async function extractEmbeddingFromVideo(
  video: HTMLVideoElement,
  canvas?: HTMLCanvasElement
): Promise<ExtractedBiometricSample | null> {
  const vWidth = video.videoWidth;
  const vHeight = video.videoHeight;
  if (!vWidth || !vHeight) return null;

  const isLoaded = await loadFaceApiModels();
  if (!isLoaded) return null;

  try {
    const workCanvas = canvas || document.createElement('canvas');
    if (workCanvas.width !== vWidth || workCanvas.height !== vHeight) {
      workCanvas.width = vWidth;
      workCanvas.height = vHeight;
    }
    const ctx = workCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, vWidth, vHeight);

    const qualityMetrics = analyzeImageQuality(ctx, vWidth, vHeight);
    if (qualityMetrics.isLowLight || qualityMetrics.luminance < 85) {
      applyYuvClaheEqualization(ctx, vWidth, vHeight);
    }

    if (qualityMetrics.isBlurred && qualityMetrics.blurScore !== undefined && qualityMetrics.blurScore < 20) {
      return null;
    }

    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.60,
    });

    const detection = await faceapi
      .detectSingleFace(workCanvas, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return null;

    const { box } = detection.detection;
    const landmarks = detection.landmarks.positions.map((p) => ({ x: p.x, y: p.y }));

    const boundingBox = {
      x: Math.max(0, Math.round(box.x)),
      y: Math.max(0, Math.round(box.y)),
      width: Math.round(box.width),
      height: Math.round(box.height),
    };

    if (!isValidFaceGeometry(boundingBox, landmarks)) {
      return null;
    }

    const descriptor = Array.from(detection.descriptor);

    return {
      embedding: normalizeVector(descriptor),
      quality: {
        ...qualityMetrics,
        livenessScore: Math.round(detection.detection.score * 100),
        isAligned: true,
        boundingBox,
      },
    };
  } catch (e) {
    console.warn('Error en extracción de descriptor neuronal por face-api:', e);
    return null;
  }
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
 * validando rigurosamente que la geometría pertenezca a una fisionomía humana real.
 */
export async function detectFaceWithLandmarks(
  video: HTMLVideoElement,
  canvas?: HTMLCanvasElement
): Promise<FaceDetectionWithLandmarksResult | null> {
  const vWidth = video.videoWidth;
  const vHeight = video.videoHeight;
  if (!vWidth || !vHeight) return null;

  const isLoaded = await loadFaceApiModels();
  if (!isLoaded) return null;

  try {
    const workCanvas = canvas || document.createElement('canvas');
    if (workCanvas.width !== vWidth || workCanvas.height !== vHeight) {
      workCanvas.width = vWidth;
      workCanvas.height = vHeight;
    }
    const ctx = workCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, vWidth, vHeight);

    const qualityMetrics = analyzeImageQuality(ctx, vWidth, vHeight);
    if (qualityMetrics.isLowLight || qualityMetrics.luminance < 85) {
      applyYuvClaheEqualization(ctx, vWidth, vHeight);
    }

    // Filtro con resolución 320 y umbral de confianza 0.60 para evitar falsos positivos con dedos u objetos
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.60,
    });

    const detection = await faceapi
      .detectSingleFace(workCanvas, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return null;

    const { box, score } = detection.detection;
    const landmarks = detection.landmarks.positions.map((p) => ({ x: p.x, y: p.y }));

    const boundingBox = {
      x: Math.max(0, Math.round(box.x)),
      y: Math.max(0, Math.round(box.y)),
      width: Math.round(box.width),
      height: Math.round(box.height),
    };

    // Validación geométrica de fisionomía humana
    if (!isValidFaceGeometry(boundingBox, landmarks)) {
      return null;
    }

    const descriptor = Array.from(detection.descriptor);

    return {
      box: boundingBox,
      embedding: normalizeVector(descriptor),
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
