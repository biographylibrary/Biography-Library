import { describe, expect, it } from 'vitest';
import { createFakeDb } from './helpers/fake-supabase';
import {
  checkPublishGate,
  FORMAT_CONVERSION_SCREENING_REASON,
  latestScreening,
} from '@/lib/server/publication-fingerprint';
import { FORMAT_CONVERSION_REASON } from '@/lib/server/markdown-format-conversion';

describe('righe di conversione di formato', () => {
  it('la costante coincide fra i moduli', () => {
    expect(FORMAT_CONVERSION_REASON).toBe(FORMAT_CONVERSION_SCREENING_REASON);
  });

  it('una riga di conversione non è uno screening vero per latestScreening', async () => {
    const db = createFakeDb({
      biographies: [
        {
          id: 'bio-1',
          title: 'T',
          author_name: 'A',
          content: {},
          content_freeflow: 'testo',
          final_version: 'testo',
          biography_mode: 'freeflow',
        },
      ],
      publication_records: [
        {
          id: 'conv-1',
          biography_id: 'bio-1',
          kind: 'screening',
          fingerprint: 'a'.repeat(64),
          verdict: 'passed',
          scope: 'full',
          examined_chars: 0,
          source_chars: 0,
          reason: FORMAT_CONVERSION_REASON,
          created_at: '2026-10-01T00:00:00Z',
        },
      ],
    });

    expect(await latestScreening(db.client, 'bio-1')).toBeNull();
  });

  it('una riga di conversione non basta a pubblicare una scheda con il testo cambiato', async () => {
    const db = createFakeDb({
      biographies: [
        {
          id: 'bio-1',
          title: 'Titolo nuovo',
          author_name: 'A',
          content: {},
          content_freeflow: 'testo cambiato dopo la conversione',
          final_version: 'testo cambiato dopo la conversione',
          biography_mode: 'freeflow',
        },
      ],
      publication_records: [
        {
          id: 'conv-1',
          biography_id: 'bio-1',
          kind: 'screening',
          fingerprint: 'b'.repeat(64),
          verdict: 'passed',
          scope: 'full',
          examined_chars: 0,
          source_chars: 0,
          reason: FORMAT_CONVERSION_REASON,
          created_at: '2026-10-01T00:00:00Z',
        },
      ],
    });

    const gate = await checkPublishGate(db.client, {
      biographyId: 'bio-1',
      mode: 'human_approval',
    });
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.code).toBe('no_screening_record');
    }
  });

  it('uno screening vero successivo alla conversione resta selezionabile', async () => {
    const realFp = 'c'.repeat(64);
    const db = createFakeDb({
      biographies: [
        {
          id: 'bio-1',
          title: 'T',
          author_name: 'A',
          content: {},
          content_freeflow: 'x',
          final_version: 'x',
          biography_mode: 'freeflow',
        },
      ],
      publication_records: [
        {
          id: 'conv-1',
          biography_id: 'bio-1',
          kind: 'screening',
          fingerprint: 'a'.repeat(64),
          verdict: 'passed',
          scope: 'full',
          examined_chars: 0,
          source_chars: 0,
          reason: FORMAT_CONVERSION_REASON,
          created_at: '2026-10-02T00:00:00Z',
        },
        {
          id: 'real-1',
          biography_id: 'bio-1',
          kind: 'screening',
          fingerprint: realFp,
          verdict: 'passed',
          scope: 'full',
          examined_chars: 10,
          source_chars: 10,
          reason: null,
          created_at: '2026-10-01T00:00:00Z',
        },
      ],
    });

    const latest = await latestScreening(db.client, 'bio-1');
    expect(latest?.id).toBe('real-1');
    expect(latest?.fingerprint).toBe(realFp);
  });
});
