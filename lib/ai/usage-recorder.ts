import { buildServiceClient } from '@/lib/server/service-client';

/**
 * Scopi della tabella ai_token_usage. `platform_guide` non esiste: la guida alla
 * piattaforma è Echo con la base di conoscenza e si registra come `echo`.
 */
export const AI_PURPOSES = [
  'echo',
  'grammar',
  'preprint_check',
  'screening',
  'embedding',
  'memory_compression',
  'transcription',
  'tts',
] as const;

export type AiPurpose = (typeof AI_PURPOSES)[number];

/** Chi chiama e perché: obbligatorio per ogni chiamata a un modello. */
export interface AiUsageContext {
  purpose: AiPurpose;
  userId?: string | null;
  biographyId?: string | null;
}

export interface AiUsageRecord extends AiUsageContext {
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  /** True quando il fornitore non ha restituito `usage` e il valore è una stima. */
  estimated?: boolean;
  /** Per trascrizione e sintesi vocale: l'unità del fornitore, senza conversioni. */
  usageUnit?: 'seconds' | 'characters' | 'bytes' | null;
  usageUnits?: number | null;
  ok?: boolean;
}

export type UsageSink = (record: AiUsageRecord) => Promise<void>;

const dbSink: UsageSink = async (r) => {
  const service = buildServiceClient();
  const { error } = await service.from('ai_token_usage').insert({
    user_id: r.userId ?? null,
    biography_id: r.biographyId ?? null,
    purpose: r.purpose,
    model: r.model ?? null,
    prompt_tokens: r.promptTokens ?? null,
    completion_tokens: r.completionTokens ?? null,
    total_tokens: r.totalTokens ?? null,
    estimated: r.estimated ?? false,
    usage_unit: r.usageUnit ?? null,
    usage_units: r.usageUnits ?? null,
    ok: r.ok ?? true,
  });
  if (error) throw error;
};

let sink: UsageSink = dbSink;

/** Per prove e script manuali: sostituisce la destinazione (`null` = quella vera). */
export function setUsageSink(next: UsageSink | null): void {
  sink = next ?? dbSink;
}

/**
 * Registra una riga di consumo. Non lancia mai: un guasto del registro non deve
 * rompere la risposta all'autore.
 */
export async function recordAiUsage(record: AiUsageRecord): Promise<void> {
  try {
    await sink(record);
  } catch (err) {
    console.error('[ai-usage] registrazione non riuscita:', err);
  }
}

/** Stima di ripiego: un token ogni quattro caratteri. */
export function estimateTokens(chars: number): number {
  return Math.max(0, Math.ceil(chars / 4));
}
