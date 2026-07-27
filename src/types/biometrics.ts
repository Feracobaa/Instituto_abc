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
}

export type CameraFacingMode = 'user' | 'environment';
