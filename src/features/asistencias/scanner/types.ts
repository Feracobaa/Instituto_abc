import type { AttendanceStatus } from "@/hooks/school/types";

export type ClassScannerState =
  | "ready"           // Esperando a que un estudiante se acerque
  | "analyzing"       // Rostro detectado, validando distancia y posición
  | "blink_required"  // Rostro centrado, exigiendo parpadeo activo (EAR)
  | "matched"         // Reconocido con éxito por primera vez
  | "already_marked"  // Reconocido pero ya tenía asistencia previa
  | "cooldown"        // Breve pausa para dar paso al siguiente estudiante
  | "unrecognized"    // Rostro detectado pero no pertenece a la clase
  | "error";

export type BlinkPhase = "idle" | "waiting" | "closing_detected" | "passed";

export type DistanceStatus = "too_far" | "too_close" | "centered" | "not_detected";

export interface ClassStudentItem {
  hasBiometrics: boolean;
  id: string;
  markedAt?: string;
  name: string;
  status?: AttendanceStatus | "";
}

export interface MatchEvent {
  isAlreadyRegistered?: boolean;
  score: number;
  status: AttendanceStatus;
  studentId: string;
  studentName: string;
}

export interface ScannerMetrics {
  ear: number;
  faceWidth: number;
  fps: number;
  livenessVerified: boolean;
}
