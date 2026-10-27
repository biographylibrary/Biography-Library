// @vitest-environment jsdom
/**
 * Prova a tappeto del percorso di chi scrive: si parte da un testo, si fanno in sequenza le cose
 * che un autore fa davvero nell'editor (scrivere, andare a capo, cancellare, grassetto, corsivo,
 * titoli, elenchi, separatore, a capo forzato, annulla) e dopo ogni gesto si controlla che
 * salvare e rileggere non perda né cambi niente. I casi sono generati con un seme fisso: se uno
 * fallisce, si rifà identico.
 */
import { Editor } from '@tiptap/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { htmlToArchiveMarkdown, normalizeArchiveMarkdown, storedToSafeHtml } from '@/lib/archive-markdown';
import { archiveMarkdownToEditorHtml, archiveTiptapExtensions } from '@/lib/editor-archive-tiptap';
import { editorLoadMatchesStored, plainTextFromEditorDoc, plainTextFromStoredMarkdown, structureFromEditorDoc, structureFromStoredMarkdown } from '@/lib/editor-load-guard';
import { nfc } from '@/lib/nfc';
import { ACTIONS, initialText, installDomShims, rng } from './helpers/author-journey';

beforeAll(installDomShims);

type Fail = { seed: number; step: number; action: string; kind: string; saved: string };
const TRACE: Record<number, string[]> = {};

function check(e: Editor): { kind: string; saved: string } | null {
  const saved = nfc(htmlToArchiveMarkdown(e.getHTML()));
  const norm = normalizeArchiveMarkdown(saved);
  if (norm.trim() && !editorLoadMatchesStored(norm, e)) {
    const diag = `\nPLAIN-MD : ${plainTextFromStoredMarkdown(norm)}\nPLAIN-DOC: ${plainTextFromEditorDoc(e)}\nSTRUCT-MD : ${JSON.stringify(structureFromStoredMarkdown(norm))}\nSTRUCT-DOC: ${JSON.stringify(structureFromEditorDoc(e))}\nHTML: ${e.getHTML()}`;
    return { kind: 'live-guard', saved: process.env.FUZZ_DEBUG ? saved + diag : saved };
  }
  const e2 = new Editor({ extensions: archiveTiptapExtensions(), content: archiveMarkdownToEditorHtml(norm) });
  try {
    if (norm.trim() && !editorLoadMatchesStored(norm, e2)) return { kind: 'reload-guard', saved };
    const again = nfc(htmlToArchiveMarkdown(e2.getHTML()));
    const flat = (t: string) => t.split('\n').map((l) => l.replace(/ +/g, ' ').trim()).filter(Boolean).join('\n');
    if (flat(again) !== flat(saved)) return { kind: 'not-idempotent', saved: `${saved}\n=====\n${again}` };
    if (plainTextFromEditorDoc(e) !== plainTextFromEditorDoc(e2)) return { kind: 'text-differs', saved };
    storedToSafeHtml(saved);
  } finally {
    e2.destroy();
  }
  return null;
}

describe('percorso dell\'autore: scrivere, salvare, rileggere', () => {
  it('nessun gesto rompe il salvataggio e la rilettura', () => {
    const fails: Fail[] = [];
    const SEEDS = Number(process.env.FUZZ_SEEDS ?? 200);
    for (let seed = 1; seed <= SEEDS; seed++) {
      const r = rng(seed);
      const stored = normalizeArchiveMarkdown(initialText(r));
      const e = new Editor({ extensions: archiveTiptapExtensions(), content: archiveMarkdownToEditorHtml(stored) });
      const first = check(e);
      if (first) { fails.push({ seed, step: 0, action: 'load', ...first }); e.destroy(); continue; }
      for (let step = 1; step <= 8; step++) {
        const action = ACTIONS[Math.floor(r() * ACTIONS.length)];
        (TRACE[seed] ??= []).push(action.name + ' ' + e.state.selection.from + '-' + e.state.selection.to + ' ' + e.getHTML().slice(0, 200));
        try { action.run(e, r); } catch { continue; }
        const bad = check(e);
        if (bad) { fails.push({ seed, step, action: action.name, ...bad }); break; }
      }
      e.destroy();
    }
    const byKey = new Map<string, Fail[]>();
    for (const f of fails) {
      const k = `${f.action}/${f.kind}`;
      byKey.set(k, [...(byKey.get(k) ?? []), f]);
    }
    const lines = Array.from(byKey.entries()).map(([k, v]) => `${k}: ${v.length} (es. seed ${v[0].seed}) ${(process.env.FUZZ_DEBUG ? v[0].saved : JSON.stringify(v[0].saved).slice(0, 220))}`);
    if (process.env.FUZZ_TRACE) console.log('TRACE', JSON.stringify(TRACE[Number(process.env.FUZZ_TRACE)], null, 1));
    console.log(`FUZZ falliti ${fails.length}/${SEEDS}\n` + lines.join('\n'));
    expect(fails.length).toBe(0);
  }, 120_000);
});
