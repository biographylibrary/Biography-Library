import type { Language } from '@/lib/i18n/translations';
import { isMemorialBiography, memorialSubjectName } from '@/lib/biography-display';

export type BiographyNarrativeContext = {
  biographyType: 'autobiography' | 'memorial';
  subjectName: string;
  writerName: string;
};

export function buildBiographyNarrativeContext(row: {
  biography_type?: string | null;
  subject_name?: string | null;
  title?: string | null;
  author_name?: string | null;
}): BiographyNarrativeContext {
  const biographyType = isMemorialBiography(row.biography_type) ? 'memorial' : 'autobiography';
  return {
    biographyType,
    subjectName: memorialSubjectName(row.subject_name, row.title ?? ''),
    writerName: row.author_name?.trim() ?? '',
  };
}

export function isMemorialNarrative(ctx: BiographyNarrativeContext): boolean {
  return ctx.biographyType === 'memorial' && ctx.subjectName.trim().length > 0;
}

const MEMORIAL_BLOCK: Record<Language, (subject: string, writer: string) => string> = {
  en: (subject, writer) =>
    `=== MEMORIAL BIOGRAPHY (mandatory) ===\n` +
    `${writer || 'The writer'} is writing a memorial biography about ${subject}, a deceased person — NOT about themselves.\n` +
    `Ask the WRITER (second person: "you") what they know, remember hearing, or learned about ${subject} (third person).\n` +
    `NEVER phrase questions as if the writer lived the protagonist's life (avoid "your childhood", "your school", "what do you remember from your…").\n` +
    `Instead use: "What do you know about ${subject}'s childhood?", "What did ${subject} tell you about…?", "What have family members shared about…?".\n` +
    `For propose_draft: on the FIRST memorial coaching exchange, if narrative voice preference is not yet in memory, ask whether they prefer:\n` +
    `(A) third-person biography of ${subject}, or (B) first-person witness voice ("I remember that ${subject}…" / "My father told me…").\n` +
    `Remember their choice in conversation memory and follow it in all drafts.\n` +
    `Never invent facts about ${subject}; only use what the writer shares.\n` +
    `=== END MEMORIAL BIOGRAPHY ===`,
  it: (subject, writer) =>
    `=== BIOGRAFIA MEMORIAL (obbligatorio) ===\n` +
    `${writer || 'Lo scrittore'} sta scrivendo una biografia memorial su ${subject}, persona scomparsa — NON sulla propria vita.\n` +
    `Rivolgiti allo SCRITTORE (seconda persona: "tu") su ciò che sa, ha sentito raccontare o ha appreso di ${subject} (terza persona).\n` +
    `NON formulare domande come se lo scrittore avesse vissuto la vita del protagonista (evita "la tua infanzia", "la tua scuola", "cosa ricordi della tua…").\n` +
    `Usa invece: "Cosa sai dell'infanzia di ${subject}?", "Cosa ti ha raccontato ${subject} di…?", "Cosa hanno condiviso i familiari su…?".\n` +
    `Per propose_draft: al PRIMO scambio memorial, se la preferenza di voce narrativa non è in memoria, chiedi se preferiscono:\n` +
    `(A) biografia in terza persona su ${subject}, oppure (B) voce testimone in prima persona ("Ricordo che ${subject}…" / "Mio padre mi raccontava…").\n` +
    `Ricorda la scelta nella memoria della conversazione e rispettala in tutte le bozze.\n` +
    `Non inventare fatti su ${subject}; usa solo ciò che condivide lo scrittore.\n` +
    `=== FINE BIOGRAFIA MEMORIAL ===`,
  fr: (subject, writer) =>
    `=== BIOGRAPHIE MÉMORIALE (obligatoire) ===\n` +
    `${writer || 'L\'auteur'} écrit une biographie mémoriale sur ${subject}, une personne décédée — PAS sur sa propre vie.\n` +
    `Interrogez l'ÉCRIVAIN (deuxième personne : « vous ») sur ce qu'il/elle sait de ${subject} (troisième personne).\n` +
    `N'utilisez JAMAIS « votre enfance », « votre école », etc. comme si l'écrivain avait vécu la vie du protagoniste.\n` +
    `Préférez : « Que savez-vous de l'enfance de ${subject} ? », « Qu'est-ce que ${subject} vous a raconté ? ».\n` +
    `Pour propose_draft : au premier échange mémorial, si la préférence de voix n'est pas en mémoire, demandez (A) troisième personne sur ${subject} ou (B) voix témoin à la première personne.\n` +
    `Mémorisez le choix et respectez-le dans toutes les ébauches.\n` +
    `=== FIN BIOGRAPHIE MÉMORIALE ===`,
  de: (subject, writer) =>
    `=== GEDENKBIOGRAFIE (Pflicht) ===\n` +
    `${writer || 'Der Autor'} schreibt eine Gedenkbiografie über ${subject}, eine verstorbene Person — NICHT über sich selbst.\n` +
    `Fragen Sie den SCHREIBENDEN (zweite Person: « Sie »), was er/sie über ${subject} weiß (dritte Person).\n` +
    `Verwenden Sie NIEMALS « Ihre Kindheit », « Ihre Schule » usw., als hätte der Schreibende das Leben des Protagonisten gelebt.\n` +
    `Stattdessen: « Was wissen Sie über ${subject}s Kindheit? », « Was hat ${subject} Ihnen erzählt? ».\n` +
    `Für propose_draft: beim ersten Memorial-Gespräch, wenn keine Stimmpräferenz in der Erinnerung ist, fragen Sie (A) dritte Person über ${subject} oder (B) Zeugenstimme in der ersten Person.\n` +
    `Merken Sie sich die Wahl und halten Sie sie in allen Entwürfen ein.\n` +
    `=== ENDE GEDENKBIOGRAFIE ===`,
};

