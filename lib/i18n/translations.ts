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
    status: string;
    visibility: string;
    progress: string;
    statusDraft1: string;
    statusDraft2: string;
    statusDraft3: string;
    statusApproved: string;
    statusPublished: string;
    untitledBiography: string;
    goToWorkspace: string;
    continueLastSection: string;
    updateAvailabilityMessage: string;
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
    notes: string;
    aiSuggestions: string;
    shareLink: string;
    export: string;
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
    pendingReminders: string;
    viewAllReminders: string;
  };
  accessibility: {
    uiFontSize: string;
    editorFontSize: string;
    small: string;
    normal: string;
    large: string;
    extraLarge: string;
  };
  biographyType: {
    title: string;
    subtitle: string;
    autobiography: string;
    autobiographyDescription: string;
    autobiographyButton: string;
    mostPopular: string;
    deceased: string;
    deceasedDescription: string;
    deceasedButton: string;
    reviewPeriod: string;
    warningTitle: string;
    warningLine1: string;
    warningLine2: string;
    warningLine3: string;
    warningLine4: string;
  };
  declaration: {
    stepIndicator: string;
    title: string;
    subtitle: string;
    checkbox1: string;
    checkbox1Helper: string;
    checkbox2: string;
    checkbox3: string;
    checkbox3TermsLink: string;
    checkbox3PrivacyLink: string;
    checkbox4: string;
    checkbox4Helper: string;
    infoTitle: string;
    canWriteTitle: string;
    canWriteLine1: string;
    canWriteLine2: string;
    canWriteLine3: string;
    cannotWriteTitle: string;
    cannotWriteLine1: string;
    cannotWriteLine2: string;
    cannotWriteLine3: string;
    cannotWriteLine4: string;
    acceptButton: string;
  };
  deceasedDeclaration: {
    stepIndicator: string;
    title: string;
    subtitle: string;
    reviewPeriodTitle: string;
    reviewPeriodText: string;
    reviewPeriodBullet1: string;
    reviewPeriodBullet2: string;
    reviewPeriodBullet3: string;
    reviewPeriodBullet4: string;
    checkbox1: string;
    checkbox1Helper: string;
    checkbox2: string;
    checkbox2Helper: string;
    checkbox3: string;
    checkbox3Helper: string;
    checkbox4: string;
    checkbox4Helper: string;
    checkbox5: string;
    checkbox5TermsLink: string;
    checkbox5PrivacyLink: string;
    perspectivesTitle: string;
    perspectivesText: string;
    perspectivesBullet1: string;
    perspectivesBullet2: string;
    perspectivesBullet3: string;
    legalWarningTitle: string;
    legalWarningText: string;
    legalWarningBullet1: string;
    legalWarningBullet2: string;
    legalWarningBullet3: string;
    acceptButton: string;
  };
  importDialog: {
    title: string;
    description: string;
    dragFile: string;
    dragFileHint: string;
    formats: string;
    selectFile: string;
    or: string;
    pasteLabel: string;
    pastePlaceholder: string;
    analyzeText: string;
    preview: string;
    sectionsFound: string;
    autoImport: string;
    singleSectionNotice: string;
    useMarkers: string;
    replaceExisting: string;
    aiDetectPrompt: string;
    detectSections: string;
    analyzing: string;
    back: string;
    import: string;
    fileReadError: string;
    pasteTextFirst: string;
    textAnalysisError: string;
    aiAuthRequired: string;
    aiNoSections: string;
    aiDetectionError: string;
    multiImportUnavailable: string;
    loading: string;
  };
  notesAndTodos: {
    title: string;
    recordAudio: string;
    importText: string;
    notesTab: string;
    todosTab: string;
    addNotePlaceholder: string;
    addNote: string;
    noNotes: string;
    editNote: string;
    deleteNote: string;
    cancel: string;
    save: string;
    createdAt: string;
    addTodoDescription: string;
    priorityLow: string;
    priorityMedium: string;
    priorityHigh: string;
    dueDate: string;
    removeDueDate: string;
    addTodo: string;
    filterAll: string;
    filterPending: string;
    filterCompleted: string;
    noTodos: string;
    noCompletedTodos: string;
    loadingNotes: string;
    noNotesYet: string;
    noPendingItems: string;
  };
  aiReview: {
    title: string;
    reviewButton: string;
    suggestionsTab: string;
    rewriteTab: string;
    statisticsTab: string;
    analyzingContent: string;
    looksGreat: string;
    noImprovementsNeeded: string;
    original: string;
    suggestion: string;
    selected: string;
    select: string;
    ignore: string;
    narrativeLabel: string;
    narrativeDesc: string;
    formalLabel: string;
    formalDesc: string;
    intimateLabel: string;
    intimateDesc: string;
    generating: string;
    regenerate: string;
    generate: string;
    originalVersion: string;
    rewrittenVersion: string;
    applying: string;
    replaceWithVersion: string;
    keepOriginal: string;
    contentMetrics: string;
    contentMetricsDesc: string;
    wordCount: string;
    characterCount: string;
    sentences: string;
    paragraphs: string;
    readability: string;
    readabilityDesc: string;
    readabilityScore: string;
    avgWordsPerSentence: string;
    excellent: string;
    good: string;
    fair: string;
    challenging: string;
    shortSentences: string;
    moderateSentences: string;
    longSentences: string;
    improvementSummary: string;
    basedOnAi: string;
    improvementsFound: string;
    highPriority: string;
    mediumPriority: string;
    lowPriority: string;
    close: string;
    applySelected: string;
    failedToLoad: string;
    failedToGenerate: string;
    noImprovementsSelected: string;
    appliedImprovements: string;
    failedToApply: string;
    appliedRewrite: string;
  };
  deleteDialog: {
    deleteBiographyLink: string;
    deleteAccountLink: string;
    bioModal1Title: string;
    bioModal1Message: string;
    bioModal2Title: string;
    bioModal2Message: string;
    checkboxIrreversible: string;
    bioInputPlaceholder: string;
    accountModal1Title: string;
    accountModal1Message: string;
    bioCount: string;
    accountModal2Title: string;
    accountModal2Message: string;
    checkboxAllData: string;
    accountInputPlaceholder: string;
    buttonCancel: string;
    buttonContinue: string;
    buttonDeleteBio: string;
    buttonDeleteAccount: string;
    successToastBio: string;
    successMessageAccount: string;
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
      noBiographies: 'Start preserving your story',
      noBiographiesSubtitle: 'Create your first biography to get started',
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
      status: 'Status',
      visibility: 'Visibility',
      progress: 'Progress',
      statusDraft1: 'Draft 1',
      statusDraft2: 'Draft 2',
      statusDraft3: 'Draft 3',
      statusApproved: 'Approved',
      statusPublished: 'Published',
      untitledBiography: 'Untitled Biography',
      goToWorkspace: 'Go to Workspace',
      continueLastSection: 'Continue Last Section',
      updateAvailabilityMessage: 'Once your biography is live, you can add a new yearly update to showcase your latest year of activity.',
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
      notes: 'Notes',
      aiSuggestions: 'AI Suggestions',
      shareLink: 'Share Link',
      export: 'Export',
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
      hostedInSwitzerland: 'Biography Library - Hosted in Switzerland',
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
      pendingReminders: 'Pending Reminders',
      viewAllReminders: 'View All Reminders',
    },
    accessibility: {
      uiFontSize: 'UI Font Size',
      editorFontSize: 'Editor Font Size',
      small: 'S',
      normal: 'M',
      large: 'L',
      extraLarge: 'XL',
    },
    biographyType: {
      title: 'Create a New Biography',
      subtitle: 'Choose what type of biography you want to create',
      autobiography: 'My Autobiography',
      autobiographyDescription: 'Write your own life story. Share your memories, experiences, and legacy.',
      autobiographyButton: 'Start My Story',
      mostPopular: 'Most popular',
      deceased: 'Biography of a Deceased Person',
      deceasedDescription: 'Honor the memory of a loved one who has passed away.',
      deceasedButton: 'Create Memorial',
      reviewPeriod: '30-day review period',
      warningTitle: 'Important: You CANNOT create biographies of:',
      warningLine1: 'Living persons (other than yourself)',
      warningLine2: 'Minors (under 18 years old)',
      warningLine3: 'Anyone you cannot prove is deceased',
      warningLine4: 'Violations will result in account termination.',
    },
    declaration: {
      stepIndicator: 'Step 1 of 3: Declaration and Consent',
      title: 'Create Your Autobiography',
      subtitle: 'Before you begin, please confirm the following:',
      checkbox1: 'I confirm that I am writing my own autobiography and that the information I provide about my identity (name, surname, date of birth) is truthful.',
      checkbox1Helper: 'You are legally responsible for the accuracy of this information.',
      checkbox2: 'I confirm that I am at least 18 years old.',
      checkbox3: 'I have read and accept the {terms} and {privacy}.',
      checkbox3TermsLink: 'Terms of Service',
      checkbox3PrivacyLink: 'Privacy Policy',
      checkbox4: 'I understand that I am solely responsible for the content I publish and must respect the rights of living persons I may mention.',
      checkbox4Helper: 'You cannot include sensitive data about living persons without their consent.',
      infoTitle: 'Important Information',
      canWriteTitle: 'What you can write about:',
      canWriteLine1: 'Your life experiences and memories',
      canWriteLine2: 'General mentions of family members (names and relationships only)',
      canWriteLine3: 'Historical events you witnessed',
      cannotWriteTitle: 'What you CANNOT write without consent:',
      cannotWriteLine1: 'Sensitive health data about living persons',
      cannotWriteLine2: 'Sexual orientation of others',
      cannotWriteLine3: 'Legal/criminal proceedings involving others',
      cannotWriteLine4: 'Private financial information of others',
      acceptButton: 'Accept and Continue',
    },
    deceasedDeclaration: {
      stepIndicator: 'Step 1 of 3: Declaration and Consent',
      title: 'Create a Biography of a Deceased Person',
      subtitle: 'Before you begin, please confirm the following:',
      reviewPeriodTitle: '30-Day Review Period',
      reviewPeriodText: 'Biographies of deceased persons will be publicly visible after 30 days. During this time:',
      reviewPeriodBullet1: 'The biography is visible only to you',
      reviewPeriodBullet2: 'You can modify it freely',
      reviewPeriodBullet3: 'Other users can report issues if they are mentioned',
      reviewPeriodBullet4: 'We will review for compliance with Terms of Service',
      checkbox1: 'I declare under my civil and criminal responsibility that the person I am writing about is deceased.',
      checkbox1Helper: 'False declarations can be prosecuted under Swiss Criminal Code Art. 179decies (identity fraud).',
      checkbox2: 'I confirm that the information I will publish is truthful or clearly indicated as my personal interpretation.',
      checkbox2Helper: 'False or defamatory statements can result in legal action by the deceased\'s family.',
      checkbox3: 'I understand that I must respect the rights of living persons I may mention and cannot include sensitive data about them without consent.',
      checkbox3Helper: 'This includes health data, sexual orientation, legal proceedings, and private financial information.',
      checkbox4: 'I understand that Biography Library may request proof of death (death certificate or equivalent documentation) if this biography is reported.',
      checkbox4Helper: 'Failure to provide proof will result in biography removal and potential account termination.',
      checkbox5: 'I have read and accept the {terms} and {privacy}.',
      checkbox5TermsLink: 'Terms of Service',
      checkbox5PrivacyLink: 'Privacy Policy',
      perspectivesTitle: 'Multiple Perspectives',
      perspectivesText: 'Other family members or acquaintances may create additional biographies of the same person. Each biography reflects the author\'s perspective and contributes to a more complete picture. If you find another biography of this person, you can:',
      perspectivesBullet1: 'Link your biography to theirs',
      perspectivesBullet2: 'Add comments or memories',
      perspectivesBullet3: 'Contact the other author for collaboration',
      legalWarningTitle: 'Legal Warning: Defamation',
      legalWarningText: 'Even though the deceased has no data protection rights, making false or defamatory statements can result in:',
      legalWarningBullet1: 'Civil lawsuits by the family for damages to their honor',
      legalWarningBullet2: 'Criminal prosecution under Swiss law (Art. 173-177 CP)',
      legalWarningBullet3: 'Immediate removal of the biography and account termination',
      acceptButton: 'Accept and Continue',
    },
    importDialog: {
      title: 'Import text into section "{sectionName}"',
      description: 'Upload a file or paste text to import',
      dragFile: 'Drag a file here or click to select',
      dragFileHint: 'Supported formats: .txt, .rtf, .docx (max 5MB)',
      formats: 'Supported formats: .txt, .rtf, .docx (max 5MB)',
      selectFile: 'Select File',
      or: 'or',
      pasteLabel: 'Paste text directly',
      pastePlaceholder: 'Paste text to import here...',
      analyzeText: 'Analyze Text',
      preview: 'Preview:',
      sectionsFound: 'Found {count} sections in the file. Do you want to import them automatically?',
      autoImport: 'Found {count} sections',
      singleSectionNotice: 'This text will be imported only into {sectionName}. To import multiple sections, use markers in the file (## Section Title).',
      useMarkers: 'To import multiple sections, use markers in the file (## Section Title).',
      replaceExisting: 'Replace existing content',
      aiDetectPrompt: 'Let AI analyze the text and automatically suggest appropriate sections',
      detectSections: 'Detect Sections',
      analyzing: 'Analyzing...',
      back: 'Back',
      import: 'Import',
      fileReadError: 'Error reading file',
      pasteTextFirst: 'Paste some text before continuing',
      textAnalysisError: 'Error analyzing text',
      aiAuthRequired: 'You must be authenticated to use AI',
      aiNoSections: 'AI could not detect sections in the text',
      aiDetectionError: 'Error during automatic section detection',
      multiImportUnavailable: 'Multiple section import not available',
      loading: 'Loading...',
    },
    notesAndTodos: {
      title: 'Notes & Reminders',
      recordAudio: 'Record audio',
      importText: 'Import text',
      notesTab: 'Notes',
      todosTab: 'To Do',
      addNotePlaceholder: 'Add a note for this section... (max 500 characters)',
      addNote: 'Add Note',
      noNotes: 'No notes for this section',
      editNote: 'Edit',
      deleteNote: 'Delete',
      cancel: 'Cancel',
      save: 'Save',
      createdAt: 'at',
      addTodoDescription: 'Reminder description...',
      priorityLow: 'Low Priority',
      priorityMedium: 'Medium Priority',
      priorityHigh: 'High Priority',
      dueDate: 'Due Date',
      removeDueDate: 'Remove date',
      addTodo: 'Add',
      filterAll: 'All',
      filterPending: 'To Do',
      filterCompleted: 'Completed',
      noTodos: 'No reminders',
      noCompletedTodos: 'No completed reminders',
      loadingNotes: 'Loading notes...',
      noNotesYet: 'No notes yet',
      noPendingItems: 'No pending items',
    },
    aiReview: {
      title: 'AI Section Review',
      reviewButton: 'Review',
      suggestionsTab: 'Suggestions',
      rewriteTab: 'Full Rewrite',
      statisticsTab: 'Statistics',
      analyzingContent: 'Analyzing content...',
      looksGreat: 'Looks Great!',
      noImprovementsNeeded: 'No improvements needed. Your content is well-written.',
      original: 'Original:',
      suggestion: 'Suggestion:',
      selected: 'Selected',
      select: 'Select',
      ignore: 'Ignore',
      narrativeLabel: 'Narrative',
      narrativeDesc: 'Storytelling style with vivid descriptions',
      formalLabel: 'Formal',
      formalDesc: 'Polished and professional tone',
      intimateLabel: 'Intimate',
      intimateDesc: 'Warm and personal, like a letter',
      generating: 'Generating...',
      regenerate: 'Regenerate',
      generate: 'Generate',
      originalVersion: 'Original Version',
      rewrittenVersion: 'Rewritten Version',
      applying: 'Applying...',
      replaceWithVersion: 'Replace with this version',
      keepOriginal: 'Keep original',
      contentMetrics: 'Content Metrics',
      contentMetricsDesc: 'Basic statistics about your writing',
      wordCount: 'Word Count',
      characterCount: 'Character Count',
      sentences: 'Sentences',
      paragraphs: 'Paragraphs',
      readability: 'Readability',
      readabilityDesc: 'How easy is your content to read?',
      readabilityScore: 'Readability Score',
      avgWordsPerSentence: 'Average Words per Sentence',
      excellent: 'Excellent - Very easy to read',
      good: 'Good - Easy to read',
      fair: 'Fair - Moderately easy',
      challenging: 'Challenging - Consider simplifying',
      shortSentences: 'Short sentences - Easy to follow',
      moderateSentences: 'Moderate length - Well balanced',
      longSentences: 'Long sentences - Consider breaking them up',
      improvementSummary: 'Improvement Summary',
      basedOnAi: 'Based on AI analysis',
      improvementsFound: 'Improvements Found',
      highPriority: 'High Priority',
      mediumPriority: 'Medium Priority',
      lowPriority: 'Low Priority',
      close: 'Close',
      applySelected: 'Apply Selected',
      failedToLoad: 'Failed to load AI suggestions',
      failedToGenerate: 'Failed to generate',
      noImprovementsSelected: 'No improvements selected',
      appliedImprovements: 'Applied {count} improvements',
      failedToApply: 'Failed to apply improvements',
      appliedRewrite: 'Applied {tone} rewrite',
    },
    deleteDialog: {
      deleteBiographyLink: 'Delete biography',
      deleteAccountLink: 'Delete my account',
      bioModal1Title: 'Delete Biography?',
      bioModal1Message: 'Are you sure you want to delete this biography? This action cannot be undone.',
      bioModal2Title: 'Final Confirmation',
      bioModal2Message: 'This is your last chance. Once deleted, this biography and all its content will be permanently removed from our servers. We cannot recover it.',
      checkboxIrreversible: 'I understand this action is irreversible',
      bioInputPlaceholder: 'Type DELETE to confirm',
      accountModal1Title: 'Delete Your Account?',
      accountModal1Message: 'Deleting your account will permanently remove all your biographies, data, and profile. This action cannot be undone.',
      bioCount: 'You have {count} biography/biographies that will be deleted',
      accountModal2Title: 'Permanent Account Deletion',
      accountModal2Message: 'This is irreversible. Once you delete your account:\n• All your biographies will be permanently deleted\n• Your profile and data will be removed\n• You cannot recover any information\n• This action complies with Swiss data protection laws (FADP/GDPR right to erasure)',
      checkboxAllData: 'I understand all my data will be permanently deleted',
      accountInputPlaceholder: 'Type DELETE MY ACCOUNT to confirm',
      buttonCancel: 'Cancel',
      buttonContinue: 'Continue',
      buttonDeleteBio: 'Permanently Delete',
      buttonDeleteAccount: 'Delete Account Permanently',
      successToastBio: 'Biography deleted successfully',
      successMessageAccount: 'Your account has been deleted',
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
      noBiographies: 'Inizia a preservare la tua storia',
      noBiographiesSubtitle: 'Crea la tua prima biografia per iniziare',
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
      status: 'Stato',
      visibility: 'Visibilità',
      progress: 'Progresso',
      statusDraft1: 'Bozza 1',
      statusDraft2: 'Bozza 2',
      statusDraft3: 'Bozza 3',
      statusApproved: 'Approvata',
      statusPublished: 'Pubblicata',
      untitledBiography: 'Biografia senza titolo',
      goToWorkspace: 'Vai al Workspace',
      continueLastSection: 'Continua Ultima Sezione',
      updateAvailabilityMessage: 'Una volta che la tua biografia è pubblicata, puoi aggiungere un nuovo aggiornamento annuale per mostrare le tue attività dell\'ultimo anno.',
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
      notes: 'Note',
      aiSuggestions: 'Suggerimenti AI',
      shareLink: 'Condividi Link',
      export: 'Esporta',
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
      hostedInSwitzerland: 'Biography Library - Ospitato in Svizzera',
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
      pendingReminders: 'Promemoria in Sospeso',
      viewAllReminders: 'Visualizza Tutti i Promemoria',
    },
    accessibility: {
      uiFontSize: 'Dimensione Testo UI',
      editorFontSize: 'Dimensione Testo Editor',
      small: 'S',
      normal: 'M',
      large: 'L',
      extraLarge: 'XL',
    },
    biographyType: {
      title: 'Crea una Nuova Biografia',
      subtitle: 'Scegli che tipo di biografia vuoi creare',
      autobiography: 'La Mia Autobiografia',
      autobiographyDescription: 'Scrivi la tua storia di vita. Condividi i tuoi ricordi, esperienze e la tua eredità.',
      autobiographyButton: 'Inizia la Mia Storia',
      mostPopular: 'Più popolare',
      deceased: 'Biografia di una Persona Deceduta',
      deceasedDescription: 'Onora la memoria di una persona cara che è scomparsa.',
      deceasedButton: 'Crea Memoriale',
      reviewPeriod: 'Periodo di revisione di 30 giorni',
      warningTitle: 'Importante: NON PUOI creare biografie di:',
      warningLine1: 'Persone viventi (tranne te stesso)',
      warningLine2: 'Minori (sotto i 18 anni)',
      warningLine3: 'Chiunque di cui non puoi provare il decesso',
      warningLine4: 'Le violazioni comporteranno la chiusura dell\'account.',
    },
    declaration: {
      stepIndicator: 'Passo 1 di 3: Dichiarazione e Consenso',
      title: 'Crea la Tua Autobiografia',
      subtitle: 'Prima di iniziare, conferma quanto segue:',
      checkbox1: 'Confermo di scrivere la mia autobiografia e che le informazioni che fornisco sulla mia identità (nome, cognome, data di nascita) sono veritiere.',
      checkbox1Helper: 'Sei legalmente responsabile dell\'accuratezza di queste informazioni.',
      checkbox2: 'Confermo di avere almeno 18 anni.',
      checkbox3: 'Ho letto e accetto i {terms} e la {privacy}.',
      checkbox3TermsLink: 'Termini di Servizio',
      checkbox3PrivacyLink: 'Informativa sulla Privacy',
      checkbox4: 'Comprendo di essere l\'unico responsabile dei contenuti che pubblico e di dover rispettare i diritti delle persone viventi che potrei menzionare.',
      checkbox4Helper: 'Non puoi includere dati sensibili su persone viventi senza il loro consenso.',
      infoTitle: 'Informazioni Importanti',
      canWriteTitle: 'Cosa puoi scrivere:',
      canWriteLine1: 'Le tue esperienze di vita e ricordi',
      canWriteLine2: 'Menzioni generali di familiari (solo nomi e relazioni)',
      canWriteLine3: 'Eventi storici a cui hai assistito',
      cannotWriteTitle: 'Cosa NON puoi scrivere senza consenso:',
      cannotWriteLine1: 'Dati sanitari sensibili su persone viventi',
      cannotWriteLine2: 'Orientamento sessuale di altri',
      cannotWriteLine3: 'Procedimenti legali/penali che coinvolgono altri',
      cannotWriteLine4: 'Informazioni finanziarie private di altri',
      acceptButton: 'Accetta e Continua',
    },
    deceasedDeclaration: {
      stepIndicator: 'Passo 1 di 3: Dichiarazione e Consenso',
      title: 'Crea una Biografia di una Persona Deceduta',
      subtitle: 'Prima di iniziare, conferma quanto segue:',
      reviewPeriodTitle: 'Periodo di Revisione di 30 Giorni',
      reviewPeriodText: 'Le biografie di persone decedute saranno pubblicamente visibili dopo 30 giorni. Durante questo periodo:',
      reviewPeriodBullet1: 'La biografia è visibile solo a te',
      reviewPeriodBullet2: 'Puoi modificarla liberamente',
      reviewPeriodBullet3: 'Altri utenti possono segnalare problemi se sono menzionati',
      reviewPeriodBullet4: 'Esamineremo la conformità ai Termini di Servizio',
      checkbox1: 'Dichiaro sotto la mia responsabilità civile e penale che la persona di cui sto scrivendo è deceduta.',
      checkbox1Helper: 'Le false dichiarazioni possono essere perseguite ai sensi del Codice Penale Svizzero Art. 179decies (frode d\'identità).',
      checkbox2: 'Confermo che le informazioni che pubblicherò sono veritiere o chiaramente indicate come mia interpretazione personale.',
      checkbox2Helper: 'Dichiarazioni false o diffamatorie possono comportare azioni legali da parte della famiglia del defunto.',
      checkbox3: 'Comprendo di dover rispettare i diritti delle persone viventi che potrei menzionare e di non poter includere dati sensibili su di loro senza consenso.',
      checkbox3Helper: 'Questo include dati sanitari, orientamento sessuale, procedimenti legali e informazioni finanziarie private.',
      checkbox4: 'Comprendo che Biography Library può richiedere la prova del decesso (certificato di morte o documentazione equivalente) se questa biografia viene segnalata.',
      checkbox4Helper: 'La mancata fornitura della prova comporterà la rimozione della biografia e la potenziale chiusura dell\'account.',
      checkbox5: 'Ho letto e accetto i {terms} e la {privacy}.',
      checkbox5TermsLink: 'Termini di Servizio',
      checkbox5PrivacyLink: 'Informativa sulla Privacy',
      perspectivesTitle: 'Prospettive Multiple',
      perspectivesText: 'Altri familiari o conoscenti possono creare biografie aggiuntive della stessa persona. Ogni biografia riflette la prospettiva dell\'autore e contribuisce a un quadro più completo. Se trovi un\'altra biografia di questa persona, puoi:',
      perspectivesBullet1: 'Collegare la tua biografia alla loro',
      perspectivesBullet2: 'Aggiungere commenti o ricordi',
      perspectivesBullet3: 'Contattare l\'altro autore per collaborare',
      legalWarningTitle: 'Avviso Legale: Diffamazione',
      legalWarningText: 'Anche se il defunto non ha diritti di protezione dei dati, fare dichiarazioni false o diffamatorie può comportare:',
      legalWarningBullet1: 'Cause civili da parte della famiglia per danni al loro onore',
      legalWarningBullet2: 'Persecuzione penale ai sensi della legge svizzera (Art. 173-177 CP)',
      legalWarningBullet3: 'Rimozione immediata della biografia e chiusura dell\'account',
      acceptButton: 'Accetta e Continua',
    },
    importDialog: {
      title: 'Importa testo nella sezione "{sectionName}"',
      description: 'Carica un file o incolla il testo da importare',
      dragFile: 'Trascina un file qui o clicca per selezionare',
      dragFileHint: 'Formati supportati: .txt, .rtf, .docx (max 5MB)',
      formats: 'Formati supportati: .txt, .rtf, .docx (max 5MB)',
      selectFile: 'Seleziona File',
      or: 'oppure',
      pasteLabel: 'Incolla il testo direttamente',
      pastePlaceholder: 'Incolla qui il testo da importare...',
      analyzeText: 'Analizza Testo',
      preview: 'Anteprima:',
      sectionsFound: 'Ho trovato {count} sezioni nel file. Vuoi importarle automaticamente?',
      autoImport: 'Ho trovato {count} sezioni',
      singleSectionNotice: 'Questo testo verrà importato solo in {sectionName}. Per importare multiple sezioni, usa marcatori nel file (## Titolo Sezione).',
      useMarkers: 'Per importare multiple sezioni, usa marcatori nel file (## Titolo Sezione).',
      replaceExisting: 'Sostituisci contenuto esistente',
      aiDetectPrompt: 'Lascia che l\'AI analizzi il testo e suggerisca automaticamente le sezioni appropriate',
      detectSections: 'Rileva Sezioni',
      analyzing: 'Analisi...',
      back: 'Indietro',
      import: 'Importa',
      fileReadError: 'Errore nella lettura del file',
      pasteTextFirst: 'Incolla del testo prima di continuare',
      textAnalysisError: 'Errore nell\'analisi del testo',
      aiAuthRequired: 'Devi essere autenticato per usare l\'AI',
      aiNoSections: 'L\'AI non è riuscita a rilevare sezioni nel testo',
      aiDetectionError: 'Errore durante il rilevamento automatico delle sezioni',
      multiImportUnavailable: 'Importazione multipla sezioni non disponibile',
      loading: 'Caricamento...',
    },
    notesAndTodos: {
      title: 'Note e Promemoria',
      recordAudio: 'Registra audio',
      importText: 'Importa testo',
      notesTab: 'Note',
      todosTab: 'Da Fare',
      addNotePlaceholder: 'Aggiungi una nota per questa sezione... (max 500 caratteri)',
      addNote: 'Aggiungi Nota',
      noNotes: 'Nessuna nota per questa sezione',
      editNote: 'Modifica',
      deleteNote: 'Elimina',
      cancel: 'Annulla',
      save: 'Salva',
      createdAt: 'alle',
      addTodoDescription: 'Descrizione promemoria...',
      priorityLow: 'Priorità Bassa',
      priorityMedium: 'Priorità Media',
      priorityHigh: 'Priorità Alta',
      dueDate: 'Scadenza',
      removeDueDate: 'Rimuovi data',
      addTodo: 'Aggiungi',
      filterAll: 'Tutti',
      filterPending: 'Da fare',
      filterCompleted: 'Completati',
      noTodos: 'Nessun promemoria',
      noCompletedTodos: 'Nessun promemoria completato',
      loadingNotes: 'Caricamento note...',
      noNotesYet: 'Nessuna nota ancora',
      noPendingItems: 'Nessun elemento in sospeso',
    },
    aiReview: {
      title: 'Revisione IA della Sezione',
      reviewButton: 'Revisiona',
      suggestionsTab: 'Suggerimenti',
      rewriteTab: 'Riscrittura Completa',
      statisticsTab: 'Statistiche',
      analyzingContent: 'Analisi del contenuto...',
      looksGreat: 'Ottimo!',
      noImprovementsNeeded: 'Nessun miglioramento necessario. Il tuo contenuto è ben scritto.',
      original: 'Originale:',
      suggestion: 'Suggerimento:',
      selected: 'Selezionato',
      select: 'Seleziona',
      ignore: 'Ignora',
      narrativeLabel: 'Narrativo',
      narrativeDesc: 'Stile narrativo con descrizioni vivide',
      formalLabel: 'Formale',
      formalDesc: 'Tono professionale e curato',
      intimateLabel: 'Intimo',
      intimateDesc: 'Caldo e personale, come una lettera',
      generating: 'Generazione...',
      regenerate: 'Rigenera',
      generate: 'Genera',
      originalVersion: 'Versione Originale',
      rewrittenVersion: 'Versione Riscritta',
      applying: 'Applicazione...',
      replaceWithVersion: 'Sostituisci con questa versione',
      keepOriginal: 'Mantieni originale',
      contentMetrics: 'Metriche del Contenuto',
      contentMetricsDesc: 'Statistiche di base sulla tua scrittura',
      wordCount: 'Conteggio Parole',
      characterCount: 'Conteggio Caratteri',
      sentences: 'Frasi',
      paragraphs: 'Paragrafi',
      readability: 'Leggibilità',
      readabilityDesc: 'Quanto è facile leggere il tuo contenuto?',
      readabilityScore: 'Punteggio di Leggibilità',
      avgWordsPerSentence: 'Media Parole per Frase',
      excellent: 'Eccellente - Molto facile da leggere',
      good: 'Buono - Facile da leggere',
      fair: 'Discreto - Moderatamente facile',
      challenging: 'Impegnativo - Considera di semplificare',
      shortSentences: 'Frasi brevi - Facili da seguire',
      moderateSentences: 'Lunghezza moderata - Ben bilanciato',
      longSentences: 'Frasi lunghe - Considera di spezzarle',
      improvementSummary: 'Riepilogo Miglioramenti',
      basedOnAi: 'Basato sull\'analisi IA',
      improvementsFound: 'Miglioramenti Trovati',
      highPriority: 'Alta Priorità',
      mediumPriority: 'Media Priorità',
      lowPriority: 'Bassa Priorità',
      close: 'Chiudi',
      applySelected: 'Applica Selezionati',
      failedToLoad: 'Impossibile caricare i suggerimenti IA',
      failedToGenerate: 'Impossibile generare',
      noImprovementsSelected: 'Nessun miglioramento selezionato',
      appliedImprovements: 'Applicati {count} miglioramenti',
      failedToApply: 'Impossibile applicare i miglioramenti',
      appliedRewrite: 'Applicata riscrittura {tone}',
    },
    deleteDialog: {
      deleteBiographyLink: 'Elimina biografia',
      deleteAccountLink: 'Elimina il mio account',
      bioModal1Title: 'Eliminare la Biografia?',
      bioModal1Message: 'Sei sicuro di voler eliminare questa biografia? Questa azione non può essere annullata.',
      bioModal2Title: 'Conferma Finale',
      bioModal2Message: 'Questa è la tua ultima opportunità. Una volta eliminata, questa biografia e tutto il suo contenuto saranno rimossi permanentemente dai nostri server. Non potremo recuperarli.',
      checkboxIrreversible: 'Comprendo che questa azione è irreversibile',
      bioInputPlaceholder: 'Scrivi ELIMINA per confermare',
      accountModal1Title: 'Eliminare il Tuo Account?',
      accountModal1Message: "L'eliminazione del tuo account rimuoverà permanentemente tutte le tue biografie, dati e profilo. Questa azione non può essere annullata.",
      bioCount: 'Hai {count} biografia/biografie che saranno eliminate',
      accountModal2Title: 'Eliminazione Permanente Account',
      accountModal2Message: 'Questa azione è irreversibile. Una volta eliminato il tuo account:\n• Tutte le tue biografie saranno eliminate permanentemente\n• Il tuo profilo e i tuoi dati saranno rimossi\n• Non potrai recuperare nessuna informazione\n• Questa azione è conforme alle leggi svizzere sulla protezione dei dati (LPD/GDPR diritto alla cancellazione)',
      checkboxAllData: 'Comprendo che tutti i miei dati saranno eliminati permanentemente',
      accountInputPlaceholder: 'Scrivi ELIMINA IL MIO ACCOUNT per confermare',
      buttonCancel: 'Annulla',
      buttonContinue: 'Continua',
      buttonDeleteBio: 'Elimina Permanentemente',
      buttonDeleteAccount: 'Elimina Account Permanentemente',
      successToastBio: 'Biografia eliminata con successo',
      successMessageAccount: 'Il tuo account è stato eliminato',
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
      noBiographies: 'Commencez \u00e0 pr\u00e9server votre histoire',
      noBiographiesSubtitle: 'Cr\u00e9ez votre premi\u00e8re biographie pour commencer',
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
      status: 'Statut',
      visibility: 'Visibilité',
      progress: 'Progrès',
      statusDraft1: 'Brouillon 1',
      statusDraft2: 'Brouillon 2',
      statusDraft3: 'Brouillon 3',
      statusApproved: 'Approuvé',
      statusPublished: 'Publié',
      untitledBiography: 'Biographie sans titre',
      goToWorkspace: 'Aller à l\'Espace',
      continueLastSection: 'Continuer Dernière Section',
      updateAvailabilityMessage: 'Une fois votre biographie publiée, vous pouvez ajouter une nouvelle mise à jour annuelle pour présenter vos activités de la dernière année.',
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
      notes: 'Notes',
      aiSuggestions: 'Suggestions IA',
      shareLink: 'Lien de Partage',
      export: 'Exporter',
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
      hostedInSwitzerland: 'Biography Library - H\u00e9berg\u00e9 en Suisse',
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
      pendingReminders: 'Rappels en Attente',
      viewAllReminders: 'Voir Tous les Rappels',
    },
    accessibility: {
      uiFontSize: 'Taille de Police UI',
      editorFontSize: 'Taille de Police Éditeur',
      small: 'S',
      normal: 'M',
      large: 'L',
      extraLarge: 'XL',
    },
    biographyType: {
      title: 'Créer une Nouvelle Biographie',
      subtitle: 'Choisissez le type de biographie que vous souhaitez créer',
      autobiography: 'Mon Autobiographie',
      autobiographyDescription: 'Écrivez votre propre histoire de vie. Partagez vos souvenirs, expériences et votre héritage.',
      autobiographyButton: 'Commencer Mon Histoire',
      mostPopular: 'Le plus populaire',
      deceased: 'Biographie d\'une Personne Décédée',
      deceasedDescription: 'Honorez la mémoire d\'un être cher qui est décédé.',
      deceasedButton: 'Créer un Mémorial',
      reviewPeriod: 'Période de révision de 30 jours',
      warningTitle: 'Important: Vous NE POUVEZ PAS créer de biographies de:',
      warningLine1: 'Personnes vivantes (autres que vous-même)',
      warningLine2: 'Mineurs (moins de 18 ans)',
      warningLine3: 'Toute personne dont vous ne pouvez pas prouver le décès',
      warningLine4: 'Les violations entraîneront la fermeture du compte.',
    },
    declaration: {
      stepIndicator: 'Étape 1 sur 3 : Déclaration et Consentement',
      title: 'Créer Votre Autobiographie',
      subtitle: 'Avant de commencer, veuillez confirmer ce qui suit :',
      checkbox1: 'Je confirme que j\'écris ma propre autobiographie et que les informations que je fournis sur mon identité (nom, prénom, date de naissance) sont véridiques.',
      checkbox1Helper: 'Vous êtes légalement responsable de l\'exactitude de ces informations.',
      checkbox2: 'Je confirme que j\'ai au moins 18 ans.',
      checkbox3: 'J\'ai lu et j\'accepte les {terms} et la {privacy}.',
      checkbox3TermsLink: 'Conditions d\'Utilisation',
      checkbox3PrivacyLink: 'Politique de Confidentialité',
      checkbox4: 'Je comprends que je suis seul responsable du contenu que je publie et que je dois respecter les droits des personnes vivantes que je pourrais mentionner.',
      checkbox4Helper: 'Vous ne pouvez pas inclure de données sensibles sur des personnes vivantes sans leur consentement.',
      infoTitle: 'Informations Importantes',
      canWriteTitle: 'Ce que vous pouvez écrire :',
      canWriteLine1: 'Vos expériences de vie et souvenirs',
      canWriteLine2: 'Mentions générales de membres de la famille (noms et relations uniquement)',
      canWriteLine3: 'Événements historiques auxquels vous avez assisté',
      cannotWriteTitle: 'Ce que vous NE POUVEZ PAS écrire sans consentement :',
      cannotWriteLine1: 'Données de santé sensibles sur des personnes vivantes',
      cannotWriteLine2: 'Orientation sexuelle d\'autrui',
      cannotWriteLine3: 'Procédures judiciaires/pénales impliquant d\'autres personnes',
      cannotWriteLine4: 'Informations financières privées d\'autrui',
      acceptButton: 'Accepter et Continuer',
    },
    deceasedDeclaration: {
      stepIndicator: 'Étape 1 sur 3 : Déclaration et Consentement',
      title: 'Créer une Biographie d\'une Personne Décédée',
      subtitle: 'Avant de commencer, veuillez confirmer ce qui suit :',
      reviewPeriodTitle: 'Période de Révision de 30 Jours',
      reviewPeriodText: 'Les biographies de personnes décédées seront publiquement visibles après 30 jours. Pendant cette période :',
      reviewPeriodBullet1: 'La biographie n\'est visible que pour vous',
      reviewPeriodBullet2: 'Vous pouvez la modifier librement',
      reviewPeriodBullet3: 'D\'autres utilisateurs peuvent signaler des problèmes s\'ils sont mentionnés',
      reviewPeriodBullet4: 'Nous examinerons la conformité avec les Conditions d\'Utilisation',
      checkbox1: 'Je déclare sous ma responsabilité civile et pénale que la personne dont j\'écris la biographie est décédée.',
      checkbox1Helper: 'Les fausses déclarations peuvent être poursuivies en vertu du Code pénal suisse Art. 179decies (fraude à l\'identité).',
      checkbox2: 'Je confirme que les informations que je publierai sont véridiques ou clairement indiquées comme mon interprétation personnelle.',
      checkbox2Helper: 'Les déclarations fausses ou diffamatoires peuvent entraîner des actions en justice de la part de la famille du défunt.',
      checkbox3: 'Je comprends que je dois respecter les droits des personnes vivantes que je pourrais mentionner et ne peux pas inclure de données sensibles les concernant sans leur consentement.',
      checkbox3Helper: 'Cela inclut les données de santé, l\'orientation sexuelle, les procédures judiciaires et les informations financières privées.',
      checkbox4: 'Je comprends que Biography Library peut demander une preuve de décès (certificat de décès ou documentation équivalente) si cette biographie est signalée.',
      checkbox4Helper: 'Le défaut de fournir une preuve entraînera la suppression de la biographie et la fermeture potentielle du compte.',
      checkbox5: 'J\'ai lu et j\'accepte les {terms} et la {privacy}.',
      checkbox5TermsLink: 'Conditions d\'Utilisation',
      checkbox5PrivacyLink: 'Politique de Confidentialité',
      perspectivesTitle: 'Perspectives Multiples',
      perspectivesText: 'D\'autres membres de la famille ou connaissances peuvent créer des biographies supplémentaires de la même personne. Chaque biographie reflète la perspective de l\'auteur et contribue à une image plus complète. Si vous trouvez une autre biographie de cette personne, vous pouvez :',
      perspectivesBullet1: 'Lier votre biographie à la leur',
      perspectivesBullet2: 'Ajouter des commentaires ou des souvenirs',
      perspectivesBullet3: 'Contacter l\'autre auteur pour collaborer',
      legalWarningTitle: 'Avertissement Légal : Diffamation',
      legalWarningText: 'Même si le défunt n\'a pas de droits à la protection des données, faire des déclarations fausses ou diffamatoires peut entraîner :',
      legalWarningBullet1: 'Des poursuites civiles par la famille pour atteinte à leur honneur',
      legalWarningBullet2: 'Des poursuites pénales en vertu du droit suisse (Art. 173-177 CP)',
      legalWarningBullet3: 'La suppression immédiate de la biographie et la fermeture du compte',
      acceptButton: 'Accepter et Continuer',
    },
    importDialog: {
      title: 'Importer du texte dans la section "{sectionName}"',
      description: 'Téléchargez un fichier ou collez le texte à importer',
      dragFile: 'Glissez un fichier ici ou cliquez pour sélectionner',
      dragFileHint: 'Formats supportés : .txt, .rtf, .docx (max 5MB)',
      formats: 'Formats supportés : .txt, .rtf, .docx (max 5MB)',
      selectFile: 'Sélectionner un Fichier',
      or: 'ou',
      pasteLabel: 'Coller le texte directement',
      pastePlaceholder: 'Collez le texte à importer ici...',
      analyzeText: 'Analyser le Texte',
      preview: 'Aperçu :',
      sectionsFound: 'J\'ai trouvé {count} sections dans le fichier. Voulez-vous les importer automatiquement ?',
      autoImport: 'J\'ai trouvé {count} sections',
      singleSectionNotice: 'Ce texte sera importé uniquement dans {sectionName}. Pour importer plusieurs sections, utilisez des marqueurs dans le fichier (## Titre de Section).',
      useMarkers: 'Pour importer plusieurs sections, utilisez des marqueurs dans le fichier (## Titre de Section).',
      replaceExisting: 'Remplacer le contenu existant',
      aiDetectPrompt: 'Laissez l\'IA analyser le texte et suggérer automatiquement les sections appropriées',
      detectSections: 'Détecter les Sections',
      analyzing: 'Analyse...',
      back: 'Retour',
      import: 'Importer',
      fileReadError: 'Erreur lors de la lecture du fichier',
      pasteTextFirst: 'Collez du texte avant de continuer',
      textAnalysisError: 'Erreur lors de l\'analyse du texte',
      aiAuthRequired: 'Vous devez être authentifié pour utiliser l\'IA',
      aiNoSections: 'L\'IA n\'a pas pu détecter de sections dans le texte',
      aiDetectionError: 'Erreur lors de la détection automatique des sections',
      multiImportUnavailable: 'Importation de plusieurs sections non disponible',
      loading: 'Chargement...',
    },
    notesAndTodos: {
      title: 'Notes et Rappels',
      recordAudio: 'Enregistrer audio',
      importText: 'Importer texte',
      notesTab: 'Notes',
      todosTab: 'À Faire',
      addNotePlaceholder: 'Ajouter une note pour cette section... (max 500 caractères)',
      addNote: 'Ajouter une Note',
      noNotes: 'Aucune note pour cette section',
      editNote: 'Modifier',
      deleteNote: 'Supprimer',
      cancel: 'Annuler',
      save: 'Enregistrer',
      createdAt: 'à',
      addTodoDescription: 'Description du rappel...',
      priorityLow: 'Priorité Basse',
      priorityMedium: 'Priorité Moyenne',
      priorityHigh: 'Priorité Haute',
      dueDate: 'Date d\'échéance',
      removeDueDate: 'Retirer la date',
      addTodo: 'Ajouter',
      filterAll: 'Tous',
      filterPending: 'À faire',
      filterCompleted: 'Terminés',
      noTodos: 'Aucun rappel',
      noCompletedTodos: 'Aucun rappel terminé',
      loadingNotes: 'Chargement des notes...',
      noNotesYet: 'Aucune note encore',
      noPendingItems: 'Aucun élément en attente',
    },
    aiReview: {
      title: 'Révision IA de la Section',
      reviewButton: 'Réviser',
      suggestionsTab: 'Suggestions',
      rewriteTab: 'Réécriture Complète',
      statisticsTab: 'Statistiques',
      analyzingContent: 'Analyse du contenu...',
      looksGreat: 'Excellent !',
      noImprovementsNeeded: 'Aucune amélioration nécessaire. Votre contenu est bien écrit.',
      original: 'Original :',
      suggestion: 'Suggestion :',
      selected: 'Sélectionné',
      select: 'Sélectionner',
      ignore: 'Ignorer',
      narrativeLabel: 'Narratif',
      narrativeDesc: 'Style narratif avec des descriptions vivantes',
      formalLabel: 'Formel',
      formalDesc: 'Ton professionnel et soigné',
      intimateLabel: 'Intime',
      intimateDesc: 'Chaleureux et personnel, comme une lettre',
      generating: 'Génération...',
      regenerate: 'Régénérer',
      generate: 'Générer',
      originalVersion: 'Version Originale',
      rewrittenVersion: 'Version Réécrite',
      applying: 'Application...',
      replaceWithVersion: 'Remplacer par cette version',
      keepOriginal: 'Garder l\'original',
      contentMetrics: 'Métriques du Contenu',
      contentMetricsDesc: 'Statistiques de base sur votre écriture',
      wordCount: 'Nombre de Mots',
      characterCount: 'Nombre de Caractères',
      sentences: 'Phrases',
      paragraphs: 'Paragraphes',
      readability: 'Lisibilité',
      readabilityDesc: 'Votre contenu est-il facile à lire ?',
      readabilityScore: 'Score de Lisibilité',
      avgWordsPerSentence: 'Moyenne de Mots par Phrase',
      excellent: 'Excellent - Très facile à lire',
      good: 'Bon - Facile à lire',
      fair: 'Correct - Modérément facile',
      challenging: 'Difficile - Envisagez de simplifier',
      shortSentences: 'Phrases courtes - Faciles à suivre',
      moderateSentences: 'Longueur modérée - Bien équilibré',
      longSentences: 'Phrases longues - Envisagez de les diviser',
      improvementSummary: 'Résumé des Améliorations',
      basedOnAi: 'Basé sur l\'analyse IA',
      improvementsFound: 'Améliorations Trouvées',
      highPriority: 'Haute Priorité',
      mediumPriority: 'Priorité Moyenne',
      lowPriority: 'Basse Priorité',
      close: 'Fermer',
      applySelected: 'Appliquer la Sélection',
      failedToLoad: 'Échec du chargement des suggestions IA',
      failedToGenerate: 'Échec de la génération',
      noImprovementsSelected: 'Aucune amélioration sélectionnée',
      appliedImprovements: '{count} améliorations appliquées',
      failedToApply: 'Échec de l\'application des améliorations',
      appliedRewrite: 'Réécriture {tone} appliquée',
    },
    deleteDialog: {
      deleteBiographyLink: 'Supprimer la biographie',
      deleteAccountLink: 'Supprimer mon compte',
      bioModal1Title: 'Supprimer la Biographie ?',
      bioModal1Message: 'Êtes-vous sûr de vouloir supprimer cette biographie ? Cette action ne peut pas être annulée.',
      bioModal2Title: 'Confirmation Finale',
      bioModal2Message: "C'est votre dernière chance. Une fois supprimée, cette biographie et tout son contenu seront définitivement supprimés de nos serveurs. Nous ne pourrons pas les récupérer.",
      checkboxIrreversible: 'Je comprends que cette action est irréversible',
      bioInputPlaceholder: 'Tapez SUPPRIMER pour confirmer',
      accountModal1Title: 'Supprimer Votre Compte ?',
      accountModal1Message: 'La suppression de votre compte supprimera définitivement toutes vos biographies, données et profil. Cette action ne peut pas être annulée.',
      bioCount: 'Vous avez {count} biographie(s) qui seront supprimée(s)',
      accountModal2Title: 'Suppression Permanente du Compte',
      accountModal2Message: 'Cette action est irréversible. Une fois votre compte supprimé :\n• Toutes vos biographies seront définitivement supprimées\n• Votre profil et vos données seront supprimés\n• Vous ne pourrez récupérer aucune information\n• Cette action est conforme aux lois suisses sur la protection des données (LPD/RGPD droit à l\'effacement)',
      checkboxAllData: 'Je comprends que toutes mes données seront définitivement supprimées',
      accountInputPlaceholder: 'Tapez SUPPRIMER MON COMPTE pour confirmer',
      buttonCancel: 'Annuler',
      buttonContinue: 'Continuer',
      buttonDeleteBio: 'Supprimer Définitivement',
      buttonDeleteAccount: 'Supprimer le Compte Définitivement',
      successToastBio: 'Biographie supprimée avec succès',
      successMessageAccount: 'Votre compte a été supprimé',
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
      noBiographies: 'Beginnen Sie, Ihre Geschichte zu bewahren',
      noBiographiesSubtitle: 'Erstellen Sie Ihre erste Biografie, um zu beginnen',
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
      status: 'Status',
      visibility: 'Sichtbarkeit',
      progress: 'Fortschritt',
      statusDraft1: 'Entwurf 1',
      statusDraft2: 'Entwurf 2',
      statusDraft3: 'Entwurf 3',
      statusApproved: 'Genehmigt',
      statusPublished: 'Veröffentlicht',
      untitledBiography: 'Biografie ohne Titel',
      goToWorkspace: 'Zum Workspace',
      continueLastSection: 'Letzte Sektion Fortsetzen',
      updateAvailabilityMessage: 'Sobald Ihre Biografie veröffentlicht ist, können Sie ein neues jährliches Update hinzufügen, um Ihre Aktivitäten des letzten Jahres zu präsentieren.',
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
      notes: 'Notizen',
      aiSuggestions: 'KI-Vorschl\u00e4ge',
      shareLink: 'Link Teilen',
      export: 'Exportieren',
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
      hostedInSwitzerland: 'Biography Library - Gehostet in der Schweiz',
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
      pendingReminders: 'Ausstehende Erinnerungen',
      viewAllReminders: 'Alle Erinnerungen Anzeigen',
    },
    accessibility: {
      uiFontSize: 'UI-Schriftgröße',
      editorFontSize: 'Editor-Schriftgröße',
      small: 'S',
      normal: 'M',
      large: 'L',
      extraLarge: 'XL',
    },
    biographyType: {
      title: 'Neue Biografie Erstellen',
      subtitle: 'Wählen Sie, welche Art von Biografie Sie erstellen möchten',
      autobiography: 'Meine Autobiografie',
      autobiographyDescription: 'Schreiben Sie Ihre eigene Lebensgeschichte. Teilen Sie Ihre Erinnerungen, Erfahrungen und Ihr Vermächtnis.',
      autobiographyButton: 'Meine Geschichte Beginnen',
      mostPopular: 'Am beliebtesten',
      deceased: 'Biografie einer Verstorbenen Person',
      deceasedDescription: 'Ehren Sie das Andenken einer geliebten Person, die verstorben ist.',
      deceasedButton: 'Gedenkstätte Erstellen',
      reviewPeriod: '30-tägige Prüfungsfrist',
      warningTitle: 'Wichtig: Sie KÖNNEN KEINE Biografien erstellen von:',
      warningLine1: 'Lebenden Personen (außer sich selbst)',
      warningLine2: 'Minderjährigen (unter 18 Jahren)',
      warningLine3: 'Personen, deren Tod Sie nicht nachweisen können',
      warningLine4: 'Verstöße führen zur Kontosperrung.',
    },
    declaration: {
      stepIndicator: 'Schritt 1 von 3: Erklärung und Einwilligung',
      title: 'Erstellen Sie Ihre Autobiografie',
      subtitle: 'Bevor Sie beginnen, bestätigen Sie bitte Folgendes:',
      checkbox1: 'Ich bestätige, dass ich meine eigene Autobiografie schreibe und dass die Informationen, die ich über meine Identität (Name, Nachname, Geburtsdatum) bereitstelle, wahrheitsgemäß sind.',
      checkbox1Helper: 'Sie sind rechtlich für die Richtigkeit dieser Informationen verantwortlich.',
      checkbox2: 'Ich bestätige, dass ich mindestens 18 Jahre alt bin.',
      checkbox3: 'Ich habe die {terms} und die {privacy} gelesen und akzeptiere sie.',
      checkbox3TermsLink: 'Nutzungsbedingungen',
      checkbox3PrivacyLink: 'Datenschutzerklärung',
      checkbox4: 'Ich verstehe, dass ich allein für die Inhalte verantwortlich bin, die ich veröffentliche, und die Rechte lebender Personen, die ich erwähne, respektieren muss.',
      checkbox4Helper: 'Sie dürfen ohne Zustimmung keine sensiblen Daten über lebende Personen angeben.',
      infoTitle: 'Wichtige Informationen',
      canWriteTitle: 'Was Sie schreiben können:',
      canWriteLine1: 'Ihre Lebenserfahrungen und Erinnerungen',
      canWriteLine2: 'Allgemeine Erwähnungen von Familienmitgliedern (nur Namen und Beziehungen)',
      canWriteLine3: 'Historische Ereignisse, die Sie miterlebt haben',
      cannotWriteTitle: 'Was Sie NICHT ohne Zustimmung schreiben können:',
      cannotWriteLine1: 'Sensible Gesundheitsdaten über lebende Personen',
      cannotWriteLine2: 'Sexuelle Orientierung anderer',
      cannotWriteLine3: 'Gerichts-/Strafverfahren mit Beteiligung anderer',
      cannotWriteLine4: 'Private Finanzinformationen anderer',
      acceptButton: 'Akzeptieren und Fortfahren',
    },
    deceasedDeclaration: {
      stepIndicator: 'Schritt 1 von 3: Erklärung und Einwilligung',
      title: 'Biografie einer Verstorbenen Person Erstellen',
      subtitle: 'Bevor Sie beginnen, bestätigen Sie bitte Folgendes:',
      reviewPeriodTitle: '30-Tägige Prüfungsfrist',
      reviewPeriodText: 'Biografien verstorbener Personen werden nach 30 Tagen öffentlich sichtbar. Während dieser Zeit:',
      reviewPeriodBullet1: 'Die Biografie ist nur für Sie sichtbar',
      reviewPeriodBullet2: 'Sie können sie frei ändern',
      reviewPeriodBullet3: 'Andere Benutzer können Probleme melden, wenn sie erwähnt werden',
      reviewPeriodBullet4: 'Wir prüfen die Einhaltung der Nutzungsbedingungen',
      checkbox1: 'Ich erkläre unter meiner zivil- und strafrechtlichen Verantwortung, dass die Person, über die ich schreibe, verstorben ist.',
      checkbox1Helper: 'Falsche Erklärungen können nach Schweizer Strafgesetzbuch Art. 179decies (Identitätsbetrug) strafrechtlich verfolgt werden.',
      checkbox2: 'Ich bestätige, dass die Informationen, die ich veröffentlichen werde, wahrheitsgemäß sind oder eindeutig als meine persönliche Interpretation gekennzeichnet sind.',
      checkbox2Helper: 'Falsche oder diffamierende Aussagen können zu rechtlichen Schritten durch die Familie des Verstorbenen führen.',
      checkbox3: 'Ich verstehe, dass ich die Rechte lebender Personen, die ich erwähne, respektieren muss und ohne deren Zustimmung keine sensiblen Daten über sie angeben kann.',
      checkbox3Helper: 'Dies umfasst Gesundheitsdaten, sexuelle Orientierung, Gerichtsverfahren und private Finanzinformationen.',
      checkbox4: 'Ich verstehe, dass Biography Library einen Todesnachweis (Sterbeurkunde oder gleichwertige Dokumentation) anfordern kann, wenn diese Biografie gemeldet wird.',
      checkbox4Helper: 'Das Nichtvorlegen eines Nachweises führt zur Entfernung der Biografie und möglicher Kontosperrung.',
      checkbox5: 'Ich habe die {terms} und die {privacy} gelesen und akzeptiere sie.',
      checkbox5TermsLink: 'Nutzungsbedingungen',
      checkbox5PrivacyLink: 'Datenschutzerklärung',
      perspectivesTitle: 'Multiple Perspektiven',
      perspectivesText: 'Andere Familienmitglieder oder Bekannte können zusätzliche Biografien derselben Person erstellen. Jede Biografie spiegelt die Perspektive des Autors wider und trägt zu einem vollständigeren Bild bei. Wenn Sie eine andere Biografie dieser Person finden, können Sie:',
      perspectivesBullet1: 'Ihre Biografie mit deren verknüpfen',
      perspectivesBullet2: 'Kommentare oder Erinnerungen hinzufügen',
      perspectivesBullet3: 'Den anderen Autor für eine Zusammenarbeit kontaktieren',
      legalWarningTitle: 'Rechtshinweis: Verleumdung',
      legalWarningText: 'Auch wenn der Verstorbene keine Datenschutzrechte hat, können falsche oder diffamierende Aussagen zu Folgendem führen:',
      legalWarningBullet1: 'Zivilklagen der Familie wegen Schädigung ihrer Ehre',
      legalWarningBullet2: 'Strafrechtliche Verfolgung nach Schweizer Recht (Art. 173-177 StGB)',
      legalWarningBullet3: 'Sofortige Entfernung der Biografie und Kontosperrung',
      acceptButton: 'Akzeptieren und Fortfahren',
    },
    importDialog: {
      title: 'Text in Abschnitt "{sectionName}" importieren',
      description: 'Datei hochladen oder Text einfügen zum Importieren',
      dragFile: 'Datei hierher ziehen oder klicken zum Auswählen',
      dragFileHint: 'Unterstützte Formate: .txt, .rtf, .docx (max 5MB)',
      formats: 'Unterstützte Formate: .txt, .rtf, .docx (max 5MB)',
      selectFile: 'Datei Auswählen',
      or: 'oder',
      pasteLabel: 'Text direkt einfügen',
      pastePlaceholder: 'Fügen Sie hier den zu importierenden Text ein...',
      analyzeText: 'Text Analysieren',
      preview: 'Vorschau:',
      sectionsFound: 'Ich habe {count} Abschnitte in der Datei gefunden. Möchten Sie diese automatisch importieren?',
      autoImport: 'Ich habe {count} Abschnitte gefunden',
      singleSectionNotice: 'Dieser Text wird nur in {sectionName} importiert. Um mehrere Abschnitte zu importieren, verwenden Sie Markierungen in der Datei (## Abschnittstitel).',
      useMarkers: 'Um mehrere Abschnitte zu importieren, verwenden Sie Markierungen in der Datei (## Abschnittstitel).',
      replaceExisting: 'Vorhandenen Inhalt ersetzen',
      aiDetectPrompt: 'Lassen Sie die KI den Text analysieren und automatisch geeignete Abschnitte vorschlagen',
      detectSections: 'Abschnitte Erkennen',
      analyzing: 'Analyse...',
      back: 'Zurück',
      import: 'Importieren',
      fileReadError: 'Fehler beim Lesen der Datei',
      pasteTextFirst: 'Fügen Sie zuerst Text ein, bevor Sie fortfahren',
      textAnalysisError: 'Fehler bei der Textanalyse',
      aiAuthRequired: 'Sie müssen authentifiziert sein, um KI zu verwenden',
      aiNoSections: 'Die KI konnte keine Abschnitte im Text erkennen',
      aiDetectionError: 'Fehler bei der automatischen Abschnittserkennung',
      multiImportUnavailable: 'Import mehrerer Abschnitte nicht verfügbar',
      loading: 'Laden...',
    },
    notesAndTodos: {
      title: 'Notizen & Erinnerungen',
      recordAudio: 'Audio aufnehmen',
      importText: 'Text importieren',
      notesTab: 'Notizen',
      todosTab: 'Zu Erledigen',
      addNotePlaceholder: 'Fügen Sie eine Notiz für diesen Abschnitt hinzu... (max 500 Zeichen)',
      addNote: 'Notiz Hinzufügen',
      noNotes: 'Keine Notizen für diesen Abschnitt',
      editNote: 'Bearbeiten',
      deleteNote: 'Löschen',
      cancel: 'Abbrechen',
      save: 'Speichern',
      createdAt: 'um',
      addTodoDescription: 'Erinnerungsbeschreibung...',
      priorityLow: 'Niedrige Priorität',
      priorityMedium: 'Mittlere Priorität',
      priorityHigh: 'Hohe Priorität',
      dueDate: 'Fälligkeitsdatum',
      removeDueDate: 'Datum entfernen',
      addTodo: 'Hinzufügen',
      filterAll: 'Alle',
      filterPending: 'Zu erledigen',
      filterCompleted: 'Erledigt',
      noTodos: 'Keine Erinnerungen',
      noCompletedTodos: 'Keine erledigten Erinnerungen',
      loadingNotes: 'Notizen laden...',
      noNotesYet: 'Noch keine Notizen',
      noPendingItems: 'Keine ausstehenden Elemente',
    },
    aiReview: {
      title: 'KI-Abschnittsüberprüfung',
      reviewButton: 'Überprüfen',
      suggestionsTab: 'Vorschläge',
      rewriteTab: 'Vollständige Umschreibung',
      statisticsTab: 'Statistiken',
      analyzingContent: 'Inhalt wird analysiert...',
      looksGreat: 'Sieht gut aus!',
      noImprovementsNeeded: 'Keine Verbesserungen nötig. Ihr Inhalt ist gut geschrieben.',
      original: 'Original:',
      suggestion: 'Vorschlag:',
      selected: 'Ausgewählt',
      select: 'Auswählen',
      ignore: 'Ignorieren',
      narrativeLabel: 'Erzählend',
      narrativeDesc: 'Erzählstil mit lebhaften Beschreibungen',
      formalLabel: 'Formell',
      formalDesc: 'Professioneller und gepflegter Ton',
      intimateLabel: 'Intim',
      intimateDesc: 'Warm und persönlich, wie ein Brief',
      generating: 'Generierung...',
      regenerate: 'Neu generieren',
      generate: 'Generieren',
      originalVersion: 'Originalversion',
      rewrittenVersion: 'Umgeschriebene Version',
      applying: 'Anwenden...',
      replaceWithVersion: 'Mit dieser Version ersetzen',
      keepOriginal: 'Original behalten',
      contentMetrics: 'Inhaltsmetriken',
      contentMetricsDesc: 'Grundlegende Statistiken über Ihr Schreiben',
      wordCount: 'Wortanzahl',
      characterCount: 'Zeichenanzahl',
      sentences: 'Sätze',
      paragraphs: 'Absätze',
      readability: 'Lesbarkeit',
      readabilityDesc: 'Wie leicht ist Ihr Inhalt zu lesen?',
      readabilityScore: 'Lesbarkeitswert',
      avgWordsPerSentence: 'Durchschnitt Wörter pro Satz',
      excellent: 'Ausgezeichnet - Sehr leicht zu lesen',
      good: 'Gut - Leicht zu lesen',
      fair: 'Befriedigend - Mäßig leicht',
      challenging: 'Anspruchsvoll - Vereinfachung empfohlen',
      shortSentences: 'Kurze Sätze - Leicht zu folgen',
      moderateSentences: 'Moderate Länge - Gut ausbalanciert',
      longSentences: 'Lange Sätze - Aufteilen empfohlen',
      improvementSummary: 'Verbesserungsübersicht',
      basedOnAi: 'Basierend auf KI-Analyse',
      improvementsFound: 'Verbesserungen gefunden',
      highPriority: 'Hohe Priorität',
      mediumPriority: 'Mittlere Priorität',
      lowPriority: 'Niedrige Priorität',
      close: 'Schließen',
      applySelected: 'Auswahl anwenden',
      failedToLoad: 'KI-Vorschläge konnten nicht geladen werden',
      failedToGenerate: 'Generierung fehlgeschlagen',
      noImprovementsSelected: 'Keine Verbesserungen ausgewählt',
      appliedImprovements: '{count} Verbesserungen angewendet',
      failedToApply: 'Verbesserungen konnten nicht angewendet werden',
      appliedRewrite: '{tone} Umschreibung angewendet',
    },
    deleteDialog: {
      deleteBiographyLink: 'Biografie löschen',
      deleteAccountLink: 'Mein Konto löschen',
      bioModal1Title: 'Biografie Löschen?',
      bioModal1Message: 'Sind Sie sicher, dass Sie diese Biografie löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
      bioModal2Title: 'Endgültige Bestätigung',
      bioModal2Message: 'Dies ist Ihre letzte Chance. Nach dem Löschen werden diese Biografie und ihr gesamter Inhalt dauerhaft von unseren Servern entfernt. Wir können sie nicht wiederherstellen.',
      checkboxIrreversible: 'Ich verstehe, dass diese Aktion unwiderruflich ist',
      bioInputPlaceholder: 'Geben Sie LÖSCHEN ein, um zu bestätigen',
      accountModal1Title: 'Ihr Konto Löschen?',
      accountModal1Message: 'Das Löschen Ihres Kontos entfernt dauerhaft alle Ihre Biografien, Daten und Ihr Profil. Diese Aktion kann nicht rückgängig gemacht werden.',
      bioCount: 'Sie haben {count} Biografie(n), die gelöscht werden',
      accountModal2Title: 'Permanente Kontolöschung',
      accountModal2Message: 'Dies ist unwiderruflich. Sobald Sie Ihr Konto löschen:\n• Werden alle Ihre Biografien dauerhaft gelöscht\n• Werden Ihr Profil und Ihre Daten entfernt\n• Können Sie keine Informationen wiederherstellen\n• Diese Aktion entspricht den Schweizer Datenschutzgesetzen (DSG/DSGVO Recht auf Löschung)',
      checkboxAllData: 'Ich verstehe, dass alle meine Daten dauerhaft gelöscht werden',
      accountInputPlaceholder: 'Geben Sie MEIN KONTO LÖSCHEN ein, um zu bestätigen',
      buttonCancel: 'Abbrechen',
      buttonContinue: 'Fortfahren',
      buttonDeleteBio: 'Dauerhaft Löschen',
      buttonDeleteAccount: 'Konto Dauerhaft Löschen',
      successToastBio: 'Biografie erfolgreich gelöscht',
      successMessageAccount: 'Ihr Konto wurde gelöscht',
    },
  },
};

export const languageNames: Record<Language, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Fran\u00e7ais',
  it: 'Italiano',
};

export const languageFlags: Record<Language, string> = {
  en: '\ud83c\uddec\ud83c\udde7',
  de: '\ud83c\udde9\ud83c\uddea',
  fr: '\ud83c\uddeb\ud83c\uddf7',
  it: '\ud83c\uddee\ud83c\uddf9',
};
