import { useState, useRef, useEffect, useCallback } from "react";
import type { StudentBiometric } from "@/types/biometrics";
import type { ClassScannerState, DistanceStatus, MatchEvent } from "./types";
import {
  detectFaceWithLandmarks,
  loadFaceApiModels,
} from "@/features/biometrics/services/faceDetector";
import { calculateEyeAspectRatio } from "@/features/biometrics/services/livenessDetector";
import { matchBiometricLocal } from "@/features/biometrics/services/biometricMatcher";

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
  const [instructionText, setInstructionText] = useState("Colóquese frente a la cámara");
  const [lastMatch, setLastMatch] = useState<MatchEvent | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [earValue, setEarValue] = useState<number>(0.3);

  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const inCooldownRef = useRef(false);

  // Detector adaptativo de parpadeo (EAR)
  const baselineEarRef = useRef<number>(0.30);
  const blinkDipDetectedRef = useRef(false);
  const blinkDipTimestampRef = useRef(0);
  const livenessPassedRef = useRef(false);

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
    blinkDipDetectedRef.current = false;
    blinkDipTimestampRef.current = 0;
    livenessPassedRef.current = false;
    candidateRef.current = null;
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
      const result = await detectFaceWithLandmarks(videoRef.current, canvasRef.current);

      if (!result) {
        setDistanceStatus("not_detected");
        setScannerState("ready");
        setInstructionText("Colóquese frente a la cámara");
        resetBlinkTracker();
        return;
      }

      const { box, embedding, landmarks } = result;
      const vHeight = videoRef.current.videoHeight || 720;

      // 1. Evaluación de distancia proporcional a la resolución de video (18% a 82%)
      const heightRatio = box.height / vHeight;

      if (heightRatio < 0.18) {
        setDistanceStatus("too_far");
        setScannerState("analyzing");
        setInstructionText("Acérquese un poco a la cámara");
        return;
      }

      if (heightRatio > 0.82) {
        setDistanceStatus("too_close");
        setScannerState("analyzing");
        setInstructionText("Aléjese un poco de la cámara");
        return;
      }

      setDistanceStatus("centered");

      // 2. Detección adaptativa de parpadeo humano (EAR)
      const { earAvg } = calculateEyeAspectRatio(landmarks);
      setEarValue(earAvg);

      // Actualizar línea base de ojos abiertos
      if (earAvg > 0.22) {
        baselineEarRef.current = baselineEarRef.current * 0.85 + earAvg * 0.15;
      }

      if (!livenessPassedRef.current) {
        setScannerState("blink_required");
        setInstructionText("Parpadee frente a la cámara");

        // Detección de caída (ojos cerrándose: < 0.25 o 24% menor a su línea base)
        const isEyeClosed = earAvg < 0.25 || earAvg < baselineEarRef.current * 0.76;

        if (isEyeClosed) {
          blinkDipDetectedRef.current = true;
          blinkDipTimestampRef.current = Date.now();
        } else if (
          blinkDipDetectedRef.current &&
          Date.now() - blinkDipTimestampRef.current < 1800 &&
          (earAvg >= 0.22 || earAvg >= baselineEarRef.current * 0.85)
        ) {
          // Re-apertura detectada tras el cierre: ¡Parpadeo válido comprobado!
          livenessPassedRef.current = true;
        }

        return;
      }

      // 3. Emparejamiento biométrico estricto (tolerancia 0.48)
      const match = matchBiometricLocal(
        embedding,
        registeredBiometrics.map((b) => ({
          embedding: b.embedding,
          id: b.id,
          student_id: b.student_id,
        })),
        0.48
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
      const student = students.find((s) => s.id === match.student_id);
      const studentName = student ? student.name : "Estudiante";
      const isAlready = alreadyRegisteredRef.current.has(match.student_id);

      if (isAlready) {
        setScannerState("already_marked");
        setInstructionText(`${studentName} ya tiene asistencia registrada`);
        setLastMatch({
          isAlreadyRegistered: true,
          score: match.confidence,
          status: "present",
          studentId: match.student_id,
          studentName,
        });
      } else {
        setScannerState("matched");
        setInstructionText(`¡Asistencia registrada: ${studentName}!`);
        setLastMatch({
          isAlreadyRegistered: false,
          score: match.confidence,
          status: "present",
          studentId: match.student_id,
          studentName,
        });

        onMatch(match.student_id);
      }

      inCooldownRef.current = true;
      setScannerState("cooldown");

      setTimeout(() => {
        inCooldownRef.current = false;
        resetBlinkTracker();
        setScannerState("ready");
        setInstructionText("Colóquese frente a la cámara");
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
    scanTimerRef.current = setInterval(processFrame, 110);
    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, [isCameraReady, isActive, processFrame]);

  return {
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
