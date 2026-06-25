/**
 * Help knowledge base split into RAG sections, 4 locales.
 * Keep aligned with lib/help/help-kb.ts (English source of truth).
 */

export type KbLocale = 'en' | 'it' | 'fr' | 'de';

export type KbSection = {
  sourceKey: string;
  content: Record<KbLocale, string>;
};

export const HELP_KB_SECTIONS: KbSection[] = [
  {
    sourceKey: 'platform_intro',
    content: {
      en: `Biography Library is a permanent, open-source, non-profit digital archive hosted in Switzerland. Users write autobiographies or biographies of deceased direct family members. It is not a social network or commercial data business. The Help assistant explains how the platform works in clear, simple language. It does not give legal, medical, tax or psychological advice. When uncertain, direct users to https://biographylibrary.org/contacts.`,
      it: `Biography Library è un archivio digitale permanente, open source e senza scopo di lucro, ospitato in Svizzera. Gli utenti scrivono autobiografie o biografie di familiari diretti deceduti. Non è un social network né un business di dati commerciali. L'assistente Aiuto spiega come funziona la piattaforma con linguaggio chiaro e semplice. Non fornisce consulenza legale, medica, fiscale o psicologica. In caso di dubbio, indirizza a https://biographylibrary.org/contacts.`,
      fr: `Biography Library est une archive numérique permanente, open source et à but non lucratif, hébergée en Suisse. Les utilisateurs écrivent des autobiographies ou des biographies de membres directs de la famille décédés. Ce n'est pas un réseau social ni une entreprise commerciale de données. L'assistant Aide explique le fonctionnement de la plateforme en langage clair et simple. Il ne fournit pas de conseils juridiques, médicaux, fiscaux ou psychologiques. En cas de doute, orientez vers https://biographylibrary.org/contacts.`,
      de: `Biography Library ist ein dauerhaftes, quelloffenes, gemeinnütziges digitales Archiv in der Schweiz. Nutzer schreiben Autobiografien oder Biografien verstorbener direkter Familienmitglieder. Es ist kein soziales Netzwerk und kein kommerzielles Datengeschäft. Der Hilfe-Assistent erklärt die Plattform in klarer, einfacher Sprache. Er gibt keine Rechts-, Medizin-, Steuer- oder Psychologieberatung. Bei Unsicherheit verweisen Sie auf https://biographylibrary.org/contacts.`,
    },
  },
  {
    sourceKey: 'manifesto',
    content: {
      en: `Key principles: (1) Every life deserves memory. (2) Only your own autobiography or a deceased direct family member's biography. (3) Open source AGPL v3. (4) Ethical Swiss-hosted open-source AI only; AI helps writing, never replaces voice; can be disabled. (5) Identity declared at registration, 18+. (6) Privacy: public, link-only, family-only, or private visibility; data never sold. (7) Strict moderation for illegal/harmful content. (8) No ads or data sales. (9) Long-term preservation commitment. (10) Non-profit association governance in Lugano.`,
      it: `Principi chiave: (1) Ogni vita merita memoria. (2) Solo la propria autobiografia o la biografia di un familiare diretto deceduto. (3) Open source AGPL v3. (4) Solo IA open source etica su infrastruttura svizzera; l'IA aiuta a scrivere, non sostituisce la voce; disattivabile. (5) Identità dichiarata in registrazione, 18+. (6) Privacy: visibilità pubblica, solo link, solo famiglia o privata; dati mai venduti. (7) Moderazione rigorosa per contenuti illegali/dannosi. (8) Niente pubblicità o vendita dati. (9) Impegno alla conservazione a lungo termine. (10) Governance associazione non profit a Lugano.`,
      fr: `Principes clés : (1) Chaque vie mérite d'être mémorisée. (2) Seulement votre autobiographie ou celle d'un membre direct de la famille décédé. (3) Open source AGPL v3. (4) IA open source éthique hébergée en Suisse uniquement ; l'IA aide à écrire, ne remplace pas la voix ; désactivable. (5) Identité déclarée à l'inscription, 18+. (6) Confidentialité : public, lien seul, famille seule ou privé ; données jamais vendues. (7) Modération stricte des contenus illégaux/nocifs. (8) Pas de publicité ni vente de données. (9) Engagement de préservation à long terme. (10) Gouvernance association à but non lucratif à Lugano.`,
      de: `Kernprinzipien: (1) Jedes Leben verdient Erinnerung. (2) Nur eigene Autobiografie oder Biografie eines verstorbenen direkten Familienmitglieds. (3) Open Source AGPL v3. (4) Nur ethische Open-Source-KI in der Schweiz; KI hilft beim Schreiben, ersetzt nicht die Stimme; abschaltbar. (5) Identität bei Registrierung, 18+. (6) Datenschutz: öffentlich, nur Link, nur Familie oder privat; Daten werden nie verkauft. (7) Strenge Moderation illegaler/schädlicher Inhalte. (8) Keine Werbung oder Datenverkauf. (9) Langfristige Bewahrung. (10) Gemeinnütziger Verein in Lugano.`,
    },
  },
  {
    sourceKey: 'account_create',
    content: {
      en: `Registration needs first name, last name, email, password. Must be 18+. From Dashboard click "New Biography", choose type (own autobiography or deceased direct family member), main language, and writing mode (Sections or Free Flow). Mode cannot be changed after creation.`,
      it: `Registrazione: nome, cognome, email, password. Minimo 18 anni. Dal pannello clicca "Nuova biografia", scegli tipo (autobiografia o familiare diretto deceduto), lingua principale e modalità (Sezioni o Flusso libero). La modalità non si può cambiare dopo la creazione.`,
      fr: `Inscription : prénom, nom, e-mail, mot de passe. 18 ans minimum. Depuis le tableau de bord, cliquez « Nouvelle biographie », choisissez le type (autobiographie ou membre direct décédé), la langue principale et le mode (Sections ou Flux libre). Le mode ne peut pas être changé après création.`,
      de: `Registrierung: Vorname, Nachname, E-Mail, Passwort. Mindestens 18 Jahre. Im Dashboard « Neue Biografie », Typ wählen (eigene Autobiografie oder verstorbener direkter Verwandter), Hauptsprache und Modus (Abschnitte oder Freier Fluss). Modus nach Erstellung nicht änderbar.`,
    },
  },
  {
    sourceKey: 'writing_modes',
    content: {
      en: `Sections mode: nine themed chapters (Childhood, Family, Education, Career, Life Events, Relationships, Challenges, Passions, Legacy). Work one chapter at a time; mark complete when done. Ideal for beginners. Free Flow mode: one continuous document, no predefined sections; same AI tools on selected text. Ideal for experienced writers or importing long existing text. Content is not auto-converted between modes.`,
      it: `Modalità Sezioni: nove capitoli tematici (Infanzia, Famiglia, Educazione, Carriera, Eventi, Relazioni, Sfide, Passioni, Eredità). Si lavora un capitolo alla volta; si può segnare come completato. Ideale per principianti. Flusso libero: un unico documento continuo, senza sezioni predefinite; stessi strumenti IA sul testo selezionato. Ideale per scrittori esperti o testi lunghi importati. Il contenuto non si converte automaticamente tra le modalità.`,
      fr: `Mode Sections : neuf chapitres thématiques (Enfance, Famille, Éducation, Carrière, Événements, Relations, Défis, Passions, Héritage). Un chapitre à la fois ; marquer terminé quand c'est fait. Idéal pour débutants. Flux libre : un document continu, sans sections prédéfinies ; mêmes outils IA sur le texte sélectionné. Idéal pour écrivains expérimentés ou import de longs textes. Pas de conversion automatique entre modes.`,
      de: `Abschnittsmodus: neun thematische Kapitel (Kindheit, Familie, Bildung, Karriere, Ereignisse, Beziehungen, Herausforderungen, Leidenschaften, Vermächtnis). Ein Kapitel nach dem anderen; als fertig markieren. Ideal für Einsteiger. Freier Fluss: ein durchgehendes Dokument ohne vordefinierte Abschnitte; gleiche KI-Tools für markierten Text. Ideal für erfahrene Schreibende oder lange Importe. Keine automatische Umwandlung zwischen Modi.`,
    },
  },
  {
    sourceKey: 'ai_tools',
    content: {
      en: `Editor AI tools (top bar): Check Grammar (typos/syntax, meaning preserved), Need Help? (contextual assistance on current section), Summarise, Review (clarity/flow feedback). AI On/Off toggle disables all AI buttons. Usage counter shows daily (40) and weekly (200) limits; heavy actions count as 2. Reset daily midnight UTC, weekly Monday UTC. AI never invents facts or publishes automatically.`,
      it: `Strumenti IA nell'editor (barra superiore): Controlla grammatica, Serve aiuto? (assistenza contestuale sulla sezione), Riassumi, Revisione. Interruttore IA On/Off disattiva tutti i pulsanti IA. Il contatore mostra limiti giornalieri (40) e settimanali (200); azioni pesanti valgono 2. Reset a mezzanotte UTC e lunedì UTC. L'IA non inventa fatti né pubblica automaticamente.`,
      fr: `Outils IA dans l'éditeur : Vérifier la grammaire, Besoin d'aide ? (assistance contextuelle), Résumer, Révision. Le bouton IA On/Off désactive tous les outils IA. Le compteur affiche les limites journalières (40) et hebdomadaires (200) ; actions lourdes = 2. Réinitialisation minuit UTC et lundi UTC. L'IA n'invente pas de faits ni ne publie automatiquement.`,
      de: `KI-Werkzeuge in der Editor-Leiste: Grammatik prüfen, Hilfe nötig? (kontextuelle Hilfe), Zusammenfassen, Überprüfen. KI Ein/Aus schaltet alle KI-Buttons aus. Zähler zeigt Tageslimit (40) und Wochenlimit (200); schwere Aktionen zählen 2. Reset Mitternacht UTC und Montag UTC. KI erfindet keine Fakten und veröffentlicht nicht automatisch.`,
    },
  },
  {
    sourceKey: 'conversation_mode',
    content: {
      en: `Conversation Mode (toggle next to Editor Mode) lets users chat with the biography coach instead of writing directly. Share memories, answer questions; ask the coach to add a draft to the editor when ready. Particularly useful for people intimidated by a blank page. Only available in Sections mode, not Free Flow.`,
      it: `La Modalità Conversazione (accanto a Modalità Editor) permette di chattare con il coach biografico invece di scrivere direttamente. Condividi ricordi, rispondi alle domande; chiedi di aggiungere una bozza nell'editor quando sei pronto. Utile per chi teme la pagina bianca. Disponibile solo in modalità Sezioni, non in Flusso libero.`,
      fr: `Le Mode Conversation (à côté du Mode Éditeur) permet de discuter avec le coach biographique au lieu d'écrire directement. Partagez des souvenirs, répondez aux questions ; demandez d'ajouter un brouillon dans l'éditeur quand vous êtes prêt. Utile face à la page blanche. Disponible uniquement en mode Sections, pas en Flux libre.`,
      de: `Der Konversationsmodus (neben dem Editor-Modus) ermöglicht Chat mit dem Biografie-Coach statt direktem Schreiben. Erinnerungen teilen, Fragen beantworten; um Entwurf im Editor bitten, wenn bereit. Hilfreich bei Schreibblockade. Nur im Abschnittsmodus, nicht im freien Fluss.`,
    },
  },
  {
    sourceKey: 'book_structure_photos',
    content: {
      en: `Book Structure panel (left sidebar): optional front matter (Dedication, Epigraph, Preface) and back matter (Epilogue, Acknowledgements, Credits) for PDF export. Notes & To-Do: private notepad, not exported. Photos: upload JPG/PNG/WEBP up to 5 MB, max 30 gallery photos, captions, reorder by drag; included in online reader and PDF gallery after last chapter.`,
      it: `Pannello Struttura libro (barra laterale): frontespizio opzionale (Dedica, Epigrafe, Prefazione) e fine libro (Epilogo, Ringraziamenti, Crediti) per PDF. Note e To-Do: blocco note privato, non esportato. Foto: JPG/PNG/WEBP fino 5 MB, max 30 in galleria, didascalie, riordino trascinando; incluse nel lettore online e galleria PDF dopo l'ultimo capitolo.`,
      fr: `Panneau Structure du livre : avant-propos optionnel (Dédicace, Épigraphe, Préface) et fin (Épilogue, Remerciements, Crédits) pour le PDF. Notes & To-Do : bloc-notes privé, non exporté. Photos : JPG/PNG/WEBP jusqu'à 5 Mo, max 30 en galerie, légendes, réordonner par glisser-déposer ; incluses dans le lecteur et la galerie PDF après le dernier chapitre.`,
      de: `Buchstruktur-Panel: optionales Vorspann (Widmung, Epigraph, Vorwort) und Nachspann (Epilog, Danksagungen, Credits) für PDF. Notizen & To-Do: privates Notizbuch, nicht exportiert. Fotos: JPG/PNG/WEBP bis 5 MB, max. 30 Galerie-Fotos, Bildunterschriften, per Drag & Drop sortieren; im Online-Leser und PDF-Galerie nach dem letzten Kapitel.`,
    },
  },
  {
    sourceKey: 'import_export',
    content: {
      en: `Import text (sidebar): paste or upload into current chapter (Sections) or at cursor (Free Flow). For long Word documents, split into logical parts and import per chapter rather than all at once. Export panel: standard text export and print-ready B5 PDF with cover photo and optional photo gallery. Pre-flight check available before final PDF. Exported PDF/text is yours to print, share, or publish elsewhere.`,
      it: `Importa testo (barra laterale): incolla o carica nel capitolo corrente (Sezioni) o al cursore (Flusso libero). Per documenti Word lunghi, dividi in parti logiche e importa per capitolo. Pannello Esporta: testo standard e PDF B5 pronto per stampa con copertina e galleria foto opzionale. Controllo pre-volo prima del PDF finale. PDF/testo esportato è tuo: stampa, condividi, pubblica altrove.`,
      fr: `Importer du texte : coller ou téléverser dans le chapitre courant (Sections) ou au curseur (Flux libre). Pour de longs documents Word, diviser en parties logiques par chapitre. Export : texte standard et PDF B5 prêt à imprimer avec couverture et galerie photo optionnelle. Contrôle pré-vol avant PDF final. Le PDF/texte exporté vous appartient.`,
      de: `Text importieren: einfügen oder hochladen ins aktuelle Kapitel (Abschnitte) oder an Cursor (Freier Fluss). Lange Word-Dokumente in logische Teile aufteilen. Export: Standardtext und druckfertiges B5-PDF mit Cover und optionaler Fotogalerie. Preflight vor finalem PDF. Exportiertes PDF/Text gehört Ihnen.`,
    },
  },
  {
    sourceKey: 'rights_chapters',
    content: {
      en: `Author keeps full copyright; platform is custodian only. No commercial AI training on private/semi-private/family biographies. Autobiography chapters: after first publish, new chapter allowed after minimum 365 days; published chapters are immutable. After author's death, autobiography frozen; family may write separate linked biographies. Deceased-person biographies: only direct family; 30-day temporary review period after publish for reports from mentioned persons.`,
      it: `L'autore mantiene il copyright; la piattaforma è solo custode. Nessun addestramento IA commerciale su biografie private/semi-private/famiglia. Capitoli autobiografia: dopo la prima pubblicazione, nuovo capitolo dopo minimo 365 giorni; capitoli pubblicati immutabili. Dopo la morte dell'autore, autobiografia congelata; la famiglia può scrivere biografie separate collegate. Biografie di deceduti: solo familiari diretti; 30 giorni di revisione temporanea dopo pubblicazione per segnalazioni.`,
      fr: `L'auteur conserve le copyright ; la plateforme est gardienne uniquement. Pas d'entraînement IA commercial sur biographies privées/semi-privées/famille. Chapitres autobiographie : après première publication, nouveau chapitre après 365 jours minimum ; chapitres publiés immuables. Après le décès de l'auteur, autobiographie figée ; la famille peut écrire des biographies séparées liées. Biographies de décédés : famille directe seulement ; 30 jours de révision temporaire après publication.`,
      de: `Autor behält Urheberrecht; Plattform nur Verwahrer. Kein kommerzielles KI-Training bei privaten/semi-privaten/Familien-Biografien. Autobiografie-Kapitel: nach erster Veröffentlichung neues Kapitel frühestens nach 365 Tagen; veröffentlichte Kapitel unveränderlich. Nach Tod des Autors eingefroren; Familie kann separate verknüpfte Biografien schreiben. Biografien Verstorbener: nur direkte Familie; 30 Tage temporäre Prüfung nach Veröffentlichung.`,
    },
  },
  {
    sourceKey: 'faq',
    content: {
      en: `FAQ: Cannot write biography of living friend (only own or deceased direct family). Disable AI with AI On/Off toggle. Notes & To-Do are private, not exported. Conversation Mode = chat coach for memories. Long Word text: import in parts per chapter. After death your autobiography is frozen; family writes separate biographies. Commercial AI does not train on the archive.`,
      it: `FAQ: Non si può scrivere la biografia di un amico vivente (solo la propria o familiare diretto deceduto). Disattiva IA con interruttore IA On/Off. Note e To-Do sono private, non esportate. Modalità Conversazione = coach chat per i ricordi. Testo Word lungo: importa a parti per capitolo. Dopo la morte l'autobiografia è congelata; la famiglia scrive biografie separate. L'IA commerciale non si addestra sull'archivio.`,
      fr: `FAQ : Pas de biographie d'un ami vivant (seulement la vôtre ou un membre direct décédé). Désactiver l'IA avec le bouton IA On/Off. Notes & To-Do privées, non exportées. Mode Conversation = coach par chat. Long texte Word : importer par parties/chapitre. Après décès autobiographie figée ; famille écrit des biographies séparées. Pas d'entraînement IA commercial sur l'archive.`,
      de: `FAQ: Keine Biografie eines lebenden Freundes (nur eigene oder verstorbener direkter Verwandter). KI mit KI Ein/Aus abschalten. Notizen & To-Do privat, nicht exportiert. Konversationsmodus = Coach-Chat für Erinnerungen. Langer Word-Text: in Teilen pro Kapitel importieren. Nach Tod Autobiografie eingefroren; Familie schreibt separate Biografien. Kein kommerzielles KI-Training auf dem Archiv.`,
    },
  },
];

export const KB_LOCALES: KbLocale[] = ['en', 'it', 'fr', 'de'];
