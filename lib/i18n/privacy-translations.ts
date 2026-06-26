export type Language = 'en' | 'it' | 'fr' | 'de';

export interface PrivacyTranslations {
  title: string;
  version: string;
  effectiveDate: string;

  section1Title: string;
  section1Mission: string;
  section1Contacts: string;
  section1ContactsList: string[];

  section2Title: string;
  section2Intro: string;
  section2Principles: string[];

  section3Title: string;
  section3Registration: string;
  section3RegistrationList: string[];
  section3NeverCollect: string;
  section3NeverCollectList: string[];
  section3Verification: string;
  section3VerificationRegistration: string;
  section3VerificationOnly: string;
  section3VerificationDocs: string[];
  section3VerificationStorage: string[];
  section3Content: string;
  section3ContentList: string[];
  section3Technical: string;
  section3TechnicalList: string[];
  section3AI: string;
  section3AIList: string[];

  section4Title: string;
  section4Intro: string;
  section4Autobiography: string;
  section4AutobiographyList: string[];
  section4Deceased: string;
  section4DeceasedList: string[];
  section4Prohibited: string;
  section4ProhibitedList: string[];
  section4Declarations: string;
  section4DeclarationsAutobiography: string;
  section4DeclarationsAutobiographyList: string[];
  section4DeclarationsDeceased: string;
  section4DeclarationsDeceasedList: string[];
  section4FalseDeclarations: string;

  section5Title: string;
  section5Purpose: string;
  section5PurposeList: string[];
  section5Never: string;
  section5NeverList: string[];

  section6Title: string;
  section6Legal: string;
  section6LegalList: string[];

  section7Title: string;
  section7Providers: string;
  section7ProvidersList: string[];
  section7Guarantees: string;
  section7GuaranteesList: string[];
  section7Family: string;
  section7FamilyDesc: string;
  section7Reporting: string;
  section7ReportingProcess: string[];
  section7Authorities: string;
  section7AuthoritiesIntro: string;
  section7AuthoritiesList: string[];

  section8Title: string;
  section8Residency: string;
  section8ResidencyList: string[];
  section8Security: string;
  section8SecurityList: string[];

  section9Title: string;
  section9Table: string[][];
  section9Note: string;

  section10Title: string;
  section10Access: string;
  section10AccessDesc: string;
  section10Rectification: string;
  section10RectificationDesc: string;
  section10Deletion: string;
  section10DeletionAutobiography: string;
  section10DeletionDeceased: string[];
  section10Portability: string;
  section10PortabilityFormats: string[];
  section10Opposition: string;
  section10OppositionDesc: string;
  section10Revoke: string;
  section10RevokeDesc: string;
  section10Complaint: string;
  section10ComplaintSwitzerland: string;
  section10ComplaintEU: string;
  section10Exercise: string;
  section10ExerciseList: string[];

  section11Title: string;
  section11What: string;
  section11WhatList: string[];
  section11Never: string;
  section11NeverList: string[];
  section11Transparency: string;
  section11TransparencyList: string[];
  section11Local: string;
  section11LocalDesc: string;
  section11NoTraining: string;
  section11NoTrainingDesc: string;

  section12Title: string;
  section12Report: string;
  section12ReportList: string[];
  section12Process: string;
  section12ProcessList: string[];
  section12Moderation: string;
  section12ModerationList: string[];

  section13Title: string;
  section13Technical: string;
  section13TechnicalList: string[];
  section13NoProfiling: string;
  section13NoProfilingDesc: string;
  section13NoAnalytics: string;
  section13NoAnalyticsDesc: string;

  section14Title: string;
  section14Table: string[][];

  section15Title: string;
  section15Intro: string;
  section15Minors: string;
  section15MinorsList: string[];

  section16Title: string;
  section16Intro: string;
  section16Guarantees: string;
  section16GuaranteesList: string[];
  section16NoTransfer: string;
  section16NoTransferList: string[];

  section17Title: string;
  section17Updates: string;
  section17UpdatesList: string[];
  section17Notification: string;
  section17NotificationList: string[];
  section17NoRetroactivity: string;
  section17History: string;

  section18Title: string;
  section18Contingency: string;
  section18ContingencyList: string[];

  section19Title: string;
  section19Intro: string;
  section19List: string[];
  section19Badge: string;

  section20Title: string;
  section20DPO: string;
  section20DPOList: string[];
  section20Reporting: string;
  section20ReportingList: string[];
  section20Authority: string;
  section20AuthoritySwitzerland: string;
  section20AuthorityEU: string;

  section21Title: string;
  section21Language: string;
  section21LanguageList: string;
  section21Law: string;
  section21LawList: string[];
  section21Jurisdiction: string;
  section21JurisdictionLocation: string;

  section22Title: string;
  section22Content: string;

  lastRevision: string;
  lastRevisionVersion: string;
  lastRevisionDate: string;

  footer: string;
  footerTagline: string;
  footerHost: string;
  footerOpenSource: string;
}

