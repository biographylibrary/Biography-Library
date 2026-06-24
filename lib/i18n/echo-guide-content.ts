import type { Language } from '@/lib/i18n/translations';

export type EchoIcebreakerPoolSet = {
  writing: string[];
  capabilities: string[];
};

export type EchoIcebreakerPoolsByContext = {
  hubOnboarding: EchoIcebreakerPoolSet;
  hub: EchoIcebreakerPoolSet;
  editorSections: EchoIcebreakerPoolSet;
  editorFreeflow: EchoIcebreakerPoolSet;
  publication: EchoIcebreakerPoolSet;
  nudge: EchoIcebreakerPoolSet;
};

export type EchoGuideCopy = {
  usageGuide: string;
  usageGuideIcebreaker: string;
  icebreakerGuideHint: string;
};

const it: EchoGuideCopy & { pools: EchoIcebreakerPoolsByContext } = {
  usageGuideIcebreaker: 'Come usare questa AI',
  icebreakerGuideHint: 'Guida e informazioni:',
  usageGuide: `Ciao, sono Echo — la tua guida per scrivere la biografia in Biography Library. Puoi parlarmi a voce o per iscritto, in linguaggio naturale.

**Cosa puoi chiedermi**
- **Scrivere** — idee, domande per tirare fuori ricordi, bozze di testo (le inserisci tu dopo averle lette)
- **Capitoli** — quali hai completato, segnare o riaprire un capitolo, leggere cosa hai già scritto
- **Strumenti dell'app** — import ed export, foto, struttura del libro, note, modalità sezioni o testo libero
- **Pubblicazione** — revisione finale, bozze PDF, stato della tua biografia
- **Orientamento** — come funziona l'app, cosa fare dopo, riassunto di quello che abbiamo detto

**Come usarci al meglio**
- Sei già sul capitolo selezionato a sinistra — non serve dirmi quale, a meno che tu non voglia un altro
- Chiedi una cosa alla volta; per i testi lunghi chiedi una **bozza** e conferma prima di inserirla
- Puoi usare il **microfono** o la tastiera
- I suggerimenti sotto la chat sono esempi cliccabili — provaci

**Memoria della conversazione**
- Conservo un **riassunto interno** della nostra chat, così posso seguirti anche dopo molti messaggi
- Il testo che inserisci nei **capitoli resta sempre nell'editor** — non dipende dalla chat
- Chiedimi un **riassunto** di cosa abbiamo detto quando vuoi un recap veloce

**I miei paletti**
- **Non invento fatti** sulla tua vita: lavoro solo su quello che mi racconti
- Le **bozze** le preparo io, ma **tu decidi** se inserirle nell'editor
- Per azioni importanti (es. cambiare modalità, segnare un capitolo completo) ti chiedo conferma
- Se non so qualcosa sull'app, te lo dico — non indovino

**Uso etico e privacy**
- I tuoi ricordi restano **tuoi**: mantieni la piena proprietà dei contenuti
- **Non vendiamo** i tuoi dati né li usiamo per pubblicità
- Non esponiamo la tua biografia oltre le **impostazioni di privacy** che scegli tu
- L'elaborazione AI è **temporanea** e finalizzata solo ad assisterti nella scrittura

**Tutto in Svizzera**
- I dati sono ospitati **in Svizzera** e non escono dalla giurisdizione svizzera
- Anche l'elaborazione AI avviene tramite infrastruttura **residente in Svizzera** (Infomaniak)
- Biography Library è ospitata in **Svizzera** — vedi Privacy e Termini per i dettagli

Chiedimi quello che ti serve — quando vuoi rivedere questa guida, clicca «Come usare questa AI» in fondo ai suggerimenti.`,
  pools: {
    hubOnboarding: {
      writing: [
        'Come inizio a scrivere la mia biografia?',
        'Qual è la differenza tra percorso guidato e scrittura libera?',
        'Ho già del testo scritto — da dove comincio?',
        'Cosa mi conviene: capitoli guidati o testo libero?',
        'Non so da quale periodo della vita partire — mi aiuti?',
      ],
      capabilities: [
        'Cosa puoi fare per me in questa app?',
        'In cosa puoi aiutarmi oltre alla scrittura?',
        'Puoi aiutarmi a scegliere la lingua dell\'app?',
        'Come completo la configurazione iniziale?',
        'Cosa succede dopo la registrazione?',
        'Come funziona l\'app da zero?',
        'Posso importare un documento che ho già scritto?',
        'Come cambio titolo o privacy della biografia?',
      ],
    },
    hub: {
      writing: [
        'Come riprendo una biografia in corso?',
        'Da dove riparto se sono fermo da tempo?',
        'Come scelgo su quale capitolo concentrarmi?',
        'Ho un ricordo ma non so come metterlo in ordine — mi aiuti?',
      ],
      capabilities: [
        'Cosa puoi fare per me in questa app?',
        'In cosa puoi aiutarmi?',
        'Come funziona l\'app?',
        'Posso importare un documento Word?',
        'Come passo da sezioni a scrittura libera?',
        'Come esporto la biografia in PDF?',
        'Come funziona la revisione e la pubblicazione?',
        'Dove trovo le mie biografie in corso?',
      ],
    },
    editorSections: {
      writing: [
        'Da dove comincio con «{section}»?',
        'Quali domande dovrei farmi per «{section}»?',
        'Ho un ricordo ma non so come metterlo in ordine — mi aiuti?',
        'Puoi proporti una bozza per «{section}»?',
        'Quali dettagli rendono viva la sezione «{section}»?',
        'Come posso dare più ritmo al testo di «{section}»?',
        'Ho solo frammenti sparsi su «{section}» — come li unisco?',
        'Il testo di «{section}» è troppo lungo — come lo accorcio senza perdere il senso?',
        'Come collego «{section}» al capitolo successivo?',
        'Mi fai domande per tirare fuori altri ricordi su «{section}»?',
      ],
      capabilities: [
        'Cosa posso chiederti oltre a scrivere questo capitolo?',
        'Segna «{section}» come completa',
        'Riapri «{section}» per modificarla',
        'Quali capitoli ho già completato?',
        'Leggi cosa ho scritto in un altro capitolo',
        'Come passo da sezioni a scrittura libera?',
        'Come importo un documento Word?',
        'Come esporto la biografia in PDF?',
        'Come aggiungo foto a un capitolo?',
        'A cosa serve la struttura del libro?',
        'Come funzionano note e promemoria?',
        'Posso registrare i ricordi a voce?',
        'Come funziona la revisione e pubblicazione?',
        'Come cambio la privacy della biografia?',
        'Qual è lo stato della mia pubblicazione?',
        'Puoi riassumere quello che abbiamo discusso?',
      ],
    },
    editorFreeflow: {
      writing: [
        'Come organizzo il testo in capitoli?',
        'Puoi rivedere quello che ho scritto finora?',
        'Suggeriscimi un titolo per un capitolo sulla mia famiglia',
        'Cosa dovrebbe includere una biografia completa?',
        'Come trasformo i ricordi detti a voce in testo?',
        'Il testo è troppo lungo — come lo rendo più leggibile?',
        'Come divido il testo in parti con senso?',
        'Puoi proporti una bozza da inserire nel documento?',
      ],
      capabilities: [
        'Cosa posso chiederti con il testo libero?',
        'Converti la biografia in capitoli senza perdere il testo',
        'Come passo da testo libero a sezioni guidate?',
        'Come importo un documento Word?',
        'Come esporto in PDF?',
        'Come aggiungo foto?',
        'A cosa serve la struttura del libro?',
        'Come funzionano note e promemoria?',
        'Come funziona la revisione finale?',
        'Qual è lo stato della mia pubblicazione?',
        'Quali capitoli avrei se convertissi in sezioni?',
        'Puoi riassumere quello che abbiamo discusso?',
      ],
    },
    publication: {
      writing: [
        'Cosa devo controllare nel testo prima di pubblicare?',
        'Il testo è pronto per la revisione finale?',
        'Ci sono parti del testo che dovrei migliorare prima della pubblicazione?',
      ],
      capabilities: [
        'Come funziona la revisione finale?',
        'Cosa succede dopo l\'approvazione?',
        'Posso ancora modificare il testo prima di pubblicare?',
        'Qual è lo stato della mia pubblicazione?',
        'Cos\'è la bozza PDF e quante ne posso fare?',
        'Cosa succede se la revisione AI trova problemi?',
        'Come torno a modificare il testo dopo la revisione?',
        'Come esporto in PDF?',
        'Cosa significa «versione finale»?',
        'Quando posso pubblicare la biografia?',
      ],
    },
    nudge: {
      writing: [
        'Hai altre idee su cosa scrivere adesso?',
        'Su cosa dovrei concentrarmi ora?',
        'Qual è il prossimo capitolo da affrontare?',
        'Cosa potrei aggiungere a questo capitolo?',
      ],
      capabilities: [
        'Cos\'altro posso chiederti da qui?',
        'Cosa puoi fare per me in questa app?',
        'Come esporto in PDF?',
        'Puoi riassumere quello che abbiamo discusso?',
        'Quali funzioni dell\'app puoi spiegarmi?',
        'Quali capitoli ho già completato?',
        'Come funziona la revisione e pubblicazione?',
        'Come importo o esporto testo?',
      ],
    },
  },
};

