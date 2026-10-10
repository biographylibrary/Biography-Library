import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getAuthenticatedUser = vi.fn();
const chat = vi.fn();
const isOverMinuteLimit = vi.fn();
const recordMinuteHit = vi.fn();
const checkAndIncrementUsage = vi.fn();
const checkAuthorTokenCap = vi.fn();

const tables: Record<string, Record<string, unknown> | null> = {};

vi.mock('@/lib/server/onboarding-api-auth', () => ({
  getAuthenticatedUser: (req: unknown) => getAuthenticatedUser(req),
}));

vi.mock('@/lib/server/service-client', () => ({
  buildServiceClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: tables[table] ?? null, error: null }) }),
      }),
    }),
  }),
}));

vi.mock('@/lib/server/biography-view-access', () => ({
  resolveBiographyId: async (_c: unknown, id: string) => id,
}));

vi.mock('@/lib/agents/infomaniak-client', () => ({
  chat: (opts: unknown) => chat(opts),
}));

vi.mock('@/lib/ai/grammar-limits', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/grammar-limits')>();
  return {
    ...actual,
    isOverMinuteLimit: (...a: unknown[]) => isOverMinuteLimit(...a),
    recordMinuteHit: (...a: unknown[]) => recordMinuteHit(...a),
    checkAndIncrementUsage: (...a: unknown[]) => checkAndIncrementUsage(...a),
  };
});

vi.mock('@/lib/ai/token-caps', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/token-caps')>();
  return { ...actual, checkAuthorTokenCap: (...a: unknown[]) => checkAuthorTokenCap(...a) };
});

import { POST } from '@/app/api/biography/[id]/grammar/route';
import { GRAMMAR_MAX_CHARS } from '@/lib/ai/grammar';

const BIO_ID = 'bio-1';

