/**
 * Misura in sviluppo il consumo di token di Echo e della grammatica, con le
 * chiamate vere a Infomaniak e i prompt veri del codice. Non scrive nel
 * database (il registro del consumo è sostituito da una raccolta in memoria).
 *
 * Uso: node --env-file=.env.local --import tsx scripts/misura-consumo-ai.ts [sonda|echo|grammatica|trascrizione]
 */
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';

type Row = {
  purpose: string;
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  estimated?: boolean;
  ok?: boolean;
};

const rows: Row[] = [];

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    n: values.length,
    media: Math.round(sum / values.length),
    min: sorted[0],
    mediana: sorted[Math.floor(sorted.length / 2)],
    max: sorted[sorted.length - 1],
  };
}

const BASE =
  'Sono nato a Bellinzona nel 1948, in una casa vicino al fiume. Mio nonno mi portava a pescare ogni domenica e mi insegnava il nome degli uccelli. ' +
  'Io ricordo che la casa aveva una cucina piccola, dove mia madre preparava il pane, e che il profumo arrivava fino in strada. ' +
  'A scuola ero un bambino timido, ma la maestra Rossi mi ha incoraggiato a leggere ad alta voce, e da lì è cominciato tutto. ' +
  'Quando avevo dodici anni il fiume ha straripato e abbiamo dovuto lasciare la casa per tre settimane; me lo ricordo come un avventura. ';

function sampleText(chars: number): string {
  let out = '';
  let i = 0;
  while (out.length < chars) {
    out += (i % 2 === 0 ? BASE : BASE.replace('ricordo che', 'ricordo che che').replace('è cominciato', 'e cominciato')) + '\n\n';
    i += 1;
  }
  return out.slice(0, chars);
}