export function buildMemorialNarrativeBlock(
  ctx: BiographyNarrativeContext,
  locale: string = 'en'
): string {
  if (!isMemorialNarrative(ctx)) return '';
  const lang = (['en', 'it', 'fr', 'de'].includes(locale.slice(0, 2)) ? locale.slice(0, 2) : 'en') as Language;
  const fn = MEMORIAL_BLOCK[lang] ?? MEMORIAL_BLOCK.en;
  return `\n\n${fn(ctx.subjectName.trim(), ctx.writerName.trim())}`;
}

/** Short suffix for edge-function prompts (ai-assistant). */
export function buildMemorialPromptSuffix(
  ctx: BiographyNarrativeContext,
  locale: string = 'en'
): string {
  if (!isMemorialNarrative(ctx)) return '';
  const lang = locale.slice(0, 2);
  const { subjectName: subject, writerName: writer } = ctx;
  if (lang === 'it') {
    return (
      `\n\nContesto memorial: ${writer || 'lo scrittore'} scrive su ${subject} (scomparso/a). ` +
      `Genera domande allo scrittore su ciò che sa di ${subject}, mai in seconda persona come se fosse la sua vita. ` +
      `Esempio: "Cosa sai dell'infanzia di ${subject}?" non "Cosa ricordi della tua infanzia?".`
    );
  }
  if (lang === 'fr') {
    return (
      `\n\nContexte mémorial : ${writer || "l'auteur"} écrit sur ${subject} (décédé/e). ` +
      `Posez des questions à l'écrivain sur ce qu'il/elle sait de ${subject}, jamais « votre enfance ».`
    );
  }
  if (lang === 'de') {
    return (
      `\n\nMemorial-Kontext: ${writer || 'der Autor'} schreibt über ${subject} (verstorben). ` +
      `Fragen an den Schreibenden, was er/sie über ${subject} weiß — nie « Ihre Kindheit ».`
    );
  }
  return (
    `\n\nMemorial context: ${writer || 'the writer'} is writing about ${subject} (deceased). ` +
    `Ask the writer what they know about ${subject}, never "your childhood" as if it were the writer's life. ` +
    `Example: "What do you know about ${subject}'s childhood?" not "What do you remember from your childhood?".`
  );
}

type PromptPair = { prompt: string; starter: string };

