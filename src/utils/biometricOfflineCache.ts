import { StudentBiometric } from '@/types/biometrics';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DB_NAME = 'iabc_biometrics_offline_db';
const DB_VERSION = 1;
const STORE_BIOMETRICS = 'biometrics_cache';
const STORE_ATTENDANCE_QUEUE = 'attendance_queue';

export interface OfflineAttendanceRecord {
  id?: number;
  studentId: string;
  status: 'present' | 'absent' | 'justified';
  method: string;
  timestamp: string;
  gradeId: string;
  subjectId: string;
  teacherId: string;
}

/**
 * Inicializa y abre la base de datos IndexedDB local
 */
export function openBiometricsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB no soportado en este navegador'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error || new Error('Error al abrir IndexedDB biométrico'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_BIOMETRICS)) {
        db.createObjectStore(STORE_BIOMETRICS, { keyPath: 'courseKey' });
      }
      if (!db.objectStoreNames.contains(STORE_ATTENDANCE_QUEUE)) {
        db.createObjectStore(STORE_ATTENDANCE_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

/**
 * No se persisten templates faciales en el navegador. IndexedDB no protege los
 * embeddings frente a XSS ni frente a un perfil local comprometido.
 */
export async function cacheCourseBiometricsOffline(
  _courseKey: string,
  _biometrics: StudentBiometric[]
): Promise<boolean> {
  await purgeBiometricsOfflineCache();
  return false;
}

/**
 * Retira cualquier caché heredada y nunca devuelve embeddings desde el navegador.
 */
export async function getCachedCourseBiometricsOffline(
  _courseKey: string
): Promise<StudentBiometric[]> {
  await purgeBiometricsOfflineCache();
  return [];
}

/**
 * Purga completamente los templates biométricos almacenados en IndexedDB
 * (ejecutado al cerrar sesión para evitar retención en dispositivos compartidos)
 */
export async function purgeBiometricsOfflineCache(): Promise<boolean> {
  try {
    const db = await openBiometricsDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BIOMETRICS, 'readwrite');
      const store = tx.objectStore(STORE_BIOMETRICS);
      const request = store.clear();

      request.onsuccess = () => {
        console.info('Caché biométrica local purgada con éxito por seguridad.');
        resolve(true);
      };
      request.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn('Error al purgar caché biométrica local:', e);
    return false;
  }
}

/**
 * Guarda una asistencia en la cola de espera local cuando el dispositivo no tiene red
 */
export async function queueOfflineAttendanceRecord(
  record: Omit<OfflineAttendanceRecord, 'id'>
): Promise<boolean> {
  try {
    const db = await openBiometricsDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_ATTENDANCE_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_ATTENDANCE_QUEUE);
      store.add(record);

      tx.oncomplete = () => {
        toast.info('Asistencia guardada en cola local offline.');
        resolve(true);
      };
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    console.error('Error guardando en cola offline:', e);
    return false;
  }
}

/**
 * Sincroniza todas las asistencias guardadas en la cola offline hacia Supabase
 */
export async function syncOfflineAttendanceQueue(): Promise<number> {
  if (!navigator.onLine) return 0;

  try {
    const db = await openBiometricsDB();
    const records: OfflineAttendanceRecord[] = await new Promise((resolve) => {
      const tx = db.transaction(STORE_ATTENDANCE_QUEUE, 'readonly');
      const store = tx.objectStore(STORE_ATTENDANCE_QUEUE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });

    if (!records.length) return 0;

    let syncedCount = 0;
    for (const item of records) {
      const { error } = await supabase.rpc('sync_biometric_attendance_offline', {
        p_student_id: item.studentId,
        p_attendance_date: item.timestamp.split('T')[0],
        p_status: item.status,
        p_grade_id: item.gradeId,
        p_subject_id: item.subjectId,
        p_teacher_id: item.teacherId,
      });

      if (!error && item.id) {
        syncedCount++;
        // Eliminar de la cola tras sincronizar
        const txClear = db.transaction(STORE_ATTENDANCE_QUEUE, 'readwrite');
        txClear.objectStore(STORE_ATTENDANCE_QUEUE).delete(item.id);
      }
    }

    if (syncedCount > 0) {
      toast.success(`Se sincronizaron ${syncedCount} asistencias guardadas offline.`);
    }

    return syncedCount;
  } catch (e) {
    console.error('Error sincronizando cola offline:', e);
    return 0;
  }
}
