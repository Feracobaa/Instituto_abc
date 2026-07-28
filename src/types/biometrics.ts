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
  cosineSimilarity?: number;
  secondBestDistance?: number;
  marginRatio?: number; // Distancia 1 / Distancia 2 para prevenir confusiones
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
  livenessScore?: number; // 0 a 100
  alignmentAngle?: number; // Inclinación en grados
  isAligned?: boolean;
  isSpoof?: boolean; // True si detecta foto/pantalla
  isBlurred?: boolean; // True si la imagen está borrosa por movimiento
  blurScore?: number; // Varianza Laplaciana de nitidez
  boundingBox?: FaceBoundingBox;
}

