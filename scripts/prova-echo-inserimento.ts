/**
 * Prova in sviluppo dell'inserimento di testo da parte di Echo, con il modello vero e un documento
 * inventato (nessun dato di autori, nessuna scrittura: il database è finto). Ricostruisce i casi
 * segnalati: la scheda «Inserisci» che non compare, il testo messo nel punto sbagliato o duplicato,
 * le scuse con avverbi.
 *
 * Uso: npx tsx --tsconfig tsconfig.json --env-file=.env.local scripts/prova-echo-inserimento.ts [ripetizioni]
 */
type EchoEvent = { event: string; data: Record<string, unknown> };

const DOC = [
  'Ricordo anche le visite alle piramidi, quando avevo circa sei anni. Il giro sul dromedario mi sembrava gigantesco, un\'esperienza un po\' da turisti, ma è rimasta impressa nella mia memoria.',
  'Poi tornammo a casa e la vita riprese come prima.',
].join('\n\n');

const MEMORY =
  "Ricordo quando siamo andati a prendere mia nonna Ada all'aeroporto del Cairo. Aveva preso l'aereo da sola, per la prima volta. Siamo rimasti ad aspettarla tantissimo, non usciva mai e abbiamo temuto che non fosse arrivata.";

const fakeClient: any = new Proxy(function () {}, {
  get(_t, prop) {
    if (prop === 'then')
      return (resolve: (v: unknown) => void) =>
        resolve({
          data: { id: 'fake', content: {}, content_freeflow: DOC, status: 'draft', is_frozen: false, user_id: 'u', ai_features_enabled: true },
          error: null,
          count: 0,
        });
    return fakeClient;
  },
  apply() {
    return fakeClient;
  },
});

const warnings: string[] = [];
const origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const line = args.map(String).join(' ');
  if (line.includes('[agents]')) warnings.push(line);
  else origWarn(...args);
};

async function turn(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string
): Promise<{ events: EchoEvent[]; reply: string }> {
  const { runStreamingAgentTurn } = await import('@/lib/agents/run-agent-turn');
  const { buildEchoSystemPrompt } = await import('@/lib/agents/prompts/echo');
  const { getEchoToolsForContext } = await import('@/lib/agents/tools/echo-tools');
  const events: EchoEvent[] = [];
  let reply = '';
  await runStreamingAgentTurn(
    {
      threadId: 't',
      history,
      userMessage,
      systemPrompt:
        buildEchoSystemPrompt('it', { page: 'editor_freeflow', biographyMode: 'freeflow', publicationStatus: 'draft' } as never) +
        `\n\n=== ACTIVE DOCUMENT (freeflow) ===\n${DOC}\n=== END ACTIVE DOCUMENT ===`,
      role: 'coach',
      agentType: 'echo',
      tools: getEchoToolsForContext({ echoPage: 'editor_freeflow', biographyId: 'bio' }),
      biographyId: 'bio',
      userId: 'u',
      locale: 'it',
      echoPage: 'editor_freeflow',
      biographyMode: 'freeflow',
    },
    fakeClient,
    (event, data) => {
      events.push({ event, data: data as Record<string, unknown> });
      if (event === 'token') reply += (data as { content: string }).content;
    }
  ).catch((e) => console.log('errore del turno:', String(e).slice(0, 120)));
  return { events, reply };
}

function preview(events: EchoEvent[]) {
  return events.find((e) => e.event === 'tool_result' && e.data.tool === 'propose_draft' && e.data.preview)?.data as
    | { draftText?: string; replaceText?: string; insertBefore?: string; insertAfter?: string }
    | undefined;
}

async function main() {
  const reps = Number(process.argv[2] ?? 4);
  const { setUsageSink } = await import('@/lib/ai/usage-recorder');
  setUsageSink(async () => {});
  const { placeDraftInDocument } = await import('@/lib/echo/apply-draft');

  const results: Record<string, { n: number; box: number; placedOk: number; apology: number; notes: string[] }> = {};
  const note = (key: string) => (results[key] ??= { n: 0, box: 0, placedOk: 0, apology: 0, notes: [] });

  const check = (key: string, events: EchoEvent[], reply: string) => {
    const r = note(key);
    r.n++;
    if (/profondamente|sinceramente|sentitamente/i.test(reply)) r.apology++;
    const p = preview(events);
    if (!p?.draftText) {
      r.notes.push(`senza scheda: ${reply.replace(/\s+/g, ' ').slice(0, 140)}`);
      return;
    }
    r.box++;
    const placed = placeDraftInDocument(DOC, p.draftText, {
      replaceText: p.replaceText,
      insertBefore: p.insertBefore,
      insertAfter: p.insertAfter,
    });
    const text = placed.ok ? placed.text : '';
    const nonna = (text.match(/aeroporto del Cairo/g) ?? []).length;
    const piramidi = (text.match(/visite alle piramidi/g) ?? []).length;
    const before = text.indexOf('aeroporto del Cairo') >= 0 && text.indexOf('aeroporto del Cairo') < text.indexOf('visite alle piramidi');
    if (placed.ok && nonna === 1 && piramidi === 1 && before) r.placedOk++;
    else r.notes.push(`posizione/duplicati: nonna×${nonna} piramidi×${piramidi} prima=${before} ok=${placed.ok}`);
  };

  for (let i = 0; i < reps; i++) {
    // 1. richiesta diretta
    let t = await turn([], `Aggiungi prima della parte sulle piramidi questo ricordo, sistemando solo la grammatica: «${MEMORY}»`);
    check('1 richiesta diretta di inserire prima delle piramidi', t.events, t.reply);

    // 2. il «sì» dopo un'offerta senza scheda
    t = await turn(
      [
        { role: 'user', content: `Scrivi il ricordo di nonna Ada all'aeroporto: ${MEMORY}` },
        { role: 'assistant', content: `Ecco come lo scriverei: «${MEMORY}» Ti sembra che rispecchi bene il ricordo? Se sì, posso aggiungerlo subito prima della parte delle piramidi.` },
      ],
      'sì'
    );
    check('2 «sì» dopo un\'offerta di aggiungerlo', t.events, t.reply);

    // 3. «non vedo il box»
    t = await turn(
      [
        { role: 'user', content: 'Aggiungi il ricordo di nonna Ada prima delle piramidi.' },
        { role: 'assistant', content: `Ho scritto questo: «${MEMORY}» Ti sembra che rispecchi bene il ricordo? Se sì, posso aggiungerlo subito prima della parte delle piramidi.` },
        { role: 'user', content: 'sì' },
        { role: 'assistant', content: 'Fatto, ora dovresti vedere il testo pronto per essere inserito.' },
      ],
      'non c\'è nessun box con scritto inserisci'
    );
    check('3 «non c\'è nessun box»', t.events, t.reply);
  }

  console.log('\nRISULTATI');
  for (const [key, r] of Object.entries(results)) {
    console.log(`\n${key}\n  prove ${r.n}, scheda comparsa ${r.box}/${r.n}, testo al posto giusto senza duplicati ${r.placedOk}/${r.n}, scuse con avverbi ${r.apology}`);
    for (const n of r.notes.slice(0, 3)) console.log(`  - ${n}`);
  }
  const claimed = warnings.filter((w) => w.includes('claims an insertion')).length;
  console.log(`\nVolte in cui il controllo ha dovuto forzare la proposta perché il modello promettevano senza strumento: ${claimed}`);
  console.log(`Altri avvisi del sistema: ${warnings.length - claimed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Modulo a sé: evita che le funzioni dei due script si scontrino nello spazio globale.
export {};
