/**
 * Misura quanto la ricerca nella guida porta a Echo il pezzo giusto, confrontando il metodo
 * vecchio (pezzi da 900 caratteri, solo l'ultima frase, un pezzo per sezione, solo significato)
 * con quello nuovo. Embedding veri, guida del codice, nessun accesso al database.
 *
 * Uso: npx tsx --tsconfig tsconfig.json --env-file=.env.local scripts/prova-guida-ricerca.ts
 */
type Q = { q: string; expect: string; before?: string };

const QUESTIONS: Q[] = [
  { q: "c'è un limite di caratteri?", before: 'Come funziona il controllo grammaticale?', expect: '4000' },
  { q: 'quanto testo posso selezionare?', before: 'Voglio correggere la grammatica', expect: '4000' },
  { q: 'qual è il limite massimo?', before: 'controllo grammaticale: posso selezionare un capitolo?', expect: '4000' },
  { q: 'ma esiste un limite per quanto posso selezionare?', expect: '4000' },
  { q: 'quanti controlli grammaticali posso fare al giorno?', expect: '(40)' },
  { q: 'quanto dura al massimo una registrazione vocale?', expect: '5 minuti' },
  { q: 'posso registrare la voce per mezz\'ora?', before: 'uso il microfono per dettare', expect: '5 minuti' },
  { q: 'quanto può pesare una foto?', expect: '20 MB' },
  { q: 'quante foto posso mettere nella galleria?', expect: '15 in galleria' },
  { q: 'quanto può pesare un file Word da importare?', expect: '5 MB' },
  { q: 'posso importare un PDF scansionato?', expect: 'scansione' },
  { q: 'come traduco la mia biografia?', expect: "Traduci in un'altra lingua" },
  { q: 'dove scarico il manuale?', expect: 'Aiuto nel piè di pagina' },
  { q: 'chi può leggere la mia biografia se la lascio privata?', expect: 'Privata' },
  { q: 'dopo quanto tempo posso scrivere un nuovo capitolo dopo la pubblicazione?', expect: '365' },
  { q: 'per quanto tempo un memorial resta con la dicitura?', expect: '30 giorni' },
  { q: 'dove cambio la lingua del testo?', expect: 'Lingua del testo' },
  { q: 'Echo cambia il mio modo di scrivere?', expect: 'senza cambiare la tua voce' },
  { q: 'dove trovo le note e i promemoria?', expect: 'Note e To-Do' },
  { q: 'si possono avere due biografie con lo stesso account?', expect: 'una sola biografia' },
];

