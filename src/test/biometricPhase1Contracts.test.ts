import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc },
}));

import {
  matchStudentBiometricsRemote,
  upsertStaffBiometric,
} from '@/features/biometrics/services/biometricRepository';
import {
  syncOfflineAttendanceQueue,
} from '@/utils/biometricOfflineCache';

describe('Fase 1 — contratos cliente/backend biométricos', () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: 'record-id', error: null });
  });

  it('no permite enrolar personal sin institution_id', async () => {
    const result = await upsertStaffBiometric('staff-id', Array(128).fill(1), '');

    expect(result.success).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('enrola personal solamente a través de la RPC autorizada con institution_id explícita', async () => {
    const result = await upsertStaffBiometric('staff-id', Array(128).fill(1), 'institution-id');

    expect(result.success).toBe(true);
    expect(rpc).toHaveBeenCalledWith('upsert_staff_biometric', expect.objectContaining({
      p_user_id: 'staff-id',
      p_institution_id: 'institution-id',
      p_embedding: expect.any(String),
    }));
  });

  it('declara el contrato offline sin liveness_verified controlable por cliente', () => {
    const source = syncOfflineAttendanceQueue.toString();

    expect(source).toContain("sync_biometric_attendance_offline");
    expect(source).toContain("item.method === 'facial_mobile'");
    expect(source).not.toContain('liveness_verified: true');
    expect(source).not.toContain('liveness_status:');
  });

  it('no invoca matching biométrico remoto mientras PAD no sea verificable en servidor', async () => {
    const result = await matchStudentBiometricsRemote(Array(128).fill(0), ['student-id']);

    expect(result).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
});
