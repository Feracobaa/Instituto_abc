export interface StudentBiometricRecord {
  id: string;
  student_id: string;
  embedding: number[];
  vec_embedding?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffBiometricRecord {
  id: string;
  user_id: string;
  institution_id?: string | null;
  vec_embedding: string;
  created_at: string;
  updated_at: string;
}

export interface MatchResult {
  student_id: string;
  distance: number;
  confidence: number;
  cosineSimilarity?: number;
  secondBestDistance?: number;
  marginRatio?: number; // Lowe's ratio: d1 / d2 para prevenir confusiones
}

export type CameraFacingMode = 'user' | 'environment';

export type ScannerState = 'ready' | 'analyzing' | 'cooldown_success' | 'cooldown_error';

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageQualityMetrics {
  luminance: number; // 0 a 255
  isLowLight: boolean;
  isOverExposed: boolean;
  livenessScore: number; // 0 a 100
  alignmentAngle?: number; // Inclinación en grados
  isAligned?: boolean;
  isSpoof?: boolean; // True si detecta patrón Moiré de pantalla/foto
  isBlurred?: boolean; // True si la imagen está borrosa por movimiento
  blurScore?: number; // Varianza Laplaciana de nitidez
  boundingBox?: FaceBoundingBox;
}

export interface ExtractedBiometricSample {
  embedding: number[];
  quality: ImageQualityMetrics;
}

export type LivenessChallengeType = 'blink' | 'turn_left' | 'turn_right' | 'smile';

export type LivenessStatus = 'idle' | 'in_progress' | 'passed' | 'failed' | 'timeout';

export interface LivenessChallenge {
  type: LivenessChallengeType;
  prompt: string;
  subPrompt?: string;
  durationMs: number;
}

export interface LivenessEvaluationResult {
  status: LivenessStatus;
  progress: number; // 0 a 100
  activeChallenge: LivenessChallenge | null;
  message: string;
  metrics: {
    ear: number; // Eye Aspect Ratio
    yawRatio: number; // Head rotation
    mar: number; // Mouth Aspect Ratio
  };
}

export type EnrollmentStep = 'frontal' | 'left' | 'right' | 'complete' | 'failed';

export interface EnrollmentSampleInfo {
  embedding: number[];
  step: 'frontal' | 'left' | 'right';
  quality: ImageQualityMetrics;
  yawRatio: number;
}