async function main() {
  const mode = process.argv[2] ?? 'sonda';
  const { setUsageSink } = await import('@/lib/ai/usage-recorder');
  setUsageSink(async (r) => {
    rows.push(r as Row);
  });

  if (mode === 'sonda') {
    const { chatStream, chat } = await import('@/lib/agents/infomaniak-client');
    const messages = [
      { role: 'system' as const, content: 'Rispondi in italiano in una frase.' },
      { role: 'user' as const, content: 'Come si chiama il fiume di Bellinzona?' },
    ];
    let text = '';
    for await (const c of chatStream({ role: 'onboarding', messages, usage: { purpose: 'echo' }, max_tokens: 60 })) {
      if (c.type === 'token') text += c.content;
    }
    console.log('STREAM:', rows.at(-1));
    await chat({ role: 'onboarding', messages, usage: { purpose: 'echo' }, max_tokens: 60 });
    console.log('CHAT:  ', rows.at(-1));
    return;
  }

  if (mode === 'grammatica') {
    const { chat } = await import('@/lib/agents/infomaniak-client');
    const { GRAMMAR_MODEL_PARAMS, buildGrammarPrompt, grammarModelChain } = await import('@/lib/ai/grammar');
    const sizes = [600, 1200, 1500, 2500, 3500, 4400, 6000, 9000, 12000, 22000];
    const perCall: Array<{ chars: number; total: number; prompt: number; completion: number; estimated: boolean; model: string; tentativi: number }> = [];
    for (const chars of sizes) {
      const before = rows.length;
      const p = buildGrammarPrompt('Infanzia', sampleText(chars), 'it');
      const result = await chat({
        messages: [
          { role: 'system', content: p.system },
          { role: 'user', content: p.user },
        ],
        models: grammarModelChain(),
        max_tokens: GRAMMAR_MODEL_PARAMS.max_tokens,
        temperature: GRAMMAR_MODEL_PARAMS.temperature,
        timeoutMs: GRAMMAR_MODEL_PARAMS.timeoutMs,
        retry: GRAMMAR_MODEL_PARAMS.retry,
        stopOnClientError: true,
        usage: { purpose: 'grammar' },
      }).catch((e) => {
        console.log('errore', chars, String(e).slice(0, 120));
        return null;
      });
      const mine = rows.slice(before);
      const okRow = mine.find((r) => r.ok);
      perCall.push({
        chars,
        total: mine.reduce((a, r) => a + (r.totalTokens ?? 0), 0),
        prompt: okRow?.promptTokens ?? 0,
        completion: okRow?.completionTokens ?? 0,
        estimated: mine.some((r) => r.estimated),
        model: okRow?.model ?? '-',
        tentativi: mine.length,
      });
      void result;
    }
    console.table(perCall);
    console.log('GRAMMATICA totale per chiamata', stats(perCall.map((c) => c.total)));
    return;
  }

  if (mode === 'echo') {
    const { runStreamingAgentTurn } = await import('@/lib/agents/run-agent-turn');
    const { buildEchoSystemPrompt } = await import('@/lib/agents/prompts/echo');
    const { getEchoToolsForContext } = await import('@/lib/agents/tools/echo-tools');

    // Finto client di servizio: ogni catena di query restituisce una riga qualunque.
    const chainable: any = new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === 'then') return (resolve: (v: unknown) => void) => resolve({ data: { id: 'fake', content: '' }, error: null, count: 0 });
        return chainable;
      },
      apply() {
        return chainable;
      },
    });

    const userTurns = [
      'Ciao Echo, come funziona la lista d’attesa e quando potrò pubblicare?',
      'Vorrei iniziare a scrivere della mia infanzia a Bellinzona. Da dove parto?',
      'Mi aiuti a dare una struttura al primo capitolo? Ho molti ricordi sparsi.',
      'Puoi dirmi come suona l’attacco del testo e se cambieresti l’ordine dei primi due paragrafi?',
      'Scrivimi una bozza di un paragrafo sulla cucina di mia madre, in modo semplice.',
      'Non mi piace il tono, rendilo più caldo ma senza inventare fatti.',
      'Dove trovo l’esportazione in PDF e come scelgo la licenza?',
      'Il paragrafo sul fiume è troppo lungo: dove lo spezzeresti?',
      'Mi suggerisci un titolo per il capitolo sulla scuola?',
      'Riassumimi in tre punti che cosa ho scritto finora, così controllo se manca qualcosa.',
    ];
    const excerpt = sampleText(1800);
    const kb = 'La lista d’attesa: i nuovi account restano in attesa finché l’associazione non concede l’accesso. Non si vede la posizione in coda.\n\nLa licenza dei contenuti pubblici è scelta dall’autore alla pubblicazione (CC BY-NC-SA 4.0 o CC BY-SA 4.0).';
    const system =
      buildEchoSystemPrompt('it', { page: 'editor_freeflow', biographyMode: 'freeflow', publicationStatus: 'draft' } as never) +
      `\n\nRelevant biography excerpts:\n${excerpt}\n\nKnowledge base excerpts:\n${kb}`;
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    const perTurn: Array<{ turno: number; chiamate: number; prompt: number; completion: number; total: number; stimato: boolean }> = [];

    for (let i = 0; i < userTurns.length; i++) {
      const before = rows.length;
      let reply = '';
      await runStreamingAgentTurn(
        {
          threadId: 't',
          history: history.map((h) => ({ ...h })),
          userMessage: userTurns[i],
          systemPrompt: system,
          role: 'coach',
          agentType: 'echo',
          tools: getEchoToolsForContext({ echoPage: 'editor_freeflow', biographyId: 'bio' }),
          biographyId: 'bio',
          userId: 'u',
          locale: 'it',
          echoPage: 'editor_freeflow',
          biographyMode: 'freeflow',
        },
        chainable,
        (event, data) => {
          if (event === 'token') reply += (data as { content: string }).content;
        }
      ).catch((e) => console.log('turno', i + 1, 'errore', String(e).slice(0, 120)));
      history.push({ role: 'user', content: userTurns[i] }, { role: 'assistant', content: reply || '(nessuna risposta)' });
      const mine = rows.slice(before).filter((r) => r.purpose === 'echo');
      perTurn.push({
        turno: i + 1,
        chiamate: mine.length,
        prompt: mine.reduce((a, r) => a + (r.promptTokens ?? 0), 0),
        completion: mine.reduce((a, r) => a + (r.completionTokens ?? 0), 0),
        total: mine.reduce((a, r) => a + (r.totalTokens ?? 0), 0),
        stimato: mine.some((r) => r.estimated),
      });
    }
    console.table(perTurn);
    console.log('ECHO totale per turno', stats(perTurn.map((t) => t.total)));
    return;
  }

  if (mode === 'trascrizione') {
    const wav = '/tmp/bl-misura-whisper.wav';
    execFileSync('say', ['-o', wav, '--data-format=LEI16@22050', 'Ciao, questa è una prova di trascrizione per Biography Library.'], { stdio: 'ignore' });
    const endpoint = process.env.INFOMANIAK_AI_ENDPOINT ?? '';
    const token = process.env.INFOMANIAK_AI_TOKEN ?? '';
    const product = endpoint.match(/\/ai\/(\d+)\//)?.[1];
    const form = new FormData();
    form.append('file', new Blob([readFileSync(wav)], { type: 'audio/wav' }), 'recording.wav');
    form.append('model', 'whisper');
    form.append('language', 'it');
    const start = await fetch(`https://api.infomaniak.com/1/ai/${product}/openai/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const startJson = (await start.json()) as { batch_id?: string };
    console.log('avvio: chiavi', Object.keys(startJson));
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(`https://api.infomaniak.com/1/ai/${product}/results/${startJson.batch_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await poll.json()) as Record<string, unknown>;
      if (['success', 'complete', 'completed'].includes(String(json.status))) {
        const data = typeof json.data === 'string' ? JSON.parse(json.data) : json.data;
        console.log('risposta: chiavi', Object.keys(json));
        console.log('data: chiavi', data && typeof data === 'object' ? Object.keys(data as object) : typeof data);
        const d = data as Record<string, unknown>;
        for (const k of Object.keys(d ?? {})) {
          if (k !== 'text' && k !== 'segments') console.log('  ', k, '=', JSON.stringify(d[k]).slice(0, 120));
        }
        return;
      }
    }
    console.log('timeout');
  }
}

main().catch((e) => {
  console.error('errore', String(e).slice(0, 300));
  process.exit(1);
});
