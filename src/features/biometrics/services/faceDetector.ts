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
 * Extrae un descriptor biométrico profundo de 128 dimensiones utilizando CNN (ResNet-34)
 * integrando la puerta de calidad activa de imagen (CLAHE YUV, Laplaciano y detección de desenfoque).
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
    // 1. Preparar lienzo de trabajo para análisis y ecualización de luz
    const workCanvas = canvas || document.createElement('canvas');
    if (workCanvas.width !== vWidth || workCanvas.height !== vHeight) {
      workCanvas.width = vWidth;
      workCanvas.height = vHeight;
    }
    const ctx = workCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, vWidth, vHeight);

    // 2. Ejecutar análisis real de calidad de imagen (Luminancia, Laplaciano, Moiré)
    const qualityMetrics = analyzeImageQuality(ctx, vWidth, vHeight);

    // Puerta de calidad: Si hay baja iluminación o sombras severas, aplicar ecualización adaptativa CLAHE
    if (qualityMetrics.isLowLight || qualityMetrics.luminance < 85) {
      applyYuvClaheEqualization(ctx, vWidth, vHeight);
    }

    // Puerta de descarte rápido por desenfoque severo (ahorra inferencia CNN pesada)
    if (qualityMetrics.isBlurred && qualityMetrics.blurScore !== undefined && qualityMetrics.blurScore < 20) {
      return null;
    }

    // 3. Ejecutar inferencia de red neuronal sobre el cuadro preparado
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 224,
      scoreThreshold: 0.45,
    });

    const detection = await faceapi
      .detectSingleFace(workCanvas, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return null;
    }

    const { box } = detection.detection;
    const descriptor = Array.from(detection.descriptor);

    const boundingBox = {
      x: Math.max(0, Math.round(box.x)),
      y: Math.max(0, Math.round(box.y)),
      width: Math.round(box.width),
      height: Math.round(box.height),
    };

    const quality: ImageQualityMetrics = {
      ...qualityMetrics,
      livenessScore: Math.round(detection.detection.score * 100),
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

export interface FaceDetectionWithLandmarksResult {
  embedding: number[];
  landmarks: { x: number; y: number }[];
  box: { x: number; y: number; width: number; height: number };
  score: number;
  quality: ImageQualityMetrics;
}

/**
 * Detecta un rostro y extrae tanto los 68 puntos de referencia 3D (Landmarks)
 * como el descriptor neuronal de 128 dimensiones para validación de liveness en vivo.
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

    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 224,
      scoreThreshold: 0.45,
    });

    const detection = await faceapi
      .detectSingleFace(workCanvas, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return null;

    const { box, score } = detection.detection;
    const landmarks = detection.landmarks.positions.map((p) => ({ x: p.x, y: p.y }));
    const descriptor = Array.from(detection.descriptor);

    const boundingBox = {
      x: Math.max(0, Math.round(box.x)),
      y: Math.max(0, Math.round(box.y)),
      width: Math.round(box.width),
      height: Math.round(box.height),
    };

    return {
      embedding: normalizeVector(descriptor),
      landmarks,
      box: boundingBox,
      score,
      quality: {
        ...qualityMetrics,
        livenessScore: Math.round(score * 100),
        boundingBox,
      },
    };
  } catch (e) {
    console.warn('Error en detección con landmarks:', e);
    return null;
  }
}

