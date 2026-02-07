export type Language = 'en' | 'it' | 'fr' | 'de';

export interface Translations {
  common: {
    loading: string;
    saving: string;
    saved: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    back: string;
    close: string;
    confirm: string;
    signOut: string;
  };
  nav: {
    dashboard: string;
    biography: string;
    settings: string;
    logout: string;
  };
  auth: {
    login: string;
    register: string;
    email: string;
    password: string;
    name: string;
    confirmPassword: string;
    alreadyHaveAccount: string;
    dontHaveAccount: string;
    signIn: string;
    signUp: string;
    loggingIn: string;
    creatingAccount: string;
    welcomeBack: string;
    signInSubtitle: string;
    createYourAccount: string;
    registerSubtitle: string;
    fullName: string;
    yourName: string;
    emailPlaceholder: string;
    enterPassword: string;
    atLeastSixChars: string;
    repeatPassword: string;
    passwordsDoNotMatch: string;
    passwordMinLength: string;
    createOne: string;
    createAccount: string;
  };
  dashboard: {
    title: string;
    createBiography: string;
    loadDemo: string;
    noBiographies: string;
    noBiographiesSubtitle: string;
    totalBiographies: string;
    wordsWritten: string;
    completedSections: string;
    lastUpdated: string;
    draft: string;
    completed: string;
    private: string;
    family: string;
    public: string;
    welcome: string;
    yourWorkspace: string;
    yourBiographies: string;
    tryAgain: string;
    drafts: string;
  };
  biography: {
    newBiography: string;
    biographyTitle: string;
    titlePlaceholder: string;
    selectLanguage: string;
    privacyLevel: string;
    createButton: string;
    creating: string;
    deleteTitle: string;
    deleteMessage: string;
    deleting: string;
    sections: string;
    todos: string;
    aiSuggestions: string;
    shareLink: string;
    exportPdf: string;
    exporting: string;
    continueWriting: string;
    untitled: string;
    updated: string;
    startDescription: string;
    onlyYouCanAccess: string;
    shareWithFamily: string;
    anyoneWithLink: string;
    enterTitle: string;
    failedToCreate: string;
    notFound: string;
    returnToDashboard: string;
    startWritingButton: string;
    titleLabel: string;
    privacyLabel: string;
  };
  sectionTitles: {
    childhood: string;
    family: string;
    education: string;
    career: string;
    'life-events': string;
    relationships: string;
    challenges: string;
    passions: string;
    legacy: string;
  };
  sections: {
    earlyYears: string;
    family: string;
    education: string;
    career: string;
    relationships: string;
    achievements: string;
    challenges: string;
    hobbies: string;
    wisdom: string;
    legacy: string;
    noContent: string;
    noContentHint: string;
    startWriting: string;
  };
  ai: {
    suggestions: string;
    improve: string;
    expand: string;
    grammar: string;
    guidedPrompt: string;
    generating: string;
    noSuggestions: string;
  };
  editor: {
    checkGrammar: string;
    needHelp: string;
    summarize: string;
    aiOn: string;
    aiOff: string;
    chars: string;
    startWritingAbout: string;
    markAsTodo: string;
    grammarStyle: string;
    writingPrompts: string;
    sectionSummary: string;
    aiDisclaimer: string;
    analyzingWithAi: string;
    lookingGood: string;
    noGrammarIssues: string;
    suggestionsFound: string;
    clickPromptToInsert: string;
    noSummary: string;
    original: string;
    suggestion: string;
    accept: string;
    reject: string;
    applied: string;
    dismissed: string;
    unsaved: string;
    saveFailed: string;
    todoItems: string;
    signInForAi: string;
    failedGrammar: string;
    failedSummary: string;
    editorMode: string;
    conversationMode: string;
  };
  formatting: {
    bold: string;
    italic: string;
    underline: string;
    strikethrough: string;
    superscript: string;
    subscript: string;
    alignLeft: string;
    alignCenter: string;
    alignRight: string;
    alignJustify: string;
    heading1: string;
    heading2: string;
    heading3: string;
    paragraph: string;
    bulletList: string;
    numberedList: string;
    increaseIndent: string;
    decreaseIndent: string;
    quote: string;
    horizontalRule: string;
    clearFormatting: string;
  };
  conversation: {
    questionOf: string;
    skipQuestion: string;
    finishSection: string;
    backToEditor: string;
    typeYourAnswer: string;
    send: string;
    generatingDraft: string;
    draftGenerated: string;
    switchToEditorToRefine: string;
    answerMinimum: string;
  };
  status: {
    biographyCompleted: string;
    markedComplete: string;
    draftBiography: string;
    markCompleteWhenFinished: string;
    markComplete: string;
    markAsDraft: string;
    updating: string;
    confirmCompleteTitle: string;
    confirmCompleteMessage: string;
  };
  voice: {
    startRecording: string;
    stopRecording: string;
    recording: string;
    transcribing: string;
    notSupported: string;
    permissionDenied: string;
    record: string;
    clearTranscript: string;
  };
  share: {
    publicLink: string;
    copyLink: string;
    linkCopied: string;
    generateLink: string;
    generating: string;
    shareDescription: string;
    publicViewDescription: string;
    familyViewDescription: string;
    copied: string;
    copy: string;
  };
  view: {
    accessDenied: string;
    notAvailable: string;
    returnHome: string;
    downloadPdf: string;
    by: string;
    preservingStories: string;
    tokenMissing: string;
    notFoundOrDenied: string;
    biographyPrivate: string;
  };
  footer: {
    hostedInSwitzerland: string;
    disclaimer: string;
  };
  welcome: {
    title: string;
    subtitle: string;
    selectLanguage: string;
    continue: string;
  };
  toast: {
    biographySaved: string;
    biographyCreated: string;
    biographyDeleted: string;
    pdfExported: string;
    linkCopied: string;
    demoLoaded: string;
    error: string;
  };
  coach: {
    greeting: string;
    goodMorning: string;
    goodAfternoon: string;
    goodEvening: string;
    wordsWritten: string;
    inSections: string;
    progressComplete: string;
    lastActivity: string;
    daysAgo: string;
    today: string;
    yesterday: string;
    readyWhenYouAre: string;
    almostDone: string;
    wantToFinish: string;
    readyToStart: string;
    guideFirstStory: string;
    conversationPending: string;
    continueConversation: string;
    continueWriting: string;
    startNewSection: string;
    quickSession: string;
    firstHundredWords: string;
    firstSectionComplete: string;
    biographyComplete: string;
    dailyPrompt: string;
    of: string;
    sections: string;
  };
  accessibility: {
    uiFontSize: string;
    editorFontSize: string;
    small: string;
    normal: string;
    large: string;
    extraLarge: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    common: {
      loading: 'Loading...',
      saving: 'Saving...',
      saved: 'Saved',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      back: 'Back',
      close: 'Close',
      confirm: 'Confirm',
      signOut: 'Sign out',
    },
    nav: {
      dashboard: 'Dashboard',
      biography: 'Biography',
      settings: 'Settings',
      logout: 'Logout',
    },
    auth: {
      login: 'Login',
      register: 'Register',
      email: 'Email',
      password: 'Password',
      name: 'Name',
      confirmPassword: 'Confirm Password',
      alreadyHaveAccount: 'Already have an account?',
      dontHaveAccount: "Don't have an account?",
      signIn: 'Sign in',
      signUp: 'Sign up',
      loggingIn: 'Signing in...',
      creatingAccount: 'Creating account...',
      welcomeBack: 'Welcome back',
      signInSubtitle: 'Sign in to continue writing and preserving life stories',
      createYourAccount: 'Create your account',
      registerSubtitle: 'Start preserving and sharing life stories today',
      fullName: 'Full name',
      yourName: 'Your name',
      emailPlaceholder: 'you@example.com',
      enterPassword: 'Enter your password',
      atLeastSixChars: 'At least 6 characters',
      repeatPassword: 'Repeat your password',
      passwordsDoNotMatch: 'Passwords do not match',
      passwordMinLength: 'Password must be at least 6 characters',
      createOne: 'Create one',
      createAccount: 'Create account',
    },
    dashboard: {
      title: 'My Biographies',
      createBiography: 'Create New Biography',
      loadDemo: 'Load Demo Biography',
      noBiographies: 'Start preserving your story',
      noBiographiesSubtitle: 'Create your first biography or load a demo to explore features',
      totalBiographies: 'Total Biographies',
      wordsWritten: 'Words Written',
      completedSections: 'Completed Sections',
      lastUpdated: 'Last Updated',
      draft: 'Draft',
      completed: 'Completed',
      private: 'Private',
      family: 'Family',
      public: 'Public',
      welcome: 'Welcome',
      yourWorkspace: 'Your biography workspace',
      yourBiographies: 'Your Biographies',
      tryAgain: 'Try Again',
      drafts: 'Drafts',
    },
    biography: {
      newBiography: 'New Biography',
      biographyTitle: 'Biography Title',
      titlePlaceholder: 'e.g., My Life Story, Grandma\'s Memories',
      selectLanguage: 'Content Language',
      privacyLevel: 'Privacy Level',
      createButton: 'Create Biography',
      creating: 'Creating...',
      deleteTitle: 'Delete Biography',
      deleteMessage: 'Are you sure you want to delete this biography? This action cannot be undone.',
      deleting: 'Deleting...',
      sections: 'Sections',
      todos: 'To-Do',
      aiSuggestions: 'AI Suggestions',
      shareLink: 'Share Link',
      exportPdf: 'Export PDF',
      exporting: 'Exporting...',
      continueWriting: 'Continue Writing',
      untitled: 'Untitled',
      updated: 'Updated',
      startDescription: 'Start a new biography to capture and preserve a life story.',
      onlyYouCanAccess: 'Only you can access',
      shareWithFamily: 'Share with verified family members',
      anyoneWithLink: 'Anyone with link can view',
      enterTitle: 'Please enter a title',
      failedToCreate: 'Failed to create biography',
      notFound: 'Biography not found.',
      returnToDashboard: 'Return to Dashboard',
      startWritingButton: 'Start Writing',
      titleLabel: 'Title',
      privacyLabel: 'Privacy',
    },
    sectionTitles: {
      childhood: 'Childhood & Early Years',
      family: 'Family Background',
      education: 'Education',
      career: 'Career & Work',
      'life-events': 'Important Life Events',
      relationships: 'Relationships & Love',
      challenges: 'Challenges & Lessons Learned',
      passions: 'Passions & Hobbies',
      legacy: 'Legacy & Final Thoughts',
    },
    sections: {
      earlyYears: 'Early Years',
      family: 'Family Background',
      education: 'Education',
      career: 'Career',
      relationships: 'Relationships',
      achievements: 'Achievements',
      challenges: 'Challenges',
      hobbies: 'Hobbies & Interests',
      wisdom: 'Wisdom & Advice',
      legacy: 'Legacy',
      noContent: 'This section is empty',
      noContentHint: 'Start writing or use AI suggestions to help you get started',
      startWriting: 'Start writing your story here...',
    },
    ai: {
      suggestions: 'Suggestions',
      improve: 'Improve Writing',
      expand: 'Expand Content',
      grammar: 'Check Grammar',
      guidedPrompt: 'Get Writing Prompts',
      generating: 'Generating...',
      noSuggestions: 'Select a section to get AI suggestions',
    },
    editor: {
      checkGrammar: 'Check Grammar',
      needHelp: 'Need help?',
      summarize: 'Summarize',
      aiOn: 'AI On',
      aiOff: 'AI Off',
      chars: 'chars',
      startWritingAbout: 'Start writing about',
      markAsTodo: 'Mark as TODO',
      grammarStyle: 'Grammar & Style',
      writingPrompts: 'Writing Prompts',
      sectionSummary: 'Section Summary',
      aiDisclaimer: 'AI processing uses external API. For production, all AI will run on Swiss infrastructure.',
      analyzingWithAi: 'Analyzing with AI...',
      lookingGood: 'Looking good!',
      noGrammarIssues: 'No grammar or style issues found.',
      suggestionsFound: 'suggestion(s) found',
      clickPromptToInsert: 'Click a prompt to insert it as a writing starter.',
      noSummary: 'No summary available.',
      original: 'Original',
      suggestion: 'Suggestion',
      accept: 'Accept',
      reject: 'Reject',
      applied: 'Applied',
      dismissed: 'Dismissed',
      unsaved: 'Unsaved',
      saveFailed: 'Save failed',
      todoItems: 'TODO Items',
      signInForAi: 'You must be signed in to use AI features. Please refresh the page.',
      failedGrammar: 'Failed to check grammar',
      failedSummary: 'Failed to generate summary',
      editorMode: 'Editor Mode',
      conversationMode: 'Conversation Mode',
    },
    formatting: {
      bold: 'Bold',
      italic: 'Italic',
      underline: 'Underline',
      strikethrough: 'Strikethrough',
      superscript: 'Superscript',
      subscript: 'Subscript',
      alignLeft: 'Align Left',
      alignCenter: 'Align Center',
      alignRight: 'Align Right',
      alignJustify: 'Justify',
      heading1: 'Heading 1',
      heading2: 'Heading 2',
      heading3: 'Heading 3',
      paragraph: 'Paragraph',
      bulletList: 'Bullet List',
      numberedList: 'Numbered List',
      increaseIndent: 'Increase Indent',
      decreaseIndent: 'Decrease Indent',
      quote: 'Quote',
      horizontalRule: 'Horizontal Line',
      clearFormatting: 'Clear Formatting',
    },
    conversation: {
      questionOf: 'Question {current} of {total} for {section}',
      skipQuestion: 'Skip this question',
      finishSection: 'Finish this section',
      backToEditor: 'Back to editor',
      typeYourAnswer: 'Type your answer here...',
      send: 'Send',
      generatingDraft: 'Generating draft from your answers...',
      draftGenerated: 'Draft generated successfully!',
      switchToEditorToRefine: 'Switch to Editor Mode to refine your text.',
      answerMinimum: 'Please answer at least 3 questions before finishing.',
    },
    status: {
      biographyCompleted: 'Biography Completed',
      markedComplete: 'This biography is marked as complete',
      draftBiography: 'Draft Biography',
      markCompleteWhenFinished: 'Mark as complete when finished',
      markComplete: 'Mark Complete',
      markAsDraft: 'Mark as Draft',
      updating: 'Updating...',
      confirmCompleteTitle: 'Mark Biography as Complete?',
      confirmCompleteMessage: 'Are you sure you want to mark this biography as complete? Once marked complete, you should share it with at least one family member or executor to ensure it is preserved.',
    },
    voice: {
      startRecording: 'Start Recording',
      stopRecording: 'Stop Recording',
      recording: 'Recording...',
      transcribing: 'Transcribing...',
      notSupported: 'Voice recording not supported in this browser. Please use Chrome, Edge, or Safari.',
      permissionDenied: 'Microphone access denied. Please enable microphone permissions in your browser settings and reload the page.',
      record: 'Record',
      clearTranscript: 'Clear transcript',
    },
    share: {
      publicLink: 'Public Link',
      copyLink: 'Copy Link',
      linkCopied: 'Link Copied',
      generateLink: 'Generate Share Link',
      generating: 'Generating...',
      shareDescription: 'Generate a shareable link for this biography',
      publicViewDescription: 'Anyone with this link can view the biography',
      familyViewDescription: 'Share this link with family members',
      copied: 'Copied',
      copy: 'Copy',
    },
    view: {
      accessDenied: 'Access Denied',
      notAvailable: 'This biography is not available for viewing.',
      returnHome: 'Return Home',
      downloadPdf: 'Download PDF',
      by: 'By',
      preservingStories: 'Biography Library - Preserving Stories in Switzerland',
      tokenMissing: 'Access token is missing',
      notFoundOrDenied: 'Biography not found or access denied',
      biographyPrivate: 'This biography is private',
    },
    footer: {
      hostedInSwitzerland: 'Biography Library Demo - Hosted in Switzerland',
      disclaimer: 'This is a demo. Production version will use Infomaniak Swiss infrastructure.',
    },
    welcome: {
      title: 'Welcome to Biography Library',
      subtitle: 'Please select your preferred language',
      selectLanguage: 'Select Language',
      continue: 'Continue',
    },
    toast: {
      biographySaved: 'Biography saved successfully',
      biographyCreated: 'Biography created successfully',
      biographyDeleted: 'Biography deleted successfully',
      pdfExported: 'PDF exported successfully',
      linkCopied: 'Link copied to clipboard',
      demoLoaded: 'Demo biography loaded successfully',
      error: 'An error occurred',
    },
    coach: {
      greeting: 'Welcome back',
      goodMorning: 'Good morning',
      goodAfternoon: 'Good afternoon',
      goodEvening: 'Good evening',
      wordsWritten: 'words written',
      inSections: 'in {count} sections',
      progressComplete: 'progress complete',
      lastActivity: 'Last activity',
      daysAgo: '{count} days ago',
      today: 'today',
      yesterday: 'yesterday',
      readyWhenYouAre: 'I\'m here when you\'re ready to continue',
      almostDone: 'You\'re almost done with {section}! Want to finish it?',
      wantToFinish: 'Want to finish it?',
      readyToStart: 'Ready to start? I\'ll guide you through your first story.',
      guideFirstStory: 'I\'ll guide you through your first story.',
      conversationPending: 'You have a conversation in progress on {section}. Continue?',
      continueConversation: 'Continue',
      continueWriting: 'Continue where you left off',
      startNewSection: 'Start new section',
      quickSession: 'Quick session (5 min)',
      firstHundredWords: 'First 100 words',
      firstSectionComplete: 'First section complete',
      biographyComplete: 'Biography complete',
      dailyPrompt: 'Daily prompt',
      of: 'of',
      sections: 'sections',
    },
    accessibility: {
      uiFontSize: 'UI Font Size',
      editorFontSize: 'Editor Font Size',
      small: 'Small',
      normal: 'Normal',
      large: 'Large',
      extraLarge: 'Extra Large',
    },
  },
  it: {
    common: {
      loading: 'Caricamento...',
      saving: 'Salvataggio...',
      saved: 'Salvato',
      save: 'Salva',
      cancel: 'Annulla',
      delete: 'Elimina',
      edit: 'Modifica',
      create: 'Crea',
      back: 'Indietro',
      close: 'Chiudi',
      confirm: 'Conferma',
      signOut: 'Esci',
    },
    nav: {
      dashboard: 'Dashboard',
      biography: 'Biografia',
      settings: 'Impostazioni',
      logout: 'Esci',
    },
    auth: {
      login: 'Accedi',
      register: 'Registrati',
      email: 'Email',
      password: 'Password',
      name: 'Nome',
      confirmPassword: 'Conferma Password',
      alreadyHaveAccount: 'Hai gi\u00e0 un account?',
      dontHaveAccount: 'Non hai un account?',
      signIn: 'Accedi',
      signUp: 'Registrati',
      loggingIn: 'Accesso in corso...',
      creatingAccount: 'Creazione account...',
      welcomeBack: 'Bentornato',
      signInSubtitle: 'Accedi per continuare a scrivere e preservare storie di vita',
      createYourAccount: 'Crea il tuo account',
      registerSubtitle: 'Inizia a preservare e condividere storie di vita oggi',
      fullName: 'Nome completo',
      yourName: 'Il tuo nome',
      emailPlaceholder: 'tu@esempio.com',
      enterPassword: 'Inserisci la tua password',
      atLeastSixChars: 'Almeno 6 caratteri',
      repeatPassword: 'Ripeti la tua password',
      passwordsDoNotMatch: 'Le password non corrispondono',
      passwordMinLength: 'La password deve essere di almeno 6 caratteri',
      createOne: 'Creane uno',
      createAccount: 'Crea account',
    },
    dashboard: {
      title: 'Le Mie Biografie',
      createBiography: 'Crea Nuova Biografia',
      loadDemo: 'Carica Biografia Demo',
      noBiographies: 'Inizia a preservare la tua storia',
      noBiographiesSubtitle: 'Crea la tua prima biografia o carica una demo per esplorare le funzionalit\u00e0',
      totalBiographies: 'Biografie Totali',
      wordsWritten: 'Parole Scritte',
      completedSections: 'Sezioni Completate',
      lastUpdated: 'Ultimo Aggiornamento',
      draft: 'Bozza',
      completed: 'Completata',
      private: 'Privata',
      family: 'Famiglia',
      public: 'Pubblica',
      welcome: 'Benvenuto',
      yourWorkspace: 'Il tuo spazio di lavoro per le biografie',
      yourBiographies: 'Le Tue Biografie',
      tryAgain: 'Riprova',
      drafts: 'Bozze',
    },
    biography: {
      newBiography: 'Nuova Biografia',
      biographyTitle: 'Titolo della Biografia',
      titlePlaceholder: 'es., La Mia Storia, I Ricordi della Nonna',
      selectLanguage: 'Lingua del Contenuto',
      privacyLevel: 'Livello di Privacy',
      createButton: 'Crea Biografia',
      creating: 'Creazione...',
      deleteTitle: 'Elimina Biografia',
      deleteMessage: 'Sei sicuro di voler eliminare questa biografia? Questa azione non pu\u00f2 essere annullata.',
      deleting: 'Eliminazione...',
      sections: 'Sezioni',
      todos: 'Da Fare',
      aiSuggestions: 'Suggerimenti AI',
      shareLink: 'Condividi Link',
      exportPdf: 'Esporta PDF',
      exporting: 'Esportazione...',
      continueWriting: 'Continua a Scrivere',
      untitled: 'Senza titolo',
      updated: 'Aggiornato',
      startDescription: 'Inizia una nuova biografia per catturare e preservare una storia di vita.',
      onlyYouCanAccess: 'Solo tu puoi accedere',
      shareWithFamily: 'Condividi con i familiari verificati',
      anyoneWithLink: 'Chiunque con il link pu\u00f2 visualizzare',
      enterTitle: 'Inserisci un titolo',
      failedToCreate: 'Impossibile creare la biografia',
      notFound: 'Biografia non trovata.',
      returnToDashboard: 'Torna alla Dashboard',
      startWritingButton: 'Inizia a Scrivere',
      titleLabel: 'Titolo',
      privacyLabel: 'Privacy',
    },
    sectionTitles: {
      childhood: 'Infanzia e Primi Anni',
      family: 'Origini Familiari',
      education: 'Istruzione',
      career: 'Carriera e Lavoro',
      'life-events': 'Eventi Importanti della Vita',
      relationships: 'Relazioni e Amore',
      challenges: 'Sfide e Lezioni Apprese',
      passions: 'Passioni e Hobby',
      legacy: 'Eredit\u00e0 e Pensieri Finali',
    },
    sections: {
      earlyYears: 'Primi Anni',
      family: 'Origini Familiari',
      education: 'Istruzione',
      career: 'Carriera',
      relationships: 'Relazioni',
      achievements: 'Traguardi',
      challenges: 'Sfide',
      hobbies: 'Hobby e Interessi',
      wisdom: 'Saggezza e Consigli',
      legacy: 'Eredit\u00e0',
      noContent: 'Questa sezione \u00e8 vuota',
      noContentHint: 'Inizia a scrivere o usa i suggerimenti AI per aiutarti',
      startWriting: 'Inizia a scrivere la tua storia qui...',
    },
    ai: {
      suggestions: 'Suggerimenti',
      improve: 'Migliora il Testo',
      expand: 'Espandi Contenuto',
      grammar: 'Controlla Grammatica',
      guidedPrompt: 'Ottieni Spunti di Scrittura',
      generating: 'Generazione...',
      noSuggestions: 'Seleziona una sezione per ottenere suggerimenti AI',
    },
    editor: {
      checkGrammar: 'Controlla Grammatica',
      needHelp: 'Serve aiuto?',
      summarize: 'Riassumi',
      aiOn: 'AI Attiva',
      aiOff: 'AI Disattiva',
      chars: 'caratteri',
      startWritingAbout: 'Inizia a scrivere su',
      markAsTodo: 'Segna come da fare',
      grammarStyle: 'Grammatica e Stile',
      writingPrompts: 'Spunti di Scrittura',
      sectionSummary: 'Riassunto Sezione',
      aiDisclaimer: 'L\'elaborazione AI utilizza un\'API esterna. In produzione, tutta l\'AI funzioner\u00e0 su infrastruttura svizzera.',
      analyzingWithAi: 'Analisi con AI...',
      lookingGood: 'Tutto bene!',
      noGrammarIssues: 'Nessun problema di grammatica o stile trovato.',
      suggestionsFound: 'suggerimento/i trovato/i',
      clickPromptToInsert: 'Clicca su uno spunto per inserirlo come inizio di scrittura.',
      noSummary: 'Nessun riassunto disponibile.',
      original: 'Originale',
      suggestion: 'Suggerimento',
      accept: 'Accetta',
      reject: 'Rifiuta',
      applied: 'Applicato',
      dismissed: 'Ignorato',
      unsaved: 'Non salvato',
      saveFailed: 'Salvataggio fallito',
      todoItems: 'Cose da Fare',
      signInForAi: 'Devi aver effettuato l\'accesso per usare le funzionalit\u00e0 AI. Ricarica la pagina.',
      failedGrammar: 'Impossibile controllare la grammatica',
      failedSummary: 'Impossibile generare il riassunto',
      editorMode: 'Modalità Editor',
      conversationMode: 'Modalità Conversazione',
    },
    formatting: {
      bold: 'Grassetto',
      italic: 'Corsivo',
      underline: 'Sottolineato',
      strikethrough: 'Barrato',
      superscript: 'Apice',
      subscript: 'Pedice',
      alignLeft: 'Allinea Sinistra',
      alignCenter: 'Allinea Centro',
      alignRight: 'Allinea Destra',
      alignJustify: 'Giustificato',
      heading1: 'Titolo 1',
      heading2: 'Titolo 2',
      heading3: 'Titolo 3',
      paragraph: 'Paragrafo Normale',
      bulletList: 'Elenco Puntato',
      numberedList: 'Elenco Numerato',
      increaseIndent: 'Aumenta Rientro',
      decreaseIndent: 'Riduci Rientro',
      quote: 'Citazione',
      horizontalRule: 'Linea Separatrice',
      clearFormatting: 'Rimuovi Formattazione',
    },
    conversation: {
      questionOf: 'Domanda {current} di {total} per {section}',
      skipQuestion: 'Salta questa domanda',
      finishSection: 'Ho finito con questa sezione',
      backToEditor: 'Torna all\'editor',
      typeYourAnswer: 'Scrivi la tua risposta qui...',
      send: 'Invia',
      generatingDraft: 'Generazione bozza dalle tue risposte...',
      draftGenerated: 'Bozza generata con successo!',
      switchToEditorToRefine: 'Passa alla Modalità Editor per perfezionare il testo.',
      answerMinimum: 'Per favore rispondi ad almeno 3 domande prima di finire.',
    },
    status: {
      biographyCompleted: 'Biografia Completata',
      markedComplete: 'Questa biografia \u00e8 contrassegnata come completa',
      draftBiography: 'Biografia in Bozza',
      markCompleteWhenFinished: 'Contrassegna come completa quando hai finito',
      markComplete: 'Segna come Completa',
      markAsDraft: 'Segna come Bozza',
      updating: 'Aggiornamento...',
      confirmCompleteTitle: 'Contrassegnare la Biografia come Completa?',
      confirmCompleteMessage: 'Sei sicuro di voler contrassegnare questa biografia come completa? Una volta completata, dovresti condividerla con almeno un familiare o esecutore per garantirne la conservazione.',
    },
    voice: {
      startRecording: 'Inizia Registrazione',
      stopRecording: 'Ferma Registrazione',
      recording: 'Registrazione...',
      transcribing: 'Trascrizione...',
      notSupported: 'Registrazione vocale non supportata in questo browser. Usa Chrome, Edge o Safari.',
      permissionDenied: 'Accesso al microfono negato. Abilita i permessi del microfono nelle impostazioni del browser e ricarica la pagina.',
      record: 'Registra',
      clearTranscript: 'Cancella trascrizione',
    },
    share: {
      publicLink: 'Link Pubblico',
      copyLink: 'Copia Link',
      linkCopied: 'Link Copiato',
      generateLink: 'Genera Link di Condivisione',
      generating: 'Generazione...',
      shareDescription: 'Genera un link condivisibile per questa biografia',
      publicViewDescription: 'Chiunque con questo link pu\u00f2 visualizzare la biografia',
      familyViewDescription: 'Condividi questo link con i familiari',
      copied: 'Copiato',
      copy: 'Copia',
    },
    view: {
      accessDenied: 'Accesso Negato',
      notAvailable: 'Questa biografia non \u00e8 disponibile per la visualizzazione.',
      returnHome: 'Torna alla Home',
      downloadPdf: 'Scarica PDF',
      by: 'Di',
      preservingStories: 'Biography Library - Preservare Storie in Svizzera',
      tokenMissing: 'Token di accesso mancante',
      notFoundOrDenied: 'Biografia non trovata o accesso negato',
      biographyPrivate: 'Questa biografia \u00e8 privata',
    },
    footer: {
      hostedInSwitzerland: 'Biography Library Demo - Ospitato in Svizzera',
      disclaimer: 'Questa \u00e8 una demo. La versione di produzione utilizzer\u00e0 l\'infrastruttura svizzera di Infomaniak.',
    },
    welcome: {
      title: 'Benvenuto in Biography Library',
      subtitle: 'Seleziona la tua lingua preferita',
      selectLanguage: 'Seleziona Lingua',
      continue: 'Continua',
    },
    toast: {
      biographySaved: 'Biografia salvata con successo',
      biographyCreated: 'Biografia creata con successo',
      biographyDeleted: 'Biografia eliminata con successo',
      pdfExported: 'PDF esportato con successo',
      linkCopied: 'Link copiato negli appunti',
      demoLoaded: 'Biografia demo caricata con successo',
      error: 'Si \u00e8 verificato un errore',
    },
    coach: {
      greeting: 'Bentornato',
      goodMorning: 'Buongiorno',
      goodAfternoon: 'Buon pomeriggio',
      goodEvening: 'Buonasera',
      wordsWritten: 'parole scritte',
      inSections: 'in {count} sezioni',
      progressComplete: 'completato',
      lastActivity: 'Ultima attività',
      daysAgo: '{count} giorni fa',
      today: 'oggi',
      yesterday: 'ieri',
      readyWhenYouAre: 'Sono qui quando sei pronto per continuare',
      almostDone: 'Hai quasi finito con {section}! Vuoi completarla?',
      wantToFinish: 'Vuoi completarla?',
      readyToStart: 'Pronto per iniziare? Ti guiderò nella tua prima storia.',
      guideFirstStory: 'Ti guiderò nella tua prima storia.',
      conversationPending: 'Hai una conversazione in sospeso su {section}. Continua?',
      continueConversation: 'Continua',
      continueWriting: 'Continua dove avevi lasciato',
      startNewSection: 'Inizia nuova sezione',
      quickSession: 'Sessione veloce (5 min)',
      firstHundredWords: 'Prime 100 parole',
      firstSectionComplete: 'Prima sezione completata',
      biographyComplete: 'Biografia completa',
      dailyPrompt: 'Spunto del giorno',
      of: 'di',
      sections: 'sezioni',
    },
    accessibility: {
      uiFontSize: 'Dimensione Testo UI',
      editorFontSize: 'Dimensione Testo Editor',
      small: 'Piccolo',
      normal: 'Normale',
      large: 'Grande',
      extraLarge: 'Molto Grande',
    },
  },
  fr: {
    common: {
      loading: 'Chargement...',
      saving: 'Enregistrement...',
      saved: 'Enregistr\u00e9',
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      create: 'Cr\u00e9er',
      back: 'Retour',
      close: 'Fermer',
      confirm: 'Confirmer',
      signOut: 'Se d\u00e9connecter',
    },
    nav: {
      dashboard: 'Tableau de bord',
      biography: 'Biographie',
      settings: 'Param\u00e8tres',
      logout: 'D\u00e9connexion',
    },
    auth: {
      login: 'Connexion',
      register: 'Inscription',
      email: 'Email',
      password: 'Mot de passe',
      name: 'Nom',
      confirmPassword: 'Confirmer le mot de passe',
      alreadyHaveAccount: 'Vous avez d\u00e9j\u00e0 un compte ?',
      dontHaveAccount: 'Vous n\'avez pas de compte ?',
      signIn: 'Se connecter',
      signUp: 'S\'inscrire',
      loggingIn: 'Connexion en cours...',
      creatingAccount: 'Cr\u00e9ation du compte...',
      welcomeBack: 'Bon retour',
      signInSubtitle: 'Connectez-vous pour continuer \u00e0 \u00e9crire et pr\u00e9server des histoires de vie',
      createYourAccount: 'Cr\u00e9ez votre compte',
      registerSubtitle: 'Commencez \u00e0 pr\u00e9server et partager des histoires de vie',
      fullName: 'Nom complet',
      yourName: 'Votre nom',
      emailPlaceholder: 'vous@exemple.com',
      enterPassword: 'Entrez votre mot de passe',
      atLeastSixChars: 'Au moins 6 caract\u00e8res',
      repeatPassword: 'R\u00e9p\u00e9tez votre mot de passe',
      passwordsDoNotMatch: 'Les mots de passe ne correspondent pas',
      passwordMinLength: 'Le mot de passe doit contenir au moins 6 caract\u00e8res',
      createOne: 'Cr\u00e9er un compte',
      createAccount: 'Cr\u00e9er un compte',
    },
    dashboard: {
      title: 'Mes Biographies',
      createBiography: 'Cr\u00e9er une Nouvelle Biographie',
      loadDemo: 'Charger une Biographie D\u00e9mo',
      noBiographies: 'Commencez \u00e0 pr\u00e9server votre histoire',
      noBiographiesSubtitle: 'Cr\u00e9ez votre premi\u00e8re biographie ou chargez une d\u00e9mo pour explorer les fonctionnalit\u00e9s',
      totalBiographies: 'Biographies Totales',
      wordsWritten: 'Mots \u00c9crits',
      completedSections: 'Sections Compl\u00e9t\u00e9es',
      lastUpdated: 'Derni\u00e8re Mise \u00e0 Jour',
      draft: 'Brouillon',
      completed: 'Termin\u00e9e',
      private: 'Priv\u00e9e',
      family: 'Famille',
      public: 'Publique',
      welcome: 'Bienvenue',
      yourWorkspace: 'Votre espace de travail pour les biographies',
      yourBiographies: 'Vos Biographies',
      tryAgain: 'R\u00e9essayer',
      drafts: 'Brouillons',
    },
    biography: {
      newBiography: 'Nouvelle Biographie',
      biographyTitle: 'Titre de la Biographie',
      titlePlaceholder: 'ex., Mon Histoire, Les Souvenirs de Grand-m\u00e8re',
      selectLanguage: 'Langue du Contenu',
      privacyLevel: 'Niveau de Confidentialit\u00e9',
      createButton: 'Cr\u00e9er la Biographie',
      creating: 'Cr\u00e9ation...',
      deleteTitle: 'Supprimer la Biographie',
      deleteMessage: '\u00cates-vous s\u00fbr de vouloir supprimer cette biographie ? Cette action ne peut pas \u00eatre annul\u00e9e.',
      deleting: 'Suppression...',
      sections: 'Sections',
      todos: '\u00c0 Faire',
      aiSuggestions: 'Suggestions IA',
      shareLink: 'Lien de Partage',
      exportPdf: 'Exporter en PDF',
      exporting: 'Exportation...',
      continueWriting: 'Continuer \u00e0 \u00c9crire',
      untitled: 'Sans titre',
      updated: 'Mis \u00e0 jour',
      startDescription: 'Commencez une nouvelle biographie pour capturer et pr\u00e9server une histoire de vie.',
      onlyYouCanAccess: 'Vous seul pouvez y acc\u00e9der',
      shareWithFamily: 'Partager avec les membres v\u00e9rifi\u00e9s de la famille',
      anyoneWithLink: 'Toute personne avec le lien peut voir',
      enterTitle: 'Veuillez entrer un titre',
      failedToCreate: 'Impossible de cr\u00e9er la biographie',
      notFound: 'Biographie introuvable.',
      returnToDashboard: 'Retour au Tableau de bord',
      startWritingButton: 'Commencer \u00e0 \u00c9crire',
      titleLabel: 'Titre',
      privacyLabel: 'Confidentialit\u00e9',
    },
    sectionTitles: {
      childhood: 'Enfance et Premi\u00e8res Ann\u00e9es',
      family: 'Contexte Familial',
      education: '\u00c9ducation',
      career: 'Carri\u00e8re et Travail',
      'life-events': '\u00c9v\u00e9nements Importants de la Vie',
      relationships: 'Relations et Amour',
      challenges: 'D\u00e9fis et Le\u00e7ons Apprises',
      passions: 'Passions et Loisirs',
      legacy: 'H\u00e9ritage et Pens\u00e9es Finales',
    },
    sections: {
      earlyYears: 'Premi\u00e8res Ann\u00e9es',
      family: 'Contexte Familial',
      education: '\u00c9ducation',
      career: 'Carri\u00e8re',
      relationships: 'Relations',
      achievements: 'R\u00e9alisations',
      challenges: 'D\u00e9fis',
      hobbies: 'Loisirs et Int\u00e9r\u00eats',
      wisdom: 'Sagesse et Conseils',
      legacy: 'H\u00e9ritage',
      noContent: 'Cette section est vide',
      noContentHint: 'Commencez \u00e0 \u00e9crire ou utilisez les suggestions IA pour vous aider',
      startWriting: 'Commencez \u00e0 \u00e9crire votre histoire ici...',
    },
    ai: {
      suggestions: 'Suggestions',
      improve: 'Am\u00e9liorer le Texte',
      expand: 'D\u00e9velopper le Contenu',
      grammar: 'V\u00e9rifier la Grammaire',
      guidedPrompt: 'Obtenir des Suggestions d\'\u00c9criture',
      generating: 'G\u00e9n\u00e9ration...',
      noSuggestions: 'S\u00e9lectionnez une section pour obtenir des suggestions IA',
    },
    editor: {
      checkGrammar: 'V\u00e9rifier la Grammaire',
      needHelp: 'Besoin d\'aide ?',
      summarize: 'R\u00e9sumer',
      aiOn: 'IA Activ\u00e9e',
      aiOff: 'IA D\u00e9sactiv\u00e9e',
      chars: 'caract\u00e8res',
      startWritingAbout: '\u00c9crivez \u00e0 propos de',
      markAsTodo: 'Marquer comme \u00e0 faire',
      grammarStyle: 'Grammaire et Style',
      writingPrompts: 'Suggestions d\'\u00c9criture',
      sectionSummary: 'R\u00e9sum\u00e9 de la Section',
      aiDisclaimer: 'Le traitement IA utilise une API externe. En production, toute l\'IA fonctionnera sur l\'infrastructure suisse.',
      analyzingWithAi: 'Analyse avec l\'IA...',
      lookingGood: 'Tout va bien !',
      noGrammarIssues: 'Aucun probl\u00e8me de grammaire ou de style trouv\u00e9.',
      suggestionsFound: 'suggestion(s) trouv\u00e9e(s)',
      clickPromptToInsert: 'Cliquez sur une suggestion pour l\'ins\u00e9rer comme d\u00e9but d\'\u00e9criture.',
      noSummary: 'Aucun r\u00e9sum\u00e9 disponible.',
      original: 'Original',
      suggestion: 'Suggestion',
      accept: 'Accepter',
      reject: 'Rejeter',
      applied: 'Appliqu\u00e9',
      dismissed: 'Ignor\u00e9',
      unsaved: 'Non enregistr\u00e9',
      saveFailed: '\u00c9chec de l\'enregistrement',
      todoItems: '\u00c0 Faire',
      signInForAi: 'Vous devez \u00eatre connect\u00e9 pour utiliser les fonctionnalit\u00e9s IA. Veuillez rafra\u00eechir la page.',
      failedGrammar: 'Impossible de v\u00e9rifier la grammaire',
      failedSummary: 'Impossible de g\u00e9n\u00e9rer le r\u00e9sum\u00e9',
      editorMode: 'Mode Éditeur',
      conversationMode: 'Mode Conversation',
    },
    formatting: {
      bold: 'Gras',
      italic: 'Italique',
      underline: 'Souligné',
      strikethrough: 'Barré',
      superscript: 'Exposant',
      subscript: 'Indice',
      alignLeft: 'Aligner à Gauche',
      alignCenter: 'Centrer',
      alignRight: 'Aligner à Droite',
      alignJustify: 'Justifier',
      heading1: 'Titre 1',
      heading2: 'Titre 2',
      heading3: 'Titre 3',
      paragraph: 'Paragraphe',
      bulletList: 'Liste à Puces',
      numberedList: 'Liste Numérotée',
      increaseIndent: 'Augmenter Retrait',
      decreaseIndent: 'Réduire Retrait',
      quote: 'Citation',
      horizontalRule: 'Ligne Horizontale',
      clearFormatting: 'Effacer Mise en Forme',
    },
    conversation: {
      questionOf: 'Question {current} sur {total} pour {section}',
      skipQuestion: 'Passer cette question',
      finishSection: 'Terminer cette section',
      backToEditor: 'Retour à l\'éditeur',
      typeYourAnswer: 'Écrivez votre réponse ici...',
      send: 'Envoyer',
      generatingDraft: 'Génération du brouillon à partir de vos réponses...',
      draftGenerated: 'Brouillon généré avec succès !',
      switchToEditorToRefine: 'Passez en Mode Éditeur pour affiner votre texte.',
      answerMinimum: 'Veuillez répondre à au moins 3 questions avant de terminer.',
    },
    status: {
      biographyCompleted: 'Biographie Termin\u00e9e',
      markedComplete: 'Cette biographie est marqu\u00e9e comme termin\u00e9e',
      draftBiography: 'Biographie en Brouillon',
      markCompleteWhenFinished: 'Marquer comme termin\u00e9e une fois finie',
      markComplete: 'Marquer comme Termin\u00e9e',
      markAsDraft: 'Marquer comme Brouillon',
      updating: 'Mise \u00e0 jour...',
      confirmCompleteTitle: 'Marquer la Biographie comme Termin\u00e9e ?',
      confirmCompleteMessage: '\u00cates-vous s\u00fbr de vouloir marquer cette biographie comme termin\u00e9e ? Une fois termin\u00e9e, vous devriez la partager avec au moins un membre de la famille ou un ex\u00e9cuteur pour en assurer la pr\u00e9servation.',
    },
    voice: {
      startRecording: 'D\u00e9marrer l\'Enregistrement',
      stopRecording: 'Arr\u00eater l\'Enregistrement',
      recording: 'Enregistrement...',
      transcribing: 'Transcription...',
      notSupported: 'Enregistrement vocal non support\u00e9 dans ce navigateur. Veuillez utiliser Chrome, Edge ou Safari.',
      permissionDenied: 'Acc\u00e8s au microphone refus\u00e9. Veuillez activer les permissions du microphone dans les param\u00e8tres de votre navigateur et recharger la page.',
      record: 'Enregistrer',
      clearTranscript: 'Effacer la transcription',
    },
    share: {
      publicLink: 'Lien Public',
      copyLink: 'Copier le Lien',
      linkCopied: 'Lien Copi\u00e9',
      generateLink: 'G\u00e9n\u00e9rer un Lien de Partage',
      generating: 'G\u00e9n\u00e9ration...',
      shareDescription: 'G\u00e9n\u00e9rer un lien partageable pour cette biographie',
      publicViewDescription: 'Toute personne avec ce lien peut voir la biographie',
      familyViewDescription: 'Partagez ce lien avec les membres de la famille',
      copied: 'Copi\u00e9',
      copy: 'Copier',
    },
    view: {
      accessDenied: 'Acc\u00e8s Refus\u00e9',
      notAvailable: 'Cette biographie n\'est pas disponible pour la consultation.',
      returnHome: 'Retour \u00e0 l\'Accueil',
      downloadPdf: 'T\u00e9l\u00e9charger le PDF',
      by: 'Par',
      preservingStories: 'Biography Library - Pr\u00e9server des Histoires en Suisse',
      tokenMissing: 'Jeton d\'acc\u00e8s manquant',
      notFoundOrDenied: 'Biographie introuvable ou acc\u00e8s refus\u00e9',
      biographyPrivate: 'Cette biographie est priv\u00e9e',
    },
    footer: {
      hostedInSwitzerland: 'Biography Library Demo - H\u00e9berg\u00e9 en Suisse',
      disclaimer: 'Ceci est une d\u00e9mo. La version de production utilisera l\'infrastructure suisse d\'Infomaniak.',
    },
    welcome: {
      title: 'Bienvenue dans Biography Library',
      subtitle: 'Veuillez s\u00e9lectionner votre langue pr\u00e9f\u00e9r\u00e9e',
      selectLanguage: 'S\u00e9lectionner la Langue',
      continue: 'Continuer',
    },
    toast: {
      biographySaved: 'Biographie enregistr\u00e9e avec succ\u00e8s',
      biographyCreated: 'Biographie cr\u00e9\u00e9e avec succ\u00e8s',
      biographyDeleted: 'Biographie supprim\u00e9e avec succ\u00e8s',
      pdfExported: 'PDF export\u00e9 avec succ\u00e8s',
      linkCopied: 'Lien copi\u00e9 dans le presse-papiers',
      demoLoaded: 'Biographie d\u00e9mo charg\u00e9e avec succ\u00e8s',
      error: 'Une erreur s\'est produite',
    },
    coach: {
      greeting: 'Bon retour',
      goodMorning: 'Bonjour',
      goodAfternoon: 'Bon après-midi',
      goodEvening: 'Bonsoir',
      wordsWritten: 'mots écrits',
      inSections: 'dans {count} sections',
      progressComplete: 'terminé',
      lastActivity: 'Dernière activité',
      daysAgo: 'il y a {count} jours',
      today: 'aujourd\'hui',
      yesterday: 'hier',
      readyWhenYouAre: 'Je suis là quand vous êtes prêt à continuer',
      almostDone: 'Vous avez presque terminé {section}! Voulez-vous la finir?',
      wantToFinish: 'Voulez-vous la finir?',
      readyToStart: 'Prêt à commencer? Je vais vous guider dans votre première histoire.',
      guideFirstStory: 'Je vais vous guider dans votre première histoire.',
      conversationPending: 'Vous avez une conversation en cours sur {section}. Continuer?',
      continueConversation: 'Continuer',
      continueWriting: 'Continuez où vous vous êtes arrêté',
      startNewSection: 'Commencer une nouvelle section',
      quickSession: 'Session rapide (5 min)',
      firstHundredWords: 'Premiers 100 mots',
      firstSectionComplete: 'Première section terminée',
      biographyComplete: 'Biographie terminée',
      dailyPrompt: 'Suggestion du jour',
      of: 'de',
      sections: 'sections',
    },
    accessibility: {
      uiFontSize: 'Taille de Police UI',
      editorFontSize: 'Taille de Police Éditeur',
      small: 'Petit',
      normal: 'Normal',
      large: 'Grand',
      extraLarge: 'Très Grand',
    },
  },
  de: {
    common: {
      loading: 'Laden...',
      saving: 'Speichern...',
      saved: 'Gespeichert',
      save: 'Speichern',
      cancel: 'Abbrechen',
      delete: 'L\u00f6schen',
      edit: 'Bearbeiten',
      create: 'Erstellen',
      back: 'Zur\u00fcck',
      close: 'Schlie\u00dfen',
      confirm: 'Best\u00e4tigen',
      signOut: 'Abmelden',
    },
    nav: {
      dashboard: 'Dashboard',
      biography: 'Biografie',
      settings: 'Einstellungen',
      logout: 'Abmelden',
    },
    auth: {
      login: 'Anmelden',
      register: 'Registrieren',
      email: 'E-Mail',
      password: 'Passwort',
      name: 'Name',
      confirmPassword: 'Passwort best\u00e4tigen',
      alreadyHaveAccount: 'Haben Sie bereits ein Konto?',
      dontHaveAccount: 'Haben Sie noch kein Konto?',
      signIn: 'Anmelden',
      signUp: 'Registrieren',
      loggingIn: 'Anmeldung l\u00e4uft...',
      creatingAccount: 'Konto wird erstellt...',
      welcomeBack: 'Willkommen zur\u00fcck',
      signInSubtitle: 'Melden Sie sich an, um Lebensgeschichten zu schreiben und zu bewahren',
      createYourAccount: 'Erstellen Sie Ihr Konto',
      registerSubtitle: 'Beginnen Sie noch heute, Lebensgeschichten zu bewahren und zu teilen',
      fullName: 'Vollst\u00e4ndiger Name',
      yourName: 'Ihr Name',
      emailPlaceholder: 'sie@beispiel.de',
      enterPassword: 'Geben Sie Ihr Passwort ein',
      atLeastSixChars: 'Mindestens 6 Zeichen',
      repeatPassword: 'Passwort wiederholen',
      passwordsDoNotMatch: 'Passw\u00f6rter stimmen nicht \u00fcberein',
      passwordMinLength: 'Das Passwort muss mindestens 6 Zeichen lang sein',
      createOne: 'Konto erstellen',
      createAccount: 'Konto erstellen',
    },
    dashboard: {
      title: 'Meine Biografien',
      createBiography: 'Neue Biografie Erstellen',
      loadDemo: 'Demo-Biografie Laden',
      noBiographies: 'Beginnen Sie, Ihre Geschichte zu bewahren',
      noBiographiesSubtitle: 'Erstellen Sie Ihre erste Biografie oder laden Sie eine Demo, um die Funktionen zu erkunden',
      totalBiographies: 'Gesamte Biografien',
      wordsWritten: 'Geschriebene W\u00f6rter',
      completedSections: 'Abgeschlossene Abschnitte',
      lastUpdated: 'Zuletzt Aktualisiert',
      draft: 'Entwurf',
      completed: 'Abgeschlossen',
      private: 'Privat',
      family: 'Familie',
      public: '\u00d6ffentlich',
      welcome: 'Willkommen',
      yourWorkspace: 'Ihr Biografie-Arbeitsbereich',
      yourBiographies: 'Ihre Biografien',
      tryAgain: 'Erneut versuchen',
      drafts: 'Entw\u00fcrfe',
    },
    biography: {
      newBiography: 'Neue Biografie',
      biographyTitle: 'Biografietitel',
      titlePlaceholder: 'z.B., Meine Lebensgeschichte, Omas Erinnerungen',
      selectLanguage: 'Inhaltssprache',
      privacyLevel: 'Datenschutzstufe',
      createButton: 'Biografie Erstellen',
      creating: 'Erstellen...',
      deleteTitle: 'Biografie L\u00f6schen',
      deleteMessage: 'Sind Sie sicher, dass Sie diese Biografie l\u00f6schen m\u00f6chten? Diese Aktion kann nicht r\u00fcckg\u00e4ngig gemacht werden.',
      deleting: 'L\u00f6schen...',
      sections: 'Abschnitte',
      todos: 'Aufgaben',
      aiSuggestions: 'KI-Vorschl\u00e4ge',
      shareLink: 'Link Teilen',
      exportPdf: 'PDF Exportieren',
      exporting: 'Exportieren...',
      continueWriting: 'Weiterschreiben',
      untitled: 'Ohne Titel',
      updated: 'Aktualisiert',
      startDescription: 'Beginnen Sie eine neue Biografie, um eine Lebensgeschichte festzuhalten und zu bewahren.',
      onlyYouCanAccess: 'Nur Sie haben Zugriff',
      shareWithFamily: 'Mit verifizierten Familienmitgliedern teilen',
      anyoneWithLink: 'Jeder mit dem Link kann ansehen',
      enterTitle: 'Bitte geben Sie einen Titel ein',
      failedToCreate: 'Biografie konnte nicht erstellt werden',
      notFound: 'Biografie nicht gefunden.',
      returnToDashboard: 'Zur\u00fcck zum Dashboard',
      startWritingButton: 'Mit dem Schreiben beginnen',
      titleLabel: 'Titel',
      privacyLabel: 'Datenschutz',
    },
    sectionTitles: {
      childhood: 'Kindheit und Fr\u00fche Jahre',
      family: 'Familienhintergrund',
      education: 'Bildung',
      career: 'Karriere und Arbeit',
      'life-events': 'Wichtige Lebensereignisse',
      relationships: 'Beziehungen und Liebe',
      challenges: 'Herausforderungen und Lektionen',
      passions: 'Leidenschaften und Hobbys',
      legacy: 'Verm\u00e4chtnis und Abschlie\u00dfende Gedanken',
    },
    sections: {
      earlyYears: 'Fr\u00fche Jahre',
      family: 'Familienhintergrund',
      education: 'Bildung',
      career: 'Karriere',
      relationships: 'Beziehungen',
      achievements: 'Erfolge',
      challenges: 'Herausforderungen',
      hobbies: 'Hobbys & Interessen',
      wisdom: 'Weisheit & Ratschl\u00e4ge',
      legacy: 'Verm\u00e4chtnis',
      noContent: 'Dieser Abschnitt ist leer',
      noContentHint: 'Beginnen Sie zu schreiben oder verwenden Sie KI-Vorschl\u00e4ge zur Unterst\u00fctzung',
      startWriting: 'Beginnen Sie hier, Ihre Geschichte zu schreiben...',
    },
    ai: {
      suggestions: 'Vorschl\u00e4ge',
      improve: 'Text Verbessern',
      expand: 'Inhalt Erweitern',
      grammar: 'Grammatik Pr\u00fcfen',
      guidedPrompt: 'Schreibvorschl\u00e4ge Erhalten',
      generating: 'Generieren...',
      noSuggestions: 'W\u00e4hlen Sie einen Abschnitt, um KI-Vorschl\u00e4ge zu erhalten',
    },
    editor: {
      checkGrammar: 'Grammatik Pr\u00fcfen',
      needHelp: 'Hilfe n\u00f6tig?',
      summarize: 'Zusammenfassen',
      aiOn: 'KI An',
      aiOff: 'KI Aus',
      chars: 'Zeichen',
      startWritingAbout: 'Schreiben Sie \u00fcber',
      markAsTodo: 'Als Aufgabe markieren',
      grammarStyle: 'Grammatik und Stil',
      writingPrompts: 'Schreibvorschl\u00e4ge',
      sectionSummary: 'Abschnittszusammenfassung',
      aiDisclaimer: 'KI-Verarbeitung nutzt eine externe API. In der Produktion wird die gesamte KI auf Schweizer Infrastruktur laufen.',
      analyzingWithAi: 'Analyse mit KI...',
      lookingGood: 'Sieht gut aus!',
      noGrammarIssues: 'Keine Grammatik- oder Stilprobleme gefunden.',
      suggestionsFound: 'Vorschlag/Vorschl\u00e4ge gefunden',
      clickPromptToInsert: 'Klicken Sie auf einen Vorschlag, um ihn als Schreibanfang einzuf\u00fcgen.',
      noSummary: 'Keine Zusammenfassung verf\u00fcgbar.',
      original: 'Original',
      suggestion: 'Vorschlag',
      accept: 'Annehmen',
      reject: 'Ablehnen',
      applied: 'Angewendet',
      dismissed: 'Verworfen',
      unsaved: 'Nicht gespeichert',
      saveFailed: 'Speichern fehlgeschlagen',
      todoItems: 'Aufgaben',
      signInForAi: 'Sie m\u00fcssen angemeldet sein, um KI-Funktionen zu nutzen. Bitte laden Sie die Seite neu.',
      failedGrammar: 'Grammatikpr\u00fcfung fehlgeschlagen',
      failedSummary: 'Zusammenfassung konnte nicht erstellt werden',
      editorMode: 'Editor-Modus',
      conversationMode: 'Konversationsmodus',
    },
    formatting: {
      bold: 'Fett',
      italic: 'Kursiv',
      underline: 'Unterstrichen',
      strikethrough: 'Durchgestrichen',
      superscript: 'Hochgestellt',
      subscript: 'Tiefgestellt',
      alignLeft: 'Linksbündig',
      alignCenter: 'Zentriert',
      alignRight: 'Rechtsbündig',
      alignJustify: 'Blocksatz',
      heading1: 'Überschrift 1',
      heading2: 'Überschrift 2',
      heading3: 'Überschrift 3',
      paragraph: 'Absatz',
      bulletList: 'Aufzählung',
      numberedList: 'Nummerierte Liste',
      increaseIndent: 'Einzug Vergrößern',
      decreaseIndent: 'Einzug Verkleinern',
      quote: 'Zitat',
      horizontalRule: 'Horizontale Linie',
      clearFormatting: 'Formatierung Entfernen',
    },
    conversation: {
      questionOf: 'Frage {current} von {total} für {section}',
      skipQuestion: 'Diese Frage überspringen',
      finishSection: 'Diesen Abschnitt beenden',
      backToEditor: 'Zurück zum Editor',
      typeYourAnswer: 'Geben Sie Ihre Antwort hier ein...',
      send: 'Senden',
      generatingDraft: 'Entwurf wird aus Ihren Antworten generiert...',
      draftGenerated: 'Entwurf erfolgreich generiert!',
      switchToEditorToRefine: 'Wechseln Sie in den Editor-Modus, um Ihren Text zu verfeinern.',
      answerMinimum: 'Bitte beantworten Sie mindestens 3 Fragen, bevor Sie fertig sind.',
    },
    status: {
      biographyCompleted: 'Biografie Abgeschlossen',
      markedComplete: 'Diese Biografie ist als abgeschlossen markiert',
      draftBiography: 'Biografie-Entwurf',
      markCompleteWhenFinished: 'Als abgeschlossen markieren, wenn fertig',
      markComplete: 'Als Abgeschlossen Markieren',
      markAsDraft: 'Als Entwurf Markieren',
      updating: 'Aktualisierung...',
      confirmCompleteTitle: 'Biografie als Abgeschlossen markieren?',
      confirmCompleteMessage: 'Sind Sie sicher, dass Sie diese Biografie als abgeschlossen markieren m\u00f6chten? Nach Abschluss sollten Sie sie mit mindestens einem Familienmitglied oder Testamentsvollstrecker teilen, um ihre Erhaltung sicherzustellen.',
    },
    voice: {
      startRecording: 'Aufnahme Starten',
      stopRecording: 'Aufnahme Stoppen',
      recording: 'Aufnahme...',
      transcribing: 'Transkribieren...',
      notSupported: 'Sprachaufnahme wird in diesem Browser nicht unterst\u00fctzt. Bitte verwenden Sie Chrome, Edge oder Safari.',
      permissionDenied: 'Mikrofonzugriff verweigert. Bitte aktivieren Sie die Mikrofonberechtigungen in Ihren Browsereinstellungen und laden Sie die Seite neu.',
      record: 'Aufnehmen',
      clearTranscript: 'Transkription l\u00f6schen',
    },
    share: {
      publicLink: '\u00d6ffentlicher Link',
      copyLink: 'Link Kopieren',
      linkCopied: 'Link Kopiert',
      generateLink: 'Freigabelink Generieren',
      generating: 'Generieren...',
      shareDescription: 'Generieren Sie einen teilbaren Link f\u00fcr diese Biografie',
      publicViewDescription: 'Jeder mit diesem Link kann die Biografie ansehen',
      familyViewDescription: 'Teilen Sie diesen Link mit Familienmitgliedern',
      copied: 'Kopiert',
      copy: 'Kopieren',
    },
    view: {
      accessDenied: 'Zugriff Verweigert',
      notAvailable: 'Diese Biografie ist nicht zur Ansicht verf\u00fcgbar.',
      returnHome: 'Zur Startseite',
      downloadPdf: 'PDF Herunterladen',
      by: 'Von',
      preservingStories: 'Biography Library - Geschichten Bewahren in der Schweiz',
      tokenMissing: 'Zugriffstoken fehlt',
      notFoundOrDenied: 'Biografie nicht gefunden oder Zugriff verweigert',
      biographyPrivate: 'Diese Biografie ist privat',
    },
    footer: {
      hostedInSwitzerland: 'Biography Library Demo - Gehostet in der Schweiz',
      disclaimer: 'Dies ist eine Demo. Die Produktionsversion wird die schweizerische Infomaniak-Infrastruktur verwenden.',
    },
    welcome: {
      title: 'Willkommen bei Biography Library',
      subtitle: 'Bitte w\u00e4hlen Sie Ihre bevorzugte Sprache',
      selectLanguage: 'Sprache W\u00e4hlen',
      continue: 'Weiter',
    },
    toast: {
      biographySaved: 'Biografie erfolgreich gespeichert',
      biographyCreated: 'Biografie erfolgreich erstellt',
      biographyDeleted: 'Biografie erfolgreich gel\u00f6scht',
      pdfExported: 'PDF erfolgreich exportiert',
      linkCopied: 'Link in die Zwischenablage kopiert',
      demoLoaded: 'Demo-Biografie erfolgreich geladen',
      error: 'Ein Fehler ist aufgetreten',
    },
    coach: {
      greeting: 'Willkommen zurück',
      goodMorning: 'Guten Morgen',
      goodAfternoon: 'Guten Tag',
      goodEvening: 'Guten Abend',
      wordsWritten: 'Wörter geschrieben',
      inSections: 'in {count} Abschnitten',
      progressComplete: 'fertig',
      lastActivity: 'Letzte Aktivität',
      daysAgo: 'vor {count} Tagen',
      today: 'heute',
      yesterday: 'gestern',
      readyWhenYouAre: 'Ich bin da, wenn Sie bereit sind fortzufahren',
      almostDone: 'Sie sind fast fertig mit {section}! Möchten Sie es beenden?',
      wantToFinish: 'Möchten Sie es beenden?',
      readyToStart: 'Bereit zu beginnen? Ich führe Sie durch Ihre erste Geschichte.',
      guideFirstStory: 'Ich führe Sie durch Ihre erste Geschichte.',
      conversationPending: 'Sie haben ein laufendes Gespräch über {section}. Fortfahren?',
      continueConversation: 'Fortfahren',
      continueWriting: 'Dort weitermachen, wo Sie aufgehört haben',
      startNewSection: 'Neuen Abschnitt beginnen',
      quickSession: 'Schnelle Sitzung (5 Min.)',
      firstHundredWords: 'Erste 100 Wörter',
      firstSectionComplete: 'Erster Abschnitt abgeschlossen',
      biographyComplete: 'Biografie abgeschlossen',
      dailyPrompt: 'Tägliche Anregung',
      of: 'von',
      sections: 'Abschnitte',
    },
    accessibility: {
      uiFontSize: 'UI-Schriftgröße',
      editorFontSize: 'Editor-Schriftgröße',
      small: 'Klein',
      normal: 'Normal',
      large: 'Groß',
      extraLarge: 'Sehr Groß',
    },
  },
};

export const languageNames: Record<Language, string> = {
  en: 'English',
  it: 'Italiano',
  fr: 'Fran\u00e7ais',
  de: 'Deutsch',
};

export const languageFlags: Record<Language, string> = {
  en: '\ud83c\uddec\ud83c\udde7',
  it: '\ud83c\uddee\ud83c\uddf9',
  fr: '\ud83c\uddeb\ud83c\uddf7',
  de: '\ud83c\udde9\ud83c\uddea',
};
