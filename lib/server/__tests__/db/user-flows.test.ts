import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  REOPEN_SECTION_PAYLOAD,
  buildEditorSavePayload,
  buildFinalVersionPayload,
  buildLicenseChoicePayload,
  buildMarkCompletePayload,
  buildMediaInsertPayload,
  buildShareTokenPayload,
} from '@/lib/editor/write-payloads';
import { buildOnboardingUpdates } from '@/lib/onboarding/build-updates';
import type { OnboardingPatchBody, OnboardingProfileState } from '@/lib/onboarding/types';
import { buildBiographyInsertPayload } from '@/lib/server/biography-create-payload';
import { BIO, U, as, createTestDb, errorOf, reseed } from './harness';

/**
 * Prove positive: con i trigger di produzione e il guard caricati, l'applicazione
 * continua a funzionare. Ogni scrittura usa il payload che costruisce oggi il
 * codice dell'applicazione (le stesse funzioni che usano rotte e componenti), con
 * il ruolo con cui gira davvero: la sessione dell'autore (authenticated) o il
 * servizio (service_role) dove la rotta scrive col servizio.
 */
let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
}, 60_000);

afterAll(async () => {
  await db.close();
});

beforeEach(async () => {
  await reseed(db);
});

const JSONB_KEYS = new Set(['content', 'narrative_order', 'draft_ai_feedback']);

function bind(values: Record<string, unknown>, offset: number) {
  const keys = Object.keys(values);
  const params = keys.map((k) => {
    const v = values[k];
    return v !== null && typeof v === 'object' && JSONB_KEYS.has(k) ? JSON.stringify(v) : v;
  });
  return { keys, params, cast: (k: string) => (JSONB_KEYS.has(k) ? '::jsonb' : ''), offset };
}

async function update(
  role: 'authenticated' | 'service_role',
  userId: string | null,
  table: string,
  id: string,
  values: Record<string, unknown>
) {
  const b = bind(values, 2);
  if (b.keys.length === 0) return [];
  const set = b.keys.map((k, i) => `${k} = $${i + 2}${b.cast(k)}`).join(', ');
  return as<Record<string, unknown>>(db, role, userId, `update public.${table} set ${set} where id = $1 returning *`, [id, ...b.params]);
}

async function insert(
  role: 'authenticated' | 'service_role',
  userId: string | null,
  table: string,
  values: Record<string, unknown>
) {
  const b = bind(values, 1);
  const cols = b.keys.join(', ');
  const ph = b.keys.map((k, i) => `$${i + 1}${b.cast(k)}`).join(', ');
  return as<Record<string, unknown>>(db, role, userId, `insert into public.${table} (${cols}) values (${ph}) returning *`, b.params);
}

async function profileOf(id: string) {
  const [row] = await as<Record<string, unknown>>(db, 'postgres', null, `select * from public.profiles where id = $1`, [id]);
  return row;
}

async function bioOf(id: string) {
  const [row] = await as<Record<string, unknown>>(db, 'postgres', null, `select * from public.biographies where id = $1`, [id]);
  return row;
}

