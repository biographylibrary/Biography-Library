# Biography Library — Base di conoscenza della piattaforma

Version: 1.17 — 2026-10-27

<!-- internal -->
Lingua di questa traduzione: italiano. Allineare a docs/PLATFORM_KB.md (EN). Dopo ogni modifica: npm run kb:sync.
<!-- /internal -->

## account_and_biography_model
<!-- public-title: Un account, una biografia -->

Ogni account gestisce una sola biografia: autobiografia o memorial (scelta irreversibile alla creazione). Non si può aggiungere una seconda biografia. Autobiografia + memorial del padre: due account con email diverse. Memorial per più familiari: un account per persona. Due prospettive sullo stesso defunto: account separati. Creazione solo da /onboarding. Dubbi: https://biographylibrary.org/contacts

## platform_intro
<!-- public-title: Cos’è Biography Library -->

Biography Library è un archivio digitale permanente, open source e senza scopo di lucro, gestito da un’associazione a Lugano. L’applicazione e l’inferenza IA di scrittura girano in Svizzera (Infomaniak). In beta il database e l’accesso restano su Supabase in Irlanda, con passaggio previsto a Zurigo. Se usi le risposte vocali, possono essere generate nell’Unione europea. Gli utenti scrivono autobiografie o biografie di familiari diretti deceduti. Non è un social network né un business di dati commerciali. L'assistente Aiuto spiega come funziona la piattaforma con linguaggio chiaro e semplice. Non fornisce consulenza legale, medica, fiscale o psicologica. In caso di dubbio, indirizza a https://biographylibrary.org/contacts.

## manifesto
<!-- public-title: Principi -->

Principi chiave: (1) Ogni vita merita memoria. (2) Solo la propria autobiografia o la biografia di un familiare diretto deceduto. (3) Open source AGPL v3. (4) IA open source etica per aiutare a scrivere (Infomaniak in Svizzera); non sostituisce la voce dell’autore; disattivabile. La voce parlata può usare un fornitore UE. (5) Identità dichiarata in registrazione, 18+. (6) Privacy: visibilità pubblica, solo link, solo famiglia o privata; dati mai venduti. (7) Moderazione rigorosa per contenuti illegali/dannosi. (8) Niente pubblicità o vendita dati. (9) Impegno alla conservazione a lungo termine. (10) Governance associazione non profit a Lugano.

## registration_and_onboarding
<!-- public-title: Registrazione e introduzione -->

Registrazione: nome, cognome, email, password. Minimo 18 anni. I nuovi account entrano in lista d’attesa: la home / è la landing; l’accesso è su /login. Dopo la conferma email vedi solo la data di registrazione, mai il numero in coda. Quando l’associazione dà l’accesso, completa il wizard su /onboarding (non dal pannello) per creare l’unica biografia: tipo (autobiografia o memorial), dichiarazioni legali, titolo o nomi protagonista/scrittore e visibilità. Non si sceglie tra capitoli guidati, importazione o testo già pronto: si arriva su un foglio vuoto. Il pannello mostra solo la biografia esistente. Catalogo e risolutore UM restano pubblici.

## writing_modes
<!-- public-title: Come si scrive -->

Un solo foglio, come un programma di scrittura. Non ci sono capitoli di vita già scritti e non c’è una modalità testo libero. I capitoli sono i titoli che l’autore segna. Se il testo non ha titoli, resta intero: i capitoli si aggiungono dopo, non si inventano. Echo può proporre un ordine, per esempio cronologico, e lascia spazio alle riflessioni, non a un elenco di fatti.

Mentre lavori a una biografia, Echo conserva una memoria privata della conversazione: la cronologia della chat, un riassunto aggiornato e brevi note, per esempio le persone che nomini, le tue preferenze, le decisioni prese e gli argomenti ancora aperti. Usa questa memoria solo per aiutarti a riprendere da dove avevi lasciato e per suggerirti domande quando sembra mancare qualcosa. Questa memoria non fa mai parte della biografia e non è mai visibile ai lettori. Viene cancellata quando la biografia viene pubblicata, e anche se disattivi le funzioni di AI o elimini la biografia o il tuo account. Per sapere come vengono trattati i dati dell'AI, consulta l'Informativa sulla privacy.

## ai_tools
<!-- public-title: Strumenti di scrittura IA -->

Il controllo grammaticale sta nel pannello di Echo sotto il foglio (accanto ai pulsanti del microfono e di invio), non in un menu nella barra di formattazione. Seleziona un paragrafo o posiziona il cursore in un paragrafo e premi Controlla Grammatica: controlla solo quel brano (refusi e sintassi, significato preservato) usando Apertus. Il contatore d’uso resta nella barra di formattazione, sopra il conteggio dei caratteri, alto come i pulsanti. Limiti giornalieri (40) e settimanali (200); azioni pesanti valgono 2. Reset a mezzanotte UTC e il lunedì UTC. L'IA non inventa fatti né pubblica da sola. In una traduzione non ci sono strumenti di IA: né controllo grammaticale né Echo.

