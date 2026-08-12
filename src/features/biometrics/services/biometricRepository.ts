import { supabase } from '@/integrations/supabase/client';
import { StudentBiometricRecord, MatchResult } from '../types';
import { normalizeVector } from './vectorMath';

/**
 * Repositorio tipado para persistencia y consultas biométricas en Supabase PostgreSQL
 */

/**
 * Obtiene los registros biométricos de una lista de estudiantes
 */
export async function fetchStudentBiometrics(
  studentIds: string[]
): Promise<StudentBiometricRecord[]> {
  if (!studentIds || !studentIds.length) return [];

  const { data, error } = await supabase
    .from('student_biometrics')
    .select('*')
    .in('student_id', studentIds);

  if (error || !data) {
    console.error('Error al consultar biometrías de estudiantes:', error);
    return [];
  }

  return data as StudentBiometricRecord[];
}

/**
 * Guarda o actualiza el vector biométrico de un estudiante
 */
export async function upsertStudentBiometric(
  studentId: string,
  embedding: number[]
): Promise<{ success: boolean; error?: string }> {
  if (!embedding || embedding.length !== 128) {
    return { success: false, error: 'El vector facial debe contener exactamente 128 dimensiones.' };
  }

  const normalized = normalizeVector(embedding);

  const { error } = await supabase
    .from('student_biometrics')
    .upsert(
      {
        student_id: studentId,
        embedding: normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id' }
    );

  if (error) {
    console.error('Error guardando biometría de estudiante:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Elimina la huella facial biométrica de un estudiante
 */
export async function deleteStudentBiometric(
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('student_biometrics')
    .delete()
    .eq('student_id', studentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Guarda o actualiza la biometría facial de un miembro del personal (profesor, rector, contable)
 */
export async function upsertStaffBiometric(
  userId: string,
  embedding: number[],
  institutionId: string
): Promise<{ success: boolean; error?: string }> {
  if (!embedding || embedding.length !== 128) {
    return { success: false, error: 'El vector facial debe contener exactamente 128 dimensiones.' };
  }

  if (!institutionId) {
    return { success: false, error: 'La institución es obligatoria para enrolar personal.' };
  }

  const normalized = normalizeVector(embedding);
  const vectorStr = `[${normalized.join(',')}]`;

  const { error } = await supabase.rpc('upsert_staff_biometric', {
    p_user_id: userId,
    p_institution_id: institutionId,
    p_embedding: vectorStr,
  });

  if (error) {
    console.error('Error guardando biometría del personal:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Verifica si un miembro del personal posee biometría registrada
 */
export async function fetchStaffBiometricRegistered(
  userId: string
): Promise<boolean> {
  if (!userId) return false;

  const { data, error } = await supabase
    .from('staff_biometrics')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!error && data) return true;
  return false;
}

/**
 * Elimina la biometría registrada de un miembro del personal
 */
export async function deleteStaffBiometric(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: 'Identificador de usuario inválido.' };

  const { error } = await supabase
    .from('staff_biometrics')
    .delete()
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Ejecuta búsqueda biométrica sub-milisegundo en servidor PostgreSQL pgvector HNSW
 */
export async function matchStudentBiometricsRemote(
  scannedEmbedding: number[],
  studentIds?: string[],
  matchThreshold = 0.78
): Promise<MatchResult | null> {
  if (!scannedEmbedding || scannedEmbedding.length !== 128) return null;

  try {
    const vectorStr = `[${scannedEmbedding.join(',')}]`;
    const { data, error } = await supabase.rpc('match_student_biometrics', {
      query_embedding: vectorStr,
      match_threshold: matchThreshold,
      student_ids: studentIds && studentIds.length ? studentIds : null,
    });

    if (!error && data && data.length > 0) {
      const top = data[0];
      return {
        student_id: top.student_id,
        distance: top.distance,
        confidence: Math.round((top.similarity || 0.85) * 100),
        cosineSimilarity: top.similarity,
      };
    }
  } catch (e) {
    console.warn('Error en RPC match_student_biometrics de pgvector:', e);
  }

  return null;
}
