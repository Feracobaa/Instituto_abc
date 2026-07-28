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
 * Almacena las huellas biométricas de un curso en IndexedDB para funcionamiento Offline
 */
export async function cacheCourseBiometricsOffline(
  courseKey: string,
  biometrics: StudentBiometric[]
): Promise<boolean> {
  try {
    const db = await openBiometricsDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BIOMETRICS, 'readwrite');
      const store = tx.objectStore(STORE_BIOMETRICS);
      store.put({
        courseKey,
        biometrics,
        updatedAt: new Date().toISOString(),
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn('Error al guardar caché biométrica local:', e);
    return false;
  }
}

/**
 * Recupera las huellas biométricas de un curso guardadas localmente en IndexedDB
 */
export async function getCachedCourseBiometricsOffline(
  courseKey: string
): Promise<StudentBiometric[]> {
  try {
    const db = await openBiometricsDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BIOMETRICS, 'readonly');
      const store = tx.objectStore(STORE_BIOMETRICS);
      const request = store.get(courseKey);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result && result.biometrics ? result.biometrics : []);
      };

      request.onerror = () => resolve([]);
    });
  } catch (e) {
    console.warn('Error recuperando caché biométrica local:', e);
    return [];
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
      const { error } = await supabase
        .from('student_attendance')
        .upsert(
          {
            student_id: item.studentId,
            attendance_date: item.timestamp.split('T')[0],
            status: item.status,
            capture_method: item.method,
            liveness_verified: true,
          } as any,
          { onConflict: 'student_id,attendance_date' }
        );

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
