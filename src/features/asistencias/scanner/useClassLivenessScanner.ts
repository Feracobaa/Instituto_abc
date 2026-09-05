import { useState, useRef, useEffect, useCallback } from "react";
import type { StudentBiometric } from "@/types/biometrics";
import type { ClassScannerState, DistanceStatus, MatchEvent } from "./types";
import {
  detectFaceWithLandmarks,
  loadFaceApiModels,
} from "@/features/biometrics/services/faceDetector";
import { calculateEyeAspectRatio } from "@/features/biometrics/services/livenessDetector";
import { matchBiometricLocal } from "@/features/biometrics/services/biometricMatcher";

const EAR_BLINK_THRESHOLD = 0.23;
const MIN_CLOSED_FRAMES = 1;
const MIN_OPEN_FRAMES = 1;

interface UseClassLivenessScannerProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isActive: boolean;
  onMatch: (studentId: string) => void;
  registeredBiometrics: StudentBiometric[];
  students: { id: string; name: string }[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useClassLivenessScanner({
  canvasRef,
  isActive,
  onMatch,
  registeredBiometrics,
  students,
  videoRef,
}: UseClassLivenessScannerProps) {
  const [scannerState, setScannerState] = useState<ClassScannerState>("ready");
  const [distanceStatus, setDistanceStatus] = useState<DistanceStatus>("not_detected");
  const [instructionText, setInstructionText] = useState("Colóquese frente a la cámara");
  const [lastMatch, setLastMatch] = useState<MatchEvent | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isCameraReady, setIsCameraReady] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const inCooldownRef = useRef(false);

  // Estados del detector de parpadeo (EAR)
  const blinkStateRef = useRef<"OPEN" | "CLOSED">("OPEN");
  const closedCountRef = useRef(0);
  const openCountRef = useRef(0);
  const livenessPassedRef = useRef(false);

  // Estabilización de candidato consecutivo
  const candidateRef = useRef<{ count: number; id: string } | null>(null);

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, [videoRef]);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      await loadFaceApiModels();
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode,
          height: { ideal: 720 },
          width: { ideal: 1280 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraReady(true);
        };
      }
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
    blinkStateRef.current = "OPEN";
    closedCountRef.current = 0;
    openCountRef.current = 0;
    livenessPassedRef.current = false;
    candidateRef.current = null;
  };

  // Ciclo principal de detección e inferencia de visión
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
      const result = await detectFaceWithLandmarks(videoRef.current, canvasRef.current);

      if (!result) {
        setDistanceStatus("not_detected");
        setScannerState("ready");
        setInstructionText("Colóquese frente a la cámara");
        resetBlinkTracker();
        return;
      }

      const { box, embedding, landmarks } = result;

      // 1. Evaluación de distancia (ancho del rostro)
      if (box.width < 140) {
        setDistanceStatus("too_far");
        setScannerState("analyzing");
        setInstructionText("Acérquese un poco a la cámara");
        return;
      }

      if (box.width > 340) {
        setDistanceStatus("too_close");
        setScannerState("analyzing");
        setInstructionText("Aléjese un poco de la cámara");
        return;
      }

      setDistanceStatus("centered");

      // 2. Detección de parpadeo activo (EAR)
      const { earAvg } = calculateEyeAspectRatio(landmarks);

      if (!livenessPassedRef.current) {
        setScannerState("blink_required");
        setInstructionText("Por favor parpadee para confirmar asistencia");

        if (blinkStateRef.current === "OPEN") {
          if (earAvg < EAR_BLINK_THRESHOLD) {
            closedCountRef.current += 1;
            if (closedCountRef.current >= MIN_CLOSED_FRAMES) {
              blinkStateRef.current = "CLOSED";
              closedCountRef.current = 0;
            }
          }
        } else if (blinkStateRef.current === "CLOSED") {
          if (earAvg >= EAR_BLINK_THRESHOLD) {
            openCountRef.current += 1;
            if (openCountRef.current >= MIN_OPEN_FRAMES) {
              livenessPassedRef.current = true;
              blinkStateRef.current = "OPEN";
              openCountRef.current = 0;
            }
          }
        }
        return;
      }

      // 3. Comparación Biométrica con los estudiantes matriculados en la materia
      const match = matchBiometricLocal(
        embedding,
        registeredBiometrics.map((b) => ({
          embedding: b.embedding,
          id: b.id,
          student_id: b.student_id,
        })),
        0.52
      );

      if (!match) {
        setScannerState("unrecognized");
        setInstructionText("Rostro no coincide con los estudiantes de la materia");
        return;
      }

      // Estabilización: Requerir 2 lecturas consecutivas para el mismo estudiante
      if (!candidateRef.current || candidateRef.current.id !== match.student_id) {
        candidateRef.current = { count: 1, id: match.student_id };
        return;
      }

      candidateRef.current.count += 1;
      if (candidateRef.current.count < 2) {
        return;
      }

      // 4. Registro exitoso y entrada en Cooldown para el siguiente estudiante
      const student = students.find((s) => s.id === match.student_id);
      const studentName = student ? student.name : "Estudiante";

      setScannerState("matched");
      setInstructionText(`¡Asistencia registrada: ${studentName}!`);
      setLastMatch({
        score: match.confidence,
        status: "present",
        studentId: match.student_id,
        studentName,
      });

      onMatch(match.student_id);

      // Entrar en periodo de enfriamiento de 1.4s para que pase el siguiente estudiante
      inCooldownRef.current = true;
      setScannerState("cooldown");

      setTimeout(() => {
        inCooldownRef.current = false;
        resetBlinkTracker();
        setScannerState("ready");
        setInstructionText("Colóquese frente a la cámara");
      }, 1400);
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
    scanTimerRef.current = setInterval(processFrame, 140);
    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, [isCameraReady, isActive, processFrame]);

  return {
    distanceStatus,
    facingMode,
    instructionText,
    isCameraReady,
    lastMatch,
    scannerState,
    toggleFacingMode,
  };
}
