import { describe, expect, it } from 'vitest';
import {
  canonicalPublicText,
  checkPublishGate,
  computePublicFingerprint,
  fingerprintOfPublicText,
  gatedPublish,
  recordScreening,
  type PublicTextInput,
} from '@/lib/server/publication-fingerprint';
import { createFakeDb } from './helpers/fake-supabase';

function base(): PublicTextInput {
  return {
    biography: {
      title: 'La mia vita',
      author_name: 'Anna Rossi',
      subject_name: null,
      name_as_written: 'Anna Rossi',
      content: { childhood: { text: 'Sono nata a Lugano.' }, family: { text: 'Mio padre faceva il falegname.' } },
      content_freeflow: null,
      final_version: '## Infanzia\n\nSono nata a Lugano.',
      narrative_order: ['childhood', 'family'],
      biography_mode: 'sections',
    },
    sections: [{ section_key: 'childhood', content: 'Sono nata a Lugano.' }],
    bookStructure: {
      dedication_enabled: true,
      dedication_content: 'A mia madre',
      preface_enabled: false,
      preface_content: 'Testo disattivato',
    },
    media: [
      { layout: 'cover', caption: '', display_order: 0 },
      { layout: 'full-page', caption: 'Il lago', display_order: 1 },
    ],
    events: [{ event_type: 'birth', date_as_given: '1950', place_name_as_given: 'Lugano', sequence: 0 }],
    relations: [{ relation_code: 'parent', related_name_as_written: 'Marco' }],
  };
}

const fp = (input: PublicTextInput) => fingerprintOfPublicText(input);

describe('impronta del testo pubblico: stabilità', () => {
  it('è un SHA-256 esadecimale e non cambia a parità di testo', () => {
    expect(fp(base())).toMatch(/^[0-9a-f]{64}$/);
    expect(fp(base())).toBe(fp(base()));
  });

  it('non dipende dall\'ordine con cui arrivano le righe', () => {
    const a = base();
    const b = base();
    b.media = [...b.media].reverse();
    b.sections = [...b.sections].reverse();
    expect(fp(a)).toBe(fp(b));
  });

  it('non dipende da spazi ai bordi, da NFC o NFD, da vuoto o assente', () => {
    const a = base();
    const b = base();
    b.biography.title = '  La mia vita  ';
    b.biography.author_name = 'Anna Rossi'.normalize('NFD');
    b.biography.subject_name = '';
    expect(fp(a)).toBe(fp(b));
    const c = base();
    c.biography.title = 'Città'.normalize('NFD');
    const d = base();
    d.biography.title = 'Città'.normalize('NFC');
    expect(fp(c)).toBe(fp(d));
  });

  it('la parte del libro disattivata non entra', () => {
    const a = base();
    const b = base();
    (b.bookStructure as Record<string, unknown>).preface_content = 'Un altro testo, ma disattivato';
    expect(fp(a)).toBe(fp(b));
  });

  it('la forma canonica è JSON con chiavi in ordine fisso', () => {
    const one = canonicalPublicText(base());
    expect(() => JSON.parse(one)).not.toThrow();
    expect(Object.keys(JSON.parse(one))[0]).toBe('v');
  });
});

describe('impronta del testo pubblico: ogni superficie conta', () => {
  const mutations: Array<[string, (i: PublicTextInput) => void]> = [
    ['titolo', (i) => (i.biography.title = 'Un altro titolo')],
    ['nome dell\'autore', (i) => (i.biography.author_name = 'Anna Bianchi')],
    ['nome del soggetto', (i) => (i.biography.subject_name = 'Qualcuno')],
    ['nome come scritto', (i) => (i.biography.name_as_written = 'Anna R.')],
    ['un capitolo in content', (i) => (i.biography.content = { childhood: { text: 'Sono nata a Berna.' }, family: { text: 'Mio padre faceva il falegname.' } })],
    ['un capitolo in più in content', (i) => (i.biography.content = { ...(i.biography.content as object), passions: { text: 'Amo nuotare.' } })],
    ['flusso libero', (i) => (i.biography.content_freeflow = 'Testo a flusso libero')],
    ['versione finale', (i) => (i.biography.final_version = '## Infanzia\n\nSono nata a Berna.')],
    ['ordine narrativo', (i) => (i.biography.narrative_order = ['family', 'childhood'])],
    ['una riga di biography_sections', (i) => (i.sections = [{ section_key: 'childhood', content: 'Altro testo.' }])],
    ['una sezione nuova', (i) => i.sections.push({ section_key: 'family', content: 'Nuova.' })],
    ['parte del libro attiva', (i) => ((i.bookStructure as Record<string, unknown>).dedication_content = 'A mio padre')],
    ['parte del libro accesa', (i) => ((i.bookStructure as Record<string, unknown>).preface_enabled = true)],
    ['una didascalia', (i) => (i.media[1].caption = 'Il monte')],
    ['una foto in più', (i) => i.media.push({ layout: 'full-page', caption: '', display_order: 2 })],
    ['un evento', (i) => (i.events[0].date_as_given = '1951')],
    ['una relazione', (i) => (i.relations[0].related_name_as_written = 'Luca')],
    ['una relazione in più', (i) => i.relations.push({ relation_code: 'sibling', related_name_as_written: 'Elena' })],
  ];

  it.each(mutations)('cambia se cambia: %s', (_name, mutate) => {
    const changed = base();
    mutate(changed);
    expect(fp(changed)).not.toBe(fp(base()));
  });
});

