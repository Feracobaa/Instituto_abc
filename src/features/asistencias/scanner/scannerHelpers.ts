import type { DistanceStatus, MatchEvent } from "./types";
import type { FaceDetectionRoi } from "@/features/biometrics/services/faceDetector";

/**
 * Región de Interés (ROI) centrada para el kiosco de asistencia en aula.
 * Aísla el óvalo central e ignora por completo personas u objetos en los márgenes periféricos.
 */
export const KIOSK_OVAL_ROI: FaceDetectionRoi = {
  xMax: 0.75,
  xMin: 0.25,
  yMax: 0.88,
  yMin: 0.10,
};

export interface OvalValidationResult {
  distanceStatus: DistanceStatus;
  faceCenterX: number;
  faceCenterY: number;
  instructionText: string;
  isInsideOval: boolean;
}

/**
 * Inicializa y asocia el stream de video de la cámara web.
 */
export async function initializeCameraStream(
  video: HTMLVideoElement,
  facingMode: "user" | "environment"
): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode,
      height: { ideal: 720 },
      width: { ideal: 1280 },
    },
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;
  await new Promise<void>((resolve) => {
    video.onloadedmetadata = () => {
      video.play().catch(() => {});
      resolve();
    };
  });
  return stream;
}

/**
 * Detiene las pistas del stream activo y limpia la referencia del elemento de video.
 */
export function stopMediaStream(
  stream: MediaStream | null,
  video: HTMLVideoElement | null
): void {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
  }
  if (video) {
    video.srcObject = null;
  }
}

/**
 * Construye el objeto de coincidencia y mensaje para la interfaz.
 */
export function buildMatchEvent(
  studentId: string,
  students: { id: string; name: string }[],
  alreadyRegistered: Set<string>,
  confidence: number
): { isAlready: boolean; studentName: string; matchEvent: MatchEvent } {
  const student = students.find((s) => s.id === studentId);
  const studentName = student ? student.name : "Estudiante";
  const isAlready = alreadyRegistered.has(studentId);
  return {
    isAlready,
    matchEvent: {
      isAlreadyRegistered: isAlready,
      score: confidence,
      status: "present",
      studentId,
      studentName,
    },
    studentName,
  };
}


/**
 * Valida de forma estricta que el rostro se encuentre dentro de las proporciones del óvalo central.
 * Si el rostro no está dentro del óvalo, retorna isInsideOval = false para descartar cualquier detección.
 */
export function validateOvalContainment(
  box: { height: number; width: number; x: number; y: number },
  vWidth: number,
  vHeight: number
): OvalValidationResult {
  const faceCenterX = box.x + box.width / 2;
  const faceCenterY = box.y + box.height / 2;
  const centerXR = faceCenterX / vWidth;
  const centerYR = faceCenterY / vHeight;
  const heightRatio = box.height / vHeight;

  // Ecuación de la elipse centrada en (0.50, 0.46) con semiejes rx=0.20 y ry=0.30
  const normDx = (centerXR - 0.50) / 0.20;
  const normDy = (centerYR - 0.46) / 0.30;
  const isInsideEllipse = normDx * normDx + normDy * normDy <= 1.0;

  // Altura adecuada del rostro respecto al óvalo (entre 20% y 80% del alto del video)
  const isScaleValid = heightRatio >= 0.20 && heightRatio <= 0.80;

  if (!isInsideEllipse || !isScaleValid) {
    return {
      distanceStatus: "not_detected",
      faceCenterX,
      faceCenterY,
      instructionText: "Ubique su rostro dentro del óvalo",
      isInsideOval: false,
    };
  }

  return {
    distanceStatus: "centered",
    faceCenterX,
    faceCenterY,
    instructionText: "Parpadee frente a la cámara",
    isInsideOval: true,
  };
}

/**
 * Verifica la continuidad espacial entre fotogramas consecutivos.
 * Descarta de inmediato sustituciones repentinas de rostro por manos, dedos o fotos.
 */
export function isSpatialContinuityValid(
  current: { x: number; y: number },
  last: { x: number; y: number } | null,
  vWidth: number
): boolean {
  if (!last) return true;
  const jumpDistance = Math.hypot(current.x - last.x, current.y - last.y);
  return jumpDistance <= vWidth * 0.30;
}
