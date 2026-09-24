export type LegalBlockKind = 'title' | 'version' | 'heading' | 'paragraph' | 'item';

export type LegalBlock = { kind: LegalBlockKind; text: string };

export type LegalDocId = 'privacy' | 'terms' | 'cookies';

export const siteLegal: Record<LegalDocId, Record<'it' | 'en' | 'fr' | 'de', LegalBlock[]>> = {
  "privacy": {
    "it": [
      {
        "kind": "title",
        "text": "Informativa sulla privacy"
      },
      {
        "kind": "version",
        "text": "Versione 1.0 – Marzo 2026"
      },
      {
        "kind": "heading",
        "text": "1. Chi Siamo"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library è un'associazione svizzera senza scopo di lucro con sede legale a Lugano, Ticino, Svizzera, costituita ai sensi degli articoli 60 e seguenti del Codice civile svizzero."
      },
      {
        "kind": "paragraph",
        "text": "Missione: preservare la memoria umana attraverso un archivio permanente, verificato e universale di biografie personali."
      },
      {
        "kind": "paragraph",
        "text": "Contatti:"
      },
      {
        "kind": "item",
        "text": "Sito web: biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "Email: support@biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "Indirizzo: Lugano, Ticino, Svizzera"
      },
      {
        "kind": "heading",
        "text": "2. Principi Fondamentali"
      },
      {
        "kind": "paragraph",
        "text": "Questa Informativa sulla Privacy si fonda sui Principi Non Negoziabili del nostro Manifesto:"
      },
      {
        "kind": "item",
        "text": "Proprietà dei Dati – Tu sei il proprietario della tua storia; noi ne siamo solo i custodi"
      },
      {
        "kind": "item",
        "text": "Privacy by Design – Massima protezione integrata in ogni livello della piattaforma"
      },
      {
        "kind": "item",
        "text": "IA Etica e Locale – L'elaborazione dell'IA avviene sul territorio svizzero, mai inviata a terzi"
      },
      {
        "kind": "item",
        "text": "Hosting Svizzero – Tutti i dati risiedono esclusivamente in Svizzera"
      },
      {
        "kind": "item",
        "text": "Piena Trasparenza – Nessuna vendita o condivisione commerciale dei tuoi dati, mai"
      },
      {
        "kind": "item",
        "text": "Controllo dell'Utente – Tu decidi chi può accedere alla tua biografia"
      },
      {
        "kind": "item",
        "text": "Minimizzazione dei Dati – Raccogliamo solo i dati minimi strettamente necessari"
      },
      {
        "kind": "heading",
        "text": "3. Quali Dati Raccogliamo"
      },
      {
        "kind": "heading",
        "text": "3.1 Dati di Registrazione"
      },
      {
        "kind": "item",
        "text": "Nome e cognome"
      },
      {
        "kind": "item",
        "text": "Indirizzo email"
      },
      {
        "kind": "item",
        "text": "Password (memorizzata in forma crittografata — mai leggibile da noi)"
      },
      {
        "kind": "paragraph",
        "text": "COSA NON RACCOGLIAMO MAI AL MOMENTO DELLA REGISTRAZIONE:"
      },
      {
        "kind": "item",
        "text": "❌ Documenti d'identità (passaporto, carta d'identità nazionale)"
      },
      {
        "kind": "item",
        "text": "❌ Certificati di nascita, matrimonio o morte"
      },
      {
        "kind": "item",
        "text": "❌ Dati biometrici"
      },
      {
        "kind": "heading",
        "text": "3.2 Verifica dell'identità – Solo su segnalazione"
      },
      {
        "kind": "paragraph",
        "text": "Al momento della registrazione ci basiamo esclusivamente sull'autocertificazione. Solo in caso di segnalazione o ragionevole dubbio potremmo richiedere ulteriore documentazione."
      },
      {
        "kind": "paragraph",
        "text": "Conservazione dei documenti di verifica:"
      },
      {
        "kind": "item",
        "text": "Conservati in archivi offline solo per il tempo necessario (massimo 90 giorni)"
      },
      {
        "kind": "item",
        "text": "Eliminati automaticamente al termine della verifica"
      },
      {
        "kind": "item",
        "text": "Mai condivisi con terze parti commerciali"
      },
      {
        "kind": "heading",
        "text": "3.3 Contenuto biografico"
      },
      {
        "kind": "item",
        "text": "Testo della biografia (nessun limite di caratteri)"
      },
      {
        "kind": "item",
        "text": "Immagini e fotografie"
      },
      {
        "kind": "item",
        "text": "Registrazioni vocali"
      },
      {
        "kind": "item",
        "text": "Metadati (date di creazione, modifiche, lingue, numero di capitolo)"
      },
      {
        "kind": "heading",
        "text": "3.4 Dati tecnici e di navigazione"
      },
      {
        "kind": "item",
        "text": "Indirizzo IP (conservato per 12 mesi)"
      },
      {
        "kind": "item",
        "text": "Cookie tecnici necessari"
      },
      {
        "kind": "item",
        "text": "Log di accesso (conservati per 12 mesi)"
      },
      {
        "kind": "item",
        "text": "Preferenze di lingua e impostazioni utente"
      },
      {
        "kind": "heading",
        "text": "3.5 Dati generati dall'IA"
      },
      {
        "kind": "item",
        "text": "Cronologia dei suggerimenti dell'IA"
      },
      {
        "kind": "item",
        "text": "Prompt e richieste inviate all'assistente IA"
      },
      {
        "kind": "paragraph",
        "text": "Elaborazione IA: esclusivamente in Svizzera tramite i sistemi IA di Infomaniak, basati su modelli open source."
      },
      {
        "kind": "heading",
        "text": "4. Quali biografie puoi creare"
      },
      {
        "kind": "heading",
        "text": "4.1 Autobiografie — Il documento biografico vivente"
      },
      {
        "kind": "paragraph",
        "text": "Scrivi la storia della tua vita. La tua autobiografia è un documento vivente strutturato in capitoli: dopo aver pubblicato il tuo primo capitolo, puoi aggiungerne uno nuovo dopo un minimo di 365 giorni. Non sei obbligato a farlo ogni anno — puoi aspettare molti anni prima di aggiungere un nuovo capitolo. Ogni capitolo è immutabile una volta pubblicato: le tue parole rimangono esattamente come scritte, per sempre."
      },
      {
        "kind": "paragraph",
        "text": "Dopo la tua morte, la tua autobiografia viene congelata all'ultimo capitolo che hai pubblicato. Nessuno può aggiungere nulla alla tua voce originale. I membri della tua famiglia possono onorare la tua memoria scrivendo una biografia separata, collegata alla tua autobiografia sulla tua pagina personale."
      },
      {
        "kind": "heading",
        "text": "4.2 Biografie di persone decedute"
      },
      {
        "kind": "paragraph",
        "text": "Queste possono essere scritte esclusivamente da un familiare diretto del defunto. Più membri della famiglia possono scrivere biografie separate della stessa persona — ogni documento riflette la prospettiva del suo autore. Le biografie di persone decedute sono soggette al periodo temporaneo di 30 giorni (vedi Sezione 9)."
      },
      {
        "kind": "paragraph",
        "text": "COSA NON PUOI FARE:"
      },
      {
        "kind": "item",
        "text": "❌ Creare biografie di persone in vita diverse da te stesso"
      },
      {
        "kind": "item",
        "text": "❌ Creare biografie di minori di 18 anni (anche se deceduti)"
      },
      {
        "kind": "item",
        "text": "❌ Creare biografie di persone decedute senza un legame familiare diretto"
      },
      {
        "kind": "item",
        "text": "❌ Pubblicare biografie senza essere in grado di dimostrare la morte della persona se richiesto"
      },
      {
        "kind": "heading",
        "text": "5. Come utilizziamo i tuoi dati"
      },
      {
        "kind": "heading",
        "text": "5.1 Finalità del trattamento"
      },
      {
        "kind": "item",
        "text": "Fornitura del servizio"
      },
      {
        "kind": "item",
        "text": "Gestione del sistema dei capitoli biografici"
      },
      {
        "kind": "item",
        "text": "Assistenza IA"
      },
      {
        "kind": "item",
        "text": "Gestione dell'account"
      },
      {
        "kind": "item",
        "text": "Sicurezza e prevenzione degli abusi"
      },
      {
        "kind": "item",
        "text": "Moderazione dei contenuti automatizzata e umana"
      },
      {
        "kind": "item",
        "text": "Conformità legale"
      },
      {
        "kind": "heading",
        "text": "5.2 Cosa non facciamo mai"
      },
      {
        "kind": "item",
        "text": "❌ Non vendiamo i tuoi dati"
      },
      {
        "kind": "item",
        "text": "❌ Non utilizziamo i tuoi dati per pubblicità o profilazione commerciale"
      },
      {
        "kind": "item",
        "text": "❌ Non addestriamo modelli IA commerciali o proprietari sui tuoi contenuti"
      },
      {
        "kind": "item",
        "text": "❌ Non condividiamo i dati con i governi (salvo ove richiesto dalla legge svizzera)"
      },
      {
        "kind": "item",
        "text": "❌ Non modifichiamo retroattivamente questa Informativa per ridurre le tue tutele"
      },
      {
        "kind": "item",
        "text": "❌ Non raccogliamo documenti d'identità senza una concreta necessità operativa"
      },
      {
        "kind": "item",
        "text": "❌ Non mostriamo pubblicità o loghi di sponsor sulle singole biografie"
      },
      {
        "kind": "heading",
        "text": "6. Base giuridica per il trattamento"
      },
      {
        "kind": "item",
        "text": "Contratto – Per fornire il servizio che hai richiesto"
      },
      {
        "kind": "item",
        "text": "Consenso – Per le funzionalità IA (revocabile in qualsiasi momento)"
      },
      {
        "kind": "item",
        "text": "Obbligo legale – Per rispettare la legge svizzera (nFADP) e il GDPR per gli utenti dell'UE"
      },
      {
        "kind": "item",
        "text": "Interesse legittimo – Per prevenire le frodi e garantire la sicurezza della piattaforma"
      },
      {
        "kind": "heading",
        "text": "7. Con chi condividiamo i tuoi dati"
      },
      {
        "kind": "heading",
        "text": "7.1 Fornitori di servizi"
      },
      {
        "kind": "paragraph",
        "text": "Fornitore"
      },
      {
        "kind": "paragraph",
        "text": "Sede"
      },
      {
        "kind": "paragraph",
        "text": "Ruolo"
      },
      {
        "kind": "paragraph",
        "text": "Garanzie"
      },
      {
        "kind": "paragraph",
        "text": "Infomaniak SA"
      },
      {
        "kind": "paragraph",
        "text": "Svizzera"
      },
      {
        "kind": "paragraph",
        "text": "Hosting, infrastruttura e AI"
      },
      {
        "kind": "paragraph",
        "text": "DPA conforme a nLPD/GDPR, dati in CH"
      },
      {
        "kind": "paragraph",
        "text": "⚠️ I dati non lasciano mai la giurisdizione svizzera. Nessun trasferimento verso paesi privi di standard adeguati di protezione dei dati."
      },
      {
        "kind": "paragraph",
        "text": "Database: lo stack tecnologico definitivo per il database di produzione non è ancora stato finalizzato. La soluzione selezionata sarà ospitata esclusivamente su infrastruttura svizzera. Questa Informativa sarà aggiornata prima del lancio pubblico."
      },
      {
        "kind": "heading",
        "text": "7.2 Accesso familiare"
      },
      {
        "kind": "paragraph",
        "text": "I membri della famiglia possono accedere ai tuoi contenuti esclusivamente in base alle autorizzazioni che hai impostato."
      },
      {
        "kind": "heading",
        "text": "7.3 Autorità pubbliche"
      },
      {
        "kind": "paragraph",
        "text": "Condividiamo i tuoi dati con le autorità governative solo se richiesto da una valida ordinanza di un tribunale svizzero, se necessario per prevenire un reato grave o se obbligatorio ai sensi della nLPD o del Codice penale svizzero."
      },
      {
        "kind": "heading",
        "text": "7.4 Sponsor"
      },
      {
        "kind": "paragraph",
        "text": "I dati degli utenti non vengono mai condivisi con gli sponsor. Gli sponsor non possono accedere ai dati personali, non possono influenzare la moderazione dei contenuti e i loro loghi non compaiono mai sulle biografie individuali — ma solo sul sito web istituzionale, sull'app e sui materiali promozionali."
      },
      {
        "kind": "heading",
        "text": "8. Dove sono conservati i tuoi dati"
      },
      {
        "kind": "paragraph",
        "text": "Residenza dei dati – 100% Svizzera: tutti i server, i backup e l'elaborazione dell'IA operano esclusivamente sull'infrastruttura Infomaniak con data center in Svizzera."
      },
      {
        "kind": "paragraph",
        "text": "Sicurezza tecnica: crittografia in transito (TLS 1.3+), crittografia a riposo, autenticazione a più fattori (MFA), backup crittografati giornalieri, log di controllo, codice open source verificabile (AGPL v3)."
      },
      {
        "kind": "heading",
        "text": "9. Periodo temporaneo per le biografie di persone decedute"
      },
      {
        "kind": "paragraph",
        "text": "Quando un familiare pubblica la biografia di una persona deceduta, questa viene contrassegnata come “temporanea” per i primi 30 giorni. Durante questo periodo:"
      },
      {
        "kind": "item",
        "text": "La biografia è pubblica e visibile a tutti, contrassegnata come “in revisione temporanea”"
      },
      {
        "kind": "item",
        "text": "Chiunque sia menzionato — o i suoi familiari diretti — può presentare una segnalazione e richiedere di non comparire"
      },
      {
        "kind": "item",
        "text": "L'autore può scegliere di avvisare direttamente le persone citate, ma non è tenuto a farlo"
      },
      {
        "kind": "item",
        "text": "Il “Segnala” pulsante è accessibile all'intera community"
      },
      {
        "kind": "paragraph",
        "text": "Alla fine dei 30 giorni:"
      },
      {
        "kind": "item",
        "text": "Nessuna segnalazione ricevuta → la biografia diventa definitiva"
      },
      {
        "kind": "item",
        "text": "Segnalazione ricevuta → l'autore riceve una richiesta di modificare o rimuovere il contenuto indicato, valutata in base alla natura e alla validità della segnalazione"
      },
      {
        "kind": "paragraph",
        "text": "Prima della pubblicazione, ogni biografia viene sottoposta a una scansione automatizzata per rilevare contenuti che violano i livelli di moderazione definiti nei Termini di Servizio."
      },
      {
        "kind": "heading",
        "text": "10. Controllo degli Accessi"
      },
      {
        "kind": "paragraph",
        "text": "Livello di Privacy"
      },
      {
        "kind": "paragraph",
        "text": "Chi Può Accedere"
      },
      {
        "kind": "paragraph",
        "text": "Privato"
      },
      {
        "kind": "paragraph",
        "text": "Solo tu"
      },
      {
        "kind": "paragraph",
        "text": "Solo Famiglia"
      },
      {
        "kind": "paragraph",
        "text": "Tu + i membri della famiglia che inviti esplicitamente"
      },
      {
        "kind": "paragraph",
        "text": "Semi-privato"
      },
      {
        "kind": "paragraph",
        "text": "Chiunque abbia il link diretto (non indicizzato dai motori di ricerca)"
      },
      {
        "kind": "paragraph",
        "text": "Pubblico"
      },
      {
        "kind": "paragraph",
        "text": "Tutti (indicizzato, Creative Commons BY-NC-SA 4.0)"
      },
      {
        "kind": "heading",
        "text": "11. Account e Biografia — Distinzione Permanente"
      },
      {
        "kind": "paragraph",
        "text": "L'Account è il tuo strumento operativo personale. Rimane inattivo per tutto il tempo in cui non viene utilizzato — senza conseguenze e senza alcun meccanismo automatico di eliminazione o archiviazione. L'account rimane disponibile per l'autore a tempo indeterminato."
      },
      {
        "kind": "paragraph",
        "text": "La Biografia è il contenuto d'archivio permanente. Sopravvive all'account, sopravvive all'autore e appartiene alla memoria collettiva dell'umanità."
      },
      {
        "kind": "paragraph",
        "text": "Dopo la morte dell'autore: la biografia viene congelata all'ultimo capitolo pubblicato. I familiari diretti possono richiedere la gestione dell'account fornendo la documentazione appropriata. Biography Library non eliminerà mai unilateralmente una biografia. L'eliminazione può avvenire solo su richiesta esplicita dell'autore, dei familiari aventi diritto o in caso di una violazione confermata delle regole di moderazione."
      },
      {
        "kind": "heading",
        "text": "12. I tuoi diritti"
      },
      {
        "kind": "heading",
        "text": "12.1 Diritto di accesso"
      },
      {
        "kind": "paragraph",
        "text": "Puoi richiedere una copia di tutti i dati personali in nostro possesso che ti riguardano."
      },
      {
        "kind": "heading",
        "text": "12.2 Diritto di rettifica"
      },
      {
        "kind": "paragraph",
        "text": "Puoi correggere le informazioni inesatte in qualsiasi momento."
      },
      {
        "kind": "heading",
        "text": "12.3 Diritto alla cancellazione"
      },
      {
        "kind": "paragraph",
        "text": "Autobiografie: cancellazione completa su richiesta. Dati cancellati entro 90 giorni. I capitoli pubblicati sono immutabili ma possono essere eliminati insieme all'intera autobiografia."
      },
      {
        "kind": "paragraph",
        "text": "Biografie di persone decedute nel periodo temporaneo: cancellazione immediata su richiesta."
      },
      {
        "kind": "paragraph",
        "text": "Biografie definitive di persone decedute: hai il diritto di richiederne la cancellazione. In casi eccezionali — laddove esista un documentato interesse storico o archivistico — Biography Library può fornire una giustificazione scritta per una valutazione diversa. In caso di disaccordo, hai il diritto di presentare un reclamo all'FDPIC."
      },
      {
        "kind": "heading",
        "text": "12.4 Diritto alla portabilità dei dati"
      },
      {
        "kind": "paragraph",
        "text": "Esporta i tuoi contenuti nei formati disponibili più comuni in qualsiasi momento."
      },
      {
        "kind": "heading",
        "text": "12.5 Diritto di limitazione, opposizione e revoca del consenso"
      },
      {
        "kind": "paragraph",
        "text": "Puoi limitare il trattamento, opporti al trattamento basato su un interesse legittimo o revocare il consenso per l'IA in qualsiasi momento — senza che ciò influisca sull'archiviazione delle tue biografie."
      },
      {
        "kind": "heading",
        "text": "12.6 Diritto di proporre reclamo"
      },
      {
        "kind": "paragraph",
        "text": "Svizzera: FDPIC — Feldeggweg 1, CH-3003 Berna — www.edoeb.admin.chEU: l'autorità di controllo della protezione dei dati del tuo paese di residenza."
      },
      {
        "kind": "paragraph",
        "text": "Come esercitare i propri diritti: support@biographylibrary.org — oggetto: Richiesta GDPR/nFADP Risposta fornita il prima possibile e in ogni caso entro 30 giorni."
      },
      {
        "kind": "heading",
        "text": "13. Intelligenza Artificiale"
      },
      {
        "kind": "heading",
        "text": "13.1 Cosa fa l'IA"
      },
      {
        "kind": "item",
        "text": "Corregge la grammatica e la punteggiatura"
      },
      {
        "kind": "item",
        "text": "Suggerisce frasi più chiare (approvi o rifiuti ogni suggerimento)"
      },
      {
        "kind": "item",
        "text": "Aiuta a strutturare e organizzare i capitoli biografici"
      },
      {
        "kind": "item",
        "text": "Traduce la biografia (rivedi sempre il risultato)"
      },
      {
        "kind": "item",
        "text": "Stimola i ricordi con domande guidate"
      },
      {
        "kind": "heading",
        "text": "13.2 Cosa NON fa l'IA"
      },
      {
        "kind": "item",
        "text": "❌ Non inventa fatti o eventi"
      },
      {
        "kind": "item",
        "text": "❌ Non modifica il testo senza la tua esplicita approvazione"
      },
      {
        "kind": "item",
        "text": "❌ Non pubblica nulla automaticamente"
      },
      {
        "kind": "item",
        "text": "❌ Non utilizza i tuoi contenuti per addestrare modelli di IA commerciali o proprietari"
      },
      {
        "kind": "heading",
        "text": "13.3 Elaborazione locale e trasparenza"
      },
      {
        "kind": "paragraph",
        "text": "Tutta l'elaborazione dell'IA avviene in Svizzera tramite i sistemi di IA di Infomaniak, basati su modelli open source. Nessun dato viene inviato a fornitori di IA di terze parti. Ogni suggerimento è contrassegnato dal badge “Suggerimento IA”. Puoi disabilitare l'IA in qualsiasi momento."
      },
      {
        "kind": "heading",
        "text": "13.4 Biografie pubbliche e sistemi di IA esterni"
      },
      {
        "kind": "paragraph",
        "text": "Le biografie pubblicate come pubbliche sono accessibili su internet. Biography Library dichiara esplicitamente che i contenuti dell'archivio non devono essere utilizzati per addestrare modelli di intelligenza artificiale commerciali o proprietari. I sistemi di intelligenza artificiale distribuiti con una licenza open source riconosciuta dall'OSI possono accedere all'archivio pubblico come fonte di riferimento verificata, con attribuzione obbligatoria della fonte e dell'autore. Le biografie private, semi-private e familiari sono tecnicamente inaccessibili a qualsiasi sistema esterno."
      },
      {
        "kind": "heading",
        "text": "14. Sistema di segnalazione"
      },
      {
        "kind": "paragraph",
        "text": "Ogni biografia include un pulsante “Segnala” accessibile all'intera comunità. Le segnalazioni vengono gestite il prima possibile e in ogni caso entro 30 giorni. Per i contenuti di Livello 1, la rimozione è immediata e automatica. I dettagli completi del processo sono stabiliti nei Termini di Servizio."
      },
      {
        "kind": "heading",
        "text": "15. Cookie e tracciamento"
      },
      {
        "kind": "paragraph",
        "text": "Cookie tecnici necessari (nessun consenso richiesto): token di sessione, preferenze di lingua, protezione CSRF, impostazioni sulla privacy."
      },
      {
        "kind": "paragraph",
        "text": "❌ Nessun cookie di profilazione sulle singole pagine delle biografie."
      },
      {
        "kind": "paragraph",
        "text": "Qualora dovessimo implementare l'analisi del traffico, utilizzeremo esclusivamente soluzioni self-hosted in Svizzera, con preavviso agli utenti."
      },
      {
        "kind": "heading",
        "text": "16. Conservazione dei dati"
      },
      {
        "kind": "paragraph",
        "text": "Tipo di dati"
      },
      {
        "kind": "paragraph",
        "text": "Periodo di conservazione"
      },
      {
        "kind": "paragraph",
        "text": "Informazioni sull'account"
      },
      {
        "kind": "paragraph",
        "text": "Permanentemente"
      },
      {
        "kind": "paragraph",
        "text": "Contenuto biografico"
      },
      {
        "kind": "paragraph",
        "text": "Permanentemente (missione di archiviazione)"
      },
      {
        "kind": "paragraph",
        "text": "Log di accesso"
      },
      {
        "kind": "paragraph",
        "text": "12 mesi"
      },
      {
        "kind": "paragraph",
        "text": "Indirizzi IP"
      },
      {
        "kind": "paragraph",
        "text": "12 mesi"
      },
      {
        "kind": "paragraph",
        "text": "Documenti di verifica dell'identità"
      },
      {
        "kind": "paragraph",
        "text": "Massimo 90 giorni"
      },
      {
        "kind": "paragraph",
        "text": "Suggerimenti dell'IA"
      },
      {
        "kind": "paragraph",
        "text": "Fino all'eliminazione della biografia associata"
      },
      {
        "kind": "paragraph",
        "text": "Backup"
      },
      {
        "kind": "paragraph",
        "text": "30 giorni, poi eliminazione permanente"
      },
      {
        "kind": "heading",
        "text": "17. Protezione dei minori"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library è destinata esclusivamente a persone di età pari o superiore a 18 anni. I minori non possono creare account, scrivere biografie o essere oggetto di biografie. Unica eccezione: una menzione generale di figli minori all'interno della propria autobiografia, senza dettagli personali sensibili."
      },
      {
        "kind": "heading",
        "text": "18. Trasferimenti internazionali di dati"
      },
      {
        "kind": "paragraph",
        "text": "Non trasferiamo dati personali al di fuori della Svizzera."
      },
      {
        "kind": "paragraph",
        "text": "Utente"
      },
      {
        "kind": "paragraph",
        "text": "Protezione applicabile"
      },
      {
        "kind": "paragraph",
        "text": "Svizzera"
      },
      {
        "kind": "paragraph",
        "text": "nLPD"
      },
      {
        "kind": "paragraph",
        "text": "UE / SEE"
      },
      {
        "kind": "paragraph",
        "text": "GDPR (Svizzera–UE"
      },
      {
        "kind": "paragraph",
        "text": "Altri paesi"
      },
      {
        "kind": "paragraph",
        "text": "nLPD svizzera"
      },
      {
        "kind": "heading",
        "text": "19. Modifiche alla presente Informativa"
      },
      {
        "kind": "paragraph",
        "text": "Notifica via email almeno 30 giorni prima che la nuova versione entri in vigore. Accettazione esplicita richiesta per modifiche sostanziali."
      },
      {
        "kind": "paragraph",
        "text": "Non retroattività: non modificheremo mai questa Informativa per ridurre le tutele già concesse agli utenti."
      },
      {
        "kind": "paragraph",
        "text": "Cronologia delle versioni: v1.0 — Marzo 2026 — Versione iniziale"
      },
      {
        "kind": "heading",
        "text": "20. Cosa succede se Biography Library chiude"
      },
      {
        "kind": "item",
        "text": "Almeno 6 mesi di preavviso a tutti gli utenti"
      },
      {
        "kind": "item",
        "text": "Esportazione dei dati nei formati disponibili più comuni"
      },
      {
        "kind": "item",
        "text": "Codice sorgente pubblico (AGPL v3) — chiunque può continuare il progetto"
      },
      {
        "kind": "item",
        "text": "Fork della community attivamente incoraggiato"
      },
      {
        "kind": "heading",
        "text": "21. Open Source e Trasparenza"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library è completamente open source sotto AGPL v3: github.com/BiographyLibrary/Biography-Library"
      },
      {
        "kind": "paragraph",
        "text": "Solo la Biography Library Association può emettere certificazioni ufficiali W3C Verifiable Credentials per le biografie pubblicate sulla piattaforma."
      },
      {
        "kind": "heading",
        "text": "22. Contatti"
      },
      {
        "kind": "item",
        "text": "Email: support@biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "Oggetto consigliato: Richiesta Privacy/GDPR/nFADP oppure Segnalazione"
      },
      {
        "kind": "item",
        "text": "Tempo di risposta: il prima possibile e in ogni caso entro 30 giorni"
      },
      {
        "kind": "paragraph",
        "text": "FDPIC: Feldeggweg 1, CH-3003 Berna — www.edoeb.admin.ch"
      },
      {
        "kind": "heading",
        "text": "23. Lingua e foro competente"
      },
      {
        "kind": "paragraph",
        "text": "Disponibile in: inglese, italiano, francese, tedesco. La versione inglese è quella legalmente vincolante."
      },
      {
        "kind": "paragraph",
        "text": "Legge applicabile: nFADP · GDPR (utenti UE/SEE) · Codice civile svizzero · Codice penale svizzero"
      },
      {
        "kind": "paragraph",
        "text": "Foro competente: Tribunali di Lugano, Ticino, Svizzera. Gli utenti dell'UE mantengono il diritto di avviare procedimenti dinanzi ai tribunali del proprio paese di residenza."
      },
      {
        "kind": "heading",
        "text": "24. Accettazione"
      },
      {
        "kind": "paragraph",
        "text": "Utilizzando Biography Library, accetti questa Informativa sulla privacy. Per qualsiasi chiarimento: support@biographylibrary.org"
      },
      {
        "kind": "paragraph",
        "text": "Versione: 1.0 | Marzo 2026 | Licenza del documento: CC BY-SA 4.0"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library è un archivio non-profit e open-source della memoria umana."
      },
      {
        "kind": "paragraph",
        "text": "Navigazione"
      },
      {
        "kind": "paragraph",
        "text": "Note legali"
      },
      {
        "kind": "paragraph",
        "text": "© 2026 Biography Library — Associazione svizzera senza scopo di lucro · Software: AGPL v3.0 · Contenuti pubblici: CC BY-NC-SA 4.0"
      }
    ],
    "en": [
      {
        "kind": "title",
        "text": "Privacy Policy"
      },
      {
        "kind": "version",
        "text": "Version 1.0 – March 2026"
      },
      {
        "kind": "heading",
        "text": "1. Who We Are"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library is a Swiss non-profit association with registered offices in Lugano, Ticino, Switzerland, established under Articles 60 et seq. of the Swiss Civil Code."
      },
      {
        "kind": "paragraph",
        "text": "Mission: to preserve human memory through a permanent, verified and universal archive of personal biographies."
      },
      {
        "kind": "paragraph",
        "text": "Contact:"
      },
      {
        "kind": "item",
        "text": "Website: biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "Email: support@biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "Address: Lugano, Ticino, Switzerland"
      },
      {
        "kind": "heading",
        "text": "2. Core Principles"
      },
      {
        "kind": "paragraph",
        "text": "This Privacy Policy is grounded in the Non-Negotiable Principles of our Manifesto:"
      },
      {
        "kind": "item",
        "text": "Data Ownership – You own your story; we are merely its custodians"
      },
      {
        "kind": "item",
        "text": "Privacy by Design – Maximum protection built into every layer of the platform"
      },
      {
        "kind": "item",
        "text": "Ethical and Local AI – AI processing takes place on Swiss territory, never sent to third parties"
      },
      {
        "kind": "item",
        "text": "Swiss Hosting – All data resides exclusively in Switzerland"
      },
      {
        "kind": "item",
        "text": "Full Transparency – No sale or commercial sharing of your data, ever"
      },
      {
        "kind": "item",
        "text": "User Control – You decide who can access your biography"
      },
      {
        "kind": "item",
        "text": "Data Minimisation – We collect only the minimum data strictly necessary"
      },
      {
        "kind": "heading",
        "text": "3. What Data We Collect"
      },
      {
        "kind": "heading",
        "text": "3.1 Registration Data"
      },
      {
        "kind": "item",
        "text": "First and last name"
      },
      {
        "kind": "item",
        "text": "Email address"
      },
      {
        "kind": "item",
        "text": "Password (stored in encrypted form — never readable by us)"
      },
      {
        "kind": "paragraph",
        "text": "WHAT WE NEVER COLLECT AT REGISTRATION:"
      },
      {
        "kind": "item",
        "text": "❌ Identity documents (passport, national ID card)"
      },
      {
        "kind": "item",
        "text": "❌ Birth, marriage or death certificates"
      },
      {
        "kind": "item",
        "text": "❌ Biometric data"
      },
      {
        "kind": "heading",
        "text": "3.2 Identity Verification – Only Upon Report"
      },
      {
        "kind": "paragraph",
        "text": "At registration we rely exclusively on self-attestation. Only in the event of a report or reasonable concern may we request additional documentation."
      },
      {
        "kind": "paragraph",
        "text": "Retention of verification documents:"
      },
      {
        "kind": "item",
        "text": "Stored in offline archives only for the time needed (maximum 90 days)"
      },
      {
        "kind": "item",
        "text": "Automatically deleted after verification is complete"
      },
      {
        "kind": "item",
        "text": "Never shared with commercial third parties"
      },
      {
        "kind": "heading",
        "text": "3.3 Biographical Content"
      },
      {
        "kind": "item",
        "text": "Biography text (no character limit)"
      },
      {
        "kind": "item",
        "text": "Images and photographs"
      },
      {
        "kind": "item",
        "text": "Voice recordings"
      },
      {
        "kind": "item",
        "text": "Metadata (creation dates, edits, languages, chapter number)"
      },
      {
        "kind": "heading",
        "text": "3.4 Technical and Navigation Data"
      },
      {
        "kind": "item",
        "text": "IP address (retained for 12 months)"
      },
      {
        "kind": "item",
        "text": "Necessary technical cookies"
      },
      {
        "kind": "item",
        "text": "Access logs (retained for 12 months)"
      },
      {
        "kind": "item",
        "text": "Language preferences and user settings"
      },
      {
        "kind": "heading",
        "text": "3.5 AI-Generated Data"
      },
      {
        "kind": "item",
        "text": "History of AI suggestions"
      },
      {
        "kind": "item",
        "text": "Prompts and requests submitted to the AI assistant"
      },
      {
        "kind": "paragraph",
        "text": "AI processing: exclusively in Switzerland via Infomaniak’s AI systems, based on open source models."
      },
      {
        "kind": "heading",
        "text": "4. What Biographies You Can Create"
      },
      {
        "kind": "heading",
        "text": "4.1 Autobiographies — The Living Biographical Document"
      },
      {
        "kind": "paragraph",
        "text": "You write the story of your own life. Your autobiography is a living document structured in chapters: after publishing your first chapter, you may add a new one after a minimum of 365 days. You are not required to do this every year — you may wait many years before adding a new chapter. Each chapter is immutable once published: your words remain exactly as written, forever."
      },
      {
        "kind": "paragraph",
        "text": "After your death, your autobiography is frozen at the last chapter you published. No one may add anything to your original voice. Your family members may honour your memory by writing a separate biography, linked to your autobiography on your personal page."
      },
      {
        "kind": "heading",
        "text": "4.2 Biographies of Deceased Persons"
      },
      {
        "kind": "paragraph",
        "text": "These may be written exclusively by a direct family member of the deceased. Multiple family members may write separate biographies of the same person — each document reflects its author’s perspective. Biographies of deceased persons are subject to the 30-day temporary period (see Section 9)."
      },
      {
        "kind": "paragraph",
        "text": "WHAT YOU CANNOT DO:"
      },
      {
        "kind": "item",
        "text": "❌ Create biographies of living persons other than yourself"
      },
      {
        "kind": "item",
        "text": "❌ Create biographies of minors under 18 (even if deceased)"
      },
      {
        "kind": "item",
        "text": "❌ Create biographies of deceased persons without a direct family connection"
      },
      {
        "kind": "item",
        "text": "❌ Publish biographies without being able to prove the person’s death if requested"
      },
      {
        "kind": "heading",
        "text": "5. How We Use Your Data"
      },
      {
        "kind": "heading",
        "text": "5.1 Purposes of Processing"
      },
      {
        "kind": "item",
        "text": "Providing the service"
      },
      {
        "kind": "item",
        "text": "Managing the biographical chapter system"
      },
      {
        "kind": "item",
        "text": "AI assistance"
      },
      {
        "kind": "item",
        "text": "Account management"
      },
      {
        "kind": "item",
        "text": "Security and abuse prevention"
      },
      {
        "kind": "item",
        "text": "Automated and human content moderation"
      },
      {
        "kind": "item",
        "text": "Legal compliance"
      },
      {
        "kind": "heading",
        "text": "5.2 What We Never Do"
      },
      {
        "kind": "item",
        "text": "❌ We do not sell your data"
      },
      {
        "kind": "item",
        "text": "❌ We do not use your data for advertising or commercial profiling"
      },
      {
        "kind": "item",
        "text": "❌ We do not train commercial or proprietary AI models on your content"
      },
      {
        "kind": "item",
        "text": "❌ We do not share data with governments (except where required by Swiss law)"
      },
      {
        "kind": "item",
        "text": "❌ We do not retroactively amend this Policy to reduce your protections"
      },
      {
        "kind": "item",
        "text": "❌ We do not collect identity documents without a concrete operational necessity"
      },
      {
        "kind": "item",
        "text": "❌ We do not display advertising or sponsor logos on individual biographies"
      },
      {
        "kind": "heading",
        "text": "6. Legal Basis for Processing"
      },
      {
        "kind": "item",
        "text": "Contract – To provide the service you have requested"
      },
      {
        "kind": "item",
        "text": "Consent – For AI features (withdrawable at any time)"
      },
      {
        "kind": "item",
        "text": "Legal Obligation – To comply with Swiss law (nFADP) and GDPR for EU users"
      },
      {
        "kind": "item",
        "text": "Legitimate Interest – To prevent fraud and ensure platform security"
      },
      {
        "kind": "heading",
        "text": "7. With Whom We Share Your Data"
      },
      {
        "kind": "heading",
        "text": "7.1 Service Providers"
      },
      {
        "kind": "paragraph",
        "text": "Provider"
      },
      {
        "kind": "paragraph",
        "text": "Location"
      },
      {
        "kind": "paragraph",
        "text": "Role"
      },
      {
        "kind": "paragraph",
        "text": "Safeguards"
      },
      {
        "kind": "paragraph",
        "text": "Infomaniak SA"
      },
      {
        "kind": "paragraph",
        "text": "Switzerland"
      },
      {
        "kind": "paragraph",
        "text": "Hosting, infrastructure and AI"
      },
      {
        "kind": "paragraph",
        "text": "DPA compliant with nFADP/GDPR, data in CH"
      },
      {
        "kind": "paragraph",
        "text": "⚠️ Data never leaves Swiss jurisdiction. No transfers to countries lacking adequate data protection standards."
      },
      {
        "kind": "paragraph",
        "text": "Database: the definitive technology stack for the production database has not yet been finalised. The selected solution will be hosted exclusively on Swiss infrastructure. This Policy will be updated before the public launch."
      },
      {
        "kind": "heading",
        "text": "7.2 Family Access"
      },
      {
        "kind": "paragraph",
        "text": "Family members may access your content exclusively according to the permissions you have set."
      },
      {
        "kind": "heading",
        "text": "7.3 Public Authorities"
      },
      {
        "kind": "paragraph",
        "text": "We share your data with government authorities only if required by a valid Swiss court order, necessary to prevent a serious crime, or mandatory under the nFADP or Swiss Criminal Code."
      },
      {
        "kind": "heading",
        "text": "7.4 Sponsors"
      },
      {
        "kind": "paragraph",
        "text": "User data is never shared with sponsors. Sponsors cannot access personal data, cannot influence content moderation, and their logos never appear on individual biographies — only on the institutional website, the app and promotional materials."
      },
      {
        "kind": "heading",
        "text": "8. Where Your Data Is Stored"
      },
      {
        "kind": "paragraph",
        "text": "Data Residency – 100% Switzerland: all servers, backups and AI processing operate exclusively on Infomaniak infrastructure with data centres in Switzerland."
      },
      {
        "kind": "paragraph",
        "text": "Technical Security: encryption in transit (TLS 1.3+), encryption at rest, multi-factor authentication (MFA), daily encrypted backups, audit logs, verifiable open source code (AGPL v3)."
      },
      {
        "kind": "heading",
        "text": "9. Temporary Period for Biographies of Deceased Persons"
      },
      {
        "kind": "paragraph",
        "text": "When a family member publishes a biography of a deceased person, it is marked as “temporary” for the first 30 days. During this period:"
      },
      {
        "kind": "item",
        "text": "The biography is public and visible to everyone, marked as “under temporary review”"
      },
      {
        "kind": "item",
        "text": "Anyone mentioned — or their direct family members — may file a report and request not to appear"
      },
      {
        "kind": "item",
        "text": "The author may choose to notify cited persons directly but is not required to do so"
      },
      {
        "kind": "item",
        "text": "The “Report” button is accessible to the entire community"
      },
      {
        "kind": "paragraph",
        "text": "At the end of 30 days:"
      },
      {
        "kind": "item",
        "text": "No reports received → the biography becomes definitive"
      },
      {
        "kind": "item",
        "text": "Report received → the author receives a request to modify or remove the indicated content, assessed based on the nature and validity of the report"
      },
      {
        "kind": "paragraph",
        "text": "Before publication, every biography undergoes automated scanning to detect content that violates the moderation levels defined in the Terms of Service."
      },
      {
        "kind": "heading",
        "text": "10. Access Control"
      },
      {
        "kind": "paragraph",
        "text": "Privacy Level"
      },
      {
        "kind": "paragraph",
        "text": "Who Can Access"
      },
      {
        "kind": "paragraph",
        "text": "Private"
      },
      {
        "kind": "paragraph",
        "text": "You only"
      },
      {
        "kind": "paragraph",
        "text": "Family Only"
      },
      {
        "kind": "paragraph",
        "text": "You + family members you explicitly invite"
      },
      {
        "kind": "paragraph",
        "text": "Semi-private"
      },
      {
        "kind": "paragraph",
        "text": "Anyone with the direct link (not indexed by search engines)"
      },
      {
        "kind": "paragraph",
        "text": "Public"
      },
      {
        "kind": "paragraph",
        "text": "Everyone (indexed, Creative Commons BY-NC-SA 4.0)"
      },
      {
        "kind": "heading",
        "text": "11. Account and Biography — Permanent Distinction"
      },
      {
        "kind": "paragraph",
        "text": "The Account is your personal operational tool. It remains dormant for as long as it is not used — with no consequences and no automatic deletion or archiving mechanism. The account remains available to the author indefinitely."
      },
      {
        "kind": "paragraph",
        "text": "The Biography is the permanent archival content. It outlives the account, outlives the author, and belongs to the collective memory of humanity."
      },
      {
        "kind": "paragraph",
        "text": "After the author’s death: the biography is frozen at the last published chapter. Direct family members may request account management by providing appropriate documentation. Biography Library will never unilaterally delete a biography. Deletion can only occur upon explicit request by the author, entitled family members, or in the event of a confirmed moderation violation."
      },
      {
        "kind": "heading",
        "text": "12. Your Rights"
      },
      {
        "kind": "heading",
        "text": "12.1 Right of Access"
      },
      {
        "kind": "paragraph",
        "text": "You may request a copy of all personal data we hold about you."
      },
      {
        "kind": "heading",
        "text": "12.2 Right of Rectification"
      },
      {
        "kind": "paragraph",
        "text": "You may correct inaccurate information at any time."
      },
      {
        "kind": "heading",
        "text": "12.3 Right to Erasure"
      },
      {
        "kind": "paragraph",
        "text": "Autobiographies: complete deletion on request. Data erased within 90 days. Published chapters are immutable but may be deleted together with the entire autobiography."
      },
      {
        "kind": "paragraph",
        "text": "Biographies of deceased persons in the temporary period: immediate deletion on request."
      },
      {
        "kind": "paragraph",
        "text": "Definitive biographies of deceased persons: you have the right to request deletion. In exceptional cases — where a documented historical or archival interest exists — Biography Library may provide written justification for a different assessment. In case of disagreement, you have the right to lodge a complaint with the FDPIC."
      },
      {
        "kind": "heading",
        "text": "12.4 Right to Data Portability"
      },
      {
        "kind": "paragraph",
        "text": "Export your content in the most common available formats at any time."
      },
      {
        "kind": "heading",
        "text": "12.5 Right to Restriction, Objection and Withdrawal of Consent"
      },
      {
        "kind": "paragraph",
        "text": "You may restrict processing, object to processing based on legitimate interest, or withdraw AI consent at any time — without affecting the storage of your biographies."
      },
      {
        "kind": "heading",
        "text": "12.6 Right to Lodge a Complaint"
      },
      {
        "kind": "paragraph",
        "text": "Switzerland: FDPIC — Feldeggweg 1, CH-3003 Bern — www.edoeb.admin.chEU: the data protection supervisory authority of your country of residence."
      },
      {
        "kind": "paragraph",
        "text": "How to exercise your rights: support@biographylibrary.org — subject line: GDPR/nFADP RequestResponse provided as soon as possible and in any case within 30 days."
      },
      {
        "kind": "heading",
        "text": "13. Artificial Intelligence"
      },
      {
        "kind": "heading",
        "text": "13.1 What AI Does"
      },
      {
        "kind": "item",
        "text": "Corrects grammar and punctuation"
      },
      {
        "kind": "item",
        "text": "Suggests clearer phrasing (you approve or reject every suggestion)"
      },
      {
        "kind": "item",
        "text": "Helps structure and organise biographical chapters"
      },
      {
        "kind": "item",
        "text": "Translates the biography (you always review the result)"
      },
      {
        "kind": "item",
        "text": "Prompts memories with guided questions"
      },
      {
        "kind": "heading",
        "text": "13.2 What AI Does NOT Do"
      },
      {
        "kind": "item",
        "text": "❌ Does not invent facts or events"
      },
      {
        "kind": "item",
        "text": "❌ Does not edit text without your explicit approval"
      },
      {
        "kind": "item",
        "text": "❌ Does not auto-publish anything"
      },
      {
        "kind": "item",
        "text": "❌ Does not use your content to train commercial or proprietary AI models"
      },
      {
        "kind": "heading",
        "text": "13.3 Local Processing and Transparency"
      },
      {
        "kind": "paragraph",
        "text": "All AI processing takes place in Switzerland via Infomaniak’s AI systems, based on open source models. No data is sent to third-party AI providers. Every suggestion is marked with the “AI Suggestion” badge. You may disable AI at any time."
      },
      {
        "kind": "heading",
        "text": "13.4 Public Biographies and External AI Systems"
      },
      {
        "kind": "paragraph",
        "text": "Biographies published as public are accessible on the internet. Biography Library explicitly states that archive content must not be used to train commercial or proprietary AI models. AI systems distributed under an OSI-recognised open source licence may access the public archive as a verified reference source, with mandatory attribution of the source and author. Private, semi-private and family biographies are technically inaccessible to any external system."
      },
      {
        "kind": "heading",
        "text": "14. Reporting System"
      },
      {
        "kind": "paragraph",
        "text": "Every biography includes a “Report” button accessible to the entire community. Reports are handled as soon as possible and in any case within 30 days. For Level 1 content, removal is immediate and automatic. Full process details are set out in the Terms of Service."
      },
      {
        "kind": "heading",
        "text": "15. Cookies and Tracking"
      },
      {
        "kind": "paragraph",
        "text": "Necessary technical cookies (no consent required): session token, language preferences, CSRF protection, privacy settings."
      },
      {
        "kind": "paragraph",
        "text": "❌ No profiling cookies on individual biography pages."
      },
      {
        "kind": "paragraph",
        "text": "Should we implement traffic analytics, we will use exclusively self-hosted solutions in Switzerland, with prior notice to users."
      },
      {
        "kind": "heading",
        "text": "16. Data Retention"
      },
      {
        "kind": "paragraph",
        "text": "Data Type"
      },
      {
        "kind": "paragraph",
        "text": "Retention Period"
      },
      {
        "kind": "paragraph",
        "text": "Account information"
      },
      {
        "kind": "paragraph",
        "text": "Permanently"
      },
      {
        "kind": "paragraph",
        "text": "Biographical content"
      },
      {
        "kind": "paragraph",
        "text": "Permanently (archival mission)"
      },
      {
        "kind": "paragraph",
        "text": "Access logs"
      },
      {
        "kind": "paragraph",
        "text": "12 months"
      },
      {
        "kind": "paragraph",
        "text": "IP addresses"
      },
      {
        "kind": "paragraph",
        "text": "12 months"
      },
      {
        "kind": "paragraph",
        "text": "Identity verification documents"
      },
      {
        "kind": "paragraph",
        "text": "Maximum 90 days"
      },
      {
        "kind": "paragraph",
        "text": "AI suggestions"
      },
      {
        "kind": "paragraph",
        "text": "Until the associated biography is deleted"
      },
      {
        "kind": "paragraph",
        "text": "Backups"
      },
      {
        "kind": "paragraph",
        "text": "30 days, then permanent deletion"
      },
      {
        "kind": "heading",
        "text": "17. Protection of Minors"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library is intended exclusively for persons aged 18 and over. Minors may not create accounts, write biographies or be the subject of biographies. Sole exception: a general mention of minor children within your own autobiography, without sensitive personal details."
      },
      {
        "kind": "heading",
        "text": "18. International Data Transfers"
      },
      {
        "kind": "paragraph",
        "text": "We do not transfer personal data outside of Switzerland."
      },
      {
        "kind": "paragraph",
        "text": "User"
      },
      {
        "kind": "paragraph",
        "text": "Applicable Protection"
      },
      {
        "kind": "paragraph",
        "text": "Switzerland"
      },
      {
        "kind": "paragraph",
        "text": "nFADP"
      },
      {
        "kind": "paragraph",
        "text": "EU / EEA"
      },
      {
        "kind": "paragraph",
        "text": "GDPR (Switzerland–EU"
      },
      {
        "kind": "paragraph",
        "text": "Other countries"
      },
      {
        "kind": "paragraph",
        "text": "Swiss nFADP"
      },
      {
        "kind": "heading",
        "text": "19. Changes to this Policy"
      },
      {
        "kind": "paragraph",
        "text": "Email notification at least 30 days before the new version takes effect. Explicit acceptance required for material changes."
      },
      {
        "kind": "paragraph",
        "text": "Non-retroactivity: we will never amend this Policy to reduce protections already granted to users."
      },
      {
        "kind": "paragraph",
        "text": "Version history: v1.0 — March 2026 — Initial version"
      },
      {
        "kind": "heading",
        "text": "20. What Happens if Biography Library Closes"
      },
      {
        "kind": "item",
        "text": "At least 6 months’ advance notice to all users"
      },
      {
        "kind": "item",
        "text": "Data export in the most common available formats"
      },
      {
        "kind": "item",
        "text": "Public source code (AGPL v3) — anyone may continue the project"
      },
      {
        "kind": "item",
        "text": "Community fork actively encouraged"
      },
      {
        "kind": "heading",
        "text": "21. Open Source and Transparency"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library is fully open source under AGPL v3: github.com/BiographyLibrary/Biography-Library"
      },
      {
        "kind": "paragraph",
        "text": "Only the Biography Library Association may issue official W3C Verifiable Credentials certifications for biographies published on the platform."
      },
      {
        "kind": "heading",
        "text": "22. Contact"
      },
      {
        "kind": "item",
        "text": "Email: support@biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "Recommended subject: Privacy/GDPR/nFADP Request or Report"
      },
      {
        "kind": "item",
        "text": "Response time: as soon as possible and in any case within 30 days"
      },
      {
        "kind": "paragraph",
        "text": "FDPIC: Feldeggweg 1, CH-3003 Bern — www.edoeb.admin.ch"
      },
      {
        "kind": "heading",
        "text": "23. Language and Jurisdiction"
      },
      {
        "kind": "paragraph",
        "text": "Available in: English, Italian, French, German. The English version is the legally binding version."
      },
      {
        "kind": "paragraph",
        "text": "Applicable law: nFADP · GDPR (EU/EEA users) · Swiss Civil Code · Swiss Criminal Code"
      },
      {
        "kind": "paragraph",
        "text": "Jurisdiction: Courts of Lugano, Ticino, Switzerland. EU users retain the right to bring proceedings before the courts of their country of residence."
      },
      {
        "kind": "heading",
        "text": "24. Acceptance"
      },
      {
        "kind": "paragraph",
        "text": "By using Biography Library, you accept this Privacy Policy. For any clarification: support@biographylibrary.org"
      },
      {
        "kind": "paragraph",
        "text": "Version: 1.0 | March 2026 | Document licence: CC BY-SA 4.0"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library is a non-profit, open-source archive of human memory."
      },
      {
        "kind": "paragraph",
        "text": "Navigation"
      },
      {
        "kind": "paragraph",
        "text": "Legal"
      },
      {
        "kind": "paragraph",
        "text": "© 2026 Biography Library — Swiss non-profit association · Software: AGPL v3.0 · Public content: CC BY-NC-SA 4.0"
      }
    ],
    "fr": [
      {
        "kind": "title",
        "text": "Politique de confidentialité"
      },
      {
        "kind": "version",
        "text": "Version 1.0 – Mars 2026"
      },
      {
        "kind": "heading",
        "text": "1. Qui sommes-nous"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library est une association suisse à but non lucratif dont le siège social est situé à Lugano, au Tessin, en Suisse, établie conformément aux articles 60 et suivants du Code civil suisse."
      },
      {
        "kind": "paragraph",
        "text": "Mission : préserver la mémoire humaine à travers des archives permanentes, vérifiées et universelles de biographies personnelles."
      },
      {
        "kind": "paragraph",
        "text": "Contact :"
      },
      {
        "kind": "item",
        "text": "Site web : biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "E-mail : support@biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "Adresse : Lugano, Tessin, Suisse"
      },
      {
        "kind": "heading",
        "text": "2. Principes fondamentaux"
      },
      {
        "kind": "paragraph",
        "text": "Cette politique de confidentialité est fondée sur les principes non négociables de notre Manifeste :"
      },
      {
        "kind": "item",
        "text": "Propriété des données – Vous êtes propriétaire de votre histoire ; nous n'en sommes que les gardiens"
      },
      {
        "kind": "item",
        "text": "Confidentialité dès la conception – Une protection maximale intégrée à chaque niveau de la plateforme"
      },
      {
        "kind": "item",
        "text": "IA éthique et locale – Le traitement par l'IA a lieu sur le territoire suisse, jamais envoyé à des tiers"
      },
      {
        "kind": "item",
        "text": "Hébergement suisse – Toutes les données résident exclusivement en Suisse"
      },
      {
        "kind": "item",
        "text": "Transparence totale – Aucune vente ni partage commercial de vos données, jamais"
      },
      {
        "kind": "item",
        "text": "Contrôle de l'utilisateur – Vous décidez qui peut accéder à votre biographie"
      },
      {
        "kind": "item",
        "text": "Minimisation des données – Nous ne collectons que les données minimales strictement nécessaires"
      },
      {
        "kind": "heading",
        "text": "3. Quelles données nous collectons"
      },
      {
        "kind": "heading",
        "text": "3.1 Données d'inscription"
      },
      {
        "kind": "item",
        "text": "Prénom et nom"
      },
      {
        "kind": "item",
        "text": "Adresse e-mail"
      },
      {
        "kind": "item",
        "text": "Mot de passe (stocké sous forme chiffrée — jamais lisible par nous)"
      },
      {
        "kind": "paragraph",
        "text": "CE QUE NOUS NE COLLECTONS JAMAIS LORS DE L'INSCRIPTION :"
      },
      {
        "kind": "item",
        "text": "❌ Documents d'identité (passeport, carte nationale d'identité)"
      },
      {
        "kind": "item",
        "text": "❌ Actes de naissance, de mariage ou de décès"
      },
      {
        "kind": "item",
        "text": "❌ Données biométriques"
      },
      {
        "kind": "heading",
        "text": "3.2 Vérification d'identité – Uniquement sur signalement"
      },
      {
        "kind": "paragraph",
        "text": "Lors de l'inscription, nous nous appuyons exclusivement sur l'auto-attestation. Ce n'est qu'en cas de signalement ou de préoccupation raisonnable que nous pouvons demander des documents supplémentaires."
      },
      {
        "kind": "paragraph",
        "text": "Conservation des documents de vérification :"
      },
      {
        "kind": "item",
        "text": "Stockés dans des archives hors ligne uniquement pour la durée nécessaire (maximum 90 jours)"
      },
      {
        "kind": "item",
        "text": "Supprimés automatiquement une fois la vérification terminée"
      },
      {
        "kind": "item",
        "text": "Jamais partagés avec des tiers commerciaux"
      },
      {
        "kind": "heading",
        "text": "3.3 Contenu biographique"
      },
      {
        "kind": "item",
        "text": "Texte de la biographie (aucune limite de caractères)"
      },
      {
        "kind": "item",
        "text": "Images et photographies"
      },
      {
        "kind": "item",
        "text": "Enregistrements vocaux"
      },
      {
        "kind": "item",
        "text": "Métadonnées (dates de création, modifications, langues, numéro de chapitre)"
      },
      {
        "kind": "heading",
        "text": "3.4 Données techniques et de navigation"
      },
      {
        "kind": "item",
        "text": "Adresse IP (conservée pendant 12 mois)"
      },
      {
        "kind": "item",
        "text": "Cookies techniques nécessaires"
      },
      {
        "kind": "item",
        "text": "Journaux d'accès (conservés pendant 12 mois)"
      },
      {
        "kind": "item",
        "text": "Préférences linguistiques et paramètres utilisateur"
      },
      {
        "kind": "heading",
        "text": "3.5 Données générées par l'IA"
      },
      {
        "kind": "item",
        "text": "Historique des suggestions de l'IA"
      },
      {
        "kind": "item",
        "text": "Prompts et requêtes soumis à l'assistant IA"
      },
      {
        "kind": "paragraph",
        "text": "Traitement par l'IA : exclusivement en Suisse via les systèmes d'IA d'Infomaniak, basés sur des modèles open source."
      },
      {
        "kind": "heading",
        "text": "4. Quelles biographies vous pouvez créer"
      },
      {
        "kind": "heading",
        "text": "4.1 Autobiographies — Le document biographique vivant"
      },
      {
        "kind": "paragraph",
        "text": "Vous écrivez l'histoire de votre propre vie. Votre autobiographie est un document vivant structuré en chapitres : après la publication de votre premier chapitre, vous pouvez en ajouter un nouveau après un minimum de 365 jours. Vous n'êtes pas tenu de le faire chaque année — vous pouvez attendre de nombreuses années avant d'ajouter un nouveau chapitre. Chaque chapitre est immuable une fois publié : vos mots restent exactement tels qu'ils ont été écrits, pour toujours."
      },
      {
        "kind": "paragraph",
        "text": "Après votre décès, votre autobiographie est figée au dernier chapitre que vous avez publié. Personne ne peut rien ajouter à votre voix originale. Les membres de votre famille peuvent honorer votre mémoire en écrivant une biographie distincte, liée à votre autobiographie sur votre page personnelle."
      },
      {
        "kind": "heading",
        "text": "4.2 Biographies de personnes décédées"
      },
      {
        "kind": "paragraph",
        "text": "Celles-ci peuvent être écrites exclusivement par un membre direct de la famille du défunt. Plusieurs membres de la famille peuvent écrire des biographies distinctes de la même personne — chaque document reflète le point de vue de son auteur. Les biographies de personnes décédées sont soumises à la période temporaire de 30 jours (voir Section 9)."
      },
      {
        "kind": "paragraph",
        "text": "CE QUE VOUS NE POUVEZ PAS FAIRE :"
      },
      {
        "kind": "item",
        "text": "❌ Créer des biographies de personnes vivantes autres que vous-même"
      },
      {
        "kind": "item",
        "text": "❌ Créer des biographies de mineurs de moins de 18 ans (même s'ils sont décédés)"
      },
      {
        "kind": "item",
        "text": "❌ Créer des biographies de personnes décédées sans lien de parenté direct"
      },
      {
        "kind": "item",
        "text": "❌ Publier des biographies sans pouvoir prouver le décès de la personne en cas de demande"
      },
      {
        "kind": "heading",
        "text": "5. Comment nous utilisons vos données"
      },
      {
        "kind": "heading",
        "text": "5.1 Finalités du traitement"
      },
      {
        "kind": "item",
        "text": "Fourniture du service"
      },
      {
        "kind": "item",
        "text": "Gestion du système de chapitres biographiques"
      },
      {
        "kind": "item",
        "text": "Assistance par IA"
      },
      {
        "kind": "item",
        "text": "Gestion du compte"
      },
      {
        "kind": "item",
        "text": "Sécurité et prévention des abus"
      },
      {
        "kind": "item",
        "text": "Modération de contenu automatisée et humaine"
      },
      {
        "kind": "item",
        "text": "Conformité légale"
      },
      {
        "kind": "heading",
        "text": "5.2 Ce que nous ne faisons jamais"
      },
      {
        "kind": "item",
        "text": "❌ Nous ne vendons pas vos données"
      },
      {
        "kind": "item",
        "text": "❌ Nous n'utilisons pas vos données à des fins publicitaires ou de profilage commercial"
      },
      {
        "kind": "item",
        "text": "❌ Nous n'entraînons pas de modèles d'IA commerciaux ou propriétaires sur votre contenu"
      },
      {
        "kind": "item",
        "text": "❌ Nous ne partageons pas de données avec les gouvernements (sauf si la loi suisse l'exige)"
      },
      {
        "kind": "item",
        "text": "❌ Nous ne modifions pas rétroactivement cette Politique pour réduire vos protections"
      },
      {
        "kind": "item",
        "text": "❌ Nous ne collectons pas de documents d'identité sans une nécessité opérationnelle concrète"
      },
      {
        "kind": "item",
        "text": "❌ Nous n'affichons pas de publicité ni de logos de sponsors sur les biographies individuelles"
      },
      {
        "kind": "heading",
        "text": "6. Base légale du traitement"
      },
      {
        "kind": "item",
        "text": "Contrat – Pour fournir le service que vous avez demandé"
      },
      {
        "kind": "item",
        "text": "Consentement – Pour les fonctionnalités d'IA (révocable à tout moment)"
      },
      {
        "kind": "item",
        "text": "Obligation légale – Pour se conformer à la loi suisse (nLPD) et au RGPD pour les utilisateurs de l'UE"
      },
      {
        "kind": "item",
        "text": "Intérêt légitime – Pour prévenir la fraude et assurer la sécurité de la plateforme"
      },
      {
        "kind": "heading",
        "text": "7. Avec qui nous partageons vos données"
      },
      {
        "kind": "heading",
        "text": "7.1 Prestataires de services"
      },
      {
        "kind": "paragraph",
        "text": "Prestataire"
      },
      {
        "kind": "paragraph",
        "text": "Localisation"
      },
      {
        "kind": "paragraph",
        "text": "Rôle"
      },
      {
        "kind": "paragraph",
        "text": "Garanties"
      },
      {
        "kind": "paragraph",
        "text": "Infomaniak SA"
      },
      {
        "kind": "paragraph",
        "text": "Suisse"
      },
      {
        "kind": "paragraph",
        "text": "Hébergement, infrastructure et IA"
      },
      {
        "kind": "paragraph",
        "text": "DPA conforme à nLPD/RGPD, données en CH"
      },
      {
        "kind": "paragraph",
        "text": "⚠️ Les données ne quittent jamais la juridiction suisse. Aucun transfert vers des pays dépourvus de normes adéquates en matière de protection des données."
      },
      {
        "kind": "paragraph",
        "text": "Base de données : la pile technologique définitive pour la base de données de production n'a pas encore été finalisée. La solution retenue sera hébergée exclusivement sur une infrastructure suisse. Cette Politique sera mise à jour avant le lancement public."
      },
      {
        "kind": "heading",
        "text": "9. 7.2 Accès familial"
      },
      {
        "kind": "paragraph",
        "text": "Les membres de la famille peuvent accéder à votre contenu exclusivement selon les autorisations que vous avez définies."
      },
      {
        "kind": "heading",
        "text": "11. 7.3 Autorités publiques"
      },
      {
        "kind": "paragraph",
        "text": "Nous partageons vos données avec les autorités gouvernementales uniquement si cela est requis par une ordonnance valide d'un tribunal suisse, nécessaire pour prévenir un crime grave, ou obligatoire en vertu de la nLPD ou du Code pénal suisse."
      },
      {
        "kind": "heading",
        "text": "13. 7.4 Sponsors"
      },
      {
        "kind": "paragraph",
        "text": "Les données des utilisateurs ne sont jamais partagées avec les sponsors. Les sponsors ne peuvent pas accéder aux données personnelles, ne peuvent pas influencer la modération du contenu, et leurs logos n'apparaissent jamais sur les biographies individuelles — uniquement sur le site institutionnel, l'application et le matériel promotionnel."
      },
      {
        "kind": "heading",
        "text": "15. 8. Où vos données sont stockées"
      },
      {
        "kind": "paragraph",
        "text": "Résidence des données – 100% Suisse : tous les serveurs, sauvegardes et traitements d'IA fonctionnent exclusivement sur l'infrastructure d'Infomaniak avec des centres de données en Suisse."
      },
      {
        "kind": "paragraph",
        "text": "Sécurité technique : chiffrement en transit (TLS 1.3+), chiffrement au repos, authentification multifacteur (MFA), sauvegardes quotidiennes chiffrées, journaux d'audit, code open source vérifiable (AGPL v3)."
      },
      {
        "kind": "heading",
        "text": "9. Période temporaire pour les biographies de personnes décédées"
      },
      {
        "kind": "paragraph",
        "text": "Lorsqu'un membre de la famille publie la biographie d'une personne décédée, celle-ci est marquée comme “ temporaire ” pendant les 30 premiers jours. Durant cette période :"
      },
      {
        "kind": "item",
        "text": "La biographie est publique et visible par tous, marquée comme “ en cours d'examen temporaire ”"
      },
      {
        "kind": "item",
        "text": "Toute personne mentionnée — ou les membres directs de sa famille — peut soumettre un signalement et demander à ne pas apparaître"
      },
      {
        "kind": "item",
        "text": "L'auteur peut choisir d'informer directement les personnes citées mais n'est pas tenu de le faire"
      },
      {
        "kind": "item",
        "text": "Le “ Signaler ” bouton est accessible à l'ensemble de la communauté"
      },
      {
        "kind": "paragraph",
        "text": "À la fin des 30 jours :"
      },
      {
        "kind": "item",
        "text": "Aucun signalement reçu → la biographie devient définitive"
      },
      {
        "kind": "item",
        "text": "Signalement reçu → l'auteur reçoit une demande de modification ou de suppression du contenu indiqué, évaluée en fonction de la nature et de la validité du signalement"
      },
      {
        "kind": "paragraph",
        "text": "Avant publication, chaque biographie fait l'objet d'une analyse automatisée afin de détecter tout contenu violant les niveaux de modération définis dans les Conditions d'utilisation."
      },
      {
        "kind": "heading",
        "text": "10. Contrôle d'accès"
      },
      {
        "kind": "paragraph",
        "text": "Niveau de confidentialité"
      },
      {
        "kind": "paragraph",
        "text": "Qui peut y accéder"
      },
      {
        "kind": "paragraph",
        "text": "Privé"
      },
      {
        "kind": "paragraph",
        "text": "Vous uniquement"
      },
      {
        "kind": "paragraph",
        "text": "Famille uniquement"
      },
      {
        "kind": "paragraph",
        "text": "Vous + les membres de la famille que vous invitez explicitement"
      },
      {
        "kind": "paragraph",
        "text": "Semi-privé"
      },
      {
        "kind": "paragraph",
        "text": "Toute personne disposant du lien direct (non indexé par les moteurs de recherche)"
      },
      {
        "kind": "paragraph",
        "text": "Public"
      },
      {
        "kind": "paragraph",
        "text": "Tout le monde (indexé, Creative Commons BY-NC-SA 4.0)"
      },
      {
        "kind": "heading",
        "text": "11. Compte et Biographie — Distinction permanente"
      },
      {
        "kind": "paragraph",
        "text": "Le Compte est votre outil opérationnel personnel. Il reste en sommeil tant qu'il n'est pas utilisé — sans conséquence et sans mécanisme de suppression ou d'archivage automatique. Le compte reste indéfiniment à la disposition de l'auteur."
      },
      {
        "kind": "paragraph",
        "text": "La Biographie est le contenu d'archivage permanent. Elle survit au compte, survit à l'auteur et appartient à la mémoire collective de l'humanité."
      },
      {
        "kind": "paragraph",
        "text": "Après le décès de l'auteur : la biographie est figée au dernier chapitre publié. Les membres directs de la famille peuvent demander la gestion du compte en fournissant les documents appropriés. Biography Library ne supprimera jamais unilatéralement une biographie. La suppression ne peut avoir lieu que sur demande explicite de l'auteur, des membres de la famille y ayant droit, ou en cas de violation confirmée des règles de modération."
      },
      {
        "kind": "heading",
        "text": "12. Vos droits"
      },
      {
        "kind": "heading",
        "text": "12.1 Droit d'accès"
      },
      {
        "kind": "paragraph",
        "text": "Vous pouvez demander une copie de toutes les données personnelles que nous détenons à votre sujet."
      },
      {
        "kind": "heading",
        "text": "12.2 Droit de rectification"
      },
      {
        "kind": "paragraph",
        "text": "Vous pouvez corriger des informations inexactes à tout moment."
      },
      {
        "kind": "heading",
        "text": "12.3 Droit à l'effacement"
      },
      {
        "kind": "paragraph",
        "text": "Autobiographies : suppression complète sur demande. Données effacées dans un délai de 90 jours. Les chapitres publiés sont immuables mais peuvent être supprimés en même temps que l'autobiographie entière."
      },
      {
        "kind": "paragraph",
        "text": "Biographies de personnes décédées pendant la période temporaire : suppression immédiate sur demande."
      },
      {
        "kind": "paragraph",
        "text": "Biographies définitives de personnes décédées : vous avez le droit de demander la suppression. Dans des cas exceptionnels — lorsqu'il existe un intérêt historique ou archivistique documenté — Biography Library peut fournir une justification écrite pour une évaluation différente. En cas de désaccord, vous avez le droit de déposer une plainte auprès du PFPDT."
      },
      {
        "kind": "heading",
        "text": "12.4 Droit à la portabilité des données"
      },
      {
        "kind": "paragraph",
        "text": "Exportez votre contenu dans les formats disponibles les plus courants à tout moment."
      },
      {
        "kind": "heading",
        "text": "12.5 Droit à la limitation, à l'opposition et au retrait du consentement"
      },
      {
        "kind": "paragraph",
        "text": "Vous pouvez limiter le traitement, vous opposer au traitement fondé sur un intérêt légitime ou retirer votre consentement à l'IA à tout moment — sans affecter le stockage de vos biographies."
      },
      {
        "kind": "heading",
        "text": "12.6 Droit de déposer une plainte"
      },
      {
        "kind": "paragraph",
        "text": "Suisse : PFPDT — Feldeggweg 1, CH-3003 Berne — www.edoeb.admin.ch UE : l'autorité de contrôle de la protection des données de votre pays de résidence."
      },
      {
        "kind": "paragraph",
        "text": "Comment exercer vos droits : support@biographylibrary.org — objet : Demande RGPD/nLPD. Réponse fournie dès que possible et dans tous les cas sous 30 jours."
      },
      {
        "kind": "heading",
        "text": "13. Intelligence Artificielle"
      },
      {
        "kind": "heading",
        "text": "13.1 Ce que fait l'IA"
      },
      {
        "kind": "item",
        "text": "Corrige la grammaire et la ponctuation"
      },
      {
        "kind": "item",
        "text": "Suggère des formulations plus claires (vous approuvez ou rejetez chaque suggestion)"
      },
      {
        "kind": "item",
        "text": "Aide à structurer et organiser les chapitres biographiques"
      },
      {
        "kind": "item",
        "text": "Traduit la biographie (vous révisez toujours le résultat)"
      },
      {
        "kind": "item",
        "text": "Stimule les souvenirs avec des questions guidées"
      },
      {
        "kind": "heading",
        "text": "13.2 Ce que l'IA ne fait PAS"
      },
      {
        "kind": "item",
        "text": "❌ N'invente pas de faits ou d'événements"
      },
      {
        "kind": "item",
        "text": "❌ Ne modifie pas le texte sans votre approbation explicite"
      },
      {
        "kind": "item",
        "text": "❌ Ne publie rien automatiquement"
      },
      {
        "kind": "item",
        "text": "❌ N'utilise pas votre contenu pour entraîner des modèles d'IA commerciaux ou propriétaires"
      },
      {
        "kind": "heading",
        "text": "13.3 Traitement local et transparence"
      },
      {
        "kind": "paragraph",
        "text": "Tout le traitement de l'IA a lieu en Suisse via les systèmes d'IA d'Infomaniak, basés sur des modèles open source. Aucune donnée n'est envoyée à des fournisseurs d'IA tiers. Chaque suggestion est marquée du badge “ Suggestion de l'IA ”. Vous pouvez désactiver l'IA à tout moment."
      },
      {
        "kind": "heading",
        "text": "13.4 Biographies publiques et systèmes d'IA externes"
      },
      {
        "kind": "paragraph",
        "text": "Les biographies publiées en mode public sont accessibles sur Internet. Biography Library indique explicitement que le contenu des archives ne doit pas être utilisé pour entraîner des modèles d'IA commerciaux ou propriétaires. Les systèmes d'IA distribués sous une licence open source reconnue par l'OSI peuvent accéder aux archives publiques en tant que source de référence vérifiée, avec attribution obligatoire de la source et de l'auteur. Les biographies privées, semi-privées et familiales sont techniquement inaccessibles à tout système externe."
      },
      {
        "kind": "heading",
        "text": "14. Système de signalement"
      },
      {
        "kind": "paragraph",
        "text": "Chaque biographie comprend un bouton “ Signaler ” accessible à l'ensemble de la communauté. Les signalements sont traités dans les plus brefs délais et en tout cas dans un délai de 30 jours. Pour le contenu de niveau 1, la suppression est immédiate et automatique. Les détails complets du processus sont énoncés dans les Conditions d'utilisation."
      },
      {
        "kind": "heading",
        "text": "15. Cookies et suivi"
      },
      {
        "kind": "paragraph",
        "text": "Cookies techniques nécessaires (aucun consentement requis) : jeton de session, préférences linguistiques, protection CSRF, paramètres de confidentialité."
      },
      {
        "kind": "paragraph",
        "text": "❌ Aucun cookie de profilage sur les pages de biographies individuelles."
      },
      {
        "kind": "paragraph",
        "text": "Si nous devions mettre en œuvre des analyses de trafic, nous utiliserions exclusivement des solutions auto-hébergées en Suisse, avec un préavis aux utilisateurs."
      },
      {
        "kind": "heading",
        "text": "16. Conservation des données"
      },
      {
        "kind": "paragraph",
        "text": "Type de données"
      },
      {
        "kind": "paragraph",
        "text": "Durée de conservation"
      },
      {
        "kind": "paragraph",
        "text": "Informations du compte"
      },
      {
        "kind": "paragraph",
        "text": "De façon permanente"
      },
      {
        "kind": "paragraph",
        "text": "Contenu biographique"
      },
      {
        "kind": "paragraph",
        "text": "De façon permanente (mission d'archivage)"
      },
      {
        "kind": "paragraph",
        "text": "Journaux d'accès"
      },
      {
        "kind": "paragraph",
        "text": "12 mois"
      },
      {
        "kind": "paragraph",
        "text": "Adresses IP"
      },
      {
        "kind": "paragraph",
        "text": "12 mois"
      },
      {
        "kind": "paragraph",
        "text": "Documents de vérification d'identité"
      },
      {
        "kind": "paragraph",
        "text": "Maximum 90 jours"
      },
      {
        "kind": "paragraph",
        "text": "Suggestions de l'IA"
      },
      {
        "kind": "paragraph",
        "text": "Jusqu'à ce que la biographie associée soit supprimée"
      },
      {
        "kind": "paragraph",
        "text": "Sauvegardes"
      },
      {
        "kind": "paragraph",
        "text": "30 jours, puis suppression définitive"
      },
      {
        "kind": "heading",
        "text": "17. Protection des mineurs"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library est exclusivement destiné aux personnes âgées de 18 ans et plus. Les mineurs ne peuvent pas créer de compte, écrire de biographies ou faire l'objet de biographies. Seule exception : une mention générale d'enfants mineurs dans votre propre autobiographie, sans détails personnels sensibles."
      },
      {
        "kind": "heading",
        "text": "18. Transferts internationaux de données"
      },
      {
        "kind": "paragraph",
        "text": "Nous ne transférons pas de données personnelles en dehors de la Suisse."
      },
      {
        "kind": "paragraph",
        "text": "Utilisateur"
      },
      {
        "kind": "paragraph",
        "text": "Protection applicable"
      },
      {
        "kind": "paragraph",
        "text": "Suisse"
      },
      {
        "kind": "paragraph",
        "text": "nLPD"
      },
      {
        "kind": "paragraph",
        "text": "UE / EEE"
      },
      {
        "kind": "paragraph",
        "text": "RGPD (Suisse–UE"
      },
      {
        "kind": "paragraph",
        "text": "Autres pays"
      },
      {
        "kind": "paragraph",
        "text": "nLPD suisse"
      },
      {
        "kind": "heading",
        "text": "19. Modifications de cette Politique"
      },
      {
        "kind": "paragraph",
        "text": "Notification par e-mail au moins 30 jours avant l'entrée en vigueur de la nouvelle version. Acceptation explicite requise pour les modifications substantielles."
      },
      {
        "kind": "paragraph",
        "text": "Non-rétroactivité : nous ne modifierons jamais cette Politique pour réduire les protections déjà accordées aux utilisateurs."
      },
      {
        "kind": "paragraph",
        "text": "Historique des versions : v1.0 — Mars 2026 — Version initiale"
      },
      {
        "kind": "heading",
        "text": "20. Que se passe-t-il si Biography Library ferme"
      },
      {
        "kind": "item",
        "text": "Au moins 6 mois de préavis à tous les utilisateurs"
      },
      {
        "kind": "item",
        "text": "Exportation des données dans les formats disponibles les plus courants"
      },
      {
        "kind": "item",
        "text": "Code source public (AGPL v3) — n'importe qui peut poursuivre le projet"
      },
      {
        "kind": "item",
        "text": "Fork communautaire activement encouragé"
      },
      {
        "kind": "heading",
        "text": "21. Open Source et Transparence"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library est entièrement open source sous AGPL v3 : github.com/BiographyLibrary/Biography-Library"
      },
      {
        "kind": "paragraph",
        "text": "Seule la Biography Library Association peut émettre des certifications officielles W3C Verifiable Credentials pour les biographies publiées sur la plateforme."
      },
      {
        "kind": "heading",
        "text": "22. Contact"
      },
      {
        "kind": "item",
        "text": "E-mail: support@biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "Objet recommandé: Demande Confidentialité/RGPD/nLPD ou Signalement"
      },
      {
        "kind": "item",
        "text": "Délai de réponse: dès que possible et en tout état de cause dans un délai de 30 jours"
      },
      {
        "kind": "paragraph",
        "text": "PFPDT : Feldeggweg 1, CH-3003 Berne — www.edoeb.admin.ch"
      },
      {
        "kind": "heading",
        "text": "23. Langue et juridiction"
      },
      {
        "kind": "paragraph",
        "text": "Disponible en : anglais, italien, français, allemand. La version anglaise est la version juridiquement contraignante."
      },
      {
        "kind": "paragraph",
        "text": "Droit applicable : nLPD · RGPD (utilisateurs de l'UE/EEE) · Code civil suisse · Code pénal suisse"
      },
      {
        "kind": "paragraph",
        "text": "Juridiction : Tribunaux de Lugano, Tessin, Suisse. Les utilisateurs de l'UE conservent le droit d'engager des poursuites devant les tribunaux de leur pays de résidence."
      },
      {
        "kind": "heading",
        "text": "24. Acceptation"
      },
      {
        "kind": "paragraph",
        "text": "En utilisant Biography Library, vous acceptez cette Politique de confidentialité. Pour toute clarification : support@biographylibrary.org"
      },
      {
        "kind": "paragraph",
        "text": "Version : 1.0 | Mars 2026 | Licence du document : CC BY-SA 4.0"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library est une archive à but non lucratif et open source de la mémoire humaine."
      },
      {
        "kind": "paragraph",
        "text": "Navigation"
      },
      {
        "kind": "paragraph",
        "text": "Mentions légales"
      },
      {
        "kind": "paragraph",
        "text": "© 2026 Biography Library — Association suisse à but non lucratif · Logiciel : AGPL v3.0 · Contenu public : CC BY-NC-SA 4.0"
      }
    ],
    "de": [
      {
        "kind": "title",
        "text": "Datenschutzerklärung"
      },
      {
        "kind": "version",
        "text": "Version 1.0 – März 2026"
      },
      {
        "kind": "heading",
        "text": "1. Wer wir sind"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library ist ein Schweizer gemeinnütziger Verein mit Sitz in Lugano, Tessin, Schweiz, gegründet nach Artikel 60 ff. des Schweizerischen Zivilgesetzbuches."
      },
      {
        "kind": "paragraph",
        "text": "Mission: die Bewahrung des menschlichen Gedächtnisses durch ein dauerhaftes, verifiziertes und universelles Archiv persönlicher Biografien."
      },
      {
        "kind": "paragraph",
        "text": "Kontakt:"
      },
      {
        "kind": "item",
        "text": "Website: biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "E-Mail: support@biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "Adresse: Lugano, Tessin, Schweiz"
      },
      {
        "kind": "heading",
        "text": "2. Kernprinzipien"
      },
      {
        "kind": "paragraph",
        "text": "Diese Datenschutzrichtlinie basiert auf den nicht verhandelbaren Prinzipien unseres Manifests:"
      },
      {
        "kind": "item",
        "text": "Dateneigentum – Sie besitzen Ihre Geschichte; wir sind lediglich ihre Hüter"
      },
      {
        "kind": "item",
        "text": "Privacy by Design – Maximaler Schutz, der in jede Ebene der Plattform integriert ist"
      },
      {
        "kind": "item",
        "text": "Ethische und lokale KI – Die KI-Verarbeitung findet auf Schweizer Boden statt und wird niemals an Dritte weitergegeben"
      },
      {
        "kind": "item",
        "text": "Schweizer Hosting – Alle Daten verbleiben ausschließlich in der Schweiz"
      },
      {
        "kind": "item",
        "text": "Volle Transparenz – Kein Verkauf oder kommerzielle Weitergabe Ihrer Daten, niemals"
      },
      {
        "kind": "item",
        "text": "Benutzerkontrolle – Sie entscheiden, wer auf Ihre Biografie zugreifen kann"
      },
      {
        "kind": "item",
        "text": "Datenminimierung – Wir erfassen nur die absolut notwendigen Mindestdaten"
      },
      {
        "kind": "heading",
        "text": "3. Welche Daten wir erfassen"
      },
      {
        "kind": "heading",
        "text": "3.1 Registrierungsdaten"
      },
      {
        "kind": "item",
        "text": "Vor- und Nachname"
      },
      {
        "kind": "item",
        "text": "E-Mail-Adresse"
      },
      {
        "kind": "item",
        "text": "Passwort (verschlüsselt gespeichert — für uns niemals lesbar)"
      },
      {
        "kind": "paragraph",
        "text": "WAS WIR BEI DER REGISTRIERUNG NIEMALS ERFASSEN:"
      },
      {
        "kind": "item",
        "text": "❌ Ausweisdokumente (Reisepass, Personalausweis)"
      },
      {
        "kind": "item",
        "text": "❌ Geburts-, Heirats- oder Sterbeurkunden"
      },
      {
        "kind": "item",
        "text": "❌ Biometrische Daten"
      },
      {
        "kind": "heading",
        "text": "3.2 Identitätsprüfung – Nur bei Meldung"
      },
      {
        "kind": "paragraph",
        "text": "Bei der Registrierung verlassen wir uns ausschließlich auf Selbstauskunft. Nur im Falle einer Meldung oder bei begründetem Verdacht können wir zusätzliche Dokumente anfordern."
      },
      {
        "kind": "paragraph",
        "text": "Aufbewahrung von Verifizierungsdokumenten:"
      },
      {
        "kind": "item",
        "text": "Nur für die benötigte Zeit in Offline-Archiven gespeichert (maximal 90 Tage)"
      },
      {
        "kind": "item",
        "text": "Nach Abschluss der Verifizierung automatisch gelöscht"
      },
      {
        "kind": "item",
        "text": "Niemals an kommerzielle Dritte weitergegeben"
      },
      {
        "kind": "heading",
        "text": "3.3 Biografische Inhalte"
      },
      {
        "kind": "item",
        "text": "Biografietext (keine Zeichenbeschränkung)"
      },
      {
        "kind": "item",
        "text": "Bilder und Fotos"
      },
      {
        "kind": "item",
        "text": "Sprachaufnahmen"
      },
      {
        "kind": "item",
        "text": "Metadaten (Erstellungsdaten, Bearbeitungen, Sprachen, Kapitelnummer)"
      },
      {
        "kind": "heading",
        "text": "3.4 Technische und Navigationsdaten"
      },
      {
        "kind": "item",
        "text": "IP-Adresse (für 12 Monate aufbewahrt)"
      },
      {
        "kind": "item",
        "text": "Notwendige technische Cookies"
      },
      {
        "kind": "item",
        "text": "Zugriffsprotokolle (für 12 Monate aufbewahrt)"
      },
      {
        "kind": "item",
        "text": "Spracheinstellungen und Benutzereinstellungen"
      },
      {
        "kind": "heading",
        "text": "3.5 KI-generierte Daten"
      },
      {
        "kind": "item",
        "text": "Verlauf der KI-Vorschläge"
      },
      {
        "kind": "item",
        "text": "An den KI-Assistenten übermittelte Prompts und Anfragen"
      },
      {
        "kind": "paragraph",
        "text": "KI-Verarbeitung: ausschließlich in der Schweiz über die KI-Systeme von Infomaniak, basierend auf Open-Source-Modellen."
      },
      {
        "kind": "heading",
        "text": "4. Welche Biografien Sie erstellen können"
      },
      {
        "kind": "heading",
        "text": "4.1 Autobiografien — Das lebendige biografische Dokument"
      },
      {
        "kind": "paragraph",
        "text": "Sie schreiben die Geschichte Ihres eigenen Lebens. Ihre Autobiografie ist ein lebendiges Dokument, das in Kapitel gegliedert ist: Nach der Veröffentlichung Ihres ersten Kapitels können Sie nach mindestens 365 Tagen ein neues hinzufügen. Sie sind nicht verpflichtet, dies jedes Jahr zu tun — Sie können viele Jahre warten, bevor Sie ein neues Kapitel hinzufügen. Jedes Kapitel ist nach der Veröffentlichung unveränderlich: Ihre Worte bleiben für immer genau so, wie sie geschrieben wurden."
      },
      {
        "kind": "paragraph",
        "text": "Nach Ihrem Tod wird Ihre Autobiografie auf dem Stand des letzten von Ihnen veröffentlichten Kapitels eingefroren. Niemand darf Ihrer Originalstimme etwas hinzufügen. Ihre Familienmitglieder können Ihr Andenken ehren, indem sie eine separate Biografie schreiben, die mit Ihrer Autobiografie auf Ihrer persönlichen Seite verlinkt wird."
      },
      {
        "kind": "heading",
        "text": "4.2 Biografien verstorbener Personen"
      },
      {
        "kind": "paragraph",
        "text": "Diese dürfen ausschließlich von einem direkten Familienmitglied der verstorbenen Person geschrieben werden. Mehrere Familienmitglieder können separate Biografien derselben Person schreiben — jedes Dokument spiegelt die Perspektive seines Autors wider. Biografien verstorbener Personen unterliegen der vorläufigen Frist von 30 Tagen (siehe Abschnitt 9)."
      },
      {
        "kind": "paragraph",
        "text": "WAS SIE NICHT TUN DÜRFEN:"
      },
      {
        "kind": "item",
        "text": "❌ Biografien von anderen lebenden Personen als Ihnen selbst erstellen"
      },
      {
        "kind": "item",
        "text": "❌ Biografien von Minderjährigen unter 18 Jahren erstellen (auch wenn diese verstorben sind)"
      },
      {
        "kind": "item",
        "text": "❌ Biografien von verstorbenen Personen ohne direkte familiäre Verbindung erstellen"
      },
      {
        "kind": "item",
        "text": "❌ Biografien veröffentlichen, ohne auf Anfrage den Tod der Person nachweisen zu können"
      },
      {
        "kind": "heading",
        "text": "5. Wie wir Ihre Daten verwenden"
      },
      {
        "kind": "heading",
        "text": "5.1 Zwecke der Verarbeitung"
      },
      {
        "kind": "item",
        "text": "Bereitstellung des Dienstes"
      },
      {
        "kind": "item",
        "text": "Verwaltung des biografischen Kapitelsystems"
      },
      {
        "kind": "item",
        "text": "KI-Assistenz"
      },
      {
        "kind": "item",
        "text": "Kontoverwaltung"
      },
      {
        "kind": "item",
        "text": "Sicherheit und Missbrauchsprävention"
      },
      {
        "kind": "item",
        "text": "Automatisierte und menschliche Inhaltsmoderation"
      },
      {
        "kind": "item",
        "text": "Einhaltung gesetzlicher Vorschriften"
      },
      {
        "kind": "heading",
        "text": "5.2 Was wir niemals tun"
      },
      {
        "kind": "item",
        "text": "❌ Wir verkaufen Ihre Daten nicht"
      },
      {
        "kind": "item",
        "text": "❌ Wir verwenden Ihre Daten nicht für Werbung oder kommerzielles Profiling"
      },
      {
        "kind": "item",
        "text": "❌ Wir trainieren keine kommerziellen oder proprietären KI-Modelle mit Ihren Inhalten"
      },
      {
        "kind": "item",
        "text": "❌ Wir geben keine Daten an Regierungen weiter (außer wenn dies nach Schweizer Recht erforderlich ist)"
      },
      {
        "kind": "item",
        "text": "❌ Wir ändern diese Richtlinie nicht rückwirkend, um Ihren Schutz zu verringern"
      },
      {
        "kind": "item",
        "text": "❌ Wir erheben keine Ausweisdokumente ohne konkrete betriebliche Notwendigkeit"
      },
      {
        "kind": "item",
        "text": "❌ Wir zeigen keine Werbung oder Sponsorenlogos auf individuellen Biografien an"
      },
      {
        "kind": "heading",
        "text": "6. Rechtsgrundlage für die Verarbeitung"
      },
      {
        "kind": "item",
        "text": "Vertrag – Um den von Ihnen angeforderten Dienst bereitzustellen"
      },
      {
        "kind": "item",
        "text": "Einwilligung – Für KI-Funktionen (jederzeit widerrufbar)"
      },
      {
        "kind": "item",
        "text": "Rechtliche Verpflichtung – Zur Einhaltung des Schweizer Rechts (nDSG) und der DSGVO für EU-Nutzer"
      },
      {
        "kind": "item",
        "text": "Berechtigtes Interesse – Um Betrug zu verhindern und die Sicherheit der Plattform zu gewährleisten"
      },
      {
        "kind": "heading",
        "text": "7. Mit wem wir Ihre Daten teilen"
      },
      {
        "kind": "heading",
        "text": "7.1 Dienstleister"
      },
      {
        "kind": "paragraph",
        "text": "Anbieter"
      },
      {
        "kind": "paragraph",
        "text": "Standort"
      },
      {
        "kind": "paragraph",
        "text": "Rolle"
      },
      {
        "kind": "paragraph",
        "text": "Schutzmaßnahmen"
      },
      {
        "kind": "paragraph",
        "text": "Infomaniak SA"
      },
      {
        "kind": "paragraph",
        "text": "Schweiz"
      },
      {
        "kind": "paragraph",
        "text": "Hosting, Infrastrukturund KI"
      },
      {
        "kind": "paragraph",
        "text": "AVV konform mit revDSG/DSGVO, Daten in der CH"
      },
      {
        "kind": "paragraph",
        "text": "⚠️ Daten verlassen niemals die Schweizer Gerichtsbarkeit. Keine Übermittlungen in Länder ohne angemessene Datenschutzstandards."
      },
      {
        "kind": "paragraph",
        "text": "Datenbank: Der endgültige Technologie-Stack für die Produktionsdatenbank steht noch nicht fest. Die gewählte Lösung wird ausschließlich auf Schweizer Infrastruktur gehostet. Diese Richtlinie wird vor der öffentlichen Markteinführung aktualisiert."
      },
      {
        "kind": "heading",
        "text": "7.2 Familienzugriff"
      },
      {
        "kind": "paragraph",
        "text": "Familienmitglieder können ausschließlich gemäß den von Ihnen festgelegten Berechtigungen auf Ihre Inhalte zugreifen."
      },
      {
        "kind": "heading",
        "text": "7.3 Behörden"
      },
      {
        "kind": "paragraph",
        "text": "Wir geben Ihre Daten an staatliche Behörden nur weiter, wenn dies durch einen gültigen Schweizer Gerichtsbeschluss angeordnet wird, zur Verhinderung einer schweren Straftat erforderlich ist oder nach dem revDSG oder dem Schweizerischen Strafgesetzbuch zwingend vorgeschrieben ist."
      },
      {
        "kind": "heading",
        "text": "7.4 Sponsoren"
      },
      {
        "kind": "paragraph",
        "text": "Nutzerdaten werden niemals an Sponsoren weitergegeben. Sponsoren haben keinen Zugriff auf personenbezogene Daten, können die Moderation von Inhalten nicht beeinflussen und ihre Logos erscheinen niemals auf individuellen Biografien — nur auf der institutionellen Website, der App und in Werbematerialien."
      },
      {
        "kind": "heading",
        "text": "8. Wo Ihre Daten gespeichert werden"
      },
      {
        "kind": "paragraph",
        "text": "Datenresidenz – 100% Schweiz: Alle Server, Backups und die KI-Verarbeitung werden ausschließlich auf der Infrastruktur von Infomaniak mit Rechenzentren in der Schweiz betrieben."
      },
      {
        "kind": "paragraph",
        "text": "Technische Sicherheit: Verschlüsselung bei der Übertragung (TLS 1.3+), Verschlüsselung im Ruhezustand, Multi-Faktor-Authentifizierung (MFA), tägliche verschlüsselte Backups, Audit-Protokolle, verifizierbarer Open-Source-Code (AGPL v3)."
      },
      {
        "kind": "heading",
        "text": "9. Temporäre Phase für Biografien verstorbener Personen"
      },
      {
        "kind": "paragraph",
        "text": "Wenn ein Familienmitglied eine Biografie einer verstorbenen Person veröffentlicht, wird diese für die ersten 30 Tage als “vorläufig” markiert. Während dieses Zeitraums:"
      },
      {
        "kind": "item",
        "text": "Die Biografie ist öffentlich und sichtbar für alle, markiert als “in vorläufiger Prüfung”"
      },
      {
        "kind": "item",
        "text": "Jede erwähnte Person — oder deren direkte Familienmitglieder — kann eine Meldung einreichen und beantragen, nicht erwähnt zu werden"
      },
      {
        "kind": "item",
        "text": "Der Autor kann sich dafür entscheiden, zitierte Personen direkt zu benachrichtigen, ist jedoch nicht dazu verpflichtet"
      },
      {
        "kind": "item",
        "text": "Die “Melden” Schaltfläche ist für die gesamte Community zugänglich"
      },
      {
        "kind": "paragraph",
        "text": "Nach Ablauf von 30 Tagen:"
      },
      {
        "kind": "item",
        "text": "Keine Meldungen erhalten → die Biografie wird endgültig"
      },
      {
        "kind": "item",
        "text": "Meldung erhalten → der Autor erhält eine Aufforderung, die angegebenen Inhalte zu ändern oder zu entfernen, bewertet nach Art und Stichhaltigkeit der Meldung"
      },
      {
        "kind": "paragraph",
        "text": "Vor der Veröffentlichung wird jede Biografie einem automatisierten Scan unterzogen, um Inhalte zu erkennen, die gegen die in den Nutzungsbedingungen festgelegten Moderationsstufen verstoßen."
      },
      {
        "kind": "heading",
        "text": "10. Zugriffskontrolle"
      },
      {
        "kind": "paragraph",
        "text": "Privatsphäre-Stufe"
      },
      {
        "kind": "paragraph",
        "text": "Wer zugreifen kann"
      },
      {
        "kind": "paragraph",
        "text": "Privat"
      },
      {
        "kind": "paragraph",
        "text": "Nur Sie"
      },
      {
        "kind": "paragraph",
        "text": "Nur Familie"
      },
      {
        "kind": "paragraph",
        "text": "Sie + Familienmitglieder, die Sie ausdrücklich einladen"
      },
      {
        "kind": "paragraph",
        "text": "Halbprivat"
      },
      {
        "kind": "paragraph",
        "text": "Jeder mit dem direkten Link (nicht von Suchmaschinen indexiert)"
      },
      {
        "kind": "paragraph",
        "text": "Öffentlich"
      },
      {
        "kind": "paragraph",
        "text": "Jeder (indexiert, Creative Commons BY-NC-SA 4.0)"
      },
      {
        "kind": "heading",
        "text": "11. Konto und Biografie — Dauerhafte Unterscheidung"
      },
      {
        "kind": "paragraph",
        "text": "Das Konto ist Ihr persönliches Arbeitswerkzeug. Es ruht, solange es nicht genutzt wird — ohne Konsequenzen und ohne automatischen Lösch- oder Archivierungsmechanismus. Das Konto steht dem Autor auf unbestimmte Zeit zur Verfügung."
      },
      {
        "kind": "paragraph",
        "text": "Die Biografie ist der dauerhafte Archivinhalt. Sie überdauert das Konto, überdauert den Autor und gehört zum kollektiven Gedächtnis der Menschheit."
      },
      {
        "kind": "paragraph",
        "text": "Nach dem Tod des Autors: Die Biografie wird beim zuletzt veröffentlichten Kapitel eingefroren. Direkte Familienangehörige können unter Vorlage entsprechender Dokumente die Kontoverwaltung beantragen. Biography Library wird niemals einseitig eine Biografie löschen. Eine Löschung kann nur auf ausdrücklichen Wunsch des Autors, berechtigter Familienangehöriger oder im Falle eines bestätigten Moderationsverstoßes erfolgen."
      },
      {
        "kind": "heading",
        "text": "12. Ihre Rechte"
      },
      {
        "kind": "heading",
        "text": "12.1 Recht auf Auskunft"
      },
      {
        "kind": "paragraph",
        "text": "Sie können eine Kopie aller personenbezogenen Daten anfordern, die wir über Sie gespeichert haben."
      },
      {
        "kind": "heading",
        "text": "12.2 Recht auf Berichtigung"
      },
      {
        "kind": "paragraph",
        "text": "Sie können ungenaue Informationen jederzeit korrigieren."
      },
      {
        "kind": "heading",
        "text": "12.3 Recht auf Löschung"
      },
      {
        "kind": "paragraph",
        "text": "Autobiografien: vollständige Löschung auf Anfrage. Daten werden innerhalb von 90 Tagen gelöscht. Veröffentlichte Kapitel sind unveränderlich, können aber zusammen mit der gesamten Autobiografie gelöscht werden."
      },
      {
        "kind": "paragraph",
        "text": "Biografien verstorbener Personen in der temporären Phase: sofortige Löschung auf Anfrage."
      },
      {
        "kind": "paragraph",
        "text": "Endgültige Biografien verstorbener Personen: Sie haben das Recht, die Löschung zu beantragen. In Ausnahmefällen — wenn ein dokumentiertes historisches oder archivarische Interesse besteht — kann Biography Library eine schriftliche Begründung für eine abweichende Beurteilung vorlegen. Im Falle von Meinungsverschiedenheiten haben Sie das Recht, eine Beschwerde beim EDÖB einzureichen."
      },
      {
        "kind": "heading",
        "text": "12.4 Recht auf Datenübertragbarkeit"
      },
      {
        "kind": "paragraph",
        "text": "Exportieren Sie Ihre Inhalte jederzeit in den gängigsten verfügbaren Formaten."
      },
      {
        "kind": "heading",
        "text": "12.5 Recht auf Einschränkung, Widerspruch und Widerruf der Einwilligung"
      },
      {
        "kind": "paragraph",
        "text": "Sie können die Verarbeitung einschränken, der Verarbeitung aufgrund berechtigten Interesses widersprechen oder die KI-Einwilligung jederzeit widerrufen — ohne dass die Speicherung Ihrer Biografien davon berührt wird."
      },
      {
        "kind": "heading",
        "text": "12.6 Recht auf Beschwerde"
      },
      {
        "kind": "paragraph",
        "text": "Schweiz: EDÖB — Feldeggweg 1, CH-3003 Bern — www.edoeb.admin.chEU: die Datenschutzaufsichtsbehörde Ihres Wohnsitzlandes."
      },
      {
        "kind": "paragraph",
        "text": "Wie Sie Ihre Rechte ausüben: support@biographylibrary.org — Betreffzeile: GDPR/nFADP Request. Die Antwort erfolgt so schnell wie möglich und in jedem Fall innerhalb von 30 Tagen."
      },
      {
        "kind": "heading",
        "text": "13. Künstliche Intelligenz"
      },
      {
        "kind": "heading",
        "text": "13.1 Was die KI tut"
      },
      {
        "kind": "item",
        "text": "Korrigiert Grammatik und Zeichensetzung"
      },
      {
        "kind": "item",
        "text": "Schlägt klarere Formulierungen vor (Sie genehmigen oder verwerfen jeden Vorschlag)"
      },
      {
        "kind": "item",
        "text": "Hilft bei der Strukturierung und Organisation biografischer Kapitel"
      },
      {
        "kind": "item",
        "text": "Übersetzt die Biografie (Sie überprüfen das Ergebnis stets)"
      },
      {
        "kind": "item",
        "text": "Ruft Erinnerungen durch gezielte Fragen wach"
      },
      {
        "kind": "heading",
        "text": "13.2 Was die KI NICHT tut"
      },
      {
        "kind": "item",
        "text": "❌ Erfindet keine Fakten oder Ereignisse"
      },
      {
        "kind": "item",
        "text": "❌ Bearbeitet keinen Text ohne Ihre ausdrückliche Zustimmung"
      },
      {
        "kind": "item",
        "text": "❌ Veröffentlicht nichts automatisch"
      },
      {
        "kind": "item",
        "text": "❌ Verwendet Ihre Inhalte nicht, um kommerzielle oder proprietäre KI-Modelle zu trainieren"
      },
      {
        "kind": "heading",
        "text": "13.3 Lokale Verarbeitung und Transparenz"
      },
      {
        "kind": "paragraph",
        "text": "Die gesamte KI-Verarbeitung findet in der Schweiz über die KI-Systeme von Infomaniak statt, basierend auf Open-Source-Modellen. Es werden keine Daten an Drittanbieter von KI gesendet. Jeder Vorschlag ist mit der Kennzeichnung “KI-Vorschlag” versehen. Sie können die KI jederzeit deaktivieren."
      },
      {
        "kind": "heading",
        "text": "13.4 Öffentliche Biografien und externe KI-Systeme"
      },
      {
        "kind": "paragraph",
        "text": "Öffentlich publizierte Biografien sind im Internet zugänglich. Die Biography Library weist ausdrücklich darauf hin, dass Archivinhalte nicht zum Trainieren kommerzieller oder proprietärer KI-Modelle verwendet werden dürfen. KI-Systeme, die unter einer OSI-anerkannten Open-Source-Lizenz vertrieben werden, dürfen auf das öffentliche Archiv als verifizierte Referenzquelle zugreifen, wobei die Angabe von Quelle und Autor zwingend erforderlich ist. Private, halbprivate und Familienbiografien sind für externe Systeme technisch unzugänglich."
      },
      {
        "kind": "heading",
        "text": "14. Meldesystem"
      },
      {
        "kind": "paragraph",
        "text": "Jede Biografie enthält einen “Melden”-Button, der für die gesamte Community zugänglich ist. Meldungen werden so schnell wie möglich und in jedem Fall innerhalb von 30 Tagen bearbeitet. Bei Inhalten der Stufe 1 erfolgt die Entfernung sofort und automatisch. Vollständige Details zum Prozess sind in den Nutzungsbedingungen festgelegt."
      },
      {
        "kind": "heading",
        "text": "15. Cookies und Tracking"
      },
      {
        "kind": "paragraph",
        "text": "Notwendige technische Cookies (keine Zustimmung erforderlich): Sitzungs-Token, Spracheinstellungen, CSRF-Schutz, Datenschutzeinstellungen."
      },
      {
        "kind": "paragraph",
        "text": "❌ Keine Profiling-Cookies auf einzelnen Biografie-Seiten."
      },
      {
        "kind": "paragraph",
        "text": "Sollten wir Traffic-Analysen implementieren, werden wir ausschließlich selbst gehostete Lösungen in der Schweiz verwenden, mit vorheriger Benachrichtigung der Nutzer."
      },
      {
        "kind": "heading",
        "text": "16. Datenaufbewahrung"
      },
      {
        "kind": "paragraph",
        "text": "Datentyp"
      },
      {
        "kind": "paragraph",
        "text": "Aufbewahrungsfrist"
      },
      {
        "kind": "paragraph",
        "text": "Kontoinformationen"
      },
      {
        "kind": "paragraph",
        "text": "Dauerhaft"
      },
      {
        "kind": "paragraph",
        "text": "Biografische Inhalte"
      },
      {
        "kind": "paragraph",
        "text": "Dauerhaft (Archivierungsauftrag)"
      },
      {
        "kind": "paragraph",
        "text": "Zugriffsprotokolle"
      },
      {
        "kind": "paragraph",
        "text": "12 Monate"
      },
      {
        "kind": "paragraph",
        "text": "IP-Adressen"
      },
      {
        "kind": "paragraph",
        "text": "12 Monate"
      },
      {
        "kind": "paragraph",
        "text": "Dokumente zur Identitätsprüfung"
      },
      {
        "kind": "paragraph",
        "text": "Maximal 90 Tage"
      },
      {
        "kind": "paragraph",
        "text": "KI-Vorschläge"
      },
      {
        "kind": "paragraph",
        "text": "Bis die zugehörige Biografie gelöscht wird"
      },
      {
        "kind": "paragraph",
        "text": "Backups"
      },
      {
        "kind": "paragraph",
        "text": "30 Tage, danach dauerhafte Löschung"
      },
      {
        "kind": "heading",
        "text": "17. Schutz von Minderjährigen"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library ist ausschliesslich für Personen ab 18 Jahren bestimmt. Minderjährige dürfen keine Konten erstellen, keine Biografien schreiben oder Gegenstand von Biografien sein. Einzige Ausnahme: eine allgemeine Erwähnung minderjähriger Kinder innerhalb der eigenen Autobiografie, ohne sensible persönliche Daten."
      },
      {
        "kind": "heading",
        "text": "18. Internationale Datenübermittlungen"
      },
      {
        "kind": "paragraph",
        "text": "Wir übermitteln keine personenbezogenen Daten ausserhalb der Schweiz."
      },
      {
        "kind": "paragraph",
        "text": "Benutzer"
      },
      {
        "kind": "paragraph",
        "text": "Anwendbarer Schutz"
      },
      {
        "kind": "paragraph",
        "text": "Schweiz"
      },
      {
        "kind": "paragraph",
        "text": "nDSG"
      },
      {
        "kind": "paragraph",
        "text": "EU / EWR"
      },
      {
        "kind": "paragraph",
        "text": "DSGVO (Schweiz–EU"
      },
      {
        "kind": "paragraph",
        "text": "Andere Länder"
      },
      {
        "kind": "paragraph",
        "text": "Schweizer nDSG"
      },
      {
        "kind": "heading",
        "text": "19. Änderungen dieser Richtlinie"
      },
      {
        "kind": "paragraph",
        "text": "E-Mail-Benachrichtigung mindestens 30 Tage, bevor die neue Version in Kraft tritt. Ausdrückliche Zustimmung bei wesentlichen Änderungen erforderlich."
      },
      {
        "kind": "paragraph",
        "text": "Keine Rückwirkung: Wir werden diese Richtlinie niemals ändern, um den Nutzern bereits gewährten Schutz zu verringern."
      },
      {
        "kind": "paragraph",
        "text": "Versionsverlauf: v1.0 — März 2026 — Erste Version"
      },
      {
        "kind": "heading",
        "text": "20. Was passiert, wenn die Biography Library geschlossen wird"
      },
      {
        "kind": "item",
        "text": "Mindestens 6 Monate Vorankündigung an alle Nutzer"
      },
      {
        "kind": "item",
        "text": "Datenexport in den gängigsten verfügbaren Formaten"
      },
      {
        "kind": "item",
        "text": "Öffentlicher Quellcode (AGPL v3) — jeder darf das Projekt fortführen"
      },
      {
        "kind": "item",
        "text": "Community-Fork wird aktiv gefördert"
      },
      {
        "kind": "heading",
        "text": "21. Open Source und Transparenz"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library ist vollständig Open Source unter AGPL v3: github.com/BiographyLibrary/Biography-Library"
      },
      {
        "kind": "paragraph",
        "text": "Nur die Biography Library Association darf offizielle W3C Verifiable Credentials-Zertifizierungen für auf der Plattform veröffentlichte Biografien ausstellen."
      },
      {
        "kind": "heading",
        "text": "22. Kontakt"
      },
      {
        "kind": "item",
        "text": "E-Mail: support@biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "Empfohlener Betreff: Datenschutz/DSGVO/nDSG-Anfrage oder Meldung"
      },
      {
        "kind": "item",
        "text": "Antwortzeit: so schnell wie möglich und in jedem Fall innerhalb von 30 Tagen"
      },
      {
        "kind": "paragraph",
        "text": "EDÖB: Feldeggweg 1, CH-3003 Bern — www.edoeb.admin.ch"
      },
      {
        "kind": "heading",
        "text": "23. Sprache und Gerichtsstand"
      },
      {
        "kind": "paragraph",
        "text": "Verfügbar auf: Englisch, Italienisch, Französisch, Deutsch. Die englische Version ist die rechtlich bindende Version."
      },
      {
        "kind": "paragraph",
        "text": "Anwendbares Recht: nDSG · DSGVO (EU/EWR-Nutzer) · Schweizerisches Zivilgesetzbuch · Schweizerisches Strafgesetzbuch"
      },
      {
        "kind": "paragraph",
        "text": "Gerichtsstand: Gerichte von Lugano, Tessin, Schweiz. EU-Nutzer behalten das Recht, Verfahren vor den Gerichten ihres Wohnsitzlandes einzuleiten."
      },
      {
        "kind": "heading",
        "text": "24. Zustimmung"
      },
      {
        "kind": "paragraph",
        "text": "Durch die Nutzung der Biography Library akzeptieren Sie diese Datenschutzrichtlinie. Für Rückfragen: support@biographylibrary.org"
      },
      {
        "kind": "paragraph",
        "text": "Version: 1.0 | März 2026 | Dokumentenlizenz: CC BY-SA 4.0"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library ist ein gemeinnütziges Open-Source-Archiv der menschlichen Erinnerung."
      },
      {
        "kind": "paragraph",
        "text": "Navigation"
      },
      {
        "kind": "paragraph",
        "text": "Rechtliches"
      },
      {
        "kind": "paragraph",
        "text": "© 2026 Biography Library — Schweizer gemeinnütziger Verein · Software: AGPL v3.0 · Öffentliche Inhalte: CC BY-NC-SA 4.0"
      }
    ]
  },
  "terms": {
    "it": [
      {
        "kind": "title",
        "text": "Termini di Servizio"
      },
      {
        "kind": "version",
        "text": "Versione 1.0 – Marzo 2026"
      },
      {
        "kind": "heading",
        "text": "Utilizzando Biography Library, accetti questi Termini di Servizio. Ti preghiamo di leggerli attentamente."
      },
      {
        "kind": "paragraph",
        "text": "1. Chi può utilizzare Biography Library"
      },
      {
        "kind": "heading",
        "text": "Devi avere almeno 18 anni per utilizzare Biography Library."
      },
      {
        "kind": "heading",
        "text": "Creando un account, confermi che tutte le informazioni fornite sono accurate e veritiere, che rispetterai questi Termini e tutte le leggi applicabili, e che rispetterai i diritti di tutte le altre persone."
      },
      {
        "kind": "paragraph",
        "text": "2. Cosa puoi pubblicare"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library consente solo due tipi di biografie."
      },
      {
        "kind": "paragraph",
        "text": "La tua autobiografia"
      },
      {
        "kind": "paragraph",
        "text": "Puoi scrivere e pubblicare la storia della tua vita in totale libertà, entro i limiti legali. Pubblicando la tua autobiografia, dichiari sotto la tua responsabilità civile e penale di essere la persona che affermi di essere, che le informazioni fornite sono veritiere, di avere almeno 18 anni e di accettare la pubblicazione in base al livello di privacy da te scelto."
      },
      {
        "kind": "paragraph",
        "text": "Biografie di persone decedute"
      },
      {
        "kind": "heading",
        "text": "Puoi scrivere e pubblicare la biografia di un familiare diretto deceduto. Questo diritto è riservato esclusivamente ai familiari diretti."
      },
      {
        "kind": "heading",
        "text": "Pubblicando la biografia di una persona deceduta, dichiari sotto la tua responsabilità civile e penale di essere un familiare diretto della persona, che la persona è effettivamente deceduta, che le informazioni sono veritiere o chiaramente indicate come tua interpretazione personale, che rispetti i diritti delle persone in vita menzionate e che comprendi che potrebbe essere richiesta una prova del decesso."
      },
      {
        "kind": "paragraph",
        "text": "Prospettive multiple: più di un familiare può scrivere biografie separate della stessa persona deceduta, ciascuna a propria firma, tutte collegate sulla pagina personale della persona deceduta."
      },
      {
        "kind": "paragraph",
        "text": "Cosa è proibito"
      },
      {
        "kind": "item",
        "text": "❌ Biografie di persone in vita diverse da te stesso"
      },
      {
        "kind": "item",
        "text": "❌ Biografie di minori di 18 anni (anche se deceduti)"
      },
      {
        "kind": "item",
        "text": "❌ Biografie di persone decedute senza un legame familiare diretto"
      },
      {
        "kind": "item",
        "text": "❌ Biografie di persone di cui non è possibile dimostrare il decesso se richiesto"
      },
      {
        "kind": "heading",
        "text": "Le violazioni comportano la chiusura immediata dell'account e possono portare ad azioni legali."
      },
      {
        "kind": "paragraph",
        "text": "3. Le tue responsabilità come Autore"
      },
      {
        "kind": "heading",
        "text": "Sei l'unico responsabile dell'accuratezza di tutte le informazioni pubblicate, del rispetto della privacy di terze parti in vita, della conformità alla legge svizzera e alle leggi del tuo paese di residenza, e di eventuali danni causati da contenuti illeciti o diffamatori."
      },
      {
        "kind": "paragraph",
        "text": "Biography Library è un fornitore di servizi tecnici. Non verifichiamo i contenuti prima della pubblicazione. Ti assumi la piena responsabilità legale per ciò che pubblichi."
      },
      {
        "kind": "paragraph",
        "text": "Protezione di terze parti in vita"
      },
      {
        "kind": "heading",
        "text": "NON puoi includere senza esplicito consenso scritto:"
      },
      {
        "kind": "item",
        "text": "Dati sanitari o medici di altri"
      },
      {
        "kind": "item",
        "text": "Orientamento sessuale di altri"
      },
      {
        "kind": "item",
        "text": "Opinioni politiche o religiose di altri"
      },
      {
        "kind": "item",
        "text": "Procedimenti legali o penali che coinvolgono altri"
      },
      {
        "kind": "item",
        "text": "Informazioni economiche o finanziarie di altri"
      },
      {
        "kind": "item",
        "text": "Fotografie identificabili di persone in vita"
      },
      {
        "kind": "item",
        "text": "Dichiarazioni false o diffamatorie su persone in vita o decedute"
      },
      {
        "kind": "heading",
        "text": "Consentito senza consenso: menzioni generali (nome e relazione), eventi pubblici noti, informazioni per le quali hai ottenuto un consenso scritto esplicito."
      },
      {
        "kind": "heading",
        "text": "Le persone in vita menzionate hanno il diritto di richiedere la rimozione delle informazioni sensibili che le riguardano."
      },
      {
        "kind": "heading",
        "text": "4. Limiti dei contenuti e del servizio"
      },
      {
        "kind": "paragraph",
        "text": "Testo"
      },
      {
        "kind": "paragraph",
        "text": "Nessun limite di caratteri. La tua storia non ha limiti."
      },
      {
        "kind": "paragraph",
        "text": "Immagini e video"
      },
      {
        "kind": "paragraph",
        "text": "Ogni biografia può includere fino a 10 immagini. La possibilità di aggiungere più immagini e di includere video è disponibile come funzionalità a pagamento opzionale, che non influisce in alcun modo sulla natura gratuita e permanente dell'archivio biografico."
      },
      {
        "kind": "paragraph",
        "text": "Utilizzo dell'IA"
      },
      {
        "kind": "heading",
        "text": "L'assistente IA è soggetto a limiti di utilizzo giornalieri e mensili per garantire la qualità del servizio a tutti gli utenti. Questi limiti sono calibrati per un uso normale della piattaforma. Potrebbero essere disponibili opzioni per un utilizzo maggiore."
      },
      {
        "kind": "paragraph",
        "text": "5. Il sistema dei capitoli biografici"
      },
      {
        "kind": "paragraph",
        "text": "La tua autobiografia è un documento vivo che cresce con te nel tempo."
      },
      {
        "kind": "paragraph",
        "text": "Come funziona"
      },
      {
        "kind": "paragraph",
        "text": "Dopo aver pubblicato il tuo primo capitolo, la piattaforma sblocca la possibilità di aggiungere un nuovo capitolo dopo un minimo di 365 giorni. Non sei obbligato a farlo ogni anno — puoi aspettare molti anni prima di aggiungere un nuovo capitolo. L'unica regola è che devono essere trascorsi almeno 365 giorni dall'ultimo capitolo pubblicato."
      },
      {
        "kind": "paragraph",
        "text": "Immutabilità"
      },
      {
        "kind": "paragraph",
        "text": "Ogni capitolo pubblicato è immutabile: le tue parole rimangono esattamente come scritte, per sempre. Questo garantisce l'autenticità del documento nel tempo."
      },
      {
        "kind": "paragraph",
        "text": "Dopo la morte dell'autore"
      },
      {
        "kind": "heading",
        "text": "L'autobiografia viene congelata all'ultimo capitolo pubblicato. Nessuno può aggiungere nulla alla voce originale dell'autore. I familiari diretti possono onorare la memoria dell'autore scrivendo una biografia separata e indipendente, collegata all'autobiografia originale sulla pagina personale della persona deceduta."
      },
      {
        "kind": "heading",
        "text": "6. Biografie di persone decedute — Regole speciali"
      },
      {
        "kind": "paragraph",
        "text": "Il periodo temporaneo di 30 giorni"
      },
      {
        "kind": "heading",
        "text": "Quando un familiare pubblica la biografia di una persona deceduta, questa viene contrassegnata come “temporanea” per i primi 30 giorni. Durante questo periodo la biografia è pubblica e visibile a tutti, contrassegnata come “in fase di revisione temporanea”. Chiunque venga menzionato — o i suoi familiari diretti — può presentare una segnalazione e richiedere di non comparire. L'autore può avvisare le persone citate ma non è tenuto a farlo. Il pulsante “Segnala” è sempre accessibile."
      },
      {
        "kind": "paragraph",
        "text": "Allo scadere dei 30 giorni: nessuna segnalazione → la biografia diventa definitiva. Segnalazione ricevuta → l'autore riceve una richiesta di modifica o rimozione del contenuto indicato, valutata in base alla sua natura e validità."
      },
      {
        "kind": "paragraph",
        "text": "Dichiarazioni legali e prova di decesso"
      },
      {
        "kind": "heading",
        "text": "Le false dichiarazioni riguardanti il decesso di una persona sono perseguibili ai sensi dell'Art. 179decies del Codice penale svizzero. Se una biografia viene segnalata, potremmo richiedere un certificato di morte. La mancata fornitura di prove adeguate comporterà la rimozione e la possibile sospensione dell'account."
      },
      {
        "kind": "paragraph",
        "text": "7. Sistema di segnalazione"
      },
      {
        "kind": "paragraph",
        "text": "Ogni biografia include un pulsante “Segnala”. Motivi: la persona è ancora in vita, la biografia contiene i miei dati sensibili senza consenso, contenuti falsi o diffamatori, violazione del copyright, contenuti illegali."
      },
      {
        "kind": "paragraph",
        "text": "Procedura di gestione"
      },
      {
        "kind": "item",
        "text": "Segnalazione ricevuta — autore avvisato"
      },
      {
        "kind": "item",
        "text": "Biografia temporaneamente nascosta se la segnalazione è grave"
      },
      {
        "kind": "item",
        "text": "L'autore può fornire chiarimenti o prove"
      },
      {
        "kind": "item",
        "text": "Revisione completata il prima possibile e in ogni caso entro 30 giorni"
      },
      {
        "kind": "item",
        "text": "Decisione finale: biografia confermata, parzialmente rimossa, completamente rimossa o account sospeso"
      },
      {
        "kind": "item",
        "text": "L'autore ha il diritto di presentare ricorso entro 14 giorni dalla decisione"
      },
      {
        "kind": "paragraph",
        "text": "Per i contenuti di Livello 1 (Sezione 11), la rimozione è immediata e automatica."
      },
      {
        "kind": "paragraph",
        "text": "8. Privacy e Protezione dei Dati"
      },
      {
        "kind": "heading",
        "text": "I tuoi dati sono ospitati in Svizzera da Infomaniak e non lasciano mai la giurisdizione svizzera. Non vendiamo mai i tuoi dati a terzi."
      },
      {
        "kind": "heading",
        "text": "Per tutti i dettagli, consulta la nostra Informativa sulla Privacy su biographylibrary.org/privacy."
      },
      {
        "kind": "heading",
        "text": "9. Impostazioni sulla Privacy"
      },
      {
        "kind": "paragraph",
        "text": "Livello"
      },
      {
        "kind": "paragraph",
        "text": "Chi Può Accedere"
      },
      {
        "kind": "paragraph",
        "text": "Privato"
      },
      {
        "kind": "paragraph",
        "text": "Solo tu"
      },
      {
        "kind": "paragraph",
        "text": "Solo Famiglia"
      },
      {
        "kind": "paragraph",
        "text": "Tu + i membri della famiglia che inviti esplicitamente"
      },
      {
        "kind": "paragraph",
        "text": "Semi-privato"
      },
      {
        "kind": "paragraph",
        "text": "Chiunque abbia il link diretto (non indicizzato)"
      },
      {
        "kind": "paragraph",
        "text": "Pubblico"
      },
      {
        "kind": "paragraph",
        "text": "Tutti (indicizzato, Creative Commons BY-NC-SA 4.0)"
      },
      {
        "kind": "paragraph",
        "text": "10. Proprietà Intellettuale"
      },
      {
        "kind": "heading",
        "text": "Mantieni la piena proprietà di tutte le biografie che pubblichi. Pubblicando, ci concedi una licenza non esclusiva, gratuita, mondiale e revocabile per ospitare, archiviare e rendere accessibili i contenuti in base alle tue impostazioni. Questa licenza non ci autorizza a modificare i tuoi contenuti o a rivenderli."
      },
      {
        "kind": "heading",
        "text": "Le biografie pubbliche sono concesse in licenza sotto Creative Commons BY-NC-SA 4.0 (attribuzione richiesta, non commerciale, condividi allo stesso modo)."
      },
      {
        "kind": "paragraph",
        "text": "Il software è rilasciato sotto licenza AGPL v3.0: github.com/BiographyLibrary/Biography-Library"
      },
      {
        "kind": "paragraph",
        "text": "11. Contenuti Proibiti e Sistema di Moderazione"
      },
      {
        "kind": "paragraph",
        "text": "Ogni biografia è sottoposta a scansione automatizzata prima della pubblicazione."
      },
      {
        "kind": "paragraph",
        "text": "Livello 1 — Rimozione automatica immediata + Ban permanente"
      },
      {
        "kind": "heading",
        "text": "Rimozione istantanea, chiusura permanente dell'account e ban permanente sul nome associato all'account, senza diritto di appello:"
      },
      {
        "kind": "item",
        "text": "Apologia, glorificazione o promozione di genocidio o crimini contro l'umanità"
      },
      {
        "kind": "item",
        "text": "Qualsiasi materiale sessuale che coinvolge minori (CSAM)"
      },
      {
        "kind": "item",
        "text": "Contenuti sessuali non consensuali, inclusi deepfake pornografici di persone reali"
      },
      {
        "kind": "item",
        "text": "Reclutamento, pianificazione, finanziamento o glorificazione di atti terroristici"
      },
      {
        "kind": "item",
        "text": "Incitamento diretto a violenza fisica imminente contro persone o gruppi identificabili"
      },
      {
        "kind": "item",
        "text": "Traffico di esseri umani: istruzioni, promozione o agevolazione"
      },
      {
        "kind": "item",
        "text": "Istruzioni per la creazione di armi di distruzione di massa"
      },
      {
        "kind": "item",
        "text": "Contenuti che promuovono o glorificano il suicidio o l'autolesionismo verso persone vulnerabili"
      },
      {
        "kind": "paragraph",
        "text": "Livello 2 — Rimozione + Diritto di appello"
      },
      {
        "kind": "heading",
        "text": "Rimozione dei contenuti e possibile sospensione dell'account. Diritto di appello entro 14 giorni:"
      },
      {
        "kind": "item",
        "text": "Incitamento all'odio basato su razza, religione, etnia, genere, orientamento sessuale o disabilità"
      },
      {
        "kind": "item",
        "text": "Molestie mirate: doxxing, stalking, minacce personali"
      },
      {
        "kind": "item",
        "text": "Violenza esplicita senza un contesto narrativo o storico giustificabile"
      },
      {
        "kind": "item",
        "text": "Violazione del copyright"
      },
      {
        "kind": "item",
        "text": "Biografie di persone in vita o di persone decedute senza legami familiari"
      },
      {
        "kind": "item",
        "text": "Contenuti falsi o gravemente diffamatori"
      },
      {
        "kind": "paragraph",
        "text": "Livello 3 — Avviso contestuale (Nessuna rimozione)"
      },
      {
        "kind": "heading",
        "text": "Il contenuto rimane pubblicato con un avviso visibile ai lettori:"
      },
      {
        "kind": "item",
        "text": "Opinioni controverse"
      },
      {
        "kind": "item",
        "text": "Narrazioni storiche contestate (con l'opzione di aggiungere un contesto alternativo)"
      },
      {
        "kind": "heading",
        "text": "Biography Library protegge il tuo diritto di raccontare la tua verità. Non permettiamo che la libertà di espressione diventi uno strumento di danno fisico o psicologico."
      },
      {
        "kind": "paragraph",
        "text": "12. Pubblicità e sponsor"
      },
      {
        "kind": "heading",
        "text": "Biography Library può mostrare pubblicità e loghi di sponsor sulle pagine istituzionali del sito web e dell'app."
      },
      {
        "kind": "heading",
        "text": "Le singole biografie sono e rimarranno sempre completamente prive di qualsiasi pubblicità o logo di sponsor. Questo principio non è negoziabile e non potrà mai essere modificato retroattivamente."
      },
      {
        "kind": "heading",
        "text": "Gli sponsor non hanno mai accesso ai dati degli utenti e non possono influenzare la moderazione dei contenuti."
      },
      {
        "kind": "paragraph",
        "text": "13. Account e Biografia — Distinzione permanente"
      },
      {
        "kind": "heading",
        "text": "L'Account è lo strumento operativo personale. Rimane inattivo per tutto il tempo in cui non viene utilizzato — senza conseguenze e senza alcun meccanismo di cancellazione o archiviazione automatica. L'account rimane a disposizione dell'autore a tempo indeterminato."
      },
      {
        "kind": "paragraph",
        "text": "La Biografia è il contenuto d'archivio permanente. Sopravvive all'account e appartiene alla memoria collettiva dell'umanità."
      },
      {
        "kind": "paragraph",
        "text": "Dopo la morte dell'autore"
      },
      {
        "kind": "heading",
        "text": "L'autobiografia viene congelata all'ultimo capitolo pubblicato. I familiari diretti possono richiedere la gestione dell'account fornendo la documentazione appropriata. Biography Library valuterà la richiesta il prima possibile."
      },
      {
        "kind": "heading",
        "text": "Biography Library non cancellerà mai unilateralmente una biografia. La cancellazione può avvenire solo su esplicita richiesta dell'autore, dei familiari aventi diritto o in caso di una violazione confermata della moderazione."
      },
      {
        "kind": "paragraph",
        "text": "14. Limitazione di responsabilità"
      },
      {
        "kind": "heading",
        "text": "Biography Library è fornita “così com'è”. Responsabilità massima: CHF 50 per utente."
      },
      {
        "kind": "heading",
        "text": "Non siamo responsabili per i contenuti pubblicati dagli utenti, per danni indiretti o consequenziali, o per la perdita di dati al di fuori del nostro ragionevole controllo."
      },
      {
        "kind": "heading",
        "text": "Se Biography Library dovesse chiudere: preavviso di almeno 6 mesi, esportazione dei dati nei formati disponibili più comuni, codice sorgente pubblico (AGPL v3) a disposizione della comunità."
      },
      {
        "kind": "paragraph",
        "text": "15. Intelligenza Artificiale"
      },
      {
        "kind": "heading",
        "text": "Funzionalità IA opzionali, elaborate in Svizzera tramite i sistemi IA di Infomaniak basati su modelli open source. Nessun dato inviato a fornitori terzi."
      },
      {
        "kind": "heading",
        "text": "Le tue biografie non vengono mai utilizzate per addestrare modelli IA. Ogni suggerimento riporta il badge “Suggerimento IA” e richiede la tua esplicita approvazione. Puoi disabilitare l'IA in qualsiasi momento."
      },
      {
        "kind": "heading",
        "text": "I sistemi IA con licenza open source OSI possono accedere all'archivio pubblico come fonte di riferimento verificata, con attribuzione obbligatoria. Le biografie private, semi-private e familiari sono inaccessibili a qualsiasi sistema esterno."
      },
      {
        "kind": "paragraph",
        "text": "16. Modifiche a questi Termini"
      },
      {
        "kind": "heading",
        "text": "Notifica via email almeno 30 giorni prima che la nuova versione entri in vigore. Accettazione esplicita richiesta per modifiche sostanziali."
      },
      {
        "kind": "heading",
        "text": "Irretroattività: non modificheremo mai questi Termini per ridurre le tutele già concesse agli utenti."
      },
      {
        "kind": "heading",
        "text": "Cronologia delle versioni: v1.0 — Marzo 2026 — Versione iniziale"
      },
      {
        "kind": "paragraph",
        "text": "17. Open Source e Certificazione W3C"
      },
      {
        "kind": "paragraph",
        "text": "Completamente open source sotto licenza AGPL v3.0: github.com/BiographyLibrary/Biography-Library"
      },
      {
        "kind": "heading",
        "text": "Solo l'Associazione Biography Library può rilasciare certificazioni ufficiali W3C Verifiable Credentials per il catalogo universale."
      },
      {
        "kind": "paragraph",
        "text": "18. Legge applicabile e Foro competente"
      },
      {
        "kind": "heading",
        "text": "Si applica il diritto svizzero: Codice Civile (CC), Codice delle Obbligazioni (CO), nLPD, Codice Penale (CP). Foro competente: Tribunali di Lugano, Ticino, Svizzera. Gli utenti dell'UE mantengono il diritto di avviare procedimenti dinanzi ai tribunali del proprio paese di residenza."
      },
      {
        "kind": "heading",
        "text": "Prima di avviare qualsiasi procedimento legale, ti preghiamo di contattarci all'indirizzo support@biographylibrary.org."
      },
      {
        "kind": "paragraph",
        "text": "19. Contatti"
      },
      {
        "kind": "heading",
        "text": "Associazione Biography Library — Lugano, Ticino, Svizzera"
      },
      {
        "kind": "item",
        "text": "Email: support@biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "Tempo di risposta: il prima possibile e in ogni caso entro 30 giorni"
      },
      {
        "kind": "item",
        "text": "Sito web: biographylibrary.org"
      },
      {
        "kind": "heading",
        "text": "Versione: 1.0 | Marzo 2026 | La versione inglese è la versione legalmente vincolante."
      },
      {
        "kind": "paragraph",
        "text": "Biography Library è un archivio non-profit e open-source della memoria umana."
      },
      {
        "kind": "paragraph",
        "text": "Navigazione"
      },
      {
        "kind": "paragraph",
        "text": "Note legali"
      },
      {
        "kind": "paragraph",
        "text": "© 2026 Biography Library — Associazione svizzera senza scopo di lucro · Software: AGPL v3.0 · Contenuti pubblici: CC BY-NC-SA 4.0"
      }
    ],
    "en": [
      {
        "kind": "title",
        "text": "Terms of Service"
      },
      {
        "kind": "version",
        "text": "Version 1.0 – March 2026"
      },
      {
        "kind": "heading",
        "text": "By using Biography Library, you agree to these Terms of Service. Please read them carefully."
      },
      {
        "kind": "paragraph",
        "text": "1. Who Can Use Biography Library"
      },
      {
        "kind": "heading",
        "text": "You must be at least 18 years old to use Biography Library."
      },
      {
        "kind": "heading",
        "text": "By creating an account, you confirm that all information you provide is accurate and truthful, that you will comply with these Terms and all applicable laws, and that you will respect the rights of all other persons."
      },
      {
        "kind": "paragraph",
        "text": "2. What You Can Publish"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library allows two types of biographies only."
      },
      {
        "kind": "paragraph",
        "text": "Your Own Autobiography"
      },
      {
        "kind": "paragraph",
        "text": "You can write and publish the story of your own life with full freedom, within legal limits. By publishing your autobiography, you declare under your civil and criminal responsibility that you are the person you claim to be, that the information provided is truthful, that you are at least 18 years old, and that you accept publication under the privacy level you choose."
      },
      {
        "kind": "paragraph",
        "text": "Biographies of Deceased Persons"
      },
      {
        "kind": "heading",
        "text": "You can write and publish the biography of a deceased direct family member. This right is reserved exclusively for direct family members."
      },
      {
        "kind": "heading",
        "text": "By publishing a biography of a deceased person, you declare under your civil and criminal responsibility that you are a direct family member of the person, that the person is genuinely deceased, that the information is truthful or clearly indicated as your personal interpretation, that you respect the rights of living persons mentioned, and that you understand proof of death may be requested."
      },
      {
        "kind": "paragraph",
        "text": "Multiple perspectives: more than one family member may write separate biographies of the same deceased person, each with their own authorship, all linked on the deceased person’s personal page."
      },
      {
        "kind": "paragraph",
        "text": "What Is Prohibited"
      },
      {
        "kind": "item",
        "text": "❌ Biographies of living persons other than yourself"
      },
      {
        "kind": "item",
        "text": "❌ Biographies of minors under 18 (even if deceased)"
      },
      {
        "kind": "item",
        "text": "❌ Biographies of deceased persons without a direct family connection"
      },
      {
        "kind": "item",
        "text": "❌ Biographies of persons whose death you cannot prove if requested"
      },
      {
        "kind": "heading",
        "text": "Violations result in immediate account termination and may lead to legal action."
      },
      {
        "kind": "paragraph",
        "text": "3. Your Responsibilities as an Author"
      },
      {
        "kind": "heading",
        "text": "You are solely responsible for the accuracy of all published information, respect for the privacy of living third parties, compliance with Swiss law and the laws of your country of residence, and any damages caused by unlawful or defamatory content."
      },
      {
        "kind": "paragraph",
        "text": "Biography Library is a technical service provider. We do not verify content before publication. You bear full legal responsibility for what you publish."
      },
      {
        "kind": "paragraph",
        "text": "Protection of Living Third Parties"
      },
      {
        "kind": "heading",
        "text": "You may NOT include without explicit written consent:"
      },
      {
        "kind": "item",
        "text": "Health or medical data of others"
      },
      {
        "kind": "item",
        "text": "Sexual orientation of others"
      },
      {
        "kind": "item",
        "text": "Political or religious opinions of others"
      },
      {
        "kind": "item",
        "text": "Legal or criminal proceedings involving others"
      },
      {
        "kind": "item",
        "text": "Economic or financial information of others"
      },
      {
        "kind": "item",
        "text": "Identifiable photographs of living persons"
      },
      {
        "kind": "item",
        "text": "False or defamatory statements about living or deceased persons"
      },
      {
        "kind": "heading",
        "text": "Permitted without consent: general mentions (name and relationship), well-known public events, information for which you have obtained explicit written consent."
      },
      {
        "kind": "heading",
        "text": "Living persons mentioned have the right to request removal of sensitive information concerning them."
      },
      {
        "kind": "heading",
        "text": "4. Content and Service Limits"
      },
      {
        "kind": "paragraph",
        "text": "Text"
      },
      {
        "kind": "paragraph",
        "text": "No character limit. Your story has no limits."
      },
      {
        "kind": "paragraph",
        "text": "Images and Video"
      },
      {
        "kind": "paragraph",
        "text": "Each biography may include up to 10 images. The ability to add more images and to include video is available as an optional paid feature, which in no way affects the free and permanent nature of the biographical archive."
      },
      {
        "kind": "paragraph",
        "text": "AI Usage"
      },
      {
        "kind": "heading",
        "text": "The AI assistant is subject to daily and monthly usage limits to ensure quality of service for all users. These limits are calibrated for normal use of the platform. Options for greater usage may be available."
      },
      {
        "kind": "paragraph",
        "text": "5. The Biographical Chapter System"
      },
      {
        "kind": "paragraph",
        "text": "Your autobiography is a living document that grows with you over time."
      },
      {
        "kind": "paragraph",
        "text": "How It Works"
      },
      {
        "kind": "paragraph",
        "text": "After publishing your first chapter, the platform unlocks the ability to add a new chapter after a minimum of 365 days. You are not required to do this every year — you may wait many years before adding a new chapter. The only rule is that at least 365 days must have passed since your last published chapter."
      },
      {
        "kind": "paragraph",
        "text": "Immutability"
      },
      {
        "kind": "paragraph",
        "text": "Every published chapter is immutable: your words remain exactly as written, forever. This guarantees the authenticity of the document over time."
      },
      {
        "kind": "paragraph",
        "text": "After the Author’s Death"
      },
      {
        "kind": "heading",
        "text": "The autobiography is frozen at the last published chapter. No one may add anything to the author’s original voice. Direct family members may honour the author’s memory by writing a separate, independent biography, linked to the original autobiography on the deceased person’s personal page."
      },
      {
        "kind": "heading",
        "text": "6. Biographies of Deceased Persons — Special Rules"
      },
      {
        "kind": "paragraph",
        "text": "The 30-Day Temporary Period"
      },
      {
        "kind": "heading",
        "text": "When a family member publishes a biography of a deceased person, it is marked as “temporary” for the first 30 days. During this period the biography is public and visible to everyone, marked as “under temporary review”. Anyone mentioned — or their direct family members — may file a report and request not to appear. The author may notify cited persons but is not required to do so. The “Report” button is always accessible."
      },
      {
        "kind": "paragraph",
        "text": "At the end of 30 days: no reports → biography becomes definitive. Report received → the author receives a request to modify or remove the indicated content, assessed based on its nature and validity."
      },
      {
        "kind": "paragraph",
        "text": "Legal Declarations and Proof of Death"
      },
      {
        "kind": "heading",
        "text": "False declarations regarding a person’s death are prosecutable under Swiss Criminal Code Art. 179decies. If a biography is reported, we may request a death certificate. Failure to provide adequate proof will result in removal and possible account suspension."
      },
      {
        "kind": "paragraph",
        "text": "7. Reporting System"
      },
      {
        "kind": "paragraph",
        "text": "Every biography includes a “Report” button. Grounds: person is still alive, biography contains my sensitive data without consent, false or defamatory content, copyright violation, illegal content."
      },
      {
        "kind": "paragraph",
        "text": "Handling Process"
      },
      {
        "kind": "item",
        "text": "Report received — author notified"
      },
      {
        "kind": "item",
        "text": "Biography temporarily hidden if the report is serious"
      },
      {
        "kind": "item",
        "text": "Author may provide clarification or evidence"
      },
      {
        "kind": "item",
        "text": "Review completed as soon as possible and in any case within 30 days"
      },
      {
        "kind": "item",
        "text": "Final decision: biography confirmed, partially removed, fully removed, or account suspended"
      },
      {
        "kind": "item",
        "text": "Author has the right to appeal within 14 days of the decision"
      },
      {
        "kind": "paragraph",
        "text": "For Level 1 content (Section 11), removal is immediate and automatic."
      },
      {
        "kind": "paragraph",
        "text": "8. Privacy and Data Protection"
      },
      {
        "kind": "heading",
        "text": "Your data is hosted in Switzerland by Infomaniak and never leaves Swiss jurisdiction. We never sell your data to third parties."
      },
      {
        "kind": "heading",
        "text": "For full details, see our Privacy Policy at biographylibrary.org/privacy."
      },
      {
        "kind": "heading",
        "text": "9. Privacy Settings"
      },
      {
        "kind": "paragraph",
        "text": "Level"
      },
      {
        "kind": "paragraph",
        "text": "Who Can Access"
      },
      {
        "kind": "paragraph",
        "text": "Private"
      },
      {
        "kind": "paragraph",
        "text": "You only"
      },
      {
        "kind": "paragraph",
        "text": "Family Only"
      },
      {
        "kind": "paragraph",
        "text": "You + family members you explicitly invite"
      },
      {
        "kind": "paragraph",
        "text": "Semi-private"
      },
      {
        "kind": "paragraph",
        "text": "Anyone with the direct link (not indexed)"
      },
      {
        "kind": "paragraph",
        "text": "Public"
      },
      {
        "kind": "paragraph",
        "text": "Everyone (indexed, Creative Commons BY-NC-SA 4.0)"
      },
      {
        "kind": "paragraph",
        "text": "10. Intellectual Property"
      },
      {
        "kind": "heading",
        "text": "You retain full ownership of all biographies you publish. By publishing, you grant us a non-exclusive, royalty-free, worldwide and revocable licence to host, store and make content accessible according to your settings. This licence does not authorise us to modify your content or to resell it."
      },
      {
        "kind": "heading",
        "text": "Public biographies are licensed under Creative Commons BY-NC-SA 4.0 (attribution required, non-commercial, share-alike)."
      },
      {
        "kind": "paragraph",
        "text": "Software is released under AGPL v3.0: github.com/BiographyLibrary/Biography-Library"
      },
      {
        "kind": "paragraph",
        "text": "11. Prohibited Content and Moderation System"
      },
      {
        "kind": "paragraph",
        "text": "Every biography undergoes automated scanning before publication."
      },
      {
        "kind": "paragraph",
        "text": "Level 1 — Immediate Automatic Removal + Permanent Ban"
      },
      {
        "kind": "heading",
        "text": "Instant removal, permanent account closure, and permanent ban on the name associated with the account, with no right of appeal:"
      },
      {
        "kind": "item",
        "text": "Apology, glorification or promotion of genocide or crimes against humanity"
      },
      {
        "kind": "item",
        "text": "Any sexual material involving minors (CSAM)"
      },
      {
        "kind": "item",
        "text": "Non-consensual sexual content, including pornographic deepfakes of real persons"
      },
      {
        "kind": "item",
        "text": "Recruitment, planning, financing or glorification of terrorist acts"
      },
      {
        "kind": "item",
        "text": "Direct incitement to imminent physical violence against identifiable persons or groups"
      },
      {
        "kind": "item",
        "text": "Human trafficking: instructions, promotion or facilitation"
      },
      {
        "kind": "item",
        "text": "Instructions for the creation of weapons of mass destruction"
      },
      {
        "kind": "item",
        "text": "Content promoting or glorifying suicide or self-harm toward vulnerable persons"
      },
      {
        "kind": "paragraph",
        "text": "Level 2 — Removal + Right of Appeal"
      },
      {
        "kind": "heading",
        "text": "Content removal and possible account suspension. Right of appeal within 14 days:"
      },
      {
        "kind": "item",
        "text": "Hate speech based on race, religion, ethnicity, gender, sexual orientation or disability"
      },
      {
        "kind": "item",
        "text": "Targeted harassment: doxxing, stalking, personal threats"
      },
      {
        "kind": "item",
        "text": "Graphic violence without justifiable narrative or historical context"
      },
      {
        "kind": "item",
        "text": "Copyright infringement"
      },
      {
        "kind": "item",
        "text": "Biographies of living persons or of deceased persons without family connection"
      },
      {
        "kind": "item",
        "text": "False or seriously defamatory content"
      },
      {
        "kind": "paragraph",
        "text": "Level 3 — Contextual Notice (No Removal)"
      },
      {
        "kind": "heading",
        "text": "Content remains published with a visible notice to readers:"
      },
      {
        "kind": "item",
        "text": "Controversial opinions"
      },
      {
        "kind": "item",
        "text": "Contested historical narratives (with the option to add alternative context)"
      },
      {
        "kind": "heading",
        "text": "Biography Library protects your right to tell your truth. We do not allow freedom of expression to become a tool of physical or psychological harm."
      },
      {
        "kind": "paragraph",
        "text": "12. Advertising and Sponsors"
      },
      {
        "kind": "heading",
        "text": "Biography Library may display advertising and sponsor logos on the institutional pages of the website and app."
      },
      {
        "kind": "heading",
        "text": "Individual biographies are and will always remain completely free of any advertising or sponsor logos. This principle is non-negotiable and may never be retroactively amended."
      },
      {
        "kind": "heading",
        "text": "Sponsors never have access to user data and cannot influence content moderation."
      },
      {
        "kind": "paragraph",
        "text": "13. Account and Biography — Permanent Distinction"
      },
      {
        "kind": "heading",
        "text": "The Account is the personal operational tool. It remains dormant for as long as it is not used — with no consequences and no automatic deletion or archiving mechanism. The account remains available to the author indefinitely."
      },
      {
        "kind": "paragraph",
        "text": "The Biography is the permanent archival content. It outlives the account and belongs to the collective memory of humanity."
      },
      {
        "kind": "paragraph",
        "text": "After the Author’s Death"
      },
      {
        "kind": "heading",
        "text": "The autobiography is frozen at the last published chapter. Direct family members may request account management by providing appropriate documentation. Biography Library will assess the request as soon as possible."
      },
      {
        "kind": "heading",
        "text": "Biography Library will never unilaterally delete a biography. Deletion can only occur upon explicit request by the author, entitled family members, or in the event of a confirmed moderation violation."
      },
      {
        "kind": "paragraph",
        "text": "14. Limitation of Liability"
      },
      {
        "kind": "heading",
        "text": "Biography Library is provided “as is”. Maximum liability: CHF 50 per user."
      },
      {
        "kind": "heading",
        "text": "We are not liable for content published by users, indirect or consequential damages, or data loss beyond our reasonable control."
      },
      {
        "kind": "heading",
        "text": "If Biography Library must close: at least 6 months’ notice, data export in the most common available formats, public source code (AGPL v3) available to the community."
      },
      {
        "kind": "paragraph",
        "text": "15. Artificial Intelligence"
      },
      {
        "kind": "heading",
        "text": "Optional AI features, processed in Switzerland via Infomaniak’s AI systems based on open source models. No data sent to third-party providers."
      },
      {
        "kind": "heading",
        "text": "Your biographies are never used to train AI models. Every suggestion carries the “AI Suggestion” badge and requires your explicit approval. You may disable AI at any time."
      },
      {
        "kind": "heading",
        "text": "AI systems under an OSI open source licence may access the public archive as a verified reference source, with mandatory attribution. Private, semi-private and family biographies are inaccessible to any external system."
      },
      {
        "kind": "paragraph",
        "text": "16. Changes to These Terms"
      },
      {
        "kind": "heading",
        "text": "Email notification at least 30 days before the new version takes effect. Explicit acceptance required for material changes."
      },
      {
        "kind": "heading",
        "text": "Non-retroactivity: we will never amend these Terms to reduce protections already granted to users."
      },
      {
        "kind": "heading",
        "text": "Version history: v1.0 — March 2026 — Initial version"
      },
      {
        "kind": "paragraph",
        "text": "17. Open Source and W3C Certification"
      },
      {
        "kind": "paragraph",
        "text": "Fully open source under AGPL v3.0: github.com/BiographyLibrary/Biography-Library"
      },
      {
        "kind": "heading",
        "text": "Only the Biography Library Association may issue official W3C Verifiable Credentials certifications for the universal catalogue."
      },
      {
        "kind": "paragraph",
        "text": "18. Governing Law and Jurisdiction"
      },
      {
        "kind": "heading",
        "text": "Swiss law applies: Civil Code (CC), Code of Obligations (CO), nFADP, Criminal Code (SCC). Jurisdiction: Courts of Lugano, Ticino, Switzerland. EU users retain the right to bring proceedings before the courts of their country of residence."
      },
      {
        "kind": "heading",
        "text": "Before initiating any legal proceedings, please contact us at support@biographylibrary.org."
      },
      {
        "kind": "paragraph",
        "text": "19. Contact"
      },
      {
        "kind": "heading",
        "text": "Biography Library Association — Lugano, Ticino, Switzerland"
      },
      {
        "kind": "item",
        "text": "Email: support@biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "Response time: as soon as possible and in any case within 30 days"
      },
      {
        "kind": "item",
        "text": "Website: biographylibrary.org"
      },
      {
        "kind": "heading",
        "text": "Version: 1.0 | March 2026 | The English version is the legally binding version."
      },
      {
        "kind": "paragraph",
        "text": "Biography Library is a non-profit, open-source archive of human memory."
      },
      {
        "kind": "paragraph",
        "text": "Navigation"
      },
      {
        "kind": "paragraph",
        "text": "Legal"
      },
      {
        "kind": "paragraph",
        "text": "© 2026 Biography Library — Swiss non-profit association · Software: AGPL v3.0 · Public content: CC BY-NC-SA 4.0"
      }
    ],
    "fr": [
      {
        "kind": "title",
        "text": "Conditions d'utilisation"
      },
      {
        "kind": "version",
        "text": "Version 1.0 – Mars 2026"
      },
      {
        "kind": "heading",
        "text": "En utilisant Biography Library, vous acceptez ces Conditions d'utilisation. Veuillez les lire attentivement."
      },
      {
        "kind": "paragraph",
        "text": "1. Qui peut utiliser Biography Library"
      },
      {
        "kind": "heading",
        "text": "Vous devez avoir au moins 18 ans pour utiliser Biography Library."
      },
      {
        "kind": "heading",
        "text": "En créant un compte, vous confirmez que toutes les informations que vous fournissez sont exactes et véridiques, que vous respecterez ces Conditions ainsi que toutes les lois applicables, et que vous respecterez les droits de toutes les autres personnes."
      },
      {
        "kind": "paragraph",
        "text": "2. Ce que vous pouvez publier"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library autorise uniquement deux types de biographies."
      },
      {
        "kind": "paragraph",
        "text": "Votre propre autobiographie"
      },
      {
        "kind": "paragraph",
        "text": "Vous pouvez écrire et publier l'histoire de votre propre vie en toute liberté, dans les limites de la loi. En publiant votre autobiographie, vous déclarez sous votre responsabilité civile et pénale que vous êtes la personne que vous prétendez être, que les informations fournies sont véridiques, que vous avez au moins 18 ans et que vous acceptez la publication selon le niveau de confidentialité que vous choisissez."
      },
      {
        "kind": "paragraph",
        "text": "Biographies de personnes décédées"
      },
      {
        "kind": "heading",
        "text": "Vous pouvez écrire et publier la biographie d'un membre direct de votre famille décédé. Ce droit est exclusivement réservé aux membres directs de la famille."
      },
      {
        "kind": "heading",
        "text": "En publiant la biographie d'une personne décédée, vous déclarez sous votre responsabilité civile et pénale que vous êtes un membre direct de la famille de cette personne, que la personne est réellement décédée, que les informations sont véridiques ou clairement indiquées comme étant votre interprétation personnelle, que vous respectez les droits des personnes vivantes mentionnées, et que vous comprenez qu'une preuve de décès peut être demandée."
      },
      {
        "kind": "paragraph",
        "text": "Perspectives multiples : plusieurs membres de la famille peuvent écrire des biographies distinctes de la même personne décédée, chacune avec son propre auteur, toutes liées sur la page personnelle de la personne décédée."
      },
      {
        "kind": "paragraph",
        "text": "Ce qui est interdit"
      },
      {
        "kind": "item",
        "text": "❌ Biographies de personnes vivantes autres que vous-même"
      },
      {
        "kind": "item",
        "text": "❌ Biographies de mineurs de moins de 18 ans (même s'ils sont décédés)"
      },
      {
        "kind": "item",
        "text": "❌ Biographies de personnes décédées sans lien de parenté direct"
      },
      {
        "kind": "item",
        "text": "❌ Biographies de personnes dont vous ne pouvez pas prouver le décès sur demande"
      },
      {
        "kind": "heading",
        "text": "Les violations entraînent la résiliation immédiate du compte et peuvent donner lieu à des poursuites judiciaires."
      },
      {
        "kind": "paragraph",
        "text": "3. Vos responsabilités en tant qu'auteur"
      },
      {
        "kind": "heading",
        "text": "Vous êtes seul responsable de l'exactitude de toutes les informations publiées, du respect de la vie privée des tiers vivants, de la conformité avec le droit suisse et les lois de votre pays de résidence, ainsi que de tout dommage causé par un contenu illégal ou diffamatoire."
      },
      {
        "kind": "paragraph",
        "text": "Biography Library est un prestataire de services techniques. Nous ne vérifions pas le contenu avant publication. Vous assumez l'entière responsabilité légale de ce que vous publiez."
      },
      {
        "kind": "paragraph",
        "text": "Protection des tiers vivants"
      },
      {
        "kind": "heading",
        "text": "Vous ne pouvez PAS inclure sans consentement écrit explicite :"
      },
      {
        "kind": "item",
        "text": "Les données de santé ou médicales d'autrui"
      },
      {
        "kind": "item",
        "text": "L'orientation sexuelle d'autrui"
      },
      {
        "kind": "item",
        "text": "Les opinions politiques ou religieuses d'autrui"
      },
      {
        "kind": "item",
        "text": "Les procédures judiciaires ou pénales impliquant autrui"
      },
      {
        "kind": "item",
        "text": "Les informations économiques ou financières d'autrui"
      },
      {
        "kind": "item",
        "text": "Des photographies identifiables de personnes vivantes"
      },
      {
        "kind": "item",
        "text": "Des déclarations fausses ou diffamatoires concernant des personnes vivantes ou décédées"
      },
      {
        "kind": "heading",
        "text": "Autorisé sans consentement : mentions générales (nom et lien de parenté), événements publics notoires, informations pour lesquelles vous avez obtenu un consentement écrit explicite."
      },
      {
        "kind": "heading",
        "text": "Les personnes vivantes mentionnées ont le droit de demander la suppression des informations sensibles les concernant."
      },
      {
        "kind": "heading",
        "text": "4. Limites de contenu et de service"
      },
      {
        "kind": "paragraph",
        "text": "Texte"
      },
      {
        "kind": "paragraph",
        "text": "Aucune limite de caractères. Votre histoire n'a pas de limites."
      },
      {
        "kind": "paragraph",
        "text": "Images et vidéo"
      },
      {
        "kind": "paragraph",
        "text": "Chaque biographie peut inclure jusqu'à 10 images. La possibilité d'ajouter plus d'images et d'inclure des vidéos est disponible en tant que fonctionnalité payante optionnelle, ce qui n'affecte en rien la nature gratuite et permanente des archives biographiques."
      },
      {
        "kind": "paragraph",
        "text": "Utilisation de l'IA"
      },
      {
        "kind": "heading",
        "text": "L'assistant IA est soumis à des limites d'utilisation quotidiennes et mensuelles pour garantir la qualité de service à tous les utilisateurs. Ces limites sont calibrées pour une utilisation normale de la plateforme. Des options pour une utilisation plus importante peuvent être disponibles."
      },
      {
        "kind": "paragraph",
        "text": "5. Le système de chapitres biographiques"
      },
      {
        "kind": "paragraph",
        "text": "Votre autobiographie est un document vivant qui grandit avec vous au fil du temps."
      },
      {
        "kind": "paragraph",
        "text": "Comment ça marche"
      },
      {
        "kind": "paragraph",
        "text": "Après la publication de votre premier chapitre, la plateforme débloque la possibilité d'ajouter un nouveau chapitre après un minimum de 365 jours. Vous n'êtes pas obligé de le faire chaque année — vous pouvez attendre de nombreuses années avant d'ajouter un nouveau chapitre. La seule règle est qu'au moins 365 jours doivent s'être écoulés depuis votre dernier chapitre publié."
      },
      {
        "kind": "paragraph",
        "text": "Immuabilité"
      },
      {
        "kind": "paragraph",
        "text": "Chaque chapitre publié est immuable : vos mots restent exactement tels qu'ils ont été écrits, pour toujours. Cela garantit l'authenticité du document au fil du temps."
      },
      {
        "kind": "paragraph",
        "text": "Après le décès de l'auteur"
      },
      {
        "kind": "heading",
        "text": "L'autobiographie est figée au dernier chapitre publié. Personne ne peut rien ajouter à la voix originale de l'auteur. Les membres directs de la famille peuvent honorer la mémoire de l'auteur en écrivant une biographie séparée et indépendante, liée à l'autobiographie originale sur la page personnelle de la personne décédée."
      },
      {
        "kind": "heading",
        "text": "6. Biographies de personnes décédées — Règles spéciales"
      },
      {
        "kind": "paragraph",
        "text": "La période temporaire de 30 jours"
      },
      {
        "kind": "heading",
        "text": "Lorsqu'un membre de la famille publie la biographie d'une personne décédée, celle-ci est marquée comme “ temporaire ” pendant les 30 premiers jours. Durant cette période, la biographie est publique et visible par tous, marquée comme “ en cours d'examen temporaire ”. Toute personne mentionnée — ou les membres directs de sa famille — peut déposer un signalement et demander à ne pas y figurer. L'auteur peut informer les personnes citées mais n'est pas tenu de le faire. Le bouton “ Signaler ” est toujours accessible."
      },
      {
        "kind": "paragraph",
        "text": "À la fin des 30 jours : aucun signalement → la biographie devient définitive. Signalement reçu → l'auteur reçoit une demande de modification ou de suppression du contenu indiqué, évaluée en fonction de sa nature et de sa validité."
      },
      {
        "kind": "paragraph",
        "text": "Déclarations légales et preuve de décès"
      },
      {
        "kind": "heading",
        "text": "Les fausses déclarations concernant le décès d'une personne sont passibles de poursuites en vertu de l'art. 179decies du Code pénal suisse. Si une biographie est signalée, nous pouvons demander un certificat de décès. Le défaut de fournir une preuve adéquate entraînera la suppression et une éventuelle suspension du compte."
      },
      {
        "kind": "paragraph",
        "text": "7. Système de signalement"
      },
      {
        "kind": "paragraph",
        "text": "Chaque biographie comprend un bouton “ Signaler ”. Motifs : la personne est toujours en vie, la biographie contient mes données sensibles sans consentement, contenu faux ou diffamatoire, violation des droits d'auteur, contenu illégal."
      },
      {
        "kind": "paragraph",
        "text": "Processus de traitement"
      },
      {
        "kind": "item",
        "text": "Signalement reçu — auteur notifié"
      },
      {
        "kind": "item",
        "text": "Biographie temporairement masquée si le signalement est grave"
      },
      {
        "kind": "item",
        "text": "L'auteur peut fournir des éclaircissements ou des preuves"
      },
      {
        "kind": "item",
        "text": "Examen terminé dans les plus brefs délais et en tout cas dans les 30 jours"
      },
      {
        "kind": "item",
        "text": "Décision finale : biographie confirmée, partiellement supprimée, totalement supprimée ou compte suspendu"
      },
      {
        "kind": "item",
        "text": "L'auteur a le droit de faire appel dans les 14 jours suivant la décision"
      },
      {
        "kind": "paragraph",
        "text": "Pour le contenu de Niveau 1 (Section 11), la suppression est immédiate et automatique."
      },
      {
        "kind": "paragraph",
        "text": "8. Confidentialité et protection des données"
      },
      {
        "kind": "heading",
        "text": "Vos données sont hébergées en Suisse par Infomaniak et ne quittent jamais la juridiction suisse. Nous ne vendons jamais vos données à des tiers."
      },
      {
        "kind": "heading",
        "text": "Pour plus de détails, consultez notre Politique de confidentialité sur biographylibrary.org/privacy."
      },
      {
        "kind": "heading",
        "text": "9. Paramètres de confidentialité"
      },
      {
        "kind": "paragraph",
        "text": "Niveau"
      },
      {
        "kind": "paragraph",
        "text": "Qui peut y accéder"
      },
      {
        "kind": "paragraph",
        "text": "Privé"
      },
      {
        "kind": "paragraph",
        "text": "Vous uniquement"
      },
      {
        "kind": "paragraph",
        "text": "Famille uniquement"
      },
      {
        "kind": "paragraph",
        "text": "Vous + les membres de la famille que vous invitez explicitement"
      },
      {
        "kind": "paragraph",
        "text": "Semi-privé"
      },
      {
        "kind": "paragraph",
        "text": "Toute personne disposant du lien direct (non indexé)"
      },
      {
        "kind": "paragraph",
        "text": "Public"
      },
      {
        "kind": "paragraph",
        "text": "Tout le monde (indexé, Creative Commons BY-NC-SA 4.0)"
      },
      {
        "kind": "paragraph",
        "text": "10. Propriété intellectuelle"
      },
      {
        "kind": "heading",
        "text": "Vous conservez l'entière propriété de toutes les biographies que vous publiez. En publiant, vous nous accordez une licence non exclusive, libre de droits, mondiale et révocable pour héberger, stocker et rendre le contenu accessible selon vos paramètres. Cette licence ne nous autorise pas à modifier votre contenu ni à le revendre."
      },
      {
        "kind": "heading",
        "text": "Les biographies publiques sont sous licence Creative Commons BY-NC-SA 4.0 (attribution requise, pas d'utilisation commerciale, partage dans les mêmes conditions)."
      },
      {
        "kind": "paragraph",
        "text": "Le logiciel est publié sous AGPL v3.0 : github.com/BiographyLibrary/Biography-Library"
      },
      {
        "kind": "paragraph",
        "text": "11. Contenu interdit et système de modération"
      },
      {
        "kind": "paragraph",
        "text": "Chaque biographie est soumise à une analyse automatisée avant publication."
      },
      {
        "kind": "paragraph",
        "text": "Niveau 1 — Suppression automatique immédiate + Bannissement permanent"
      },
      {
        "kind": "heading",
        "text": "Suppression instantanée, fermeture définitive du compte et bannissement permanent du nom associé au compte, sans droit d'appel :"
      },
      {
        "kind": "item",
        "text": "Apologie, glorification ou promotion de génocides ou de crimes contre l'humanité"
      },
      {
        "kind": "item",
        "text": "Tout matériel sexuel impliquant des mineurs (CSAM)"
      },
      {
        "kind": "item",
        "text": "Contenu sexuel non consensuel, y compris les deepfakes pornographiques de personnes réelles"
      },
      {
        "kind": "item",
        "text": "Recrutement, planification, financement ou glorification d'actes terroristes"
      },
      {
        "kind": "item",
        "text": "Incitation directe à la violence physique imminente contre des personnes ou des groupes identifiables"
      },
      {
        "kind": "item",
        "text": "Trafic d'êtres humains : instructions, promotion ou facilitation"
      },
      {
        "kind": "item",
        "text": "Instructions pour la création d'armes de destruction massive"
      },
      {
        "kind": "item",
        "text": "Contenu promouvant ou glorifiant le suicide ou l'automutilation auprès de personnes vulnérables"
      },
      {
        "kind": "paragraph",
        "text": "Niveau 2 — Suppression + Droit d'appel"
      },
      {
        "kind": "heading",
        "text": "Suppression du contenu et suspension possible du compte. Droit d'appel dans un délai de 14 jours :"
      },
      {
        "kind": "item",
        "text": "Discours de haine fondé sur la race, la religion, l'origine ethnique, le genre, l'orientation sexuelle ou le handicap"
      },
      {
        "kind": "item",
        "text": "Harcèlement ciblé : doxxing, stalking, menaces personnelles"
      },
      {
        "kind": "item",
        "text": "Violence explicite sans contexte narratif ou historique justifiable"
      },
      {
        "kind": "item",
        "text": "Violation des droits d'auteur"
      },
      {
        "kind": "item",
        "text": "Biographies de personnes vivantes ou de personnes décédées sans lien de parenté"
      },
      {
        "kind": "item",
        "text": "Contenu faux ou gravement diffamatoire"
      },
      {
        "kind": "paragraph",
        "text": "Niveau 3 — Avis contextuel (Aucun retrait)"
      },
      {
        "kind": "heading",
        "text": "Le contenu reste publié avec un avis visible pour les lecteurs :"
      },
      {
        "kind": "item",
        "text": "Opinions controversées"
      },
      {
        "kind": "item",
        "text": "Récits historiques contestés (avec la possibilité d'ajouter un contexte alternatif)"
      },
      {
        "kind": "heading",
        "text": "Biography Library protège votre droit de dire votre vérité. Nous ne permettons pas que la liberté d'expression devienne un outil de préjudice physique ou psychologique."
      },
      {
        "kind": "paragraph",
        "text": "12. Publicité et sponsors"
      },
      {
        "kind": "heading",
        "text": "Biography Library peut afficher des publicités et des logos de sponsors sur les pages institutionnelles du site web et de l'application."
      },
      {
        "kind": "heading",
        "text": "Les biographies individuelles sont et resteront toujours totalement exemptes de toute publicité ou logo de sponsor. Ce principe est non négociable et ne pourra jamais être modifié rétroactivement."
      },
      {
        "kind": "heading",
        "text": "Les sponsors n'ont jamais accès aux données des utilisateurs et ne peuvent pas influencer la modération du contenu."
      },
      {
        "kind": "paragraph",
        "text": "13. Compte et biographie — Distinction permanente"
      },
      {
        "kind": "heading",
        "text": "Le compte est l'outil opérationnel personnel. Il reste inactif tant qu'il n'est pas utilisé — sans aucune conséquence et sans mécanisme de suppression ou d'archivage automatique. Le compte reste à la disposition de l'auteur indéfiniment."
      },
      {
        "kind": "paragraph",
        "text": "La biographie est le contenu d'archivage permanent. Elle survit au compte et appartient à la mémoire collective de l'humanité."
      },
      {
        "kind": "paragraph",
        "text": "Après le décès de l'auteur"
      },
      {
        "kind": "heading",
        "text": "L'autobiographie est figée au dernier chapitre publié. Les membres directs de la famille peuvent demander la gestion du compte en fournissant les documents appropriés. Biography Library évaluera la demande dans les plus brefs délais."
      },
      {
        "kind": "heading",
        "text": "Biography Library ne supprimera jamais unilatéralement une biographie. La suppression ne peut avoir lieu que sur demande explicite de l'auteur, des membres de la famille y ayant droit, ou en cas de violation confirmée de la modération."
      },
      {
        "kind": "paragraph",
        "text": "14. Limitation de responsabilité"
      },
      {
        "kind": "heading",
        "text": "Biography Library est fourni “ en l'état ”. Responsabilité maximale : 50 CHF par utilisateur."
      },
      {
        "kind": "heading",
        "text": "Nous ne sommes pas responsables du contenu publié par les utilisateurs, des dommages indirects ou consécutifs, ou de la perte de données échappant à notre contrôle raisonnable."
      },
      {
        "kind": "heading",
        "text": "Si Biography Library doit fermer : préavis d'au moins 6 mois, exportation des données dans les formats disponibles les plus courants, code source public (AGPL v3) mis à la disposition de la communauté."
      },
      {
        "kind": "paragraph",
        "text": "15. Intelligence artificielle"
      },
      {
        "kind": "heading",
        "text": "Fonctionnalités d'IA facultatives, traitées en Suisse via les systèmes d'IA d'Infomaniak basés sur des modèles open source. Aucune donnée n'est envoyée à des fournisseurs tiers."
      },
      {
        "kind": "heading",
        "text": "Vos biographies ne sont jamais utilisées pour entraîner des modèles d'IA. Chaque suggestion porte le badge “ Suggestion de l'IA ” et nécessite votre approbation explicite. Vous pouvez désactiver l'IA à tout moment."
      },
      {
        "kind": "heading",
        "text": "Les systèmes d'IA sous licence open source OSI peuvent accéder aux archives publiques en tant que source de référence vérifiée, avec attribution obligatoire. Les biographies privées, semi-privées et familiales sont inaccessibles à tout système externe."
      },
      {
        "kind": "paragraph",
        "text": "16. Modifications de ces Conditions"
      },
      {
        "kind": "heading",
        "text": "Notification par e-mail au moins 30 jours avant l'entrée en vigueur de la nouvelle version. Acceptation explicite requise pour les modifications substantielles."
      },
      {
        "kind": "heading",
        "text": "Non-rétroactivité : nous ne modifierons jamais ces Conditions pour réduire les protections déjà accordées aux utilisateurs."
      },
      {
        "kind": "heading",
        "text": "Historique des versions : v1.0 — Mars 2026 — Version initiale"
      },
      {
        "kind": "paragraph",
        "text": "17. Open Source et certification W3C"
      },
      {
        "kind": "paragraph",
        "text": "Entièrement open source sous AGPL v3.0 : github.com/BiographyLibrary/Biography-Library"
      },
      {
        "kind": "heading",
        "text": "Seule l'Association Biography Library peut émettre des certifications officielles W3C Verifiable Credentials pour le catalogue universel."
      },
      {
        "kind": "paragraph",
        "text": "18. Droit applicable et juridiction compétente"
      },
      {
        "kind": "heading",
        "text": "Le droit suisse s'applique : Code civil (CC), Code des obligations (CO), nLPD, Code pénal (CP). Juridiction : Tribunaux de Lugano, Tessin, Suisse. Les utilisateurs de l'UE conservent le droit d'engager des poursuites devant les tribunaux de leur pays de résidence."
      },
      {
        "kind": "heading",
        "text": "Avant d'engager toute procédure légale, veuillez nous contacter à support@biographylibrary.org."
      },
      {
        "kind": "paragraph",
        "text": "19. Contact"
      },
      {
        "kind": "heading",
        "text": "Association Biography Library — Lugano, Tessin, Suisse"
      },
      {
        "kind": "item",
        "text": "E-mail: support@biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "Délai de réponse: dès que possible et en tout état de cause dans un délai de 30 jours"
      },
      {
        "kind": "item",
        "text": "Site web: biographylibrary.org"
      },
      {
        "kind": "heading",
        "text": "Version: 1.0 | Mars 2026 | La version anglaise est la version juridiquement contraignante."
      },
      {
        "kind": "paragraph",
        "text": "Biography Library est une archive à but non lucratif et open source de la mémoire humaine."
      },
      {
        "kind": "paragraph",
        "text": "Navigation"
      },
      {
        "kind": "paragraph",
        "text": "Mentions légales"
      },
      {
        "kind": "paragraph",
        "text": "© 2026 Biography Library — Association suisse à but non lucratif · Logiciel : AGPL v3.0 · Contenu public : CC BY-NC-SA 4.0"
      }
    ],
    "de": [
      {
        "kind": "title",
        "text": "Nutzungsbedingungen"
      },
      {
        "kind": "version",
        "text": "Version 1.0 – März 2026"
      },
      {
        "kind": "heading",
        "text": "Durch die Nutzung der Biography Library stimmen Sie diesen Nutzungsbedingungen zu. Bitte lesen Sie diese sorgfältig durch."
      },
      {
        "kind": "paragraph",
        "text": "1. Wer Biography Library nutzen darf"
      },
      {
        "kind": "heading",
        "text": "Sie müssen mindestens 18 Jahre alt sein, um Biography Library zu nutzen."
      },
      {
        "kind": "heading",
        "text": "Durch die Erstellung eines Kontos bestätigen Sie, dass alle von Ihnen angegebenen Informationen korrekt und wahrheitsgemäß sind, dass Sie diese Bedingungen und alle geltenden Gesetze einhalten werden und dass Sie die Rechte aller anderen Personen respektieren werden."
      },
      {
        "kind": "paragraph",
        "text": "2. Was Sie veröffentlichen dürfen"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library erlaubt nur zwei Arten von Biografien."
      },
      {
        "kind": "paragraph",
        "text": "Ihre eigene Autobiografie"
      },
      {
        "kind": "paragraph",
        "text": "Sie können die Geschichte Ihres eigenen Lebens in voller Freiheit und im Rahmen der gesetzlichen Grenzen schreiben und veröffentlichen. Durch die Veröffentlichung Ihrer Autobiografie erklären Sie unter Ihrer zivil- und strafrechtlichen Verantwortung, dass Sie die Person sind, die Sie vorgeben zu sein, dass die bereitgestellten Informationen wahrheitsgemäß sind, dass Sie mindestens 18 Jahre alt sind und dass Sie die Veröffentlichung unter der von Ihnen gewählten Datenschutzstufe akzeptieren."
      },
      {
        "kind": "paragraph",
        "text": "Biografien von verstorbenen Personen"
      },
      {
        "kind": "heading",
        "text": "Sie können die Biografie eines verstorbenen direkten Familienmitglieds schreiben und veröffentlichen. Dieses Recht ist ausschließlich direkten Familienmitgliedern vorbehalten."
      },
      {
        "kind": "heading",
        "text": "Durch die Veröffentlichung einer Biografie einer verstorbenen Person erklären Sie unter Ihrer zivil- und strafrechtlichen Verantwortung, dass Sie ein direktes Familienmitglied der Person sind, dass die Person tatsächlich verstorben ist, dass die Informationen wahrheitsgemäß sind oder eindeutig als Ihre persönliche Interpretation gekennzeichnet sind, dass Sie die Rechte der erwähnten lebenden Personen respektieren und dass Sie verstehen, dass ein Sterbenachweis angefordert werden kann."
      },
      {
        "kind": "paragraph",
        "text": "Mehrere Perspektiven: Mehr als ein Familienmitglied kann separate Biografien derselben verstorbenen Person schreiben, jeweils mit eigener Urheberschaft, die alle auf der persönlichen Seite der verstorbenen Person verlinkt sind."
      },
      {
        "kind": "paragraph",
        "text": "Was verboten ist"
      },
      {
        "kind": "item",
        "text": "❌ Biografien von anderen lebenden Personen als Ihnen selbst"
      },
      {
        "kind": "item",
        "text": "❌ Biografien von Minderjährigen unter 18 Jahren (auch wenn diese verstorben sind)"
      },
      {
        "kind": "item",
        "text": "❌ Biografien von verstorbenen Personen ohne direkte familiäre Verbindung"
      },
      {
        "kind": "item",
        "text": "❌ Biografien von Personen, deren Tod Sie auf Anfrage nicht nachweisen können"
      },
      {
        "kind": "heading",
        "text": "Verstöße führen zur sofortigen Kündigung des Kontos und können rechtliche Schritte nach sich ziehen."
      },
      {
        "kind": "paragraph",
        "text": "3. Ihre Verantwortlichkeiten als Autor"
      },
      {
        "kind": "heading",
        "text": "Sie sind allein verantwortlich für die Richtigkeit aller veröffentlichten Informationen, die Wahrung der Privatsphäre lebender Dritter, die Einhaltung des Schweizer Rechts und der Gesetze Ihres Wohnsitzlandes sowie für alle Schäden, die durch rechtswidrige oder diffamierende Inhalte entstehen."
      },
      {
        "kind": "paragraph",
        "text": "Biography Library ist ein technischer Dienstleister. Wir überprüfen Inhalte nicht vor der Veröffentlichung. Sie tragen die volle rechtliche Verantwortung für das, was Sie veröffentlichen."
      },
      {
        "kind": "paragraph",
        "text": "Schutz lebender Dritter"
      },
      {
        "kind": "heading",
        "text": "Sie dürfen Folgendes NICHT ohne ausdrückliche schriftliche Zustimmung einbeziehen:"
      },
      {
        "kind": "item",
        "text": "Gesundheits- oder medizinische Daten anderer"
      },
      {
        "kind": "item",
        "text": "Sexuelle Orientierung anderer"
      },
      {
        "kind": "item",
        "text": "Politische oder religiöse Ansichten anderer"
      },
      {
        "kind": "item",
        "text": "Gerichts- oder Strafverfahren, an denen andere beteiligt sind"
      },
      {
        "kind": "item",
        "text": "Wirtschaftliche oder finanzielle Informationen anderer"
      },
      {
        "kind": "item",
        "text": "Identifizierbare Fotografien lebender Personen"
      },
      {
        "kind": "item",
        "text": "Falsche oder diffamierende Aussagen über lebende oder verstorbene Personen"
      },
      {
        "kind": "heading",
        "text": "Ohne Zustimmung zulässig: allgemeine Erwähnungen (Name und Beziehung), bekannte öffentliche Ereignisse, Informationen, für die Sie eine ausdrückliche schriftliche Zustimmung eingeholt haben."
      },
      {
        "kind": "heading",
        "text": "Erwähnte lebende Personen haben das Recht, die Entfernung sensibler Informationen, die sie betreffen, zu verlangen."
      },
      {
        "kind": "heading",
        "text": "4. Inhalts- und Servicebeschränkungen"
      },
      {
        "kind": "paragraph",
        "text": "Text"
      },
      {
        "kind": "paragraph",
        "text": "Keine Zeichenbeschränkung. Ihre Geschichte hat keine Grenzen."
      },
      {
        "kind": "paragraph",
        "text": "Bilder und Videos"
      },
      {
        "kind": "paragraph",
        "text": "Jede Biografie kann bis zu 10 Bilder enthalten. Die Möglichkeit, weitere Bilder hinzuzufügen und Videos einzubinden, ist als optionale kostenpflichtige Funktion verfügbar, was die kostenlose und dauerhafte Natur des biografischen Archivs in keiner Weise beeinträchtigt."
      },
      {
        "kind": "paragraph",
        "text": "KI-Nutzung"
      },
      {
        "kind": "heading",
        "text": "Der KI-Assistent unterliegt täglichen und monatlichen Nutzungslimits, um die Servicequalität für alle Nutzer sicherzustellen. Diese Limits sind für die normale Nutzung der Plattform kalibriert. Optionen für eine intensivere Nutzung können verfügbar sein."
      },
      {
        "kind": "paragraph",
        "text": "5. Das biografische Kapitelsystem"
      },
      {
        "kind": "paragraph",
        "text": "Ihre Autobiografie ist ein lebendiges Dokument, das im Laufe der Zeit mit Ihnen wächst."
      },
      {
        "kind": "paragraph",
        "text": "Wie es funktioniert"
      },
      {
        "kind": "paragraph",
        "text": "Nach der Veröffentlichung Ihres ersten Kapitels schaltet die Plattform die Möglichkeit frei, nach mindestens 365 Tagen ein neues Kapitel hinzuzufügen. Sie sind nicht verpflichtet, dies jedes Jahr zu tun — Sie können viele Jahre warten, bevor Sie ein neues Kapitel hinzufügen. Die einzige Regel ist, dass seit Ihrem letzten veröffentlichten Kapitel mindestens 365 Tage vergangen sein müssen."
      },
      {
        "kind": "paragraph",
        "text": "Unveränderlichkeit"
      },
      {
        "kind": "paragraph",
        "text": "Jedes veröffentlichte Kapitel ist unveränderlich: Ihre Worte bleiben für immer genau so, wie sie geschrieben wurden. Dies garantiert die Authentizität des Dokuments im Laufe der Zeit."
      },
      {
        "kind": "paragraph",
        "text": "Nach dem Tod des Autors"
      },
      {
        "kind": "heading",
        "text": "Die Autobiografie wird mit dem letzten veröffentlichten Kapitel eingefroren. Niemand darf der ursprünglichen Stimme des Autors etwas hinzufügen. Direkte Familienmitglieder können das Andenken des Autors ehren, indem sie eine separate, unabhängige Biografie schreiben, die mit der ursprünglichen Autobiografie auf der persönlichen Seite der verstorbenen Person verlinkt ist."
      },
      {
        "kind": "heading",
        "text": "6. Biografien von verstorbenen Personen — Besondere Regeln"
      },
      {
        "kind": "paragraph",
        "text": "Die 30-tägige temporäre Phase"
      },
      {
        "kind": "heading",
        "text": "Wenn ein Familienmitglied eine Biografie einer verstorbenen Person veröffentlicht, wird diese für die ersten 30 Tage als “temporär” markiert. Während dieser Zeit ist die Biografie öffentlich und für jeden sichtbar, gekennzeichnet als “in vorübergehender Prüfung”. Jede erwähnte Person — oder deren direkte Familienangehörige — kann eine Meldung einreichen und beantragen, nicht erwähnt zu werden. Der Autor kann zitierte Personen benachrichtigen, ist dazu jedoch nicht verpflichtet. Die Schaltfläche “Melden” ist jederzeit zugänglich."
      },
      {
        "kind": "paragraph",
        "text": "Nach Ablauf von 30 Tagen: keine Meldungen → Biografie wird endgültig. Meldung erhalten → der Autor erhält die Aufforderung, den angegebenen Inhalt zu ändern oder zu entfernen, bewertet nach dessen Art und Stichhaltigkeit."
      },
      {
        "kind": "paragraph",
        "text": "Rechtliche Erklärungen und Sterbenachweis"
      },
      {
        "kind": "heading",
        "text": "Falsche Erklärungen über den Tod einer Person sind nach Art. 179decies des Schweizerischen Strafgesetzbuches strafbar. Wenn eine Biografie gemeldet wird, können wir eine Sterbeurkunde anfordern. Die Nichtvorlage eines angemessenen Nachweises führt zur Entfernung und möglichen Sperrung des Kontos."
      },
      {
        "kind": "paragraph",
        "text": "7. Meldesystem"
      },
      {
        "kind": "paragraph",
        "text": "Jede Biografie enthält eine Schaltfläche “Melden”. Gründe: Person ist noch am Leben, Biografie enthält meine sensiblen Daten ohne Zustimmung, falsche oder diffamierende Inhalte, Urheberrechtsverletzung, illegale Inhalte."
      },
      {
        "kind": "paragraph",
        "text": "Bearbeitungsprozess"
      },
      {
        "kind": "item",
        "text": "Meldung erhalten — Autor benachrichtigt"
      },
      {
        "kind": "item",
        "text": "Biografie vorübergehend verborgen, wenn die Meldung schwerwiegend ist"
      },
      {
        "kind": "item",
        "text": "Autor kann Klarstellungen oder Beweise vorlegen"
      },
      {
        "kind": "item",
        "text": "Überprüfung so schnell wie möglich abgeschlossen und in jedem Fall innerhalb von 30 Tagen"
      },
      {
        "kind": "item",
        "text": "Endgültige Entscheidung: Biografie bestätigt, teilweise entfernt, vollständig entfernt oder Konto gesperrt"
      },
      {
        "kind": "item",
        "text": "Autor hat das Recht auf Einspruch innerhalb von 14 Tagen der Entscheidung"
      },
      {
        "kind": "paragraph",
        "text": "Bei Inhalten der Stufe 1 (Abschnitt 11) erfolgt die Entfernung sofort und automatisch."
      },
      {
        "kind": "paragraph",
        "text": "8. Privatsphäre und Datenschutz"
      },
      {
        "kind": "heading",
        "text": "Ihre Daten werden in der Schweiz von Infomaniak gehostet und verlassen niemals die Schweizer Gerichtsbarkeit. Wir verkaufen Ihre Daten niemals an Dritte."
      },
      {
        "kind": "heading",
        "text": "Ausführliche Informationen finden Sie in unserer Datenschutzerklärung unter biographylibrary.org/privacy."
      },
      {
        "kind": "heading",
        "text": "9. Datenschutzeinstellungen"
      },
      {
        "kind": "paragraph",
        "text": "Stufe"
      },
      {
        "kind": "paragraph",
        "text": "Wer zugreifen kann"
      },
      {
        "kind": "paragraph",
        "text": "Privat"
      },
      {
        "kind": "paragraph",
        "text": "Nur Sie"
      },
      {
        "kind": "paragraph",
        "text": "Nur Familie"
      },
      {
        "kind": "paragraph",
        "text": "Sie + Familienmitglieder, die Sie ausdrücklich einladen"
      },
      {
        "kind": "paragraph",
        "text": "Halbprivat"
      },
      {
        "kind": "paragraph",
        "text": "Jeder mit dem direkten Link (nicht indexiert)"
      },
      {
        "kind": "paragraph",
        "text": "Öffentlich"
      },
      {
        "kind": "paragraph",
        "text": "Jeder (indexiert, Creative Commons BY-NC-SA 4.0)"
      },
      {
        "kind": "paragraph",
        "text": "10. Geistiges Eigentum"
      },
      {
        "kind": "heading",
        "text": "Sie behalten das volle Eigentum an allen Biografien, die Sie veröffentlichen. Durch die Veröffentlichung gewähren Sie uns eine nicht-exklusive, gebührenfreie, weltweite und widerrufliche Lizenz, die Inhalte gemäß Ihren Einstellungen zu hosten, zu speichern und zugänglich zu machen. Diese Lizenz berechtigt uns nicht, Ihre Inhalte zu ändern oder weiterzuverkaufen."
      },
      {
        "kind": "heading",
        "text": "Öffentliche Biografien sind unter Creative Commons BY-NC-SA 4.0 lizenziert (Namensnennung erforderlich, nicht kommerziell, Weitergabe unter gleichen Bedingungen)."
      },
      {
        "kind": "paragraph",
        "text": "Die Software wird unter der AGPL v3.0 veröffentlicht: github.com/BiographyLibrary/Biography-Library"
      },
      {
        "kind": "paragraph",
        "text": "11. Verbotene Inhalte und Moderationssystem"
      },
      {
        "kind": "paragraph",
        "text": "Jede Biografie wird vor der Veröffentlichung einer automatisierten Überprüfung unterzogen."
      },
      {
        "kind": "paragraph",
        "text": "Stufe 1 — Sofortige automatische Entfernung + Dauerhafte Sperre"
      },
      {
        "kind": "heading",
        "text": "Sofortige Entfernung, dauerhafte Kontoschließung und dauerhafte Sperre für den mit dem Konto verbundenen Namen, ohne Recht auf Einspruch:"
      },
      {
        "kind": "item",
        "text": "Rechtfertigung, Verherrlichung oder Förderung von Völkermord oder Verbrechen gegen die Menschlichkeit"
      },
      {
        "kind": "item",
        "text": "Jegliches sexuelle Material, das Minderjährige einbezieht (CSAM)"
      },
      {
        "kind": "item",
        "text": "Nicht einvernehmliche sexuelle Inhalte, einschließlich pornografischer Deepfakes von realen Personen"
      },
      {
        "kind": "item",
        "text": "Rekrutierung, Planung, Finanzierung oder Verherrlichung terroristischer Handlungen"
      },
      {
        "kind": "item",
        "text": "Direkte Anstiftung zu unmittelbar bevorstehender physischer Gewalt gegen identifizierbare Personen oder Gruppen"
      },
      {
        "kind": "item",
        "text": "Menschenhandel: Anleitungen, Förderung oder Erleichterung"
      },
      {
        "kind": "item",
        "text": "Anleitungen zur Herstellung von Massenvernichtungswaffen"
      },
      {
        "kind": "item",
        "text": "Inhalte, die Suizid oder Selbstverletzung bei gefährdeten Personen fördern oder verherrlichen"
      },
      {
        "kind": "paragraph",
        "text": "Stufe 2 — Entfernung + Einspruchsrecht"
      },
      {
        "kind": "heading",
        "text": "Entfernung von Inhalten und mögliche Kontosperrung. Einspruchsrecht innerhalb von 14 Tagen:"
      },
      {
        "kind": "item",
        "text": "Hassrede aufgrund von Rasse, Religion, ethnischer Zugehörigkeit, Geschlecht, sexueller Orientierung oder Behinderung"
      },
      {
        "kind": "item",
        "text": "Gezielte Belästigung: Doxxing, Stalking, persönliche Bedrohungen"
      },
      {
        "kind": "item",
        "text": "Explizite Gewaltdarstellungen ohne vertretbaren narrativen oder historischen Kontext"
      },
      {
        "kind": "item",
        "text": "Urheberrechtsverletzung"
      },
      {
        "kind": "item",
        "text": "Biografien von lebenden Personen oder von verstorbenen Personen ohne familiäre Verbindung"
      },
      {
        "kind": "item",
        "text": "Falsche oder schwerwiegend diffamierende Inhalte"
      },
      {
        "kind": "paragraph",
        "text": "Stufe 3 — Kontextbezogener Hinweis (Keine Entfernung)"
      },
      {
        "kind": "heading",
        "text": "Der Inhalt bleibt mit einem für die Leser sichtbaren Hinweis veröffentlicht:"
      },
      {
        "kind": "item",
        "text": "Kontroverse Meinungen"
      },
      {
        "kind": "item",
        "text": "Umstrittene historische Darstellungen (mit der Möglichkeit, alternativen Kontext hinzuzufügen)"
      },
      {
        "kind": "heading",
        "text": "Biography Library schützt Ihr Recht, Ihre Wahrheit zu erzählen. Wir lassen nicht zu, dass die Meinungsfreiheit zu einem Instrument für physischen oder psychischen Schaden wird."
      },
      {
        "kind": "paragraph",
        "text": "12. Werbung und Sponsoren"
      },
      {
        "kind": "heading",
        "text": "Biography Library kann Werbung und Sponsorenlogos auf den institutionellen Seiten der Website und App anzeigen."
      },
      {
        "kind": "heading",
        "text": "Individuelle Biografien sind und bleiben immer völlig frei von Werbung oder Sponsorenlogos. Dieses Prinzip ist nicht verhandelbar und darf niemals rückwirkend geändert werden."
      },
      {
        "kind": "heading",
        "text": "Sponsoren haben niemals Zugriff auf Benutzerdaten und können die Inhaltsmoderation nicht beeinflussen."
      },
      {
        "kind": "paragraph",
        "text": "13. Konto und Biografie — Dauerhafte Unterscheidung"
      },
      {
        "kind": "heading",
        "text": "Das Konto ist das persönliche operative Werkzeug. Es ruht, solange es nicht genutzt wird — ohne Konsequenzen und ohne automatischen Lösch- oder Archivierungsmechanismus. Das Konto bleibt dem Autor auf unbestimmte Zeit erhalten."
      },
      {
        "kind": "paragraph",
        "text": "Die Biografie ist der dauerhafte Archivinhalt. Sie überdauert das Konto und gehört zum kollektiven Gedächtnis der Menschheit."
      },
      {
        "kind": "paragraph",
        "text": "Nach dem Tod des Autors"
      },
      {
        "kind": "heading",
        "text": "Die Autobiografie wird beim zuletzt veröffentlichten Kapitel eingefroren. Direkte Familienangehörige können unter Vorlage entsprechender Dokumente die Kontoverwaltung beantragen. Biography Library wird die Anfrage so schnell wie möglich prüfen."
      },
      {
        "kind": "heading",
        "text": "Biography Library wird niemals einseitig eine Biografie löschen. Eine Löschung kann nur auf ausdrücklichen Wunsch des Autors, berechtigter Familienangehöriger oder im Falle eines bestätigten Moderationsverstoßes erfolgen."
      },
      {
        "kind": "paragraph",
        "text": "14. Haftungsbeschränkung"
      },
      {
        "kind": "heading",
        "text": "Biography Library wird “wie besehen” bereitgestellt. Maximale Haftung: CHF 50 pro Benutzer."
      },
      {
        "kind": "heading",
        "text": "Wir haften nicht für von Nutzern veröffentlichte Inhalte, indirekte Schäden oder Folgeschäden oder Datenverluste, die außerhalb unserer angemessenen Kontrolle liegen."
      },
      {
        "kind": "heading",
        "text": "Falls die Biography Library schließen muss: mindestens 6 Monate Vorankündigung, Datenexport in den gängigsten verfügbaren Formaten, öffentlicher Quellcode (AGPL v3) für die Community verfügbar."
      },
      {
        "kind": "paragraph",
        "text": "15. Künstliche Intelligenz"
      },
      {
        "kind": "heading",
        "text": "Optionale KI-Funktionen, verarbeitet in der Schweiz über die KI-Systeme von Infomaniak basierend auf Open-Source-Modellen. Es werden keine Daten an Drittanbieter gesendet."
      },
      {
        "kind": "heading",
        "text": "Ihre Biografien werden niemals zum Trainieren von KI-Modellen verwendet. Jeder Vorschlag trägt das Kennzeichen “KI-Vorschlag” und erfordert Ihre ausdrückliche Zustimmung. Sie können die KI jederzeit deaktivieren."
      },
      {
        "kind": "heading",
        "text": "KI-Systeme unter einer OSI-Open-Source-Lizenz können auf das öffentliche Archiv als verifizierte Referenzquelle zugreifen, wobei eine Namensnennung obligatorisch ist. Private, halbprivate und Familienbiografien sind für externe Systeme unzugänglich."
      },
      {
        "kind": "paragraph",
        "text": "16. Änderungen dieser Bedingungen"
      },
      {
        "kind": "heading",
        "text": "E-Mail-Benachrichtigung mindestens 30 Tage, bevor die neue Version in Kraft tritt. Ausdrückliche Zustimmung bei wesentlichen Änderungen erforderlich."
      },
      {
        "kind": "heading",
        "text": "Rückwirkungsverbot: Wir werden diese Bedingungen niemals ändern, um den Nutzern bereits gewährte Schutzrechte zu verringern."
      },
      {
        "kind": "heading",
        "text": "Versionsverlauf: v1.0 — März 2026 — Erste Version"
      },
      {
        "kind": "paragraph",
        "text": "17. Open Source und W3C-Zertifizierung"
      },
      {
        "kind": "paragraph",
        "text": "Vollständig Open Source unter AGPL v3.0: github.com/BiographyLibrary/Biography-Library"
      },
      {
        "kind": "heading",
        "text": "Nur die Biography Library Association darf offizielle W3C Verifiable Credentials-Zertifizierungen für den universellen Katalog ausstellen."
      },
      {
        "kind": "paragraph",
        "text": "18. Geltendes Recht und Gerichtsstand"
      },
      {
        "kind": "heading",
        "text": "Es gilt Schweizer Recht: Zivilgesetzbuch (ZGB), Obligationenrecht (OR), nDSG, Strafgesetzbuch (StGB). Gerichtsstand: Gerichte von Lugano, Tessin, Schweiz. EU-Nutzer behalten das Recht, Verfahren vor den Gerichten ihres Wohnsitzlandes einzuleiten."
      },
      {
        "kind": "heading",
        "text": "Bevor Sie rechtliche Schritte einleiten, kontaktieren Sie uns bitte unter support@biographylibrary.org."
      },
      {
        "kind": "paragraph",
        "text": "19. Kontakt"
      },
      {
        "kind": "heading",
        "text": "Biography Library Association — Lugano, Tessin, Schweiz"
      },
      {
        "kind": "item",
        "text": "E-Mail: support@biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "Antwortzeit: so schnell wie möglich und in jedem Fall innerhalb von 30 Tagen"
      },
      {
        "kind": "item",
        "text": "Website: biographylibrary.org"
      },
      {
        "kind": "heading",
        "text": "Version: 1.0 | März 2026 | Die englische Version ist die rechtlich bindende Version."
      },
      {
        "kind": "paragraph",
        "text": "Biography Library ist ein gemeinnütziges Open-Source-Archiv der menschlichen Erinnerung."
      },
      {
        "kind": "paragraph",
        "text": "Navigation"
      },
      {
        "kind": "paragraph",
        "text": "Rechtliches"
      },
      {
        "kind": "paragraph",
        "text": "© 2026 Biography Library — Schweizer gemeinnütziger Verein · Software: AGPL v3.0 · Öffentliche Inhalte: CC BY-NC-SA 4.0"
      }
    ]
  },
  "cookies": {
    "it": [
      {
        "kind": "title",
        "text": "Informativa sui Cookie"
      },
      {
        "kind": "version",
        "text": "Versione 1.0 – Marzo 2026"
      },
      {
        "kind": "heading",
        "text": "1. Cosa sono i Cookie"
      },
      {
        "kind": "paragraph",
        "text": "I cookie sono piccoli file di testo che un sito web salva sul tuo dispositivo quando lo visiti. Vengono utilizzati per far funzionare correttamente il sito, ricordare le tue preferenze e raccogliere informazioni su come viene utilizzato il sito."
      },
      {
        "kind": "paragraph",
        "text": "Questa Informativa sui Cookie si applica al sito web istituzionale biographylibrary.org, realizzato su WordPress e ospitato sull'infrastruttura Infomaniak in Svizzera."
      },
      {
        "kind": "paragraph",
        "text": "⚠️ La piattaforma Biography Library (l'archivio biografico vero e proprio) non è ancora online. Quando sarà disponibile, questa Informativa sui Cookie verrà aggiornata con una sezione dedicata che descriverà i cookie e i meccanismi tecnici specifici della piattaforma."
      },
      {
        "kind": "heading",
        "text": "2. Hosting e Statistiche di Accesso"
      },
      {
        "kind": "paragraph",
        "text": "Il sito web biographylibrary.org è ospitato da Infomaniak SA (Svizzera). Infomaniak raccoglie statistiche di accesso al server tramite log di sistema — non tramite cookie o script di tracciamento di terze parti. Questi log registrano dati tecnici come indirizzo IP anonimizzato, pagine visitate, orario di accesso e tipo di browser, esclusivamente per scopi di sicurezza e analisi aggregata del traffico."
      },
      {
        "kind": "paragraph",
        "text": "Questi dati rimangono sull'infrastruttura svizzera e non vengono condivisi con terze parti."
      },
      {
        "kind": "heading",
        "text": "3. Cookie Presenti sul Sito Web"
      },
      {
        "kind": "paragraph",
        "text": "Il sito web biographylibrary.org utilizza esclusivamente cookie tecnici necessari. Non utilizziamo cookie di profilazione, cookie pubblicitari o alcun tipo di tracciatore di terze parti."
      },
      {
        "kind": "heading",
        "text": "3.1 Cookie Tecnici di WordPress"
      },
      {
        "kind": "paragraph",
        "text": "WordPress potrebbe impostare alcuni cookie tecnici sul tuo dispositivo. Per i visitatori non registrati, normalmente non viene impostato alcun cookie. I seguenti cookie riguardano esclusivamente gli amministratori del sito:"
      },
      {
        "kind": "heading",
        "text": "Cookie"
      },
      {
        "kind": "paragraph",
        "text": "Durata"
      },
      {
        "kind": "paragraph",
        "text": "Finalità"
      },
      {
        "kind": "paragraph",
        "text": "wordpress_[hash]"
      },
      {
        "kind": "paragraph",
        "text": "Sessione"
      },
      {
        "kind": "paragraph",
        "text": "Autenticazione dell'amministratore"
      },
      {
        "kind": "paragraph",
        "text": "wordpress_logged_in_[hash]"
      },
      {
        "kind": "paragraph",
        "text": "Sessione"
      },
      {
        "kind": "paragraph",
        "text": "Verifica dello stato di accesso"
      },
      {
        "kind": "paragraph",
        "text": "wp-settings-[userid]"
      },
      {
        "kind": "paragraph",
        "text": "1 anno"
      },
      {
        "kind": "paragraph",
        "text": "Preferenze dell'interfaccia di amministrazione"
      },
      {
        "kind": "paragraph",
        "text": "Questi cookie non vengono mai impostati per i normali visitatori del sito web pubblico."
      },
      {
        "kind": "heading",
        "text": "3.2 Cookie di preferenza della lingua — TranslatePress"
      },
      {
        "kind": "paragraph",
        "text": "Il sito web utilizza TranslatePress per offrire contenuti in più lingue (inglese, italiano, francese, tedesco). Per ricordare la lingua scelta, TranslatePress imposta un cookie tecnico:"
      },
      {
        "kind": "heading",
        "text": "Cookie"
      },
      {
        "kind": "paragraph",
        "text": "Durata"
      },
      {
        "kind": "paragraph",
        "text": "Finalità"
      },
      {
        "kind": "paragraph",
        "text": "trp_language"
      },
      {
        "kind": "paragraph",
        "text": "1 anno"
      },
      {
        "kind": "paragraph",
        "text": "Memorizza la preferenza linguistica scelta dal visitatore"
      },
      {
        "kind": "paragraph",
        "text": "Questo cookie è strettamente necessario per il corretto funzionamento del sito web multilingue. Non contiene dati di identificazione personale."
      },
      {
        "kind": "heading",
        "text": "3.3 SEO — Rank Math"
      },
      {
        "kind": "paragraph",
        "text": "Il sito web utilizza Rank Math SEO PRO per la gestione dell'ottimizzazione per i motori di ricerca. Rank Math opera principalmente lato server e tramite i metadati delle pagine. Non imposta cookie di tracciamento o di profilazione sui visitatori."
      },
      {
        "kind": "heading",
        "text": "4. Cosa NON utilizziamo"
      },
      {
        "kind": "paragraph",
        "text": "Per esplicita chiarezza:"
      },
      {
        "kind": "item",
        "text": "❌ Nessun Google Analytics o altri strumenti di analisi di terze parti"
      },
      {
        "kind": "item",
        "text": "❌ Nessun pixel di tracciamento dei social media di alcun tipo"
      },
      {
        "kind": "item",
        "text": "❌ Nessun cookie pubblicitario o di remarketing"
      },
      {
        "kind": "item",
        "text": "❌ Nessun sistema di profilazione comportamentale"
      },
      {
        "kind": "item",
        "text": "❌ Nessun tracciamento cross-site"
      },
      {
        "kind": "item",
        "text": "❌ Nessun dato inviato a server al di fuori della Svizzera"
      },
      {
        "kind": "paragraph",
        "text": "Qualora in futuro dovessimo introdurre strumenti di analisi del traffico, utilizzeremo esclusivamente soluzioni self-hosted in Svizzera, previa comunicazione agli utenti e aggiornamento di questa informativa."
      },
      {
        "kind": "heading",
        "text": "5. Base giuridica"
      },
      {
        "kind": "paragraph",
        "text": "I cookie tecnici elencati in questa informativa non richiedono il consenso, in quanto sono strettamente necessari per il funzionamento del sito web e per fornire il servizio richiesto dall'utente, ai sensi della legge svizzera nFADP e del GDPR per gli utenti europei."
      },
      {
        "kind": "paragraph",
        "text": "Poiché non sono presenti cookie di profilazione o di marketing, non viene mostrato alcun banner di consenso ai cookie ai normali visitatori del sito web pubblico."
      },
      {
        "kind": "heading",
        "text": "6. Come gestire i cookie"
      },
      {
        "kind": "paragraph",
        "text": "È possibile controllare ed eliminare i cookie tramite le impostazioni del browser:"
      },
      {
        "kind": "item",
        "text": "Chrome: Impostazioni → Privacy e sicurezza → Cookie"
      },
      {
        "kind": "item",
        "text": "Firefox: Impostazioni → Privacy e sicurezza → Cookie e dati dei siti web"
      },
      {
        "kind": "item",
        "text": "Safari: Preferenze → Privacy → Gestisci dati siti web"
      },
      {
        "kind": "item",
        "text": "Edge: Impostazioni → Cookie e autorizzazioni sito"
      },
      {
        "kind": "paragraph",
        "text": "Nota: disabilitando il cookie delle preferenze di lingua, la scelta della lingua andrà persa a ogni visita."
      },
      {
        "kind": "heading",
        "text": "7. Aggiornamenti futuri — Piattaforma Biography Library"
      },
      {
        "kind": "paragraph",
        "text": "Quando la piattaforma Biography Library andrà online, questa informativa verrà aggiornata per includere:"
      },
      {
        "kind": "item",
        "text": "Cookie tecnici di sessione per la piattaforma autenticata"
      },
      {
        "kind": "item",
        "text": "Cookie di sicurezza (protezione CSRF, ecc.)"
      },
      {
        "kind": "item",
        "text": "Cookie di preferenza dell'utente"
      },
      {
        "kind": "item",
        "text": "Eventuali ulteriori dettagli tecnici relativi all'archivio biografico"
      },
      {
        "kind": "paragraph",
        "text": "La piattaforma non utilizzerà cookie di profilazione o di tracciamento di terze parti, in linea con i Principi Non Negoziabili del Manifesto della Biography Library e con gli impegni dichiarati nell'Informativa sulla Privacy."
      },
      {
        "kind": "heading",
        "text": "8. Contatti"
      },
      {
        "kind": "paragraph",
        "text": "Per qualsiasi domanda riguardante la presente Cookie Policy:"
      },
      {
        "kind": "item",
        "text": "Email: support@biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "Oggetto consigliato: Cookie Policy – [il tuo oggetto]"
      },
      {
        "kind": "item",
        "text": "Sito web: biographylibrary.org"
      },
      {
        "kind": "paragraph",
        "text": "Associazione Biography Library — Lugano, Ticino, Svizzera"
      },
      {
        "kind": "heading",
        "text": "9. Legge applicabile"
      },
      {
        "kind": "paragraph",
        "text": "La presente Cookie Policy è regolata dalla legge svizzera (nLPD) e, per gli utenti residenti nell'Unione Europea, dal GDPR. Foro competente: Tribunali di Lugano, Ticino, Svizzera."
      },
      {
        "kind": "paragraph",
        "text": "Versione: 1.0 | Marzo 2026 | Licenza del documento: CC BY-SA 4.0 La versione inglese è quella legalmente vincolante."
      },
      {
        "kind": "paragraph",
        "text": "Biography Library è un archivio non-profit e open-source della memoria umana."
      },
      {
        "kind": "paragraph",
        "text": "Navigazione"
      },
      {
        "kind": "paragraph",
        "text": "Note legali"
      },
      {
        "kind": "paragraph",
        "text": "© 2026 Biography Library — Associazione svizzera senza scopo di lucro · Software: AGPL v3.0 · Contenuti pubblici: CC BY-NC-SA 4.0"
      }
    ],
    "en": [
      {
        "kind": "title",
        "text": "Cookie Policy"
      },
      {
        "kind": "version",
        "text": "Version 1.0 – March 2026"
      },
      {
        "kind": "heading",
        "text": "1. What Are Cookies"
      },
      {
        "kind": "paragraph",
        "text": "Cookies are small text files that a website saves on your device when you visit it. They are used to make the site function correctly, remember your preferences and collect information about how the site is used."
      },
      {
        "kind": "paragraph",
        "text": "This Cookie Policy applies to the institutional website biographylibrary.org, built on WordPress and hosted on Infomaniak infrastructure in Switzerland."
      },
      {
        "kind": "paragraph",
        "text": "⚠️ The Biography Library platform (the biographical archive itself) is not yet online. When it becomes available, this Cookie Policy will be updated with a dedicated section describing the platform-specific cookies and technical mechanisms."
      },
      {
        "kind": "heading",
        "text": "2. Hosting and Access Statistics"
      },
      {
        "kind": "paragraph",
        "text": "The website biographylibrary.org is hosted by Infomaniak SA (Switzerland). Infomaniak collects server access statistics through system logs — not through third-party tracking cookies or scripts. These logs record technical data such as anonymised IP address, pages visited, access time and browser type, exclusively for security purposes and aggregated traffic analysis."
      },
      {
        "kind": "paragraph",
        "text": "This data remains on Swiss infrastructure and is not shared with third parties."
      },
      {
        "kind": "heading",
        "text": "3. Cookies Present on the Website"
      },
      {
        "kind": "paragraph",
        "text": "The website biographylibrary.org uses exclusively necessary technical cookies. We do not use profiling cookies, advertising cookies or any third-party trackers of any kind."
      },
      {
        "kind": "heading",
        "text": "3.1 WordPress Technical Cookies"
      },
      {
        "kind": "paragraph",
        "text": "WordPress may set some technical cookies on your device. For non-registered visitors, no cookies are normally set. The following cookies concern site administrators only:"
      },
      {
        "kind": "heading",
        "text": "Cookie"
      },
      {
        "kind": "paragraph",
        "text": "Duration"
      },
      {
        "kind": "paragraph",
        "text": "Purpose"
      },
      {
        "kind": "paragraph",
        "text": "wordpress_[hash]"
      },
      {
        "kind": "paragraph",
        "text": "Session"
      },
      {
        "kind": "paragraph",
        "text": "Administrator authentication"
      },
      {
        "kind": "paragraph",
        "text": "wordpress_logged_in_[hash]"
      },
      {
        "kind": "paragraph",
        "text": "Session"
      },
      {
        "kind": "paragraph",
        "text": "Login status verification"
      },
      {
        "kind": "paragraph",
        "text": "wp-settings-[userid]"
      },
      {
        "kind": "paragraph",
        "text": "1 year"
      },
      {
        "kind": "paragraph",
        "text": "Administration interface preferences"
      },
      {
        "kind": "paragraph",
        "text": "These cookies are never set for ordinary visitors to the public website."
      },
      {
        "kind": "heading",
        "text": "3.2 Language Preference Cookie — TranslatePress"
      },
      {
        "kind": "paragraph",
        "text": "The website uses TranslatePress to offer content in multiple languages (English, Italian, French, German). To remember your chosen language, TranslatePress sets one technical cookie:"
      },
      {
        "kind": "heading",
        "text": "Cookie"
      },
      {
        "kind": "paragraph",
        "text": "Duration"
      },
      {
        "kind": "paragraph",
        "text": "Purpose"
      },
      {
        "kind": "paragraph",
        "text": "trp_language"
      },
      {
        "kind": "paragraph",
        "text": "1 year"
      },
      {
        "kind": "paragraph",
        "text": "Stores the visitor’s chosen language preference"
      },
      {
        "kind": "paragraph",
        "text": "This cookie is strictly necessary for the correct functioning of the multilingual website. It contains no personally identifiable data."
      },
      {
        "kind": "heading",
        "text": "3.3 SEO — Rank Math"
      },
      {
        "kind": "paragraph",
        "text": "The website uses Rank Math SEO PRO for search engine optimisation management. Rank Math operates primarily server-side and through page metadata. It does not set tracking or profiling cookies on visitors."
      },
      {
        "kind": "heading",
        "text": "4. What We Do NOT Use"
      },
      {
        "kind": "paragraph",
        "text": "For explicit clarity:"
      },
      {
        "kind": "item",
        "text": "❌ No Google Analytics or other third-party analytics"
      },
      {
        "kind": "item",
        "text": "❌ No social media tracking pixels of any kind"
      },
      {
        "kind": "item",
        "text": "❌ No advertising or remarketing cookies"
      },
      {
        "kind": "item",
        "text": "❌ No behavioural profiling systems"
      },
      {
        "kind": "item",
        "text": "❌ No cross-site tracking"
      },
      {
        "kind": "item",
        "text": "❌ No data sent to servers outside Switzerland"
      },
      {
        "kind": "paragraph",
        "text": "Should we introduce traffic analytics tools in the future, we will use exclusively self-hosted solutions in Switzerland, with prior notice to users and an update to this policy."
      },
      {
        "kind": "heading",
        "text": "5. Legal Basis"
      },
      {
        "kind": "paragraph",
        "text": "The technical cookies listed in this policy do not require consent, as they are strictly necessary for the website to function and to provide the service requested by the user, pursuant to Swiss nFADP law and the GDPR for European users."
      },
      {
        "kind": "paragraph",
        "text": "As no profiling or marketing cookies are present, no cookie consent banner is shown to ordinary visitors of the public website."
      },
      {
        "kind": "heading",
        "text": "6. How to Manage Cookies"
      },
      {
        "kind": "paragraph",
        "text": "You can control and delete cookies through your browser settings:"
      },
      {
        "kind": "item",
        "text": "Chrome: Settings → Privacy and security → Cookies"
      },
      {
        "kind": "item",
        "text": "Firefox: Settings → Privacy & Security → Cookies and Site Data"
      },
      {
        "kind": "item",
        "text": "Safari: Preferences → Privacy → Manage Website Data"
      },
      {
        "kind": "item",
        "text": "Edge: Settings → Cookies and site permissions"
      },
      {
        "kind": "paragraph",
        "text": "Note: disabling the language preference cookie will result in your language choice being lost on each visit."
      },
      {
        "kind": "heading",
        "text": "7. Future Updates — Biography Library Platform"
      },
      {
        "kind": "paragraph",
        "text": "When the Biography Library platform goes online, this policy will be updated to include:"
      },
      {
        "kind": "item",
        "text": "Technical session cookies for the authenticated platform"
      },
      {
        "kind": "item",
        "text": "Security cookies (CSRF protection, etc.)"
      },
      {
        "kind": "item",
        "text": "User preference cookies"
      },
      {
        "kind": "item",
        "text": "Any further technical details related to the biographical archive"
      },
      {
        "kind": "paragraph",
        "text": "The platform will not use profiling or third-party tracking cookies, in line with the Non-Negotiable Principles of the Biography Library Manifesto and with the commitments stated in the Privacy Policy."
      },
      {
        "kind": "heading",
        "text": "8. Contact"
      },
      {
        "kind": "paragraph",
        "text": "For any questions regarding this Cookie Policy:"
      },
      {
        "kind": "item",
        "text": "Email: support@biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "Recommended subject: Cookie Policy – [your matter]"
      },
      {
        "kind": "item",
        "text": "Website: biographylibrary.org"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library Association — Lugano, Ticino, Switzerland"
      },
      {
        "kind": "heading",
        "text": "9. Governing Law"
      },
      {
        "kind": "paragraph",
        "text": "This Cookie Policy is governed by Swiss law (nFADP) and, for users resident in the European Union, by the GDPR. Jurisdiction: Courts of Lugano, Ticino, Switzerland."
      },
      {
        "kind": "paragraph",
        "text": "Version: 1.0 | March 2026 | Document licence: CC BY-SA 4.0 The English version is the legally binding version."
      },
      {
        "kind": "paragraph",
        "text": "Biography Library is a non-profit, open-source archive of human memory."
      },
      {
        "kind": "paragraph",
        "text": "Navigation"
      },
      {
        "kind": "paragraph",
        "text": "Legal"
      },
      {
        "kind": "paragraph",
        "text": "© 2026 Biography Library — Swiss non-profit association · Software: AGPL v3.0 · Public content: CC BY-NC-SA 4.0"
      }
    ],
    "fr": [
      {
        "kind": "title",
        "text": "Politique en matière de cookies"
      },
      {
        "kind": "version",
        "text": "Version 1.0 – Mars 2026"
      },
      {
        "kind": "heading",
        "text": "1. Que sont les cookies"
      },
      {
        "kind": "paragraph",
        "text": "Les cookies sont de petits fichiers texte qu'un site web enregistre sur votre appareil lorsque vous le visitez. Ils sont utilisés pour faire fonctionner le site correctement, mémoriser vos préférences et collecter des informations sur la façon dont le site est utilisé."
      },
      {
        "kind": "paragraph",
        "text": "Cette politique en matière de cookies s'applique au site institutionnel biographylibrary.org, créé sur WordPress et hébergé sur l'infrastructure d'Infomaniak en Suisse."
      },
      {
        "kind": "paragraph",
        "text": "⚠️ La plateforme Biography Library (les archives biographiques elles-mêmes) n'est pas encore en ligne. Lorsqu'elle sera disponible, cette politique en matière de cookies sera mise à jour avec une section dédiée décrivant les cookies et les mécanismes techniques spécifiques à la plateforme."
      },
      {
        "kind": "heading",
        "text": "2. Hébergement et statistiques d'accès"
      },
      {
        "kind": "paragraph",
        "text": "Le site web biographylibrary.org est hébergé par Infomaniak SA (Suisse). Infomaniak collecte des statistiques d'accès au serveur via des journaux système — et non via des cookies ou des scripts de suivi tiers. Ces journaux enregistrent des données techniques telles que l'adresse IP anonymisée, les pages visitées, l'heure d'accès et le type de navigateur, exclusivement à des fins de sécurité et d'analyse globale du trafic."
      },
      {
        "kind": "paragraph",
        "text": "Ces données restent sur l'infrastructure suisse et ne sont pas partagées avec des tiers."
      },
      {
        "kind": "heading",
        "text": "3. Cookies présents sur le site web"
      },
      {
        "kind": "paragraph",
        "text": "Le site web biographylibrary.org utilise exclusivement des cookies techniques nécessaires. Nous n'utilisons pas de cookies de profilage, de cookies publicitaires ou de traceurs tiers de quelque nature que ce soit."
      },
      {
        "kind": "heading",
        "text": "3.1 Cookies techniques de WordPress"
      },
      {
        "kind": "paragraph",
        "text": "WordPress peut installer certains cookies techniques sur votre appareil. Pour les visiteurs non enregistrés, aucun cookie n'est normalement installé. Les cookies suivants concernent uniquement les administrateurs du site :"
      },
      {
        "kind": "heading",
        "text": "Cookie"
      },
      {
        "kind": "paragraph",
        "text": "Durée"
      },
      {
        "kind": "paragraph",
        "text": "Finalité"
      },
      {
        "kind": "paragraph",
        "text": "wordpress_[hash]"
      },
      {
        "kind": "paragraph",
        "text": "Session"
      },
      {
        "kind": "paragraph",
        "text": "Authentification de l'administrateur"
      },
      {
        "kind": "paragraph",
        "text": "wordpress_logged_in_[hash]"
      },
      {
        "kind": "paragraph",
        "text": "Session"
      },
      {
        "kind": "paragraph",
        "text": "Vérification du statut de connexion"
      },
      {
        "kind": "paragraph",
        "text": "wp-settings-[userid]"
      },
      {
        "kind": "paragraph",
        "text": "1 an"
      },
      {
        "kind": "paragraph",
        "text": "Préférences de l'interface d'administration"
      },
      {
        "kind": "paragraph",
        "text": "Ces cookies ne sont jamais définis pour les visiteurs ordinaires du site web public."
      },
      {
        "kind": "heading",
        "text": "3.2 Cookie de préférence de langue — TranslatePress"
      },
      {
        "kind": "paragraph",
        "text": "Le site web utilise TranslatePress pour proposer du contenu en plusieurs langues (anglais, italien, français, allemand). Pour mémoriser la langue que vous avez choisie, TranslatePress définit un cookie technique :"
      },
      {
        "kind": "heading",
        "text": "Cookie"
      },
      {
        "kind": "paragraph",
        "text": "Durée"
      },
      {
        "kind": "paragraph",
        "text": "Finalité"
      },
      {
        "kind": "paragraph",
        "text": "trp_language"
      },
      {
        "kind": "paragraph",
        "text": "1 an"
      },
      {
        "kind": "paragraph",
        "text": "Stocke la préférence de langue choisie par le visiteur"
      },
      {
        "kind": "paragraph",
        "text": "Ce cookie est strictement nécessaire au bon fonctionnement du site web multilingue. Il ne contient aucune donnée personnellement identifiable."
      },
      {
        "kind": "heading",
        "text": "3.3 SEO — Rank Math"
      },
      {
        "kind": "paragraph",
        "text": "Le site web utilise Rank Math SEO PRO pour la gestion de l'optimisation pour les moteurs de recherche. Rank Math fonctionne principalement côté serveur et via les métadonnées des pages. Il ne définit aucun cookie de suivi ou de profilage sur les visiteurs."
      },
      {
        "kind": "heading",
        "text": "4. Ce que nous n'utilisons PAS"
      },
      {
        "kind": "paragraph",
        "text": "Pour plus de clarté :"
      },
      {
        "kind": "item",
        "text": "❌ Pas de Google Analytics ou d'autres outils d'analyse tiers"
      },
      {
        "kind": "item",
        "text": "❌ Pas de pixels de suivi de réseaux sociaux d'aucune sorte"
      },
      {
        "kind": "item",
        "text": "❌ Pas de cookies publicitaires ou de remarketing"
      },
      {
        "kind": "item",
        "text": "❌ Pas de systèmes de profilage comportemental"
      },
      {
        "kind": "item",
        "text": "❌ Pas de suivi intersites"
      },
      {
        "kind": "item",
        "text": "❌ Aucune donnée envoyée à des serveurs en dehors de la Suisse"
      },
      {
        "kind": "paragraph",
        "text": "Si nous devions introduire des outils d'analyse de trafic à l'avenir, nous utiliserions exclusivement des solutions auto-hébergées en Suisse, avec un préavis aux utilisateurs et une mise à jour de cette politique."
      },
      {
        "kind": "heading",
        "text": "5. Base légale"
      },
      {
        "kind": "paragraph",
        "text": "Les cookies techniques listés dans cette politique ne nécessitent pas de consentement, car ils sont strictement nécessaires au fonctionnement du site web et à la fourniture du service demandé par l'utilisateur, conformément à la nLPD suisse et au RGPD pour les utilisateurs européens."
      },
      {
        "kind": "paragraph",
        "text": "Comme aucun cookie de profilage ou de marketing n'est présent, aucune bannière de consentement aux cookies n'est affichée aux visiteurs ordinaires du site web public."
      },
      {
        "kind": "heading",
        "text": "6. Comment gérer les cookies"
      },
      {
        "kind": "paragraph",
        "text": "Vous pouvez contrôler et supprimer les cookies via les paramètres de votre navigateur :"
      },
      {
        "kind": "item",
        "text": "Chrome: Paramètres → Confidentialité et sécurité → Cookies"
      },
      {
        "kind": "item",
        "text": "Firefox: Paramètres → Vie privée et sécurité → Cookies et données de sites"
      },
      {
        "kind": "item",
        "text": "Safari: Préférences → Confidentialité → Gérer les données de sites web"
      },
      {
        "kind": "item",
        "text": "Edge: Paramètres → Cookies et autorisations de site"
      },
      {
        "kind": "paragraph",
        "text": "Remarque : la désactivation du cookie de préférence de langue entraînera la perte de votre choix de langue à chaque visite."
      },
      {
        "kind": "heading",
        "text": "7. Mises à jour futures — Plateforme Biography Library"
      },
      {
        "kind": "paragraph",
        "text": "Lorsque la plateforme Biography Library sera mise en ligne, cette politique sera mise à jour pour inclure :"
      },
      {
        "kind": "item",
        "text": "Cookies de session techniques pour la plateforme authentifiée"
      },
      {
        "kind": "item",
        "text": "Cookies de sécurité (protection CSRF, etc.)"
      },
      {
        "kind": "item",
        "text": "Cookies de préférences utilisateur"
      },
      {
        "kind": "item",
        "text": "Tout autre détail technique lié à l'archive biographique"
      },
      {
        "kind": "paragraph",
        "text": "La plateforme n'utilisera pas de cookies de profilage ou de suivi tiers, conformément aux Principes non négociables du Manifeste de la Biography Library et aux engagements énoncés dans la Politique de confidentialité."
      },
      {
        "kind": "heading",
        "text": "8. Contact"
      },
      {
        "kind": "paragraph",
        "text": "Pour toute question concernant cette Politique relative aux cookies :"
      },
      {
        "kind": "item",
        "text": "E-mail: support@biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "Objet recommandé: Politique relative aux cookies – [votre objet]"
      },
      {
        "kind": "item",
        "text": "Site web: biographylibrary.org"
      },
      {
        "kind": "paragraph",
        "text": "Association Biography Library — Lugano, Tessin, Suisse"
      },
      {
        "kind": "heading",
        "text": "9. Droit applicable"
      },
      {
        "kind": "paragraph",
        "text": "Cette Politique relative aux cookies est régie par le droit suisse (nLPD) et, pour les utilisateurs résidant dans l'Union européenne, par le RGPD. Juridiction : Tribunaux de Lugano, Tessin, Suisse."
      },
      {
        "kind": "paragraph",
        "text": "Version : 1.0 | Mars 2026 | Licence du document : CC BY-SA 4.0 La version anglaise est la version juridiquement contraignante."
      },
      {
        "kind": "paragraph",
        "text": "Biography Library est une archive à but non lucratif et open source de la mémoire humaine."
      },
      {
        "kind": "paragraph",
        "text": "Navigation"
      },
      {
        "kind": "paragraph",
        "text": "Mentions légales"
      },
      {
        "kind": "paragraph",
        "text": "© 2026 Biography Library — Association suisse à but non lucratif · Logiciel : AGPL v3.0 · Contenu public : CC BY-NC-SA 4.0"
      }
    ],
    "de": [
      {
        "kind": "title",
        "text": "Cookie-Richtlinie"
      },
      {
        "kind": "version",
        "text": "Version 1.0 – März 2026"
      },
      {
        "kind": "heading",
        "text": "1. Was sind Cookies"
      },
      {
        "kind": "paragraph",
        "text": "Cookies sind kleine Textdateien, die eine Website auf Ihrem Gerät speichert, wenn Sie diese besuchen. Sie werden verwendet, um die korrekte Funktion der Website zu gewährleisten, sich an Ihre Präferenzen zu erinnern und Informationen darüber zu sammeln, wie die Website genutzt wird."
      },
      {
        "kind": "paragraph",
        "text": "Diese Cookie-Richtlinie gilt für die institutionelle Website biographylibrary.org, die auf WordPress basiert und auf der Infrastruktur von Infomaniak in der Schweiz gehostet wird."
      },
      {
        "kind": "paragraph",
        "text": "⚠️ Die Plattform Biography Library (das biografische Archiv selbst) ist noch nicht online. Sobald sie verfügbar ist, wird diese Cookie-Richtlinie um einen speziellen Abschnitt aktualisiert, der die plattformspezifischen Cookies und technischen Mechanismen beschreibt."
      },
      {
        "kind": "heading",
        "text": "2. Hosting und Zugriffsstatistiken"
      },
      {
        "kind": "paragraph",
        "text": "Die Website biographylibrary.org wird von der Infomaniak SA (Schweiz) gehostet. Infomaniak erfasst Server-Zugriffsstatistiken über Systemprotokolle — nicht über Tracking-Cookies oder Skripte von Drittanbietern. Diese Protokolle erfassen technische Daten wie die anonymisierte IP-Adresse, besuchte Seiten, Zugriffszeit und Browsertyp, ausschließlich zu Sicherheitszwecken und zur aggregierten Traffic-Analyse."
      },
      {
        "kind": "paragraph",
        "text": "Diese Daten verbleiben auf der Schweizer Infrastruktur und werden nicht an Dritte weitergegeben."
      },
      {
        "kind": "heading",
        "text": "3. Auf der Website vorhandene Cookies"
      },
      {
        "kind": "paragraph",
        "text": "Die Website biographylibrary.org verwendet ausschließlich notwendige technische Cookies. Wir verwenden keine Profiling-Cookies, Werbe-Cookies oder Tracker von Drittanbietern jeglicher Art."
      },
      {
        "kind": "heading",
        "text": "3.1 Technische WordPress-Cookies"
      },
      {
        "kind": "paragraph",
        "text": "WordPress kann einige technische Cookies auf Ihrem Gerät setzen. Für nicht registrierte Besucher werden normalerweise keine Cookies gesetzt. Die folgenden Cookies betreffen nur Website-Administratoren:"
      },
      {
        "kind": "heading",
        "text": "Cookie"
      },
      {
        "kind": "paragraph",
        "text": "Dauer"
      },
      {
        "kind": "paragraph",
        "text": "Zweck"
      },
      {
        "kind": "paragraph",
        "text": "wordpress_[hash]"
      },
      {
        "kind": "paragraph",
        "text": "Sitzung"
      },
      {
        "kind": "paragraph",
        "text": "Administrator-Authentifizierung"
      },
      {
        "kind": "paragraph",
        "text": "wordpress_logged_in_[hash]"
      },
      {
        "kind": "paragraph",
        "text": "Sitzung"
      },
      {
        "kind": "paragraph",
        "text": "Überprüfung des Anmeldestatus"
      },
      {
        "kind": "paragraph",
        "text": "wp-settings-[userid]"
      },
      {
        "kind": "paragraph",
        "text": "1 Jahr"
      },
      {
        "kind": "paragraph",
        "text": "Einstellungen der Administrationsoberfläche"
      },
      {
        "kind": "paragraph",
        "text": "Diese Cookies werden niemals für normale Besucher der öffentlichen Website gesetzt."
      },
      {
        "kind": "heading",
        "text": "3.2 Sprachpräferenz-Cookie — TranslatePress"
      },
      {
        "kind": "paragraph",
        "text": "Die Website verwendet TranslatePress, um Inhalte in mehreren Sprachen (Englisch, Italienisch, Französisch, Deutsch) anzubieten. Um sich Ihre gewählte Sprache zu merken, setzt TranslatePress ein technisches Cookie:"
      },
      {
        "kind": "heading",
        "text": "Cookie"
      },
      {
        "kind": "paragraph",
        "text": "Dauer"
      },
      {
        "kind": "paragraph",
        "text": "Zweck"
      },
      {
        "kind": "paragraph",
        "text": "trp_language"
      },
      {
        "kind": "paragraph",
        "text": "1 Jahr"
      },
      {
        "kind": "paragraph",
        "text": "Speichert die vom Besucher gewählte Sprachpräferenz"
      },
      {
        "kind": "paragraph",
        "text": "Dieses Cookie ist für das korrekte Funktionieren der mehrsprachigen Website unbedingt erforderlich. Es enthält keine personenbezogenen Daten."
      },
      {
        "kind": "heading",
        "text": "3.3 SEO — Rank Math"
      },
      {
        "kind": "paragraph",
        "text": "Die Website verwendet Rank Math SEO PRO für die Verwaltung der Suchmaschinenoptimierung. Rank Math arbeitet hauptsächlich serverseitig und über Seiten-Metadaten. Es setzt keine Tracking- oder Profiling-Cookies bei Besuchern."
      },
      {
        "kind": "heading",
        "text": "4. Was wir NICHT verwenden"
      },
      {
        "kind": "paragraph",
        "text": "Zur ausdrücklichen Klarstellung:"
      },
      {
        "kind": "item",
        "text": "❌ Kein Google Analytics oder andere Analysen von Drittanbietern"
      },
      {
        "kind": "item",
        "text": "❌ Keine Social-Media-Tracking-Pixel jeglicher Art"
      },
      {
        "kind": "item",
        "text": "❌ Keine Werbe- oder Remarketing-Cookies"
      },
      {
        "kind": "item",
        "text": "❌ Keine Systeme zur Erstellung von Verhaltensprofilen"
      },
      {
        "kind": "item",
        "text": "❌ Kein seitenübergreifendes Tracking"
      },
      {
        "kind": "item",
        "text": "❌ Keine Datenübermittlung an Server außerhalb der Schweiz"
      },
      {
        "kind": "paragraph",
        "text": "Sollten wir in Zukunft Tools zur Traffic-Analyse einführen, werden wir ausschließlich selbst gehostete Lösungen in der Schweiz verwenden, mit vorheriger Benachrichtigung der Nutzer und einer Aktualisierung dieser Richtlinie."
      },
      {
        "kind": "heading",
        "text": "5. Rechtsgrundlage"
      },
      {
        "kind": "paragraph",
        "text": "Die in dieser Richtlinie aufgeführten technischen Cookies erfordern keine Zustimmung, da sie für das Funktionieren der Website und die Bereitstellung des vom Nutzer angeforderten Dienstes gemäß dem Schweizer revDSG und der DSGVO für europäische Nutzer zwingend erforderlich sind."
      },
      {
        "kind": "paragraph",
        "text": "Da keine Profiling- oder Marketing-Cookies vorhanden sind, wird normalen Besuchern der öffentlichen Website kein Cookie-Zustimmungsbanner angezeigt."
      },
      {
        "kind": "heading",
        "text": "6. Verwaltung von Cookies"
      },
      {
        "kind": "paragraph",
        "text": "Sie können Cookies über Ihre Browsereinstellungen kontrollieren und löschen:"
      },
      {
        "kind": "item",
        "text": "Chrome: Einstellungen → Datenschutz und Sicherheit → Cookies"
      },
      {
        "kind": "item",
        "text": "Firefox: Einstellungen → Datenschutz & Sicherheit → Cookies und Website-Daten"
      },
      {
        "kind": "item",
        "text": "Safari: Einstellungen → Datenschutz → Webseitendaten verwalten"
      },
      {
        "kind": "item",
        "text": "Edge: Einstellungen → Cookies und Websiteberechtigungen"
      },
      {
        "kind": "paragraph",
        "text": "Hinweis: Das Deaktivieren des Sprachpräferenz-Cookies führt dazu, dass Ihre Sprachauswahl bei jedem Besuch verloren geht."
      },
      {
        "kind": "heading",
        "text": "7. Zukünftige Aktualisierungen — Biography Library Plattform"
      },
      {
        "kind": "paragraph",
        "text": "Wenn die Biography Library Plattform online geht, wird diese Richtlinie aktualisiert, um Folgendes aufzunehmen:"
      },
      {
        "kind": "item",
        "text": "Technische Sitzungs-Cookies für die authentifizierte Plattform"
      },
      {
        "kind": "item",
        "text": "Sicherheits-Cookies (CSRF-Schutz usw.)"
      },
      {
        "kind": "item",
        "text": "Cookies für Benutzereinstellungen"
      },
      {
        "kind": "item",
        "text": "Alle weiteren technischen Details im Zusammenhang mit dem biografischen Archiv"
      },
      {
        "kind": "paragraph",
        "text": "Die Plattform wird keine Profiling- oder Drittanbieter-Tracking-Cookies verwenden, im Einklang mit den nicht verhandelbaren Prinzipien des Manifests der Biography Library und den in der Datenschutzrichtlinie dargelegten Verpflichtungen."
      },
      {
        "kind": "heading",
        "text": "8. Kontakt"
      },
      {
        "kind": "paragraph",
        "text": "Bei Fragen zu dieser Cookie-Richtlinie:"
      },
      {
        "kind": "item",
        "text": "E-Mail: support@biographylibrary.org"
      },
      {
        "kind": "item",
        "text": "Empfohlener Betreff: Cookie-Richtlinie – [Ihr Anliegen]"
      },
      {
        "kind": "item",
        "text": "Website: biographylibrary.org"
      },
      {
        "kind": "paragraph",
        "text": "Biography Library Association — Lugano, Tessin, Schweiz"
      },
      {
        "kind": "heading",
        "text": "9. Anwendbares Recht"
      },
      {
        "kind": "paragraph",
        "text": "Diese Cookie-Richtlinie unterliegt Schweizer Recht (nDSG) und, für in der Europäischen Union ansässige Nutzer, der DSGVO. Gerichtsstand: Gerichte von Lugano, Tessin, Schweiz."
      },
      {
        "kind": "paragraph",
        "text": "Version: 1.0 | März 2026 | Dokumentenlizenz: CC BY-SA 4.0 Die englische Version ist die rechtlich bindende Version."
      },
      {
        "kind": "paragraph",
        "text": "Biography Library ist ein gemeinnütziges Open-Source-Archiv der menschlichen Erinnerung."
      },
      {
        "kind": "paragraph",
        "text": "Navigation"
      },
      {
        "kind": "paragraph",
        "text": "Rechtliches"
      },
      {
        "kind": "paragraph",
        "text": "© 2026 Biography Library — Schweizer gemeinnütziger Verein · Software: AGPL v3.0 · Öffentliche Inhalte: CC BY-NC-SA 4.0"
      }
    ]
  }
};