const en: EchoGuideCopy & { pools: EchoIcebreakerPoolsByContext } = {
  usageGuideIcebreaker: 'How to use this AI',
  icebreakerGuideHint: 'Guide and information:',
  usageGuide: `Hello, I'm Echo — your guide for writing your biography in Biography Library. You can speak to me or type, in natural language.

**What you can ask me**
- **Writing** — ideas, questions to draw out memories, draft text (you insert it after reading)
- **Chapters** — which you've completed, mark or reopen a chapter, read what you've already written
- **App tools** — import and export, photos, book structure, notes, sections or free-flow mode
- **Publication** — final review, PDF drafts, your biography's status
- **Orientation** — how the app works, what to do next, a summary of our conversation

**How to get the most from me**
- You're already on the chapter selected on the left — no need to tell me which, unless you want another
- Ask one thing at a time; for long text ask for a **draft** and confirm before inserting
- You can use the **microphone** or the keyboard
- The suggestions below the chat are clickable examples — try them

**Conversation memory**
- I keep an **internal summary** of our chat so I can follow you even after many messages
- Text you insert in **chapters always stays in the editor** — it does not depend on the chat
- Ask me to **summarize** what we discussed anytime for a quick recap

**My boundaries**
- I **don't invent facts** about your life: I work only from what you tell me
- I prepare **drafts**, but **you decide** whether to insert them in the editor
- For important actions (e.g. changing mode, marking a chapter complete) I ask for confirmation
- If I don't know something about the app, I'll say so — I won't guess

**Ethics and privacy**
- Your memories remain **yours**: you keep full ownership of your content
- We **don't sell** your data or use it for advertising
- We don't expose your biography beyond the **privacy settings** you choose
- AI processing is **temporary** and only to assist your writing

**Everything in Switzerland**
- Data is hosted **in Switzerland** and never leaves Swiss jurisdiction
- AI processing also runs on infrastructure **resident in Switzerland** (Infomaniak)
- Biography Library is hosted in **Switzerland** — see Privacy and Terms for details

Ask me what you need — to review this guide anytime, click «How to use this AI» at the bottom of the suggestions.`,
  pools: {
    hubOnboarding: {
      writing: [
        'How do I start writing my biography?',
        'What is the difference between guided and free writing?',
        'I already have text written — where do I begin?',
        'Which suits me better: guided chapters or free writing?',
        'I don\'t know which period of life to start with — can you help?',
      ],
      capabilities: [
        'What can you do for me in this app?',
        'What can you help with besides writing?',
        'Can you help me choose the app language?',
        'How do I complete the initial setup?',
        'What happens after registration?',
        'How does the app work from scratch?',
        'Can I import a document I\'ve already written?',
        'How do I change the biography title or privacy?',
      ],
    },
    hub: {
      writing: [
        'How do I resume a biography in progress?',
        'Where do I pick up if I\'ve been away for a while?',
        'How do I choose which chapter to focus on?',
        'I have a memory but don\'t know how to order it — can you help?',
      ],
      capabilities: [
        'What can you do for me in this app?',
        'What can you help me with?',
        'How does the app work?',
        'Can I import a Word document?',
        'How do I switch between sections and free writing?',
        'How do I export the biography to PDF?',
        'How do review and publication work?',
        'Where do I find my biographies in progress?',
      ],
    },
    editorSections: {
      writing: [
        'Where should I begin with «{section}»?',
        'What questions should I ask myself for «{section}»?',
        'I have a memory but don\'t know how to order it — can you help?',
        'Can you suggest a draft for «{section}»?',
        'What details make «{section}» come alive?',
        'How can I give more rhythm to the text in «{section}»?',
        'I only have scattered fragments about «{section}» — how do I join them?',
        'The text in «{section}» is too long — how do I shorten it without losing meaning?',
        'How do I connect «{section}» to the next chapter?',
        'Can you ask me questions to bring out more memories about «{section}»?',
      ],
      capabilities: [
        'What can I ask you besides writing this chapter?',
        'Mark «{section}» as complete',
        'Reopen «{section}» so I can edit it',
        'Which chapters have I already completed?',
        'Read what I wrote in another chapter',
        'How do I switch from sections to free writing?',
        'How do I import a Word document?',
        'How do I export the biography to PDF?',
        'How do I add photos to a chapter?',
        'What is book structure for?',
        'How do notes and reminders work?',
        'Can I record memories by voice?',
        'How do review and publication work?',
        'How do I change the biography privacy?',
        'What is my publication status?',
        'Can you summarize what we discussed?',
      ],
    },
    editorFreeflow: {
      writing: [
        'How should I organize my text into chapters?',
        'Can you review what I\'ve written so far?',
        'Suggest a title for a chapter about my family',
        'What should a complete biography include?',
        'How do I turn spoken memories into written text?',
        'The text is too long — how do I make it more readable?',
        'How do I split the text into meaningful parts?',
        'Can you suggest a draft to insert in the document?',
      ],
      capabilities: [
        'What can I ask you in free-flow mode?',
        'Convert the biography to chapters without losing text',
        'How do I switch from free writing to guided sections?',
        'How do I import a Word document?',
        'How do I export to PDF?',
        'How do I add photos?',
        'What is book structure for?',
        'How do notes and reminders work?',
        'How does final review work?',
        'What is my publication status?',
        'Which chapters would I have if I converted to sections?',
        'Can you summarize what we discussed?',
      ],
    },
    publication: {
      writing: [
        'What should I check in the text before publishing?',
        'Is the text ready for final review?',
        'Are there parts I should improve before publication?',
      ],
      capabilities: [
        'How does final review work?',
        'What happens after approval?',
        'Can I still edit the text before publishing?',
        'What is my publication status?',
        'What is a PDF draft and how many can I make?',
        'What happens if AI review finds problems?',
        'How do I go back to editing after review?',
        'How do I export to PDF?',
        'What does «final version» mean?',
        'When can I publish the biography?',
      ],
    },
    nudge: {
      writing: [
        'Any ideas for what to write next?',
        'What should I focus on now?',
        'What is the next chapter to tackle?',
        'What could I add to this chapter?',
      ],
      capabilities: [
        'What else can I ask you here?',
        'What can you do for me in this app?',
        'How do I export to PDF?',
        'Can you summarize what we discussed?',
        'Which app features can you explain?',
        'Which chapters have I completed?',
        'How do review and publication work?',
        'How do I import or export text?',
      ],
    },
  },
};

