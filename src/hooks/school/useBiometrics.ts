import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StudentBiometric, MatchResult } from '@/types/biometrics';
import { toast } from 'sonner';

export function calculateEuclideanDistance(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function useBiometrics() {
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Obtiene los vectores biométricos de una lista de estudiantes
   */
  const getBiometricsForStudents = useCallback(async (studentIds: string[]): Promise<StudentBiometric[]> => {
    if (!studentIds.length) return [];
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_biometrics')
        .select('*')
        .in('student_id', studentIds);

      if (error) {
        console.error('Error cargando biometría:', error);
        return [];
      }
      return (data || []) as StudentBiometric[];
    } catch (err) {
      console.error('Error inesperado en biometría:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Guarda o actualiza el vector biométrico de un estudiante
   */
  const saveStudentBiometric = useCallback(async (studentId: string, embedding: number[]): Promise<boolean> => {
    if (embedding.length !== 128) {
      toast.error('El vector facial debe contener exactamente 128 valores.');
      return false;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('student_biometrics')
        .upsert(
          {
            student_id: studentId,
            embedding,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'student_id' }
        );

      if (error) {
        console.error('Error al guardar biometría:', error);
        toast.error(`Error al guardar huella facial: ${error.message}`);
        return false;
      }

      toast.success('Huella facial registrada correctamente.');
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Desconocido';
      toast.error(`Error inesperado: ${errorMessage}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Encuentra el estudiante con mayor similitud a partir de un vector escaneado
   */
  const matchBiometric = useCallback((
    scannedEmbedding: number[],
    registeredBiometrics: StudentBiometric[],
    tolerance = 0.50
  ): MatchResult | null => {
    if (!registeredBiometrics.length || scannedEmbedding.length !== 128) return null;

    let bestMatch: MatchResult | null = null;
    let minDistance = Infinity;

    for (const bio of registeredBiometrics) {
      const dist = calculateEuclideanDistance(scannedEmbedding, bio.embedding);
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = {
          student_id: bio.student_id,
          distance: dist,
          confidence: Math.max(0, Math.round((1 - dist) * 100)),
        };
      }
    }

    if (bestMatch && minDistance <= tolerance) {
      return bestMatch;
    }

    return null;
  }, []);

  return {
    loading,
    getBiometricsForStudents,
    saveStudentBiometric,
    matchBiometric,
  };
}