## conversation_mode
<!-- public-title: Echo sotto il foglio -->

Non esiste una modalità conversazione separata. La biografia è un solo foglio, sempre modificabile. Echo sta sotto: striscia nera «Echo - il tuo assistente alla scrittura», aperta di default. Chiuderla nasconde chat, campo e icone. Una bozza entra nel foglio solo se la accetti. La chat non viene copiata. Le conversazioni vecchie restano e si aprono con Conversazioni precedenti. Non c’è un pulsante flottante. Voce: il microfono registra fino a 5 minuti per volta. Mentre registri compare una striscia rossa REC con il tempo trascorso e quello che resta, e il pulsante diventa un quadrato di stop. 30 secondi prima della fine arriva un avviso; allo scadere la registrazione si ferma e viene trascritta da sola. Se la trascrizione non riesce, un pulsante di nuovo tentativo invia di nuovo la stessa registrazione.

## editor_interface
<!-- public-title: L’editor -->

L'editor non ha una barra in alto. Nel menu a sinistra: titolo (clic per rinominare), grande come i titoli dei capitoli, e nome dell'autore, poi l'elenco dei capitoli, che si riempie solo quando si segna un titolo di capitolo. In basso: stato di salvataggio, Importa testo sempre visibile, poi Esporta sempre visibile, un filetto, poi Strumenti. Dentro Strumenti: Visibilità (apre una finestra per scegliere tra Privata di default, Famiglia con link copiabile che permette di leggere senza account, e Pubblica con scelta della licenza), I miei dati o Chi era questa persona, note, foto, struttura del libro, revisione e pubblicazione. Su un originale, la lingua del testo si sceglie in Strumenti, Lingua del testo; il pulsante Lingua accanto alla dimensione del carattere porta lì. Su telefono e tablet lo stesso menu si apre dall'icona a sinistra nell'intestazione del sito. 
<!-- internal -->
Admin sta solo nel menu account a destra, su ogni formato.
<!-- /internal -->
 Su schermo stretto gli stili stanno nel menu Stile. Il pulsante mostra lo stile scelto finché non lo cambi: Grassetto, Corsivo, Titolo, Elenco •, Elenco # o Citazione.

## um_identifier
<!-- public-title: L’identificativo UM -->

Ogni biografia riceve un identificativo UM permanente alla creazione. Non si sostituisce e non si rigenera. La forma scritta è del tipo UM-0000-XXXX-XXXX-XXXX: UM, trattino, anno UM con almeno quattro cifre, poi il resto. L'anno 0 UM è il 2026 gregoriano. Trattini e maiuscole non cambiano l'identificativo. Lo emette solo Biography Library (Lugano, CHE-416.014.530). 
<!-- internal -->
Non inventarne uno.
<!-- /internal -->
 La spiegazione pubblica è su /um-identifier. L'indirizzo canonico è https://id.biographylibrary.org/ seguito dall'identificativo. Un identificativo emesso risponde per sempre. Se la biografia non è consultabile, la pagina dice che l'identificativo esiste e che il contenuto non è disponibile. L'anno UM serve alle date d'archivio (pubblicazione, crediti, colophon PDF, piè di pagina). Non è mai un anno di nascita o di morte.

## memorial_review_window
<!-- public-title: I primi 30 giorni per i memorial -->

Solo i memorial. Dopo la prima pubblicazione, e di nuovo dopo una ripubblicazione accettata, un memorial pubblico resta in catalogo per 30 giorni con la dicitura «Nei primi 30 giorni». La segnalazione è possibile durante la finestra e resta possibile per sempre dopo. Le autobiografie non hanno questa finestra.

<!-- internal -->
Non esiste lo stato provisional. I 30 giorni sono la data provisional_until. Finché quella data è nel futuro, la dicitura resta. La prima pubblicazione imposta la finestra a 30 giorni da published_at. Una ripubblicazione accettata imposta revised_at e una nuova finestra di 30 giorni da revised_at, senza sostituire published_at. Il primo pacchetto d'archivio di un memorial si deposita solo dopo la finestra in corso.
<!-- /internal -->

## book_structure_photos
<!-- public-title: Struttura del libro e foto -->