/** Adapt autobiography-style fallback prompts for memorial biographies. */
export function adaptMemorialPrompt(
  prompt: string,
  starter: string,
  ctx: BiographyNarrativeContext,
  locale: string = 'en'
): PromptPair {
  if (!isMemorialNarrative(ctx)) return { prompt, starter };
  const subject = ctx.subjectName.trim();
  const lang = locale.slice(0, 2);

  let p = prompt;
  let s = starter;

  if (lang === 'it') {
    p = p
      .replace(/\b[Cc]om['']?era la tua\b/g, `Com'era la`)
      .replace(/\b[Dd]escrivi la tua\b/g, 'Descrivi la')
      .replace(/\b[Dd]escrivi un/g, 'Descrivi un')
      .replace(/\b[Cc]hi era il tuo\b/g, `Chi era il`)
      .replace(/\b[Cc]hi era la tua\b/g, `Chi era la`)
      .replace(/\b[Cc]osa ti ricordi della tua\b/g, `Cosa sai della`)
      .replace(/\b[Cc]osa ti ricordi del tuo\b/g, `Cosa sai del`)
      .replace(/\b[Cc]osa ti ricordi del tuo\b/g, `Cosa sai del`)
      .replace(/\b[Cc]ome era la tua\b/g, `Come era la`)
      .replace(/\b[Qq]uale era la tua\b/g, `Quale era la`)
      .replace(/\b[Qq]uale era il tuo\b/g, `Quale era il`)
      .replace(/\b[Dd]urante l['']estate, tu\b/g, `Durante l'estate, ${subject}`)
      .replace(/\b[Tt]u\b/g, subject)
      .replace(/\btua\b/gi, `di ${subject}`)
      .replace(/\btuo\b/gi, `di ${subject}`)
      .replace(/\btuoi\b/gi, `di ${subject}`)
      .replace(/\btue\b/gi, `di ${subject}`)
      .replace(/\b[Cc]osa sai dell'infanzia di di /g, `Cosa sai dell'infanzia di `);
    p = p.replace(/\bdi di\b/g, 'di');
    s = s
      .replace(/^La mia\b/i, `La`)
      .replace(/^Il mio\b/i, `Il`)
      .replace(/^I miei\b/i, `I`)
      .replace(/^Mi ricordo\b/i, `Si racconta che`)
      .replace(/^Quando ero\b/i, `Quando ${subject} era`)
      .replace(/^Durante l'estate, io\b/i, `Durante l'estate, ${subject}`);
    if (!p.includes(subject) && !p.match(/di ${subject}/)) {
      p = p.replace(/^(Descrivi|Com'era|Come era|Chi era|Cosa|Quale)/, (m) => `${m} (riguardo ${subject})`);
    }
    return { prompt: p, starter: s };
  }

  if (lang === 'fr') {
    p = p
      .replace(/\bvotre\b/gi, `de ${subject}`)
      .replace(/\bvos\b/gi, `de ${subject}`)
      .replace(/\bvous\b/gi, subject)
      .replace(/\btu\b/gi, subject)
      .replace(/\bton\b/gi, `de ${subject}`)
      .replace(/\bta\b/gi, `de ${subject}`)
      .replace(/\btes\b/gi, `de ${subject}`);
    s = s.replace(/^Je\b/i, `On raconte que ${subject}`);
    return { prompt: p, starter: s };
  }

  if (lang === 'de') {
    p = p
      .replace(/\b[Ii]hre\b/g, `${subject}s`)
      .replace(/\b[Ii]hr\b/g, `${subject}s`)
      .replace(/\b[Dd]ein\b/g, `${subject}s`)
      .replace(/\b[Dd]eine\b/g, `${subject}s`)
      .replace(/\b[Dd]u\b/g, subject);
    s = s.replace(/^Ich\b/i, `Man erzählt, dass ${subject}`);
    return { prompt: p, starter: s };
  }

  // English (default)
  p = p
    .replace(/\b[Dd]escribe your\b/g, `Describe ${subject}'s`)
    .replace(/\b[Ww]hat was your\b/g, `What was ${subject}'s`)
    .replace(/\b[Ww]hat's your\b/g, `What do you know about ${subject}'s`)
    .replace(/\b[Ww]hat did you\b/g, `What do you know ${subject}`)
    .replace(/\b[Ww]ho was your\b/g, `Who was ${subject}'s`)
    .replace(/\b[Ww]ho did you\b/g, `Who did ${subject}`)
    .replace(/\b[Dd]uring summer, you\b/g, `During summer, ${subject}`)
    .replace(/\b[Ww]hen you were\b/g, `When ${subject} was`)
    .replace(/\b[Ww]hat do you remember\b/g, `What do you know about ${subject}`)
    .replace(/\byou\b/gi, (match, offset) => (offset === 0 ? match : subject))
    .replace(/\byour\b/gi, `${subject}'s`);
  s = s
    .replace(/^My\b/i, `${subject}'s`)
    .replace(/^I remember\b/i, `It is said that ${subject}`)
    .replace(/^When I was\b/i, `When ${subject} was`)
    .replace(/^As a child, I\b/i, `As a child, ${subject}`);

  return { prompt: p, starter: s };
}

export function adaptMemorialPrompts(
  prompts: PromptPair[],
  ctx: BiographyNarrativeContext | undefined,
  locale: string = 'en'
): PromptPair[] {
  if (!ctx || !isMemorialNarrative(ctx)) return prompts;
  return prompts.map(({ prompt, starter }) => adaptMemorialPrompt(prompt, starter, ctx, locale));
}