describe('un nuovo utente: registrazione e onboarding, dichiarazione legale compresa', () => {
  const NEW = '00000000-0000-0000-0000-00000000f001';

  it('percorre la sequenza che manda oggi l\'interfaccia, fino alla biografia creata nel wizard', async () => {
    // 1. signUp: GoTrue inserisce in auth.users con i metadati; il trigger crea il profilo.
    await as(db, 'postgres', null, `insert into auth.users (id, email, raw_user_meta_data) values ($1, 'nuovo@test', $2::jsonb)`, [
      NEW,
      JSON.stringify({ name: 'Anna', language: 'it' }),
    ]);
    let profile = await profileOf(NEW);
    expect(profile).toMatchObject({ email: 'nuovo@test', name: 'Anna', language: 'it', role: 'user', account_status: 'waitlist' });
    expect(profile.language_confirmed_at).toBeTruthy();

    // 2. L'associazione concede l'accesso (rotta admin, servizio).
    await update('service_role', null, 'profiles', NEW, { account_status: 'active', waitlist_granted_at: new Date().toISOString() });

    // 3. Il wizard: ogni PATCH /api/onboarding calcola `updates` e scrive il servizio.
    const steps: OnboardingPatchBody[] = [
      { action: 'confirm_language', language: 'it' },
      { action: 'advance_wizard', wizardStep: 'biography_type', biographyType: 'autobiography' },
      { action: 'advance_wizard', wizardStep: 'legal', biographyType: 'autobiography' },
    ];
    const now = '2026-09-30T10:00:00.000Z';
    for (const body of steps) {
      const state = (await profileOf(NEW)) as unknown as OnboardingProfileState;
      const built = buildOnboardingUpdates(state, body, now);
      expect(built.ok).toBe(true);
      if (!built.ok) return;
      await update('service_role', null, 'profiles', NEW, built.updates);
    }
    profile = await profileOf(NEW);
    expect(profile.legal_declaration_type).toBe('autobiography');
    expect(new Date(profile.legal_declaration_accepted_at as string).toISOString()).toBe(now);
    expect(profile.legal_declaration_version).toBe('2026-06');
    expect(profile.onboarding_wizard_step).toBe('details');

    // 4. finishCreate: POST /api/biography/create (sessione dell'utente) poi complete_wizard.
    const created = buildBiographyInsertPayload(
      NEW,
      { title: 'La mia vita', visibility: 'private', biographyMode: 'sections', authorName: 'Anna', biographyType: 'autobiography', contentLanguage: 'it' },
      now
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const [bio] = await insert('authenticated', NEW, 'biographies', created.payload);
    expect(bio).toMatchObject({ status: 'draft', ai_screening_status: 'pending', is_pioneer: true });
    expect(bio.slug).toBe('la-mia-vita');

    const done = buildOnboardingUpdates(
      (await profileOf(NEW)) as unknown as OnboardingProfileState,
      { action: 'complete_wizard', writingPath: 'freeflow_import', biographyType: 'autobiography' },
      now
    );
    expect(done.ok && (await update('service_role', null, 'profiles', NEW, done.updates)).length).toBe(1);

    // 5. Il tour.
    const tour = buildOnboardingUpdates((await profileOf(NEW)) as unknown as OnboardingProfileState, { action: 'complete_tour' }, now);
    expect(tour.ok && (await update('service_role', null, 'profiles', NEW, tour.updates)).length).toBe(1);
    expect((await profileOf(NEW)).onboarding_phase).toBe('completed');
  });

  it('con la sessione dell\'utente la dichiarazione legale verrebbe rifiutata: per questo la rotta scrive col servizio', async () => {
    await as(db, 'postgres', null, `insert into auth.users (id, email, raw_user_meta_data) values ($1, 'n2@test', '{}'::jsonb)`, [NEW]);
    const state = (await profileOf(NEW)) as unknown as OnboardingProfileState;
    const built = buildOnboardingUpdates(state, { action: 'advance_wizard', wizardStep: 'legal', biographyType: 'memorial' }, '2026-09-30T10:00:00.000Z');
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const err = await errorOf(() => update('authenticated', NEW, 'profiles', NEW, built.updates));
    expect(err).toContain('server_only_column');
    expect(err).toContain('legal_declaration_accepted_at');
  });

  it('la data e la versione non sono scelte dal client e i valori fuori elenco sono rifiutati', () => {
    const state = {} as OnboardingProfileState;
    const hostile = { action: 'advance_wizard', wizardStep: 'legal', biographyType: 'autobiography', legal_declaration_accepted_at: '1999-01-01', legal_declaration_version: 'x' } as unknown as OnboardingPatchBody;
    const built = buildOnboardingUpdates(state, hostile, '2026-09-30T10:00:00.000Z');
    expect(built.ok && built.updates.legal_declaration_accepted_at).toBe('2026-09-30T10:00:00.000Z');
    expect(built.ok && built.updates.legal_declaration_version).toBe('2026-06');
    expect(buildOnboardingUpdates(state, { action: 'advance_wizard', biographyType: 'admin' as never }, 'x').ok).toBe(false);
  });

  it('continua a scrivere le proprie preferenze con la sessione (corpo, dimensione carattere, IA)', async () => {
    await update('authenticated', U.author, 'profiles', U.author, { ui_font_size: 'large' });
    await update('authenticated', U.author, 'profiles', U.author, { ai_features_enabled: true });
    expect(await profileOf(U.author)).toMatchObject({ ui_font_size: 'large', ai_features_enabled: true });
  });
});

describe('dashboard: creazione della biografia', () => {
  const now = '2026-09-30T10:00:00.000Z';

  it.each([
    ['autobiografia a sezioni, privata', { title: 'Vita', visibility: 'private' as const, biographyMode: 'sections' as const, authorName: 'Anna', biographyType: 'autobiography' as const, contentLanguage: 'it' }],
    ['foglio libero, link riservato', { title: 'Vita', visibility: 'link-only' as const, biographyMode: 'freeflow' as const, authorName: 'Anna', biographyType: 'autobiography' as const, contentLanguage: 'en' }],
    ['memoriale', { title: 'Francesco', visibility: 'private' as const, biographyMode: 'freeflow' as const, authorName: 'Maria', biographyType: 'memorial' as const, subjectName: 'Francesco', contentLanguage: 'it' }],
    ['pubblica con licenza', { title: 'Vita', visibility: 'public' as const, biographyMode: 'freeflow' as const, authorName: 'Anna', biographyType: 'autobiography' as const, contentLanguage: 'de', rightsStatementUri: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' }],
  ])('crea: %s', async (_label, body) => {
    const built = buildBiographyInsertPayload(U.fresh, body, now);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const [row] = await insert('authenticated', U.fresh, 'biographies', built.payload);
    expect(row).toMatchObject({ user_id: U.fresh, status: 'draft', schema_version: 2, ai_screening_status: 'pending' });
  });

  it('la rotta conia poi l\'identificativo UM col servizio e l\'utente lo rilegge ma non lo cambia', async () => {
    const built = buildBiographyInsertPayload(U.fresh, { title: 'Vita', authorName: 'Anna' }, now);
    if (!built.ok) throw new Error('payload');
    const [row] = await insert('authenticated', U.fresh, 'biographies', built.payload);
    await update('service_role', null, 'biographies', row.id as string, { um_id: 'um2026abc' });
    const [reread] = await as<{ um_id: string }>(db, 'authenticated', U.fresh, `select um_id from biographies where id = $1`, [row.id]);
    expect(reread.um_id).toBe('um2026abc');
    expect(await errorOf(() => update('authenticated', U.fresh, 'biographies', row.id as string, { um_id: 'altro' }))).toContain('server_only_column');
  });

  it('con importazione: creata a foglio libero, poi il testo importato arriva col salvataggio normale', async () => {
    const built = buildBiographyInsertPayload(U.fresh, { title: 'Vita', biographyMode: 'sections', authorName: 'Anna', contentLanguage: 'it' }, now);
    if (!built.ok) throw new Error('payload');
    const [row] = await insert('authenticated', U.fresh, 'biographies', built.payload);
    const imported = '<h1>Infanzia</h1><p>Sono nata vicino al fiume.</p>';
    const save = buildEditorSavePayload({
      fields: { title: 'Vita', author_name: 'Anna', content: {}, content_freeflow: imported, name_as_written: 'Vita' },
      isMemorial: false,
      visibility: 'private',
      biographyMode: 'freeflow',
    });
    await update('authenticated', U.fresh, 'biographies', row.id as string, save);
    const after = await bioOf(row.id as string);
    expect(after.biography_mode).toBe('freeflow');
    expect(String(after.content_freeflow)).toContain('Sono nata vicino al fiume');
  });

  it('un account ancora in lista d\'attesa non crea (policy di INSERT), e non una seconda biografia', async () => {
    const built = buildBiographyInsertPayload(U.waitlist, { title: 'Vita' }, now);
    if (!built.ok) throw new Error('payload');
    expect(await errorOf(() => insert('authenticated', U.waitlist, 'biographies', built.payload))).toContain('row-level security');
    const second = buildBiographyInsertPayload(U.author, { title: 'Un\'altra' }, now);
    if (!second.ok) throw new Error('payload');
    expect(await errorOf(() => insert('authenticated', U.author, 'biographies', second.payload))).toContain('one_biography_per_user');
  });
});

describe('editor: scrivere, completare, condividere, licenza, visibilità, foto', () => {
  const isoNow = '2026-09-30T10:00:00.000Z';

  it('salva il testo (autosalvataggio ripetuto, stessa riga due volte)', async () => {
    const payload = buildEditorSavePayload({
      fields: {
        title: 'Bozza',
        subject_name: undefined,
        author_name: 'Anna',
        content: { childhood: { text: '<p>Il fiume</p>' } },
        content_freeflow: '<p>Il fiume e la casa.</p>',
        name_as_written: 'Bozza',
      },
      isMemorial: false,
      visibility: 'private',
      biographyMode: 'freeflow',
    });
    for (let i = 0; i < 2; i++) {
      const rows = await update('authenticated', U.author, 'biographies', BIO.draft, payload);
      expect(rows).toHaveLength(1);
    }
    const after = await bioOf(BIO.draft);
    expect(after).toMatchObject({ title: 'Bozza', author_name: 'Anna', subject_name: null, biography_mode: 'freeflow', visibility: 'private' });
    expect(after.is_pioneer).toBe(false); // il trigger che lo tiene fermo non fa scattare il guard
  });

  it('salva un memoriale col nome del soggetto', async () => {
    const payload = buildEditorSavePayload({
      fields: { title: 'Francesco', subject_name: 'Francesco', author_name: 'Maria', content: {}, content_freeflow: '<p>Ricordo.</p>', name_as_written: 'Francesco' },
      isMemorial: true,
      visibility: 'link-only',
      biographyMode: 'freeflow',
    });
    await update('authenticated', U.author, 'biographies', BIO.draft, payload);
    expect(await bioOf(BIO.draft)).toMatchObject({ subject_name: 'Francesco', visibility: 'link-only' });
  });

  it('completa e riapre una sezione', async () => {
    const complete = buildMarkCompletePayload('draft', isoNow);
    expect(complete).toEqual({ status: 'sections_complete', completed_at: isoNow });
    await as(
      db,
      'authenticated',
      U.author,
      `insert into section_completions (user_id, biography_id, section_key, completed_at) values ($1, $2, 'childhood', $3)
       on conflict (biography_id, section_key) do update set completed_at = excluded.completed_at`,
      [U.author, BIO.draft, isoNow]
    );
    await update('authenticated', U.author, 'biographies', BIO.draft, complete);
    expect((await bioOf(BIO.draft)).status).toBe('sections_complete');

    // "Riapri sezione": si toglie il segno di completamento e lo stato torna a draft.
    await as(db, 'authenticated', U.author, `delete from section_completions where biography_id = $1 and section_key = 'childhood'`, [BIO.draft]);
    await update('authenticated', U.author, 'biographies', BIO.draft, { ...REOPEN_SECTION_PAYLOAD });
    expect(await bioOf(BIO.draft)).toMatchObject({ status: 'draft', completed_at: null });
    expect(buildMarkCompletePayload('sections_complete', isoNow)).toEqual({ status: 'draft', completed_at: null });
  });

  it('prepara il testo finale (final_version) dal percorso di pubblicazione', async () => {
    await update('authenticated', U.author, 'biographies', BIO.draft, buildFinalVersionPayload('# Vita\n\nTesto.', ['childhood', 'family']));
    expect(await bioOf(BIO.draft)).toMatchObject({ status: 'final_version', final_version: '# Vita\n\nTesto.' });
    await update('authenticated', U.author, 'biographies', BIO.draft, { final_version: '# Vita\n\nTesto rivisto.' });
    // il pulsante "Torna alla modifica" da final_version è uno spostamento fra stati d'autore
    await update('authenticated', U.author, 'biographies', BIO.draft, { status: 'draft' });
    expect((await bioOf(BIO.draft)).status).toBe('draft');
  });

  it('genera il collegamento di condivisione (token dal browser e funzioni dedicate)', async () => {
    const token = '5f7c6e1e-0a7b-4d3a-9f57-0a4f5f0a1111';
    await update('authenticated', U.author, 'biographies', BIO.draft, buildShareTokenPayload(token));
    expect((await bioOf(BIO.draft)).share_token).toBe(token);

    const [regen] = await as<{ regenerate_share_token: string }>(db, 'authenticated', U.author, `select public.regenerate_share_token($1)`, [BIO.draft]);
    expect(regen.regenerate_share_token).toHaveLength(36);
    expect((await bioOf(BIO.draft)).share_token).toBe(regen.regenerate_share_token);
    await as(db, 'authenticated', U.author, `select public.revoke_share_token($1)`, [BIO.draft]);
    expect((await bioOf(BIO.draft)).share_token).toBeNull();

    // un altro utente non può toccare il token di questa scheda
    expect(await errorOf(() => as(db, 'authenticated', U.other, `select public.regenerate_share_token($1)`, [BIO.draft]))).toContain('Insufficient privilege');
  });

  it('sceglie la licenza e cambia visibilità; senza licenza "pubblica" resta rifiutata', async () => {
    const noLicense = await errorOf(() => update('authenticated', U.author, 'biographies', BIO.draft, { visibility: 'public' }));
    expect(noLicense).toContain('licenza registrata');

    const license = buildLicenseChoicePayload({
      licenseUri: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
      now: isoNow,
      authorName: 'Anna ',
      isUpgrade: false,
    });
    await update('authenticated', U.author, 'biographies', BIO.draft, license);
    expect(await bioOf(BIO.draft)).toMatchObject({ visibility: 'public', rights_holder: 'Anna' });

    // upgrade alla licenza più aperta: non tocca la visibilità
    const upgrade = buildLicenseChoicePayload({ licenseUri: 'https://creativecommons.org/licenses/by-sa/4.0/', now: isoNow, authorName: 'Anna', isUpgrade: true });
    expect('visibility' in upgrade).toBe(false);
    await update('authenticated', U.author, 'biographies', BIO.draft, upgrade);

    for (const visibility of ['link-only', 'private', 'public']) {
      await update('authenticated', U.author, 'biographies', BIO.draft, { visibility });
      expect((await bioOf(BIO.draft)).visibility).toBe(visibility);
    }
  });

  it('carica foto: riga in biography_media (fino a 15 di galleria), la copertina non conta', async () => {
    const one = buildMediaInsertPayload({ biographyId: BIO.draft, userId: U.author, fileUrl: 'u/cover.jpg', fileName: 'cover.jpg', layout: 'cover', displayOrder: 0 });
    await insert('authenticated', U.author, 'biography_media', one);
    for (let i = 0; i < 15; i++) {
      await insert(
        'authenticated',
        U.author,
        'biography_media',
        buildMediaInsertPayload({ biographyId: BIO.draft, userId: U.author, fileUrl: `u/${i}.jpg`, fileName: `${i}.jpg`, layout: 'full-page', displayOrder: i })
      );
    }
    const err = await errorOf(() =>
      insert('authenticated', U.author, 'biography_media', buildMediaInsertPayload({ biographyId: BIO.draft, userId: U.author, fileUrl: 'u/x.jpg', fileName: 'x.jpg', layout: 'full-page', displayOrder: 16 }))
    );
    expect(err).toContain('at most 15');
  });

  it('un lettore anonimo aumenta le visualizzazioni (funzione SECURITY DEFINER)', async () => {
    await as(db, 'anon', null, `select public.increment_view_count($1)`, [BIO.published]);
    expect((await bioOf(BIO.published)).view_count).toBe(1);
  });
});

describe('pubblicazione: le rotte server scrivono col servizio e i trigger fanno il loro lavoro', () => {
  it('bozza PDF, blocco, screening, pubblicazione: i trigger di produzione impostano le colonne derivate', async () => {
    const now = '2026-09-30T12:00:00.000Z';
    // start-pdf-draft
    const startPayload = { status: 'pdf_draft', pdf_draft_started_at: now, pdf_draft_iteration: null, draft_ai_feedback: null };
    await update('authenticated', U.author, 'biographies', BIO.draft, buildFinalVersionPayload('# Testo\n\nFinale.'));
    expect(await errorOf(() => update('authenticated', U.author, 'biographies', BIO.draft, startPayload))).toContain('server_only_column');
    await update('service_role', null, 'biographies', BIO.draft, startPayload);
    expect((await bioOf(BIO.draft)).status).toBe('pdf_draft');

    // approve-final-pdf
    await update('service_role', null, 'biographies', BIO.draft, {
      status: 'locked_pending_screening',
      final_pdf_approved_at: now,
      pdf_draft_iteration: null,
      ai_screening_status: 'pending',
      final_pdf_url: 'u/final.pdf',
    });
    // screening pulito: pubblica
    await update('service_role', null, 'biographies', BIO.draft, { status: 'published', ai_screening_status: 'passed', published_at: now });
    const published = await bioOf(BIO.draft);
    expect(published.status).toBe('published');
    expect(published.chapters_count).toBe(1); // handle_biography_published
    // set_next_chapter_available_at: 365 giorni dopo last_chapter_published_at (= now() al momento della pubblicazione)
    const last = new Date(published.last_chapter_published_at as string).getTime();
    expect(new Date(published.next_chapter_available_at as string).getTime()).toBe(last + 365 * 24 * 3600 * 1000);
    expect(published.published_at_iso).toBeTruthy(); // biographies_sync_published_um (data derivata da published_at, in UTC)
    expect(published.published_um_year).toBe(0);
  });

  it('una seconda pubblicazione dentro i 365 giorni è fermata dal trigger anche se la scrive il servizio', async () => {
    const now = '2026-09-30T12:00:00.000Z';
    await update('service_role', null, 'biographies', BIO.draft, { status: 'published', ai_screening_status: 'passed', published_at: now });
    await update('service_role', null, 'biographies', BIO.draft, { status: 'draft' });
    const err = await errorOf(() => update('service_role', null, 'biographies', BIO.draft, { status: 'published', published_at: now }));
    expect(err).toContain('chapter_cooldown_active');
  });
});

describe('ordine dei trigger e coerenza dei valori predefiniti', () => {
  it('il guard è il primo trigger BEFORE di ogni evento su biographies e su profiles', async () => {
    const rows = await as<{ tbl: string; ev: string; names: string[] }>(
      db,
      'postgres',
      null,
      `select c.relname as tbl, ev.e as ev,
              array_agg(t.tgname order by t.tgname collate "C") as names
         from pg_trigger t
         join pg_class c on c.oid = t.tgrelid
         cross join lateral (values ('INSERT', 4), ('UPDATE', 16)) as ev(e, bit)
        where not t.tgisinternal and c.relname in ('biographies', 'profiles')
          and (t.tgtype & 2) = 2 and (t.tgtype & ev.bit) = ev.bit
        group by c.relname, ev.e`
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.names[0], `${r.tbl} ${r.ev}: ${r.names.join(', ')}`).toMatch(/^a00_.*_guard_server_columns$/);
    }
  });

  it('nessuna migrazione del repository crea un trigger BEFORE su biographies o profiles che precede il guard', async () => {
    const { readdirSync, readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const dir = join(process.cwd(), 'supabase', 'migrations');
    const offenders: string[] = [];
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql'))) {
      const text = readFileSync(join(dir, f), 'utf8');
      for (const m of Array.from(text.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+(\w+)\s+BEFORE\b[^;]*?\bON\s+(?:public\.)?(biographies|profiles)\b/gi))) {
        const name = m[1];
        if (/^a00_.*_guard_server_columns$/.test(name)) continue;
        if (Buffer.compare(Buffer.from(name), Buffer.from('a00_')) <= 0) offenders.push(`${f}: ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('i valori predefiniti delle colonne riservate nel catalogo coincidono con la mappa del guard', async () => {
    const problems: string[] = [];
    const check = async (table: 'biographies' | 'profiles', ownedFn: string, defaultsFn: string, skip: string[]) => {
      const [{ owned }] = await as<{ owned: string[] }>(db, 'postgres', null, `select public.${ownedFn}() as owned`);
      const [{ defaults }] = await as<{ defaults: Record<string, unknown> }>(db, 'postgres', null, `select public.${defaultsFn}() as defaults`);
      const cols = await as<{ column_name: string; column_default: string | null }>(
        db,
        'postgres',
        null,
        `select column_name, column_default from information_schema.columns where table_schema = 'public' and table_name = $1`,
        [table]
      );
      const byName = new Map(cols.map((c) => [c.column_name, c.column_default]));
      for (const col of owned) {
        if (!byName.has(col)) {
          problems.push(`${table}.${col}: elencata come riservata ma la colonna non esiste`);
          continue;
        }
        if (skip.includes(col)) continue;
        const catalogDefault = byName.get(col) ?? null;
        const mapped = col in defaults ? defaults[col] : undefined;
        if (catalogDefault === null && mapped !== undefined && mapped !== null) {
          problems.push(`${table}.${col}: la mappa dice ${JSON.stringify(mapped)}, il catalogo non ha un valore predefinito`);
        } else if (catalogDefault !== null) {
          const [{ v }] = await as<{ v: unknown }>(db, 'postgres', null, `select to_jsonb((${catalogDefault})) as v`);
          if (JSON.stringify(v) !== JSON.stringify(mapped ?? null)) {
            problems.push(`${table}.${col}: il catalogo dice ${catalogDefault}, la mappa ${JSON.stringify(mapped ?? null)}`);
          }
        }
      }
      for (const key of Object.keys(defaults)) {
        if (!owned.includes(key)) problems.push(`${table}.${key}: è nella mappa dei valori ma non tra le colonne riservate`);
      }
    };
    // id e created_at hanno valori generati; le due colonne derivate da published_at le
    // imposta un trigger; user_id lo verifica la policy RLS (sono escluse anche dal guard).
    await check('biographies', 'biographies_server_owned_columns', 'biographies_insert_defaults', [
      'id', 'user_id', 'created_at', 'published_at_iso', 'published_um_year',
    ]);
    // La versione della dichiarazione ha un valore predefinito che può cambiare (esclusa dal guard in INSERT).
    await check('profiles', 'profiles_server_owned_columns', 'profiles_insert_defaults', ['id', 'created_at', 'legal_declaration_version']);
    expect(problems).toEqual([]);
  });
});