Pannello Struttura libro (barra laterale): frontespizio opzionale (Dedica, Epigrafe, Prefazione) e fine libro (Epilogo, Ringraziamenti, Crediti) per PDF. Note e To-Do: blocco note privato, non esportato. Foto: JPG/PNG/WEBP fino a 20 MB ciascuna (il server le ridimensiona e le comprime, e toglie la posizione e gli altri dati nascosti), max 15 in galleria, didascalie, riordino trascinando; incluse nel lettore online e galleria PDF dopo l'ultimo capitolo.

## import_export
<!-- public-title: Importa ed esporta -->

Importa testo è sempre visibile, subito prima di Esporta. Si incolla o si carica .txt, .rtf o .docx sul foglio; un file .txt, .rtf o .docx può pesare fino a 5 MB. Si accetta anche un PDF digitale il cui testo si può selezionare, fino a 30 MB. Prima si chiede se tenere la copertina originale. Se sì, quella immagine è la prima pagina del PDF generato. Se la forma è diversa dalla pagina del libro (176×250 mm), non si stira: resta al centro con un bordo beige, lo stesso colore della quarta di copertina. Se la forma coincide già, riempie la pagina. Grassetto, corsivo e titoli restano solo se il carattere del PDF li registra ancora. I titoli diventano capitoli nell'elenco. Un testo senza titoli resta intero. L'interno viene ricomposto come testo, non come foto delle pagine. Se il PDF è solo una fotografia o una scansione, si dice chiaramente, senza promettere di riconoscere la scrittura. Se c'è già del testo, una domanda chiede se sostituirlo o aggiungere il nuovo in fondo. Niente è già scelto. Importa testo è sempre visibile, subito prima di Esporta. Esporta è PDF, Word e testo di tutto il foglio. PDF B5 con copertina e galleria foto opzionale. Il file esportato è tuo.

## translations
<!-- public-title: Traduzioni -->

L'autore può tradurre una biografia pubblicata in un'altra lingua. La traduzione la scrive l'autore o chi di fiducia: Biography Library non traduce in automatico e non corregge il testo tradotto. Si parte solo con l'originale pubblicato, una traduzione per lingua. Menu Strumenti → Traduci in un'altra lingua: la lingua parte vuota. Si può importare un file già tradotto, partire da una copia o da un foglio vuoto. Un testo ancora uguale all'originale non si invia. Nell'editor non ci sono grammatica né Echo. Visibilità e licenza seguono l'originale. Copertina e foto sono dell'originale; le didascalie della traduzione si scrivono in Strumenti → Foto: per ogni foto della galleria vedi la didascalia originale e scrivi quella tradotta; senza didascalia tradotta la foto appare senza didascalia. L'identificativo UM nelle uscite è quello dell'originale.

## rights_chapters
<!-- public-title: Diritti e capitoli successivi -->

L'autore mantiene il copyright; la piattaforma è solo custode. Nessun addestramento IA commerciale su biografie private/semi-private/famiglia. Capitoli autobiografia: dopo la prima pubblicazione, nuovo capitolo dopo minimo 365 giorni; capitoli pubblicati immutabili. Dopo la morte dell'autore, autobiografia congelata; la famiglia può scrivere biografie separate collegate con account propri. Biografie di deceduti: solo familiari diretti. I memorial hanno una finestra di 30 giorni dopo la pubblicazione (vedi «I primi 30 giorni per i memorial»); la segnalazione resta possibile per sempre.

<!-- internal -->
Vedi memorial_review_window: 30 giorni con la data provisional_until, non uno stato provisional.
<!-- /internal -->

## faq
<!-- public-title: Domande frequenti -->

FAQ: Un account = una biografia (autobiografia O memorial). Serve un'altra? Account separato con altra email. I nuovi account sono in lista d’attesa e vedono solo la data di registrazione, mai il numero in coda. Non si scrive la biografia di un amico vivente. Note e promemoria sono privati e non si esportano. La biografia è un solo foglio. Echo sta sotto; chiudere la striscia nera nasconde la chat. Non ci sono capitoli di vita fissi né testo libero. Importa testo è sempre visibile, subito prima di Esporta, e comprende Word o PDF: i titoli diventano capitoli. Esporta comprende tutto il foglio. La revisione si blocca solo se il foglio è vuoto. Dopo la morte l'autobiografia è congelata. Ogni biografia ha un identificativo UM permanente. I memorial pubblici nei primi 30 giorni restano in catalogo con la dicitura «Nei primi 30 giorni». L'IA commerciale non si addestra sull'archivio.

## offline_manual
<!-- public-title: Usare questo manuale offline -->

Puoi scaricare questo manuale da Aiuto nel piè di pagina del sito o nel menu dell'editor. Il file è un documento Markdown che puoi aprire sul computer o caricare in qualsiasi assistente AI. Descrive come funziona Biography Library. Non sostituisce l'Informativa sulla privacy né le Condizioni di servizio.