function request(body: unknown) {
  return new NextRequest(`http://localhost/api/biography/${BIO_ID}/grammar`, {
    method: 'POST',
    headers: { authorization: 'Bearer jwt', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const call = (body: unknown) => POST(request(body), { params: { id: BIO_ID } });

const validBody = { content: '<p>Ciao a tutti, questo è il mio testo.</p>', sectionTitle: 'Infanzia', language: 'it' };

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedUser.mockResolvedValue({ user: { id: 'owner-1' } });
  tables.profiles = { role: 'user', account_status: 'active' };
  tables.biographies = { user_id: 'owner-1', is_frozen: false };
  isOverMinuteLimit.mockResolvedValue(false);
  checkAuthorTokenCap.mockResolvedValue({ allowed: true });
  checkAndIncrementUsage.mockResolvedValue({ allowed: true });
  chat.mockResolvedValue({
    content: JSON.stringify([
      { id: '1', original: 'questo è', suggestion: 'questo e', explanation: 'x' },
      { id: '2', original: 'uguale', suggestion: 'uguale  ', explanation: 'identico: da scartare' },
    ]),
    modelUsed: 'swiss-ai/Apertus-v1.5-70B',
  });
});

describe('POST /api/biography/[id]/grammar: chi può entrare', () => {
  it('rifiuta chi non è autenticato', async () => {
    getAuthenticatedUser.mockResolvedValue({ error: 'Authentication required', status: 401 });
    const res = await call(validBody);
    expect(res.status).toBe(401);
    expect(chat).not.toHaveBeenCalled();
  });

  it('rifiuta chi non è proprietario della biografia', async () => {
    tables.biographies = { user_id: 'someone-else', is_frozen: false };
    const res = await call(validBody);
    expect(res.status).toBe(403);
    expect(chat).not.toHaveBeenCalled();
  });

  it('rifiuta un account ancora in lista d\'attesa', async () => {
    tables.profiles = { role: 'user', account_status: 'waitlist' };
    const res = await call(validBody);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('account_not_active');
    expect(chat).not.toHaveBeenCalled();
  });

  it('rifiuta una biografia congelata', async () => {
    tables.biographies = { user_id: 'owner-1', is_frozen: true };
    const res = await call(validBody);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('biography_frozen');
  });

  it('lo staff entra anche su una biografia altrui, con le stesse regole della policy RLS', async () => {
    tables.profiles = { role: 'reviewer', account_status: 'active' };
    tables.biographies = { user_id: 'someone-else', is_frozen: true };
    const res = await call(validBody);
    expect(res.status).toBe(200);
  });

  it('404 se la biografia non esiste', async () => {
    tables.biographies = null;
    const res = await call(validBody);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/biography/[id]/grammar: lunghezza del testo', () => {
  it.each([
    ['it', 'più breve'],
    ['en', 'shorter part'],
    ['fr', 'plus courte'],
    ['de', 'kürzeren'],
  ])('oltre il tetto risponde 413 nella lingua %s senza chiamare il modello', async (lang, fragment) => {
    const res = await call({
      content: 'a'.repeat(GRAMMAR_MAX_CHARS + 1),
      sectionTitle: 'Infanzia',
      language: lang,
    });
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toBe('text_too_long');
    expect(body.message).toContain(fragment);
    expect(body.maxChars).toBe(GRAMMAR_MAX_CHARS);
    expect(chat).not.toHaveBeenCalled();
    expect(checkAndIncrementUsage).not.toHaveBeenCalled();
  });

  it('il tetto si misura dopo aver tolto l\'HTML: il markup non conta', async () => {
    const res = await call({
      content: `<p>${'a'.repeat(GRAMMAR_MAX_CHARS)}</p>`.replace(/<p>/, '<p class="x">'),
      sectionTitle: 'Infanzia',
    });
    expect(res.status).toBe(200);
  });

  it('un testo esattamente al tetto passa intero, senza troncamento silenzioso', async () => {
    const res = await call({ content: 'b'.repeat(GRAMMAR_MAX_CHARS), sectionTitle: 'Infanzia' });
    expect(res.status).toBe(200);
    const sent = chat.mock.calls[0][0].messages[1].content as string;
    expect(sent).toContain('b'.repeat(GRAMMAR_MAX_CHARS));
  });

  it('senza testo o titolo risponde 400', async () => {
    expect((await call({ content: '', sectionTitle: 'x' })).status).toBe(400);
    expect((await call({ content: 'x', sectionTitle: '' })).status).toBe(400);
  });
});

describe('POST /api/biography/[id]/grammar: lingua', () => {
  it('422 language_not_supported se la lingua del testo non è tra le quattro', async () => {
    const res = await call({ ...validBody, language: 'pt-BR' });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: 'language_not_supported' });
    expect(chat).not.toHaveBeenCalled();
  });

  it('accetta un tag con regione delle quattro lingue e usa uiLanguage per i messaggi', async () => {
    checkAuthorTokenCap.mockResolvedValue({
      allowed: false,
      period: 'week',
      limit: 1000,
      used: 1200,
      resetsAt: '2026-10-04T22:00:00.000Z',
    });
    const res = await call({
      ...validBody,
      language: 'de-CH',
      uiLanguage: 'it',
    });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.message).toContain('questa settimana');
    expect(chat).not.toHaveBeenCalled();
  });

  it('senza language resta il predefinito en e la chiamata procede', async () => {
    const { language: _omit, ...rest } = validBody;
    const res = await call(rest);
    expect(res.status).toBe(200);
    expect(chat).toHaveBeenCalled();
  });
});

describe('POST /api/biography/[id]/grammar: modelli, parametri, limiti', () => {
  it('chiama Apertus per primo, poi Gemma e Mistral, con i parametri di sempre e scopo grammar', async () => {
    const res = await call(validBody);
    expect(res.status).toBe(200);
    const opts = chat.mock.calls[0][0];
    expect(opts.models).toEqual([
      'swiss-ai/Apertus-v1.5-70B',
      'google/gemma-4-31B-it',
      'mistralai/Mistral-Small-4-119B-2603',
    ]);
    expect(opts).toMatchObject({
      max_tokens: 2048,
      temperature: 0.7,
      timeoutMs: 45_000,
      retry: { attempts: 3, baseDelayMs: 500 },
      stopOnClientError: true,
      usage: { purpose: 'grammar', userId: 'owner-1', biographyId: BIO_ID },
    });
  });

  it('scarta i suggerimenti identici al testo originale e restituisce il modello usato', async () => {
    const body = await (await call(validBody)).json();
    expect(body.action).toBe('grammar');
    expect(body.model_used).toBe('swiss-ai/Apertus-v1.5-70B');
    expect(body.data).toHaveLength(1);
    expect(body.data[0].original).toBe('questo è');
  });

  it('applica il limite di frequenza al minuto (5) prima di spendere token', async () => {
    isOverMinuteLimit.mockResolvedValue(true);
    const res = await call(validBody);
    expect(res.status).toBe(429);
    expect(chat).not.toHaveBeenCalled();
    expect(checkAndIncrementUsage).not.toHaveBeenCalled();
  });

  it('applica i limiti giornaliero (40) e settimanale (200) con lo stesso formato di risposta', async () => {
    checkAndIncrementUsage.mockResolvedValue({ allowed: false, limitType: 'daily', resetAt: '2026-10-01T00:00:00.000Z' });
    const res = await call(validBody);
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({
      limitType: 'daily',
      resetAt: '2026-10-01T00:00:00.000Z',
      dailyLimit: 40,
      weeklyLimit: 200,
    });
    expect(chat).not.toHaveBeenCalled();
  });

  it('quando il tetto in token è superato risponde 429 con messaggio e data di riapertura nella lingua dell\'autore', async () => {
    checkAuthorTokenCap.mockResolvedValue({
      allowed: false,
      period: 'week',
      limit: 1000,
      used: 1200,
      resetsAt: '2026-10-04T22:00:00.000Z',
    });
    const res = await call({ ...validBody, language: 'it' });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('token_cap_exceeded');
    expect(body.period).toBe('week');
    expect(body.message).toContain('questa settimana');
    expect(body.message).toContain('2026');
    expect(chat).not.toHaveBeenCalled();
    expect(checkAndIncrementUsage).not.toHaveBeenCalled();
  });

  it('lo staff salta i limiti ma la chiamata viene registrata con scopo grammar', async () => {
    tables.profiles = { role: 'admin', account_status: 'active' };
    isOverMinuteLimit.mockResolvedValue(true);
    checkAndIncrementUsage.mockResolvedValue({ allowed: false, limitType: 'daily', resetAt: 'x' });
    const res = await call(validBody);
    expect(res.status).toBe(200);
    expect(chat.mock.calls[0][0].usage.purpose).toBe('grammar');
  });

  it('se tutti i modelli falliscono risponde 502 senza dettagli interni', async () => {
    chat.mockRejectedValue(new Error('AI HTTP 500: secret details'));
    const res = await call(validBody);
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('secret');
  });

  it('risposta del modello non valida: 502', async () => {
    chat.mockResolvedValue({ content: 'non è json', modelUsed: 'm' });
    const res = await call(validBody);
    expect(res.status).toBe(502);
  });
});
