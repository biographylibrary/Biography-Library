import { describe, expect, it } from 'vitest';
import {
  CAP_COUNTED_PURPOSES,
  evaluateTokenCaps,
  tokenCapMessage,
  tokenCapResponseBody,
  type PeriodUsage,
  type TokenLimits,
} from '@/lib/ai/token-caps';
import { AI_PURPOSES } from '@/lib/ai/usage-recorder';

const usage: PeriodUsage = {
  daily: 100,
  weekly: 400,
  monthly: 900,
  dailyResetsAt: '2026-09-30T22:00:00.000Z',
  weeklyResetsAt: '2026-10-04T22:00:00.000Z',
  monthlyResetsAt: '2026-09-30T22:00:00.000Z',
};
const off: TokenLimits = { daily: null, weekly: null, monthly: null };

describe('evaluateTokenCaps', () => {
  it('con i tre tetti nulli non blocca mai', () => {
    expect(evaluateTokenCaps(off, { ...usage, daily: 1e12, weekly: 1e12, monthly: 1e12 })).toEqual({ allowed: true });
  });

  it('blocca quando il consumo raggiunge il tetto e lascia passare sotto', () => {
    expect(evaluateTokenCaps({ ...off, daily: 101 }, usage)).toEqual({ allowed: true });
    expect(evaluateTokenCaps({ ...off, daily: 100 }, usage)).toMatchObject({ allowed: false, period: 'day' });
  });

  it('fra più tetti superati vale quello che si riapre per ultimo', () => {
    const decision = evaluateTokenCaps({ daily: 50, weekly: 300, monthly: 800 }, usage);
    expect(decision).toMatchObject({ allowed: false, period: 'week', resetsAt: usage.weeklyResetsAt });
  });

  it('contano echo e grammar, mai screening, controllo finale, indicizzazione e memoria', () => {
    expect([...CAP_COUNTED_PURPOSES].sort()).toEqual(['echo', 'grammar']);
    for (const never of ['screening', 'preprint_check', 'embedding', 'memory_compression', 'transcription', 'tts']) {
      expect(CAP_COUNTED_PURPOSES).not.toContain(never);
    }
    for (const purpose of CAP_COUNTED_PURPOSES) expect(AI_PURPOSES).toContain(purpose);
  });
});

describe('messaggio del tetto nelle quattro lingue', () => {
  const decision = {
    allowed: false as const,
    period: 'day' as const,
    limit: 100,
    used: 100,
    resetsAt: '2026-09-30T22:00:00.000Z',
  };

  it.each([
    ['it', 'oggi', '1 ottobre 2026'],
    ['en', 'today', 'October 1, 2026'],
    ['fr', "aujourd'hui", '1 octobre 2026'],
    ['de', 'heute', '1. Oktober 2026'],
  ])('%s dice il periodo e quando si riapre (ora di Zurigo)', (lang, periodWord, datePart) => {
    const message = tokenCapMessage(decision, lang);
    expect(message).toContain(periodWord);
    expect(message).toContain(datePart);
    expect(message).toMatch(/00:00|12:00 AM/);
  });

  it('una lingua sconosciuta ricade sull\'inglese', () => {
    expect(tokenCapMessage(decision, 'pt')).toContain('reopens');
  });

  it('il corpo della risposta 429 porta codice, periodo e riapertura', () => {
    expect(tokenCapResponseBody(decision, 'it')).toMatchObject({
      error: 'token_cap_exceeded',
      period: 'day',
      resetsAt: decision.resetsAt,
      limit: 100,
      used: 100,
    });
  });
});
