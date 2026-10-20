import { NextResponse } from 'next/server';
import { fetchMaintenanceEnabled } from '@/lib/maintenance/flag';

/** After CRON_SECRET check: skip work while maintenance is on. */
export async function cronSkipIfMaintenance(): Promise<NextResponse | null> {
  const enabled = await fetchMaintenanceEnabled();
  if (!enabled) return null;
  return NextResponse.json({ skipped: 'maintenance' });
}
