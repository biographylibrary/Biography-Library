import { fetchWithAgentAuth } from '@/lib/auth-token';
import type { AdminBiographyAction } from '@/lib/server/admin-biography-actions';

/** Azione dello staff su una biografia, eseguita dal server (POST /api/admin/biographies/action). */
export async function runAdminBiographyAction(
  biographyId: string,
  action: AdminBiographyAction
): Promise<void> {
  const res = await fetchWithAgentAuth('/api/admin/biographies/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ biographyId, action }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || `Action failed with status ${res.status}`);
  }
}