const fr: EchoGuideCopy & { pools: EchoIcebreakerPoolsByContext } = {
  usageGuideIcebreaker: 'Comment utiliser cette IA',
  icebreakerGuideHint: 'Guide et informations :',
  usageGuide: `Bonjour, je suis Echo — votre guide pour écrire votre biographie dans Biography Library. Vous pouvez me parler ou m'écrire, en langage naturel.

**Ce que vous pouvez me demander**
- **Écrire** — idées, questions pour faire remonter les souvenirs, brouillons (vous les insérez après lecture)
- **Chapitres** — lesquels sont terminés, marquer ou rouvrir un chapitre, lire ce que vous avez déjà écrit
- **Outils de l'app** — import et export, photos, structure du livre, notes, mode sections ou texte libre
- **Publication** — relecture finale, brouillons PDF, état de votre biographie
- **Orientation** — fonctionnement de l'app, prochaines étapes, résumé de notre échange

**Comment bien m'utiliser**
- Vous êtes déjà sur le chapitre sélectionné à gauche — inutile de me le dire, sauf si vous voulez un autre
- Une question à la fois ; pour un long texte demandez un **brouillon** et confirmez avant insertion
- Vous pouvez utiliser le **microphone** ou le clavier
- Les suggestions sous le chat sont des exemples cliquables — essayez-les

**Mémoire de la conversation**
- Je conserve un **résumé interne** de notre échange pour vous suivre même après de nombreux messages
- Le texte inséré dans les **chapitres reste toujours dans l'éditeur** — il ne dépend pas du chat
- Demandez-moi un **résumé** de ce que nous avons dit pour un rappel rapide

**Mes limites**
- Je **n'invente pas de faits** sur votre vie : je travaille uniquement à partir de ce que vous me racontez
- Je prépare des **brouillons**, mais **vous décidez** de les insérer dans l'éditeur
- Pour les actions importantes (ex. changer de mode, marquer un chapitre terminé) je demande confirmation
- Si je ne sais pas quelque chose sur l'app, je le dis — je ne devine pas

**Éthique et confidentialité**
- Vos souvenirs restent **les vôtres** : vous gardez la pleine propriété de vos contenus
- Nous **ne vendons pas** vos données ni ne les utilisons pour la publicité
- Nous n'exposons pas votre biographie au-delà des **paramètres de confidentialité** que vous choisissez
- Le traitement IA est **temporaire** et uniquement pour vous aider à écrire

**Tout en Suisse**
- Les données sont hébergées **en Suisse** et ne quittent pas la juridiction suisse
- Le traitement IA passe aussi par une infrastructure **résidente en Suisse** (Infomaniak)
- Biography Library est hébergée en **Suisse** — voir Confidentialité et Conditions pour les détails

Demandez-moi ce dont vous avez besoin — pour revoir ce guide, cliquez sur « Comment utiliser cette IA » en bas des suggestions.`,
  pools: {
    hubOnboarding: {
      writing: [
        'Comment commencer à écrire ma biographie ?',
        'Quelle est la différence entre parcours guidé et écriture libre ?',
        'J\'ai déjà du texte écrit — par où commencer ?',
        'Que me convient le mieux : chapitres guidés ou texte libre ?',
        'Je ne sais pas par quelle période commencer — pouvez-vous m\'aider ?',
      ],
      capabilities: [
        'Que pouvez-vous faire pour moi dans cette app ?',
        'En quoi pouvez-vous m\'aider au-delà de l\'écriture ?',
        'Pouvez-vous m\'aider à choisir la langue de l\'application ?',
        'Comment terminer la configuration initiale ?',
        'Que se passe-t-il après l\'inscription ?',
        'Comment fonctionne l\'app depuis le début ?',
        'Puis-je importer un document déjà écrit ?',
        'Comment changer le titre ou la confidentialité de la biographie ?',
      ],
    },
    hub: {
      writing: [
        'Comment reprendre une biographie en cours ?',
        'Par où reprendre après une pause ?',
        'Comment choisir le chapitre sur lequel me concentrer ?',
        'J\'ai un souvenir mais je ne sais pas comment l\'organiser — pouvez-vous m\'aider ?',
      ],
      capabilities: [
        'Que pouvez-vous faire pour moi dans cette app ?',
        'En quoi pouvez-vous m\'aider ?',
        'Comment fonctionne l\'application ?',
        'Puis-je importer un document Word ?',
        'Comment passer des sections à l\'écriture libre ?',
        'Comment exporter la biographie en PDF ?',
        'Comment fonctionnent la relecture et la publication ?',
        'Où trouver mes biographies en cours ?',
      ],
    },
    editorSections: {
      writing: [
        'Par où commencer pour « {section} » ?',
        'Quelles questions me poser pour « {section} » ?',
        'J\'ai un souvenir mais je ne sais pas comment l\'organiser — pouvez-vous m\'aider ?',
        'Pouvez-vous proposer un brouillon pour « {section} » ?',
        'Quels détails rendent « {section} » vivant ?',
        'Comment donner plus de rythme au texte de « {section} » ?',
        'Je n\'ai que des fragments sur « {section} » — comment les relier ?',
        'Le texte de « {section} » est trop long — comment le raccourcir ?',
        'Comment relier « {section} » au chapitre suivant ?',
        'Pouvez-vous me poser des questions pour faire remonter d\'autres souvenirs sur « {section} » ?',
      ],
      capabilities: [
        'Que puis-je vous demander en dehors de l\'écriture de ce chapitre ?',
        'Marquer « {section} » comme terminée',
        'Rouvrir « {section} » pour la modifier',
        'Quels chapitres ai-je déjà terminés ?',
        'Lisez ce que j\'ai écrit dans un autre chapitre',
        'Comment passer des sections à l\'écriture libre ?',
        'Comment importer un document Word ?',
        'Comment exporter la biographie en PDF ?',
        'Comment ajouter des photos à un chapitre ?',
        'À quoi sert la structure du livre ?',
        'Comment fonctionnent notes et rappels ?',
        'Puis-je enregistrer des souvenirs à la voix ?',
        'Comment fonctionnent relecture et publication ?',
        'Comment changer la confidentialité de la biographie ?',
        'Quel est l\'état de ma publication ?',
        'Pouvez-vous résumer notre échange ?',
      ],
    },
    editorFreeflow: {
      writing: [
        'Comment organiser mon texte en chapitres ?',
        'Pouvez-vous relire ce que j\'ai écrit jusqu\'ici ?',
        'Proposez un titre pour un chapitre sur ma famille',
        'Que doit inclure une biographie complète ?',
        'Comment transformer des souvenirs oraux en texte ?',
        'Le texte est trop long — comment le rendre plus lisible ?',
        'Comment diviser le texte en parties cohérentes ?',
        'Pouvez-vous proposer un brouillon à insérer dans le document ?',
      ],
      capabilities: [
        'Que puis-je vous demander en mode texte libre ?',
        'Convertir la biographie en chapitres sans perdre le texte',
        'Comment passer du texte libre aux sections guidées ?',
        'Comment importer un document Word ?',
        'Comment exporter en PDF ?',
        'Comment ajouter des photos ?',
        'À quoi sert la structure du livre ?',
        'Comment fonctionnent notes et rappels ?',
        'Comment fonctionne la relecture finale ?',
        'Quel est l\'état de ma publication ?',
        'Quels chapitres aurais-je si je convertissais en sections ?',
        'Pouvez-vous résumer notre échange ?',
      ],
    },
    publication: {
      writing: [
        'Que dois-je vérifier dans le texte avant de publier ?',
        'Le texte est-il prêt pour la relecture finale ?',
        'Y a-t-il des parties à améliorer avant publication ?',
      ],
      capabilities: [
        'Comment fonctionne la relecture finale ?',
        'Que se passe-t-il après l\'approbation ?',
        'Puis-je encore modifier le texte avant publication ?',
        'Quel est l\'état de ma publication ?',
        'Qu\'est-ce qu\'un brouillon PDF et combien puis-je en faire ?',
        'Que se passe-t-il si la relecture IA trouve des problèmes ?',
        'Comment revenir à l\'édition après la relecture ?',
        'Comment exporter en PDF ?',
        'Que signifie « version finale » ?',
        'Quand puis-je publier la biographie ?',
      ],
    },
    nudge: {
      writing: [
        'D\'autres idées pour la suite ?',
        'Sur quoi devrais-je me concentrer maintenant ?',
        'Quel est le prochain chapitre à aborder ?',
        'Que pourrais-je ajouter à ce chapitre ?',
      ],
      capabilities: [
        'Que puis-je encore vous demander ici ?',
        'Que pouvez-vous faire pour moi dans cette app ?',
        'Comment exporter en PDF ?',
        'Pouvez-vous résumer notre échange ?',
        'Quelles fonctions de l\'app pouvez-vous expliquer ?',
        'Quels chapitres ai-je terminés ?',
        'Comment fonctionnent relecture et publication ?',
        'Comment importer ou exporter du texte ?',
      ],
    },
  },
};