describe('impronta letta dal database', () => {
  function seed() {
    return createFakeDb({
      biographies: [
        {
          id: 'b1',
          user_id: 'u1',
          status: 'locked_pending_screening',
          title: 'La mia vita',
          author_name: 'Anna',
          content: { childhood: { text: 'Testo' } },
          final_version: 'Testo finale',
          biography_mode: 'sections',
        },
      ],
      biography_sections: [{ biography_id: 'b1', section_key: 'childhood', content: 'Testo' }],
      biography_media: [{ biography_id: 'b1', layout: 'cover', caption: '', display_order: 0 }],
    });
  }

  it('cambia quando si riscrive il testo e torna uguale se si ripristina', async () => {
    const db = seed();
    const before = await computePublicFingerprint(db.client, 'b1');
    db.tables.biographies[0].final_version = 'Testo finale modificato';
    const during = await computePublicFingerprint(db.client, 'b1');
    db.tables.biographies[0].final_version = 'Testo finale';
    const after = await computePublicFingerprint(db.client, 'b1');
    expect(before).toMatch(/^[0-9a-f]{64}$/);
    expect(during).not.toBe(before);
    expect(after).toBe(before);
  });

  it('cambia anche con una didascalia nelle tabelle figlie', async () => {
    const db = seed();
    const before = await computePublicFingerprint(db.client, 'b1');
    db.tables.biography_media[0].caption = 'Nuova didascalia';
    expect(await computePublicFingerprint(db.client, 'b1')).not.toBe(before);
  });

  it('per una scheda che non esiste restituisce null', async () => {
    expect(await computePublicFingerprint(seed().client, 'nope')).toBeNull();
  });
});

describe('confronto prima di pubblicare', () => {
  async function withScreening(verdict: 'passed' | 'flagged' | 'ai_error' = 'passed') {
    const db = createFakeDb({
      biographies: [{ id: 'b1', user_id: 'u1', status: 'under_review', final_version: 'Testo esaminato', title: 'T' }],
    });
    const fingerprint = (await computePublicFingerprint(db.client, 'b1'))!;
    await recordScreening(db.client, {
      biographyId: 'b1',
      fingerprint,
      verdict,
      scope: 'full',
      examinedChars: 15,
      sourceChars: 15,
    });
    return { db, fingerprint };
  }

  it('approvazione umana: passa se lo screening ha esaminato esattamente questo testo', async () => {
    const { db, fingerprint } = await withScreening('flagged');
    const gate = await checkPublishGate(db.client, { biographyId: 'b1', mode: 'human_approval' });
    expect(gate).toMatchObject({ ok: true, fingerprint, screeningFingerprint: fingerprint });
  });

  it('approvazione umana: dopo un errore del modello il testo è lo stesso, la persona può approvare', async () => {
    const { db } = await withScreening('ai_error');
    expect((await checkPublishGate(db.client, { biographyId: 'b1', mode: 'human_approval' })).ok).toBe(true);
  });

  it('approvazione umana: rifiutata se il testo è cambiato dopo lo screening', async () => {
    const { db } = await withScreening();
    db.tables.biographies[0].final_version = 'Testo riscritto dopo lo screening';
    const gate = await checkPublishGate(db.client, { biographyId: 'b1', mode: 'human_approval' });
    expect(gate).toMatchObject({ ok: false, code: 'text_changed_since_screening' });
  });

  it('approvazione umana: rifiutata se non c\'è nessuno screening registrato', async () => {
    const db = createFakeDb({ biographies: [{ id: 'b1', user_id: 'u1', status: 'under_review', final_version: 'x' }] });
    const gate = await checkPublishGate(db.client, { biographyId: 'b1', mode: 'human_approval' });
    expect(gate).toMatchObject({ ok: false, code: 'no_screening_record' });
  });

  it('la riga "testo cambiato" non fa da screening del testo nuovo', async () => {
    const { db } = await withScreening();
    db.tables.biographies[0].final_version = 'Testo nuovo';
    const changed = (await computePublicFingerprint(db.client, 'b1'))!;
    await recordScreening(db.client, {
      biographyId: 'b1',
      fingerprint: changed,
      verdict: 'text_changed',
      scope: 'full',
      examinedChars: 0,
      sourceChars: 0,
    });
    const gate = await checkPublishGate(db.client, { biographyId: 'b1', mode: 'human_approval' });
    expect(gate).toMatchObject({ ok: false, code: 'text_changed_since_screening' });
  });

  it('automatica: rifiutata se l\'impronta attesa non è quella del testo di adesso', async () => {
    const { db, fingerprint } = await withScreening();
    expect((await checkPublishGate(db.client, { biographyId: 'b1', mode: 'auto', expectedFingerprint: fingerprint })).ok).toBe(true);
    db.tables.biographies[0].title = 'Titolo cambiato durante lo screening';
    const gate = await checkPublishGate(db.client, { biographyId: 'b1', mode: 'auto', expectedFingerprint: fingerprint });
    expect(gate).toMatchObject({ ok: false, code: 'text_changed_during_screening' });
  });

  it('automatica: senza impronta attesa non si pubblica', async () => {
    const { db } = await withScreening();
    expect(await checkPublishGate(db.client, { biographyId: 'b1', mode: 'auto' })).toMatchObject({ ok: false });
  });

  it('forzata: nessun confronto, anche senza screening e con testo cambiato', async () => {
    const { db } = await withScreening();
    db.tables.biographies[0].final_version = 'Tutt\'altro testo';
    const gate = await checkPublishGate(db.client, { biographyId: 'b1', mode: 'forced' });
    expect(gate.ok).toBe(true);
  });

  it('ripristino: senza pubblicazione precedente si parte dal testo attuale; poi deve coincidere', async () => {
    const { db } = await withScreening();
    expect((await checkPublishGate(db.client, { biographyId: 'b1', mode: 'restore' })).ok).toBe(true);
    const published = await gatedPublish(db.client, { biographyId: 'b1', mode: 'forced', actorId: 's1' }, async () => null);
    expect(published.ok).toBe(true);
    db.tables.biographies[0].final_version = 'Cambiato mentre era nascosta';
    const gate = await checkPublishGate(db.client, { biographyId: 'b1', mode: 'restore' });
    expect(gate).toMatchObject({ ok: false, code: 'text_changed_since_publication' });
  });
});

