import { useState, useRef, useEffect, useCallback } from "react";
import type { StudentBiometric } from "@/types/biometrics";
import type { ClassScannerState, DistanceStatus, MatchEvent } from "./types";
import {
  detectFaceWithLandmarks,
  loadFaceApiModels,
} from "@/features/biometrics/services/faceDetector";
import { calculateEyeAspectRatio } from "@/features/biometrics/services/livenessDetector";
import {
  AdaptiveBlinkTracker,
  type BlinkPhase,
} from "@/features/biometrics/services/adaptiveBlinkDetector";
import { matchBiometricLocal } from "@/features/biometrics/services/biometricMatcher";
import {
  validateOvalContainment,
  isSpatialContinuityValid,
  initializeCameraStream,
  stopMediaStream,
  buildMatchEvent,
  KIOSK_OVAL_ROI,
} from "./scannerHelpers";

interface UseClassLivenessScannerProps {
  alreadyRegisteredIds?: Set<string>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isActive: boolean;
  onMatch: (studentId: string) => void;
  registeredBiometrics: StudentBiometric[];
  students: { id: string; name: string }[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useClassLivenessScanner({
  alreadyRegisteredIds,
  canvasRef,
  isActive,
  onMatch,
  registeredBiometrics,
  students,
  videoRef,
}: UseClassLivenessScannerProps) {
  const [scannerState, setScannerState] = useState<ClassScannerState>("ready");
  const [distanceStatus, setDistanceStatus] = useState<DistanceStatus>("not_detected");
  const [instructionText, setInstructionText] = useState("Ubique su rostro dentro del óvalo");
  const [lastMatch, setLastMatch] = useState<MatchEvent | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [earValue, setEarValue] = useState<number>(0.3);
  const [blinkPhase, setBlinkPhase] = useState<BlinkPhase>("idle");

  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const inCooldownRef = useRef(false);

  // Detector adaptativo de parpadeo (EAR)
  const blinkTrackerRef = useRef<AdaptiveBlinkTracker>(new AdaptiveBlinkTracker());
  const livenessPassedRef = useRef(false);
  const livenessPassedTimestampRef = useRef(0);
  const lastFaceCenterRef = useRef<{ x: number; y: number } | null>(null);
  const missedFramesRef = useRef(0);

  // Estabilización de candidato
  const candidateRef = useRef<{ count: number; id: string } | null>(null);

  // Registro en memoria de estudiantes que ya tienen asistencia tomada
  const alreadyRegisteredRef = useRef<Set<string>>(alreadyRegisteredIds || new Set());
  useEffect(() => {
    alreadyRegisteredRef.current = alreadyRegisteredIds || new Set();
  }, [alreadyRegisteredIds]);

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    stopMediaStream(streamRef.current, videoRef.current);
    streamRef.current = null;
    setIsCameraReady(false);
  }, [videoRef]);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      await loadFaceApiModels();
      if (!videoRef.current) return;
      streamRef.current = await initializeCameraStream(videoRef.current, facingMode);
      setIsCameraReady(true);
    } catch (err) {
      console.error("Error al iniciar cámara de clase:", err);
      setScannerState("error");
      setInstructionText("No se pudo acceder a la cámara web");
    }
  }, [facingMode, stopCamera, videoRef]);

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const resetBlinkTracker = () => {
    blinkTrackerRef.current.reset();
    livenessPassedRef.current = false;
    livenessPassedTimestampRef.current = 0;
    lastFaceCenterRef.current = null;
    candidateRef.current = null;
    missedFramesRef.current = 0;
    setBlinkPhase("idle");
  };

  const processFrame = useCallback(async () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      isProcessingRef.current ||
      inCooldownRef.current ||
      !isCameraReady
    ) {
      return;
    }

    isProcessingRef.current = true;

    try {
      // Expiración estricta de liveness: si pasaron >500ms sin match, caduca
      if (livenessPassedRef.current && Date.now() - livenessPassedTimestampRef.current > 500) {
        resetBlinkTracker();
      }

      // Modo de alta tasa de cuadros: extrae embedding sólo cuando liveness ya ha pasado
      const result = await detectFaceWithLandmarks(
        videoRef.current,
        canvasRef.current,
        livenessPassedRef.current,
        KIOSK_OVAL_ROI
      );

      if (!result) {
        missedFramesRef.current += 1;
        const thresholdMissed = livenessPassedRef.current ? 2 : 3;
        if (missedFramesRef.current >= thresholdMissed) {
          setDistanceStatus("not_detected");
          setScannerState("ready");
          setInstructionText("Ubique su rostro dentro del óvalo");
          resetBlinkTracker();
        }
        return;
      }

      const { box, embedding, landmarks } = result;
      const vWidth = videoRef.current.videoWidth || 1280;
      const vHeight = videoRef.current.videoHeight || 720;

      // 1. Evaluación estricta: solo se reconoce el rostro si está dentro del óvalo central
      const ovalResult = validateOvalContainment(box, vWidth, vHeight);
      if (!ovalResult.isInsideOval) {
        missedFramesRef.current += 1;
        const thresholdMissed = livenessPassedRef.current ? 2 : 3;
        if (missedFramesRef.current >= thresholdMissed) {
          setDistanceStatus("not_detected");
          setScannerState("ready");
          setInstructionText("Ubique su rostro dentro del óvalo");
          resetBlinkTracker();
        }
        return;
      }

      missedFramesRef.current = 0;

      // Continuidad espacial: descarta saltos bruscos (sustitución por dedo/mano u otro rostro)
      const currentCenter = { x: ovalResult.faceCenterX, y: ovalResult.faceCenterY };
      if (!isSpatialContinuityValid(currentCenter, lastFaceCenterRef.current, vWidth)) {
        resetBlinkTracker();
        lastFaceCenterRef.current = currentCenter;
        return;
      }
      lastFaceCenterRef.current = currentCenter;

      setDistanceStatus("centered");

      // 2. Detección adaptativa de parpadeo humano (EAR)
      const { earAvg, earLeft, earRight } = calculateEyeAspectRatio(landmarks);
      setEarValue(earAvg);

      if (!livenessPassedRef.current) {
        setScannerState("blink_required");
        const blinkEval = blinkTrackerRef.current.update(earAvg, earLeft, earRight);
        setBlinkPhase(blinkEval.phase);
        setInstructionText(blinkEval.instruction);

        if (blinkEval.isPassed) {
          livenessPassedRef.current = true;
          livenessPassedTimestampRef.current = Date.now();
        }

        return;
      }

      // 3. Emparejamiento biométrico estricto (tolerancia 0.44)
      const match = matchBiometricLocal(
        embedding,
        registeredBiometrics.map((b) => ({
          embedding: b.embedding,
          id: b.id,
          student_id: b.student_id,
        })),
        0.44
      );

      if (!match) {
        setScannerState("unrecognized");
        setInstructionText("Rostro no coincide con los estudiantes de la materia");
        return;
      }

      // Estabilización de candidato
      if (!candidateRef.current || candidateRef.current.id !== match.student_id) {
        candidateRef.current = { count: 1, id: match.student_id };
        return;
      }

      candidateRef.current.count += 1;
      if (candidateRef.current.count < 2) {
        return;
      }

      // 4. Confirmación exitosa o detección de estudiante ya registrado
      const { isAlready, studentName, matchEvent } = buildMatchEvent(
        match.student_id,
        students,
        alreadyRegisteredRef.current,
        match.confidence
      );

      setScannerState(isAlready ? "already_marked" : "matched");
      setInstructionText(
        isAlready
          ? `${studentName} ya tiene asistencia registrada`
          : `¡Asistencia registrada: ${studentName}!`
      );
      setLastMatch(matchEvent);

      if (!isAlready) {
        onMatch(match.student_id);
      }


      inCooldownRef.current = true;
      setScannerState("cooldown");

      setTimeout(() => {
        inCooldownRef.current = false;
        resetBlinkTracker();
        setScannerState("ready");
        setInstructionText("Ubique su rostro dentro del óvalo");
      }, 1600);
    } catch (e) {
      console.warn("Error en escaneo de clase:", e);
    } finally {
      isProcessingRef.current = false;
    }
  }, [canvasRef, isCameraReady, onMatch, registeredBiometrics, students, videoRef]);

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isActive, startCamera, stopCamera]);

  useEffect(() => {
    if (!isCameraReady || !isActive) return;
    scanTimerRef.current = setInterval(processFrame, 65);
    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, [isCameraReady, isActive, processFrame]);

  return {
    blinkPhase,
    distanceStatus,
    earValue,
    facingMode,
    instructionText,
    isCameraReady,
    lastMatch,
    scannerState,
    toggleFacingMode,
  };
}