const de: EchoGuideCopy & { pools: EchoIcebreakerPoolsByContext } = {
  usageGuideIcebreaker: 'So nutzen Sie diese KI',
  icebreakerGuideHint: 'Anleitung und Informationen:',
  usageGuide: `Hallo, ich bin Echo — Ihr Begleiter beim Schreiben Ihrer Biografie in Biography Library. Sie können mit mir sprechen oder schreiben, in natürlicher Sprache.

**Was Sie mich fragen können**
- **Schreiben** — Ideen, Fragen zum Erinnern, Textentwürfe (Sie fügen sie nach dem Lesen ein)
- **Kapitel** — welche abgeschlossen sind, Kapitel markieren oder wieder öffnen, bereits Geschriebenes lesen
- **App-Funktionen** — Import und Export, Fotos, Buchstruktur, Notizen, Abschnitte oder Freitext
- **Veröffentlichung** — Endprüfung, PDF-Entwürfe, Status Ihrer Biografie
- **Orientierung** — App-Funktion, nächste Schritte, Zusammenfassung unseres Gesprächs

**So nutzen Sie mich am besten**
- Sie sind bereits beim links gewählten Kapitel — Sie müssen es nicht nennen, außer Sie möchten ein anderes
- Eine Frage nach der anderen; bei langem Text einen **Entwurf** anfordern und vor dem Einfügen bestätigen
- Sie können **Mikrofon** oder Tastatur verwenden
- Die Vorschläge unter dem Chat sind klickbare Beispiele — probieren Sie sie

**Gesprächserinnerung**
- Ich führe eine **interne Zusammenfassung** unseres Chats, um Sie auch nach vielen Nachrichten zu begleiten
- Text in **Kapiteln bleibt immer im Editor** — er hängt nicht vom Chat ab
- Bitten Sie mich jederzeit um eine **Zusammenfassung** unseres Gesprächs

**Meine Grenzen**
- Ich **erfinde keine Fakten** über Ihr Leben: Ich arbeite nur mit dem, was Sie mir erzählen
- Ich bereite **Entwürfe** vor, aber **Sie entscheiden**, ob Sie sie einfügen
- Bei wichtigen Aktionen (z. B. Moduswechsel, Kapitel abschließen) bitte ich um Bestätigung
- Wenn ich etwas über die App nicht weiß, sage ich es — ich rate nicht

**Ethik und Datenschutz**
- Ihre Erinnerungen bleiben **Ihre**: Sie behalten das volle Eigentum an Ihren Inhalten
- Wir **verkaufen** Ihre Daten nicht und nutzen sie nicht für Werbung
- Wir zeigen Ihre Biografie nicht über die von Ihnen gewählten **Datenschutzeinstellungen** hinaus
- Die KI-Verarbeitung ist **temporär** und dient nur Ihrer Schreibunterstützung

**Alles in der Schweiz**
- Daten werden **in der Schweiz** gehostet und verlassen die Schweizer Rechtsordnung nicht
- Auch die KI-Verarbeitung läuft über **in der Schweiz ansässige** Infrastruktur (Infomaniak)
- Biography Library wird **in der Schweiz** betrieben — siehe Datenschutz und AGB

Fragen Sie mich, was Sie brauchen — um diese Anleitung erneut zu lesen, klicken Sie unten auf «So nutzen Sie diese KI».`,
  pools: {
    hubOnboarding: {
      writing: [
        'Wie beginne ich mit meiner Biografie?',
        'Was ist der Unterschied zwischen geführtem Weg und freiem Schreiben?',
        'Ich habe schon Text — wo fange ich an?',
        'Was passt besser: geführte Kapitel oder Freitext?',
        'Ich weiß nicht, mit welcher Lebensphase ich beginnen soll — können Sie helfen?',
      ],
      capabilities: [
        'Was können Sie für mich in dieser App tun?',
        'Wobei können Sie mir außer beim Schreiben helfen?',
        'Können Sie mir bei der App-Sprache helfen?',
        'Wie schließe ich die Ersteinrichtung ab?',
        'Was passiert nach der Registrierung?',
        'Wie funktioniert die App von Grund auf?',
        'Kann ich ein bereits geschriebenes Dokument importieren?',
        'Wie ändere ich Titel oder Datenschutz der Biografie?',
      ],
    },
    hub: {
      writing: [
        'Wie setze ich eine begonnene Biografie fort?',
        'Wo fange ich nach einer Pause wieder an?',
        'Wie wähle ich das Kapitel, auf das ich mich konzentriere?',
        'Ich habe eine Erinnerung, weiß aber nicht wie ich sie ordne — können Sie helfen?',
      ],
      capabilities: [
        'Was können Sie für mich in dieser App tun?',
        'Wobei können Sie mir helfen?',
        'Wie funktioniert die App?',
        'Kann ich ein Word-Dokument importieren?',
        'Wie wechsle ich von Abschnitten zu freiem Schreiben?',
        'Wie exportiere ich die Biografie als PDF?',
        'Wie funktionieren Prüfung und Veröffentlichung?',
        'Wo finde ich meine laufenden Biografien?',
      ],
    },
    editorSections: {
      writing: [
        'Wo fange ich mit «{section}» an?',
        'Welche Fragen sollte ich mir zu «{section}» stellen?',
        'Ich habe eine Erinnerung, weiß aber nicht wie ich sie ordne — können Sie helfen?',
        'Können Sie einen Entwurf für «{section}» vorschlagen?',
        'Welche Details machen «{section}» lebendig?',
        'Wie kann ich dem Text in «{section}» mehr Rhythmus geben?',
        'Ich habe nur Fragmente zu «{section}» — wie verbinde ich sie?',
        'Der Text in «{section}» ist zu lang — wie kürze ich ihn sinnvoll?',
        'Wie verbinde ich «{section}» mit dem nächsten Kapitel?',
        'Können Sie mir Fragen stellen, um weitere Erinnerungen zu «{section}» hervorzurufen?',
      ],
      capabilities: [
        'Was kann ich Sie außer zum Schreiben dieses Kapitels fragen?',
        '«{section}» als abgeschlossen markieren',
        '«{section}» zur Bearbeitung wieder öffnen',
        'Welche Kapitel habe ich bereits abgeschlossen?',
        'Lesen Sie, was ich in einem anderen Kapitel geschrieben habe',
        'Wie wechsle ich von Abschnitten zu freiem Schreiben?',
        'Wie importiere ich ein Word-Dokument?',
        'Wie exportiere ich die Biografie als PDF?',
        'Wie füge ich Fotos zu einem Kapitel hinzu?',
        'Wozu dient die Buchstruktur?',
        'Wie funktionieren Notizen und Erinnerungen?',
        'Kann ich Erinnerungen per Sprache aufnehmen?',
        'Wie funktionieren Prüfung und Veröffentlichung?',
        'Wie ändere ich den Datenschutz der Biografie?',
        'Wie ist mein Veröffentlichungsstatus?',
        'Können Sie unser Gespräch zusammenfassen?',
      ],
    },
    editorFreeflow: {
      writing: [
        'Wie organisiere ich den Text in Kapitel?',
        'Können Sie prüfen, was ich bisher geschrieben habe?',
        'Schlagen Sie einen Titel für ein Kapitel über meine Familie vor',
        'Was sollte eine vollständige Biografie enthalten?',
        'Wie verwandle ich gesprochene Erinnerungen in Text?',
        'Der Text ist zu lang — wie mache ich ihn lesbarer?',
        'Wie teile ich den Text in sinnvolle Teile?',
        'Können Sie einen Entwurf zum Einfügen vorschlagen?',
      ],
      capabilities: [
        'Was kann ich Sie im Freitext-Modus fragen?',
        'Biografie in Kapitel umwandeln ohne Textverlust',
        'Wie wechsle ich von Freitext zu geführten Abschnitten?',
        'Wie importiere ich ein Word-Dokument?',
        'Wie exportiere ich als PDF?',
        'Wie füge ich Fotos hinzu?',
        'Wozu dient die Buchstruktur?',
        'Wie funktionieren Notizen und Erinnerungen?',
        'Wie funktioniert die Endprüfung?',
        'Wie ist mein Veröffentlichungsstatus?',
        'Welche Kapitel hätte ich bei Umwandlung in Abschnitte?',
        'Können Sie unser Gespräch zusammenfassen?',
      ],
    },
    publication: {
      writing: [
        'Was sollte ich im Text vor der Veröffentlichung prüfen?',
        'Ist der Text bereit für die Endprüfung?',
        'Gibt es Teile, die ich vor der Veröffentlichung verbessern sollte?',
      ],
      capabilities: [
        'Wie funktioniert die Endprüfung?',
        'Was passiert nach der Freigabe?',
        'Kann ich den Text vor der Veröffentlichung noch bearbeiten?',
        'Wie ist mein Veröffentlichungsstatus?',
        'Was ist ein PDF-Entwurf und wie viele kann ich erstellen?',
        'Was passiert, wenn die KI-Prüfung Probleme findet?',
        'Wie kehre ich nach der Prüfung zur Bearbeitung zurück?',
        'Wie exportiere ich als PDF?',
        'Was bedeutet «Endversion»?',
        'Wann kann ich die Biografie veröffentlichen?',
      ],
    },
    nudge: {
      writing: [
        'Weitere Ideen für das nächste Stück?',
        'Worauf sollte ich mich jetzt konzentrieren?',
        'Welches ist das nächste Kapitel?',
        'Was könnte ich zu diesem Kapitel hinzufügen?',
      ],
      capabilities: [
        'Was kann ich hier noch fragen?',
        'Was können Sie für mich in dieser App tun?',
        'Wie exportiere ich als PDF?',
        'Können Sie unser Gespräch zusammenfassen?',
        'Welche App-Funktionen können Sie erklären?',
        'Welche Kapitel habe ich abgeschlossen?',
        'Wie funktionieren Prüfung und Veröffentlichung?',
        'Wie importiere oder exportiere ich Text?',
      ],
    },
  },
};

const byLang: Record<Language, EchoGuideCopy & { pools: EchoIcebreakerPoolsByContext }> = {
  it,
  en,
  fr,
  de,
};

export function getEchoGuideCopy(lang: Language): EchoGuideCopy {
  const copy = byLang[lang] ?? byLang.en;
  return {
    usageGuide: copy.usageGuide,
    usageGuideIcebreaker: copy.usageGuideIcebreaker,
    icebreakerGuideHint: copy.icebreakerGuideHint,
  };
}

export function getEchoIcebreakerPools(lang: Language): EchoIcebreakerPoolsByContext {
  return (byLang[lang] ?? byLang.en).pools;
}

export function getEchoUsageGuideForLocale(lang: Language): string {
  return (byLang[lang] ?? byLang.en).usageGuide;
}
