import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildEchoSystemPrompt, type EchoContext } from '@/lib/agents/prompts/echo';
import { FAITHFUL_WRITING_RULES, PLAIN_PROSE_AND_MEANING } from '@/lib/agents/prompts/plain-meaning';
import { COACH_TOOL_DEFINITIONS } from '@/lib/agents/tools/coach-tools';
import { getModelParams } from '@/lib/agents/models';
import { aiWritingToolsAvailableForBiography } from '@/lib/edition-ai';
import {
  GRAMMAR_MODEL_PARAMS,
  buildGrammarPrompt,
  sanitizeGrammarSuggestions,
} from '@/lib/ai/grammar';

/**
 * La IA non deve romanzare: un testo semplice resta semplice e i fatti non cambiano.
 * Qui si blocca ciò che si può bloccare senza chiamare il modello: le istruzioni che arrivano al
 * modello, la temperatura, i controlli sul risultato. La prova con il modello vero è
 * `scripts/prova-fedelta-ia.ts`.
 */

const KEY_RULES = [
  'FIDELITY TO THE AUTHOR',
  'Ordinary things stay ordinary',
  'Change only what is wrong',
  "Keep the author's tense, register, vocabulary and sentence length",
  'Never add, remove or alter facts',
];

const ECHO_CONTEXTS: EchoContext[] = [
  { page: 'editor_freeflow', biographyMode: 'freeflow' },
  { page: 'editor_sections', biographyMode: 'sections' },
  { page: 'hub' },
  { page: 'publication', publicationStatus: 'under_review' },
  { page: 'dashboard' },
  {
    page: 'editor_freeflow',
    narrative: { kind: 'memorial', writerName: 'Anna', subjectName: 'Mario' } as never,
  },
];

describe('Echo: istruzioni di fedeltà in ogni contesto e lingua', () => {
  for (const locale of ['it', 'en', 'fr', 'de', 'es']) {
    for (const ctx of ECHO_CONTEXTS) {
      it(`${locale} / ${ctx.page}${ctx.narrative ? ' (memoriale)' : ''}`, () => {
        const prompt = buildEchoSystemPrompt(locale, ctx);
        for (const rule of KEY_RULES) expect(prompt).toContain(rule);
        expect(prompt).toContain('Never invent biographical facts');
        expect(prompt).toContain('Do not romanticize, embellish, heighten emotion');
      });
    }
  }

  it('i significati (rimpianti, lezioni) si chiedono all\'autore, non si scrivono al suo posto', () => {
    expect(PLAIN_PROSE_AND_MEANING).toContain(
      'Never write a reflection, lesson or regret that the author did not state.'
    );
  });

  it('nessuna istruzione chiede di abbellire: le parole da romanzo compaiono solo dopo un divieto', () => {
    const prompt = buildEchoSystemPrompt('it', ECHO_CONTEXTS[0]);
    const re = /\b(embellish|romanticize|dramatize|heighten|vivid|dramatic|poetic)\b/gi;
    for (const m of Array.from(prompt.matchAll(re))) {
      const before = prompt.slice(Math.max(0, m.index! - 60), m.index!).toLowerCase();
      expect(/\b(not|never|no|without|or a plain)\b/.test(before) || /warmer or more vivid/.test(before + m[0])).toBe(true);
    }
  });
});

describe('controllo grammaticale: istruzioni, parametri e risultato', () => {
  for (const lang of ['it', 'en', 'fr', 'de', 'it-CH', 'de-CH']) {
    it(`il prompt in ${lang} porta le regole di fedeltà e una sola proposta per punto`, () => {
      const { system } = buildGrammarPrompt('Infanzia', 'Testo.', lang);
      expect(system).toContain(FAITHFUL_WRITING_RULES);
      expect(system).toContain("Preserve the author's voice and tone");
      expect(system).toContain('ONE replacement only');
    });
  }

  it('la temperatura è bassa: una correzione non deve inventare', () => {
    expect(GRAMMAR_MODEL_PARAMS.temperature).toBeLessThanOrEqual(0.3);
  });

  it('scarta i suggerimenti con alternative tra parentesi', () => {
    const items = sanitizeGrammarSuggestions([
      { original: 'ad una festa', suggestion: 'a una festa (oppure: in una festa paesana)' },
      { original: 'ad una festa', suggestion: 'a una festa' },
    ]);
    expect(items.map((i) => i.suggestion)).toEqual(['a una festa']);
  });

  it('scarta le riscritture che gonfiano la frase oltre una correzione', () => {
    const original = 'Mio padre non parlava molto.';
    const items = sanitizeGrammarSuggestions([
      {
        original,
        suggestion:
          'Mio padre era un uomo di poche parole, ma ogni suo silenzio raccontava un mondo intero di cose non dette.',
      },
      { original: 'era due chilometri', suggestion: 'erano due chilometri' },
      { original: 'andata', suggestion: 'sono andata' },
    ]);
    expect(items.map((i) => i.suggestion)).toEqual(['erano due chilometri', 'sono andata']);
  });
});

describe('temperatura dei modelli che scrivono o riscrivono', () => {
  it('Echo nell\'editor (ruolo coach) e il revisore restano sotto 0,3', () => {
    expect(getModelParams('coach').temperature).toBeLessThanOrEqual(0.3);
    expect(getModelParams('reviewer').temperature).toBeLessThanOrEqual(0.3);
  });

  it('nessuna chiamata nel codice usa una temperatura sopra 0,5', () => {
    const roots = ['app', 'lib', 'components', 'supabase'];
    const found: Array<{ file: string; value: number }> = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === '.next' || name === '__tests__') continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) {
          for (const m of Array.from(readFileSync(path, 'utf8').matchAll(/temperature:\s*([0-9]*\.?[0-9]+)/g))) {
            found.push({ file: path, value: Number(m[1]) });
          }
        }
      }
    };
    for (const root of roots) walk(join(process.cwd(), root));
    expect(found.length).toBeGreaterThan(0);
    expect(found.filter((f) => f.value > 0.5)).toEqual([]);
  });
});

describe('strumento che propone testo', () => {
  const fn = COACH_TOOL_DEFINITIONS.find((t) => t.function.name === 'propose_draft')!.function;

  it('chiede il passaggio esatto più breve possibile, non una riscrittura', () => {
    expect(fn.description).toContain('as short as possible');
    expect(fn.description).toContain('copied exactly');
  });

  it('non incoraggia lo stile creativo', () => {
    expect(JSON.stringify(fn)).not.toMatch(/creative|embellish|vivid|poetic|dramatic/i);
  });
});

describe('edizioni tradotte', () => {
  it('sulle edizioni la IA non tocca il testo: né grammatica né Echo', () => {
    expect(aiWritingToolsAvailableForBiography({ translationOf: 'abc' })).toBe(false);
    expect(aiWritingToolsAvailableForBiography({ translationOf: null })).toBe(true);
  });
});
