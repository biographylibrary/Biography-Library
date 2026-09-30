import type { AnyClient } from '@/lib/server/service-client';

/**
 * Limiti di frequenza del controllo grammaticale, portati dall'Edge Function
 * `ai-assistant` senza cambiare valori né finestre: 5 al minuto, 40 al giorno,
 * 200 alla settimana per utente (giorno e settimana in UTC, settimana da lunedì),
 * con gli stessi nomi di variabile. Lo staff è esente.
 */
export const GRAMMAR_RATE_LIMIT = parseInt(process.env.AI_RATE_LIMIT ?? '5');
export const GRAMMAR_DAILY_LIMIT = parseInt(process.env.AI_DAILY_LIMIT ?? '40');
export const GRAMMAR_WEEKLY_LIMIT = parseInt(process.env.AI_WEEKLY_LIMIT ?? '200');
const RATE_WINDOW_MS = 60_000;

export function nextMidnightUTC(now = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  ).toISOString();
}

export function nextMondayUTC(now = new Date()): string {
  const day = now.getUTCDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday)
  ).toISOString();
}

/** True se l'utente ha già fatto RATE_LIMIT richieste nell'ultimo minuto. */
export async function isOverMinuteLimit(service: AnyClient, userId: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { count } = await service
    .from('ai_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStart);
  return count !== null && count >= GRAMMAR_RATE_LIMIT;
}

export async function recordMinuteHit(service: AnyClient, userId: string, action: string) {
  await service.from('ai_rate_limits').insert({ user_id: userId, action });
}

export type UsageCheck =
  | { allowed: true }
  | { allowed: false; limitType: 'daily' | 'weekly'; resetAt: string };

export async function checkAndIncrementUsage(
  service: AnyClient,
  userId: string,
  cost = 1,
  now = new Date()
): Promise<UsageCheck> {
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const weekDay = now.getUTCDay();
  const daysToMonday = weekDay === 0 ? -6 : 1 - weekDay;
  const weekStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToMonday)
  );

  const { data: existing, error: fetchError } = await service
    .from('ai_usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    console.error('Usage fetch error:', fetchError);
    return { allowed: true };
  }

  let dailyCount = 0;
  let weeklyCount = 0;
  let dailyResetAt = todayStart;
  let weeklyResetAt = weekStart;

  if (existing) {
    dailyCount = existing.daily_count;
    weeklyCount = existing.weekly_count;
    dailyResetAt = new Date(existing.daily_reset_at);
    weeklyResetAt = new Date(existing.weekly_reset_at);

    if (dailyResetAt < todayStart) {
      dailyCount = 0;
      dailyResetAt = todayStart;
    }
    if (weeklyResetAt < weekStart) {
      weeklyCount = 0;
      weeklyResetAt = weekStart;
    }
  }

  if (dailyCount + cost > GRAMMAR_DAILY_LIMIT) {
    return { allowed: false, limitType: 'daily', resetAt: nextMidnightUTC(now) };
  }
  if (weeklyCount + cost > GRAMMAR_WEEKLY_LIMIT) {
    return { allowed: false, limitType: 'weekly', resetAt: nextMondayUTC(now) };
  }

  const newDaily = dailyCount + cost;
  const newWeekly = weeklyCount + cost;

  if (existing) {
    await service
      .from('ai_usage_tracking')
      .update({
        daily_count: newDaily,
        weekly_count: newWeekly,
        daily_reset_at: dailyResetAt.toISOString(),
        weekly_reset_at: weeklyResetAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  } else {
    await service.from('ai_usage_tracking').insert({
      user_id: userId,
      daily_count: newDaily,
      weekly_count: newWeekly,
      daily_reset_at: todayStart.toISOString(),
      weekly_reset_at: weekStart.toISOString(),
    });
  }

  return { allowed: true };
}
