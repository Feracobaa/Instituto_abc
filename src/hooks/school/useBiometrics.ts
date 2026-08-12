import { useState, useCallback } from 'react';
import { StudentBiometric, MatchResult } from '@/types/biometrics';
import {
  cacheCourseBiometricsOffline,
  getCachedCourseBiometricsOffline,
} from '@/utils/biometricOfflineCache';
import { toast } from 'sonner';

// Re-exportación modular de servicios de biometría para compatibilidad hacia atrás
export {
  normalizeVector,
  calculateEuclideanDistance,
  calculateCosineSimilarity,
  computeCentroidEmbedding,
} from '@/features/biometrics/services/vectorMath';

export {
  applyYuvClaheEqualization,
  calculateLaplacianBlurScore,
  analyzeImageQuality,
  verifyHumanFacePresence,
  alignFaceFrame,
  detectFaceBoundingBox,
} from '@/features/biometrics/services/imageQuality';

export {
  loadFaceApiModels,
  extractEmbeddingFromVideo,
} from '@/features/biometrics/services/faceDetector';

export { matchBiometricLocal as matchBiometric } from '@/features/biometrics/services/biometricMatcher';

import {
  fetchStudentBiometrics,
  upsertStudentBiometric,
  deleteStudentBiometric as removeStudentBiometric,
  upsertStaffBiometric,
  fetchStaffBiometricRegistered,
  deleteStaffBiometric as removeStaffBiometric,
  matchStudentBiometricsRemote,
} from '@/features/biometrics/services/biometricRepository';

import { matchBiometricLocal } from '@/features/biometrics/services/biometricMatcher';

/**
 * Hook de Fachada (Facade Hook) para orquestar operaciones biométricas en componentes React
 */
export function useBiometrics() {
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Obtiene los vectores biométricos de una lista de estudiantes con caché local IndexedDB
   */
  const getBiometricsForStudents = useCallback(
    async (studentIds: string[]): Promise<StudentBiometric[]> => {
      if (!studentIds.length) return [];
      setLoading(true);
      const courseKey = studentIds.slice(0, 5).sort().join('_');

      try {
        if (navigator.onLine) {
          const list = await fetchStudentBiometrics(studentIds);
          if (list.length > 0) {
            cacheCourseBiometricsOffline(courseKey, list);
            return list;
          }
        }

        // Fallback a caché local IndexedDB en modo Offline
        const offlineCached = await getCachedCourseBiometricsOffline(courseKey);
        if (offlineCached.length) {
          toast.info('Modo Offline: Utilizando biometría guardada localmente.');
        }
        return offlineCached;
      } catch (err) {
        console.error('Error inesperado en biometría:', err);
        return await getCachedCourseBiometricsOffline(courseKey);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Guarda o actualiza el vector biométrico de un estudiante
   */
  const saveStudentBiometric = useCallback(
    async (studentId: string, embedding: number[]): Promise<boolean> => {
      setLoading(true);
      try {
        const { success, error } = await upsertStudentBiometric(studentId, embedding);
        if (!success) {
          toast.error(`Error al guardar huella facial: ${error || 'Error desconocido'}`);
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
    },
    []
  );

  /**
   * Guarda o actualiza la biometría facial de un miembro del personal (profesor, rector, contable)
   */
  const saveStaffBiometric = useCallback(
    async (userId: string, embedding: number[], institutionId: string): Promise<boolean> => {
      setLoading(true);
      try {
        const { success, error } = await upsertStaffBiometric(userId, embedding, institutionId);
        if (!success) {
          toast.error(`Error al guardar biometría del personal: ${error || 'Error desconocido'}`);
          return false;
        }

        toast.success('Rostro del docente registrado correctamente.');
        return true;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Desconocido';
        toast.error(`Error inesperado: ${errorMessage}`);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Obtiene la información biométrica del personal por user_id
   */
  const getStaffBiometric = useCallback(async (userId: string): Promise<boolean> => {
    return await fetchStaffBiometricRegistered(userId);
  }, []);

  /**
   * Elimina la huella facial biométrica de un miembro del personal
   */
  const deleteStaffBiometric = useCallback(
    async (userId: string): Promise<boolean> => {
      setLoading(true);
      try {
        const { success, error } = await removeStaffBiometric(userId);
        if (!success) {
          toast.error(`Error al eliminar biometría: ${error || 'Error desconocido'}`);
          return false;
        }

        toast.success('Huella facial del docente eliminada correctamente.');
        return true;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Desconocido';
        toast.error(`Error inesperado: ${errorMessage}`);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Elimina la huella facial registrada de un estudiante
   */
  const deleteStudentBiometric = useCallback(
    async (studentId: string): Promise<boolean> => {
      setLoading(true);
      try {
        const { success, error } = await removeStudentBiometric(studentId);
        if (!success) {
          toast.error(`Error al eliminar huella facial: ${error || 'Error desconocido'}`);
          return false;
        }

        toast.success('Huella facial eliminada correctamente.');
        return true;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Desconocido';
        toast.error(`Error inesperado: ${errorMessage}`);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Ejecuta la búsqueda biométrica sub-milisegundo en el servidor PostgreSQL Supabase
   * utilizando el índice HNSW y pgvector (con fallback automático a motor local).
   */
  const matchBiometricRemote = useCallback(
    async (
      scannedEmbedding: number[],
      registeredBiometrics: StudentBiometric[],
      studentIds?: string[],
      tolerance = 0.52
    ): Promise<MatchResult | null> => {
      const remoteResult = await matchStudentBiometricsRemote(
        scannedEmbedding,
        studentIds,
        0.78
      );

      if (remoteResult) {
        return remoteResult;
      }

      return matchBiometricLocal(scannedEmbedding, registeredBiometrics, tolerance);
    },
    []
  );

  return {
    loading,
    getBiometricsForStudents,
    saveStudentBiometric,
    deleteStudentBiometric,
    saveStaffBiometric,
    getStaffBiometric,
    deleteStaffBiometric,
    matchBiometric: matchBiometricLocal,
    matchBiometricRemote,
  };
}