async function main() {
  const { HELP_KB_SECTIONS } = await import('@/lib/agents/kb/help-kb-sections');
  const { embed } = await import('@/lib/agents/infomaniak-client');
  const { setUsageSink } = await import('@/lib/ai/usage-recorder');
  const ranking = await import('@/lib/agents/rag/kb-ranking');
  setUsageSink(async () => {});

  type Row = { sourceKey: string; content: string; embedding: number[] };
  const oldRows: Omit<Row, 'embedding'>[] = [];
  const newRows: Omit<Row, 'embedding'>[] = [];
  for (const s of HELP_KB_SECTIONS) {
    const t = s.content.it.trim();
    for (let i = 0; i < t.length; i += 900) oldRows.push({ sourceKey: s.sourceKey, content: t.slice(i, i + 900) });
    for (const c of ranking.splitKbSection(t)) newRows.push({ sourceKey: s.sourceKey, content: c });
  }
  const [oldVecs, newVecs] = await Promise.all([embed(oldRows.map((r) => r.content), { purpose: 'embedding', userId: null }), embed(newRows.map((r) => r.content), { purpose: 'embedding', userId: null })]);
  const oldFull: Row[] = oldRows.map((r, i) => ({ ...r, embedding: oldVecs[i] }));
  const newFull: Row[] = newRows.map((r, i) => ({ ...r, embedding: newVecs[i] }));

  const qOld = await embed(QUESTIONS.map((x) => x.q), { purpose: 'embedding', userId: null });
  const newQueries = QUESTIONS.map((x) => ranking.buildKbQuery(x.q, x.before ? [{ role: 'user', content: x.before }] : []));
  const qNew = await embed(newQueries, { purpose: 'embedding', userId: null });

  let hitOld = 0;
  let hitNew = 0;
  const lines: string[] = [];
  QUESTIONS.forEach((x, i) => {
    // vecchio: solo significato, un pezzo per sezione, 4 pezzi
    const scoredOld = oldFull
      .map((r) => ({ ...r, score: ranking.cosineSimilarity(qOld[i], r.embedding) }))
      .sort((a, b) => b.score - a.score);
    const seen = new Set<string>();
    const pickedOld: typeof scoredOld = [];
    for (const r of scoredOld) {
      if (pickedOld.length >= 4) break;
      if (seen.has(r.sourceKey)) continue;
      seen.add(r.sourceKey);
      pickedOld.push(r);
    }
    const okOld = pickedOld.some((r) => r.content.includes(x.expect));
    const pickedNew = ranking.pickKbChunks(ranking.rankKbChunks(qNew[i], newQueries[i], newFull));
    const okNew = pickedNew.some((r) => r.content.includes(x.expect));
    if (okOld) hitOld++;
    if (okNew) hitNew++;
    lines.push(`${okOld ? 'sì' : 'NO'} -> ${okNew ? 'sì' : 'NO'}  ${x.q}${x.before ? '  (dopo: «' + x.before + '»)' : ''}`);
    if (!okNew) {
      const all = ranking.rankKbChunks(qNew[i], newQueries[i], newFull);
      const at = all.findIndex((r) => r.content.includes(x.expect));
      lines.push(`      pezzo giusto: posizione ${at + 1} (${all[at]?.sourceKey}); scelti: ${pickedNew.map((p) => p.sourceKey).join(', ')}`);
    }
  });
  // Risposta vera di Echo con i pezzi scelti dai due metodi, sulle domande con un numero da trovare.
  const { chat } = await import('@/lib/agents/infomaniak-client');
  const { buildEchoSystemPrompt } = await import('@/lib/agents/prompts/echo');
  const ask = QUESTIONS.map((x, i) => ({ x, i })).filter(({ x }) => /^(4000|5 minuti|20 MB|5 MB|\(40\))$/.test(x.expect));
  let answeredOld = 0;
  let answeredNew = 0;
  const answers: string[] = [];
  for (const { x, i } of ask) {
    const scoredOld = oldFull.map((r) => ({ ...r, score: ranking.cosineSimilarity(qOld[i], r.embedding) })).sort((a, b) => b.score - a.score);
    const seen = new Set<string>();
    const ctxOld: string[] = [];
    for (const r of scoredOld) { if (ctxOld.length >= 4) break; if (seen.has(r.sourceKey)) continue; seen.add(r.sourceKey); ctxOld.push(`[${r.sourceKey}] ${r.content}`); }
    const ctxNew = ranking.pickKbChunks(ranking.rankKbChunks(qNew[i], newQueries[i], newFull)).map((r) => `[${r.sourceKey}] ${r.content}`);
    for (const [label, ctx] of [['vecchio', ctxOld], ['nuovo', ctxNew]] as const) {
      const messages = [
        { role: 'system' as const, content: buildEchoSystemPrompt('it', { page: 'editor_freeflow', biographyMode: 'freeflow' } as never) + `\n\nKnowledge base excerpts:\n${ctx.join('\n---\n')}` },
        ...(x.before ? [{ role: 'user' as const, content: x.before }, { role: 'assistant' as const, content: 'Certo, ti spiego volentieri.' }] : []),
        { role: 'user' as const, content: x.q },
      ];
      const res = await chat({ role: 'coach', messages, usage: { purpose: 'echo' }, timeoutMs: 60_000 }).catch(() => null);
      const digits = x.expect.replace(/[()]/g, '').split(' ')[0];
      const ok = Boolean(res && new RegExp(digits.replace(/(\d)(?=(\d{3})+$)/g, '$1[.,\\s]?')).test(res.content));
      if (label === 'vecchio' && ok) answeredOld++;
      if (label === 'nuovo' && ok) answeredNew++;
      answers.push(`${label.padEnd(7)} ${ok ? 'sì' : 'NO'}  «${x.q}» -> ${(res?.content ?? '').replace(/\s+/g, ' ').slice(0, 130)}`);
    }
  }
  console.log('\nRisposta di Echo con il numero giusto\n' + answers.join('\n'));
  console.log(`Risposte con il numero giusto: vecchio ${answeredOld}/${ask.length}, nuovo ${answeredNew}/${ask.length}\n`);
  console.log(`Pezzi: prima ${oldRows.length} (900 car.), ora ${newRows.length} (a confine di frase, max ${ranking.KB_CHUNK_MAX_CHARS})\n`);
  console.log('prima -> ora  domanda\n' + lines.join('\n'));
  console.log(`\nIl pezzo giusto arriva a Echo: prima ${hitOld}/${QUESTIONS.length}, ora ${hitNew}/${QUESTIONS.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Modulo a sé: evita che le funzioni degli script si scontrino nello spazio globale.
export {};
