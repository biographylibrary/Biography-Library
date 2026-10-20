import type { SupabaseClient } from '@supabase/supabase-js';

export type MaintenanceValue = { enabled: boolean };

export type MaintenanceStatus = {
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  updatedByEmail: string | null;
  updatedByName: string | null;
};

/** Stable sentinel UUID for admin_action_log rows about site_settings. */
const SITE_SETTINGS_TARGET_ID = '00000000-0000-4000-8000-000000000001';

export async function readMaintenanceStatus(
  service: SupabaseClient
): Promise<MaintenanceStatus> {
  const { data, error } = await service
    .from('site_settings')
    .select('value, updated_at, updated_by')
    .eq('key', 'maintenance')
    .maybeSingle();

  if (error || !data) {
    return {
      enabled: false,
      updatedAt: null,
      updatedBy: null,
      updatedByEmail: null,
      updatedByName: null,
    };
  }

  const row = data as {
    value?: { enabled?: unknown };
    updated_at?: string | null;
    updated_by?: string | null;
  };

  let updatedByEmail: string | null = null;
  let updatedByName: string | null = null;
  if (row.updated_by) {
    const { data: profile } = await service
      .from('profiles')
      .select('email, name')
      .eq('id', row.updated_by)
      .maybeSingle();
    const p = profile as { email?: string | null; name?: string | null } | null;
    updatedByEmail = p?.email ?? null;
    updatedByName = p?.name ?? null;
  }

  return {
    enabled: row.value?.enabled === true,
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? null,
    updatedByEmail,
    updatedByName,
  };
}

export async function writeMaintenanceEnabled(
  service: SupabaseClient,
  enabled: boolean,
  actorUserId: string
): Promise<{ ok: true; status: MaintenanceStatus } | { ok: false; error: string }> {
  const value: MaintenanceValue = { enabled };
  const { error } = await service.from('site_settings').upsert(
    {
      key: 'maintenance',
      value,
      updated_at: new Date().toISOString(),
      updated_by: actorUserId,
    },
    { onConflict: 'key' }
  );

  if (error) {
    console.error('[maintenance] upsert failed', error);
    return { ok: false, error: 'Failed to update maintenance setting' };
  }

  await service.from('admin_action_log').insert({
    performed_by: actorUserId,
    action_type: enabled ? 'maintenance_on' : 'maintenance_off',
    target_type: 'site_settings',
    target_id: SITE_SETTINGS_TARGET_ID,
    details: { key: 'maintenance', enabled },
  });

  const status = await readMaintenanceStatus(service);
  return { ok: true, status };
}
