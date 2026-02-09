export type Language = 'en' | 'it' | 'fr' | 'de';

export interface TermsTranslations {
  title: string;
  lastUpdated: string;
  introduction: string;
  section1Title: string;
  section1Content: string[];
  section2Title: string;
  section2Intro: string;
  section2Autobiography: string;
  section2AutobiographyDesc: string;
  section2Deceased: string;
  section2DeceasedDesc: string;
  section2Prohibited: string;
  section2ProhibitedList: string[];
  section2ProhibitedConsequence: string;
  section3Title: string;
  section3Intro: string;
  section3Responsibilities: string[];
  section3Disclaimer: string;
  section4Title: string;
  section4Content: string[];
  section5Title: string;
  section5DataCollect: string;
  section5DataCollectList: string[];
  section5DataUse: string;
  section5DataUseList: string[];
  section5Hosting: string;
  section5NoSale: string;
  section5Rights: string;
  section5RightsList: string[];
  section6Title: string;
  section6Control: string;
  section6ControlList: string[];
  section6Change: string;
  section6License: string;
  section6LicenseList: string[];
  section6Ownership: string;
  section6Deletion: string;
  section7Title: string;
  section7Intro: string;
  section7Features: string[];
  section7Provider: string;
  section7Important: string;
  section7ImportantList: string[];
  section8Title: string;
  section8List: string[];
  section8Consequence: string;
  section9Title: string;
  section9Intro: string;
  section9CanReport: string[];
  section9Review: string;
  section10Title: string;
  section10Intro: string;
  section10CannotGuarantee: string;
  section10CannotGuaranteeList: string[];
  section10IfClose: string;
  section10IfCloseList: string[];
  section10MaxLiability: string;
  section10NotLiable: string;
  section10NotLiableList: string[];
  section11Title: string;
  section11Content: string[];
  section12Title: string;
  section12YouCan: string;
  section12Deletes: string;
  section12DeletesList: string[];
  section12WeCan: string;
  section12WeCanList: string[];
  section13Title: string;
  section13Intro: string;
  section13CodeUrl: string;
  section13AnyoneCan: string;
  section13AnyoneCanList: string[];
  section13OnlyWeIssue: string;
  section14Title: string;
  section14Intro: string;
  section14Laws: string[];
  section14Disputes: string;
  section14EU: string;
  section14Mediator: string;
  section15Title: string;
  section15Org: string;
  section15Location: string;
  section15Email: string;
  section15EmailList: string[];
  acceptanceTitle: string;
  acceptanceIntro: string;
  acceptanceList: string[];
  acceptButton: string;
}