describe('gatedPublish: la traccia c\'è sempre', () => {
  function setup() {
    return createFakeDb({
      biographies: [{ id: 'b1', user_id: 'u1', status: 'under_review', final_version: 'Testo', title: 'T' }],
    });
  }

  it('forzata: scrive la riga con impronta e autore PRIMA di cambiare lo stato', async () => {
    const db = setup();
    let recordedBeforePublish = false;
    const result = await gatedPublish(db.client, { biographyId: 'b1', mode: 'forced', actorId: 'staff-7' }, async () => {
      recordedBeforePublish = db.tables.publication_records?.some((r) => r.kind === 'publication' && r.outcome === 'pending') ?? false;
      return null;
    });
    expect(result.ok).toBe(true);
    expect(recordedBeforePublish).toBe(true);
    const [row] = db.tables.publication_records;
    expect(row).toMatchObject({
      kind: 'publication',
      mode: 'forced',
      actor_id: 'staff-7',
      outcome: 'published',
      biography_id: 'b1',
    });
    expect(row.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it('se la scrittura dello stato fallisce, l\'esito è "failed" e l\'errore risale', async () => {
    const db = setup();
    const result = await gatedPublish(db.client, { biographyId: 'b1', mode: 'forced', actorId: 's1' }, async () => 'chapter_cooldown_active');
    expect(result).toEqual({ ok: false, blocked: false, error: 'chapter_cooldown_active' });
    expect(db.tables.publication_records[0].outcome).toBe('failed');
  });

  it('se la riga di registro non si scrive, NON pubblica', async () => {
    const db = createFakeDb(
      { biographies: [{ id: 'b1', user_id: 'u1', status: 'under_review', final_version: 'Testo' }] },
      { failInsert: (table) => (table === 'publication_records' ? { message: 'db down' } : null) }
    );
    let published = false;
    const result = await gatedPublish(db.client, { biographyId: 'b1', mode: 'forced', actorId: 's1' }, async () => {
      published = true;
      return null;
    });
    expect(published).toBe(false);
    expect(result).toMatchObject({ ok: false, blocked: false });
  });

  it('se il confronto fallisce non scrive nulla e non chiama la pubblicazione', async () => {
    const db = setup();
    let published = false;
    const result = await gatedPublish(db.client, { biographyId: 'b1', mode: 'human_approval', actorId: 's1' }, async () => {
      published = true;
      return null;
    });
    expect(published).toBe(false);
    expect(result).toMatchObject({ ok: false, blocked: true, code: 'no_screening_record' });
    expect(db.tables.publication_records ?? []).toHaveLength(0);
  });
});
