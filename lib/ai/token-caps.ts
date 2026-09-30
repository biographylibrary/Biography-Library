import type { AnyClient } from '@/lib/server/service-client';
import type { AiPurpose } from '@/lib/ai/usage-recorder';

/**
 * Tetti in token per l'autore (giorno, settimana, mese), nel fuso Europe/Zurich.
 *
 * Contano nel tetto solo le chiamate che l'autore scatena lavorando. Screening,
 * controllo finale, indicizzazione e compressione della memoria non contano mai:
 * lo screening è un dovere dell'associazione, e un autore che ha esaurito il
 * suo tetto deve poter pubblicare comunque.
 *
 * Lo stesso elenco è il valore predefinito di public.ai_author_token_usage.
 */
export const CAP_COUNTED_PURPOSES = ['echo', 'grammar'] as const satisfies readonly AiPurpose[];

export const CAP_TIME_ZONE = 'Europe/Zurich';

export type CapPeriod = 'day' | 'week' | 'month';

export interface TokenLimits {
  daily: number | null;
  weekly: number | null;
  monthly: number | null;
}

export interface PeriodUsage {
  daily: number;
  weekly: number;
  monthly: number;
  dailyResetsAt: string;
  weeklyResetsAt: string;
  monthlyResetsAt: string;
}

export type CapDecision =
  | { allowed: true }
  | { allowed: false; period: CapPeriod; limit: number; used: number; resetsAt: string };

/** Puro: confronta consumo e tetti. Fra più tetti superati vale quello che si riapre per ultimo. */
export function evaluateTokenCaps(limits: TokenLimits, usage: PeriodUsage): CapDecision {
  const exceeded: Array<Extract<CapDecision, { allowed: false }>> = [];
  if (limits.daily != null && usage.daily >= limits.daily) {
    exceeded.push({
      allowed: false,
      period: 'day',
      limit: limits.daily,
      used: usage.daily,
      resetsAt: usage.dailyResetsAt,
    });
  }
  if (limits.weekly != null && usage.weekly >= limits.weekly) {
    exceeded.push({
      allowed: false,
      period: 'week',
      limit: limits.weekly,
      used: usage.weekly,
      resetsAt: usage.weeklyResetsAt,
    });
  }
  if (limits.monthly != null && usage.monthly >= limits.monthly) {
    exceeded.push({
      allowed: false,
      period: 'month',
      limit: limits.monthly,
      used: usage.monthly,
      resetsAt: usage.monthlyResetsAt,
    });
  }
  if (exceeded.length === 0) return { allowed: true };
  return exceeded.reduce((latest, d) =>
    new Date(d.resetsAt).getTime() > new Date(latest.resetsAt).getTime() ? d : latest
  );
}

export async function loadTokenLimits(service: AnyClient): Promise<TokenLimits> {
  const { data, error } = await service
    .from('ai_author_token_limits')
    .select('daily_tokens, weekly_tokens, monthly_tokens')
    .eq('id', true)
    .maybeSingle();
  if (error) throw error;
  const row = data as {
    daily_tokens: number | null;
    weekly_tokens: number | null;
    monthly_tokens: number | null;
  } | null;
  const num = (v: number | string | null | undefined) => (v == null ? null : Number(v));
  return {
    daily: num(row?.daily_tokens),
    weekly: num(row?.weekly_tokens),
    monthly: num(row?.monthly_tokens),
  };
}

export async function loadPeriodUsage(
  service: AnyClient,
  userId: string,
  now: Date = new Date()
): Promise<PeriodUsage> {
  const { data, error } = await service.rpc('ai_author_token_usage', {
    p_user_id: userId,
    p_now: now.toISOString(),
    p_purposes: [...CAP_COUNTED_PURPOSES],
  });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as {
    daily_tokens: number | string;
    weekly_tokens: number | string;
    monthly_tokens: number | string;
    daily_resets_at: string;
    weekly_resets_at: string;
    monthly_resets_at: string;
  };
  return {
    daily: Number(row.daily_tokens),
    weekly: Number(row.weekly_tokens),
    monthly: Number(row.monthly_tokens),
    dailyResetsAt: row.daily_resets_at,
    weeklyResetsAt: row.weekly_resets_at,
    monthlyResetsAt: row.monthly_resets_at,
  };
}

/**
 * Da chiamare prima di ogni chiamata che conta nel tetto (echo, grammar).
 * Lo staff è esente (ma le sue chiamate si registrano comunque). Se i tetti
 * sono tutti disattivati non interroga nemmeno il registro. Un guasto del
 * controllo lascia passare: il tetto è una misura di costo, non di sicurezza.
 */
export async function checkAuthorTokenCap(
  service: AnyClient,
  userId: string,
  options: { isStaff: boolean; now?: Date }
): Promise<CapDecision> {
  if (options.isStaff) return { allowed: true };
  try {
    const limits = await loadTokenLimits(service);
    if (limits.daily == null && limits.weekly == null && limits.monthly == null) {
      return { allowed: true };
    }
    const usage = await loadPeriodUsage(service, userId, options.now);
    return evaluateTokenCaps(limits, usage);
  } catch (err) {
    console.error('[token-caps] controllo del tetto non riuscito, si lascia passare:', err);
    return { allowed: true };
  }
}

type Locale = 'en' | 'it' | 'fr' | 'de';

const PERIOD_LABEL: Record<Locale, Record<CapPeriod, string>> = {
  it: { day: 'oggi', week: 'questa settimana', month: 'questo mese' },
  en: { day: 'today', week: 'this week', month: 'this month' },
  fr: { day: "aujourd'hui", week: 'cette semaine', month: 'ce mois-ci' },
  de: { day: 'heute', week: 'diese Woche', month: 'diesen Monat' },
};

function resolveLocale(raw?: string | null): Locale {
  const code = (raw ?? 'en').slice(0, 2).toLowerCase();
  return code === 'it' || code === 'fr' || code === 'de' ? code : 'en';
}

function formatReopening(resetsAt: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: CAP_TIME_ZONE,
  }).format(new Date(resetsAt));
}

export function tokenCapMessage(
  decision: Extract<CapDecision, { allowed: false }>,
  rawLocale?: string | null
): string {
  const locale = resolveLocale(rawLocale);
  const period = PERIOD_LABEL[locale][decision.period];
  const when = formatReopening(decision.resetsAt, locale);
  switch (locale) {
    case 'it':
      return `Hai raggiunto il limite di utilizzo dell'intelligenza artificiale per ${period}. Potrai riprendere il ${when} (ora di Zurigo).`;
    case 'fr':
      return `Vous avez atteint la limite d'utilisation de l'intelligence artificielle pour ${period}. Vous pourrez reprendre le ${when} (heure de Zurich).`;
    case 'de':
      return `Sie haben das Nutzungslimit der künstlichen Intelligenz für ${period} erreicht. Ab dem ${when} (Zürcher Zeit) können Sie weitermachen.`;
    default:
      return `You have reached your artificial intelligence usage limit for ${period}. It reopens on ${when} (Zurich time).`;
  }
}

/** Corpo della risposta 429 per una rotta che supera il tetto. */
export function tokenCapResponseBody(
  decision: Extract<CapDecision, { allowed: false }>,
  rawLocale?: string | null
) {
  return {
    error: 'token_cap_exceeded' as const,
    message: tokenCapMessage(decision, rawLocale),
    period: decision.period,
    resetsAt: decision.resetsAt,
    limit: decision.limit,
    used: decision.used,
  };
}
