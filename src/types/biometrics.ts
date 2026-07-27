export interface StudentBiometric {
  id: string;
  student_id: string;
  embedding: number[];
  created_at: string;
  updated_at: string;
}

export interface MatchResult {
  student_id: string;
  distance: number;
  confidence: number;
  secondBestDistance?: number;
  marginRatio?: number; // Distancia 1 / Distancia 2 para prevenir confusiones
}

export type CameraFacingMode = 'user' | 'environment';

export type ScannerState = 'ready' | 'analyzing' | 'cooldown_success' | 'cooldown_error';

export interface ImageQualityMetrics {
  luminance: number; // 0 a 255
  isLowLight: boolean;
  isOverExposed: boolean;
}

