/**
 * Prova in sviluppo che la IA resti fedele ai fatti: stessi prompt, modelli e parametri del codice,
 * chiamate vere a Infomaniak, testi inventati (nessun dato di autori). Non scrive nel database:
 * il registro del consumo è sostituito da una raccolta in memoria.
 *
 * Per ogni passaggio semplice, con qualche errore di grammatica ma nessun colore, misura quanto la
 * correzione proposta si allontana dall'originale: parole nuove, aggettivi e immagini da romanzo,
 * numeri o nomi propri nuovi, lunghezza. Un testo fedele cambia pochissimo.
 *
 * Uso: node --env-file=.env.local --import tsx scripts/prova-fedelta-ia.ts [grammatica|echo|tutto] [ripetizioni]
 */

type Row = Record<string, unknown>;

const PASSAGES = [
  'Io andavo a scuola a piedi, era due chilometri da fare. La maestra si chiamava Rossi e ci faceva stare in fila.',
  'Mio padre lavorava in banca dalle otto alle cinque. Tornava a casa e mangiavamo tutti insieme, non parlava molto.',
  'Nel 1960 ci siamo trasferiti a Lugano perchè mio padre ha cambiato lavoro. La casa nuova aveva un giardino piccolo.',
  'Ho conosciuto mia moglie ad una festa di paese. Ci siamo sposati due anni dopo e abbiamo avuto tre figli.',
  "D'estate andavamo al lago con la bicicletta. Si faceva il bagno e poi si tornava a casa per cena.",
  'Il mio primo lavoro è stato in una falegnameria. Ci sono stato cinque anni, poi sono andato a lavorare in fabbrica.',
  'Il fiume è straripato quando avevo dodici anni, abbiamo dovuto lasciare la casa per tre settimane. Poi siamo tornati e abbiamo pulito tutto.',
  'Mia nonna faceva il pane il sabato. In cucina c\'era sempre caldo e noi bambini stavamo sotto il tavolo.',
];

/** Radici di parole da romanzo che un racconto semplice non contiene. */
const HYPE = [
  'avventur', 'straordinar', 'magic', 'indimenticabil', 'incredibil', 'epic', 'meravigli', 'destin',
  'viaggio', 'profond', 'intens', 'emozion', 'sogn', 'magnific', 'fiab', 'leggend', 'pulsa', 'sussurr',
  'dorat', 'poetic', 'nostalg', 'cuore', 'anima', 'brivid', 'sinfoni', 'danza', 'abbraccio', 'sfid',
  'coraggios', 'eroic', 'solenne', 'incanto', 'incantat', 'splendid', 'immens', 'eterno', 'eterna',
];