export const privacyTranslations: Record<Language, PrivacyTranslations> = {
  en: {
    title: 'Privacy Policy',
    version: 'Version 1.0 – February 2026',
    effectiveDate: 'Effective Date: February 9, 2026',

    section1Title: '1. Who We Are',
    section1Mission: 'Mission: Preserve human memory through a permanent, verified, and universal archive of personal biographies.',
    section1Contacts: 'Contacts:',
    section1ContactsList: [
      'Website: biographylibrary.org',
      'Email: support@biographylibrary.org',
      'Headquarters: Lugano, Ticino, Switzerland'
    ],

    section2Title: '2. Fundamental Principles',
    section2Intro: 'Our Privacy Policy is based on the 10 Non-Negotiable Principles of our Manifesto:',
    section2Principles: [
      'Data Ownership – You own your story, we are only custodians',
      'Privacy by Design – Maximum protection from the design phase',
      'Swiss Hosting – All data resides exclusively in Switzerland',
      'Ethical and Local AI – AI processing in Swiss territory, no sending to third parties',
      'Total Transparency – No selling or commercial sharing of your data',
      'User Control – You decide who can access your biography',
      'Data Minimization – We collect only the bare minimum'
    ],

    section3Title: '3. What Data We Collect',
    section3Registration: '3.1 Registration Data',
    section3RegistrationList: [
      'First and last name',
      'Email',
      'Password (stored in encrypted form)'
    ],
    section3NeverCollect: 'WHAT WE NEVER COLLECT AT REGISTRATION:',
    section3NeverCollectList: [
      '❌ Identity documents (passport, ID card)',
      '❌ Birth, marriage or death certificates',
      '❌ Biometric data'
    ],
    section3Verification: '3.2 Identity Verification – Only Upon Report',
    section3VerificationRegistration: 'At registration:',
    section3VerificationOnly: 'Only in case of report or reasonable doubts:',
    section3VerificationDocs: [
      'Self-attestation',
      'You declare under your responsibility that the information is truthful',
      'Identity document (passport or ID card)',
      'Death certificate (for reported deceased biographies)',
      'Other supporting documents if strictly necessary'
    ],
    section3VerificationStorage: [
      'Stored on offline archives only for the time necessary for verification (maximum 90 days)',
      'Automatically deleted after verification',
      'Never shared with commercial third parties'
    ],
    section3Content: '3.3 Biographical Content',
    section3ContentList: [
      'Biography text',
      'Images and photos',
      'Voice recordings',
      'Videos and documents',
      'Metadata (creation dates, edits, languages)'
    ],
    section3Technical: '3.4 Technical and Navigation Data',
    section3TechnicalList: [
      'IP address (retained 12 months)',
      'Necessary technical cookies',
      'Access logs (retained 12 months)',
      'Language preferences and user settings'
    ],
    section3AI: '3.5 AI-Generated Data',
    section3AIList: [
      'AI suggestion history',
      'Prompts and requests sent to AI assistant',
      'AI Processing: Exclusively in Swiss territory'
    ],

    section4Title: '4. What Biographies You Can Create',
    section4Intro: 'Biography Library allows only two types of biographies:',
    section4Autobiography: '4.1 Autobiographies',
    section4AutobiographyList: [
      'You write about YOUR life',
      'No consent needed from third parties',
      'Total control over publication and privacy'
    ],
    section4Deceased: '4.2 Biographies of Deceased Persons',
    section4DeceasedList: [
      'Person already deceased',
      'Published according to your chosen visibility (private, link-only, or public)',
      'Anyone may report concerns; our moderation team reviews reports'
    ],
    section4Prohibited: 'WHAT YOU CANNOT DO:',
    section4ProhibitedList: [
      '❌ Create biographies of living persons (other than yourself)',
      '❌ Create biographies of minors (under 18 years)',
      '❌ Publish biographies without being able to prove death (if required)'
    ],
    section4Declarations: '4.3 Mandatory Declarations',
    section4DeclarationsAutobiography: 'For Autobiographies:',
    section4DeclarationsAutobiographyList: [
      'I declare that I am writing my autobiography',
      'The information about my identity is truthful',
      'I am at least 18 years old',
      'I am responsible for the content I publish',
      'I will respect the rights of living persons I may mention'
    ],
    section4DeclarationsDeceased: 'For Biographies of Deceased:',
    section4DeclarationsDeceasedList: [
      'I declare under civil and criminal liability that the person is deceased',
      'The information is truthful',
      'I will respect the rights of living persons mentioned',
      'I understand that I may be required to provide proof of death'
    ],
    section4FalseDeclarations: 'False declarations are prosecutable under Art. 179decies CP (identity theft)',

    section5Title: '5. How We Use Your Data',
    section5Purpose: '5.1 Processing Purposes',
    section5PurposeList: [
      'Provide the service',
      'AI assistance',
      'Account management',
      'Security and abuse prevention',
      'Content moderation',
      'Legal compliance'
    ],
    section5Never: '5.2 What We NEVER Do',
    section5NeverList: [
      '❌ We do not sell your data',
      '❌ We do not use your data for advertising or commercial profiling',
      '❌ We do not train AI models on your content',
      '❌ We do not share with governments (except legal obligation under Swiss law)',
      '❌ We do not retroactively modify these terms to reduce your protections',
      '❌ We do not collect identity documents without concrete operational need'
    ],

    section6Title: '6. Legal Basis for Processing',
    section6Legal: 'We process your data based on:',
    section6LegalList: [
      'Contract – To provide the service you requested',
      'Consent – For AI features (you can revoke anytime)',
      'Legal Obligation – To comply with Swiss law',
      'Legitimate Interest – To prevent fraud and ensure security'
    ],

    section7Title: '7. With Whom We Share Your Data',
    section7Providers: '7.1 Service Providers',
    section7ProvidersList: [
      'Infomaniak SA (hosting and infrastructure) – Geneva and Zurich',
      'Infomaniak Euria (AI processing) – Open source models in Switzerland'
    ],
    section7Guarantees: 'Guarantees:',
    section7GuaranteesList: [
      'Data Processing Agreements (DPA) compliant with LPD/GDPR',
      'Data never leaves Swiss jurisdiction',
      'No transfers to USA, China or countries without adequate data protection'
    ],
    section7Family: '7.2 Family Access',
    section7FamilyDesc: 'If you decide to share your biography with family members, they will be able to access the content according to the permissions you set.',
    section7Reporting: '7.3 Reporting System',
    section7ReportingProcess: [
      'Report received',
      'Review within 48-72 hours',
      'Request documents from author (if necessary)',
      'Decision: biography confirmed, removed or modified'
    ],
    section7Authorities: '7.4 Public Authorities',
    section7AuthoritiesIntro: 'We share your data with government authorities only if:',
    section7AuthoritiesList: [
      'Required by a valid Swiss court order',
      'Necessary to prevent a serious crime',
      'Mandatory by law according to LPD or Swiss Criminal Code'
    ],

    section8Title: '8. Where Your Data Is Stored',
    section8Residency: '8.1 Data Residency – 100% Switzerland',
    section8ResidencyList: [
      'Primary servers: Infomaniak SA (Geneva and Zurich data centers)',
      'Backups: Infomaniak (internal Swiss geo-replication)',
      'AI processing: Infomaniak – open source models resident in Switzerland'
    ],
    section8Security: '8.2 Technical Security',
    section8SecurityList: [
      'Encryption in transit (TLS 1.3 or higher)',
      'Encryption at rest',
      'Multi-factor authentication (MFA) available',
      'Row Level Security (RLS) in PostgreSQL database',
      'Daily encrypted backups',
      'Audit logs',
      'Open source code (AGPL v3)'
    ],

    section9Title: '9. Access Control',
    section9Table: [
      ['Privacy Level', 'Who Can Access'],
      ['Private', 'Only you'],
      ['Family', 'You + family members you invite'],
      ['Public', 'Everyone (when visibility is set to public)']
    ],
    section9Note: 'Note: Memorial biographies follow the same visibility rules as autobiographies. Reports are reviewed by our moderation team.',

    section10Title: '10. Your Rights',
    section10Access: '10.1 Right of Access',
    section10AccessDesc: 'You can request a copy of all personal data we hold about you.',
    section10Rectification: '10.2 Right to Rectification',
    section10RectificationDesc: 'You can correct inaccurate or incomplete information.',
    section10Deletion: '10.3 Right to Deletion',
    section10DeletionAutobiography: 'For autobiographies: You can completely delete your biography at any time',
    section10DeletionDeceased: [
      'You can delete your memorial biography while it is not publicly visible',
      'If already public, we will evaluate historical interest',
      'Retention for legal obligations if necessary'
    ],
    section10Portability: '10.4 Right to Portability',
    section10PortabilityFormats: ['PDF', 'TXT', 'RTF', 'DOCX'],
    section10Opposition: '10.5 Right to Object',
    section10OppositionDesc: 'You can object to processing based on legitimate interest.',
    section10Revoke: '10.6 Right to Revoke Consent',
    section10RevokeDesc: 'You can revoke consent to AI use at any time.',
    section10Complaint: '10.7 Right to Lodge a Complaint',
    section10ComplaintSwitzerland: 'Switzerland: Federal Data Protection and Information Commissioner (FDPIC) - Feldeggweg 1, CH-3003 Bern - www.edoeb.admin.ch',
    section10ComplaintEU: 'European Union: Supervisory authority of your country',
    section10Exercise: 'How to exercise your rights:',
    section10ExerciseList: [
      'Email: privacy@biographylibrary.org',
      'Subject: "GDPR/LPD Request"',
      'Response time: 30 days'
    ],

    section11Title: '11. Artificial Intelligence',
    section11What: '11.1 What AI Does',
    section11WhatList: [
      'Corrects grammar and punctuation',
      'Suggests clearer formulations (you approve/reject)',
      'Helps organize timeline',
      'Translates biography (you review)',
      'Provides research assistance'
    ],
    section11Never: '11.2 What AI Does NOT Do',
    section11NeverList: [
      '❌ Does not invent facts or events',
      '❌ Does not decide what is important',
      '❌ Does not modify without approval',
      '❌ Does not auto-publish',
      '❌ Does not use your content to train commercial models'
    ],
    section11Transparency: '11.3 Transparency',
    section11TransparencyList: [
      'Every suggestion marked with "AI Suggestion"',
      'Modification history visible',
      'Ability to completely disable AI'
    ],
    section11Local: '11.4 Local Processing',
    section11LocalDesc: 'All AI processing occurs in Switzerland via Infomaniak Euria (Mistral models). No transfer to OpenAI, Google, Microsoft, Anthropic.',
    section11NoTraining: '11.5 NO AI Training',
    section11NoTrainingDesc: 'Your biographical content is NEVER used to train commercial or open source AI models',

    section12Title: '12. Reporting System',
    section12Report: '12.1 Report a Violation',
    section12ReportList: [
      'Biographies of people still alive',
      'Content with sensitive data without consent',
      'False or defamatory content',
      'Copyright violations',
      'Illegal content'
    ],
    section12Process: '12.2 Process',
    section12ProcessList: [
      'Report received',
      'Human review within 48-72 hours',
      'Request documents (if necessary)',
      'Final decision'
    ],
    section12Moderation: '12.3 Moderation',
    section12ModerationList: [
      'AI Agent (optional) scans only public biographies',
      'Human reviewer always makes final decision',
      'Private biographies are NEVER scanned'
    ],

    section13Title: '13. Cookies and Tracking',
    section13Technical: '13.1 Technical Cookies',
    section13TechnicalList: [
      'Session cookie',
      'Language preference',
      'CSRF token',
      'Duration: Session or maximum 12 months'
    ],
    section13NoProfiling: '13.2 NO Profiling Cookies',
    section13NoProfilingDesc: '❌ We do not use third-party cookies for advertising or tracking.',
    section13NoAnalytics: '13.3 NO Invasive Analytics',
    section13NoAnalyticsDesc: '❌ We do not use Google Analytics, Facebook Pixel or other invasive trackers. If we implement analytics: only Plausible Analytics or Matomo self-hosted in Switzerland.',

    section14Title: '14. Data Retention',
    section14Table: [
      ['Data Type', 'Retention Period'],
      ['Account information', 'Until account deletion'],
      ['Biographical content', 'Permanently (archival mission)'],
      ['Access logs', '12 months'],
      ['IP addresses', '12 months'],
      ['Identity documents', 'Maximum 90 days (verification only)'],
      ['AI suggestions', 'Until biography deletion']
    ],

    section15Title: '15. Protection of Minors',
    section15Intro: 'Biography Library is intended for persons over 18 years of age.',
    section15Minors: 'Minors (under 18 years):',
    section15MinorsList: [
      '❌ Cannot create accounts',
      '❌ Cannot write biographies',
      '❌ Cannot be subjects of biographies'
    ],

    section16Title: '16. International Transfers',
    section16Intro: 'We do not perform data transfers outside of Switzerland.',
    section16Guarantees: 'Guarantees:',
    section16GuaranteesList: [
      'EU users: Switzerland-EU Adequacy Agreement',
      'Swiss users: nLPD protection',
      'Other users: Swiss law protection'
    ],
    section16NoTransfer: 'No transfer to:',
    section16NoTransferList: [
      '❌ USA',
      '❌ China',
      '❌ Russia or countries with weak privacy laws'
    ],

    section17Title: '17. Changes to Privacy Policy',
    section17Updates: '17.1 Updates',
    section17UpdatesList: [
      'Regulatory changes',
      'Improve clarity',
      'Add new features'
    ],
    section17Notification: '17.2 Notification',
    section17NotificationList: [
      'Email notification 30 days before',
      'Informative banner at login',
      'Explicit acceptance required'
    ],
    section17NoRetroactivity: '17.3 No Retroactivity - We will never retroactively modify these terms to reduce already guaranteed protections.',
    section17History: 'Version history: v1.0 (February 2026) – Initial version',

    section18Title: '18. What Happens If Biography Library Closes',
    section18Contingency: '18.1 Contingency Plan',
    section18ContingencyList: [
      'Advance notice (6 months)',
      'Data export to users (PDF, TXT, RTF, DOCX)',
      'Public open source code (AGPL v3)',
      'Community fork possible',
      'Trust fund for archive preservation'
    ],

    section19Title: '19. Open Source and Transparency',
    section19Intro: 'Biography Library is completely open source (AGPL v3 license).',
    section19List: [
      'Public source code on GitHub',
      'Anyone can verify how it works',
      'Anyone can contribute',
      'Maximum transparency',
      'Community can create forks'
    ],
    section19Badge: 'Authenticity badge: Only the Biography Library Association can issue official W3C Verifiable Credentials certifications.',

    section20Title: '20. Contacts',
    section20DPO: '20.1 Data Protection Officer',
    section20DPOList: [
      'Email: support@biographylibrary.org',
      'Subject: "Privacy Request / GDPR / LPD"',
      'Response time: 30 days'
    ],
    section20Reporting: '20.2 Reports',
    section20ReportingList: [
      '"Report" button on biography',
      'Email: support@biographylibrary.org'
    ],
    section20Authority: '20.3 Supervisory Authority',
    section20AuthoritySwitzerland: 'Switzerland: FDPIC – Feldeggweg 1, CH-3003 Bern - www.edoeb.admin.ch',
    section20AuthorityEU: 'European Union: Supervisory authority of your country',

    section21Title: '21. Language and Jurisdiction',
    section21Language: '21.1 Language',
    section21LanguageList: 'Available in: English (binding), Italian, French, German',
    section21Law: '21.2 Applicable Law',
    section21LawList: [
      'Swiss Federal Data Protection Act (nLPD)',
      'GDPR (for EU/EEA users)',
      'Swiss Civil Code',
      'Swiss Criminal Code'
    ],
    section21Jurisdiction: '21.3 Competent Forum',
    section21JurisdictionLocation: 'Courts of Lugano, Ticino, Switzerland.',

    section22Title: '22. Acceptance',
    section22Content: 'By using Biography Library, you accept this Privacy Policy.',

    lastRevision: 'Last Revision',
    lastRevisionVersion: 'Version: 1.0',
    lastRevisionDate: 'Date: February 9, 2026',

    footer: 'Biography Library',
    footerTagline: 'Because every life deserves to be remembered',
    footerHost: 'Hosted in Switzerland – Protected by Swiss Privacy Laws',
    footerOpenSource: 'Open Source (AGPL v3) – Transparent, Auditable, Forever'
  },

  it: {
    title: 'Privacy Policy',
    version: 'Versione 1.0 – Febbraio 2026',
    effectiveDate: 'Data di entrata in vigore: 9 febbraio 2026',

    section1Title: '1. Chi Siamo',
    section1Mission: 'Missione: Preservare la memoria umana attraverso un archivio permanente, verificato e universale di biografie personali.',
    section1Contacts: 'Contatti:',
    section1ContactsList: [
      'Sito web: biographylibrary.org',
      'Email: support@biographylibrary.org',
      'Sede: Lugano, Ticino, Svizzera'
    ],

    section2Title: '2. Principi Fondamentali',
    section2Intro: 'La nostra Privacy Policy si basa sui 10 Principi Non Negoziabili del nostro Manifesto:',
    section2Principles: [
      'Proprietà dei dati – Tu possiedi la tua storia, noi siamo solo custodi',
      'Privacy by Design – Protezione massima fin dalla progettazione',
      'Hosting Svizzero – Tutti i dati risiedono esclusivamente in Svizzera',
      'AI Etica e Locale – Elaborazione AI in territorio svizzero, senza invio a terze parti',
      'Trasparenza totale – Nessuna vendita o condivisione commerciale dei tuoi dati',
      'Controllo utente – Decidi tu chi può accedere alla tua biografia',
      'Minimizzazione dei dati – Raccogliamo solo il minimo indispensabile'
    ],

    section3Title: '3. Quali Dati Raccogliamo',
    section3Registration: '3.1 Dati di Registrazione',
    section3RegistrationList: [
      'Nome e cognome',
      'Email',
      'Password (memorizzata in forma criptata)'
    ],
    section3NeverCollect: 'COSA NON RACCOGLIAMO MAI ALLA REGISTRAZIONE:',
    section3NeverCollectList: [
      '❌ Documenti di identità (passaporto, carta d\'identità)',
      '❌ Certificati di nascita, matrimonio o morte',
      '❌ Dati biometrici'
    ],
    section3Verification: '3.2 Verifica dell\'Identità – Solo su Segnalazione',
    section3VerificationRegistration: 'Al momento della registrazione:',
    section3VerificationOnly: 'Solo in caso di segnalazione o dubbi ragionevoli:',
    section3VerificationDocs: [
      'Autodichiarazione (self-attestation)',
      'Dichiari sotto la tua responsabilità che le informazioni sono veritiere',
      'Documento di identità (passaporto o carta d\'identità)',
      'Certificato di morte (per biografie di defunti segnalate)',
      'Altri documenti probatori se strettamente necessari'
    ],
    section3VerificationStorage: [
      'Conservati su archivi offline solo per il tempo necessario alla verifica (massimo 90 giorni)',
      'Cancellati automaticamente dopo la verifica',
      'Mai condivisi con terze parti commerciali'
    ],
    section3Content: '3.3 Contenuto Biografico',
    section3ContentList: [
      'Testo della biografia',
      'Immagini e foto',
      'Registrazioni vocali',
      'Video e documenti',
      'Metadati (date di creazione, modifiche, lingue)'
    ],
    section3Technical: '3.4 Dati Tecnici e di Navigazione',
    section3TechnicalList: [
      'Indirizzo IP (conservato 12 mesi)',
      'Cookie tecnici necessari',
      'Log di accesso (conservati 12 mesi)',
      'Preferenze lingua e impostazioni utente'
    ],
    section3AI: '3.5 Dati generati dall\'AI',
    section3AIList: [
      'Cronologia suggerimenti AI',
      'Prompt e richieste inviate all\'assistente AI',
      'Elaborazione AI: Esclusivamente in territorio svizzero'
    ],

    section4Title: '4. Quali Biografie Puoi Creare',
    section4Intro: 'Biography Library permette solo due tipi di biografie:',
    section4Autobiography: '4.1 Autobiografie',
    section4AutobiographyList: [
      'Tu scrivi della TUA vita',
      'Nessun consenso necessario da terzi',
      'Controllo totale su pubblicazione e privacy'
    ],
    section4Deceased: '4.2 Biografie di Persone Defunte',
    section4DeceasedList: [
      'Persona già deceduta',
      'Pubblicata secondo la visibilità scelta (privata, solo link o pubblica)',
      'Chiunque può segnalare problemi; il team di moderazione esamina le segnalazioni'
    ],
    section4Prohibited: 'COSA NON PUOI FARE:',
    section4ProhibitedList: [
      '❌ Creare biografie di persone viventi (diverse da te stesso)',
      '❌ Creare biografie di minori (sotto i 18 anni)',
      '❌ Pubblicare biografie senza poter provare il decesso (se richiesto)'
    ],
    section4Declarations: '4.3 Dichiarazioni Obbligatorie',
    section4DeclarationsAutobiography: 'Per Autobiografie:',
    section4DeclarationsAutobiographyList: [
      'Dichiaro che sto scrivendo la mia autobiografia',
      'Le informazioni sulla mia identità sono veritiere',
      'Ho almeno 18 anni',
      'Sono responsabile dei contenuti che pubblico',
      'Rispetterò i diritti delle persone viventi che potrei menzionare'
    ],
    section4DeclarationsDeceased: 'Per Biografie di Defunti:',
    section4DeclarationsDeceasedList: [
      'Dichiaro sotto responsabilità civile e penale che la persona è deceduta',
      'Le informazioni sono veritiere',
      'Rispetterò i diritti delle persone viventi menzionate',
      'Comprendo che posso essere richiesto di fornire prova del decesso'
    ],
    section4FalseDeclarations: 'False dichiarazioni sono perseguibili ai sensi dell\'Art. 179decies CP (usurpazione d\'identità)',

    section5Title: '5. Come Utilizziamo i Tuoi Dati',
    section5Purpose: '5.1 Finalità del Trattamento',
    section5PurposeList: [
      'Erogare il servizio',
      'Assistenza AI',
      'Gestione account',
      'Sicurezza e prevenzione abusi',
      'Moderazione contenuti',
      'Adempimenti legali'
    ],
    section5Never: '5.2 Cosa NON Facciamo Mai',
    section5NeverList: [
      '❌ Non vendiamo i tuoi dati',
      '❌ Non utilizziamo i tuoi dati per pubblicità o profilazione commerciale',
      '❌ Non addestriamo modelli AI sui tuoi contenuti',
      '❌ Non condividiamo con governi (salvo obbligo legale secondo legge svizzera)',
      '❌ Non modifichiamo retroattivamente questi termini per ridurre le tue protezioni',
      '❌ Non raccogliamo documenti di identità senza necessità operativa concreta'
    ],

    section6Title: '6. Base Giuridica del Trattamento',
    section6Legal: 'Trattiamo i tuoi dati sulla base di:',
    section6LegalList: [
      'Contratto – Per fornire il servizio che hai richiesto',
      'Consenso – Per funzionalità AI (puoi revocarlo in qualsiasi momento)',
      'Obbligo Legale – Per rispettare la legge svizzera',
      'Interesse Legittimo – Per prevenire frodi e garantire la sicurezza'
    ],

    section7Title: '7. Con Chi Condividiamo i Tuoi Dati',
    section7Providers: '7.1 Fornitori di Servizi',
    section7ProvidersList: [
      'Infomaniak SA (hosting e infrastruttura) – Ginevra e Zurigo',
      'Infomaniak Euria (elaborazione AI) – Modelli open source in Svizzera'
    ],
    section7Guarantees: 'Garanzie:',
    section7GuaranteesList: [
      'Data Processing Agreements (DPA) conformi a LPD/GDPR',
      'I dati non lasciano mai la giurisdizione svizzera',
      'Nessun trasferimento verso USA, Cina o paesi senza adeguata protezione dati'
    ],
    section7Family: '7.2 Accesso da Parte della Famiglia',
    section7FamilyDesc: 'Se decidi di condividere la tua biografia con membri della famiglia, questi potranno accedere ai contenuti secondo i permessi che hai impostato.',
    section7Reporting: '7.3 Sistema di Segnalazione',
    section7ReportingProcess: [
      'Segnalazione ricevuta',
      'Revisione entro 48-72 ore',
      'Richiesta documenti all\'autore (se necessario)',
      'Decisione: biografia confermata, rimossa o modificata'
    ],
    section7Authorities: '7.4 Autorità Pubbliche',
    section7AuthoritiesIntro: 'Condividiamo i tuoi dati con autorità governative solo se:',
    section7AuthoritiesList: [
      'Richiesto da un ordine giudiziario svizzero valido',
      'Necessario per prevenire un crimine grave',
      'Obbligatorio per legge secondo la LPD o il Codice Penale Svizzero'
    ],

    section8Title: '8. Dove Sono Conservati i Tuoi Dati',
    section8Residency: '8.1 Data Residency – 100% Svizzera',
    section8ResidencyList: [
      'Server primari: Infomaniak SA (data center Ginevra e Zurigo)',
      'Backup: Infomaniak (georeplicazione interna Svizzera)',
      'Elaborazione AI: Infomaniak – modelli open source residenti in Svizzera'
    ],
    section8Security: '8.2 Sicurezza Tecnica',
    section8SecurityList: [
      'Crittografia in transito (TLS 1.3 o superiore)',
      'Crittografia a riposo',
      'Autenticazione multi-fattore (MFA) disponibile',
      'Row Level Security (RLS) nel database PostgreSQL',
      'Backup giornalieri criptati',
      'Audit log',
      'Codice open source (AGPL v3)'
    ],

    section9Title: '9. Controllo di Accesso',
    section9Table: [
      ['Livello di Privacy', 'Chi Può Accedere'],
      ['Privato', 'Solo tu'],
      ['Famiglia', 'Tu + membri della famiglia che inviti'],
      ['Pubblico', 'Tutti (quando la visibilità è impostata su pubblico)']
    ],
    section9Note: 'Nota: Le biografie memorial seguono le stesse regole di visibilità delle autobiografie. Le segnalazioni sono esaminate dal team di moderazione.',

    section10Title: '10. I Tuoi Diritti',
    section10Access: '10.1 Diritto di Accesso',
    section10AccessDesc: 'Puoi richiedere una copia di tutti i dati personali che conserviamo su di te.',
    section10Rectification: '10.2 Diritto di Rettifica',
    section10RectificationDesc: 'Puoi correggere informazioni inesatte o incomplete.',
    section10Deletion: '10.3 Diritto di Cancellazione',
    section10DeletionAutobiography: 'Per autobiografie: Puoi cancellare completamente la tua biografia in qualsiasi momento',
    section10DeletionDeceased: [
      'Puoi eliminare la biografia memorial finché non è pubblicamente visibile',
      'Se già pubblica, valuteremo l\'interesse storico',
      'Conservazione per obblighi legali se necessario'
    ],
    section10Portability: '10.4 Diritto alla Portabilità',
    section10PortabilityFormats: ['PDF', 'TXT', 'RTF', 'DOCX'],
    section10Opposition: '10.5 Diritto di Opposizione',
    section10OppositionDesc: 'Puoi opporti al trattamento basato su interesse legittimo.',
    section10Revoke: '10.6 Diritto di Revocare il Consenso',
    section10RevokeDesc: 'Puoi revocare il consenso all\'uso dell\'AI in qualsiasi momento.',
    section10Complaint: '10.7 Diritto di Reclamo',
    section10ComplaintSwitzerland: 'Svizzera: Incaricato federale della protezione dei dati e della trasparenza (IFPDT) - Feldeggweg 1, CH-3003 Berna - www.edoeb.admin.ch',
    section10ComplaintEU: 'Unione Europea: Autorità garante del tuo paese',
    section10Exercise: 'Come esercitare i tuoi diritti:',
    section10ExerciseList: [
      'Email: privacy@biographylibrary.org',
      'Oggetto: "Richiesta GDPR/LPD"',
      'Tempo di risposta: 30 giorni'
    ],

    section11Title: '11. Intelligenza Artificiale',
    section11What: '11.1 Cosa fa l\'AI',
    section11WhatList: [
      'Corregge grammatica e punteggiatura',
      'Suggerisce formulazioni più chiare (tu approvi/rifiuti)',
      'Aiuta a organizzare la timeline',
      'Traduce la biografia (tu rivedi)',
      'Fornisce assistenza alla ricerca'
    ],
    section11Never: '11.2 Cosa l\'AI NON fa',
    section11NeverList: [
      '❌ Non inventa fatti o eventi',
      '❌ Non decide cosa è importante',
      '❌ Non modifica senza approvazione',
      '❌ Non auto-pubblica',
      '❌ Non usa i tuoi contenuti per addestrare modelli commerciali'
    ],
    section11Transparency: '11.3 Trasparenza',
    section11TransparencyList: [
      'Ogni suggerimento contrassegnato con "Suggerimento AI"',
      'Cronologia modifiche visibile',
      'Possibilità di disabilitare completamente l\'AI'
    ],
    section11Local: '11.4 Elaborazione Locale',
    section11LocalDesc: 'Tutta l\'elaborazione AI avviene in Svizzera tramite Infomaniak Euria (modelli Mistral). Nessun trasferimento verso OpenAI, Google, Microsoft, Anthropic.',
    section11NoTraining: '11.5 NO AI Training',
    section11NoTrainingDesc: 'I tuoi contenuti biografici NON sono mai utilizzati per addestrare modelli AI commerciali e open source',

    section12Title: '12. Sistema di Segnalazione',
    section12Report: '12.1 Segnala una Violazione',
    section12ReportList: [
      'Biografie di persone ancora vive',
      'Contenuti con dati sensibili senza consenso',
      'Contenuti falsi o diffamatori',
      'Violazioni di copyright',
      'Contenuti illegali'
    ],
    section12Process: '12.2 Processo',
    section12ProcessList: [
      'Segnalazione ricevuta',
      'Revisione umana entro 48-72 ore',
      'Richiesta documenti (se necessario)',
      'Decisione finale'
    ],
    section12Moderation: '12.3 Moderazione',
    section12ModerationList: [
      'AI Agent (facoltativo) scansiona solo biografie pubbliche',
      'Revisore umano prende sempre la decisione finale',
      'Biografie private NON sono mai scansionate'
    ],

    section13Title: '13. Cookie e Tracciamento',
    section13Technical: '13.1 Cookie Tecnici',
    section13TechnicalList: [
      'Session cookie',
      'Language preference',
      'CSRF token',
      'Durata: Sessione o massimo 12 mesi'
    ],
    section13NoProfiling: '13.2 NO Cookie di Profilazione',
    section13NoProfilingDesc: '❌ Non utilizziamo cookie di terze parti per pubblicità o tracciamento.',
    section13NoAnalytics: '13.3 NO Analytics Invasivi',
    section13NoAnalyticsDesc: '❌ Non utilizziamo Google Analytics, Facebook Pixel o altri tracker invasivi. Se implementeremo analytics: solo Plausible Analytics o Matomo self-hosted in Svizzera.',

    section14Title: '14. Conservazione dei Dati',
    section14Table: [
      ['Tipo di Dato', 'Periodo di Conservazione'],
      ['Informazioni account', 'Fino alla cancellazione dell\'account'],
      ['Contenuti biografici', 'Permanentemente (missione archivistica)'],
      ['Log di accesso', '12 mesi'],
      ['Indirizzi IP', '12 mesi'],
      ['Documenti di identità', 'Massimo 90 giorni (solo verifica)'],
      ['Suggerimenti AI', 'Fino alla cancellazione della biografia']
    ],

    section15Title: '15. Protezione dei Minori',
    section15Intro: 'Biography Library è destinata a maggiori di 18 anni.',
    section15Minors: 'Minori (sotto 18 anni):',
    section15MinorsList: [
      '❌ Non possono creare account',
      '❌ Non possono scrivere biografie',
      '❌ Non possono essere soggetti di biografie'
    ],

    section16Title: '16. Trasferimenti Internazionali',
    section16Intro: 'Non effettuiamo trasferimenti di dati fuori dalla Svizzera.',
    section16Guarantees: 'Garanzie:',
    section16GuaranteesList: [
      'Utenti UE: Accordo di Adeguatezza Svizzera-UE',
      'Utenti Svizzera: Protezione nLPD',
      'Altri utenti: Protezione leggi svizzere'
    ],
    section16NoTransfer: 'Nessun trasferimento verso:',
    section16NoTransferList: [
      '❌ USA',
      '❌ Cina',
      '❌ Russia o paesi con leggi privacy deboli'
    ],

    section17Title: '17. Modifiche alla Privacy Policy',
    section17Updates: '17.1 Aggiornamenti',
    section17UpdatesList: [
      'Cambiamenti normativi',
      'Migliorare la chiarezza',
      'Aggiungere nuove funzionalità'
    ],
    section17Notification: '17.2 Notifica',
    section17NotificationList: [
      'Notifica email 30 giorni prima',
      'Banner informativo al login',
      'Accettazione esplicita richiesta'
    ],
    section17NoRetroactivity: '17.3 Non Retroattività - Non modificheremo mai retroattivamente questi termini per ridurre le protezioni già garantite.',
    section17History: 'Cronologia versioni: v1.0 (febbraio 2026) – Versione iniziale',

    section18Title: '18. Cosa Succede se Biography Library Chiude',
    section18Contingency: '18.1 Piano di Contingenza',
    section18ContingencyList: [
      'Notifica anticipata (6 mesi)',
      'Esportazione dati agli utenti (PDF, TXT, RTF, DOCX)',
      'Codice open source pubblico (AGPL v3)',
      'Fork della community possibile',
      'Fondo fiduciario per preservazione archivio'
    ],

    section19Title: '19. Open Source e Trasparenza',
    section19Intro: 'Biography Library è completamente open source (licenza AGPL v3).',
    section19List: [
      'Codice sorgente pubblico su GitHub',
      'Chiunque può verificare come funziona',
      'Chiunque può contribuire',
      'Massima trasparenza',
      'Community può creare fork'
    ],
    section19Badge: 'Badge di autenticità: Solo l\'Associazione Biography Library può rilasciare certificazioni W3C Verifiable Credentials ufficiali.',

    section20Title: '20. Contatti',
    section20DPO: '20.1 Data Protection Officer',
    section20DPOList: [
      'Email: support@biographylibrary.org',
      'Oggetto: "Richiesta Privacy / GDPR / LPD"',
      'Tempo di risposta: 30 giorni'
    ],
    section20Reporting: '20.2 Segnalazioni',
    section20ReportingList: [
      'Pulsante "Segnala" sulla biografia',
      'Email: support@biographylibrary.org'
    ],
    section20Authority: '20.3 Autorità di Vigilanza',
    section20AuthoritySwitzerland: 'Svizzera: IFPDT – Feldeggweg 1, CH-3003 Berna - www.edoeb.admin.ch',
    section20AuthorityEU: 'Unione Europea: Autorità garante del tuo paese',

    section21Title: '21. Lingua e Giurisdizione',
    section21Language: '21.1 Lingua',
    section21LanguageList: 'Disponibile in: Inglese (vincolante), Italiano, Francese, Tedesco',
    section21Law: '21.2 Legge Applicabile',
    section21LawList: [
      'Legge Federale Svizzera sulla Protezione dei Dati (nLPD)',
      'GDPR (per utenti UE/SEE)',
      'Codice Civile Svizzero',
      'Codice Penale Svizzero'
    ],
    section21Jurisdiction: '21.3 Foro Competente',
    section21JurisdictionLocation: 'Tribunali di Lugano, Ticino, Svizzera.',

    section22Title: '22. Accettazione',
    section22Content: 'Utilizzando Biography Library, accetti questa Privacy Policy.',

    lastRevision: 'Ultima Revisione',
    lastRevisionVersion: 'Versione: 1.0',
    lastRevisionDate: 'Data: 9 febbraio 2026',

    footer: 'Biography Library',
    footerTagline: 'Perché ogni vita merita di essere ricordata.',
    footerHost: 'Ospitato in Svizzera – Protetto dalle Leggi Svizzere sulla Privacy',
    footerOpenSource: 'Open Source (AGPL v3) – Trasparente, Verificabile, Per Sempre'
  },

  fr: {
    title: 'Politique de Confidentialité',
    version: 'Version 1.0 – Février 2026',
    effectiveDate: 'Date d\'entrée en vigueur : 9 février 2026',

    section1Title: '1. Qui Nous Sommes',
    section1Mission: 'Mission : Préserver la mémoire humaine à travers une archive permanente, vérifiée et universelle de biographies personnelles.',
    section1Contacts: 'Contacts :',
    section1ContactsList: [
      'Site web : biographylibrary.org',
      'Email : support@biographylibrary.org',
      'Siège : Lugano, Tessin, Suisse'
    ],

    section2Title: '2. Principes Fondamentaux',
    section2Intro: 'Notre Politique de Confidentialité est basée sur les 10 Principes Non Négociables de notre Manifeste :',
    section2Principles: [
      'Propriété des données – Vous possédez votre histoire, nous ne sommes que gardiens',
      'Privacy by Design – Protection maximale dès la conception',
      'Hébergement Suisse – Toutes les données résident exclusivement en Suisse',
      'IA Éthique et Locale – Traitement IA en territoire suisse, aucun envoi à des tiers',
      'Transparence totale – Aucune vente ou partage commercial de vos données',
      'Contrôle utilisateur – Vous décidez qui peut accéder à votre biographie',
      'Minimisation des données – Nous ne collectons que le strict minimum'
    ],

    section3Title: '3. Quelles Données Nous Collectons',
    section3Registration: '3.1 Données d\'Inscription',
    section3RegistrationList: [
      'Nom et prénom',
      'Email',
      'Mot de passe (stocké sous forme cryptée)'
    ],
    section3NeverCollect: 'CE QUE NOUS NE COLLECTONS JAMAIS À L\'INSCRIPTION :',
    section3NeverCollectList: [
      '❌ Documents d\'identité (passeport, carte d\'identité)',
      '❌ Certificats de naissance, mariage ou décès',
      '❌ Données biométriques'
    ],
    section3Verification: '3.2 Vérification d\'Identité – Uniquement sur Signalement',
    section3VerificationRegistration: 'Lors de l\'inscription :',
    section3VerificationOnly: 'Uniquement en cas de signalement ou de doutes raisonnables :',
    section3VerificationDocs: [
      'Auto-attestation (self-attestation)',
      'Vous déclarez sous votre responsabilité que les informations sont véridiques',
      'Document d\'identité (passeport ou carte d\'identité)',
      'Certificat de décès (pour les biographies de défunts signalées)',
      'Autres documents probants si strictement nécessaires'
    ],
    section3VerificationStorage: [
      'Conservés sur des archives hors ligne uniquement pendant le temps nécessaire à la vérification (maximum 90 jours)',
      'Supprimés automatiquement après vérification',
      'Jamais partagés avec des tiers commerciaux'
    ],
    section3Content: '3.3 Contenu Biographique',
    section3ContentList: [
      'Texte de la biographie',
      'Images et photos',
      'Enregistrements vocaux',
      'Vidéos et documents',
      'Métadonnées (dates de création, modifications, langues)'
    ],
    section3Technical: '3.4 Données Techniques et de Navigation',
    section3TechnicalList: [
      'Adresse IP (conservée 12 mois)',
      'Cookies techniques nécessaires',
      'Journaux d\'accès (conservés 12 mois)',
      'Préférences de langue et paramètres utilisateur'
    ],
    section3AI: '3.5 Données générées par l\'IA',
    section3AIList: [
      'Historique des suggestions IA',
      'Prompts et requêtes envoyées à l\'assistant IA',
      'Traitement IA : Exclusivement en territoire suisse'
    ],

    section4Title: '4. Quelles Biographies Vous Pouvez Créer',
    section4Intro: 'Biography Library permet uniquement deux types de biographies :',
    section4Autobiography: '4.1 Autobiographies',
    section4AutobiographyList: [
      'Vous écrivez sur VOTRE vie',
      'Aucun consentement nécessaire de tiers',
      'Contrôle total sur la publication et la confidentialité'
    ],
    section4Deceased: '4.2 Biographies de Personnes Décédées',
    section4DeceasedList: [
      'Personne déjà décédée',
      'Publiée selon la visibilité choisie (privée, lien uniquement ou publique)',
      'Toute personne peut signaler un problème ; notre équipe de modération examine les signalements'
    ],
    section4Prohibited: 'CE QUE VOUS NE POUVEZ PAS FAIRE :',
    section4ProhibitedList: [
      '❌ Créer des biographies de personnes vivantes (autres que vous-même)',
      '❌ Créer des biographies de mineurs (moins de 18 ans)',
      '❌ Publier des biographies sans pouvoir prouver le décès (si requis)'
    ],
    section4Declarations: '4.3 Déclarations Obligatoires',
    section4DeclarationsAutobiography: 'Pour les Autobiographies :',
    section4DeclarationsAutobiographyList: [
      'Je déclare que j\'écris mon autobiographie',
      'Les informations sur mon identité sont véridiques',
      'J\'ai au moins 18 ans',
      'Je suis responsable du contenu que je publie',
      'Je respecterai les droits des personnes vivantes que je pourrais mentionner'
    ],
    section4DeclarationsDeceased: 'Pour les Biographies de Défunts :',
    section4DeclarationsDeceasedList: [
      'Je déclare sous responsabilité civile et pénale que la personne est décédée',
      'Les informations sont véridiques',
      'Je respecterai les droits des personnes vivantes mentionnées',
      'Je comprends que je peux être requis de fournir une preuve du décès'
    ],
    section4FalseDeclarations: 'Les fausses déclarations sont poursuivies en vertu de l\'Art. 179decies CP (usurpation d\'identité)',

    section5Title: '5. Comment Nous Utilisons Vos Données',
    section5Purpose: '5.1 Finalités du Traitement',
    section5PurposeList: [
      'Fournir le service',
      'Assistance IA',
      'Gestion du compte',
      'Sécurité et prévention des abus',
      'Modération du contenu',
      'Conformité légale'
    ],
    section5Never: '5.2 Ce que Nous NE Faisons JAMAIS',
    section5NeverList: [
      '❌ Nous ne vendons pas vos données',
      '❌ Nous n\'utilisons pas vos données pour la publicité ou le profilage commercial',
      '❌ Nous n\'entraînons pas de modèles IA sur votre contenu',
      '❌ Nous ne partageons pas avec les gouvernements (sauf obligation légale selon la loi suisse)',
      '❌ Nous ne modifions jamais rétroactivement ces conditions pour réduire vos protections',
      '❌ Nous ne collectons pas de documents d\'identité sans nécessité opérationnelle concrète'
    ],

    section6Title: '6. Base Juridique du Traitement',
    section6Legal: 'Nous traitons vos données sur la base de :',
    section6LegalList: [
      'Contrat – Pour fournir le service que vous avez demandé',
      'Consentement – Pour les fonctionnalités IA (vous pouvez le révoquer à tout moment)',
      'Obligation Légale – Pour respecter la loi suisse',
      'Intérêt Légitime – Pour prévenir la fraude et garantir la sécurité'
    ],

    section7Title: '7. Avec Qui Nous Partageons Vos Données',
    section7Providers: '7.1 Fournisseurs de Services',
    section7ProvidersList: [
      'Infomaniak SA (hébergement et infrastructure) – Genève et Zurich',
      'Infomaniak Euria (traitement IA) – Modèles open source en Suisse'
    ],
    section7Guarantees: 'Garanties :',
    section7GuaranteesList: [
      'Accords de traitement des données (DPA) conformes à LPD/RGPD',
      'Les données ne quittent jamais la juridiction suisse',
      'Aucun transfert vers les USA, la Chine ou des pays sans protection des données adéquate'
    ],
    section7Family: '7.2 Accès Familial',
    section7FamilyDesc: 'Si vous décidez de partager votre biographie avec des membres de la famille, ils pourront accéder au contenu selon les permissions que vous avez définies.',
    section7Reporting: '7.3 Système de Signalement',
    section7ReportingProcess: [
      'Signalement reçu',
      'Examen dans les 48-72 heures',
      'Demande de documents à l\'auteur (si nécessaire)',
      'Décision : biographie confirmée, supprimée ou modifiée'
    ],
    section7Authorities: '7.4 Autorités Publiques',
    section7AuthoritiesIntro: 'Nous partageons vos données avec les autorités gouvernementales uniquement si :',
    section7AuthoritiesList: [
      'Requis par une ordonnance judiciaire suisse valide',
      'Nécessaire pour prévenir un crime grave',
      'Obligatoire par la loi selon la LPD ou le Code Pénal Suisse'
    ],

    section8Title: '8. Où Sont Stockées Vos Données',
    section8Residency: '8.1 Résidence des Données – 100% Suisse',
    section8ResidencyList: [
      'Serveurs primaires : Infomaniak SA (centres de données Genève et Zurich)',
      'Sauvegardes : Infomaniak (géoréplication interne Suisse)',
      'Traitement IA : Infomaniak – modèles open source résidents en Suisse'
    ],
    section8Security: '8.2 Sécurité Technique',
    section8SecurityList: [
      'Chiffrement en transit (TLS 1.3 ou supérieur)',
      'Chiffrement au repos',
      'Authentification multi-facteurs (MFA) disponible',
      'Row Level Security (RLS) dans la base de données PostgreSQL',
      'Sauvegardes quotidiennes chiffrées',
      'Journaux d\'audit',
      'Code open source (AGPL v3)'
    ],

    section9Title: '9. Contrôle d\'Accès',
    section9Table: [
      ['Niveau de Confidentialité', 'Qui Peut Accéder'],
      ['Privé', 'Seulement vous'],
      ['Famille', 'Vous + les membres de la famille que vous invitez'],
      ['Public', 'Tout le monde (lorsque la visibilité est publique)']
    ],
    section9Note: 'Note : Les biographies commémoratives suivent les mêmes règles de visibilité que les autobiographies. Les signalements sont examinés par notre équipe de modération.',

    section10Title: '10. Vos Droits',
    section10Access: '10.1 Droit d\'Accès',
    section10AccessDesc: 'Vous pouvez demander une copie de toutes les données personnelles que nous détenons sur vous.',
    section10Rectification: '10.2 Droit de Rectification',
    section10RectificationDesc: 'Vous pouvez corriger les informations inexactes ou incomplètes.',
    section10Deletion: '10.3 Droit à l\'Effacement',
    section10DeletionAutobiography: 'Pour les autobiographies : Vous pouvez supprimer complètement votre biographie à tout moment',
    section10DeletionDeceased: [
      'Vous pouvez supprimer la biographie commémorative tant qu\'elle n\'est pas publiquement visible',
      'Si déjà publique, nous évaluerons l\'intérêt historique',
      'Conservation pour obligations légales si nécessaire'
    ],
    section10Portability: '10.4 Droit à la Portabilité',
    section10PortabilityFormats: ['PDF', 'TXT', 'RTF', 'DOCX'],
    section10Opposition: '10.5 Droit d\'Opposition',
    section10OppositionDesc: 'Vous pouvez vous opposer au traitement basé sur l\'intérêt légitime.',
    section10Revoke: '10.6 Droit de Révoquer le Consentement',
    section10RevokeDesc: 'Vous pouvez révoquer le consentement à l\'utilisation de l\'IA à tout moment.',
    section10Complaint: '10.7 Droit de Déposer une Plainte',
    section10ComplaintSwitzerland: 'Suisse : Préposé fédéral à la protection des données et à la transparence (PFPDT) - Feldeggweg 1, CH-3003 Berne - www.edoeb.admin.ch',
    section10ComplaintEU: 'Union Européenne : Autorité de contrôle de votre pays',
    section10Exercise: 'Comment exercer vos droits :',
    section10ExerciseList: [
      'Email : privacy@biographylibrary.org',
      'Objet : "Demande RGPD/LPD"',
      'Délai de réponse : 30 jours'
    ],

    section11Title: '11. Intelligence Artificielle',
    section11What: '11.1 Ce que fait l\'IA',
    section11WhatList: [
      'Corrige la grammaire et la ponctuation',
      'Suggère des formulations plus claires (vous approuvez/refusez)',
      'Aide à organiser la chronologie',
      'Traduit la biographie (vous révisez)',
      'Fournit une assistance à la recherche'
    ],
    section11Never: '11.2 Ce que l\'IA NE fait PAS',
    section11NeverList: [
      '❌ N\'invente pas de faits ou d\'événements',
      '❌ Ne décide pas de ce qui est important',
      '❌ Ne modifie pas sans approbation',
      '❌ Ne publie pas automatiquement',
      '❌ N\'utilise pas votre contenu pour entraîner des modèles commerciaux'
    ],
    section11Transparency: '11.3 Transparence',
    section11TransparencyList: [
      'Chaque suggestion marquée "Suggestion IA"',
      'Historique des modifications visible',
      'Possibilité de désactiver complètement l\'IA'
    ],
    section11Local: '11.4 Traitement Local',
    section11LocalDesc: 'Tout le traitement IA a lieu en Suisse via Infomaniak Euria (modèles Mistral). Aucun transfert vers OpenAI, Google, Microsoft, Anthropic.',
    section11NoTraining: '11.5 PAS d\'Entraînement IA',
    section11NoTrainingDesc: 'Votre contenu biographique n\'est JAMAIS utilisé pour entraîner des modèles IA commerciaux ou open source',

    section12Title: '12. Système de Signalement',
    section12Report: '12.1 Signaler une Violation',
    section12ReportList: [
      'Biographies de personnes encore vivantes',
      'Contenu avec données sensibles sans consentement',
      'Contenu faux ou diffamatoire',
      'Violations de droits d\'auteur',
      'Contenu illégal'
    ],
    section12Process: '12.2 Processus',
    section12ProcessList: [
      'Signalement reçu',
      'Examen humain dans les 48-72 heures',
      'Demande de documents (si nécessaire)',
      'Décision finale'
    ],
    section12Moderation: '12.3 Modération',
    section12ModerationList: [
      'Agent IA (facultatif) scanne uniquement les biographies publiques',
      'Le réviseur humain prend toujours la décision finale',
      'Les biographies privées ne sont JAMAIS scannées'
    ],

    section13Title: '13. Cookies et Suivi',
    section13Technical: '13.1 Cookies Techniques',
    section13TechnicalList: [
      'Cookie de session',
      'Préférence de langue',
      'Jeton CSRF',
      'Durée : Session ou maximum 12 mois'
    ],
    section13NoProfiling: '13.2 PAS de Cookies de Profilage',
    section13NoProfilingDesc: '❌ Nous n\'utilisons pas de cookies tiers pour la publicité ou le suivi.',
    section13NoAnalytics: '13.3 PAS d\'Analytics Invasifs',
    section13NoAnalyticsDesc: '❌ Nous n\'utilisons pas Google Analytics, Facebook Pixel ou autres trackers invasifs. Si nous mettons en œuvre des analytics : uniquement Plausible Analytics ou Matomo auto-hébergé en Suisse.',

    section14Title: '14. Conservation des Données',
    section14Table: [
      ['Type de Données', 'Période de Conservation'],
      ['Informations du compte', 'Jusqu\'à la suppression du compte'],
      ['Contenu biographique', 'Permanent (mission d\'archivage)'],
      ['Journaux d\'accès', '12 mois'],
      ['Adresses IP', '12 mois'],
      ['Documents d\'identité', 'Maximum 90 jours (vérification uniquement)'],
      ['Suggestions IA', 'Jusqu\'à la suppression de la biographie']
    ],

    section15Title: '15. Protection des Mineurs',
    section15Intro: 'Biography Library est destinée aux personnes de plus de 18 ans.',
    section15Minors: 'Mineurs (moins de 18 ans) :',
    section15MinorsList: [
      '❌ Ne peuvent pas créer de comptes',
      '❌ Ne peuvent pas écrire de biographies',
      '❌ Ne peuvent pas être sujets de biographies'
    ],

    section16Title: '16. Transferts Internationaux',
    section16Intro: 'Nous n\'effectuons pas de transferts de données hors de Suisse.',
    section16Guarantees: 'Garanties :',
    section16GuaranteesList: [
      'Utilisateurs UE : Accord d\'Adéquation Suisse-UE',
      'Utilisateurs Suisse : Protection nLPD',
      'Autres utilisateurs : Protection des lois suisses'
    ],
    section16NoTransfer: 'Aucun transfert vers :',
    section16NoTransferList: [
      '❌ USA',
      '❌ Chine',
      '❌ Russie ou pays avec lois sur la vie privée faibles'
    ],

    section17Title: '17. Modifications de la Politique de Confidentialité',
    section17Updates: '17.1 Mises à Jour',
    section17UpdatesList: [
      'Changements réglementaires',
      'Améliorer la clarté',
      'Ajouter de nouvelles fonctionnalités'
    ],
    section17Notification: '17.2 Notification',
    section17NotificationList: [
      'Notification par email 30 jours avant',
      'Bannière informative à la connexion',
      'Acceptation explicite requise'
    ],
    section17NoRetroactivity: '17.3 Pas de Rétroactivité - Nous ne modifierons jamais rétroactivement ces conditions pour réduire les protections déjà garanties.',
    section17History: 'Historique des versions : v1.0 (février 2026) – Version initiale',

    section18Title: '18. Que Se Passe-t-il si Biography Library Ferme',
    section18Contingency: '18.1 Plan de Contingence',
    section18ContingencyList: [
      'Préavis (6 mois)',
      'Export des données aux utilisateurs (PDF, TXT, RTF, DOCX)',
      'Code open source public (AGPL v3)',
      'Fork communautaire possible',
      'Fonds fiduciaire pour la préservation de l\'archive'
    ],

    section19Title: '19. Open Source et Transparence',
    section19Intro: 'Biography Library est entièrement open source (licence AGPL v3).',
    section19List: [
      'Code source public sur GitHub',
      'Tout le monde peut vérifier comment ça fonctionne',
      'Tout le monde peut contribuer',
      'Transparence maximale',
      'La communauté peut créer des forks'
    ],
    section19Badge: 'Badge d\'authenticité : Seule l\'Association Biography Library peut délivrer des certifications W3C Verifiable Credentials officielles.',

    section20Title: '20. Contacts',
    section20DPO: '20.1 Délégué à la Protection des Données',
    section20DPOList: [
      'Email : support@biographylibrary.org',
      'Objet : "Demande Confidentialité / RGPD / LPD"',
      'Délai de réponse : 30 jours'
    ],
    section20Reporting: '20.2 Signalements',
    section20ReportingList: [
      'Bouton "Signaler" sur la biographie',
      'Email : support@biographylibrary.org'
    ],
    section20Authority: '20.3 Autorité de Surveillance',
    section20AuthoritySwitzerland: 'Suisse : PFPDT – Feldeggweg 1, CH-3003 Berne - www.edoeb.admin.ch',
    section20AuthorityEU: 'Union Européenne : Autorité de contrôle de votre pays',

    section21Title: '21. Langue et Juridiction',
    section21Language: '21.1 Langue',
    section21LanguageList: 'Disponible en : Anglais (contraignant), Italien, Français, Allemand',
    section21Law: '21.2 Loi Applicable',
    section21LawList: [
      'Loi Fédérale Suisse sur la Protection des Données (nLPD)',
      'RGPD (pour les utilisateurs UE/EEE)',
      'Code Civil Suisse',
      'Code Pénal Suisse'
    ],
    section21Jurisdiction: '21.3 For Compétent',
    section21JurisdictionLocation: 'Tribunaux de Lugano, Tessin, Suisse.',

    section22Title: '22. Acceptation',
    section22Content: 'En utilisant Biography Library, vous acceptez cette Politique de Confidentialité.',

    lastRevision: 'Dernière Révision',
    lastRevisionVersion: 'Version : 1.0',
    lastRevisionDate: 'Date : 9 février 2026',

    footer: 'Biography Library',
    footerTagline: 'Parce que chaque vie mérite d\'être rappelée.',
    footerHost: 'Hébergé en Suisse – Protégé par les Lois Suisses sur la Confidentialité',
    footerOpenSource: 'Open Source (AGPL v3) – Transparent, Auditable, Pour Toujours'
  },

  de: {
    title: 'Datenschutzerklärung',
    version: 'Version 1.0 – Februar 2026',
    effectiveDate: 'Wirksamkeitsdatum: 9. Februar 2026',

    section1Title: '1. Wer Wir Sind',
    section1Mission: 'Mission: Das menschliche Gedächtnis durch ein permanentes, verifiziertes und universelles Archiv persönlicher Biografien bewahren.',
    section1Contacts: 'Kontakt:',
    section1ContactsList: [
      'Website: biographylibrary.org',
      'E-Mail: support@biographylibrary.org',
      'Hauptsitz: Lugano, Tessin, Schweiz'
    ],

    section2Title: '2. Grundprinzipien',
    section2Intro: 'Unsere Datenschutzerklärung basiert auf den 10 nicht verhandelbaren Prinzipien unseres Manifests:',
    section2Principles: [
      'Dateneigentum – Sie besitzen Ihre Geschichte, wir sind nur Verwahrer',
      'Privacy by Design – Maximaler Schutz von der Planung an',
      'Schweizer Hosting – Alle Daten befinden sich ausschließlich in der Schweiz',
      'Ethische und lokale KI – KI-Verarbeitung auf Schweizer Gebiet, kein Versand an Dritte',
      'Totale Transparenz – Kein Verkauf oder kommerzielle Weitergabe Ihrer Daten',
      'Benutzerkontrolle – Sie entscheiden, wer auf Ihre Biografie zugreifen kann',
      'Datenminimierung – Wir sammeln nur das absolute Minimum'
    ],

    section3Title: '3. Welche Daten Wir Sammeln',
    section3Registration: '3.1 Registrierungsdaten',
    section3RegistrationList: [
      'Vor- und Nachname',
      'E-Mail',
      'Passwort (verschlüsselt gespeichert)'
    ],
    section3NeverCollect: 'WAS WIR NIE BEI DER REGISTRIERUNG SAMMELN:',
    section3NeverCollectList: [
      '❌ Ausweisdokumente (Reisepass, Personalausweis)',
      '❌ Geburts-, Heirats- oder Sterbeurkunden',
      '❌ Biometrische Daten'
    ],
    section3Verification: '3.2 Identitätsprüfung – Nur bei Meldung',
    section3VerificationRegistration: 'Bei der Registrierung:',
    section3VerificationOnly: 'Nur bei Meldung oder begründeten Zweifeln:',
    section3VerificationDocs: [
      'Selbstbescheinigung',
      'Sie erklären unter Ihrer Verantwortung, dass die Informationen wahrheitsgemäß sind',
      'Ausweisdokument (Reisepass oder Personalausweis)',
      'Sterbeurkunde (für gemeldete Biografien Verstorbener)',
      'Andere Nachweisdokumente, falls unbedingt erforderlich'
    ],
    section3VerificationStorage: [
      'Auf Offline-Archiven nur für die zur Überprüfung erforderliche Zeit gespeichert (maximal 90 Tage)',
      'Automatisch nach der Überprüfung gelöscht',
      'Niemals mit kommerziellen Dritten geteilt'
    ],
    section3Content: '3.3 Biografischer Inhalt',
    section3ContentList: [
      'Biografietext',
      'Bilder und Fotos',
      'Sprachaufnahmen',
      'Videos und Dokumente',
      'Metadaten (Erstellungsdaten, Änderungen, Sprachen)'
    ],
    section3Technical: '3.4 Technische und Navigationsdaten',
    section3TechnicalList: [
      'IP-Adresse (12 Monate gespeichert)',
      'Notwendige technische Cookies',
      'Zugriffsprotokolle (12 Monate gespeichert)',
      'Spracheinstellungen und Benutzereinstellungen'
    ],
    section3AI: '3.5 KI-generierte Daten',
    section3AIList: [
      'KI-Vorschlagsverlauf',
      'Prompts und an KI-Assistenten gesendete Anfragen',
      'KI-Verarbeitung: Ausschließlich auf Schweizer Territorium'
    ],

    section4Title: '4. Welche Biografien Sie Erstellen Können',
    section4Intro: 'Biography Library erlaubt nur zwei Arten von Biografien:',
    section4Autobiography: '4.1 Autobiografien',
    section4AutobiographyList: [
      'Sie schreiben über IHR Leben',
      'Keine Zustimmung von Dritten erforderlich',
      'Volle Kontrolle über Veröffentlichung und Privatsphäre'
    ],
    section4Deceased: '4.2 Biografien Verstorbener Personen',
    section4DeceasedList: [
      'Person bereits verstorben',
      'Veröffentlicht gemäß gewählter Sichtbarkeit (privat, nur Link oder öffentlich)',
      'Jede Person kann Bedenken melden; unser Moderationsteam prüft Meldungen'
    ],
    section4Prohibited: 'WAS SIE NICHT TUN KÖNNEN:',
    section4ProhibitedList: [
      '❌ Biografien lebender Personen (außer sich selbst) erstellen',
      '❌ Biografien Minderjähriger (unter 18 Jahren) erstellen',
      '❌ Biografien veröffentlichen, ohne den Tod nachweisen zu können (falls erforderlich)'
    ],
    section4Declarations: '4.3 Obligatorische Erklärungen',
    section4DeclarationsAutobiography: 'Für Autobiografien:',
    section4DeclarationsAutobiographyList: [
      'Ich erkläre, dass ich meine Autobiografie schreibe',
      'Die Informationen über meine Identität sind wahrheitsgemäß',
      'Ich bin mindestens 18 Jahre alt',
      'Ich bin für die Inhalte verantwortlich, die ich veröffentliche',
      'Ich werde die Rechte lebender Personen respektieren, die ich erwähnen könnte'
    ],
    section4DeclarationsDeceased: 'Für Biografien Verstorbener:',
    section4DeclarationsDeceasedList: [
      'Ich erkläre unter zivil- und strafrechtlicher Haftung, dass die Person verstorben ist',
      'Die Informationen sind wahrheitsgemäß',
      'Ich werde die Rechte lebender erwähnter Personen respektieren',
      'Ich verstehe, dass ich möglicherweise einen Todesnachweis erbringen muss'
    ],
    section4FalseDeclarations: 'Falsche Erklärungen sind gemäß Art. 179decies StGB (Identitätsdiebstahl) strafbar',

    section5Title: '5. Wie Wir Ihre Daten Verwenden',
    section5Purpose: '5.1 Verarbeitungszwecke',
    section5PurposeList: [
      'Dienst bereitstellen',
      'KI-Unterstützung',
      'Kontoverwaltung',
      'Sicherheit und Missbrauchsprävention',
      'Inhaltsmoderation',
      'Rechtliche Compliance'
    ],
    section5Never: '5.2 Was Wir NIEMALS Tun',
    section5NeverList: [
      '❌ Wir verkaufen Ihre Daten nicht',
      '❌ Wir verwenden Ihre Daten nicht für Werbung oder kommerzielle Profilbildung',
      '❌ Wir trainieren keine KI-Modelle mit Ihren Inhalten',
      '❌ Wir teilen nicht mit Regierungen (außer bei gesetzlicher Verpflichtung nach Schweizer Recht)',
      '❌ Wir ändern diese Bedingungen niemals rückwirkend, um Ihre Schutzrechte zu verringern',
      '❌ Wir sammeln keine Ausweisdokumente ohne konkreten betrieblichen Bedarf'
    ],

    section6Title: '6. Rechtsgrundlage der Verarbeitung',
    section6Legal: 'Wir verarbeiten Ihre Daten auf Grundlage von:',
    section6LegalList: [
      'Vertrag – Um den von Ihnen angeforderten Dienst bereitzustellen',
      'Einwilligung – Für KI-Funktionen (Sie können jederzeit widerrufen)',
      'Rechtliche Verpflichtung – Um das Schweizer Recht einzuhalten',
      'Berechtigtes Interesse – Um Betrug zu verhindern und Sicherheit zu gewährleisten'
    ],

    section7Title: '7. Mit Wem Wir Ihre Daten Teilen',
    section7Providers: '7.1 Dienstanbieter',
    section7ProvidersList: [
      'Infomaniak SA (Hosting und Infrastruktur) – Genf und Zürich',
      'Infomaniak Euria (KI-Verarbeitung) – Open-Source-Modelle in der Schweiz'
    ],
    section7Guarantees: 'Garantien:',
    section7GuaranteesList: [
      'Datenverarbeitungsvereinbarungen (DPA) gemäß DSG/DSGVO',
      'Daten verlassen niemals die Schweizer Gerichtsbarkeit',
      'Keine Übertragungen in die USA, China oder Länder ohne angemessenen Datenschutz'
    ],
    section7Family: '7.2 Familienzugriff',
    section7FamilyDesc: 'Wenn Sie Ihre Biografie mit Familienmitgliedern teilen, können diese gemäß Ihren Berechtigungen auf den Inhalt zugreifen.',
    section7Reporting: '7.3 Meldesystem',
    section7ReportingProcess: [
      'Meldung erhalten',
      'Überprüfung innerhalb von 48-72 Stunden',
      'Dokumentenanforderung beim Autor (falls erforderlich)',
      'Entscheidung: Biografie bestätigt, entfernt oder geändert'
    ],
    section7Authorities: '7.4 Öffentliche Behörden',
    section7AuthoritiesIntro: 'Wir teilen Ihre Daten mit Regierungsbehörden nur, wenn:',
    section7AuthoritiesList: [
      'Von einer gültigen Schweizer Gerichtsanordnung verlangt',
      'Notwendig zur Verhinderung eines schweren Verbrechens',
      'Gesetzlich vorgeschrieben gemäß DSG oder Schweizer Strafgesetzbuch'
    ],

    section8Title: '8. Wo Ihre Daten Gespeichert Werden',
    section8Residency: '8.1 Datenspeicherort – 100% Schweiz',
    section8ResidencyList: [
      'Primäre Server: Infomaniak SA (Rechenzentren Genf und Zürich)',
      'Backups: Infomaniak (interne Schweizer Georeplikation)',
      'KI-Verarbeitung: Infomaniak – Open-Source-Modelle in der Schweiz'
    ],
    section8Security: '8.2 Technische Sicherheit',
    section8SecurityList: [
      'Verschlüsselung während der Übertragung (TLS 1.3 oder höher)',
      'Verschlüsselung im Ruhezustand',
      'Multi-Faktor-Authentifizierung (MFA) verfügbar',
      'Row Level Security (RLS) in PostgreSQL-Datenbank',
      'Tägliche verschlüsselte Backups',
      'Audit-Protokolle',
      'Open-Source-Code (AGPL v3)'
    ],

    section9Title: '9. Zugriffskontrolle',
    section9Table: [
      ['Datenschutzstufe', 'Wer Kann Zugreifen'],
      ['Privat', 'Nur Sie'],
      ['Familie', 'Sie + eingeladene Familienmitglieder'],
      ['Öffentlich', 'Alle (wenn Sichtbarkeit auf öffentlich gesetzt ist)']
    ],
    section9Note: 'Hinweis: Gedenkbiografien folgen denselben Sichtbarkeitsregeln wie Autobiografien. Meldungen werden von unserem Moderationsteam geprüft.',

    section10Title: '10. Ihre Rechte',
    section10Access: '10.1 Auskunftsrecht',
    section10AccessDesc: 'Sie können eine Kopie aller persönlichen Daten anfordern, die wir über Sie gespeichert haben.',
    section10Rectification: '10.2 Recht auf Berichtigung',
    section10RectificationDesc: 'Sie können ungenaue oder unvollständige Informationen korrigieren.',
    section10Deletion: '10.3 Recht auf Löschung',
    section10DeletionAutobiography: 'Für Autobiografien: Sie können Ihre Biografie jederzeit vollständig löschen',
    section10DeletionDeceased: [
      'Sie können die Gedenkbiografie löschen, solange sie nicht öffentlich sichtbar ist',
      'Wenn bereits öffentlich, werden wir das historische Interesse bewerten',
      'Aufbewahrung bei rechtlichen Verpflichtungen falls erforderlich'
    ],
    section10Portability: '10.4 Recht auf Datenübertragbarkeit',
    section10PortabilityFormats: ['PDF', 'TXT', 'RTF', 'DOCX'],
    section10Opposition: '10.5 Widerspruchsrecht',
    section10OppositionDesc: 'Sie können der Verarbeitung aufgrund berechtigten Interesses widersprechen.',
    section10Revoke: '10.6 Recht auf Widerruf der Einwilligung',
    section10RevokeDesc: 'Sie können die Einwilligung zur KI-Nutzung jederzeit widerrufen.',
    section10Complaint: '10.7 Beschwerderecht',
    section10ComplaintSwitzerland: 'Schweiz: Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter (EDÖB) - Feldeggweg 1, CH-3003 Bern - www.edoeb.admin.ch',
    section10ComplaintEU: 'Europäische Union: Aufsichtsbehörde Ihres Landes',
    section10Exercise: 'So üben Sie Ihre Rechte aus:',
    section10ExerciseList: [
      'E-Mail: privacy@biographylibrary.org',
      'Betreff: "DSGVO/DSG-Anfrage"',
      'Antwortzeit: 30 Tage'
    ],

    section11Title: '11. Künstliche Intelligenz',
    section11What: '11.1 Was die KI macht',
    section11WhatList: [
      'Korrigiert Grammatik und Zeichensetzung',
      'Schlägt klarere Formulierungen vor (Sie genehmigen/lehnen ab)',
      'Hilft bei der Organisation der Zeitleiste',
      'Übersetzt die Biografie (Sie überprüfen)',
      'Bietet Rechercheunterstützung'
    ],
    section11Never: '11.2 Was die KI NICHT macht',
    section11NeverList: [
      '❌ Erfindet keine Fakten oder Ereignisse',
      '❌ Entscheidet nicht, was wichtig ist',
      '❌ Ändert nicht ohne Genehmigung',
      '❌ Veröffentlicht nicht automatisch',
      '❌ Verwendet Ihre Inhalte nicht zum Trainieren kommerzieller Modelle'
    ],
    section11Transparency: '11.3 Transparenz',
    section11TransparencyList: [
      'Jeder Vorschlag mit "KI-Vorschlag" markiert',
      'Änderungsverlauf sichtbar',
      'Möglichkeit, KI vollständig zu deaktivieren'
    ],
    section11Local: '11.4 Lokale Verarbeitung',
    section11LocalDesc: 'Alle KI-Verarbeitung erfolgt in der Schweiz über Infomaniak Euria (Mistral-Modelle). Keine Übertragung an OpenAI, Google, Microsoft, Anthropic.',
    section11NoTraining: '11.5 KEIN KI-Training',
    section11NoTrainingDesc: 'Ihre biografischen Inhalte werden NIEMALS zum Trainieren kommerzieller oder Open-Source-KI-Modelle verwendet',

    section12Title: '12. Meldesystem',
    section12Report: '12.1 Verstoß melden',
    section12ReportList: [
      'Biografien noch lebender Personen',
      'Inhalte mit sensiblen Daten ohne Zustimmung',
      'Falsche oder diffamierende Inhalte',
      'Urheberrechtsverletzungen',
      'Illegale Inhalte'
    ],
    section12Process: '12.2 Prozess',
    section12ProcessList: [
      'Meldung erhalten',
      'Menschliche Überprüfung innerhalb von 48-72 Stunden',
      'Dokumentenanforderung (falls erforderlich)',
      'Endgültige Entscheidung'
    ],
    section12Moderation: '12.3 Moderation',
    section12ModerationList: [
      'KI-Agent (optional) scannt nur öffentliche Biografien',
      'Menschlicher Prüfer trifft immer die endgültige Entscheidung',
      'Private Biografien werden NIEMALS gescannt'
    ],

    section13Title: '13. Cookies und Tracking',
    section13Technical: '13.1 Technische Cookies',
    section13TechnicalList: [
      'Session-Cookie',
      'Spracheinstellung',
      'CSRF-Token',
      'Dauer: Sitzung oder maximal 12 Monate'
    ],
    section13NoProfiling: '13.2 KEINE Profilierungs-Cookies',
    section13NoProfilingDesc: '❌ Wir verwenden keine Drittanbieter-Cookies für Werbung oder Tracking.',
    section13NoAnalytics: '13.3 KEINE invasiven Analytics',
    section13NoAnalyticsDesc: '❌ Wir verwenden kein Google Analytics, Facebook Pixel oder andere invasive Tracker. Falls wir Analytics implementieren: nur Plausible Analytics oder Matomo selbst gehostet in der Schweiz.',

    section14Title: '14. Datenspeicherung',
    section14Table: [
      ['Datentyp', 'Aufbewahrungsfrist'],
      ['Kontoinformationen', 'Bis zur Kontolöschung'],
      ['Biografische Inhalte', 'Dauerhaft (Archivierungsauftrag)'],
      ['Zugriffsprotokolle', '12 Monate'],
      ['IP-Adressen', '12 Monate'],
      ['Ausweisdokumente', 'Maximal 90 Tage (nur Überprüfung)'],
      ['KI-Vorschläge', 'Bis zur Biografielöschung']
    ],

    section15Title: '15. Schutz Minderjähriger',
    section15Intro: 'Biography Library ist für Personen über 18 Jahre bestimmt.',
    section15Minors: 'Minderjährige (unter 18 Jahren):',
    section15MinorsList: [
      '❌ Können keine Konten erstellen',
      '❌ Können keine Biografien schreiben',
      '❌ Können nicht Gegenstand von Biografien sein'
    ],

    section16Title: '16. Internationale Übertragungen',
    section16Intro: 'Wir führen keine Datenübertragungen außerhalb der Schweiz durch.',
    section16Guarantees: 'Garantien:',
    section16GuaranteesList: [
      'EU-Benutzer: Schweiz-EU-Angemessenheitsbeschluss',
      'Schweizer Benutzer: nDSG-Schutz',
      'Andere Benutzer: Schutz durch Schweizer Gesetze'
    ],
    section16NoTransfer: 'Keine Übertragung an:',
    section16NoTransferList: [
      '❌ USA',
      '❌ China',
      '❌ Russland oder Länder mit schwachen Datenschutzgesetzen'
    ],

    section17Title: '17. Änderungen der Datenschutzerklärung',
    section17Updates: '17.1 Aktualisierungen',
    section17UpdatesList: [
      'Regulatorische Änderungen',
      'Klarheit verbessern',
      'Neue Funktionen hinzufügen'
    ],
    section17Notification: '17.2 Benachrichtigung',
    section17NotificationList: [
      'E-Mail-Benachrichtigung 30 Tage im Voraus',
      'Informationsbanner beim Login',
      'Ausdrückliche Zustimmung erforderlich'
    ],
    section17NoRetroactivity: '17.3 Keine Rückwirkung - Wir werden diese Bedingungen niemals rückwirkend ändern, um bereits garantierte Schutzrechte zu verringern.',
    section17History: 'Versionsverlauf: v1.0 (Februar 2026) – Erstversion',

    section18Title: '18. Was Passiert, Wenn Biography Library Schließt',
    section18Contingency: '18.1 Notfallplan',
    section18ContingencyList: [
      'Vorankündigung (6 Monate)',
      'Datenexport an Benutzer (PDF, TXT, RTF, DOCX)',
      'Öffentlicher Open-Source-Code (AGPL v3)',
      'Community-Fork möglich',
      'Treuhandfonds zur Archiverhaltung'
    ],

    section19Title: '19. Open Source und Transparenz',
    section19Intro: 'Biography Library ist vollständig Open Source (AGPL v3-Lizenz).',
    section19List: [
      'Öffentlicher Quellcode auf GitHub',
      'Jeder kann überprüfen, wie es funktioniert',
      'Jeder kann beitragen',
      'Maximale Transparenz',
      'Community kann Forks erstellen'
    ],
    section19Badge: 'Authentizitätsabzeichen: Nur der Verein Biography Library kann offizielle W3C Verifiable Credentials-Zertifizierungen ausstellen.',

    section20Title: '20. Kontakt',
    section20DPO: '20.1 Datenschutzbeauftragter',
    section20DPOList: [
      'E-Mail: support@biographylibrary.org',
      'Betreff: "Datenschutzanfrage / DSGVO / DSG"',
      'Antwortzeit: 30 Tage'
    ],
    section20Reporting: '20.2 Meldungen',
    section20ReportingList: [
      'Schaltfläche "Melden" in der Biografie',
      'E-Mail: support@biographylibrary.org'
    ],
    section20Authority: '20.3 Aufsichtsbehörde',
    section20AuthoritySwitzerland: 'Schweiz: EDÖB – Feldeggweg 1, CH-3003 Bern - www.edoeb.admin.ch',
    section20AuthorityEU: 'Europäische Union: Aufsichtsbehörde Ihres Landes',

    section21Title: '21. Sprache und Gerichtsstand',
    section21Language: '21.1 Sprache',
    section21LanguageList: 'Verfügbar in: Englisch (verbindlich), Italienisch, Französisch, Deutsch',
    section21Law: '21.2 Anwendbares Recht',
    section21LawList: [
      'Schweizerisches Datenschutzgesetz (nDSG)',
      'DSGVO (für EU/EWR-Benutzer)',
      'Schweizerisches Zivilgesetzbuch',
      'Schweizerisches Strafgesetzbuch'
    ],
    section21Jurisdiction: '21.3 Zuständiges Gericht',
    section21JurisdictionLocation: 'Gerichte von Lugano, Tessin, Schweiz.',

    section22Title: '22. Zustimmung',
    section22Content: 'Durch die Nutzung von Biography Library akzeptieren Sie diese Datenschutzerklärung.',

    lastRevision: 'Letzte Überarbeitung',
    lastRevisionVersion: 'Version: 1.0',
    lastRevisionDate: 'Datum: 9. Februar 2026',

    footer: 'Biography Library',
    footerTagline: 'Weil jedes Leben es verdient, erinnert zu werden.',
    footerHost: 'Gehostet in der Schweiz – Geschützt durch Schweizer Datenschutzgesetze',
    footerOpenSource: 'Open Source (AGPL v3) – Transparent, Prüfbar, Für Immer'
  }
};