export const termsTranslations: Record<Language, TermsTranslations> = {
  en: {
    title: 'Terms of Service - Biography Library',
    lastUpdated: 'Last updated: February 2026',
    introduction: 'By using Biography Library, you agree to these Terms of Service. Please read them carefully.',

    section1Title: '1. WHO CAN USE BIOGRAPHY LIBRARY',
    section1Content: [
      'You must be at least 18 years old to use Biography Library.',
      'By creating an account, you confirm that:',
      'All information you provide (name, email, date of birth) is accurate',
      'You will comply with these Terms and applicable laws',
      'You will respect the rights of others'
    ],

    section2Title: '2. WHAT YOU CAN PUBLISH',
    section2Intro: 'Biography Library allows two types of biographies:',
    section2Autobiography: 'YOUR OWN AUTOBIOGRAPHY',
    section2AutobiographyDesc: 'You can write and publish your own life story. You have complete freedom to tell your story in your own words, within legal limits.',
    section2Deceased: 'BIOGRAPHIES OF DECEASED PERSONS',
    section2DeceasedDesc: 'You can write and publish biographies of people who have passed away. You must be truthful and respect the rights of living persons you mention.',
    section2Prohibited: 'WHAT IS PROHIBITED',
    section2ProhibitedList: [
      'Living persons (other than yourself)',
      'Minors under 18 years old (even if deceased)',
      'Anyone you cannot prove is deceased (if requested)'
    ],
    section2ProhibitedConsequence: 'Violating these rules will result in immediate account termination and may lead to legal action.',

    section3Title: '3. YOUR RESPONSIBILITIES AS AN AUTHOR',
    section3Intro: 'When you publish a biography, you are solely responsible for:',
    section3Responsibilities: [
      'The accuracy and truthfulness of the information',
      'Respecting the privacy rights of living persons you mention',
      'Not including sensitive data about others without consent (health information, sexual orientation, legal proceedings, financial data)',
      'Not publishing defamatory, false, or illegal content',
      'Respecting copyright and intellectual property rights',
      'Complying with Swiss law and your country\'s laws'
    ],
    section3Disclaimer: 'Biography Library is a platform provider. We do not verify the content before publication. You bear full legal responsibility for what you publish.',

    section4Title: '4. BIOGRAPHIES OF DECEASED PERSONS - SPECIAL RULES',
    section4Content: [
      'You declare under your legal responsibility that the person is deceased',
      'The biography enters a 30-day review period before becoming public',
      'During this period, only you can see and edit it',
      'We may request proof of death if the biography is reported',
      'False declarations can be prosecuted under Swiss Criminal Code Art. 179decies (identity fraud)',
      'Even though the deceased has no data protection rights, you must not make false or defamatory statements that could harm their family\'s honor',
      'Multiple people can write biographies of the same deceased person (different perspectives are welcomed)'
    ],

    section5Title: '5. PRIVACY AND DATA PROTECTION',
    section5DataCollect: 'What data we collect:',
    section5DataCollectList: [
      'Email, name, password (encrypted)',
      'Biography content you create',
      'Usage data (login times, IP addresses for security)'
    ],
    section5DataUse: 'How we use your data:',
    section5DataUseList: [
      'To provide the service',
      'To send essential notifications',
      'To ensure security and prevent abuse',
      'To improve the service'
    ],
    section5Hosting: 'Your data is hosted in Switzerland (Infomaniak SA, Geneva) and never leaves Swiss jurisdiction.',
    section5NoSale: 'We NEVER sell your data to third parties.',
    section5Rights: 'You have the right to:',
    section5RightsList: [
      'Access your data',
      'Correct inaccurate information',
      'Delete your account and all your biographies',
      'Export your biographies',
      'Object to certain data processing'
    ],

    section6Title: '6. YOUR BIOGRAPHY RIGHTS - PRIVACY SETTINGS',
    section6Control: 'You control who can see your autobiography:',
    section6ControlList: [
      'Public: visible to anyone on the internet',
      'Friends & Family: visible only to people you invite',
      'Private: visible only to you'
    ],
    section6Change: 'You can change these settings at any time.',
    section6License: 'Public biographies are licensed under Creative Commons BY-NC-SA 4.0:',
    section6LicenseList: [
      'BY: Attribution required',
      'NC: Non-commercial use',
      'SA: Share-alike'
    ],
    section6Ownership: 'You retain full ownership of your content. Biography Library only has a license to host and display it according to your privacy settings.',
    section6Deletion: 'You can delete your biographies at any time. Deletion is permanent and takes effect within 90 days.',

    section7Title: '7. ARTIFICIAL INTELLIGENCE (AI)',
    section7Intro: 'Biography Library offers optional AI-powered features:',
    section7Features: [
      'Writing suggestions',
      'Grammar correction',
      'Translation',
      'Memory prompts'
    ],
    section7Provider: 'AI features are powered by Mistral AI through Infomaniak Euria (Swiss hosting).',
    section7Important: 'Important:',
    section7ImportantList: [
      'Your biographies are NOT used to train AI models',
      'Your data is NOT shared with third parties',
      'AI processing happens temporarily and only in Switzerland',
      'You can disable AI features at any time'
    ],

    section8Title: '8. PROHIBITED CONTENT',
    section8List: [
      'Hate speech or incitement to violence',
      'Pornographic content',
      'Content that infringes copyright',
      'Spam or commercial advertising',
      'Content that violates any law',
      'Malicious code or phishing links'
    ],
    section8Consequence: 'Violation will result in immediate content removal and account termination.',

    section9Title: '9. REPORTING VIOLATIONS',
    section9Intro: 'Every biography has a "Report" button. You can report:',
    section9CanReport: [
      'Biographies of living persons (prohibited)',
      'Biographies containing your sensitive data without consent',
      'False or defamatory content',
      'Copyright violations',
      'Illegal content'
    ],
    section9Review: 'We review reports within 48-72 hours. If the violation is confirmed, we will remove the content and may terminate the author\'s account.',

    section10Title: '10. LIMITATION OF LIABILITY',
    section10Intro: 'Biography Library is provided "as is" without warranties.',
    section10CannotGuarantee: 'We strive to provide reliable service, but we cannot guarantee:',
    section10CannotGuaranteeList: [
      '100% uptime (though we aim for 99%+)',
      'Absolute protection from cyber attacks',
      'Permanent preservation (though that is our goal)'
    ],
    section10IfClose: 'If Biography Library must close, we will:',
    section10IfCloseList: [
      'Give at least 6 months notice',
      'Allow you to export all your data',
      'Make the source code available to the community (it\'s already open source)'
    ],
    section10MaxLiability: 'Maximum liability: 50 CHF per user (as the service is free)',
    section10NotLiable: 'We are not liable for:',
    section10NotLiableList: [
      'Content published by users',
      'Indirect or consequential damages',
      'Data loss beyond our reasonable control'
    ],

    section11Title: '11. MODIFICATIONS TO THESE TERMS',
    section11Content: [
      'We may update these Terms from time to time. We will notify you by email at least 30 days before changes take effect.',
      'If you do not agree with the changes, you can delete your account before the effective date.',
      'Continuing to use Biography Library after changes take effect means you accept the new Terms.'
    ],

    section12Title: '12. ACCOUNT TERMINATION',
    section12YouCan: 'You can delete your account at any time from Settings → Account → Delete Account.',
    section12Deletes: 'This will permanently delete:',
    section12DeletesList: [
      'Your account information',
      'All autobiographies you created',
      'All biographies of deceased persons you authored (unless they have contributions from others - in which case we\'ll ask for confirmation)'
    ],
    section12WeCan: 'We may terminate your account if:',
    section12WeCanList: [
      'You violate these Terms repeatedly',
      'You engage in fraudulent activity',
      'Your account is inactive for 5+ years (after email notification)',
      'Required by law enforcement'
    ],

    section13Title: '13. OPEN SOURCE',
    section13Intro: 'Biography Library software is open source under AGPL v3.0 license.',
    section13CodeUrl: 'The code is available at: github.com/BiographyLibrary/Biography-Library',
    section13AnyoneCan: 'Anyone can:',
    section13AnyoneCanList: [
      'View the code',
      'Propose improvements',
      'Create forks for specific communities',
      'Verify there are no backdoors'
    ],
    section13OnlyWeIssue: 'However, only Biography Library Association (Switzerland) can issue authentic W3C Verifiable Credentials for the universal catalog.',

    section14Title: '14. GOVERNING LAW',
    section14Intro: 'These Terms are governed by Swiss law, specifically:',
    section14Laws: [
      'Swiss Civil Code (CC)',
      'Swiss Code of Obligations (CO)',
      'Swiss Federal Data Protection Act (nLPD)',
      'Swiss Criminal Code (CP)'
    ],
    section14Disputes: 'Disputes will be resolved in the courts of Lugano, Ticino, Switzerland.',
    section14EU: 'EU consumers have the right to use courts in their country of residence (GDPR consumer protection).',
    section14Mediator: 'Before legal action, please contact our internal mediator at: disputes@biographylibrary.org',

    section15Title: '15. CONTACT',
    section15Org: 'Biography Library Association',
    section15Location: 'Lugano, Ticino, Switzerland',
    section15Email: 'Email:',
    section15EmailList: [
      'General support: support@biographylibrary.org',
      'Privacy matters: privacy@biographylibrary.org',
      'Report violations: report@biographylibrary.org',
      'Legal matters: legal@biographylibrary.org'
    ],

    acceptanceTitle: 'ACCEPTANCE',
    acceptanceIntro: 'By clicking "I Accept" or by using Biography Library, you confirm that:',
    acceptanceList: [
      'You have read and understood these Terms',
      'You agree to be bound by them',
      'You are at least 18 years old',
      'You will comply with all applicable laws'
    ],
    acceptButton: 'I Accept'
  },

  it: {
    title: 'Termini di Servizio - Biography Library',
    lastUpdated: 'Ultimo aggiornamento: Febbraio 2026',
    introduction: 'Utilizzando Biography Library, accetti questi Termini di Servizio. Si prega di leggerli attentamente.',

    section1Title: '1. CHI PUÒ UTILIZZARE BIOGRAPHY LIBRARY',
    section1Content: [
      'Devi avere almeno 18 anni per utilizzare Biography Library.',
      'Creando un account, confermi che:',
      'Tutte le informazioni che fornisci (nome, email, data di nascita) sono accurate',
      'Rispetterai questi Termini e le leggi applicabili',
      'Rispetterai i diritti degli altri'
    ],

    section2Title: '2. COSA PUOI PUBBLICARE',
    section2Intro: 'Biography Library consente due tipi di biografie:',
    section2Autobiography: 'LA TUA AUTOBIOGRAFIA',
    section2AutobiographyDesc: 'Puoi scrivere e pubblicare la tua storia di vita. Hai completa libertà di raccontare la tua storia con le tue parole, entro i limiti legali.',
    section2Deceased: 'BIOGRAFIE DI PERSONE DECEDUTE',
    section2DeceasedDesc: 'Puoi scrivere e pubblicare biografie di persone che sono scomparse. Devi essere veritiero e rispettare i diritti delle persone viventi che menzioni.',
    section2Prohibited: 'COSA È VIETATO',
    section2ProhibitedList: [
      'Persone viventi (tranne te stesso)',
      'Minori sotto i 18 anni (anche se deceduti)',
      'Chiunque di cui non puoi provare il decesso (se richiesto)'
    ],
    section2ProhibitedConsequence: 'La violazione di queste regole comporterà la chiusura immediata dell\'account e può portare ad azioni legali.',

    section3Title: '3. LE TUE RESPONSABILITÀ COME AUTORE',
    section3Intro: 'Quando pubblichi una biografia, sei l\'unico responsabile per:',
    section3Responsibilities: [
      'L\'accuratezza e la veridicità delle informazioni',
      'Il rispetto dei diritti alla privacy delle persone viventi che menzioni',
      'Non includere dati sensibili su altri senza consenso (informazioni sanitarie, orientamento sessuale, procedimenti legali, dati finanziari)',
      'Non pubblicare contenuti diffamatori, falsi o illegali',
      'Rispettare i diritti d\'autore e di proprietà intellettuale',
      'Rispettare la legge svizzera e le leggi del tuo paese'
    ],
    section3Disclaimer: 'Biography Library è un fornitore di piattaforma. Non verifichiamo i contenuti prima della pubblicazione. Ti assumi la piena responsabilità legale per ciò che pubblichi.',

    section4Title: '4. BIOGRAFIE DI PERSONE DECEDUTE - REGOLE SPECIALI',
    section4Content: [
      'Dichiari sotto la tua responsabilità legale che la persona è deceduta',
      'La biografia entra in un periodo di revisione di 30 giorni prima di diventare pubblica',
      'Durante questo periodo, solo tu puoi vederla e modificarla',
      'Potremmo richiedere la prova del decesso se la biografia viene segnalata',
      'Le false dichiarazioni possono essere perseguite ai sensi del Codice Penale Svizzero Art. 179decies (frode d\'identità)',
      'Anche se il defunto non ha diritti di protezione dei dati, non devi fare dichiarazioni false o diffamatorie che potrebbero danneggiare l\'onore della famiglia',
      'Più persone possono scrivere biografie della stessa persona deceduta (prospettive diverse sono benvenute)'
    ],

    section5Title: '5. PRIVACY E PROTEZIONE DEI DATI',
    section5DataCollect: 'Quali dati raccogliamo:',
    section5DataCollectList: [
      'Email, nome, password (crittografata)',
      'Contenuto delle biografie che crei',
      'Dati di utilizzo (orari di accesso, indirizzi IP per sicurezza)'
    ],
    section5DataUse: 'Come utilizziamo i tuoi dati:',
    section5DataUseList: [
      'Per fornire il servizio',
      'Per inviare notifiche essenziali',
      'Per garantire la sicurezza e prevenire abusi',
      'Per migliorare il servizio'
    ],
    section5Hosting: 'I tuoi dati sono ospitati in Svizzera (Infomaniak SA, Ginevra) e non lasciano mai la giurisdizione svizzera.',
    section5NoSale: 'NON vendiamo MAI i tuoi dati a terze parti.',
    section5Rights: 'Hai il diritto di:',
    section5RightsList: [
      'Accedere ai tuoi dati',
      'Correggere informazioni inesatte',
      'Eliminare il tuo account e tutte le tue biografie',
      'Esportare le tue biografie',
      'Opporti a determinati trattamenti dei dati'
    ],

    section6Title: '6. I TUOI DIRITTI SULLA BIOGRAFIA - IMPOSTAZIONI PRIVACY',
    section6Control: 'Controlli chi può vedere la tua autobiografia:',
    section6ControlList: [
      'Pubblica: visibile a chiunque su internet',
      'Amici e Famiglia: visibile solo alle persone che inviti',
      'Privata: visibile solo a te'
    ],
    section6Change: 'Puoi modificare queste impostazioni in qualsiasi momento.',
    section6License: 'Le biografie pubbliche sono concesse in licenza sotto Creative Commons BY-NC-SA 4.0:',
    section6LicenseList: [
      'BY: Attribuzione richiesta',
      'NC: Uso non commerciale',
      'SA: Condividi allo stesso modo'
    ],
    section6Ownership: 'Mantieni la piena proprietà dei tuoi contenuti. Biography Library ha solo una licenza per ospitarli e mostrarli secondo le tue impostazioni di privacy.',
    section6Deletion: 'Puoi eliminare le tue biografie in qualsiasi momento. L\'eliminazione è permanente e ha effetto entro 90 giorni.',

    section7Title: '7. INTELLIGENZA ARTIFICIALE (IA)',
    section7Intro: 'Biography Library offre funzionalità IA opzionali:',
    section7Features: [
      'Suggerimenti di scrittura',
      'Correzione grammaticale',
      'Traduzione',
      'Solleciti di memoria'
    ],
    section7Provider: 'Le funzionalità IA sono alimentate da Mistral AI tramite Infomaniak Euria (hosting svizzero).',
    section7Important: 'Importante:',
    section7ImportantList: [
      'Le tue biografie NON vengono utilizzate per addestrare modelli IA',
      'I tuoi dati NON vengono condivisi con terze parti',
      'Il trattamento IA avviene temporaneamente e solo in Svizzera',
      'Puoi disabilitare le funzionalità IA in qualsiasi momento'
    ],

    section8Title: '8. CONTENUTI VIETATI',
    section8List: [
      'Discorsi d\'odio o incitamento alla violenza',
      'Contenuti pornografici',
      'Contenuti che violano il copyright',
      'Spam o pubblicità commerciale',
      'Contenuti che violano qualsiasi legge',
      'Codice dannoso o link di phishing'
    ],
    section8Consequence: 'La violazione comporterà la rimozione immediata del contenuto e la chiusura dell\'account.',

    section9Title: '9. SEGNALAZIONE DI VIOLAZIONI',
    section9Intro: 'Ogni biografia ha un pulsante "Segnala". Puoi segnalare:',
    section9CanReport: [
      'Biografie di persone viventi (vietate)',
      'Biografie contenenti i tuoi dati sensibili senza consenso',
      'Contenuti falsi o diffamatori',
      'Violazioni del copyright',
      'Contenuti illegali'
    ],
    section9Review: 'Esaminiamo le segnalazioni entro 48-72 ore. Se la violazione è confermata, rimuoveremo il contenuto e potremmo chiudere l\'account dell\'autore.',

    section10Title: '10. LIMITAZIONE DI RESPONSABILITÀ',
    section10Intro: 'Biography Library è fornita "così com\'è" senza garanzie.',
    section10CannotGuarantee: 'Ci impegniamo a fornire un servizio affidabile, ma non possiamo garantire:',
    section10CannotGuaranteeList: [
      'Uptime al 100% (anche se puntiamo al 99%+)',
      'Protezione assoluta da attacchi informatici',
      'Conservazione permanente (anche se questo è il nostro obiettivo)'
    ],
    section10IfClose: 'Se Biography Library dovesse chiudere, noi:',
    section10IfCloseList: [
      'Daremo almeno 6 mesi di preavviso',
      'Ti permetteremo di esportare tutti i tuoi dati',
      'Renderemo il codice sorgente disponibile alla comunità (è già open source)'
    ],
    section10MaxLiability: 'Responsabilità massima: 50 CHF per utente (poiché il servizio è gratuito)',
    section10NotLiable: 'Non siamo responsabili per:',
    section10NotLiableList: [
      'Contenuti pubblicati dagli utenti',
      'Danni indiretti o consequenziali',
      'Perdita di dati oltre il nostro ragionevole controllo'
    ],

    section11Title: '11. MODIFICHE A QUESTI TERMINI',
    section11Content: [
      'Potremmo aggiornare questi Termini di volta in volta. Ti notificheremo via email almeno 30 giorni prima che le modifiche abbiano effetto.',
      'Se non sei d\'accordo con le modifiche, puoi eliminare il tuo account prima della data di entrata in vigore.',
      'Continuare a utilizzare Biography Library dopo che le modifiche hanno effetto significa che accetti i nuovi Termini.'
    ],

    section12Title: '12. CHIUSURA DELL\'ACCOUNT',
    section12YouCan: 'Puoi eliminare il tuo account in qualsiasi momento da Impostazioni → Account → Elimina Account.',
    section12Deletes: 'Questo eliminerà permanentemente:',
    section12DeletesList: [
      'Le informazioni del tuo account',
      'Tutte le autobiografie che hai creato',
      'Tutte le biografie di persone decedute che hai scritto (a meno che non abbiano contributi di altri - in tal caso chiederemo conferma)'
    ],
    section12WeCan: 'Potremmo chiudere il tuo account se:',
    section12WeCanList: [
      'Violi ripetutamente questi Termini',
      'Ti impegni in attività fraudolente',
      'Il tuo account è inattivo per 5+ anni (dopo notifica via email)',
      'Richiesto dalle forze dell\'ordine'
    ],

    section13Title: '13. OPEN SOURCE',
    section13Intro: 'Il software Biography Library è open source con licenza AGPL v3.0.',
    section13CodeUrl: 'Il codice è disponibile su: github.com/BiographyLibrary/Biography-Library',
    section13AnyoneCan: 'Chiunque può:',
    section13AnyoneCanList: [
      'Visualizzare il codice',
      'Proporre miglioramenti',
      'Creare fork per comunità specifiche',
      'Verificare che non ci siano backdoor'
    ],
    section13OnlyWeIssue: 'Tuttavia, solo Biography Library Association (Svizzera) può emettere credenziali verificabili W3C autentiche per il catalogo universale.',

    section14Title: '14. LEGGE APPLICABILE',
    section14Intro: 'Questi Termini sono regolati dalla legge svizzera, in particolare:',
    section14Laws: [
      'Codice Civile Svizzero (CC)',
      'Codice delle Obbligazioni Svizzero (CO)',
      'Legge Federale Svizzera sulla Protezione dei Dati (nLPD)',
      'Codice Penale Svizzero (CP)'
    ],
    section14Disputes: 'Le controversie saranno risolte nei tribunali di Lugano, Ticino, Svizzera.',
    section14EU: 'I consumatori dell\'UE hanno il diritto di utilizzare i tribunali nel loro paese di residenza (protezione dei consumatori GDPR).',
    section14Mediator: 'Prima di un\'azione legale, contatta il nostro mediatore interno a: disputes@biographylibrary.org',

    section15Title: '15. CONTATTI',
    section15Org: 'Biography Library Association',
    section15Location: 'Lugano, Ticino, Svizzera',
    section15Email: 'Email:',
    section15EmailList: [
      'Supporto generale: support@biographylibrary.org',
      'Questioni di privacy: privacy@biographylibrary.org',
      'Segnalazione violazioni: report@biographylibrary.org',
      'Questioni legali: legal@biographylibrary.org'
    ],

    acceptanceTitle: 'ACCETTAZIONE',
    acceptanceIntro: 'Cliccando "Accetto" o utilizzando Biography Library, confermi che:',
    acceptanceList: [
      'Hai letto e compreso questi Termini',
      'Accetti di essere vincolato da essi',
      'Hai almeno 18 anni',
      'Rispetterai tutte le leggi applicabili'
    ],
    acceptButton: 'Accetto'
  },

  fr: {
    title: 'Conditions d\'Utilisation - Biography Library',
    lastUpdated: 'Dernière mise à jour: Février 2026',
    introduction: 'En utilisant Biography Library, vous acceptez ces Conditions d\'Utilisation. Veuillez les lire attentivement.',

    section1Title: '1. QUI PEUT UTILISER BIOGRAPHY LIBRARY',
    section1Content: [
      'Vous devez avoir au moins 18 ans pour utiliser Biography Library.',
      'En créant un compte, vous confirmez que:',
      'Toutes les informations que vous fournissez (nom, email, date de naissance) sont exactes',
      'Vous respecterez ces Conditions et les lois applicables',
      'Vous respecterez les droits des autres'
    ],

    section2Title: '2. CE QUE VOUS POUVEZ PUBLIER',
    section2Intro: 'Biography Library permet deux types de biographies:',
    section2Autobiography: 'VOTRE PROPRE AUTOBIOGRAPHIE',
    section2AutobiographyDesc: 'Vous pouvez écrire et publier votre propre histoire de vie. Vous avez une liberté totale de raconter votre histoire avec vos propres mots, dans les limites légales.',
    section2Deceased: 'BIOGRAPHIES DE PERSONNES DÉCÉDÉES',
    section2DeceasedDesc: 'Vous pouvez écrire et publier des biographies de personnes décédées. Vous devez être véridique et respecter les droits des personnes vivantes que vous mentionnez.',
    section2Prohibited: 'CE QUI EST INTERDIT',
    section2ProhibitedList: [
      'Personnes vivantes (autres que vous-même)',
      'Mineurs de moins de 18 ans (même décédés)',
      'Toute personne dont vous ne pouvez pas prouver le décès (si demandé)'
    ],
    section2ProhibitedConsequence: 'La violation de ces règles entraînera la fermeture immédiate du compte et peut conduire à des actions en justice.',

    section3Title: '3. VOS RESPONSABILITÉS EN TANT QU\'AUTEUR',
    section3Intro: 'Lorsque vous publiez une biographie, vous êtes seul responsable de:',
    section3Responsibilities: [
      'L\'exactitude et la véracité des informations',
      'Le respect des droits à la vie privée des personnes vivantes que vous mentionnez',
      'Ne pas inclure de données sensibles sur d\'autres sans consentement (informations de santé, orientation sexuelle, procédures judiciaires, données financières)',
      'Ne pas publier de contenu diffamatoire, faux ou illégal',
      'Respecter les droits d\'auteur et de propriété intellectuelle',
      'Respecter la loi suisse et les lois de votre pays'
    ],
    section3Disclaimer: 'Biography Library est un fournisseur de plateforme. Nous ne vérifions pas le contenu avant publication. Vous portez l\'entière responsabilité légale de ce que vous publiez.',

    section4Title: '4. BIOGRAPHIES DE PERSONNES DÉCÉDÉES - RÈGLES SPÉCIALES',
    section4Content: [
      'Vous déclarez sous votre responsabilité légale que la personne est décédée',
      'La biographie entre dans une période de révision de 30 jours avant de devenir publique',
      'Pendant cette période, vous seul pouvez la voir et la modifier',
      'Nous pouvons demander une preuve de décès si la biographie est signalée',
      'Les fausses déclarations peuvent être poursuivies en vertu du Code pénal suisse Art. 179decies (fraude à l\'identité)',
      'Même si le défunt n\'a pas de droits à la protection des données, vous ne devez pas faire de déclarations fausses ou diffamatoires qui pourraient nuire à l\'honneur de la famille',
      'Plusieurs personnes peuvent écrire des biographies de la même personne décédée (différentes perspectives sont bienvenues)'
    ],

    section5Title: '5. VIE PRIVÉE ET PROTECTION DES DONNÉES',
    section5DataCollect: 'Quelles données nous collectons:',
    section5DataCollectList: [
      'Email, nom, mot de passe (chiffré)',
      'Contenu des biographies que vous créez',
      'Données d\'utilisation (heures de connexion, adresses IP pour la sécurité)'
    ],
    section5DataUse: 'Comment nous utilisons vos données:',
    section5DataUseList: [
      'Pour fournir le service',
      'Pour envoyer des notifications essentielles',
      'Pour assurer la sécurité et prévenir les abus',
      'Pour améliorer le service'
    ],
    section5Hosting: 'Vos données sont hébergées en Suisse (Infomaniak SA, Genève) et ne quittent jamais la juridiction suisse.',
    section5NoSale: 'Nous ne vendons JAMAIS vos données à des tiers.',
    section5Rights: 'Vous avez le droit de:',
    section5RightsList: [
      'Accéder à vos données',
      'Corriger des informations inexactes',
      'Supprimer votre compte et toutes vos biographies',
      'Exporter vos biographies',
      'Vous opposer à certains traitements de données'
    ],

    section6Title: '6. VOS DROITS SUR LA BIOGRAPHIE - PARAMÈTRES DE CONFIDENTIALITÉ',
    section6Control: 'Vous contrôlez qui peut voir votre autobiographie:',
    section6ControlList: [
      'Publique: visible par tous sur internet',
      'Amis et Famille: visible uniquement par les personnes que vous invitez',
      'Privée: visible uniquement par vous'
    ],
    section6Change: 'Vous pouvez modifier ces paramètres à tout moment.',
    section6License: 'Les biographies publiques sont sous licence Creative Commons BY-NC-SA 4.0:',
    section6LicenseList: [
      'BY: Attribution requise',
      'NC: Usage non commercial',
      'SA: Partage dans les mêmes conditions'
    ],
    section6Ownership: 'Vous conservez la pleine propriété de votre contenu. Biography Library n\'a qu\'une licence pour l\'héberger et l\'afficher selon vos paramètres de confidentialité.',
    section6Deletion: 'Vous pouvez supprimer vos biographies à tout moment. La suppression est permanente et prend effet dans les 90 jours.',

    section7Title: '7. INTELLIGENCE ARTIFICIELLE (IA)',
    section7Intro: 'Biography Library offre des fonctionnalités IA optionnelles:',
    section7Features: [
      'Suggestions d\'écriture',
      'Correction grammaticale',
      'Traduction',
      'Sollicitations de mémoire'
    ],
    section7Provider: 'Les fonctionnalités IA sont alimentées par Mistral AI via Infomaniak Euria (hébergement suisse).',
    section7Important: 'Important:',
    section7ImportantList: [
      'Vos biographies ne sont PAS utilisées pour entraîner des modèles IA',
      'Vos données ne sont PAS partagées avec des tiers',
      'Le traitement IA se fait temporairement et uniquement en Suisse',
      'Vous pouvez désactiver les fonctionnalités IA à tout moment'
    ],

    section8Title: '8. CONTENU INTERDIT',
    section8List: [
      'Discours de haine ou incitation à la violence',
      'Contenu pornographique',
      'Contenu violant les droits d\'auteur',
      'Spam ou publicité commerciale',
      'Contenu violant toute loi',
      'Code malveillant ou liens de phishing'
    ],
    section8Consequence: 'La violation entraînera la suppression immédiate du contenu et la fermeture du compte.',

    section9Title: '9. SIGNALEMENT DE VIOLATIONS',
    section9Intro: 'Chaque biographie a un bouton "Signaler". Vous pouvez signaler:',
    section9CanReport: [
      'Biographies de personnes vivantes (interdit)',
      'Biographies contenant vos données sensibles sans consentement',
      'Contenu faux ou diffamatoire',
      'Violations des droits d\'auteur',
      'Contenu illégal'
    ],
    section9Review: 'Nous examinons les signalements dans les 48-72 heures. Si la violation est confirmée, nous supprimerons le contenu et pourrons fermer le compte de l\'auteur.',

    section10Title: '10. LIMITATION DE RESPONSABILITÉ',
    section10Intro: 'Biography Library est fournie "telle quelle" sans garanties.',
    section10CannotGuarantee: 'Nous nous efforçons de fournir un service fiable, mais nous ne pouvons pas garantir:',
    section10CannotGuaranteeList: [
      'Une disponibilité à 100% (bien que nous visons 99%+)',
      'Une protection absolue contre les cyberattaques',
      'Une conservation permanente (bien que ce soit notre objectif)'
    ],
    section10IfClose: 'Si Biography Library doit fermer, nous:',
    section10IfCloseList: [
      'Donnerons au moins 6 mois de préavis',
      'Vous permettrons d\'exporter toutes vos données',
      'Rendrons le code source disponible à la communauté (il est déjà open source)'
    ],
    section10MaxLiability: 'Responsabilité maximale: 50 CHF par utilisateur (car le service est gratuit)',
    section10NotLiable: 'Nous ne sommes pas responsables de:',
    section10NotLiableList: [
      'Contenu publié par les utilisateurs',
      'Dommages indirects ou consécutifs',
      'Perte de données hors de notre contrôle raisonnable'
    ],

    section11Title: '11. MODIFICATIONS DE CES CONDITIONS',
    section11Content: [
      'Nous pouvons mettre à jour ces Conditions de temps en temps. Nous vous notifierons par email au moins 30 jours avant que les modifications prennent effet.',
      'Si vous n\'êtes pas d\'accord avec les modifications, vous pouvez supprimer votre compte avant la date d\'entrée en vigueur.',
      'Continuer à utiliser Biography Library après que les modifications prennent effet signifie que vous acceptez les nouvelles Conditions.'
    ],

    section12Title: '12. RÉSILIATION DU COMPTE',
    section12YouCan: 'Vous pouvez supprimer votre compte à tout moment depuis Paramètres → Compte → Supprimer le Compte.',
    section12Deletes: 'Cela supprimera définitivement:',
    section12DeletesList: [
      'Les informations de votre compte',
      'Toutes les autobiographies que vous avez créées',
      'Toutes les biographies de personnes décédées que vous avez écrites (sauf si elles ont des contributions d\'autres - auquel cas nous demanderons confirmation)'
    ],
    section12WeCan: 'Nous pouvons fermer votre compte si:',
    section12WeCanList: [
      'Vous violez ces Conditions de manière répétée',
      'Vous vous engagez dans une activité frauduleuse',
      'Votre compte est inactif pendant 5+ ans (après notification par email)',
      'Requis par les forces de l\'ordre'
    ],

    section13Title: '13. OPEN SOURCE',
    section13Intro: 'Le logiciel Biography Library est open source sous licence AGPL v3.0.',
    section13CodeUrl: 'Le code est disponible sur: github.com/BiographyLibrary/Biography-Library',
    section13AnyoneCan: 'Tout le monde peut:',
    section13AnyoneCanList: [
      'Voir le code',
      'Proposer des améliorations',
      'Créer des forks pour des communautés spécifiques',
      'Vérifier qu\'il n\'y a pas de backdoors'
    ],
    section13OnlyWeIssue: 'Cependant, seule Biography Library Association (Suisse) peut émettre des credentials vérifiables W3C authentiques pour le catalogue universel.',

    section14Title: '14. LOI APPLICABLE',
    section14Intro: 'Ces Conditions sont régies par le droit suisse, notamment:',
    section14Laws: [
      'Code Civil Suisse (CC)',
      'Code des Obligations Suisse (CO)',
      'Loi Fédérale Suisse sur la Protection des Données (nLPD)',
      'Code Pénal Suisse (CP)'
    ],
    section14Disputes: 'Les litiges seront résolus dans les tribunaux de Lugano, Tessin, Suisse.',
    section14EU: 'Les consommateurs de l\'UE ont le droit d\'utiliser les tribunaux de leur pays de résidence (protection des consommateurs RGPD).',
    section14Mediator: 'Avant toute action en justice, veuillez contacter notre médiateur interne à: disputes@biographylibrary.org',

    section15Title: '15. CONTACT',
    section15Org: 'Biography Library Association',
    section15Location: 'Lugano, Tessin, Suisse',
    section15Email: 'Email:',
    section15EmailList: [
      'Support général: support@biographylibrary.org',
      'Questions de confidentialité: privacy@biographylibrary.org',
      'Signalement de violations: report@biographylibrary.org',
      'Questions juridiques: legal@biographylibrary.org'
    ],

    acceptanceTitle: 'ACCEPTATION',
    acceptanceIntro: 'En cliquant sur "J\'accepte" ou en utilisant Biography Library, vous confirmez que:',
    acceptanceList: [
      'Vous avez lu et compris ces Conditions',
      'Vous acceptez d\'être lié par elles',
      'Vous avez au moins 18 ans',
      'Vous respecterez toutes les lois applicables'
    ],
    acceptButton: 'J\'accepte'
  },

  de: {
    title: 'Nutzungsbedingungen - Biography Library',
    lastUpdated: 'Zuletzt aktualisiert: Februar 2026',
    introduction: 'Durch die Nutzung von Biography Library stimmen Sie diesen Nutzungsbedingungen zu. Bitte lesen Sie sie sorgfältig.',

    section1Title: '1. WER KANN BIOGRAPHY LIBRARY NUTZEN',
    section1Content: [
      'Sie müssen mindestens 18 Jahre alt sein, um Biography Library zu nutzen.',
      'Durch die Erstellung eines Kontos bestätigen Sie, dass:',
      'Alle Informationen, die Sie angeben (Name, E-Mail, Geburtsdatum), korrekt sind',
      'Sie diese Bedingungen und geltende Gesetze einhalten werden',
      'Sie die Rechte anderer respektieren werden'
    ],

    section2Title: '2. WAS SIE VERÖFFENTLICHEN KÖNNEN',
    section2Intro: 'Biography Library erlaubt zwei Arten von Biografien:',
    section2Autobiography: 'IHRE EIGENE AUTOBIOGRAFIE',
    section2AutobiographyDesc: 'Sie können Ihre eigene Lebensgeschichte schreiben und veröffentlichen. Sie haben vollständige Freiheit, Ihre Geschichte mit eigenen Worten zu erzählen, innerhalb gesetzlicher Grenzen.',
    section2Deceased: 'BIOGRAFIEN VERSTORBENER PERSONEN',
    section2DeceasedDesc: 'Sie können Biografien von Personen schreiben und veröffentlichen, die verstorben sind. Sie müssen wahrheitsgemäß sein und die Rechte lebender Personen respektieren, die Sie erwähnen.',
    section2Prohibited: 'WAS VERBOTEN IST',
    section2ProhibitedList: [
      'Lebende Personen (außer sich selbst)',
      'Minderjährige unter 18 Jahren (auch wenn verstorben)',
      'Personen, deren Tod Sie nicht nachweisen können (falls erforderlich)'
    ],
    section2ProhibitedConsequence: 'Die Verletzung dieser Regeln führt zur sofortigen Kontosperrung und kann zu rechtlichen Schritten führen.',

    section3Title: '3. IHRE VERANTWORTUNG ALS AUTOR',
    section3Intro: 'Wenn Sie eine Biografie veröffentlichen, sind Sie allein verantwortlich für:',
    section3Responsibilities: [
      'Die Genauigkeit und Wahrheit der Informationen',
      'Die Wahrung der Privatsphäre lebender Personen, die Sie erwähnen',
      'Keine sensiblen Daten über andere ohne Zustimmung anzugeben (Gesundheitsinformationen, sexuelle Orientierung, Gerichtsverfahren, Finanzdaten)',
      'Keine diffamierenden, falschen oder illegalen Inhalte zu veröffentlichen',
      'Urheberrechte und geistige Eigentumsrechte zu respektieren',
      'Schweizer Recht und die Gesetze Ihres Landes einzuhalten'
    ],
    section3Disclaimer: 'Biography Library ist ein Plattformanbieter. Wir überprüfen Inhalte nicht vor der Veröffentlichung. Sie tragen die volle rechtliche Verantwortung für das, was Sie veröffentlichen.',

    section4Title: '4. BIOGRAFIEN VERSTORBENER PERSONEN - BESONDERE REGELN',
    section4Content: [
      'Sie erklären unter Ihrer rechtlichen Verantwortung, dass die Person verstorben ist',
      'Die Biografie tritt in eine 30-tägige Prüfungsfrist ein, bevor sie öffentlich wird',
      'Während dieser Zeit können nur Sie sie sehen und bearbeiten',
      'Wir können einen Todesnachweis anfordern, wenn die Biografie gemeldet wird',
      'Falsche Erklärungen können nach Schweizer Strafgesetzbuch Art. 179decies (Identitätsbetrug) strafrechtlich verfolgt werden',
      'Auch wenn der Verstorbene keine Datenschutzrechte hat, dürfen Sie keine falschen oder diffamierenden Aussagen machen, die die Ehre der Familie verletzen könnten',
      'Mehrere Personen können Biografien derselben verstorbenen Person schreiben (unterschiedliche Perspektiven sind willkommen)'
    ],

    section5Title: '5. DATENSCHUTZ UND DATENSICHERHEIT',
    section5DataCollect: 'Welche Daten wir sammeln:',
    section5DataCollectList: [
      'E-Mail, Name, Passwort (verschlüsselt)',
      'Biografieinhalte, die Sie erstellen',
      'Nutzungsdaten (Anmeldezeiten, IP-Adressen für Sicherheit)'
    ],
    section5DataUse: 'Wie wir Ihre Daten verwenden:',
    section5DataUseList: [
      'Um den Service bereitzustellen',
      'Um wesentliche Benachrichtigungen zu senden',
      'Um Sicherheit zu gewährleisten und Missbrauch zu verhindern',
      'Um den Service zu verbessern'
    ],
    section5Hosting: 'Ihre Daten werden in der Schweiz gehostet (Infomaniak SA, Genf) und verlassen niemals die Schweizer Gerichtsbarkeit.',
    section5NoSale: 'Wir verkaufen Ihre Daten NIEMALS an Dritte.',
    section5Rights: 'Sie haben das Recht:',
    section5RightsList: [
      'Auf Ihre Daten zuzugreifen',
      'Ungenaue Informationen zu korrigieren',
      'Ihr Konto und alle Ihre Biografien zu löschen',
      'Ihre Biografien zu exportieren',
      'Gegen bestimmte Datenverarbeitungen Widerspruch einzulegen'
    ],

    section6Title: '6. IHRE BIOGRAFIERECHTE - DATENSCHUTZEINSTELLUNGEN',
    section6Control: 'Sie kontrollieren, wer Ihre Autobiografie sehen kann:',
    section6ControlList: [
      'Öffentlich: für jeden im Internet sichtbar',
      'Freunde & Familie: nur für von Ihnen eingeladene Personen sichtbar',
      'Privat: nur für Sie sichtbar'
    ],
    section6Change: 'Sie können diese Einstellungen jederzeit ändern.',
    section6License: 'Öffentliche Biografien sind unter Creative Commons BY-NC-SA 4.0 lizenziert:',
    section6LicenseList: [
      'BY: Namensnennung erforderlich',
      'NC: Nicht-kommerzielle Nutzung',
      'SA: Weitergabe unter gleichen Bedingungen'
    ],
    section6Ownership: 'Sie behalten das volle Eigentum an Ihren Inhalten. Biography Library hat nur eine Lizenz zum Hosten und Anzeigen gemäß Ihren Datenschutzeinstellungen.',
    section6Deletion: 'Sie können Ihre Biografien jederzeit löschen. Die Löschung ist dauerhaft und wird innerhalb von 90 Tagen wirksam.',

    section7Title: '7. KÜNSTLICHE INTELLIGENZ (KI)',
    section7Intro: 'Biography Library bietet optionale KI-gestützte Funktionen:',
    section7Features: [
      'Schreibvorschläge',
      'Grammatikkorrektur',
      'Übersetzung',
      'Erinnerungsaufforderungen'
    ],
    section7Provider: 'KI-Funktionen werden von Mistral AI über Infomaniak Euria (Schweizer Hosting) bereitgestellt.',
    section7Important: 'Wichtig:',
    section7ImportantList: [
      'Ihre Biografien werden NICHT zum Trainieren von KI-Modellen verwendet',
      'Ihre Daten werden NICHT mit Dritten geteilt',
      'Die KI-Verarbeitung erfolgt temporär und nur in der Schweiz',
      'Sie können KI-Funktionen jederzeit deaktivieren'
    ],

    section8Title: '8. VERBOTENE INHALTE',
    section8List: [
      'Hassreden oder Anstiftung zur Gewalt',
      'Pornografische Inhalte',
      'Inhalte, die Urheberrechte verletzen',
      'Spam oder kommerzielle Werbung',
      'Inhalte, die gegen Gesetze verstoßen',
      'Schadcode oder Phishing-Links'
    ],
    section8Consequence: 'Verstöße führen zur sofortigen Entfernung des Inhalts und zur Kontosperrung.',

    section9Title: '9. MELDUNG VON VERSTÖSSEN',
    section9Intro: 'Jede Biografie hat einen "Melden"-Button. Sie können melden:',
    section9CanReport: [
      'Biografien lebender Personen (verboten)',
      'Biografien, die Ihre sensiblen Daten ohne Zustimmung enthalten',
      'Falsche oder diffamierende Inhalte',
      'Urheberrechtsverletzungen',
      'Illegale Inhalte'
    ],
    section9Review: 'Wir prüfen Meldungen innerhalb von 48-72 Stunden. Wenn der Verstoß bestätigt wird, entfernen wir den Inhalt und können das Konto des Autors sperren.',

    section10Title: '10. HAFTUNGSBESCHRÄNKUNG',
    section10Intro: 'Biography Library wird "wie besehen" ohne Garantien bereitgestellt.',
    section10CannotGuarantee: 'Wir bemühen uns, einen zuverlässigen Service zu bieten, können aber nicht garantieren:',
    section10CannotGuaranteeList: [
      '100% Verfügbarkeit (obwohl wir 99%+ anstreben)',
      'Absoluten Schutz vor Cyberangriffen',
      'Dauerhafte Erhaltung (obwohl das unser Ziel ist)'
    ],
    section10IfClose: 'Wenn Biography Library schließen muss, werden wir:',
    section10IfCloseList: [
      'Mindestens 6 Monate im Voraus Bescheid geben',
      'Ihnen erlauben, alle Ihre Daten zu exportieren',
      'Den Quellcode der Community zur Verfügung stellen (er ist bereits Open Source)'
    ],
    section10MaxLiability: 'Maximale Haftung: 50 CHF pro Benutzer (da der Service kostenlos ist)',
    section10NotLiable: 'Wir haften nicht für:',
    section10NotLiableList: [
      'Von Benutzern veröffentlichte Inhalte',
      'Indirekte oder Folgeschäden',
      'Datenverlust außerhalb unserer angemessenen Kontrolle'
    ],

    section11Title: '11. ÄNDERUNGEN DIESER BEDINGUNGEN',
    section11Content: [
      'Wir können diese Bedingungen von Zeit zu Zeit aktualisieren. Wir werden Sie per E-Mail mindestens 30 Tage vor Inkrafttreten der Änderungen benachrichtigen.',
      'Wenn Sie mit den Änderungen nicht einverstanden sind, können Sie Ihr Konto vor dem Inkrafttreten löschen.',
      'Die weitere Nutzung von Biography Library nach Inkrafttreten der Änderungen bedeutet, dass Sie die neuen Bedingungen akzeptieren.'
    ],

    section12Title: '12. KONTOAUFLÖSUNG',
    section12YouCan: 'Sie können Ihr Konto jederzeit unter Einstellungen → Konto → Konto Löschen löschen.',
    section12Deletes: 'Dies wird dauerhaft löschen:',
    section12DeletesList: [
      'Ihre Kontoinformationen',
      'Alle von Ihnen erstellten Autobiografien',
      'Alle von Ihnen verfassten Biografien verstorbener Personen (es sei denn, sie haben Beiträge von anderen - in diesem Fall werden wir um Bestätigung bitten)'
    ],
    section12WeCan: 'Wir können Ihr Konto sperren, wenn:',
    section12WeCanList: [
      'Sie diese Bedingungen wiederholt verletzen',
      'Sie sich an betrügerischen Aktivitäten beteiligen',
      'Ihr Konto über 5 Jahre inaktiv ist (nach E-Mail-Benachrichtigung)',
      'Von Strafverfolgungsbehörden gefordert'
    ],

    section13Title: '13. OPEN SOURCE',
    section13Intro: 'Die Biography Library Software ist Open Source unter AGPL v3.0 Lizenz.',
    section13CodeUrl: 'Der Code ist verfügbar unter: github.com/BiographyLibrary/Biography-Library',
    section13AnyoneCan: 'Jeder kann:',
    section13AnyoneCanList: [
      'Den Code ansehen',
      'Verbesserungen vorschlagen',
      'Forks für spezifische Communities erstellen',
      'Überprüfen, dass es keine Hintertüren gibt'
    ],
    section13OnlyWeIssue: 'Jedoch kann nur Biography Library Association (Schweiz) authentische W3C Verifiable Credentials für den universellen Katalog ausstellen.',

    section14Title: '14. ANWENDBARES RECHT',
    section14Intro: 'Diese Bedingungen unterliegen dem Schweizer Recht, insbesondere:',
    section14Laws: [
      'Schweizerisches Zivilgesetzbuch (ZGB)',
      'Schweizerisches Obligationenrecht (OR)',
      'Schweizerisches Datenschutzgesetz (nDSG)',
      'Schweizerisches Strafgesetzbuch (StGB)'
    ],
    section14Disputes: 'Streitigkeiten werden vor den Gerichten von Lugano, Tessin, Schweiz beigelegt.',
    section14EU: 'EU-Verbraucher haben das Recht, Gerichte in ihrem Wohnsitzland zu nutzen (DSGVO-Verbraucherschutz).',
    section14Mediator: 'Vor rechtlichen Schritten kontaktieren Sie bitte unseren internen Mediator unter: disputes@biographylibrary.org',

    section15Title: '15. KONTAKT',
    section15Org: 'Biography Library Association',
    section15Location: 'Lugano, Tessin, Schweiz',
    section15Email: 'E-Mail:',
    section15EmailList: [
      'Allgemeiner Support: support@biographylibrary.org',
      'Datenschutzfragen: privacy@biographylibrary.org',
      'Verstöße melden: report@biographylibrary.org',
      'Rechtliche Angelegenheiten: legal@biographylibrary.org'
    ],

    acceptanceTitle: 'AKZEPTANZ',
    acceptanceIntro: 'Durch Klicken auf "Ich akzeptiere" oder durch die Nutzung von Biography Library bestätigen Sie, dass:',
    acceptanceList: [
      'Sie diese Bedingungen gelesen und verstanden haben',
      'Sie sich daran gebunden fühlen',
      'Sie mindestens 18 Jahre alt sind',
      'Sie alle anwendbaren Gesetze einhalten werden'
    ],
    acceptButton: 'Ich akzeptiere'
  }
};