function tokens(text: string): string[] {
  return text.toLowerCase().normalize('NFC').match(/[\p{L}\p{N}']+/gu) ?? [];
}

type Measure = { nuove: number; romanzo: string[]; numeri: string[]; propri: string[]; lunghezza: number };

function measure(source: string, output: string): Measure {
  const src = new Set(tokens(source));
  const outTokens = tokens(output);
  const nuove = outTokens.filter((w) => !src.has(w) && w.length > 3);
  const romanzo = Array.from(new Set(nuove.filter((w) => HYPE.some((h) => w.includes(h)))));
  const numbers = (t: string) => new Set(t.match(/\d+/g) ?? []);
  const srcNum = numbers(source);
  const numeri = Array.from(numbers(output)).filter((n) => !srcNum.has(n));
  const caps = (t: string) =>
    new Set((t.match(/(?<=[a-zà-ú,;] )[A-ZÀ-Ú][\p{L}]+/gu) ?? []).map((w) => w.toLowerCase()));
  const srcCaps = caps(source);
  const propri = Array.from(caps(output)).filter((w) => !srcCaps.has(w) && !src.has(w));
  return {
    nuove: nuove.length,
    romanzo,
    numeri,
    propri,
    lunghezza: Math.round((outTokens.length / Math.max(1, tokens(source).length)) * 100) / 100,
  };
}

function summarize(label: string, runs: Array<{ passage: number; m: Measure; output: string }>) {
  const n = runs.length;
  const avg = (f: (m: Measure) => number) => Math.round((runs.reduce((a, r) => a + f(r.m), 0) / n) * 100) / 100;
  const conRomanzo = runs.filter((r) => r.m.romanzo.length > 0).length;
  const conInvenzioni = runs.filter((r) => r.m.numeri.length > 0 || r.m.propri.length > 0).length;
  const molto = runs.filter((r) => r.m.nuove >= 4 || r.m.lunghezza > 1.35).length;
  console.log(`\n=== ${label} (${n} prove) ===`);
  console.log(`parole nuove per prova, in media: ${avg((m) => m.nuove)}`);
  console.log(`lunghezza media rispetto all'originale: ${avg((m) => m.lunghezza)}`);
  console.log(`prove con parole da romanzo: ${conRomanzo}/${n}`);
  console.log(`prove con numeri o nomi propri nuovi: ${conInvenzioni}/${n}`);
  console.log(`prove molto riscritte (4+ parole nuove o 35% più lunghe): ${molto}/${n}`);
  for (const r of runs.filter((x) => x.m.romanzo.length || x.m.numeri.length || x.m.propri.length || x.m.nuove >= 4)) {
    console.log(
      `  - passaggio ${r.passage + 1}: nuove=${r.m.nuove} romanzo=[${r.m.romanzo.join(',')}] numeri=[${r.m.numeri.join(',')}] propri=[${r.m.propri.join(',')}] lung=${r.m.lunghezza}\n    ${r.output.replace(/\s+/g, ' ').slice(0, 260)}`
    );
  }
}

async function runGrammar(reps: number) {
  const { chat } = await import('@/lib/agents/infomaniak-client');
  const { GRAMMAR_MODEL_PARAMS, buildGrammarPrompt, grammarModelChain, extractJson, sanitizeGrammarSuggestions } =
    await import('@/lib/ai/grammar');
  const runs: Array<{ passage: number; m: Measure; output: string }> = [];
  console.log(`grammatica: temperatura ${GRAMMAR_MODEL_PARAMS.temperature}, modelli ${grammarModelChain().join(' > ')}`);
  for (let p = 0; p < PASSAGES.length; p++) {
    for (let r = 0; r < reps; r++) {
      const prompt = buildGrammarPrompt('Infanzia', PASSAGES[p], 'it');
      const res = await chat({
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        models: grammarModelChain(),
        max_tokens: GRAMMAR_MODEL_PARAMS.max_tokens,
        temperature: GRAMMAR_MODEL_PARAMS.temperature,
        timeoutMs: GRAMMAR_MODEL_PARAMS.timeoutMs,
        retry: GRAMMAR_MODEL_PARAMS.retry,
        stopOnClientError: true,
        usage: { purpose: 'grammar' },
      }).catch((e) => {
        console.log('errore', p + 1, String(e).slice(0, 100));
        return null;
      });
      if (!res) continue;
      let corrected = PASSAGES[p];
      try {
        const items = sanitizeGrammarSuggestions(JSON.parse(extractJson(res.content ?? '[]')));
        for (const s of items) {
          if (s.original && s.suggestion && corrected.includes(s.original)) {
            corrected = corrected.replace(s.original, s.suggestion);
          }
        }
      } catch {
        /* risposta non leggibile: nessuna modifica, come fa l'app */
      }
      runs.push({ passage: p, m: measure(PASSAGES[p], corrected), output: corrected });
    }
  }
  summarize('GRAMMATICA: testo dopo aver applicato tutti i suggerimenti', runs);
}

async function runEcho(reps: number) {
  const { chat } = await import('@/lib/agents/infomaniak-client');
  const { buildEchoSystemPrompt } = await import('@/lib/agents/prompts/echo');
  const { getEchoToolsForContext } = await import('@/lib/agents/tools/echo-tools');
  const { getModelParams } = await import('@/lib/agents/models');
  const { recoverTextToolCalls } = await import('@/lib/agents/text-tool-calls');
  const tools = getEchoToolsForContext({ echoPage: 'editor_freeflow', biographyId: 'bio' });
  console.log(`echo (editor): temperatura ${getModelParams('coach').temperature}`);

  const instructions = [
    (p: string) => `Correggi la grammatica di questo passaggio senza cambiare altro: «${p}»`,
    (p: string) => `Rendi più scorrevole questo passaggio: «${p}»`,
    (p: string) => `Sistema questo paragrafo: «${p}»`,
    (p: string) => `Rendilo più caldo e più coinvolgente, senza inventare fatti: «${p}»`,
  ];
  const system = (p: string) =>
    buildEchoSystemPrompt('it', { page: 'editor_freeflow', biographyMode: 'freeflow', publicationStatus: 'draft' } as never) +
    `\n\n=== ACTIVE DOCUMENT ===\n${p}\n=== END ACTIVE DOCUMENT ===`;

  const runs: Array<{ passage: number; m: Measure; output: string; kind: string }> = [];
  for (let i = 0; i < instructions.length; i++) {
    for (let p = 0; p < PASSAGES.length; p++) {
      for (let r = 0; r < reps; r++) {
        const res = await chat({
          role: 'coach',
          messages: [
            { role: 'system', content: system(PASSAGES[p]) },
            { role: 'user', content: instructions[i](PASSAGES[p]) },
          ],
          tools,
          usage: { purpose: 'echo' },
          timeoutMs: 60_000,
        }).catch((e) => {
          console.log('errore', p + 1, String(e).slice(0, 100));
          return null;
        });
        if (!res) continue;
        let calls = res.tool_calls ?? [];
        if (!calls.length) {
          calls = recoverTextToolCalls(res.content ?? '', tools).calls;
        }
        const draft = calls.find((c) => c.function.name === 'propose_draft');
        let text = '';
        if (draft) {
          try {
            text = String(JSON.parse(draft.function.arguments).draftText ?? '');
          } catch {
            text = '';
          }
        } else {
          text = res.content ?? '';
        }
        if (!text.trim()) continue;
        runs.push({ passage: p, m: measure(PASSAGES[p], text), output: text, kind: String(i) });
      }
    }
  }
  const labels = ['corregge la grammatica', 'rende più scorrevole', 'sistema il paragrafo', 'più caldo e coinvolgente'];
  for (let i = 0; i < instructions.length; i++) {
    summarize(`ECHO, richiesta «${labels[i]}»`, runs.filter((r) => r.kind === String(i)));
  }
}

async function main() {
  const mode = process.argv[2] ?? 'tutto';
  const reps = Number(process.argv[3] ?? 2);
  const rows: Row[] = [];
  const { setUsageSink } = await import('@/lib/ai/usage-recorder');
  setUsageSink(async (r) => {
    rows.push(r as unknown as Row);
  });
  if (mode === 'grammatica' || mode === 'tutto') await runGrammar(reps);
  if (mode === 'echo' || mode === 'tutto') await runEcho(reps);
  const tokensTotal = rows.reduce((a, r) => a + (Number(r.totalTokens) || 0), 0);
  console.log(`\nChiamate: ${rows.length}, token totali: ${tokensTotal}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Modulo a sé: evita che le funzioni dei due script si scontrino nello spazio globale.
export {};
