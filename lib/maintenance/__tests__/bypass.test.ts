import { afterEach, describe, expect, it } from 'vitest';
import {
  createMaintenanceBypassValue,
  verifyMaintenanceBypassValue,
} from '@/lib/maintenance/bypass';

describe('maintenance bypass cookie', () => {
  const prev = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    if (prev === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prev;
  });

  it('round-trips a valid signature', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-signing-secret';
    const now = 1_700_000_000;
    const value = await createMaintenanceBypassValue('user-1', now);
    expect(value).toBeTruthy();
    await expect(verifyMaintenanceBypassValue(value, now + 10)).resolves.toEqual({
      userId: 'user-1',
    });
  });

  it('rejects expired and tampered values', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-signing-secret';
    const now = 1_700_000_000;
    const value = await createMaintenanceBypassValue('user-1', now);
    await expect(verifyMaintenanceBypassValue(value, now + 13 * 60 * 60)).resolves.toBeNull();
    await expect(verifyMaintenanceBypassValue(value + 'x', now)).resolves.toBeNull();
    await expect(verifyMaintenanceBypassValue('a.b.c', now)).resolves.toBeNull();
  });
});
