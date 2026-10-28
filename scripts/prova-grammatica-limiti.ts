/**
 * Prova in sviluppo del controllo grammaticale con il modello vero, con testi inventati: dove si
 * rompe (lunghezza della selezione, virgolette, dialoghi, a capo) e se le proposte parlano davvero
 * del testo selezionato. Non scrive nel database. Stessi prompt, modelli e parametri della rotta.
 *
 * Uso: npx tsx --tsconfig tsconfig.json --env-file=.env.local scripts/prova-grammatica-limiti.ts [ripetizioni]
 */
const SENTENCES = [
  'Da bambino abitavo in una casa vicino al fiume, era sempre umida e fredda d\'inverno.',
  'Mio padre lavorava in banca e tornava a casa tardi, non parlava molto.',
  'La maestra si chiamava Rossi e ci faceva stare in fila prima di entrare in classe.',
  'Nel 1960 ci siamo trasferiti a Lugano perchè mio padre aveva cambiato lavoro.',
  'Mia nonna faceva il pane il sabato e noi bambini aspettavamo che finisse.',
  'D\'estate andavamo al lago con le biciclette, io e i miei cugini.',
  'Ho conosciuto mia moglie ad una festa di paese, ci siamo sposati due anni dopo.',
  'Il mio primo lavoro è stato in una falegnameria, ci sono rimasto cinque anni.',
  'Poi sono andato a lavorare in fabbrica dove ho incontrato molte persone gentili.',
  'Quando il fiume è straripato abbiamo dovuto lasciare la casa per tre settimane.',
  'Ricordo che mia madre piangeva ma non lo dava a vedere, era fatta così.',
  'Il medico ci disse che non c\'era niente da fare e che bisognava aspettare.',
  'Abbiamo avuto tre figli, due maschi e una femmina, che oggi vivono lontano.',
  'Ogni domenica andavamo a messa e poi si pranzava tutti insieme dalla nonna.',
  'Non ho mai avuto una grande istruzione ma ho sempre letto tutto quello che trovavo.',
  'In inverno si andava a scuola con la neve fino alle ginocchia.',
];

function textOf(chars: number): string {
  let out = '';
  let i = 0;
  while (out.length < chars) {
    out += SENTENCES[i % SENTENCES.length] + (i % 4 === 3 ? '\n\n' : ' ');
    i++;
  }
  return out.slice(0, chars).trim();
}

const SHAPES: Record<string, string> = {
  'molti apostrofi':
    "L'altra volta c'ho pensato: un po' di pane, l'anno scorso, all'improvviso, dell'orto, c'è l'hanno detto a tutti e nessun'altra ci ha creduto.",
  'apostrofi e virgolette dritte':
    'Mia nonna diceva sempre "un po\' di pazienza" e io non c\'ho mai fatto caso; l\'ho capito solo dopo.',
  'dialogo con virgolette dritte':
    'Mia madre mi disse: "Non sapevo che saresti partito così presto." Io risposi: "Neanche io, ma ho dovuto." Lei rimase in silenzio, poi disse: "Allora andiamo a salutare la nonna, ci tiene tanto."',
  'dialogo con caporali e trattini':
    '«Non lo so» disse mio padre. — Dobbiamo aspettare — aggiunse la nonna, guardando fuori. Poi nessuno parlò per un po\', e il silenzio ci sembrò lunghissimo.',
  'più paragrafi con a capo':
    'Siamo partiti la mattina presto.\n\nIl viaggio è durato tutto il giorno, abbiamo fatto una sosta a pranzo.\n\nQuando siamo arrivati era già sera e pioveva.',
  'con segni strani e virgolette dentro':
    'Il biglietto diceva "arrivo domani" ma io non c\'ho creduto; ho aspettato lo stesso, fino alle 5 (forse 6) di sera.',
};

type Outcome = { label: string; chars: number; ok: boolean; kind: string; ms: number; suggestions: number; offText: number; tokens?: number };

async function main() {
  const reps = Number(process.argv[2] ?? 2);
  const { chat } = await import('@/lib/agents/infomaniak-client');
  const { setUsageSink } = await import('@/lib/ai/usage-recorder');
  const rows: Array<{ totalTokens?: number }> = [];
  setUsageSink(async (r) => {
    rows.push(r as unknown as { totalTokens?: number });
  });
  const { GRAMMAR_MODEL_PARAMS, buildGrammarPrompt, grammarModelChain, parseSuggestionsLoose, sanitizeGrammarSuggestions, stripHtmlToPlain, suggestionsAboutText } =
    await import('@/lib/ai/grammar');

  const cases: Array<[string, string]> = [
    ['400 caratteri', textOf(400)],
    ['4000 caratteri (il limite)', textOf(4000)],
    ['3000 caratteri', textOf(3000)],
    ['1000 caratteri', textOf(1000)],
    ['2000 caratteri', textOf(2000)],
    ['4000 caratteri', textOf(4000)],
    ...Object.entries(SHAPES),
  ];
  const outcomes: Outcome[] = [];
  for (const [label, text] of cases) {
    for (let r = 0; r < reps; r++) {
      const plain = stripHtmlToPlain(text);
      const prompt = buildGrammarPrompt('Infanzia', plain, 'it');
      const before = rows.length;
      const t0 = Date.now();
      let kind = 'ok';
      let suggestions = 0;
      let offText = 0;
      try {
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
        });
        const data = parseSuggestionsLoose(res.content);
        if (data === null) kind = 'json-non-valido';
        else {
          const raw = sanitizeGrammarSuggestions(data);
          const kept = suggestionsAboutText(raw, plain);
          suggestions = kept.length;
          offText = raw.length - kept.length;
        }
      } catch (e) {
        kind = /timeout|abort/i.test(String(e)) ? 'timeout' : 'errore-chiamata';
      }
      outcomes.push({
        label,
        chars: plain.length,
        ok: kind === 'ok',
        kind,
        ms: Date.now() - t0,
        suggestions,
        offText,
        tokens: rows.slice(before).reduce((a, x) => a + (x.totalTokens ?? 0), 0),
      });
    }
  }
  console.table(outcomes.map((o) => ({ caso: o.label, caratteri: o.chars, esito: o.kind, secondi: Math.round(o.ms / 100) / 10, proposte: o.suggestions, 'scartate (fuori tema)': o.offText, token: o.tokens })));
  const tot = outcomes.length;
  console.log(`Riusciti ${outcomes.filter((o) => o.ok).length}/${tot}; proposte scartate perché fuori dal testo selezionato: ${outcomes.reduce((a, o) => a + o.offText, 0)} su ${outcomes.reduce((a, o) => a + o.suggestions, 0)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Modulo a sé: evita che le funzioni degli script si scontrino nello spazio globale.
export {};
