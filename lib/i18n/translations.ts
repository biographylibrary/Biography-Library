import {
  getEchoGuideCopy,
  getEchoIcebreakerPools,
  type EchoIcebreakerPoolsByContext,
} from '@/lib/i18n/echo-guide-content';

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
    demoBiographies: string;
    workspace: string;
    dashboard: string;
    biography: string;
    settings: string;
    logout: string;
    admin: string;
    reviewer: string;
    notifications: string;
    darkMode: string;
    decreaseFontSize: string;
    increaseFontSize: string;
    signOut: string;
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
    forgotPassword: string;
    forgotPasswordTitle: string;
    forgotPasswordSubtitle: string;
    forgotPasswordButton: string;
    forgotPasswordSending: string;
    forgotPasswordSuccess: string;
    forgotPasswordSuccessDetail: string;
    backToLogin: string;
    resetPassword: string;
    resetPasswordTitle: string;
    resetPasswordSubtitle: string;
    newPassword: string;
    confirmNewPassword: string;
    resetPasswordButton: string;
    resetPasswordUpdating: string;
    resetPasswordSuccess: string;
    resetPasswordSuccessDetail: string;
    resetPasswordInvalidLink: string;
    resetPasswordInvalidLinkDetail: string;
    resetPasswordRequestNew: string;
    resetPasswordVerifying: string;
    atLeastEightChars: string;
    verifyEmailTitle: string;
    verifyEmailSubtitle: string;
    verifySentTo: string;
    verifyEmailDetail: string;
    verifyEmailLinkSent: string;
    verifyEmailAutoUpdate: string;
    verifyEmailChecking: string;
    verifyEmailAlreadyConfirmed: string;
    verifyEmailConfirmedTitle: string;
    verifyEmailConfirmedDetail: string;
    verifyEmailFailedTitle: string;
    verifyEmailFailedDetail: string;
    verifyEmailResendSuccessInline: string;
    verifyEmailDidntReceive: string;
    resendVerification: string;
    resendVerificationSending: string;
    resendVerificationSuccess: string;
    useAnotherEmail: string;
    resendCooldown: string;
    resendNewConfirmEmail: string;
    emailNotVerified: string;
    emailNotVerifiedDetail: string;
    mustAcceptTerms: string;
    accountSuspended: string;
    registrationLanguage: string;
    registrationLanguageHint: string;
    registrationLanguageAlertTitle: string;
    registrationLanguageAlertMessage: string;
  };
  accountSettings: {
    language: string;
    languageLockedHint: string;
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
    sectionsComplete: string;
    finalVersion: string;
    statusRemoved: string;
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
    statusPublished: string;
    statusUnderReview: string;
    statusPdfDraft: string;
    statusLockedPendingScreening: string;
    underReviewMessage: string;
    untitledBiography: string;
    goToWorkspace: string;
    continueLastSection: string;
    updateAvailabilityMessage: string;
    oneBiographyLimit: string;
    nextChapterAvailableNow: string;
    nextChapterAvailableOn: string;
    nextChapterCooldownDays: string;
    chapterCooldownBlocked: string;
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
    aiTimeout: string;
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
    subjectNameLabel: string;
    subjectNamePlaceholder: string;
    writerNameLabel: string;
    writerNamePlaceholder: string;
    writtenBy: string;
    memorialDetailsSubtitle: string;
    addAuthorName: string;
  };
  writingModeOnboarding: {
    stepTitle: string;
    stepSubtitle: string;
    writeHereTitle: string;
    writeHereDescription: string;
    guidedChaptersLabel: string;
    guidedChaptersDescription: string;
    freewritingLabel: string;
    freewritingDescription: string;
    importTitle: string;
    importDescription: string;
    continueButton: string;
    backButton: string;
  };
  modeSwitchWarning: {
    step1Title: string;
    step1Message: string;
    step1Confirm: string;
    step2Title: string;
    step2Message: string;
    step2ExportButton: string;
    step2SkipButton: string;
    step2Exporting: string;
    step3Title: string;
    step3Message: string;
    step3Checkbox: string;
    step3Confirm: string;
    step3Cancel: string;
    step3Deleting: string;
    fromSections: string;
    fromFreeflow: string;
    toSections: string;
    toFreeflow: string;
    goBack: string;
  };
  exportDialog: {
    title: string;
    description: string;
    pdfNotice: string;
    formatLabel: string;
    contentLabel: string;
    allSections: string;
    completedSections: string;
    customSections: string;
    additionalOptions: string;
    separateFiles: string;
    includeMetadata: string;
    includeNotesTodos: string;
    cancel: string;
    export: string;
    exporting: string;
    noSectionsError: string;
    exportError: string;
    fontLoadError: string;
    pdfFormat: string;
    pdfB5Standard: string;
    txtFormat: string;
    rtfFormat: string;
    docxFormat: string;
    emptySection: string;
    createdWith: string;
    allRightsReserved: string;
    preface: string;
    epilogue: string;
    acknowledgements: string;
    specificCredits: string;
    backCoverDescription: string;
    backCoverPropertyStatement: string;
    backCoverAiStatement: string;
    backCoverFooter: string;
    noCoverPhotoWarning: string;
    pdfDraftNotice: string;
    draftIterationNone: string;
    draftIterationCurrent: string;
    draftIterationWarning: string;
    draftLimitReached: string;
    /** Must enter pdf_draft status before watermarked draft downloads */
    draftPhaseRequiredBeforeDraft: string;
    finalDraftConfirmTitle: string;
    finalDraftConfirmDescription: string;
    draftAiReviewTitle: string;
    draftAiQuality: string;
    draftAiUnavailable: string;
    draftAiSeverity3Block: string;
    draftAiStrengths: string;
    draftAiSuggestions: string;
    draftAiSuggestionNarrative: string;
    draftAiSuggestionCompleteness: string;
    draftAiSuggestionClarity: string;
    draftAiSuggestionStyle: string;
    draftAiFeedbackUnavailable: string;
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
    publishedChapterNotice: string;
    freeFlowTab: string;
    sectionsTab: string;
    freeFlowReadOnly: string;
    importFreeFlowHint: string;
    importSaveTo: string;
    importDestinationFreeFlow: string;
    importFieldNotEmpty: string;
    importReplace: string;
    importAddAtEnd: string;
    exportModeFreeFlow: string;
    exportModeSections: string;
    bookStructureTitle: string;
    bookStructureAuthorCopyrightPage: string;
    bookStructureFrontMatter: string;
    bookStructureBackMatter: string;
    bookStructureDedication: string;
    bookStructureEpigraph: string;
    bookStructureEpigraphQuote: string;
    bookStructureEpigraphSource: string;
    bookStructurePreface: string;
    bookStructureEpilogue: string;
    bookStructureAcknowledgements: string;
    bookStructureCredits: string;
    bookStructureDedicationPlaceholder: string;
    bookStructureEpigraphQuotePlaceholder: string;
    bookStructureEpigraphSourcePlaceholder: string;
    bookStructurePrefacePlaceholder: string;
    bookStructureEpiloguePlaceholder: string;
    bookStructureAcknowledgementsPlaceholder: string;
    bookStructureCreditPlaceholder: string;
    importNoticeSectionsMode: string;
    importNoticeFreeflowMode: string;
    importFreeFlowReplace: string;
    importFreeFlowAppend: string;
    bookStructureMainText: string;
    bookStructureImportText: string;
    bookStructureImportTitle: string;
    bookStructureImportDescription: string;
    bookStructureImportPaste: string;
    bookStructureImportPastePlaceholder: string;
    bookStructureImportOrFile: string;
    bookStructureImportSelectFile: string;
    bookStructureImportConfirm: string;
    bookStructureImportReplaceWarning: string;
    bookStructureImportReplace: string;
    bookStructureImportCancel: string;
    noChaptersWarning: string;
    revisionRequired: string;
    /** Same banner list, when flags come from AI screening (under_review), not moderator request_edit */
    revisionRequiredAiScreening: string;
    /** Short line under the mustard “human review” banner when partial edit is available */
    aiScreeningFlaggedEditHint: string;
    /** Re-run AI screening after editing flagged passages (under_review) */
    resubmitAiScreening: string;
    resubmitAiScreeningPublishedToast: string;
    resubmitAiScreeningStillFlaggedToast: string;
    resubmitAiScreeningErrorToast: string;
    revisionFlaggedPassages: string;
    revisionReviewerNote: string;
    revisionDismiss: string;
    publicationStartPdfButton: string;
    publicationPdfDraftHint: string;
    publicationApproveFinalButton: string;
    publicationExportPdf: string;
    /** Hint when user can still use legacy “submit for review” from draft */
    publicationLegacySubmitHint: string;
    reviewPublication: {
      menuItem: string;
      title: string;
      description: string;
      incompleteMessage: string;
      freeflowEmptyHint: string;
      statusUnderReview: string;
      statusLockedPendingScreening: string;
      underReviewHint: string;
      lockedPendingScreeningHint: string;
      screeningPendingHint: string;
      revisionFlaggedHint: string;
      stepAiReviewTitle: string;
      stepAiReviewDesc: string;
      stepAiReviewButton: string;
      stepFreeflowPrepareTitle: string;
      stepFreeflowPrepareDesc: string;
      stepFreeflowPrepareButton: string;
      stepSubmitTitle: string;
      stepSubmitDesc: string;
      stepSubmitButton: string;
      stepPdfDraftTitle: string;
      stepPdfDraftDesc: string;
      stepPdfDraftButton: string;
      stepExportTitle: string;
      stepExportDesc: string;
      stepExportButton: string;
      stepApproveTitle: string;
      stepApproveDesc: string;
      stepApproveButton: string;
      approveDisabledHint: string;
      approveAiPendingHint: string;
      approveAiSuggestionsHint: string;
      severity3BlockHint: string;
      publishedTitle: string;
      publishedDesc: string;
      draftProgress: string;
    };
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
    markIncomplete: string;
    sectionCompletedHint: string;
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
    microphoneDenied: string;
    noSpeechDetected: string;
    voiceNetworkError: string;
    voiceServiceUnavailable: string;
    microphoneNotFound: string;
    voiceUnknownError: string;
    voiceNotSupported: string;
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
    downloadRtf: string;
    downloadTxt: string;
    downloadDocx: string;
    by: string;
    writtenBy: string;
    preservingStories: string;
    tokenMissing: string;
    notFoundOrDenied: string;
    biographyPrivate: string;
    archivedBanner: string;
    publishedOn: string;
    reportButton: string;
    reportModalTitle: string;
    reportModalSubtitle: string;
    reportTypeLabel: string;
    reportTypePlaceholder: string;
    reportDescriptionLabel: string;
    reportDescriptionPlaceholder: string;
    reportSubmit: string;
    reportSubmitting: string;
    reportSuccess: string;
    reportError: string;
    reportTypeLevel1: string;
    reportTypeLevel2: string;
    reportTypeLivingPerson: string;
    reportTypeRightToOblivion: string;
    reportTypeImpersonation: string;
    reportTypeCopyright: string;
    reportTypeOther: string;
    writtenIn: string;
    contentRightsNoticeAriaLabel: string;
    contentRightsNoticeParagraph1: string;
    contentRightsNoticeParagraph2: string;
    pdfOriginalLanguage: string;
    downloadsUnavailable: string;
    languageSwitcher: string;
    showOriginal: string;
    readInLanguage: string;
    translating: string;
    translationFailed: string;
    languageNameEn: string;
    languageNameIt: string;
    languageNameFr: string;
    languageNameDe: string;
    galleryPhotos: string;
    galleryLightboxTitle: string;
    galleryLightboxPrevious: string;
    galleryLightboxNext: string;
    galleryPhotoCounter: string;
    galleryOpenPhoto: string;
  };
  footer: {
    hostedInSwitzerland: string;
    termsOfService: string;
    privacyPolicy: string;
    cookiePolicy: string;
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
    checkingContent: string;
    publishBlocked: string;
    publishUnderReview: string;
    tooManyRequests: string;
    requestFailed: string;
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
    titleFreeflow: string;
    titleWithSection: string;
    titleNoSection: string;
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
    fileTooLarge: string;
    docUnsupported: string;
    formatUnsupported: string;
    tooManyFiles: string;
    filesQueued: string;
  };
  importMapping: {
    title: string;
    description: string;
    suggestAi: string;
    aiError: string;
    sourceAi: string;
    sourceTitle: string;
    sourceManual: string;
    confidenceHigh: string;
    confidenceMedium: string;
    confidenceLow: string;
    skipBlock: string;
    confirmImport: string;
    reviewRequired: string;
    untitledBlock: string;
  };
  notesAndTodos: {
    title: string;
    recordAudio: string;
    importText: string;
    exportText: string;
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
    editTodo: string;
    deleteTodo: string;
    confirmDelete: string;
    confirmDeleteNote: string;
    confirmDeleteTodo: string;
    sortBy: string;
    sortByDate: string;
    sortByPriority: string;
    sortByDueDate: string;
    globalTitle: string;
    notesAndTodosMenuItem: string;
  };
  aiReview: {
    title: string;
    reviewButton: string;
    suggestionsTab: string;
    rewriteTab: string;
    rewriteDesc: string;
    rewriteVersionLabel: string;
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
    apertusButton: string;
    apertusTitle: string;
    apertusSubtitle: string;
    apertusLoading: string;
    apertusError: string;
    apertusModelNote: string;
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
    errorDeleteBio: string;
    successMessageAccount: string;
  };
  aiUsage: {
    dailyLimit: string;
    weeklyLimit: string;
    dailyLimitReached: string;
    weeklyLimitReached: string;
    dailyLimitDetail: string;
    weeklyLimitDetail: string;
    resetsAt: string;
    today: string;
    thisWeek: string;
    usageIndicatorTitle: string;
    unlimited: string;
  };
  photos: {
    panelTitle: string;
    counter: string;
    uploadButton: string;
    captionPlaceholder: string;
    layoutLabel: string;
    layoutFullPage: string;
    layoutCover: string;
    layoutTwoVertical: string;
    layoutTwoHorizontal: string;
    layoutThreeMixed: string;
    coverCompositeTitle: string;
    customA5CoverLabel: string;
    customA5CoverHint: string;
    galleryPhotosHeading: string;
    deleteButton: string;
    deleteConfirmTitle: string;
    deleteConfirmMessage: string;
    uploadProgress: string;
    fileTooLarge: string;
    invalidFileType: string;
    uploadError: string;
    limitReached: string;
    deleteError: string;
    viewGrid: string;
    viewDetail: string;
    gridEditHint: string;
  };
  admin: {
    freezeBiography: string;
    freezeConfirmTitle: string;
    freezeConfirmMessage: string;
    freezing: string;
    frozenBannerTitle: string;
    frozenBannerMessage: string;
    moderationTitle: string;
    moderationSubtitle: string;
    moderationUnassignedBadge: string;
    filterStatus: string;
    filterType: string;
    filterSort: string;
    filterAll: string;
    statusUnassigned: string;
    statusAssigned: string;
    statusInReview: string;
    statusDecided: string;
    sortNewest: string;
    sortOldest: string;
    typeLevel1: string;
    typeLevel2: string;
    typeLevel3: string;
    typeUserReport: string;
    typeLivingPerson: string;
    typeRightToOblivion: string;
    typeImpersonation: string;
    typeCopyright: string;
    typeOther: string;
    colDate: string;
    colType: string;
    colBiography: string;
    colStatus: string;
    colAiSummary: string;
    colActions: string;
    actionOpen: string;
    noReports: string;
    loadingReports: string;
    errorLoading: string;
    unknownBiography: string;
    unknownAuthor: string;
    aiNoSummary: string;
    panelBiographyInfo: string;
    panelReportInfo: string;
    panelActions: string;
    panelInternalNotes: string;
    viewBiography: string;
    biographyStatus: string;
    aiViolationLevel: string;
    aiSummaryFull: string;
    flaggedPassages: string;
    flaggedPassageReason: string;
    flaggedPassageLevel: string;
    reporterEmail: string;
    reporterReason: string;
    reporterDetails: string;
    userReportDetails: string;
    noReportDescription: string;
    reportedAt: string;
    noFlaggedPassages: string;
    reportLockedByOther: string;
    reportLockedByOtherFallback: string;
    moderationConflictError: string;
    moderationActionError: string;
    moderationReaderReportHint: string;
    dismissReportKeepPublished: string;
    confirmDismissReport: string;
    confirmDismissReportDetail: string;
    notifyReportDismissed: string;
    freezeAndNotifyAuthor: string;
    confirmFreezeAndNotify: string;
    confirmFreezeAndNotifyDetail: string;
    notifyFrozenFromReport: string;
    moderationFreezeWhileReviewingDetail: string;
    takeOwnership: string;
    takingOwnership: string;
    approveAndPublish: string;
    publishWithWarning: string;
    returnToAuthor: string;
    removeBiography: string;
    messageToAuthor: string;
    messageToAuthorPlaceholder: string;
    confirmApprove: string;
    confirmApproveDetail: string;
    confirmPublishWarning: string;
    confirmPublishWarningDetail: string;
    confirmReturn: string;
    confirmReturnDetail: string;
    confirmRemove: string;
    confirmRemoveDetail: string;
    confirmAction: string;
    cancelAction: string;
    internalNotesPlaceholder: string;
    saveNotes: string;
    savingNotes: string;
    notesSaved: string;
    notifyPublished: string;
    notifyPublishedWarning: string;
    notifyReturned: string;
    notifyRemoved: string;
    assignedToYou: string;
    assignedToOther: string;
    usersTitle: string;
    usersSubtitle: string;
    usersNavLink: string;
    usersSearchPlaceholder: string;
    usersColAvatar: string;
    usersColName: string;
    usersColEmail: string;
    usersColRole: string;
    usersColJoined: string;
    usersColBiographies: string;
    usersColActions: string;
    usersSaveRole: string;
    usersRoleUser: string;
    usersRoleReviewer: string;
    usersRoleAdmin: string;
    usersRoleSuperAdmin: string;
    usersChangeRoleTitle: string;
    usersChangeRoleMessage: string;
    usersChangeRoleFrom: string;
    usersChangeRoleTo: string;
    usersRoleUpdated: string;
    usersCannotChangeSelf: string;
    usersCannotChangeSelfTooltip: string;
    usersPrev: string;
    usersNext: string;
    usersPageOf: string;
    usersAccessDenied: string;
    usersAccessDeniedMessage: string;
    usersRedirectingIn: string;
    usersLoadError: string;
    usersPageRestrictedToAdmins: string;
    usersColStatus: string;
    usersStatusActive: string;
    usersStatusSuspended: string;
    usersSuspend: string;
    usersReinstate: string;
    usersDeleteUser: string;
    usersConfirmSuspendTitle: string;
    usersConfirmSuspendDetail: string;
    usersConfirmReinstateTitle: string;
    usersConfirmReinstateDetail: string;
    usersConfirmDeleteTitle: string;
    usersConfirmDeleteDetail: string;
    usersToastSuspended: string;
    usersToastReinstated: string;
    usersToastDeleted: string;
    usersActionFailed: string;
    usersReviewerLanguages: string;
    usersReviewerLanguagesSaved: string;
    usersReviewerLanguagesError: string;
    overviewTitle: string;
    overviewSubtitle: string;
    navOverview: string;
    navModeration: string;
    navBiographies: string;
    navPublicCatalog: string;
    navReview: string;
    navUsers: string;
    navAiStats: string;
    reviewPageTitle: string;
    reviewPageSubtitle: string;
    reviewColSubject: string;
    reviewColTitle: string;
    reviewColAuthor: string;
    reviewColLanguage: string;
    reviewColType: string;
    reviewColSubmitted: string;
    reviewColRead: string;
    reviewColActions: string;
    reviewApprove: string;
    reviewReject: string;
    reviewConfirmReject: string;
    reviewCancelReject: string;
    reviewReasonLabel: string;
    reviewReasonPlaceholder: string;
    reviewReasonRequired: string;
    reviewEmpty: string;
    reviewEmptySubtitle: string;
    reviewLoadError: string;
    reviewApproveError: string;
    reviewRejectError: string;
    reviewFlaggedPassages: string;
    reviewApprovePassage: string;
    reviewRejectPassage: string;
    reviewAllPassagesReviewed: string;
    reviewAiReason: string;
    aiStatsPageTitle: string;
    aiStatsPageSubtitle: string;
    aiStatsDataNote: string;
    aiStatsFilterToday: string;
    aiStatsFilterLast7: string;
    aiStatsFilterLast30: string;
    aiStatsFilterAllTime: string;
    aiStatsTotalRequests: string;
    aiStatsUniqueUsers: string;
    aiStatsMostUsedAction: string;
    aiStatsAvgPerUser: string;
    aiStatsSection1: string;
    aiStatsSection2: string;
    aiStatsSection3: string;
    aiStatsSection4: string;
    aiStatsColAction: string;
    aiStatsColCount: string;
    aiStatsColName: string;
    aiStatsColEmail: string;
    aiStatsColTotalRequests: string;
    aiStatsColLastUsed: string;
    aiStatsColDate: string;
    aiStatsColUniqueUsers: string;
    aiStatsNoData: string;
    aiStatsLoadError: string;
    aiStatsNever: string;
    statTotalUsers: string;
    statNewThisWeek: string;
    statActiveThisMonth: string;
    statTotalBiographies: string;
    statPublished: string;
    statUnderReview: string;
    statRemoved: string;
    statOpenReports: string;
    statInReview: string;
    statResolvedThisWeek: string;
    sectionUsers: string;
    sectionBiographies: string;
    sectionModeration: string;
    sectionQuickActions: string;
    quickActionModeration: string;
    quickActionUsers: string;
    quickActionBiographies: string;
    quickActionPublicCatalog: string;
    quickActionReview: string;
    guardAccessDenied: string;
    guardAccessDeniedMessage: string;
    guardRedirectingIn: string;
    overviewPeriodLast7Days: string;
    overviewPeriodLast30Days: string;
    overviewParseErrorBanner: string;
    overviewViewAffected: string;
    reviewNoLanguages: string;
    reviewConflictTitle: string;
    reviewConflictDescription: string;
    reviewConflictCancel: string;
    reviewConflictProceed: string;
    reviewInReviewLabel: string;
    reviewUndo: string;
    reviewPassagesRemaining: string;
    reportLockWarning: string;
    usersNoUsersFound: string;
    bioPageTitle: string;
    bioPageSubtitle: string;
    bioSearchPlaceholder: string;
    bioFilterStatus: string;
    bioFilterType: string;
    bioFilterSort: string;
    bioFilterAll: string;
    bioStatusDraft: string;
    bioStatusPublished: string;
    bioStatusUnderReview: string;
    bioStatusPdfDraft: string;
    bioStatusLockedPendingScreening: string;
    bioStatusRemoved: string;
    bioTypeAll: string;
    bioTypeAutobiography: string;
    bioTypeDeceased: string;
    bioSortNewest: string;
    bioSortOldest: string;
    bioSortRecentlyPublished: string;
    bioSortMostViews: string;
    bioColTitle: string;
    bioColAuthor: string;
    bioColType: string;
    bioColStatus: string;
    bioColViews: string;
    bioColCreated: string;
    bioColPublished: string;
    bioColActions: string;
    bioActionView: string;
    bioNoResults: string;
    bioLoadError: string;
    bioPrev: string;
    bioNext: string;
    bioPageOf: string;
    bioPanelTitle: string;
    bioPanelSection1: string;
    bioPanelSection2: string;
    bioPanelSection3: string;
    bioPanelAuthor: string;
    bioPanelEmail: string;
    bioPanelType: string;
    bioPanelStatus: string;
    bioPanelPrivacy: string;
    bioPanelCreated: string;
    bioPanelUpdated: string;
    bioPanelShareToken: string;
    bioPanelNoContent: string;
    bioPanelOpenFull: string;
    bioPrivatePrivacy: string;
    bioFamilyPrivacy: string;
    bioPublicPrivacy: string;
    bioActionForcePublish: string;
    bioActionSetDraft: string;
    bioActionRemove: string;
    bioActionRestore: string;
    bioActionForcePublishConfirm: string;
    bioActionForcePublishDetail: string;
    bioActionSetDraftConfirm: string;
    bioActionSetDraftDetail: string;
    bioActionRemoveConfirm: string;
    bioActionRemoveDetail: string;
    bioActionRestoreConfirm: string;
    bioActionRestoreDetail: string;
    bioActionConfirm: string;
    bioActionCancel: string;
    bioNotifyForcePublished: string;
    bioNotifySetDraft: string;
    bioNotifyRemoved: string;
    bioNotifyRestored: string;
    bioActionSuccess: string;
    bioActionError: string;
    bioActionChapterCooldownError: string;
    bioActionFreeze: string;
    bioActionUnfreeze: string;
    bioActionFreezeConfirm: string;
    bioActionFreezeDetail: string;
    bioActionUnfreezeConfirm: string;
    bioActionUnfreezeDetail: string;
    bioNotifyFrozen: string;
    bioNotifyUnfrozen: string;
    bioStatusFrozen: string;
  };
  publicBiographies: {
    pageTitle: string;
    pageSubtitle: string;
    searchPlaceholder: string;
    filterLanguage: string;
    filterType: string;
    filterAll: string;
    typeAutobiography: string;
    typeMemorial: string;
    langAll: string;
    chaptersCount: string;
    publishedOn: string;
    readBiography: string;
    noResults: string;
    noResultsSubtitle: string;
    loading: string;
    errorLoading: string;
    untitled: string;
    unknownAuthor: string;
    featuredTitle: string;
    mostReadTitle: string;
    discoverTitle: string;
    signIn: string;
    startBiography: string;
    viewsCount: string;
    langOriginal: string;
    langTranslation: string;
  };
  pwa: {
    installBannerText: string;
    installButton: string;
    dismissButton: string;
    iosInstallText: string;
  };
  meta: {
    tagline: string;
  };
  notifications: {
    title: string;
    empty: string;
    markAllRead: string;
    markAsRead: string;
    justNow: string;
    biographyApproved: string;
    biographyRejected: string;
    biographyRejectedWithPassages: string;
    biographyAutoPublished: string;
    reviewAssigned: string;
  };
  errors: {
    title: string;
    description: string;
    tryAgain: string;
    goToDashboard: string;
  };
  settings: {
    biographyType: {
      label: string;
      autobiography: string;
      memorial: string;
    };
    coverMode: {
      label: string;
      graphic: string;
      photo: string;
      noPhotoWarning: string;
    };
    slug: {
      label: string;
      helper: string;
      duplicateError: string;
    };
    coverPreview: string;
    noCoverPhoto: string;
    goToPhotos: string;
  };
  helpChatbot: {
    title: string;
    placeholder: string;
    send: string;
    loading: string;
    lowConfidence: string;
    clearChat: string;
    openHelp: string;
    closeHelp: string;
    sessionExpired: string;
    rateLimitError: string;
    genericError: string;
    signInRequired: string;
  };
  onboardingWizard: {
    stepProgress: string;
    typeSubtitle: string;
    accountModelInfo: string;
    legalSubtitle: string;
    pathTitle: string;
    pathSubtitle: string;
    pathHint: string;
    publishReadyDescription: string;
    skipForNow: string;
    startTour: string;
    resumeIntro: string;
    resumeIntroDescription: string;
    reviewIntro: string;
    tourCompleted: string;
    tourSkip: string;
    tourNext: string;
    tourBack: string;
    tourFinish: string;
    tourStepOptional: string;
    tourTryStep: string;
    tryActionHint: string;
  };
  onboardingTour: {
    sectionsOverviewTitle: string;
    sectionsOverviewDesc: string;
    bookTitleTitle: string;
    bookTitleDesc: string;
    privacyTitle: string;
    privacyDesc: string;
    echoPanelTitle: string;
    echoPanelDesc: string;
    editSectionTitle: string;
    editSectionDesc: string;
    aiCreditsTitle: string;
    aiCreditsDesc: string;
    echoVoiceTitle: string;
    echoVoiceDesc: string;
    echoVoiceFreeflowTitle: string;
    echoVoiceFreeflowDesc: string;
    notesTitle: string;
    notesDesc: string;
    photosTitle: string;
    photosDesc: string;
    importTextTitle: string;
    importTextDesc: string;
    exportTextTitle: string;
    exportTextDesc: string;
    bookStructureTitle: string;
    bookStructureDesc: string;
    reviewPublicationTitle: string;
    reviewPublicationDesc: string;
    freeflowEditorTitle: string;
    freeflowEditorDesc: string;
    echoBubbleTitle: string;
    echoBubbleDesc: string;
    publishImportTitle: string;
    publishImportDesc: string;
    publishFinalTitle: string;
    publishFinalDesc: string;
    publishExportTitle: string;
    publishExportDesc: string;
    mobileMenuTitle: string;
    mobileMenuDesc: string;
    mobileSidebarOverviewHint: string;
  };
  echo: {
    hubEmpty: string;
    resumeBiography: string;
    resumeButton: string;
    newGuided: string;
    newImport: string;
    newPublishOnly: string;
    myBiographies: string;
    pickBiography: string;
    untitledBiography: string;
    inputPlaceholder: string;
    statusListening: string;
    statusSpeaking: string;
    statusThinking: string;
    statusFormulatingReply: string;
    statusWelcome: string;
    statusReady: string;
    statusVoiceMuted: string;
    statusPreparingReply: string;
    statusReadingMessage: string;
    statusWriting: string;
    statusStillWorking: string;
    statusSlowApology: string;
    statusLoadingHistory: string;
    statusLoadingOlder: string;
    errorGeneric: string;
    openEcho: string;
    closeEcho: string;
    aiToolsMenu: string;
    changePath: string;
    changePathTitle: string;
    changePathDescription: string;
    exportBeforeChange: string;
    confirmPathChange: string;
    onboardingWelcome: string;
    pathChanged: string;
    concentrationMode: string;
    exitConcentration: string;
    consultEcho: string;
    stopSpeaking: string;
    muteVoice: string;
    unmuteVoice: string;
    speakingBanner: string;
    activeSectionContext: string;
    sectionSwitchPrefix: string;
    icebreakerHint: string;
    icebreakerGuideHint: string;
    icebreakerDefaultSection: string;
    usageGuide: string;
    usageGuideIcebreaker: string;
    insertDraftPrompt: string;
    insertDraftConfirm: string;
    insertDraftDismiss: string;
    insertDraftDone: string;
    insertDraftCardTitle: string;
    insertDraftCardSubtitle: string;
    insertDraftLater: string;
    insertDraftShowPreview: string;
    insertDraftHidePreview: string;
    insertDraftReady: string;
    insertDraftSectionMismatch: string;
    insertDraftSuccessTitle: string;
    insertDraftSuccessBody: string;
    insertDraftOpenEditor: string;
    insertDraftDialogTitle: string;
    insertDraftDialogDescription: string;
    insertDraftContinueChat: string;
    insertDraftPendingBadge: string;
    loadOlderMessages: string;
    loadingOlderMessages: string;
    icebreakerPools: EchoIcebreakerPoolsByContext;
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
      demoBiographies: 'Demo biographies',
      workspace: 'Workspace',
      dashboard: 'Dashboard',
      biography: 'Biography',
      settings: 'Settings',
      logout: 'Logout',
      admin: 'Admin',
      reviewer: 'Reviewer',
      notifications: 'Notifications',
      darkMode: 'Dark mode',
      decreaseFontSize: 'Decrease font size',
      increaseFontSize: 'Increase font size',
      signOut: 'Sign out',
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
      createYourAccount: 'Create your account',
      registerSubtitle: 'Start preserving and sharing life stories today',
      fullName: 'Full name',
      yourName: 'Your name',
      emailPlaceholder: 'you@example.com',
      enterPassword: 'Enter your password',
      atLeastSixChars: 'At least 6 characters',
      repeatPassword: 'Repeat your password',
      passwordsDoNotMatch: 'Passwords do not match',
      passwordMinLength: 'Password must be at least 8 characters',
      createOne: 'Create one',
      createAccount: 'Create account',
      forgotPassword: 'Forgot password?',
      forgotPasswordTitle: 'Reset your password',
      forgotPasswordSubtitle: 'Enter your email address and we\'ll send you a link to reset your password',
      forgotPasswordButton: 'Send reset link',
      forgotPasswordSending: 'Sending...',
      forgotPasswordSuccess: 'Check your email',
      forgotPasswordSuccessDetail: 'We\'ve sent a password reset link to your email address. Please check your inbox.',
      backToLogin: 'Back to login',
      resetPassword: 'Reset password',
      resetPasswordTitle: 'Set a new password',
      resetPasswordSubtitle: 'Enter your new password below',
      newPassword: 'New password',
      confirmNewPassword: 'Confirm new password',
      resetPasswordButton: 'Update password',
      resetPasswordUpdating: 'Updating...',
      resetPasswordSuccess: 'Password updated',
      resetPasswordSuccessDetail: 'Your password has been updated successfully. You can now sign in with your new password.',
      resetPasswordInvalidLink: 'Invalid or expired link',
      resetPasswordInvalidLinkDetail: 'This password reset link has expired or already been used. Please request a new one.',
      resetPasswordRequestNew: 'Request a new reset link',
      resetPasswordVerifying: 'Verifying your reset link...',
      atLeastEightChars: 'At least 8 characters',
      verifyEmailTitle: 'Verify your email',
      verifyEmailSubtitle: 'We\'ve sent a verification email to your address. Please check your inbox and click the link to activate your account.',
      verifySentTo: 'We sent a confirmation link to',
      verifyEmailDetail: 'Didn\'t receive the email? Check your spam folder or resend it below.',
      verifyEmailLinkSent: 'We\'ve sent you a confirmation link. Click the link in the email to activate your account.',
      verifyEmailAutoUpdate: 'This page will update automatically once confirmed.',
      verifyEmailChecking: 'Checking...',
      verifyEmailAlreadyConfirmed: 'I\'ve already confirmed, sign me in',
      verifyEmailConfirmedTitle: 'Email confirmed!',
      verifyEmailConfirmedDetail: 'Your account has been verified. Redirecting to dashboard...',
      verifyEmailFailedTitle: 'Verification failed',
      verifyEmailFailedDetail: 'The confirmation link has expired or has already been used. Please request a new one.',
      verifyEmailResendSuccessInline: 'Email sent! Check your inbox.',
      verifyEmailDidntReceive: 'Didn\'t receive the email? Send it again',
      resendVerification: 'Resend verification email',
      resendVerificationSending: 'Sending...',
      resendVerificationSuccess: 'Verification email sent',
      useAnotherEmail: 'Use another email address',
      resendCooldown: 'Resend in {seconds}s',
      resendNewConfirmEmail: 'Send new confirmation email',
      emailNotVerified: 'Email not verified',
      emailNotVerifiedDetail: 'Please verify your email address to access the dashboard.',
      mustAcceptTerms: 'Required — you must accept the terms to continue',
      accountSuspended:
        'Your account has been suspended. If you think this is a mistake, reply to the email you received.',
      registrationLanguage: 'Your language',
      registrationLanguageHint:
        'Emails, onboarding, and the app interface will use this language. This choice cannot be changed later.',
      registrationLanguageAlertTitle: 'Language cannot be changed later',
      registrationLanguageAlertMessage:
        'The language you select will be used for emails, onboarding, and the entire app. After registration you will not be able to change it.',
    },
    accountSettings: {
      language: 'Language',
      languageLockedHint: 'Chosen at registration and cannot be changed.',
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
      sectionsComplete: 'Sections Complete',
      finalVersion: 'Final Version',
      statusRemoved: 'Removed',
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
      statusPublished: 'Published',
      statusUnderReview: 'Under review',
      statusPdfDraft: 'PDF draft',
      statusLockedPendingScreening: 'Pending screening',
      underReviewMessage: 'Our team is reviewing your biography. You will be notified of the outcome.',
      untitledBiography: 'Untitled Biography',
      goToWorkspace: 'Go to Workspace',
      continueLastSection: 'Continue Last Section',
      updateAvailabilityMessage: 'You can add a new chapter to your biography once a year to capture what has changed in your life.',
      oneBiographyLimit: 'You already have a biography. Each account is limited to one biography to maintain focus and quality.',
      nextChapterAvailableNow: 'You can add a new chapter to your biography now.',
      nextChapterAvailableOn: 'Next chapter available on {date}.',
      nextChapterCooldownDays: '{days} days until you can add a new chapter.',
      chapterCooldownBlocked: 'You can publish a new chapter one year after your last publication.',
    },
    biography: {
      newBiography: 'New Biography',
      biographyTitle: 'Biography Title',
      titlePlaceholder: 'e.g., My story — you can change the title later',
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
      aiTimeout: 'The AI is taking too long. Please try again.',
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
      subjectNameLabel: 'Protagonist name',
      subjectNamePlaceholder: 'e.g., Francesco Brignole',
      writerNameLabel: 'Writer name',
      writerNamePlaceholder: 'Your name as the author',
      writtenBy: 'Written by',
      memorialDetailsSubtitle: 'Who is this biography about, and who is writing it?',
      addAuthorName: 'Add author name…',
    },
    writingModeOnboarding: {
      stepTitle: 'How would you like to write?',
      stepSubtitle: 'Choose how you want to start your biography. You can always export and re-import your content later.',
      writeHereTitle: 'Write inside Biography Library',
      writeHereDescription: 'Compose your biography directly here. We will guide you through chapters, or you can write freely.',
      guidedChaptersLabel: 'Guide me through chapters',
      guidedChaptersDescription: 'Structured approach: childhood, family, education, career, and more — one chapter at a time.',
      freewritingLabel: 'I\'ll write freely',
      freewritingDescription: 'Open writing. No fixed structure. Write or dictate in your own style.',
      importTitle: 'Import an existing text',
      importDescription: 'You already have a written biography or document. Import it and use Biography Library as your archive.',
      continueButton: 'Start Writing',
      backButton: 'Back',
    },
    modeSwitchWarning: {
      step1Title: 'Warning: switching mode will delete your current content',
      step1Message: 'If you switch from {from} to {to}, all the text you have written in {from} will be permanently deleted. This action cannot be undone.',
      step1Confirm: 'I understand, continue',
      step2Title: 'Export your content before switching',
      step2Message: 'Before deleting your {from} content, we strongly recommend exporting it. You can then re-import it into the new mode.',
      step2ExportButton: 'Export my content now (.txt and .docx)',
      step2SkipButton: 'I already have a copy, skip export',
      step2Exporting: 'Exporting...',
      step3Title: 'Permanently delete {from} content?',
      step3Message: 'You are about to permanently delete all your {from} content. This cannot be recovered.',
      step3Checkbox: 'I understand that my content will be deleted and this cannot be undone.',
      step3Confirm: 'Delete and switch mode',
      step3Cancel: 'Keep my content, go back',
      step3Deleting: 'Deleting...',
      fromSections: 'sections',
      fromFreeflow: 'free writing',
      toSections: 'sections',
      toFreeflow: 'free writing',
      goBack: 'Go back',
    },
    exportDialog: {
      title: 'Export Biography',
      description: 'Choose format and sections to export',
      pdfNotice: 'PDF export is only available once the biography has been completed and approved. You can export in TXT, RTF, and DOCX formats in the meantime.',
      formatLabel: 'Export format',
      contentLabel: 'Content selection',
      allSections: 'Full biography (all sections)',
      completedSections: 'Completed sections only',
      customSections: 'Select specific sections',
      additionalOptions: 'Additional options',
      separateFiles: 'Split into separate files per section (.zip archive)',
      includeMetadata: 'Include metadata (creation date, last modified)',
      includeNotesTodos: 'Include notes and reminders',
      cancel: 'Cancel',
      export: 'Export',
      exporting: 'Exporting...',
      noSectionsError: 'No sections to export.',
      exportError: 'Export error. Please try again.',
      fontLoadError: 'Font not available — export aborted. Please reload the page and try again.',
      pdfFormat: 'PDF - Complete formatted document',
      pdfB5Standard: 'PDF B5 (176×250mm)',
      txtFormat: 'TXT - Plain text without formatting',
      rtfFormat: 'RTF - Text with basic formatting',
      docxFormat: 'DOCX - Word document',
      emptySection: '(empty)',
      createdWith: 'Created with Biography Library',
      allRightsReserved: '© {year} all rights reserved',
      preface: 'Preface',
      epilogue: 'Epilogue',
      acknowledgements: 'Acknowledgements',
      specificCredits: 'Credits',
      backCoverDescription:
        'This biography was managed with Biography Library, the digital archive of human memory that freely offers the tools to create and preserve your own story or that of a loved one.',
      backCoverPropertyStatement:
        'The text of this biography is the exclusive property of the author, who retains all rights to pursue any unauthorized use, including use for AI training purposes.',
      backCoverAiStatement:
        "Biography Library prohibits the use of content hosted on its servers for text mining, AI training or machine learning, pursuant to the Swiss Copyright Act (CopA/LDA) and the author's exclusive right of use under Swiss law.",
      backCoverFooter: 'Biography Library · biographylibrary.org',
      noCoverPhotoWarning: 'A cover photo is required to generate the PDF. Upload a photo and tag it as cover in the Photos section.',
      pdfDraftNotice: 'This is a draft proof PDF. It reflects the current state of your biography and lets you verify layout and content before submitting for review.',
      draftIterationNone: 'No draft PDF generated yet. Exporting will create your first draft.',
      draftIterationCurrent: 'Draft {n} already generated. Exporting will create draft {next}.',
      draftIterationWarning: 'You have already generated {n} draft PDFs. Consider submitting for review soon.',
      draftLimitReached: 'You have reached the maximum number of draft PDFs for this biography. Submit for review before generating more.',
      draftPhaseRequiredBeforeDraft:
        'Start the PDF review phase from the editor (Start PDF review) before downloading watermarked drafts.',
      finalDraftConfirmTitle: 'Generate Third and Final Draft',
      finalDraftConfirmDescription: 'This is your third and final draft. No further draft revisions will be allowed after this export. Make sure your biography is ready before proceeding.',
      draftAiReviewTitle: 'AI Draft Review',
      draftAiQuality: 'Quality: {n}/5',
      draftAiUnavailable: 'AI review unavailable. You can still proceed to publication.',
      draftAiSeverity3Block: 'This draft contains content that may block publication. Please review before proceeding.',
      draftAiStrengths: 'Strengths',
      draftAiSuggestions: 'Suggestions',
      draftAiSuggestionNarrative: 'Narrative',
      draftAiSuggestionCompleteness: 'Completeness',
      draftAiSuggestionClarity: 'Clarity',
      draftAiSuggestionStyle: 'Style',
      draftAiFeedbackUnavailable: 'Draft AI feedback unavailable for this export.',
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
      publishedChapterNotice: 'This chapter is published and cannot be edited.',
      freeFlowTab: 'Free Flow',
      sectionsTab: 'Sections',
      freeFlowReadOnly: 'Free Flow text (read only)',
      importFreeFlowHint: 'Importing a biography written elsewhere? Choose Free Flow. You can manually copy sections later.\nImporting a single section from a Biography Library export? Paste only that section\'s text and select which section to save it to.',
      importSaveTo: 'Save to',
      importDestinationFreeFlow: 'Free Flow',
      importFieldNotEmpty: 'This field already contains text. What would you like to do?',
      importReplace: 'Replace',
      importAddAtEnd: 'Add at the end',
      exportModeFreeFlow: 'Exporting in Free Flow mode — sections will not be included.',
      exportModeSections: 'Exporting in Sections mode — free flow text will not be included.',
      bookStructureTitle: 'Book Structure',
      bookStructureAuthorCopyrightPage:
        'Include short author credits page before the title leaf (PDF). Full legal statement remains on back cover.',
      bookStructureFrontMatter: 'Front matter',
      bookStructureBackMatter: 'Back matter',
      bookStructureDedication: 'Dedication',
      bookStructureEpigraph: 'Epigraph',
      bookStructureEpigraphQuote: 'Quote',
      bookStructureEpigraphSource: 'Attribution',
      bookStructurePreface: 'Preface / Incipit',
      bookStructureEpilogue: 'Epilogue',
      bookStructureAcknowledgements: 'Acknowledgements',
      bookStructureCredits: 'Specific credits',
      bookStructureDedicationPlaceholder: 'e.g. "To my mother"',
      bookStructureEpigraphQuotePlaceholder: 'Quote text…',
      bookStructureEpigraphSourcePlaceholder: 'Author, source…',
      bookStructurePrefacePlaceholder: 'Write the preface…',
      bookStructureEpiloguePlaceholder: 'Write the epilogue…',
      bookStructureAcknowledgementsPlaceholder: 'Write the acknowledgements…',
      bookStructureCreditPlaceholder: 'Specific credits…',
      importNoticeSectionsMode: 'You are in Sections mode — text will be imported into the currently selected section. To import into a different chapter, select it first in the sidebar. If you want to import a full biography written elsewhere as a single block, switch to Free Flow mode before importing.',
      importNoticeFreeflowMode: 'You are in Free Flow mode — ideal for importing text written outside Biography Library. Choose whether to replace your current content or add the imported text at the end. If you prefer a guided, chapter-by-chapter approach, switch to Sections mode before importing.',
      importFreeFlowReplace: 'Replace all existing content',
      importFreeFlowAppend: 'Add to the end of existing content',
      bookStructureMainText: 'Main text',
      bookStructureImportText: 'Import text',
      bookStructureImportTitle: 'Import main text',
      bookStructureImportDescription: 'Paste your text or upload a .txt file. This will replace the current main content.',
      bookStructureImportPaste: 'Paste text',
      bookStructureImportPastePlaceholder: 'Paste your text here…',
      bookStructureImportOrFile: 'or upload a file',
      bookStructureImportSelectFile: 'Select .txt file',
      bookStructureImportConfirm: 'Import',
      bookStructureImportReplaceWarning: 'The main text already contains content. Importing will replace it. Are you sure?',
      bookStructureImportReplace: 'Yes, replace',
      bookStructureImportCancel: 'Cancel',
      noChaptersWarning: 'No chapters defined. The book will be a continuous text without chapter breaks. To add chapters, switch to Sections mode.',
      revisionRequired: 'Revision required. The reviewer flagged the following:',
      revisionRequiredAiScreening:
        'Automatic screening flagged the passages below. Edit those parts—or your full final text in one place—then resubmit for screening when ready.',
      aiScreeningFlaggedEditHint:
        'You may edit only the sections listed below, or adjust the complete final text above. A reviewer will still verify the report.',
      resubmitAiScreening: 'Resubmit for screening',
      resubmitAiScreeningPublishedToast: 'Screening passed — your biography is now live.',
      resubmitAiScreeningStillFlaggedToast: 'The screener still flagged passages. The list below is updated.',
      resubmitAiScreeningErrorToast: 'Automatic screening did not finish. Retry in a few minutes, or wait for a moderator.',
      revisionFlaggedPassages: 'Flagged passages',
      revisionReviewerNote: 'Reviewer note',
      revisionDismiss: 'Dismiss',
      publicationStartPdfButton: 'Start PDF review',
      publicationPdfDraftHint:
        'Download up to three watermarked PDFs from Export, then approve the final version to run automatic screening.',
      publicationApproveFinalButton: 'Approve final PDF & run screening',
      publicationExportPdf: 'Export PDF',
      publicationLegacySubmitHint:
        'For the full print-ready path (PDF drafts → automatic screening), use “Final Review with AI” first, then Start PDF review. You can still submit from here for a quicker check without the PDF phase.',
      reviewPublication: {
        menuItem: 'Review & Publication',
        title: 'Review & Publication',
        description: 'Complete the review workflow and export your biography as a print-ready PDF.',
        incompleteMessage:
          'Before you can start review and publication, complete every chapter in the sidebar. Each section should have your story written and marked complete.',
        freeflowEmptyHint: 'Add your biography text in the editor before starting review and publication.',
        statusUnderReview: 'Under review',
        statusLockedPendingScreening: 'Screening in progress',
        underReviewHint:
          'Your biography is being reviewed. You can return here when the review is complete to continue with PDF export.',
        lockedPendingScreeningHint:
          'Your final PDF was approved and automatic screening is running. You will be notified when it completes.',
        screeningPendingHint: 'Automatic text screening is running…',
        revisionFlaggedHint:
          'Some passages were flagged. Edit the highlighted sections in the editor, then resubmit for screening when ready.',
        stepAiReviewTitle: 'Optional: AI narrative review',
        stepAiReviewDesc:
          'Explore alternative chapter orders and narrative structures suggested by AI before submitting.',
        stepAiReviewButton: 'Open AI final review',
        stepFreeflowPrepareTitle: 'Prepare final text for PDF',
        stepFreeflowPrepareDesc:
          'Lock your free-flow text as the final version so you can start watermarked PDF drafts.',
        stepFreeflowPrepareButton: 'Prepare final text',
        stepSubmitTitle: 'Quick submit (legacy)',
        stepSubmitDesc:
          'Skip the PDF draft phase and send directly for automatic screening. For print-ready PDFs, use the steps above first.',
        stepSubmitButton: 'Submit for review',
        stepPdfDraftTitle: 'Start PDF review',
        stepPdfDraftDesc:
          'Generate watermarked PDF drafts, check layout and cover, then approve the final version.',
        stepPdfDraftButton: 'Start PDF review',
        stepExportTitle: 'Export PDF draft',
        stepExportDesc: 'Download and preview your watermarked PDF draft before final approval.',
        stepExportButton: 'Open export',
        stepApproveTitle: 'Approve final PDF',
        stepApproveDesc: 'Confirm the PDF is ready and run automatic content screening.',
        stepApproveButton: 'Approve & run screening',
        approveDisabledHint:
          'Export at least one watermarked PDF draft before approving. Open Export to generate your first draft.',
        approveAiPendingHint:
          'Wait for the AI draft review to finish after exporting, or export a new draft if needed.',
        approveAiSuggestionsHint:
          'AI suggested improvements in Export. You can still approve if you are satisfied with this draft.',
        severity3BlockHint:
          'This draft contains critical issues flagged by AI. Review the feedback and export a new draft before approving.',
        publishedTitle: 'Published',
        publishedDesc: 'Your biography passed screening. You can export the final PDF at any time.',
        draftProgress: 'Drafts generated: {count}',
      },
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
      markIncomplete: 'Reopen for editing',
      sectionCompletedHint: 'This section is marked complete. Click «Reopen for editing» to change it again.',
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
      microphoneDenied: 'Microphone access denied.',
      noSpeechDetected: 'No speech detected. Try again.',
      voiceNetworkError: 'Network error. Check your connection.',
      voiceServiceUnavailable: 'Voice service unavailable.',
      microphoneNotFound: 'No microphone found.',
      voiceUnknownError: 'Voice recognition error. Try again.',
      voiceNotSupported: 'Voice input is not supported in this browser. Try Chrome or Edge.',
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
      downloadRtf: 'Download RTF',
      downloadTxt: 'Download TXT',
      downloadDocx: 'Download DOCX',
      by: 'By',
      writtenBy: 'Written by',
      preservingStories: 'Because every life deserves to be remembered',
      tokenMissing: 'Access token is missing',
      notFoundOrDenied: 'Biography not found or access denied',
      biographyPrivate: 'This biography is private',
      archivedBanner: 'This biography has been archived.',
      publishedOn: 'Published',
      reportButton: 'Report',
      reportModalTitle: 'Report this biography',
      reportModalSubtitle: 'Help us keep the library safe and accurate.',
      reportTypeLabel: 'Reason for report',
      reportTypePlaceholder: 'Select a reason...',
      reportDescriptionLabel: 'Additional details (optional)',
      reportDescriptionPlaceholder: 'Provide any additional context...',
      reportSubmit: 'Submit report',
      reportSubmitting: 'Submitting...',
      reportSuccess: 'Report received. Our team will review it.',
      reportError: 'Something went wrong. Please try again.',
      reportTypeLevel1: 'Harmful or illegal content',
      reportTypeLevel2: 'Hate speech or harassment',
      reportTypeLivingPerson: 'This person is alive',
      reportTypeRightToOblivion: 'Remove my personal data',
      reportTypeImpersonation: 'False identity',
      reportTypeCopyright: 'Copyright violation',
      reportTypeOther: 'Other',
      writtenIn: 'Written in {language}',
      contentRightsNoticeAriaLabel: 'Copyright and AI use notice',
      contentRightsNoticeParagraph1:
        'The text of this biography is the exclusive property of the author, who retains every right to take action against any unauthorized use, including use for training artificial intelligence systems.',
      contentRightsNoticeParagraph2:
        'Biography Library prohibits the use of content hosted on its servers for text mining, AI training, or machine learning, pursuant to the Swiss Copyright Act (CopA) and the author\'s exclusive right of use under Swiss law.',
      pdfOriginalLanguage: 'PDF, TXT and DOCX available only in the original language ({language})',
      downloadsUnavailable:
        'Word and plain-text downloads are not available for this biography. You can still use the PDF button above.',
      languageSwitcher: 'Reading language',
      showOriginal: 'Original',
      readInLanguage: 'Read in {language}',
      translating: 'Translating…',
      translationFailed: 'Translation failed. Please try again.',
      languageNameEn: 'English',
      languageNameIt: 'Italian',
      languageNameFr: 'French',
      languageNameDe: 'German',
      galleryPhotos: 'Photos',
      galleryLightboxTitle: 'Photo gallery',
      galleryLightboxPrevious: 'Previous photo',
      galleryLightboxNext: 'Next photo',
      galleryPhotoCounter: 'Photo {current} of {total}',
      galleryOpenPhoto: 'View photo: {caption}',
    },
    footer: {
      hostedInSwitzerland: 'Biography Library - Hosted in Switzerland',
      termsOfService: 'T&C',
      privacyPolicy: 'Privacy',
      cookiePolicy: 'Cookies',
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
      checkingContent: 'Checking content guidelines...',
      publishBlocked: 'Publication blocked. This biography contains content that violates our guidelines.',
      publishUnderReview: 'Your biography has been sent for review. You will be notified of the outcome.',
      tooManyRequests: 'Too many attempts. Please wait a minute and try again.',
      requestFailed: 'Something went wrong. Please try again.',
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
      conversationPending: 'You have a session in progress. Continue?',
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
      reviewPeriodTitle: 'Publication and reporting',
      reviewPeriodText:
        'Once published, your memorial biography is visible according to the visibility you choose (private, link-only, or public). Anyone who reads it may file a report; our moderation team reviews reports and may take action if needed.',
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
      titleFreeflow: 'Import text',
      titleWithSection: 'Import text into {sectionName}',
      titleNoSection: 'Import text into section',
      description: 'Upload a file or paste text to import',
      dragFile: 'Drag a file here or click to select',
      dragFileHint: 'Supported format: .txt (max 5MB)',
      formats: 'Supported formats: .txt, .docx, .rtf (max 5MB each, up to 10 files)',
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
      fileTooLarge: 'File too large. Maximum size: 5MB',
      docUnsupported: 'Unsupported .doc format. Convert to .docx or .txt',
      formatUnsupported: 'Unsupported format. Use .txt, .docx or .rtf',
      tooManyFiles: 'Too many files. Maximum 10 per import',
      filesQueued: '{count} file(s) ready to import',
    },
    importMapping: {
      title: 'Map chapters to sections',
      description: 'Review how imported chapters will be placed in your biography sections. Adjust assignments or use AI suggestions.',
      suggestAi: 'Suggest with AI',
      aiError: 'AI suggestion failed. Choose a section manually.',
      sourceAi: 'AI suggested',
      sourceTitle: 'Title match',
      sourceManual: 'Manual',
      confidenceHigh: 'High confidence',
      confidenceMedium: 'Medium confidence',
      confidenceLow: 'Low confidence',
      skipBlock: 'Skip',
      confirmImport: 'Confirm import',
      reviewRequired: 'Some blocks have low confidence. Review assignments or use AI before importing.',
      untitledBlock: 'Untitled block',
    },
    notesAndTodos: {
      title: 'Notes & Reminders',
      recordAudio: 'Record audio',
      importText: 'Import text',
      exportText: 'Export text',
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
      editTodo: 'Edit',
      deleteTodo: 'Delete',
      confirmDelete: 'Confirm delete',
      confirmDeleteNote: 'Delete this note? This action cannot be undone.',
      confirmDeleteTodo: 'Delete this reminder? This action cannot be undone.',
      sortBy: 'Sort by',
      sortByDate: 'Date added',
      sortByPriority: 'Priority',
      sortByDueDate: 'Due date',
      globalTitle: 'Notes & To-Do',
      notesAndTodosMenuItem: 'Notes & To-Do',
    },
    aiReview: {
      title: 'AI Section Review',
      reviewButton: 'Review',
      suggestionsTab: 'Suggestions',
      rewriteTab: 'Full Rewrite',
      rewriteDesc: 'A revision that improves flow between passages while keeping all facts and your voice.',
      rewriteVersionLabel: 'Version {n}',
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
      appliedRewrite: 'Revision applied to the section',
      apertusButton: 'Swiss AI review',
      apertusTitle: 'Review with Swiss AI',
      apertusSubtitle: 'Editorial feedback on «{section}» via Apertus (Swiss open-source AI)',
      apertusLoading: 'Apertus is reading your section…',
      apertusError: 'Swiss AI review is unavailable. Please try again later.',
      apertusModelNote: 'Model: {model}',
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
      successToastBio: 'Your biography has been deleted.',
      errorDeleteBio: 'Failed to delete the biography. Please try again.',
      successMessageAccount: 'Your account has been deleted',
    },
    aiUsage: {
      dailyLimit: '40 actions/day',
      weeklyLimit: '150 actions/week',
      dailyLimitReached: 'Daily AI limit reached',
      weeklyLimitReached: 'Weekly AI limit reached',
      dailyLimitDetail: "You've used all 40 AI actions for today. Your limit resets at midnight UTC.",
      weeklyLimitDetail: "You've used all 150 AI actions for this week. Your limit resets on Monday.",
      resetsAt: 'Resets at',
      today: 'Today',
      thisWeek: 'This week',
      usageIndicatorTitle: 'AI usage',
      unlimited: 'Unlimited',
    },
    photos: {
      panelTitle: 'Photos',
      counter: '{count}/{max} photos',
      uploadButton: 'Upload photo',
      captionPlaceholder: 'Add a caption...',
      layoutLabel: 'Layout',
      layoutFullPage: 'Full page',
      layoutCover: 'Cover',
      layoutTwoVertical: 'Two photos — stacked',
      layoutTwoHorizontal: 'Two photos — stacked (pair)',
      layoutThreeMixed: 'Three photos — wide top, two below',
      coverCompositeTitle: 'Cover photo (title card)',
      customA5CoverLabel: 'Custom A5 cover (176×250mm)',
      customA5CoverHint:
        'Upload a pre-designed image in A5 format (176×250mm, 300dpi recommended). If the image has different proportions, it will be adapted to fit.',
      galleryPhotosHeading: 'Photo gallery',
      deleteButton: 'Delete photo',
      deleteConfirmTitle: 'Delete photo',
      deleteConfirmMessage: 'Are you sure you want to delete this photo? This action cannot be undone.',
      uploadProgress: 'Uploading...',
      fileTooLarge: 'File is too large. Maximum size is 5 MB.',
      invalidFileType: 'Invalid file type. Please upload a JPG, PNG, or WEBP image.',
      uploadError: 'Failed to upload photo. Please try again.',
      limitReached: 'You have reached the maximum of {max} photos per biography.',
      deleteError: 'Failed to delete photo. Please try again.',
      viewGrid: 'Thumbnail view',
      viewDetail: 'Detailed view',
      gridEditHint: 'Drag to reorder. Click a photo to edit caption and layout.',
    },
    admin: {
      freezeBiography: 'Freeze biography',
      freezeConfirmTitle: 'Freeze this biography?',
      freezeConfirmMessage: 'This will make the biography fully read-only for the author. This action cannot be undone from the editor.',
      freezing: 'Freezing...',
      frozenBannerTitle: 'This biography has been frozen',
      frozenBannerMessage: 'This biography is read-only and cannot be edited.',
      moderationTitle: 'Moderation',
      moderationSubtitle: 'User reports and flagged content — for AI author review use Review',
      moderationUnassignedBadge: 'unassigned',
      filterStatus: 'Status',
      filterType: 'Type',
      filterSort: 'Sort',
      filterAll: 'All',
      statusUnassigned: 'Unassigned',
      statusAssigned: 'Assigned',
      statusInReview: 'In review',
      statusDecided: 'Decided',
      sortNewest: 'Newest first',
      sortOldest: 'Oldest first',
      typeLevel1: 'Level 1 – Blocked',
      typeLevel2: 'Level 2 – Review',
      typeLevel3: 'Level 3 – Warning',
      typeUserReport: 'User Report',
      typeLivingPerson: 'Living Person',
      typeRightToOblivion: 'Right to Oblivion',
      typeImpersonation: 'Impersonation',
      typeCopyright: 'Copyright',
      typeOther: 'Other',
      colDate: 'Date',
      colType: 'Type',
      colBiography: 'Biography',
      colStatus: 'Status',
      colAiSummary: 'AI Summary',
      colActions: 'Actions',
      actionOpen: 'Open',
      noReports: 'No reports found.',
      loadingReports: 'Loading reports…',
      errorLoading: 'Failed to load reports.',
      unknownBiography: 'Untitled biography',
      unknownAuthor: 'Unknown author',
      aiNoSummary: 'No summary available',
      panelBiographyInfo: 'Biography',
      panelReportInfo: 'Report Details',
      panelActions: 'Moderator Actions',
      panelInternalNotes: 'Internal Notes',
      viewBiography: 'View biography',
      biographyStatus: 'Status',
      aiViolationLevel: 'AI Violation Level',
      aiSummaryFull: 'AI Analysis Summary',
      flaggedPassages: 'Flagged Passages',
      flaggedPassageReason: 'Reason',
      flaggedPassageLevel: 'Level',
      reporterEmail: 'Reported by',
      reporterReason: 'Reason category',
      reporterDetails: 'Details',
      userReportDetails: 'Report details',
      noReportDescription: 'No additional details provided.',
      reportedAt: 'Reported on',
      noFlaggedPassages: 'No flagged passages.',
      reportLockedByOther: 'This report is being reviewed by {name}.',
      reportLockedByOtherFallback: 'another reviewer',
      moderationConflictError: 'Another reviewer submitted a decision while you were reviewing. Please reload.',
      moderationActionError: 'Could not complete moderation action.',
      moderationReaderReportHint: 'Reader reports do not unpublish the biography. It stays visible until you freeze it or remove it.',
      dismissReportKeepPublished: 'Dismiss report (keep published)',
      confirmDismissReport: 'Dismiss this report?',
      confirmDismissReportDetail: 'The biography stays published. The author will not be notified.',
      notifyReportDismissed: 'A reader report on your biography was reviewed and dismissed.',
      freezeAndNotifyAuthor: 'Freeze and notify author',
      confirmFreezeAndNotify: 'Freeze and notify the author?',
      confirmFreezeAndNotifyDetail: 'The biography stays published but becomes read-only for the author. Your message will be sent.',
      notifyFrozenFromReport: 'Your biography was frozen following a reader report. Please check your notifications.',
      moderationFreezeWhileReviewingDetail: 'The biography becomes read-only for the author and the report is closed.',
      takeOwnership: 'Take ownership',
      takingOwnership: 'Taking ownership…',
      approveAndPublish: 'Approve & publish',
      publishWithWarning: 'Publish with warning',
      returnToAuthor: 'Return to author',
      removeBiography: 'Remove biography',
      messageToAuthor: 'Message to author',
      messageToAuthorPlaceholder: 'Explain what needs to be corrected…',
      confirmApprove: 'Approve and publish?',
      confirmApproveDetail: 'The biography will be published and the author notified.',
      confirmPublishWarning: 'Publish with warning?',
      confirmPublishWarningDetail: 'The biography will be published but the author will receive a content guidelines reminder.',
      confirmReturn: 'Return to author?',
      confirmReturnDetail: 'The biography will be returned to draft and the author will receive your message.',
      confirmRemove: 'Remove biography?',
      confirmRemoveDetail: 'This will permanently remove the biography. The author will be notified. This action cannot be undone.',
      confirmAction: 'Confirm',
      cancelAction: 'Cancel',
      internalNotesPlaceholder: 'Add internal notes (not visible to users)…',
      saveNotes: 'Save notes',
      savingNotes: 'Saving…',
      notesSaved: 'Notes saved',
      notifyPublished: 'Your biography has been reviewed and published.',
      notifyPublishedWarning: 'Your biography has been published. Please review our content guidelines for future reference.',
      notifyReturned: 'Your biography has been returned for revision.',
      notifyRemoved: 'Your biography has been removed for violating our content guidelines.',
      assignedToYou: 'Assigned to you',
      assignedToOther: 'Assigned to another reviewer',
      usersTitle: 'User Management',
      usersSubtitle: 'Manage user roles and accounts',
      usersNavLink: 'Users',
      usersSearchPlaceholder: 'Search by name or email…',
      usersColAvatar: 'Avatar',
      usersColName: 'Name',
      usersColEmail: 'Email',
      usersColRole: 'Role',
      usersColJoined: 'Joined',
      usersColBiographies: 'Biographies',
      usersColActions: 'Actions',
      usersSaveRole: 'Save role',
      usersRoleUser: 'User',
      usersRoleReviewer: 'Reviewer',
      usersRoleAdmin: 'Admin',
      usersRoleSuperAdmin: 'Super Admin',
      usersChangeRoleTitle: 'Change role',
      usersChangeRoleMessage: "Change {name}'s role from {old} to {new}?",
      usersChangeRoleFrom: 'from',
      usersChangeRoleTo: 'to',
      usersRoleUpdated: 'Role updated successfully',
      usersCannotChangeSelf: 'You cannot change your own role.',
      usersCannotChangeSelfTooltip: 'You cannot change your own role',
      usersPrev: 'Previous',
      usersNext: 'Next',
      usersPageOf: 'of',
      usersAccessDenied: 'Access Denied',
      usersAccessDeniedMessage: 'This page is restricted to super administrators.',
      usersPageRestrictedToAdmins: 'This page is restricted to administrators.',
      usersRedirectingIn: 'Redirecting in',
      usersLoadError: 'Failed to load users.',
      usersColStatus: 'Account',
      usersStatusActive: 'Active',
      usersStatusSuspended: 'Suspended',
      usersSuspend: 'Suspend',
      usersReinstate: 'Reinstate',
      usersDeleteUser: 'Delete user',
      usersConfirmSuspendTitle: 'Suspend this account?',
      usersConfirmSuspendDetail:
        'The user will be signed out, unable to log in, and their public biography will be hidden. An email will be sent to the user.',
      usersConfirmReinstateTitle: 'Reinstate this account?',
      usersConfirmReinstateDetail: 'The user will be able to log in again. An email will be sent to the user.',
      usersConfirmDeleteTitle: 'Delete this user permanently?',
      usersConfirmDeleteDetail:
        'This removes the account and associated data. This cannot be undone. An email will be sent to the user.',
      usersToastSuspended: 'Account suspended.',
      usersToastReinstated: 'Account reinstated.',
      usersToastDeleted: 'User deleted.',
      usersActionFailed: 'Action failed. Try again.',
      usersReviewerLanguages: 'Review languages',
      usersReviewerLanguagesSaved: 'Reviewer languages updated.',
      usersReviewerLanguagesError: 'Could not update reviewer languages.',
      overviewTitle: 'Admin Overview',
      overviewSubtitle: 'Platform health and key statistics at a glance',
      navOverview: 'Overview',
      navModeration: 'Moderation',
      navBiographies: 'Biographies',
      navPublicCatalog: 'Public catalogue',
      navReview: 'Review Queue',
      navUsers: 'Users',
      navAiStats: 'AI Stats',
      reviewPageTitle: 'Biography Review Queue',
      reviewPageSubtitle:
        'Author revision queue after AI screening — does not include reader reports (see Moderation).',
      reviewColSubject: 'Subject',
      reviewColTitle: 'Title',
      reviewColAuthor: 'Author',
      reviewColLanguage: 'Language',
      reviewColType: 'Type',
      reviewColSubmitted: 'Submitted',
      reviewColRead: 'Read',
      reviewColActions: 'Actions',
      reviewApprove: 'Approve',
      reviewReject: 'Reject',
      reviewConfirmReject: 'Confirm Reject',
      reviewCancelReject: 'Cancel',
      reviewReasonLabel: 'Rejection reason',
      reviewReasonPlaceholder: 'Explain why the biography is being returned for revision…',
      reviewReasonRequired: 'Please provide a reason (at least 10 characters).',
      reviewEmpty: 'No biographies awaiting review',
      reviewEmptySubtitle: 'All caught up! There are no biographies in the review queue right now.',
      reviewLoadError: 'Failed to load the review queue.',
      reviewApproveError: 'Failed to approve biography.',
      reviewRejectError: 'Failed to reject biography.',
      reviewFlaggedPassages: 'flagged passages',
      reviewApprovePassage: 'Approve passage',
      reviewRejectPassage: 'Reject passage',
      reviewAllPassagesReviewed: 'All passages reviewed — ready to decide',
      reviewAiReason: 'AI reason',
      aiStatsPageTitle: 'AI Usage Statistics',
      aiStatsPageSubtitle: 'Monitor AI feature usage across all users',
      aiStatsDataNote: 'Note: usage data is retained for 30 days.',
      aiStatsFilterToday: 'Today',
      aiStatsFilterLast7: 'Last 7 days',
      aiStatsFilterLast30: 'Last 30 days',
      aiStatsFilterAllTime: 'All time',
      aiStatsTotalRequests: 'Total AI requests',
      aiStatsUniqueUsers: 'Unique users',
      aiStatsMostUsedAction: 'Most used action',
      aiStatsAvgPerUser: 'Avg requests / user',
      aiStatsSection1: 'Summary',
      aiStatsSection2: 'Usage by action type',
      aiStatsSection3: 'Top users by AI usage',
      aiStatsSection4: 'Daily usage (last 14 days)',
      aiStatsColAction: 'Action',
      aiStatsColCount: 'Requests',
      aiStatsColName: 'Name',
      aiStatsColEmail: 'Email',
      aiStatsColTotalRequests: 'Total requests',
      aiStatsColLastUsed: 'Last used',
      aiStatsColDate: 'Date',
      aiStatsColUniqueUsers: 'Unique users',
      aiStatsNoData: 'No data for this period.',
      aiStatsLoadError: 'Failed to load AI statistics.',
      aiStatsNever: 'Never',
      statTotalUsers: 'Total Users',
      statNewThisWeek: 'New this week',
      statActiveThisMonth: 'Active this month',
      statTotalBiographies: 'Total Biographies',
      statPublished: 'Published',
      statUnderReview: 'Under Review',
      statRemoved: 'Removed',
      statOpenReports: 'Open Reports',
      statInReview: 'In Review',
      statResolvedThisWeek: 'Resolved this week',
      sectionUsers: 'Users',
      sectionBiographies: 'Biographies',
      sectionModeration: 'Moderation',
      sectionQuickActions: 'Quick Actions',
      quickActionModeration: 'Go to Moderation',
      quickActionUsers: 'Manage Users',
      quickActionBiographies: 'View Biographies',
      quickActionPublicCatalog: 'Open public catalogue',
      quickActionReview: 'Review Queue',
      guardAccessDenied: 'Access Denied',
      guardAccessDeniedMessage: 'You do not have permission to access this area.',
      guardRedirectingIn: 'Redirecting in {seconds}s…',
      overviewPeriodLast7Days: 'Last 7 days',
      overviewPeriodLast30Days: 'Last 30 days',
      overviewParseErrorBanner: '{count} {count, plural, one {biography} other {biographies}} published in the last 7 days bypassed AI screening due to a parse error. These may require manual review.',
      overviewViewAffected: 'View affected biographies',
      reviewNoLanguages: 'No languages assigned — contact an administrator to receive review assignments.',
      reviewConflictTitle: 'Another reviewer is working on this',
      reviewConflictDescription: 'Another reviewer has this biography open. Proceeding will override their lock and submit your decision.',
      reviewConflictCancel: 'Cancel',
      reviewConflictProceed: 'Proceed anyway',
      reviewInReviewLabel: 'In review',
      reviewUndo: 'Undo',
      reviewPassagesRemaining: '{count} remaining',
      reportLockWarning: 'This report is assigned to another moderator.',
      usersNoUsersFound: 'No users found',
      bioPageTitle: 'All Biographies',
      bioPageSubtitle: 'Browse, search, and manage all biographies in the system',
      bioSearchPlaceholder: 'Search by title or author…',
      bioFilterStatus: 'Status',
      bioFilterType: 'Type',
      bioFilterSort: 'Sort',
      bioFilterAll: 'All',
      bioStatusDraft: 'Draft',
      bioStatusPublished: 'Published',
      bioStatusUnderReview: 'Under Review',
      bioStatusPdfDraft: 'PDF draft',
      bioStatusLockedPendingScreening: 'Pending screening',
      bioStatusRemoved: 'Removed',
      bioTypeAll: 'All types',
      bioTypeAutobiography: 'Autobiography',
      bioTypeDeceased: 'Deceased',
      bioSortNewest: 'Newest first',
      bioSortOldest: 'Oldest first',
      bioSortRecentlyPublished: 'Recently published',
      bioSortMostViews: 'Most views',
      bioColTitle: 'Title',
      bioColAuthor: 'Author',
      bioColType: 'Type',
      bioColStatus: 'Status',
      bioColViews: 'Views',
      bioColCreated: 'Created',
      bioColPublished: 'Published',
      bioColActions: 'Actions',
      bioActionView: 'View',
      bioNoResults: 'No biographies found.',
      bioLoadError: 'Failed to load biographies.',
      bioPrev: 'Previous',
      bioNext: 'Next',
      bioPageOf: 'of',
      bioPanelTitle: 'Biography Details',
      bioPanelSection1: 'Biography Info',
      bioPanelSection2: 'Content Preview',
      bioPanelSection3: 'Admin Actions',
      bioPanelAuthor: 'Author',
      bioPanelEmail: 'Email',
      bioPanelType: 'Type',
      bioPanelStatus: 'Status',
      bioPanelPrivacy: 'Privacy',
      bioPanelCreated: 'Created',
      bioPanelUpdated: 'Updated',
      bioPanelShareToken: 'Share token',
      bioPanelNoContent: 'No content sections found.',
      bioPanelOpenFull: 'Open full biography',
      bioPrivatePrivacy: 'Private',
      bioFamilyPrivacy: 'Family',
      bioPublicPrivacy: 'Public',
      bioActionForcePublish: 'Force publish',
      bioActionSetDraft: 'Set to draft',
      bioActionRemove: 'Remove biography',
      bioActionRestore: 'Restore biography',
      bioActionForcePublishConfirm: 'Force publish this biography?',
      bioActionForcePublishDetail: 'The biography will be published immediately and the author will be notified.',
      bioActionSetDraftConfirm: 'Return to draft?',
      bioActionSetDraftDetail: 'The biography will be returned to draft and the author will be notified.',
      bioActionRemoveConfirm: 'Remove this biography?',
      bioActionRemoveDetail: 'The biography will be hidden from all non-staff users. The author will be notified. This action can be reversed.',
      bioActionRestoreConfirm: 'Restore this biography?',
      bioActionRestoreDetail: 'The biography will be restored to draft and the author can review and republish it.',
      bioActionConfirm: 'Confirm',
      bioActionCancel: 'Cancel',
      bioNotifyForcePublished: 'Your biography has been published by an administrator.',
      bioNotifySetDraft: 'Your biography has been returned to draft by an administrator.',
      bioNotifyRemoved: 'Your biography has been removed by an administrator.',
      bioNotifyRestored: 'Your biography has been restored. You can review and republish it.',
      bioActionSuccess: 'Action completed successfully.',
      bioActionError: 'Failed to complete action.',
      bioActionChapterCooldownError: 'Cannot publish yet: the yearly chapter cooldown between publications is still active.',
      bioActionFreeze: 'Freeze biography',
      bioActionUnfreeze: 'Unfreeze biography',
      bioActionFreezeConfirm: 'Freeze this biography?',
      bioActionFreezeDetail: 'The biography will become read-only for the author. The author will be notified. This action can be reversed.',
      bioActionUnfreezeConfirm: 'Unfreeze this biography?',
      bioActionUnfreezeDetail: 'The author will regain full editing access. The author will be notified.',
      bioNotifyFrozen: 'Your biography has been frozen by an administrator and is now read-only.',
      bioNotifyUnfrozen: 'Your biography has been unfrozen by an administrator. You can now edit it again.',
      bioStatusFrozen: 'Frozen',
    },
    publicBiographies: {
      pageTitle: 'Published Biographies',
      pageSubtitle: 'Discover life stories shared with the world.',
      searchPlaceholder: 'Search by title or author…',
      filterLanguage: 'Language',
      filterType: 'Type',
      filterAll: 'All',
      typeAutobiography: 'Autobiography',
      typeMemorial: 'Memorial',
      langAll: 'All languages',
      chaptersCount: 'Chapters',
      publishedOn: 'Published',
      readBiography: 'Read biography',
      noResults: 'No biographies found',
      noResultsSubtitle: 'Try adjusting your search or filters.',
      loading: 'Loading biographies…',
      errorLoading: 'Failed to load biographies.',
      untitled: 'Untitled Biography',
      unknownAuthor: 'Unknown Author',
      featuredTitle: 'Featured Stories',
      mostReadTitle: 'Most Read',
      discoverTitle: 'Discover',
      signIn: 'Sign in',
      startBiography: 'Start your biography',
      viewsCount: 'views',
      langOriginal: 'Original language',
      langTranslation: 'Available translation',
    },
    pwa: {
      installBannerText: 'Add Biography Library to your home screen',
      installButton: 'Install',
      dismissButton: 'Dismiss',
      iosInstallText: "To install: tap the Share button (\u{1F4E4}) then 'Add to Home Screen'",
    },
    meta: {
      tagline: 'Because every life deserves to be remembered',
    },
    notifications: {
      title: 'Notifications',
      empty: 'You have no notifications right now. Check back later.',
      markAllRead: 'Mark all as read',
      markAsRead: 'Mark as read',
      justNow: 'Just now',
      biographyApproved: 'Your biography has been approved and published.',
      biographyRejected: 'Your biography was returned for revision: ',
      biographyRejectedWithPassages: 'Your biography needs revision. Passages flagged:\n{passages}\nReviewer note: {note}',
      biographyAutoPublished: 'Your biography has been reviewed and published automatically.',
      reviewAssigned: 'A biography has been assigned to you for review.',
    },
    errors: {
      title: 'Something went wrong',
      description: 'An unexpected error occurred. Your work has been saved automatically.',
      tryAgain: 'Try again',
      goToDashboard: 'Go to Dashboard',
    },
    settings: {
      biographyType: {
        label: 'Biography type',
        autobiography: 'Autobiography',
        memorial: 'Memorial',
      },
      coverMode: {
        label: 'Cover style',
        graphic: 'Graphic (brand color)',
        photo: 'Photo (from gallery)',
        noPhotoWarning: 'No cover photo selected. Go to the photo gallery and set a photo layout to "Cover".',
      },
      slug: {
        label: 'URL slug',
        helper: 'Used in the public URL. Only lowercase letters, numbers and hyphens.',
        duplicateError: 'This slug is already in use. Please choose another.',
      },
      coverPreview: 'Cover preview',
      noCoverPhoto: 'No cover photo',
      goToPhotos: 'Add in Photos',
    },
    helpChatbot: {
      title: 'Help',
      placeholder: 'Ask a question…',
      send: 'Send',
      loading: 'Thinking…',
      lowConfidence: "I'm not 100% sure — try the full guide for more details.",
      clearChat: 'Clear chat',
      openHelp: 'Open help',
      closeHelp: 'Close help',
      sessionExpired: 'Your session has expired. Please sign in again.',
      rateLimitError: 'Too many requests. Please wait a moment.',
      genericError: 'Something went wrong. Please try again.',
      signInRequired: 'Sign in to use the help assistant.',
    },
    onboardingWizard: {
      stepProgress: 'Step {current} of {total}',
      typeSubtitle: 'Tell us who this biography is for. You will confirm your legal rights on the next step.',
      accountModelInfo:
        'Each account manages one biography only (autobiography or memorial — choose carefully). To write another biography later (e.g. your own story and a family memorial), create a separate account with a different email. Other relatives can write their own perspective on the same person with their own accounts.',
      legalSubtitle: 'Please read and confirm each statement to continue.',
      pathTitle: 'How would you like to work?',
      pathSubtitle: 'Choose your starting path. You can change approach later.',
      pathHint: 'After this step you will get a short guided tour of the editor in your chosen language.',
      publishReadyDescription: 'Import finished text and move quickly toward publication and PDF export.',
      skipForNow: 'Skip for now',
      startTour: 'Create and start tour',
      resumeIntro: 'Resume introduction',
      resumeIntroDescription: 'Pick up the guided setup where you left off.',
      reviewIntro: 'Review introduction',
      tourCompleted: 'Tour completed — happy writing!',
      tourSkip: 'Skip tour',
      tourNext: 'Next',
      tourBack: 'Back',
      tourFinish: 'Finish',
      tourStepOptional: 'You can try the highlighted action now, or press Next to continue without it.',
      tourTryStep: 'Try it',
      tryActionHint: 'Try the highlighted action to continue.',
    },
    onboardingTour: {
      sectionsOverviewTitle: 'Chapters',
      sectionsOverviewDesc:
        'Your biography is organised into chapters. Select one from the list to work on it with Echo.',
      bookTitleTitle: 'Book title',
      bookTitleDesc: 'Click the title at the top to rename your biography at any time.',
      privacyTitle: 'Visibility',
      privacyDesc:
        'This button shows who can see your biography. Tap it to cycle between Private, Family link, and Public.',
      echoPanelTitle: 'Write with Echo',
      echoPanelDesc:
        'Chat with Echo here to draft your chapter by text or voice. Ask questions, get suggestions, or request a draft.',
      editSectionTitle: 'Edit',
      editSectionDesc:
        'Use Edit to open the text editor for this chapter. Refine Echo’s draft, paste your own text, or write directly — Echo stays available as your assistant.',
      aiCreditsTitle: 'AI credits',
      aiCreditsDesc:
        'This counter shows how many AI-assisted actions you have left today and this week. Standard accounts have daily and weekly limits.',
      echoVoiceTitle: 'Echo voice replies',
      echoVoiceDesc:
        'Use the speaker icon to turn Echo’s spoken replies on or off. When muted, Echo answers in text only.',
      echoVoiceFreeflowTitle: 'Echo voice replies',
      echoVoiceFreeflowDesc:
        'Open Echo from the floating button, then use the speaker icon inside the chat to mute or unmute spoken replies.',
      notesTitle: 'Notes & reminders',
      notesDesc: 'Keep research notes and to-do reminders here — separate from the published text.',
      photosTitle: 'Photos',
      photosDesc: 'Add images to your biography gallery and attach them to chapters where needed.',
      importTextTitle: 'Import text',
      importTextDesc: 'Paste or upload existing text from Word, PDF, or plain files.',
      exportTextTitle: 'Export text',
      exportTextDesc: 'Download your biography as TXT or DOCX, or start a PDF draft for review.',
      bookStructureTitle: 'Book structure',
      bookStructureDesc: 'Set the cover, credits page, and layout options before exporting your book.',
      reviewPublicationTitle: 'Review & publication',
      reviewPublicationDesc:
        'Submit your biography for review, check PDF drafts, and publish when ready.',
      freeflowEditorTitle: 'Writing area',
      freeflowEditorDesc:
        'This is your main writing space. Type freely or paste imported text, then use the tools in the side panel.',
      echoBubbleTitle: 'Echo assistant',
      echoBubbleDesc:
        'Tap the Echo button at the bottom right to open the AI assistant while you write.',
      publishImportTitle: 'Import your text',
      publishImportDesc: 'Bring your finished biography onto the platform using Import.',
      publishFinalTitle: 'Final version',
      publishFinalDesc: 'Polish your text here before moving to PDF drafts and publication.',
      publishExportTitle: 'Export',
      publishExportDesc: 'Export a draft PDF or text copy to check how your book will look.',
      mobileMenuTitle: 'Chapter & tools menu',
      mobileMenuDesc:
        'On phones and tablets, tap the menu icon at the top right of the editor bar to open chapters and tools. The tour opens this panel automatically in the next steps.',
      mobileSidebarOverviewHint:
        'The chapter list and tools live in this panel. On phones and tablets, open it with the menu button at the top right of the editor bar.',
    },
    echo: {
      hubEmpty: 'Hello! I\'m Echo. I\'ll guide you through writing your biography — by voice or text.',
      resumeBiography: 'Continue: {title}',
      resumeButton: 'Resume biography',
      newGuided: 'Tell your story with Echo, your personal AI guide, step by step.',
      newImport: 'I already have text to import',
      newPublishOnly: 'Prepare an existing text for publication',
      myBiographies: 'My biographies',
      pickBiography: 'Select biography',
      untitledBiography: 'Untitled',
      inputPlaceholder: 'Type or use the microphone…',
      statusListening: 'Listening…',
      statusSpeaking: 'Speaking…',
      statusThinking: 'Thinking…',
      statusFormulatingReply: 'Working on your reply…',
      statusWelcome: 'Write or use the mic — I\'m here to guide you',
      statusReady: 'Ready for your next question',
      statusVoiceMuted: 'Text only — voice off',
      statusPreparingReply: 'Preparing a reply…',
      statusReadingMessage: 'Reading your message…',
      statusWriting: 'Writing…',
      statusStillWorking: 'This is taking a little longer than usual…',
      statusSlowApology: 'Sorry for the wait — almost there…',
      statusLoadingHistory: 'Loading our conversation…',
      statusLoadingOlder: 'Loading earlier messages…',
      errorGeneric: 'Something went wrong. Please try again.',
      openEcho: 'Ask Echo',
      closeEcho: 'Close',
      aiToolsMenu: 'AI tools',
      changePath: 'Change writing path',
      changePathTitle: 'Change writing path',
      changePathDescription: 'Your content will be preserved. You can export first if you prefer.',
      exportBeforeChange: 'Export copy first',
      confirmPathChange: 'Convert and continue',
      onboardingWelcome: 'Welcome to Biography Library. I\'m Echo — let\'s get started.',
      pathChanged: 'Writing path updated.',
      concentrationMode: 'Concentration mode',
      exitConcentration: 'Exit concentration mode',
      consultEcho: 'Echo',
      stopSpeaking: 'Stop',
      muteVoice: 'Mute Echo voice',
      unmuteVoice: 'Unmute Echo voice',
      speakingBanner: 'Echo is reading aloud…',
      activeSectionContext: 'Now working on: {section}',
      sectionSwitchPrefix: '[Now on section «{section}»]',
      icebreakerHint: 'You could ask, for example:',
      icebreakerDefaultSection: 'this chapter',
      insertDraftPrompt: 'Insert this text into the editor?',
      insertDraftConfirm: 'Insert in editor',
      insertDraftDismiss: 'Later',
      insertDraftDone: 'Text inserted in the editor.',
      insertDraftCardTitle: 'Draft for {section}',
      insertDraftCardSubtitle: 'Review the text below, then insert it into your biography.',
      insertDraftLater: 'Later',
      insertDraftShowPreview: 'Show full preview',
      insertDraftHidePreview: 'Collapse preview',
      insertDraftReady: 'Draft ready',
      insertDraftSectionMismatch: 'Will be inserted in: {section} (not the chapter you are viewing now).',
      insertDraftSuccessTitle: 'Text inserted',
      insertDraftSuccessBody: 'The draft was added to your editor. You can review and edit it anytime.',
      insertDraftOpenEditor: 'Open editor',
      insertDraftDialogTitle: 'Draft inserted',
      insertDraftDialogDescription: 'Your text was added to {section}. Open the editor to review it now.',
      insertDraftContinueChat: 'Continue in chat',
      insertDraftPendingBadge: '{count} draft to insert',
      loadOlderMessages: 'Load older messages',
      loadingOlderMessages: 'Loading…',
      ...getEchoGuideCopy('en'),
      icebreakerPools: getEchoIcebreakerPools('en'),
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
      demoBiographies: 'Biografie demo',
      workspace: 'Workspace',
      dashboard: 'Dashboard',
      biography: 'Biografia',
      settings: 'Impostazioni',
      logout: 'Esci',
      admin: 'Admin',
      reviewer: 'Revisore',
      notifications: 'Notifiche',
      darkMode: 'Modalità scura',
      decreaseFontSize: 'Riduci dimensione testo',
      increaseFontSize: 'Aumenta dimensione testo',
      signOut: 'Esci',
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
      createYourAccount: 'Crea il tuo account',
      registerSubtitle: 'Inizia a preservare e condividere storie di vita oggi',
      fullName: 'Nome completo',
      yourName: 'Il tuo nome',
      emailPlaceholder: 'tu@esempio.com',
      enterPassword: 'Inserisci la tua password',
      atLeastSixChars: 'Almeno 6 caratteri',
      repeatPassword: 'Ripeti la tua password',
      passwordsDoNotMatch: 'Le password non corrispondono',
      passwordMinLength: 'La password deve essere di almeno 8 caratteri',
      createOne: 'Creane uno',
      createAccount: 'Crea account',
      forgotPassword: 'Password dimenticata?',
      forgotPasswordTitle: 'Reimposta la tua password',
      forgotPasswordSubtitle: 'Inserisci il tuo indirizzo email e ti invieremo un link per reimpostare la password',
      forgotPasswordButton: 'Invia link di reimpostazione',
      forgotPasswordSending: 'Invio in corso...',
      forgotPasswordSuccess: 'Controlla la tua email',
      forgotPasswordSuccessDetail: 'Abbiamo inviato un link per reimpostare la password al tuo indirizzo email. Controlla la tua casella di posta.',
      backToLogin: 'Torna al login',
      resetPassword: 'Reimposta password',
      resetPasswordTitle: 'Imposta una nuova password',
      resetPasswordSubtitle: 'Inserisci la tua nuova password qui sotto',
      newPassword: 'Nuova password',
      confirmNewPassword: 'Conferma nuova password',
      resetPasswordButton: 'Aggiorna password',
      resetPasswordUpdating: 'Aggiornamento...',
      resetPasswordSuccess: 'Password aggiornata',
      resetPasswordSuccessDetail: 'La tua password è stata aggiornata con successo. Ora puoi accedere con la tua nuova password.',
      resetPasswordInvalidLink: 'Link non valido o scaduto',
      resetPasswordInvalidLinkDetail: 'Questo link per reimpostare la password è scaduto o è già stato utilizzato. Richiedine uno nuovo.',
      resetPasswordRequestNew: 'Richiedi un nuovo link di reimpostazione',
      resetPasswordVerifying: 'Verifica del link in corso...',
      atLeastEightChars: 'Almeno 8 caratteri',
      verifyEmailTitle: 'Verifica la tua email',
      verifyEmailSubtitle: 'Abbiamo inviato un\'email di verifica al tuo indirizzo. Controlla la tua casella di posta e clicca sul link per attivare il tuo account.',
      verifySentTo: 'Abbiamo inviato un link di conferma a',
      verifyEmailDetail: 'Non hai ricevuto l\'email? Controlla la cartella spam o reinviala qui sotto.',
      verifyEmailLinkSent: 'Ti abbiamo inviato un link di conferma. Clicca sul link nell\'email per attivare il tuo account.',
      verifyEmailAutoUpdate: 'Questa pagina si aggiornerà automaticamente dopo la conferma.',
      verifyEmailChecking: 'Verifica in corso...',
      verifyEmailAlreadyConfirmed: 'Ho già confermato, accedi',
      verifyEmailConfirmedTitle: 'Email confermata!',
      verifyEmailConfirmedDetail: 'Il tuo account è stato verificato. Reindirizzamento alla dashboard...',
      verifyEmailFailedTitle: 'Verifica non riuscita',
      verifyEmailFailedDetail: 'Il link di conferma è scaduto o è già stato utilizzato. Richiedine uno nuovo.',
      verifyEmailResendSuccessInline: 'Email inviata! Controlla la casella di posta.',
      verifyEmailDidntReceive: 'Non hai ricevuto l\'email? Inviala di nuovo',
      resendVerification: 'Reinvia email di verifica',
      resendVerificationSending: 'Invio in corso...',
      resendVerificationSuccess: 'Email di verifica inviata',
      useAnotherEmail: 'Usa un altro indirizzo email',
      resendCooldown: 'Reinvia tra {seconds}s',
      resendNewConfirmEmail: 'Invia nuova email di conferma',
      emailNotVerified: 'Email non verificata',
      emailNotVerifiedDetail: 'Per favore verifica il tuo indirizzo email per accedere alla dashboard.',
      mustAcceptTerms: 'Obbligatorio — devi accettare i termini per continuare',
      accountSuspended:
        'Il tuo account è stato sospeso. Se pensi sia un errore, rispondi all’email che hai ricevuto.',
      registrationLanguage: 'La tua lingua',
      registrationLanguageHint:
        'Email, onboarding e interfaccia useranno questa lingua. La scelta non potrà essere modificata.',
      registrationLanguageAlertTitle: 'La lingua non potrà essere modificata',
      registrationLanguageAlertMessage:
        'La lingua selezionata verrà usata per email, onboarding e tutta l\'app. Dopo la registrazione non potrai più cambiarla.',
    },
    accountSettings: {
      language: 'Lingua',
      languageLockedHint: 'Scelta in registrazione e non modificabile.',
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
      sectionsComplete: 'Sezioni Complete',
      finalVersion: 'Versione Finale',
      statusRemoved: 'Rimossa',
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
      statusPublished: 'Pubblicata',
      statusUnderReview: 'In revisione',
      statusPdfDraft: 'Bozza PDF',
      statusLockedPendingScreening: 'In attesa di screening',
      underReviewMessage: 'Il nostro team sta esaminando la tua biografia. Sarai informato dell\'esito.',
      untitledBiography: 'Biografia senza titolo',
      goToWorkspace: 'Vai al Workspace',
      continueLastSection: 'Continua Ultima Sezione',
      updateAvailabilityMessage: 'Puoi aggiungere un nuovo capitolo alla tua biografia una volta all\'anno, per raccontare ciò che è cambiato nella tua vita.',
      oneBiographyLimit: 'Hai già una biografia. Ogni account può averne una sola, per mantenere focus e qualità.',
      nextChapterAvailableNow: 'Puoi aggiungere un nuovo capitolo alla tua biografia.',
      nextChapterAvailableOn: 'Prossimo capitolo disponibile il {date}.',
      nextChapterCooldownDays: 'Mancano {days} giorni al prossimo capitolo.',
      chapterCooldownBlocked: 'Puoi pubblicare un nuovo capitolo un anno dopo l\'ultima pubblicazione.',
    },
    biography: {
      newBiography: 'Nuova Biografia',
      biographyTitle: 'Titolo della Biografia',
      titlePlaceholder: 'Es. La mia storia - puoi cambiare il titolo successivamente',
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
      aiTimeout: "L'AI impiega troppo tempo. Riprova.",
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
      subjectNameLabel: 'Nome protagonista',
      subjectNamePlaceholder: 'es., Francesco Brignole',
      writerNameLabel: 'Nome autore',
      writerNamePlaceholder: 'Il tuo nome come autore',
      writtenBy: 'Scritto da',
      memorialDetailsSubtitle: 'Di chi parla questa biografia e chi la sta scrivendo?',
      addAuthorName: 'Aggiungi nome autore…',
    },
    writingModeOnboarding: {
      stepTitle: 'Come vuoi scrivere?',
      stepSubtitle: 'Scegli come iniziare la tua biografia. Potrai sempre esportare e reimportare i tuoi contenuti in seguito.',
      writeHereTitle: 'Scrivi su Biography Library',
      writeHereDescription: 'Componi la tua biografia direttamente qui. Ti guideremo attraverso i capitoli, oppure puoi scrivere liberamente.',
      guidedChaptersLabel: 'Guidami attraverso i capitoli',
      guidedChaptersDescription: 'Approccio strutturato: infanzia, famiglia, istruzione, carriera e altro — un capitolo alla volta.',
      freewritingLabel: 'Scrivo liberamente',
      freewritingDescription: 'Scrittura libera. Nessuna struttura fissa. Scrivi o ditta nel tuo stile.',
      importTitle: 'Importa un testo esistente',
      importDescription: 'Hai già una biografia scritta o un documento. Importalo e usa Biography Library come archivio.',
      continueButton: 'Inizia a scrivere',
      backButton: 'Indietro',
    },
    modeSwitchWarning: {
      step1Title: 'Attenzione: cambiare modalità eliminerà i tuoi contenuti attuali',
      step1Message: 'Se passi da {from} a {to}, tutto il testo che hai scritto in {from} sarà eliminato definitivamente. Questa azione non può essere annullata.',
      step1Confirm: 'Ho capito, continua',
      step2Title: 'Esporta i tuoi contenuti prima di cambiare',
      step2Message: 'Prima di eliminare i tuoi contenuti in {from}, ti consigliamo vivamente di esportarli. Potrai reimportarli nella nuova modalità.',
      step2ExportButton: 'Esporta i miei contenuti ora (.txt e .docx)',
      step2SkipButton: 'Ho già una copia, salta l\'esportazione',
      step2Exporting: 'Esportazione in corso...',
      step3Title: 'Eliminare definitivamente i contenuti in {from}?',
      step3Message: 'Stai per eliminare definitivamente tutti i tuoi contenuti in {from}. Questa operazione non può essere recuperata.',
      step3Checkbox: 'Capisco che i miei contenuti saranno eliminati e questa operazione non può essere annullata.',
      step3Confirm: 'Elimina e cambia modalità',
      step3Cancel: 'Mantieni i miei contenuti, torna indietro',
      step3Deleting: 'Eliminazione in corso...',
      fromSections: 'sezioni',
      fromFreeflow: 'scrittura libera',
      toSections: 'sezioni',
      toFreeflow: 'scrittura libera',
      goBack: 'Torna indietro',
    },
    exportDialog: {
      title: 'Esporta Biografia',
      description: 'Scegli il formato e le sezioni da esportare',
      pdfNotice: 'L\'esportazione in PDF è disponibile solo una volta che la biografia è stata completata e approvata. Per ora puoi esportare nei formati TXT, RTF e DOCX.',
      formatLabel: 'Formato di esportazione',
      contentLabel: 'Selezione contenuto',
      allSections: 'Biografia completa (tutte le sezioni)',
      completedSections: 'Solo sezioni completate',
      customSections: 'Seleziona sezioni specifiche',
      additionalOptions: 'Opzioni aggiuntive',
      separateFiles: 'Dividi in file separati per sezione (archivio .zip)',
      includeMetadata: 'Includi metadati (data creazione, ultima modifica)',
      includeNotesTodos: 'Includi note e promemoria',
      cancel: 'Annulla',
      export: 'Esporta',
      exporting: 'Esportazione...',
      noSectionsError: 'Nessuna sezione da esportare.',
      exportError: 'Errore durante l\'esportazione. Riprova.',
      fontLoadError: 'Font non disponibile — esportazione annullata. Ricarica la pagina e riprova.',
      pdfFormat: 'PDF - Documento completo formattato',
      pdfB5Standard: 'PDF B5 (176×250mm)',
      txtFormat: 'TXT - Testo semplice senza formattazione',
      rtfFormat: 'RTF - Testo con formattazione base',
      docxFormat: 'DOCX - Documento Word',
      emptySection: '(vuota)',
      createdWith: 'Creato con Biography Library',
      allRightsReserved: '© {year} tutti i diritti riservati',
      preface: 'Prefazione',
      epilogue: 'Epilogo',
      acknowledgements: 'Ringraziamenti',
      specificCredits: 'Crediti',
      backCoverDescription:
        'Questa biografia è stata gestita con Biography Library, l’archivio digitale della memoria umana che offre liberamente gli strumenti per creare e preservare la propria storia o quella di una persona cara.',
      backCoverPropertyStatement:
        'Il testo di questa biografia è proprietà esclusiva dell’autore, che mantiene ogni diritto di agire contro qualsiasi uso non autorizzato, incluso l’uso per addestramento di sistemi di IA.',
      backCoverAiStatement:
        "Biography Library vieta l’uso dei contenuti ospitati sui propri server per text mining, addestramento IA o machine learning, ai sensi della Legge svizzera sul diritto d’autore (LDA) e del diritto esclusivo d’uso dell’autore previsto dal diritto svizzero.",
      backCoverFooter: 'Biography Library · biographylibrary.org',
      noCoverPhotoWarning: 'È necessaria una foto di copertina per generare il PDF. Carica una foto e contrassegnala come copertina nella sezione Foto.',
      pdfDraftNotice: 'Questo è un PDF di bozza. Riflette lo stato attuale della biografia e ti permette di verificare il layout e il contenuto prima di inviarlo alla revisione.',
      draftIterationNone: 'Nessun PDF di bozza generato ancora. Esportando creerai la prima bozza.',
      draftIterationCurrent: 'Bozza {n} già generata. Esportando si creerà la bozza {next}.',
      draftIterationWarning: 'Hai già generato {n} bozze PDF. Valuta di inviare presto per la revisione.',
      draftLimitReached: 'Hai raggiunto il numero massimo di bozze PDF per questa biografia. Invia per revisione prima di generarne altre.',
      draftPhaseRequiredBeforeDraft:
        'Avvia la fase di revisione PDF dall\'editor (Avvia revisione PDF) prima di scaricare bozze con filigrana.',
      finalDraftConfirmTitle: 'Genera la Terza e Ultima Bozza',
      finalDraftConfirmDescription: 'Questa è la tua terza e ultima bozza. Non sarà possibile generare ulteriori bozze dopo questa esportazione. Assicurati che la tua biografia sia pronta prima di procedere.',
      draftAiReviewTitle: 'Revisione AI della bozza',
      draftAiQuality: 'Qualità: {n}/5',
      draftAiUnavailable: 'Analisi AI non disponibile. Puoi comunque procedere alla pubblicazione.',
      draftAiSeverity3Block: 'Questa bozza contiene contenuti che potrebbero bloccare la pubblicazione. Rivedila prima di procedere.',
      draftAiStrengths: 'Punti di forza',
      draftAiSuggestions: 'Suggerimenti',
      draftAiSuggestionNarrative: 'Narrativa',
      draftAiSuggestionCompleteness: 'Completezza',
      draftAiSuggestionClarity: 'Chiarezza',
      draftAiSuggestionStyle: 'Stile',
      draftAiFeedbackUnavailable: 'Feedback AI della bozza non disponibile per questo export.',
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
      publishedChapterNotice: 'Questo capitolo è pubblicato e non può essere modificato.',
      freeFlowTab: 'Testo libero',
      sectionsTab: 'Sezioni',
      freeFlowReadOnly: 'Testo libero (sola lettura)',
      importFreeFlowHint: 'Stai importando una biografia scritta altrove? Scegli Testo libero. Potrai copiare le sezioni manualmente in seguito.\nStai importando una singola sezione da un export di Biography Library? Incolla solo il testo di quella sezione e scegli in quale sezione salvarlo.',
      importSaveTo: 'Salva in',
      importDestinationFreeFlow: 'Testo libero',
      importFieldNotEmpty: 'Questo campo contiene già del testo. Cosa vuoi fare?',
      importReplace: 'Sostituisci',
      importAddAtEnd: 'Aggiungi in fondo',
      exportModeFreeFlow: 'Export in modalità Testo libero — le sezioni non saranno incluse.',
      exportModeSections: 'Export in modalità Sezioni — il testo libero non sarà incluso.',
      bookStructureTitle: 'Struttura del libro',
      bookStructureAuthorCopyrightPage:
        'Includi una breve pagina crediti autore prima del frontespizio (PDF). Il testo legale completo resta sulla quarta copertina.',
      bookStructureFrontMatter: 'Pagine d\'apertura',
      bookStructureBackMatter: 'Pagine di chiusura',
      bookStructureDedication: 'Dedica',
      bookStructureEpigraph: 'Epigrafe',
      bookStructureEpigraphQuote: 'Citazione',
      bookStructureEpigraphSource: 'Attribuzione',
      bookStructurePreface: 'Prefazione / Incipit',
      bookStructureEpilogue: 'Epilogo',
      bookStructureAcknowledgements: 'Ringraziamenti',
      bookStructureCredits: 'Crediti specifici',
      bookStructureDedicationPlaceholder: 'Es. «A mia madre»',
      bookStructureEpigraphQuotePlaceholder: 'Testo della citazione…',
      bookStructureEpigraphSourcePlaceholder: 'Autore, fonte…',
      bookStructurePrefacePlaceholder: 'Scrivi la prefazione…',
      bookStructureEpiloguePlaceholder: 'Scrivi l\'epilogo…',
      bookStructureAcknowledgementsPlaceholder: 'Scrivi i ringraziamenti…',
      bookStructureCreditPlaceholder: 'Crediti specifici…',
      importNoticeSectionsMode: 'Sei in modalità Sezioni — il testo verrà importato nella sezione attualmente selezionata. Per importare in un altro capitolo, selezionalo prima dalla barra laterale. Se vuoi importare una biografia completa scritta altrove come blocco unico, passa alla modalità Testo libero prima di importare.',
      importNoticeFreeflowMode: 'Sei in modalità Testo libero — ideale per importare testo scritto fuori da Biography Library. Scegli se sostituire il contenuto attuale o aggiungere il testo importato in fondo. Se preferisci un approccio guidato capitolo per capitolo, passa alla modalità Sezioni prima di importare.',
      importFreeFlowReplace: 'Sostituisci tutto il contenuto esistente',
      importFreeFlowAppend: 'Aggiungi in fondo al contenuto esistente',
      bookStructureMainText: 'Testo principale',
      bookStructureImportText: 'Importa testo',
      bookStructureImportTitle: 'Importa testo principale',
      bookStructureImportDescription: 'Incolla il tuo testo o carica un file .txt. Questo sostituirà il contenuto principale attuale.',
      bookStructureImportPaste: 'Incolla testo',
      bookStructureImportPastePlaceholder: 'Incolla il tuo testo qui…',
      bookStructureImportOrFile: 'oppure carica un file',
      bookStructureImportSelectFile: 'Seleziona file .txt',
      bookStructureImportConfirm: 'Importa',
      bookStructureImportReplaceWarning: 'Il testo principale contiene già dei contenuti. L\'importazione li sostituirà. Sei sicuro?',
      bookStructureImportReplace: 'Sì, sostituisci',
      bookStructureImportCancel: 'Annulla',
      noChaptersWarning: 'Nessun capitolo definito. Il libro sarà un testo continuo senza interruzioni di capitolo. Per aggiungere capitoli, passa alla modalità Sezioni.',
      revisionRequired: 'Revisione richiesta. Il revisore ha segnalato quanto segue:',
      revisionRequiredAiScreening:
        'Lo screening automatico ha segnalato i passaggi seguenti. Modifica quelle parti (o l’intera versione finale in un unico testo), poi reinvia allo screening quando sei pronto.',
      aiScreeningFlaggedEditHint:
        'Puoi modificare solo le sezioni elencate o il testo finale completo; un revisore umano verificherà comunque la segnalazione.',
      resubmitAiScreening: 'Reinvia allo screening',
      resubmitAiScreeningPublishedToast: 'Screening superato — la biografia è online.',
      resubmitAiScreeningStillFlaggedToast: 'Restano passaggi da rivedere. L’elenco qui sotto è aggiornato.',
      resubmitAiScreeningErrorToast: 'Lo screening automatico non è terminato. Riprova tra qualche minuto o attendi un moderatore.',
      revisionFlaggedPassages: 'Passaggi segnalati',
      revisionReviewerNote: 'Nota del revisore',
      revisionDismiss: 'Chiudi',
      publicationStartPdfButton: 'Avvia revisione PDF',
      publicationPdfDraftHint:
        'Scarica fino a tre PDF con filigrana da Esporta, poi approva la versione finale per avviare lo screening automatico.',
      publicationApproveFinalButton: 'Approva PDF finale e avvia screening',
      publicationExportPdf: 'Esporta PDF',
      publicationLegacySubmitHint:
        'Per il percorso completo pronto per la stampa (bozze PDF → screening automatico), usa prima “Revisione Finale con IA”, poi Avvia revisione PDF. Puoi ancora inviare da qui per un controllo più rapido senza fase PDF.',
      reviewPublication: {
        menuItem: 'Revisione e Pubblicazione',
        title: 'Revisione e Pubblicazione',
        description:
          'Completa il percorso di revisione e pubblica la biografia con export PDF pronto per la stampa.',
        incompleteMessage:
          'Prima di avviare revisione e pubblicazione, completa ogni capitolo nella barra laterale. Ogni sezione deve contenere il testo e risultare completata.',
        freeflowEmptyHint:
          'Aggiungi il testo della biografia nell\'editor prima di avviare revisione e pubblicazione.',
        statusUnderReview: 'In revisione',
        statusLockedPendingScreening: 'Screening in corso',
        underReviewHint:
          'La biografia è in revisione. Torna qui al termine per continuare con l\'export PDF.',
        lockedPendingScreeningHint:
          'Il PDF finale è stato approvato e lo screening automatico è in corso. Riceverai una notifica al termine.',
        screeningPendingHint: 'Analisi automatica del testo in corso…',
        revisionFlaggedHint:
          'Alcuni passaggi sono stati segnalati. Modifica le sezioni evidenziate nell\'editor, poi reinvia per lo screening quando sei pronto.',
        stepAiReviewTitle: 'Facoltativo: revisione narrativa con IA',
        stepAiReviewDesc:
          'Esplora ordini alternativi dei capitoli e strutture narrative suggerite dall\'IA prima dell\'invio.',
        stepAiReviewButton: 'Apri revisione finale IA',
        stepFreeflowPrepareTitle: 'Prepara il testo finale per il PDF',
        stepFreeflowPrepareDesc:
          'Blocca il testo in modalità libera come versione finale per avviare le bozze PDF con filigrana.',
        stepFreeflowPrepareButton: 'Prepara testo finale',
        stepSubmitTitle: 'Invio rapido (legacy)',
        stepSubmitDesc:
          'Salta la fase bozza PDF e invia direttamente allo screening automatico. Per PDF pronti per la stampa, usa prima i passaggi sopra.',
        stepSubmitButton: 'Invia per la revisione',
        stepPdfDraftTitle: 'Avvia revisione PDF',
        stepPdfDraftDesc:
          'Genera bozze PDF con filigrana, verifica impaginazione e copertina, poi approva la versione finale.',
        stepPdfDraftButton: 'Avvia revisione PDF',
        stepExportTitle: 'Esporta bozza PDF',
        stepExportDesc: 'Scarica e anteprima la bozza PDF con filigrana prima dell\'approvazione finale.',
        stepExportButton: 'Apri export',
        stepApproveTitle: 'Approva PDF finale',
        stepApproveDesc: 'Conferma che il PDF è pronto ed esegui lo screening automatico dei contenuti.',
        stepApproveButton: 'Approva ed esegui screening',
        approveDisabledHint:
          'Esporta almeno una bozza PDF con filigrana prima di approvare. Apri Export per generare la prima bozza.',
        approveAiPendingHint:
          'Attendi il termine della revisione IA della bozza dopo l\'export, oppure esporta una nuova bozza se necessario.',
        approveAiSuggestionsHint:
          'L\'IA ha suggerito miglioramenti in Export. Puoi comunque approvare se sei soddisfatto di questa bozza.',
        severity3BlockHint:
          'Questa bozza contiene problemi critici segnalati dall\'IA. Rivedi il feedback ed esporta una nuova bozza prima di approvare.',
        publishedTitle: 'Pubblicata',
        publishedDesc: 'La biografia ha superato lo screening. Puoi esportare il PDF finale in qualsiasi momento.',
        draftProgress: 'Bozze generate: {count}',
      },
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
      markIncomplete: 'Riapri per modificare',
      sectionCompletedHint: 'Questa sezione è segnata come completa. Clicca «Riapri per modificare» per modificarla di nuovo.',
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
      microphoneDenied: 'Accesso al microfono negato.',
      noSpeechDetected: 'Nessun parlato rilevato. Riprova.',
      voiceNetworkError: 'Errore di rete. Controlla la connessione.',
      voiceServiceUnavailable: 'Servizio vocale non disponibile.',
      microphoneNotFound: 'Nessun microfono trovato.',
      voiceUnknownError: 'Errore di riconoscimento vocale. Riprova.',
      voiceNotSupported: 'L\'input vocale non è supportato in questo browser. Prova Chrome o Edge.',
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
      downloadRtf: 'Scarica RTF',
      downloadTxt: 'Scarica TXT',
      downloadDocx: 'Scarica DOCX',
      by: 'Di',
      writtenBy: 'Scritto da',
      preservingStories: 'Perché ogni vita merita di essere ricordata',
      tokenMissing: 'Token di accesso mancante',
      notFoundOrDenied: 'Biografia non trovata o accesso negato',
      biographyPrivate: 'Questa biografia \u00e8 privata',
      archivedBanner: 'Questa biografia \u00e8 stata archiviata.',
      publishedOn: 'Pubblicato',
      reportButton: 'Segnala',
      reportModalTitle: 'Segnala questa biografia',
      reportModalSubtitle: 'Aiutaci a mantenere la libreria sicura e accurata.',
      reportTypeLabel: 'Motivo della segnalazione',
      reportTypePlaceholder: 'Seleziona un motivo...',
      reportDescriptionLabel: 'Dettagli aggiuntivi (opzionale)',
      reportDescriptionPlaceholder: 'Fornisci ulteriori informazioni...',
      reportSubmit: 'Invia segnalazione',
      reportSubmitting: 'Invio in corso...',
      reportSuccess: 'Segnalazione ricevuta. Il nostro team la esaminer\u00e0.',
      reportError: 'Si \u00e8 verificato un errore. Riprova.',
      reportTypeLevel1: 'Contenuto dannoso o illegale',
      reportTypeLevel2: 'Incitamento all\u2019odio o molestie',
      reportTypeLivingPerson: 'Questa persona \u00e8 viva',
      reportTypeRightToOblivion: 'Rimuovi i miei dati personali',
      reportTypeImpersonation: 'Falsa identit\u00e0',
      reportTypeCopyright: 'Violazione del copyright',
      reportTypeOther: 'Altro',
      writtenIn: 'Scritta in {language}',
      contentRightsNoticeAriaLabel: 'Avviso copyright e uso IA',
      contentRightsNoticeParagraph1:
        'Il testo di questa biografia è proprietà esclusiva dell\'autore, che mantiene ogni diritto di agire contro qualsiasi uso non autorizzato, incluso l\'uso per addestramento di sistemi di IA.',
      contentRightsNoticeParagraph2:
        'Biography Library vieta l\'uso dei contenuti ospitati sui propri server per text mining, addestramento IA o machine learning, ai sensi della Legge svizzera sul diritto d\'autore (LDA) e del diritto esclusivo d\'uso dell\'autore previsto dal diritto svizzero.',
      pdfOriginalLanguage: 'PDF, TXT e DOCX disponibili solo nella lingua originale ({language})',
      downloadsUnavailable:
        'I download Word e testo semplice non sono disponibili per questa biografia. Puoi comunque usare il pulsante PDF sopra.',
      languageSwitcher: 'Lingua di lettura',
      showOriginal: 'Originale',
      readInLanguage: 'Leggi in {language}',
      translating: 'Traduzione in corso…',
      translationFailed: 'Traduzione non riuscita. Riprova.',
      languageNameEn: 'inglese',
      languageNameIt: 'italiano',
      languageNameFr: 'francese',
      languageNameDe: 'tedesco',
      galleryPhotos: 'Foto',
      galleryLightboxTitle: 'Galleria foto',
      galleryLightboxPrevious: 'Foto precedente',
      galleryLightboxNext: 'Foto successiva',
      galleryPhotoCounter: 'Foto {current} di {total}',
      galleryOpenPhoto: 'Apri foto: {caption}',
    },
    footer: {
      hostedInSwitzerland: 'Biography Library - Ospitato in Svizzera',
      termsOfService: 'T&C',
      privacyPolicy: 'Privacy',
      cookiePolicy: 'Cookie',
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
      checkingContent: 'Verifica delle linee guida sui contenuti...',
      publishBlocked: 'Pubblicazione bloccata. Questa biografia contiene contenuti che violano le nostre linee guida.',
      publishUnderReview: 'La tua biografia \u00e8 stata inviata per la revisione. Sarai informato dell\'esito.',
      tooManyRequests: 'Troppi tentativi. Attendi un minuto e riprova.',
      requestFailed: 'Qualcosa \u00e8 andato storto. Riprova.',
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
      conversationPending: 'Hai una sessione in corso. Vuoi continuare?',
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
      autobiography: 'La mia autobiografia',
      autobiographyDescription: 'Scrivi la tua storia di vita. Condividi i tuoi ricordi, esperienze e la tua eredità. Ogni anno se vuoi puoi scrivere un nuovo capitolo.',
      autobiographyButton: 'Inizia la Mia Storia',
      mostPopular: 'Più popolare',
      deceased: 'Biografia di un famigliare scomparso',
      deceasedDescription: 'Ricorda una persona cara del tuo nucleo famigliare.',
      deceasedButton: 'Crea Memoriale',
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
      reviewPeriodTitle: 'Pubblicazione e segnalazioni',
      reviewPeriodText:
        'Una volta pubblicata, la biografia memorial \u00e8 visibile secondo la visibilit\u00e0 che scegli (privata, solo link o pubblica). Chi la legge pu\u00f2 inviare una segnalazione; il team di moderazione la esamina e pu\u00f2 intervenire se necessario.',
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
      titleFreeflow: 'Importa testo',
      titleWithSection: 'Importa testo in {sectionName}',
      titleNoSection: 'Importa testo nella sezione',
      description: 'Carica un file o incolla il testo da importare',
      dragFile: 'Trascina un file qui o clicca per selezionare',
      dragFileHint: 'Formato supportato: .txt (max 5MB)',
      formats: 'Formati supportati: .txt, .docx, .rtf (max 5MB ciascuno, fino a 10 file)',
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
      fileTooLarge: 'File troppo grande. Dimensione massima: 5MB',
      docUnsupported: 'Formato .doc non supportato. Converti in .docx o .txt',
      formatUnsupported: 'Formato non supportato. Usa .txt, .docx o .rtf',
      tooManyFiles: 'Troppi file. Massimo 10 per importazione',
      filesQueued: '{count} file pronti per l\'importazione',
    },
    importMapping: {
      title: 'Mappa i capitoli alle sezioni',
      description: 'Verifica come i capitoli importati verranno inseriti nelle sezioni della biografia. Modifica le assegnazioni o usa i suggerimenti AI.',
      suggestAi: 'Suggerisci con AI',
      aiError: 'Suggerimento AI non riuscito. Scegli una sezione manualmente.',
      sourceAi: 'Suggerito da AI',
      sourceTitle: 'Match titolo',
      sourceManual: 'Manuale',
      confidenceHigh: 'Alta confidenza',
      confidenceMedium: 'Media confidenza',
      confidenceLow: 'Bassa confidenza',
      skipBlock: 'Salta',
      confirmImport: 'Conferma importazione',
      reviewRequired: 'Alcuni blocchi hanno bassa confidenza. Rivedi le assegnazioni o usa l\'AI prima di importare.',
      untitledBlock: 'Blocco senza titolo',
    },
    notesAndTodos: {
      title: 'Note e Promemoria',
      recordAudio: 'Registra audio',
      importText: 'Importa testo',
      exportText: 'Esporta testo',
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
      editTodo: 'Modifica',
      deleteTodo: 'Elimina',
      confirmDelete: 'Conferma eliminazione',
      confirmDeleteNote: 'Eliminare questa nota? L\'azione non può essere annullata.',
      confirmDeleteTodo: 'Eliminare questo promemoria? L\'azione non può essere annullata.',
      sortBy: 'Ordina per',
      sortByDate: 'Data aggiunta',
      sortByPriority: 'Priorità',
      sortByDueDate: 'Scadenza',
      globalTitle: 'Note e Promemoria',
      notesAndTodosMenuItem: 'Note e Promemoria',
    },
    aiReview: {
      title: 'Revisione IA della Sezione',
      reviewButton: 'Revisiona',
      suggestionsTab: 'Suggerimenti',
      rewriteTab: 'Riscrittura Completa',
      rewriteDesc: 'Una revisione che migliora il collegamento tra i passaggi, mantenendo tutti i fatti e la tua voce.',
      rewriteVersionLabel: 'Versione {n}',
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
      appliedRewrite: 'Revisione applicata alla sezione',
      apertusButton: 'Rilettura con AI svizzera',
      apertusTitle: 'Rilettura con AI svizzera',
      apertusSubtitle: 'Feedback editoriale su «{section}» tramite Apertus (IA open source svizzera)',
      apertusLoading: 'Apertus sta leggendo la sezione…',
      apertusError: 'Rilettura con AI svizzera non disponibile. Riprova più tardi.',
      apertusModelNote: 'Modello: {model}',
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
      successToastBio: 'La tua biografia è stata eliminata.',
      errorDeleteBio: 'Impossibile eliminare la biografia. Riprova.',
      successMessageAccount: 'Il tuo account è stato eliminato',
    },
    aiUsage: {
      dailyLimit: '40 azioni/giorno',
      weeklyLimit: '150 azioni/settimana',
      dailyLimitReached: 'Limite giornaliero AI raggiunto',
      weeklyLimitReached: 'Limite settimanale AI raggiunto',
      dailyLimitDetail: 'Hai esaurito le 40 azioni AI di oggi. Il limite si rinnova a mezzanotte UTC.',
      weeklyLimitDetail: 'Hai esaurito le 150 azioni AI di questa settimana. Il limite si rinnova lunedì.',
      resetsAt: 'Si rinnova alle',
      today: 'Oggi',
      thisWeek: 'Questa settimana',
      usageIndicatorTitle: 'Utilizzo AI',
      unlimited: 'Illimitato',
    },
    photos: {
      panelTitle: 'Foto',
      counter: '{count}/{max} foto',
      uploadButton: 'Carica foto',
      captionPlaceholder: 'Aggiungi una didascalia...',
      layoutLabel: 'Layout',
      layoutFullPage: 'Pagina intera',
      layoutCover: 'Copertina',
      layoutTwoVertical: 'Due foto — una sopra l\'altra',
      layoutTwoHorizontal: 'Due foto — impilate (coppia)',
      layoutThreeMixed: 'Tre foto — una larga sopra, due sotto',
      coverCompositeTitle: 'Foto di copertina (titolo)',
      customA5CoverLabel: 'Copertina personalizzata A5 (176×250mm)',
      customA5CoverHint:
        "Carica un'immagine già impaginata in formato A5 (176×250mm, 300dpi consigliati). Se l'immagine ha proporzioni diverse, verrà adattata al formato.",
      galleryPhotosHeading: 'Galleria foto',
      deleteButton: 'Elimina foto',
      deleteConfirmTitle: 'Elimina foto',
      deleteConfirmMessage: 'Sei sicuro di voler eliminare questa foto? Questa azione non può essere annullata.',
      uploadProgress: 'Caricamento...',
      fileTooLarge: 'Il file è troppo grande. La dimensione massima è 5 MB.',
      invalidFileType: 'Tipo di file non valido. Carica un\'immagine JPG, PNG o WEBP.',
      uploadError: 'Caricamento foto fallito. Riprova.',
      limitReached: 'Hai raggiunto il massimo di {max} foto per biografia.',
      deleteError: 'Eliminazione foto fallita. Riprova.',
      viewGrid: 'Vista miniature',
      viewDetail: 'Vista dettagliata',
      gridEditHint: 'Trascina per riordinare. Clicca una foto per didascalia e layout.',
    },
    admin: {
      freezeBiography: 'Congela biografia',
      freezeConfirmTitle: 'Congelare questa biografia?',
      freezeConfirmMessage: 'Questa azione renderà la biografia completamente di sola lettura per l\'autore. Non può essere annullata dall\'editor.',
      freezing: 'Congelamento...',
      frozenBannerTitle: 'Questa biografia è stata congelata',
      frozenBannerMessage: 'Questa biografia è di sola lettura e non può essere modificata.',
      moderationTitle: 'Moderazione',
      moderationSubtitle: 'Segnalazioni utenti e contenuti segnalati — per la revisione AI dell\u2019autore usa Revisione',
      moderationUnassignedBadge: 'non assegnate',
      filterStatus: 'Stato',
      filterType: 'Tipo',
      filterSort: 'Ordina',
      filterAll: 'Tutti',
      statusUnassigned: 'Non assegnato',
      statusAssigned: 'Assegnato',
      statusInReview: 'In revisione',
      statusDecided: 'Deciso',
      sortNewest: 'Più recenti',
      sortOldest: 'Meno recenti',
      typeLevel1: 'Livello 1 – Bloccato',
      typeLevel2: 'Livello 2 – Revisione',
      typeLevel3: 'Livello 3 – Avviso',
      typeUserReport: 'Segnalazione utente',
      typeLivingPerson: 'Persona vivente',
      typeRightToOblivion: 'Diritto all\'oblio',
      typeImpersonation: 'Impersonificazione',
      typeCopyright: 'Copyright',
      typeOther: 'Altro',
      colDate: 'Data',
      colType: 'Tipo',
      colBiography: 'Biografia',
      colStatus: 'Stato',
      colAiSummary: 'Riepilogo AI',
      colActions: 'Azioni',
      actionOpen: 'Apri',
      noReports: 'Nessuna segnalazione trovata.',
      loadingReports: 'Caricamento segnalazioni…',
      errorLoading: 'Impossibile caricare le segnalazioni.',
      unknownBiography: 'Biografia senza titolo',
      unknownAuthor: 'Autore sconosciuto',
      aiNoSummary: 'Nessun riepilogo disponibile',
      panelBiographyInfo: 'Biografia',
      panelReportInfo: 'Dettagli segnalazione',
      panelActions: 'Azioni moderatore',
      panelInternalNotes: 'Note interne',
      viewBiography: 'Visualizza biografia',
      biographyStatus: 'Stato',
      aiViolationLevel: 'Livello violazione AI',
      aiSummaryFull: 'Riepilogo analisi AI',
      flaggedPassages: 'Passaggi segnalati',
      flaggedPassageReason: 'Motivo',
      flaggedPassageLevel: 'Livello',
      reporterEmail: 'Segnalato da',
      reporterReason: 'Categoria motivo',
      reporterDetails: 'Dettagli',
      userReportDetails: 'Dettaglio segnalazione',
      noReportDescription: 'Nessun dettaglio aggiuntivo.',
      reportedAt: 'Segnalata il',
      noFlaggedPassages: 'Nessun passaggio segnalato.',
      reportLockedByOther: 'Questa segnalazione è in revisione da {name}.',
      reportLockedByOtherFallback: 'un altro revisore',
      moderationConflictError: 'Un altro revisore ha inviato una decisione mentre eri in revisione. Ricarica la pagina.',
      moderationActionError: 'Impossibile completare l\'azione di moderazione.',
      moderationReaderReportHint: 'Le segnalazioni dei lettori non ritirano la biografia dalla pubblicazione. Resta visibile finché non la congeli o la rimuovi.',
      dismissReportKeepPublished: 'Archivia segnalazione (resta pubblicata)',
      confirmDismissReport: 'Archiviare questa segnalazione?',
      confirmDismissReportDetail: 'La biografia resta pubblicata. L\'autore non riceverà notifiche.',
      notifyReportDismissed: 'Una segnalazione sulla tua biografia è stata esaminata e archiviata.',
      freezeAndNotifyAuthor: 'Congela e notifica autore',
      confirmFreezeAndNotify: 'Congelare e notificare l\'autore?',
      confirmFreezeAndNotifyDetail: 'La biografia resta pubblicata ma diventa di sola lettura per l\'autore. Verrà inviato il tuo messaggio.',
      notifyFrozenFromReport: 'La tua biografia è stata congelata in seguito a una segnalazione. Controlla le notifiche.',
      moderationFreezeWhileReviewingDetail: 'La biografia diventa di sola lettura per l\'autore e la segnalazione viene chiusa.',
      takeOwnership: 'Prendi in carico',
      takingOwnership: 'Prendendo in carico…',
      approveAndPublish: 'Approva e pubblica',
      publishWithWarning: 'Pubblica con avviso',
      returnToAuthor: 'Restituisci all\'autore',
      removeBiography: 'Rimuovi biografia',
      messageToAuthor: 'Messaggio all\'autore',
      messageToAuthorPlaceholder: 'Spiega cosa deve essere corretto…',
      confirmApprove: 'Approvare e pubblicare?',
      confirmApproveDetail: 'La biografia verrà pubblicata e l\'autore sarà notificato.',
      confirmPublishWarning: 'Pubblicare con avviso?',
      confirmPublishWarningDetail: 'La biografia verrà pubblicata ma l\'autore riceverà un promemoria sulle linee guida.',
      confirmReturn: 'Restituire all\'autore?',
      confirmReturnDetail: 'La biografia tornerà in bozza e l\'autore riceverà il tuo messaggio.',
      confirmRemove: 'Rimuovere la biografia?',
      confirmRemoveDetail: 'Questo rimuoverà definitivamente la biografia. L\'autore verrà notificato. Azione irreversibile.',
      confirmAction: 'Conferma',
      cancelAction: 'Annulla',
      internalNotesPlaceholder: 'Aggiungi note interne (non visibili agli utenti)…',
      saveNotes: 'Salva note',
      savingNotes: 'Salvataggio…',
      notesSaved: 'Note salvate',
      notifyPublished: 'La tua biografia è stata revisionata e pubblicata.',
      notifyPublishedWarning: 'La tua biografia è stata pubblicata. Ti invitiamo a rivedere le nostre linee guida.',
      notifyReturned: 'La tua biografia è stata restituita per revisione.',
      notifyRemoved: 'La tua biografia è stata rimossa per violazione delle linee guida.',
      assignedToYou: 'Assegnato a te',
      assignedToOther: 'Assegnato a un altro revisore',
      usersTitle: 'Gestione Utenti',
      usersSubtitle: 'Gestisci ruoli e account degli utenti',
      usersNavLink: 'Utenti',
      usersSearchPlaceholder: 'Cerca per nome o email…',
      usersColAvatar: 'Avatar',
      usersColName: 'Nome',
      usersColEmail: 'Email',
      usersColRole: 'Ruolo',
      usersColJoined: 'Iscritto',
      usersColBiographies: 'Biografie',
      usersColActions: 'Azioni',
      usersSaveRole: 'Salva ruolo',
      usersRoleUser: 'Utente',
      usersRoleReviewer: 'Revisore',
      usersRoleAdmin: 'Admin',
      usersRoleSuperAdmin: 'Super Admin',
      usersChangeRoleTitle: 'Cambia ruolo',
      usersChangeRoleMessage: "Cambia il ruolo di {name} da {old} a {new}?",
      usersChangeRoleFrom: 'da',
      usersChangeRoleTo: 'a',
      usersRoleUpdated: 'Ruolo aggiornato con successo',
      usersCannotChangeSelf: 'Non puoi cambiare il tuo ruolo.',
      usersCannotChangeSelfTooltip: 'Non puoi cambiare il tuo ruolo',
      usersPrev: 'Precedente',
      usersNext: 'Successivo',
      usersPageOf: 'di',
      usersAccessDenied: 'Accesso Negato',
      usersAccessDeniedMessage: 'Questa pagina è riservata ai super amministratori.',
      usersPageRestrictedToAdmins: 'Questa pagina è riservata agli amministratori.',
      usersRedirectingIn: 'Reindirizzamento tra',
      usersLoadError: 'Impossibile caricare gli utenti.',
      usersColStatus: 'Account',
      usersStatusActive: 'Attivo',
      usersStatusSuspended: 'Sospeso',
      usersSuspend: 'Sospendi',
      usersReinstate: 'Riattiva',
      usersDeleteUser: 'Elimina utente',
      usersConfirmSuspendTitle: 'Sospendere questo account?',
      usersConfirmSuspendDetail:
        'L’utente verrà disconnesso, non potrà accedere e la biografia pubblica non sarà visibile. Verrà inviata un’email all’utente.',
      usersConfirmReinstateTitle: 'Riattivare questo account?',
      usersConfirmReinstateDetail: 'L’utente potrà di nuovo accedere. Verrà inviata un’email.',
      usersConfirmDeleteTitle: 'Eliminare definitivamente questo utente?',
      usersConfirmDeleteDetail:
        'L’account e i dati associati verranno rimossi. Operazione irreversibile. Verrà inviata un’email all’utente.',
      usersToastSuspended: 'Account sospeso.',
      usersToastReinstated: 'Account riattivato.',
      usersToastDeleted: 'Utente eliminato.',
      usersActionFailed: 'Operazione non riuscita. Riprova.',
      usersReviewerLanguages: 'Lingue di revisione',
      usersReviewerLanguagesSaved: 'Lingue revisore aggiornate.',
      usersReviewerLanguagesError: 'Impossibile aggiornare le lingue revisore.',
      overviewTitle: 'Panoramica Admin',
      overviewSubtitle: 'Stato della piattaforma e statistiche principali',
      navOverview: 'Panoramica',
      navModeration: 'Moderazione',
      navBiographies: 'Biografie',
      navPublicCatalog: 'Catalogo pubblico',
      navReview: 'Coda Revisione',
      navUsers: 'Utenti',
      navAiStats: 'Stat AI',
      reviewPageTitle: 'Coda Revisione Biografie',
      reviewPageSubtitle:
        'Coda revisione autore dopo screening AI — non include segnalazioni dei lettori (vedi Moderazione).',
      reviewColSubject: 'Soggetto',
      reviewColTitle: 'Titolo',
      reviewColAuthor: 'Autore',
      reviewColLanguage: 'Lingua',
      reviewColType: 'Tipo',
      reviewColSubmitted: 'Inviata il',
      reviewColRead: 'Leggi',
      reviewColActions: 'Azioni',
      reviewApprove: 'Approva',
      reviewReject: 'Rifiuta',
      reviewConfirmReject: 'Conferma Rifiuto',
      reviewCancelReject: 'Annulla',
      reviewReasonLabel: 'Motivo del rifiuto',
      reviewReasonPlaceholder: 'Spiega perché la biografia viene restituita per revisione…',
      reviewReasonRequired: 'Fornisci un motivo (almeno 10 caratteri).',
      reviewEmpty: 'Nessuna biografia in attesa di revisione',
      reviewEmptySubtitle: 'Tutto aggiornato! Non ci sono biografie nella coda di revisione.',
      reviewLoadError: 'Impossibile caricare la coda di revisione.',
      reviewApproveError: 'Impossibile approvare la biografia.',
      reviewRejectError: 'Impossibile rifiutare la biografia.',
      reviewFlaggedPassages: 'passaggi segnalati',
      reviewApprovePassage: 'Approva passaggio',
      reviewRejectPassage: 'Rifiuta passaggio',
      reviewAllPassagesReviewed: 'Tutti i passaggi revisionati — pronto per decidere',
      reviewAiReason: 'Motivazione AI',
      aiStatsPageTitle: 'Statistiche Utilizzo AI',
      aiStatsPageSubtitle: 'Monitora l\'utilizzo delle funzioni AI da parte di tutti gli utenti',
      aiStatsDataNote: 'Nota: i dati di utilizzo vengono conservati per 30 giorni.',
      aiStatsFilterToday: 'Oggi',
      aiStatsFilterLast7: 'Ultimi 7 giorni',
      aiStatsFilterLast30: 'Ultimi 30 giorni',
      aiStatsFilterAllTime: 'Tutto il tempo',
      aiStatsTotalRequests: 'Richieste AI totali',
      aiStatsUniqueUsers: 'Utenti unici',
      aiStatsMostUsedAction: 'Azione più usata',
      aiStatsAvgPerUser: 'Media richieste / utente',
      aiStatsSection1: 'Riepilogo',
      aiStatsSection2: 'Utilizzo per tipo di azione',
      aiStatsSection3: 'Utenti principali per utilizzo AI',
      aiStatsSection4: 'Utilizzo giornaliero (ultimi 14 giorni)',
      aiStatsColAction: 'Azione',
      aiStatsColCount: 'Richieste',
      aiStatsColName: 'Nome',
      aiStatsColEmail: 'Email',
      aiStatsColTotalRequests: 'Richieste totali',
      aiStatsColLastUsed: 'Ultimo utilizzo',
      aiStatsColDate: 'Data',
      aiStatsColUniqueUsers: 'Utenti unici',
      aiStatsNoData: 'Nessun dato per questo periodo.',
      aiStatsLoadError: 'Impossibile caricare le statistiche AI.',
      aiStatsNever: 'Mai',
      statTotalUsers: 'Utenti Totali',
      statNewThisWeek: 'Nuovi questa settimana',
      statActiveThisMonth: 'Attivi questo mese',
      statTotalBiographies: 'Biografie Totali',
      statPublished: 'Pubblicate',
      statUnderReview: 'In revisione',
      statRemoved: 'Rimosse',
      statOpenReports: 'Segnalazioni aperte',
      statInReview: 'In revisione',
      statResolvedThisWeek: 'Risolte questa settimana',
      sectionUsers: 'Utenti',
      sectionBiographies: 'Biografie',
      sectionModeration: 'Moderazione',
      sectionQuickActions: 'Azioni Rapide',
      quickActionModeration: 'Vai alla Moderazione',
      quickActionUsers: 'Gestisci Utenti',
      quickActionBiographies: 'Vedi Biografie',
      quickActionPublicCatalog: 'Apri catalogo pubblico',
      quickActionReview: 'Coda revisione',
      guardAccessDenied: 'Accesso negato',
      guardAccessDeniedMessage: 'Non hai i permessi per accedere a questa area.',
      guardRedirectingIn: 'Reindirizzamento tra {seconds}s…',
      overviewPeriodLast7Days: 'Ultimi 7 giorni',
      overviewPeriodLast30Days: 'Ultimi 30 giorni',
      overviewParseErrorBanner: '{count} {count, plural, one {biografia pubblicata} other {biografie pubblicate}} negli ultimi 7 giorni hanno saltato lo screening AI per errore di parsing. Potrebbero richiedere revisione manuale.',
      overviewViewAffected: 'Vedi biografie interessate',
      reviewNoLanguages: 'Nessuna lingua assegnata — contatta un amministratore per ricevere assegnazioni di revisione.',
      reviewConflictTitle: 'Un altro revisore sta lavorando su questa biografia',
      reviewConflictDescription: 'Un altro revisore ha questa biografia aperta. Procedendo annullerai il suo blocco e invierai la tua decisione.',
      reviewConflictCancel: 'Annulla',
      reviewConflictProceed: 'Procedi comunque',
      reviewInReviewLabel: 'In revisione',
      reviewUndo: 'Annulla',
      reviewPassagesRemaining: '{count} rimanenti',
      reportLockWarning: 'Questa segnalazione è assegnata a un altro moderatore.',
      usersNoUsersFound: 'Nessun utente trovato',
      bioPageTitle: 'Tutte le Biografie',
      bioPageSubtitle: 'Sfoglia, cerca e gestisci tutte le biografie nel sistema',
      bioSearchPlaceholder: 'Cerca per titolo o autore…',
      bioFilterStatus: 'Stato',
      bioFilterType: 'Tipo',
      bioFilterSort: 'Ordina',
      bioFilterAll: 'Tutti',
      bioStatusDraft: 'Bozza',
      bioStatusPublished: 'Pubblicata',
      bioStatusUnderReview: 'In revisione',
      bioStatusPdfDraft: 'Bozza PDF',
      bioStatusLockedPendingScreening: 'In attesa di screening',
      bioStatusRemoved: 'Rimossa',
      bioTypeAll: 'Tutti i tipi',
      bioTypeAutobiography: 'Autobiografia',
      bioTypeDeceased: 'Defunto',
      bioSortNewest: 'Più recenti',
      bioSortOldest: 'Meno recenti',
      bioSortRecentlyPublished: 'Pubblicati di recente',
      bioSortMostViews: 'Più visualizzate',
      bioColTitle: 'Titolo',
      bioColAuthor: 'Autore',
      bioColType: 'Tipo',
      bioColStatus: 'Stato',
      bioColViews: 'Visualizzazioni',
      bioColCreated: 'Creata',
      bioColPublished: 'Pubblicata',
      bioColActions: 'Azioni',
      bioActionView: 'Visualizza',
      bioNoResults: 'Nessuna biografia trovata.',
      bioLoadError: 'Impossibile caricare le biografie.',
      bioPrev: 'Precedente',
      bioNext: 'Successiva',
      bioPageOf: 'di',
      bioPanelTitle: 'Dettagli Biografia',
      bioPanelSection1: 'Info Biografia',
      bioPanelSection2: 'Anteprima Contenuto',
      bioPanelSection3: 'Azioni Admin',
      bioPanelAuthor: 'Autore',
      bioPanelEmail: 'Email',
      bioPanelType: 'Tipo',
      bioPanelStatus: 'Stato',
      bioPanelPrivacy: 'Privacy',
      bioPanelCreated: 'Creata',
      bioPanelUpdated: 'Aggiornata',
      bioPanelShareToken: 'Token di condivisione',
      bioPanelNoContent: 'Nessuna sezione di contenuto trovata.',
      bioPanelOpenFull: 'Apri biografia completa',
      bioPrivatePrivacy: 'Privata',
      bioFamilyPrivacy: 'Famiglia',
      bioPublicPrivacy: 'Pubblica',
      bioActionForcePublish: 'Pubblica forzatamente',
      bioActionSetDraft: 'Imposta come bozza',
      bioActionRemove: 'Rimuovi biografia',
      bioActionRestore: 'Ripristina biografia',
      bioActionForcePublishConfirm: 'Pubblicare forzatamente questa biografia?',
      bioActionForcePublishDetail: 'La biografia verrà pubblicata immediatamente e l\'autore verrà notificato.',
      bioActionSetDraftConfirm: 'Tornare alla bozza?',
      bioActionSetDraftDetail: 'La biografia verrà restituita come bozza e l\'autore verrà notificato.',
      bioActionRemoveConfirm: 'Rimuovere questa biografia?',
      bioActionRemoveDetail: 'La biografia sarà nascosta a tutti gli utenti non staff. L\'autore verrà notificato. Questa azione è reversibile.',
      bioActionRestoreConfirm: 'Ripristinare questa biografia?',
      bioActionRestoreDetail: 'La biografia verrà ripristinata come bozza e l\'autore potrà rivederla.',
      bioActionConfirm: 'Conferma',
      bioActionCancel: 'Annulla',
      bioNotifyForcePublished: 'La tua biografia è stata pubblicata da un amministratore.',
      bioNotifySetDraft: 'La tua biografia è stata restituita come bozza da un amministratore.',
      bioNotifyRemoved: 'La tua biografia è stata rimossa da un amministratore.',
      bioNotifyRestored: 'La tua biografia è stata ripristinata. Puoi rivederla e ripubblicarla.',
      bioActionSuccess: 'Azione completata con successo.',
      bioActionError: 'Impossibile completare l\'azione.',
      bioActionChapterCooldownError: 'Impossibile pubblicare: è ancora attivo il periodo di attesa annuale tra capitoli.',
      bioActionFreeze: 'Congela biografia',
      bioActionUnfreeze: 'Scongela biografia',
      bioActionFreezeConfirm: 'Congelare questa biografia?',
      bioActionFreezeDetail: 'La biografia diventerà di sola lettura per l\'autore. L\'autore verrà notificato. Questa azione è reversibile.',
      bioActionUnfreezeConfirm: 'Scongelare questa biografia?',
      bioActionUnfreezeDetail: 'L\'autore riacquisterà pieno accesso alla modifica. L\'autore verrà notificato.',
      bioNotifyFrozen: 'La tua biografia è stata congelata da un amministratore ed è ora di sola lettura.',
      bioNotifyUnfrozen: 'La tua biografia è stata scongelata da un amministratore. Puoi modificarla di nuovo.',
      bioStatusFrozen: 'Congelata',
    },
    publicBiographies: {
      pageTitle: 'Biografie Pubblicate',
      pageSubtitle: 'Scopri storie di vita condivise con il mondo.',
      searchPlaceholder: 'Cerca per titolo o autore…',
      filterLanguage: 'Lingua',
      filterType: 'Tipo',
      filterAll: 'Tutti',
      typeAutobiography: 'Autobiografia',
      typeMemorial: 'Memoriale',
      langAll: 'Tutte le lingue',
      chaptersCount: 'Capitoli',
      publishedOn: 'Pubblicato',
      readBiography: 'Leggi la biografia',
      noResults: 'Nessuna biografia trovata',
      noResultsSubtitle: 'Prova a modificare la ricerca o i filtri.',
      loading: 'Caricamento biografie…',
      errorLoading: 'Impossibile caricare le biografie.',
      untitled: 'Biografia senza titolo',
      unknownAuthor: 'Autore sconosciuto',
      featuredTitle: 'Storie in Evidenza',
      mostReadTitle: 'Più Lette',
      discoverTitle: 'Scopri',
      signIn: 'Accedi',
      startBiography: 'Inizia la tua biografia',
      viewsCount: 'visualizzazioni',
      langOriginal: 'Lingua originale',
      langTranslation: 'Traduzione disponibile',
    },
    pwa: {
      installBannerText: 'Aggiungi Biography Library alla schermata principale',
      installButton: 'Installa',
      dismissButton: 'Chiudi',
      iosInstallText: "Per installare: tocca il pulsante Condividi (\u{1F4E4}) poi 'Aggiungi a schermata Home'",
    },
    meta: {
      tagline: 'Perché ogni vita merita di essere ricordata',
    },
    notifications: {
      title: 'Notifiche',
      empty: 'Non hai notifiche al momento. Controlla più tardi.',
      markAllRead: 'Segna tutto come letto',
      markAsRead: 'Segna come letto',
      justNow: 'Adesso',
      biographyApproved: 'La tua biografia è stata approvata e pubblicata.',
      biographyRejected: 'La tua biografia è stata restituita per revisione: ',
      biographyRejectedWithPassages: 'La tua biografia richiede revisione. Passaggi segnalati:\n{passages}\nNota revisore: {note}',
      biographyAutoPublished: 'La tua biografia è stata revisionata e pubblicata automaticamente.',
      reviewAssigned: 'Una biografia ti è stata assegnata per la revisione.',
    },
    errors: {
      title: 'Qualcosa è andato storto',
      description: 'Si è verificato un errore imprevisto. Il tuo lavoro è stato salvato automaticamente.',
      tryAgain: 'Riprova',
      goToDashboard: 'Vai alla Dashboard',
    },
    settings: {
      biographyType: {
        label: 'Tipo di biografia',
        autobiography: 'Autobiografia',
        memorial: 'Memoriale',
      },
      coverMode: {
        label: 'Stile copertina',
        graphic: 'Grafico (colore brand)',
        photo: 'Foto (dalla galleria)',
        noPhotoWarning: 'Nessuna foto copertina selezionata. Vai alla galleria foto e imposta il layout di una foto su "Copertina".',
      },
      slug: {
        label: 'URL slug',
        helper: 'Usato nell\'URL pubblico. Solo lettere minuscole, numeri e trattini.',
        duplicateError: 'Questo slug è già in uso. Scegline un altro.',
      },
      coverPreview: 'Anteprima copertina',
      noCoverPhoto: 'Nessuna foto di copertina',
      goToPhotos: 'Aggiungi nelle Foto',
    },
    helpChatbot: {
      title: 'Aiuto',
      placeholder: 'Fai una domanda…',
      send: 'Invia',
      loading: 'Sto pensando…',
      lowConfidence: 'Non sono sicuro al 100% — prova la guida completa per maggiori dettagli.',
      clearChat: 'Cancella chat',
      openHelp: 'Apri aiuto',
      closeHelp: 'Chiudi aiuto',
      sessionExpired: 'La sessione è scaduta. Accedi di nuovo.',
      rateLimitError: 'Troppe richieste. Attendi un momento.',
      genericError: 'Qualcosa è andato storto. Riprova.',
      signInRequired: 'Accedi per usare l\'assistente.',
    },
    onboardingWizard: {
      stepProgress: 'Passo {current} di {total}',
      typeSubtitle: 'Indica per chi è questa biografia. Al passo successivo confermerai i tuoi diritti legali.',
      accountModelInfo:
        'Ogni account gestisce una sola biografia (autobiografia o memorial — scegli con attenzione). Per un altro progetto in futuro (es. la tua autobiografia e un memorial di famiglia), crea un nuovo account con un\'altra email. Altri familiari possono scrivere la loro prospettiva sulla stessa persona con account separati.',
      legalSubtitle: 'Leggi e conferma ogni dichiarazione per continuare.',
      pathTitle: 'Come vuoi lavorare?',
      pathSubtitle: 'Scegli il percorso iniziale. Potrai cambiare approccio in seguito.',
      pathHint: 'Dopo questo passo vedrai un breve tour guidato dell\'editor nella lingua scelta.',
      publishReadyDescription: 'Importa un testo già pronto e procedi verso pubblicazione ed export PDF.',
      skipForNow: 'Salta per ora',
      startTour: 'Crea e avvia il tour',
      resumeIntro: 'Riprendi introduzione',
      resumeIntroDescription: 'Continua la configurazione guidata da dove l\'avevi interrotta.',
      reviewIntro: 'Rivedi introduzione',
      tourCompleted: 'Tour completato — buona scrittura!',
      tourSkip: 'Salta tour',
      tourNext: 'Avanti',
      tourBack: 'Indietro',
      tourFinish: 'Fine',
      tourStepOptional: 'Puoi provare l\'azione evidenziata ora, oppure premere Avanti per continuare senza.',
      tourTryStep: 'Provalo',
      tryActionHint: 'Prova l\'azione evidenziata per continuare.',
    },
    onboardingTour: {
      sectionsOverviewTitle: 'Capitoli',
      sectionsOverviewDesc:
        'La biografia è organizzata in capitoli. Selezionane uno dall\'elenco per lavorarci con Echo.',
      bookTitleTitle: 'Titolo del libro',
      bookTitleDesc: 'Clicca il titolo in alto per rinominare la biografia in qualsiasi momento.',
      privacyTitle: 'Visibilità',
      privacyDesc:
        'Questo pulsante indica chi può vedere la biografia. Toccalo per passare tra Privata, Link famiglia e Pubblica.',
      echoPanelTitle: 'Scrivi con Echo',
      echoPanelDesc:
        'Chatta con Echo qui per abbozzare il capitolo a testo o voce. Fai domande, chiedi suggerimenti o una bozza.',
      editSectionTitle: 'Modifica',
      editSectionDesc:
        'Usa Modifica per aprire l\'editor del capitolo. Correggi la bozza di Echo, incolla il tuo testo o scrivi direttamente — Echo resta il tuo assistente.',
      aiCreditsTitle: 'Crediti AI',
      aiCreditsDesc:
        'Questo contatore mostra quante azioni assistite da AI ti restano oggi e questa settimana. Gli account standard hanno limiti giornalieri e settimanali.',
      echoVoiceTitle: 'Voce di Echo',
      echoVoiceDesc:
        'Usa l\'icona dell\'altoparlante per attivare o disattivare le risposte vocali di Echo. Se muto, Echo risponde solo in testo.',
      echoVoiceFreeflowTitle: 'Voce di Echo',
      echoVoiceFreeflowDesc:
        'Apri Echo dal pulsante flottante, poi usa l\'icona dell\'altoparlante nella chat per mutare o riattivare la voce.',
      notesTitle: 'Note e promemoria',
      notesDesc: 'Tieni qui appunti di ricerca e promemoria — separati dal testo pubblicato.',
      photosTitle: 'Foto',
      photosDesc: 'Aggiungi immagini alla galleria e collegale ai capitoli dove serve.',
      importTextTitle: 'Importa testo',
      importTextDesc: 'Incolla o carica testo esistente da Word, PDF o file di testo.',
      exportTextTitle: 'Esporta testo',
      exportTextDesc: 'Scarica la biografia in TXT o DOCX, oppure avvia una bozza PDF per la revisione.',
      bookStructureTitle: 'Struttura libro',
      bookStructureDesc: 'Imposta copertina, pagina dei crediti e opzioni di impaginazione prima dell\'export.',
      reviewPublicationTitle: 'Revisione e pubblicazione',
      reviewPublicationDesc:
        'Invia la biografia in revisione, controlla le bozze PDF e pubblica quando sei pronto.',
      freeflowEditorTitle: 'Area di scrittura',
      freeflowEditorDesc:
        'Questo è lo spazio principale per scrivere. Digita liberamente o incolla testo importato, poi usa gli strumenti nel pannello laterale.',
      echoBubbleTitle: 'Assistente Echo',
      echoBubbleDesc:
        'Tocca il pulsante Echo in basso a destra per aprire l\'assistente AI mentre scrivi.',
      publishImportTitle: 'Importa il testo',
      publishImportDesc: 'Porta sulla piattaforma la biografia già scritta tramite Importa.',
      publishFinalTitle: 'Versione finale',
      publishFinalDesc: 'Rifinisci il testo qui prima di passare alle bozze PDF e alla pubblicazione.',
      publishExportTitle: 'Esporta',
      publishExportDesc: 'Esporta una bozza PDF o una copia testo per vedere come apparirà il libro.',
      mobileMenuTitle: 'Menu capitoli e strumenti',
      mobileMenuDesc:
        'Su telefono e tablet, tocca l\'icona menu in alto a destra nella barra dell\'editor per aprire capitoli e strumenti. Il tour aprirà questo pannello automaticamente nei passi successivi.',
      mobileSidebarOverviewHint:
        'L\'elenco capitoli e gli strumenti sono in questo pannello. Su telefono e tablet, aprilo con il pulsante menu in alto a destra nella barra dell\'editor.',
    },
    echo: {
      hubEmpty: 'Ciao! Sono Echo. Ti guido nella biografia — a voce o per iscritto.',
      resumeBiography: 'Continua: {title}',
      resumeButton: 'Riprendi biografia',
      newGuided: 'Racconta con l\'assistenza di Echo, la tua AI personale che ti guida passo passo.',
      newImport: 'Ho già un testo da importare',
      newPublishOnly: 'Prepara un testo esistente per la pubblicazione',
      myBiographies: 'Le mie biografie',
      pickBiography: 'Seleziona biografia',
      untitledBiography: 'Senza titolo',
      inputPlaceholder: 'Scrivi o usa il microfono…',
      statusListening: 'Ti ascolto…',
      statusSpeaking: 'Sto parlando…',
      statusThinking: 'Sto pensando…',
      statusFormulatingReply: 'Sto elaborando la risposta',
      statusWelcome: 'Scrivi o usa il microfono — sono qui per guidarti',
      statusReady: 'Pronto per la prossima domanda',
      statusVoiceMuted: 'Solo testo — voce disattivata',
      statusPreparingReply: 'Preparo una risposta…',
      statusReadingMessage: 'Leggo il tuo messaggio…',
      statusWriting: 'Sto scrivendo…',
      statusStillWorking: 'Ci sto mettendo un po\' più del solito…',
      statusSlowApology: 'Scusa l\'attesa, quasi fatto…',
      statusLoadingHistory: 'Recupero la conversazione…',
      statusLoadingOlder: 'Carico messaggi precedenti…',
      errorGeneric: 'Qualcosa è andato storto. Riprova.',
      openEcho: 'Chiedi a Echo',
      closeEcho: 'Chiudi',
      aiToolsMenu: 'Strumenti AI',
      changePath: 'Cambia percorso',
      changePathTitle: 'Cambia percorso di scrittura',
      changePathDescription: 'Il contenuto sarà conservato. Puoi esportare una copia prima.',
      exportBeforeChange: 'Esporta copia prima',
      confirmPathChange: 'Converti e continua',
      onboardingWelcome: 'Benvenuto in Biography Library. Sono Echo — iniziamo.',
      pathChanged: 'Percorso aggiornato.',
      concentrationMode: 'Modalità concentrazione',
      exitConcentration: 'Esci dalla concentrazione',
      consultEcho: 'Echo',
      stopSpeaking: 'Interrompi',
      muteVoice: 'Disattiva voce di Echo',
      unmuteVoice: 'Attiva voce di Echo',
      speakingBanner: 'Echo sta leggendo ad alta voce…',
      activeSectionContext: 'Ora stai lavorando su: {section}',
      sectionSwitchPrefix: '[Ora sulla sezione «{section}»]',
      icebreakerHint: 'Puoi chiedere, per esempio:',
      icebreakerDefaultSection: 'questo capitolo',
      insertDraftPrompt: 'Inserire questo testo nell\'editor?',
      insertDraftConfirm: 'Inserisci nell\'editor',
      insertDraftDismiss: 'Più tardi',
      insertDraftDone: 'Testo inserito nell\'editor.',
      insertDraftCardTitle: 'Bozza per {section}',
      insertDraftCardSubtitle: 'Rileggi il testo qui sotto, poi inseriscilo nella biografia.',
      insertDraftLater: 'Più tardi',
      insertDraftShowPreview: 'Mostra anteprima completa',
      insertDraftHidePreview: 'Comprimi anteprima',
      insertDraftReady: 'Bozza pronta',
      insertDraftSectionMismatch: 'Verrà inserita in: {section} (non nel capitolo che stai visualizzando).',
      insertDraftSuccessTitle: 'Testo inserito',
      insertDraftSuccessBody: 'La bozza è stata aggiunta all\'editor. Puoi rivederla e modificarla quando vuoi.',
      insertDraftOpenEditor: 'Apri editor',
      insertDraftDialogTitle: 'Bozza inserita',
      insertDraftDialogDescription: 'Il testo è stato aggiunto a {section}. Apri l\'editor per verificarlo subito.',
      insertDraftContinueChat: 'Continua in chat',
      insertDraftPendingBadge: '{count} bozza da inserire',
      loadOlderMessages: 'Carica messaggi precedenti',
      loadingOlderMessages: 'Caricamento…',
      ...getEchoGuideCopy('it'),
      icebreakerPools: getEchoIcebreakerPools('it'),
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
      demoBiographies: 'Biographies démo',
      workspace: 'Workspace',
      dashboard: 'Tableau de bord',
      biography: 'Biographie',
      settings: 'Param\u00e8tres',
      logout: 'D\u00e9connexion',
      admin: 'Admin',
      reviewer: 'Réviseur',
      notifications: 'Notifications',
      darkMode: 'Mode sombre',
      decreaseFontSize: 'R\u00e9duire la taille du texte',
      increaseFontSize: 'Augmenter la taille du texte',
      signOut: 'Se d\u00e9connecter',
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
      createYourAccount: 'Cr\u00e9ez votre compte',
      registerSubtitle: 'Commencez \u00e0 pr\u00e9server et partager des histoires de vie',
      fullName: 'Nom complet',
      yourName: 'Votre nom',
      emailPlaceholder: 'vous@exemple.com',
      enterPassword: 'Entrez votre mot de passe',
      atLeastSixChars: 'Au moins 6 caract\u00e8res',
      repeatPassword: 'R\u00e9p\u00e9tez votre mot de passe',
      passwordsDoNotMatch: 'Les mots de passe ne correspondent pas',
      passwordMinLength: 'Le mot de passe doit contenir au moins 8 caract\u00e8res',
      createOne: 'Cr\u00e9er un compte',
      createAccount: 'Cr\u00e9er un compte',
      forgotPassword: 'Mot de passe oubli\u00e9\u00a0?',
      forgotPasswordTitle: 'R\u00e9initialiser votre mot de passe',
      forgotPasswordSubtitle: 'Entrez votre adresse email et nous vous enverrons un lien pour r\u00e9initialiser votre mot de passe',
      forgotPasswordButton: 'Envoyer le lien de r\u00e9initialisation',
      forgotPasswordSending: 'Envoi en cours...',
      forgotPasswordSuccess: 'V\u00e9rifiez votre email',
      forgotPasswordSuccessDetail: 'Nous avons envoy\u00e9 un lien de r\u00e9initialisation du mot de passe \u00e0 votre adresse email. Veuillez v\u00e9rifier votre bo\u00eete de r\u00e9ception.',
      backToLogin: 'Retour \u00e0 la connexion',
      resetPassword: 'R\u00e9initialiser le mot de passe',
      resetPasswordTitle: 'D\u00e9finir un nouveau mot de passe',
      resetPasswordSubtitle: 'Entrez votre nouveau mot de passe ci-dessous',
      newPassword: 'Nouveau mot de passe',
      confirmNewPassword: 'Confirmer le nouveau mot de passe',
      resetPasswordButton: 'Mettre \u00e0 jour le mot de passe',
      resetPasswordUpdating: 'Mise \u00e0 jour...',
      resetPasswordSuccess: 'Mot de passe mis \u00e0 jour',
      resetPasswordSuccessDetail: 'Votre mot de passe a \u00e9t\u00e9 mis \u00e0 jour avec succ\u00e8s. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.',
      resetPasswordInvalidLink: 'Lien invalide ou expir\u00e9',
      resetPasswordInvalidLinkDetail: 'Ce lien de r\u00e9initialisation du mot de passe a expir\u00e9 ou a d\u00e9j\u00e0 \u00e9t\u00e9 utilis\u00e9. Veuillez en demander un nouveau.',
      resetPasswordRequestNew: 'Demander un nouveau lien de r\u00e9initialisation',
      resetPasswordVerifying: 'V\u00e9rification de votre lien...',
      atLeastEightChars: 'Au moins 8 caract\u00e8res',
      verifyEmailTitle: 'V\u00e9rifiez votre email',
      verifyEmailSubtitle: 'Nous avons envoy\u00e9 un email de v\u00e9rification \u00e0 votre adresse. Veuillez v\u00e9rifier votre bo\u00eete de r\u00e9ception et cliquer sur le lien pour activer votre compte.',
      verifySentTo: 'Nous avons envoy\u00e9 un lien de confirmation \u00e0',
      verifyEmailDetail: 'Vous n\'avez pas re\u00e7u l\'email\u00a0? V\u00e9rifiez votre dossier spam ou renvoyez-le ci-dessous.',
      verifyEmailLinkSent: 'Nous vous avons envoy\u00e9 un lien de confirmation. Cliquez sur le lien dans l\'email pour activer votre compte.',
      verifyEmailAutoUpdate: 'Cette page se mettra \u00e0 jour automatiquement apr\u00e8s confirmation.',
      verifyEmailChecking: 'V\u00e9rification en cours...',
      verifyEmailAlreadyConfirmed: 'J\'ai d\u00e9j\u00e0 confirm\u00e9, connectez-moi',
      verifyEmailConfirmedTitle: 'Email confirm\u00e9\u00a0!',
      verifyEmailConfirmedDetail: 'Votre compte a \u00e9t\u00e9 v\u00e9rifi\u00e9. Redirection vers le tableau de bord...',
      verifyEmailFailedTitle: 'Echec de la v\u00e9rification',
      verifyEmailFailedDetail: 'Le lien de confirmation a expir\u00e9 ou a d\u00e9j\u00e0 \u00e9t\u00e9 utilis\u00e9. Veuillez en demander un nouveau.',
      verifyEmailResendSuccessInline: 'Email envoy\u00e9\u00a0! V\u00e9rifiez votre bo\u00eete de r\u00e9ception.',
      verifyEmailDidntReceive: 'Vous n\'avez pas re\u00e7u l\'email\u00a0? Renvoyez-le',
      resendVerification: 'Renvoyer l\'email de v\u00e9rification',
      resendVerificationSending: 'Envoi en cours...',
      resendVerificationSuccess: 'Email de v\u00e9rification envoy\u00e9',
      useAnotherEmail: 'Utiliser une autre adresse email',
      resendCooldown: 'Renvoyer dans {seconds}s',
      resendNewConfirmEmail: 'Envoyer un nouvel email de confirmation',
      emailNotVerified: 'Email non v\u00e9rifi\u00e9',
      emailNotVerifiedDetail: 'Veuillez v\u00e9rifier votre adresse email pour acc\u00e9der au tableau de bord.',
      mustAcceptTerms: 'Obligatoire \u2014 vous devez accepter les conditions pour continuer',
      accountSuspended:
        'Votre compte a \u00e9t\u00e9 suspendu. Si vous pensez qu\u2019il s\u2019agit d\u2019une erreur, r\u00e9pondez \u00e0 l\u2019e-mail re\u00e7u.',
      registrationLanguage: 'Votre langue',
      registrationLanguageHint:
        'Les e-mails, l\u2019onboarding et l\u2019interface utiliseront cette langue. Ce choix ne pourra pas \u00eatre modifi\u00e9.',
      registrationLanguageAlertTitle: 'La langue ne pourra pas \u00eatre modifi\u00e9e',
      registrationLanguageAlertMessage:
        'La langue s\u00e9lectionn\u00e9e sera utilis\u00e9e pour les e-mails, l\u2019onboarding et toute l\u2019application. Apr\u00e8s l\u2019inscription, vous ne pourrez plus la modifier.',
    },
    accountSettings: {
      language: 'Langue',
      languageLockedHint: 'Choisie \u00e0 l\u2019inscription et non modifiable.',
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
      sectionsComplete: 'Sections Terminées',
      finalVersion: 'Version Finale',
      statusRemoved: 'Supprimée',
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
      statusPublished: 'Publié',
      statusUnderReview: 'En cours d\'examen',
      statusPdfDraft: 'Brouillon PDF',
      statusLockedPendingScreening: 'En attente de filtrage',
      underReviewMessage: 'Notre équipe examine votre biographie. Vous serez informé du résultat.',
      untitledBiography: 'Biographie sans titre',
      goToWorkspace: 'Aller au Workspace',
      continueLastSection: 'Continuer Dernière Section',
      updateAvailabilityMessage: 'Vous pouvez ajouter un nouveau chapitre à votre biographie une fois par an, pour raconter ce qui a changé dans votre vie.',
      oneBiographyLimit: 'Vous avez déjà une biographie. Chaque compte est limité à une biographie pour préserver la qualité.',
      nextChapterAvailableNow: 'Vous pouvez ajouter un nouveau chapitre à votre biographie.',
      nextChapterAvailableOn: 'Prochain chapitre disponible le {date}.',
      nextChapterCooldownDays: 'Encore {days} jours avant le prochain chapitre.',
      chapterCooldownBlocked: 'Vous pouvez publier un nouveau chapitre un an après votre dernière publication.',
    },
    biography: {
      newBiography: 'Nouvelle Biographie',
      biographyTitle: 'Titre de la Biographie',
      titlePlaceholder: 'ex., Mon histoire — vous pourrez modifier le titre plus tard',
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
      aiTimeout: "L'IA prend trop de temps. Veuillez réessayer.",
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
      privacyLabel: 'Confidentialité',
      subjectNameLabel: 'Nom du protagoniste',
      subjectNamePlaceholder: 'ex., Francesco Brignole',
      writerNameLabel: 'Nom de l\u2019auteur',
      writerNamePlaceholder: 'Votre nom en tant qu\u2019auteur',
      writtenBy: 'Écrit par',
      memorialDetailsSubtitle: 'De qui parle cette biographie et qui l\u2019écrit ?',
      addAuthorName: 'Ajouter le nom de l\u2019auteur…',
    },
    writingModeOnboarding: {
      stepTitle: 'Comment souhaitez-vous écrire?',
      stepSubtitle: 'Choisissez comment démarrer votre biographie. Vous pourrez toujours exporter et réimporter votre contenu ultérieurement.',
      writeHereTitle: 'Écrire sur Biography Library',
      writeHereDescription: 'Composez votre biographie directement ici. Nous vous guiderons à travers les chapitres, ou vous pouvez écrire librement.',
      guidedChaptersLabel: 'Guidez-moi à travers les chapitres',
      guidedChaptersDescription: 'Approche structurée : enfance, famille, éducation, carrière et plus — un chapitre à la fois.',
      freewritingLabel: "J'écris librement",
      freewritingDescription: 'Écriture libre. Pas de structure fixe. Écrivez ou dictez dans votre propre style.',
      importTitle: 'Importer un texte existant',
      importDescription: 'Vous avez déjà une biographie écrite ou un document. Importez-le et utilisez Biography Library comme archive.',
      continueButton: 'Commencer à Écrire',
      backButton: 'Retour',
    },
    modeSwitchWarning: {
      step1Title: 'Attention : changer de mode supprimera votre contenu actuel',
      step1Message: 'Si vous passez de {from} à {to}, tout le texte que vous avez écrit en {from} sera définitivement supprimé. Cette action est irréversible.',
      step1Confirm: "Je comprends, continuer",
      step2Title: 'Exportez votre contenu avant de changer',
      step2Message: 'Avant de supprimer votre contenu en {from}, nous vous recommandons vivement de l\'exporter. Vous pourrez ensuite le réimporter dans le nouveau mode.',
      step2ExportButton: 'Exporter mon contenu maintenant (.txt et .docx)',
      step2SkipButton: "J'ai déjà une copie, ignorer l'exportation",
      step2Exporting: 'Exportation en cours...',
      step3Title: 'Supprimer définitivement le contenu en {from}?',
      step3Message: 'Vous êtes sur le point de supprimer définitivement tout votre contenu en {from}. Cela ne peut pas être récupéré.',
      step3Checkbox: 'Je comprends que mon contenu sera supprimé et que cela ne peut pas être annulé.',
      step3Confirm: 'Supprimer et changer de mode',
      step3Cancel: 'Conserver mon contenu, revenir en arrière',
      step3Deleting: 'Suppression en cours...',
      fromSections: 'sections',
      fromFreeflow: 'écriture libre',
      toSections: 'sections',
      toFreeflow: 'écriture libre',
      goBack: 'Revenir en arrière',
    },
    exportDialog: {
      title: 'Exporter la Biographie',
      description: 'Choisissez le format et les sections à exporter',
      pdfNotice: "L'exportation en PDF n'est disponible qu'une fois la biographie terminée et approuvée. Vous pouvez exporter aux formats TXT, RTF et DOCX en attendant.",
      formatLabel: "Format d'exportation",
      contentLabel: 'Sélection du contenu',
      allSections: 'Biographie complète (toutes les sections)',
      completedSections: 'Sections terminées uniquement',
      customSections: 'Sélectionner des sections spécifiques',
      additionalOptions: 'Options supplémentaires',
      separateFiles: 'Diviser en fichiers séparés par section (archive .zip)',
      includeMetadata: 'Inclure les métadonnées (date de création, dernière modification)',
      includeNotesTodos: 'Inclure les notes et rappels',
      cancel: 'Annuler',
      export: 'Exporter',
      exporting: 'Exportation...',
      noSectionsError: 'Aucune section à exporter.',
      exportError: "Erreur lors de l'exportation. Réessayez.",
      fontLoadError: "Police non disponible — export annulé. Rechargez la page et réessayez.",
      pdfFormat: 'PDF - Document complet formaté',
      pdfB5Standard: 'PDF B5 (176×250mm)',
      txtFormat: 'TXT - Texte brut sans mise en forme',
      rtfFormat: 'RTF - Texte avec mise en forme de base',
      docxFormat: 'DOCX - Document Word',
      emptySection: '(vide)',
      createdWith: 'Créé avec Biography Library',
      allRightsReserved: '© {year} tous droits réservés',
      preface: 'Préface',
      epilogue: 'Épilogue',
      acknowledgements: 'Remerciements',
      specificCredits: 'Crédits',
      backCoverDescription:
        'Cette biographie a été gérée avec Biography Library, l’archive numérique de la mémoire humaine qui offre librement les outils pour créer et préserver votre propre histoire ou celle d’un proche.',
      backCoverPropertyStatement:
        "Le texte de cette biographie est la propriété exclusive de l’auteur, qui conserve tous les droits pour agir contre toute utilisation non autorisée, y compris l’usage à des fins d’entraînement d’IA.",
      backCoverAiStatement:
        "Biography Library interdit l’utilisation des contenus hébergés sur ses serveurs pour le text mining, l’entraînement d’IA ou le machine learning, conformément à la Loi suisse sur le droit d’auteur (LDA) et au droit d’usage exclusif de l’auteur en droit suisse.",
      backCoverFooter: 'Biography Library · biographylibrary.org',
      noCoverPhotoWarning: 'Une photo de couverture est requise pour générer le PDF. Importez une photo et marquez-la comme couverture dans la section Photos.',
      pdfDraftNotice: 'Il s\'agit d\'un PDF de brouillon. Il reflète l\'état actuel de votre biographie et vous permet de vérifier la mise en page et le contenu avant de soumettre pour révision.',
      draftIterationNone: 'Aucun PDF de brouillon généré pour l\'instant. L\'exportation créera votre premier brouillon.',
      draftIterationCurrent: 'Brouillon {n} déjà généré. L\'exportation créera le brouillon {next}.',
      draftIterationWarning: 'Vous avez déjà généré {n} brouillons PDF. Pensez à soumettre bientôt pour révision.',
      draftLimitReached: 'Vous avez atteint le nombre maximum de brouillons PDF pour cette biographie. Soumettez pour révision avant d\'en générer d\'autres.',
      draftPhaseRequiredBeforeDraft:
        'Démarrez la phase de révision PDF depuis l’éditeur (Démarrer la révision PDF) avant de télécharger des brouillons filigranés.',
      finalDraftConfirmTitle: 'Générer le Troisième et Dernier Brouillon',
      finalDraftConfirmDescription: 'Il s\'agit de votre troisième et dernier brouillon. Aucune révision supplémentaire ne sera autorisée après cette exportation. Assurez-vous que votre biographie est prête avant de continuer.',
      draftAiReviewTitle: 'Révision IA du brouillon',
      draftAiQuality: 'Qualité : {n}/5',
      draftAiUnavailable: 'Révision IA indisponible. Vous pouvez tout de même soumettre à publication.',
      draftAiSeverity3Block: 'Ce brouillon contient du contenu susceptible de bloquer la publication. Veuillez le relire avant de continuer.',
      draftAiStrengths: 'Points forts',
      draftAiSuggestions: 'Suggestions',
      draftAiSuggestionNarrative: 'Narratif',
      draftAiSuggestionCompleteness: 'Complétude',
      draftAiSuggestionClarity: 'Clarté',
      draftAiSuggestionStyle: 'Style',
      draftAiFeedbackUnavailable: 'Retour IA du brouillon indisponible pour cet export.',
    },
    sectionTitles: {
      childhood: 'Enfance et Premières Années',
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
      publishedChapterNotice: 'Ce chapitre est publié et ne peut pas être modifié.',
      freeFlowTab: 'Texte libre',
      sectionsTab: 'Sections',
      freeFlowReadOnly: 'Texte libre (lecture seule)',
      importFreeFlowHint: 'Vous importez une biographie écrite ailleurs ? Choisissez Texte libre. Vous pourrez copier les sections manuellement ensuite.\nVous importez une section depuis un export Biography Library ? Collez uniquement le texte de cette section et choisissez où l\'enregistrer.',
      importSaveTo: 'Enregistrer dans',
      importDestinationFreeFlow: 'Texte libre',
      importFieldNotEmpty: 'Ce champ contient déjà du texte. Que souhaitez-vous faire ?',
      importReplace: 'Remplacer',
      importAddAtEnd: 'Ajouter à la fin',
      exportModeFreeFlow: 'Export en mode Texte libre — les sections ne seront pas incluses.',
      exportModeSections: 'Export en mode Sections — le texte libre ne sera pas inclus.',
      bookStructureTitle: 'Structure du livre',
      bookStructureAuthorCopyrightPage:
        'Inclure une courte page de crédits auteur avant le titre (PDF). Le texte légal complet reste en quatrième de couverture.',
      bookStructureFrontMatter: 'Pages liminaires',
      bookStructureBackMatter: 'Pages annexes',
      bookStructureDedication: 'Dédicace',
      bookStructureEpigraph: 'Épigraphe',
      bookStructureEpigraphQuote: 'Citation',
      bookStructureEpigraphSource: 'Attribution',
      bookStructurePreface: 'Préface / Incipit',
      bookStructureEpilogue: 'Épilogue',
      bookStructureAcknowledgements: 'Remerciements',
      bookStructureCredits: 'Crédits spécifiques',
      bookStructureDedicationPlaceholder: 'Ex. «À ma mère»',
      bookStructureEpigraphQuotePlaceholder: 'Texte de la citation…',
      bookStructureEpigraphSourcePlaceholder: 'Auteur, source…',
      bookStructurePrefacePlaceholder: 'Rédigez la préface…',
      bookStructureEpiloguePlaceholder: 'Rédigez l\'épilogue…',
      bookStructureAcknowledgementsPlaceholder: 'Rédigez les remerciements…',
      bookStructureCreditPlaceholder: 'Crédits spécifiques…',
      importNoticeSectionsMode: 'Vous êtes en mode Sections — le texte sera importé dans la section actuellement sélectionnée. Pour importer dans un autre chapitre, sélectionnez-le d\'abord dans la barre latérale. Pour importer une biographie complète rédigée ailleurs en un seul bloc, passez en mode Texte libre avant d\'importer.',
      importNoticeFreeflowMode: 'Vous êtes en mode Texte libre — idéal pour importer un texte rédigé en dehors de Biography Library. Choisissez de remplacer votre contenu actuel ou d\'ajouter le texte importé à la fin. Si vous préférez une approche guidée chapitre par chapitre, passez en mode Sections avant d\'importer.',
      importFreeFlowReplace: 'Remplacer tout le contenu existant',
      importFreeFlowAppend: 'Ajouter à la fin du contenu existant',
      bookStructureMainText: 'Texte principal',
      bookStructureImportText: 'Importer le texte',
      bookStructureImportTitle: 'Importer le texte principal',
      bookStructureImportDescription: 'Collez votre texte ou téléchargez un fichier .txt. Cela remplacera le contenu principal actuel.',
      bookStructureImportPaste: 'Coller le texte',
      bookStructureImportPastePlaceholder: 'Collez votre texte ici…',
      bookStructureImportOrFile: 'ou télécharger un fichier',
      bookStructureImportSelectFile: 'Sélectionner un fichier .txt',
      bookStructureImportConfirm: 'Importer',
      bookStructureImportReplaceWarning: 'Le texte principal contient déjà du contenu. L\'importation le remplacera. Êtes-vous sûr ?',
      bookStructureImportReplace: 'Oui, remplacer',
      bookStructureImportCancel: 'Annuler',
      noChaptersWarning: 'Aucun chapitre défini. Le livre sera un texte continu sans coupure de chapitre. Pour ajouter des chapitres, passez en mode Sections.',
      revisionRequired: 'Révision requise. Le réviseur a signalé ce qui suit :',
      revisionRequiredAiScreening:
        'Le filtrage automatique a signalé les passages ci-dessous. Modifiez ces parties ou la version finale complète, puis renvoyez au filtrage lorsque vous êtes prêt.',
      aiScreeningFlaggedEditHint:
        'Vous pouvez modifier uniquement les sections listées ou le texte final complet ; un réviseur vérifiera tout de même le signalement.',
      resubmitAiScreening: 'Renvoyer au filtrage',
      resubmitAiScreeningPublishedToast: 'Filtrage réussi — votre biographie est en ligne.',
      resubmitAiScreeningStillFlaggedToast: 'Des passages sont encore signalés. La liste ci-dessous est à jour.',
      resubmitAiScreeningErrorToast: 'Le filtrage automatique n’a pas abouti. Réessayez dans quelques minutes ou attendez un modérateur.',
      revisionFlaggedPassages: 'Passages signalés',
      revisionReviewerNote: 'Note du réviseur',
      revisionDismiss: 'Fermer',
      publicationStartPdfButton: 'Démarrer la révision PDF',
      publicationPdfDraftHint:
        'Téléchargez jusqu’à trois PDF filigranés depuis Exporter, puis approuvez la version finale pour lancer le filtrage automatique.',
      publicationApproveFinalButton: 'Approuver le PDF final et lancer le filtrage',
      publicationExportPdf: 'Exporter PDF',
      publicationLegacySubmitHint:
        'Pour le parcours prêt à l’impression (brouillons PDF → filtrage automatique), utilisez d’abord « Révision finale avec IA », puis Démarrer la révision PDF. Vous pouvez encore soumettre ici pour un contrôle plus rapide sans phase PDF.',
      reviewPublication: {
        menuItem: 'Révision et publication',
        title: 'Révision et publication',
        description:
          'Complétez le parcours de révision et publiez votre biographie avec un export PDF prêt à l’impression.',
        incompleteMessage:
          'Avant de lancer la révision et la publication, complétez chaque chapitre dans la barre latérale. Chaque section doit contenir votre texte et être marquée comme terminée.',
        freeflowEmptyHint:
          'Ajoutez le texte de votre biographie dans l’éditeur avant de lancer la révision et la publication.',
        statusUnderReview: 'En révision',
        statusLockedPendingScreening: 'Filtrage en cours',
        underReviewHint:
          'Votre biographie est en cours de révision. Revenez ici une fois terminé pour continuer avec l’export PDF.',
        lockedPendingScreeningHint:
          'Votre PDF final a été approuvé et le filtrage automatique est en cours. Vous serez notifié à la fin.',
        screeningPendingHint: 'Analyse automatique du texte en cours…',
        revisionFlaggedHint:
          'Certains passages ont été signalés. Modifiez les sections concernées dans l’éditeur, puis renvoyez pour le filtrage lorsque vous êtes prêt.',
        stepAiReviewTitle: 'Facultatif : révision narrative IA',
        stepAiReviewDesc:
          'Explorez des ordres de chapitres alternatifs et des structures narratives suggérées par l’IA avant l’envoi.',
        stepAiReviewButton: 'Ouvrir la révision finale IA',
        stepFreeflowPrepareTitle: 'Préparer le texte final pour le PDF',
        stepFreeflowPrepareDesc:
          'Verrouillez votre texte en flux libre comme version finale pour démarrer les brouillons PDF filigranés.',
        stepFreeflowPrepareButton: 'Préparer le texte final',
        stepSubmitTitle: 'Envoi rapide (legacy)',
        stepSubmitDesc:
          'Ignorez la phase brouillon PDF et envoyez directement au filtrage automatique. Pour des PDF prêts à imprimer, utilisez d’abord les étapes ci-dessus.',
        stepSubmitButton: 'Soumettre pour révision',
        stepPdfDraftTitle: 'Démarrer la révision PDF',
        stepPdfDraftDesc:
          'Générez des brouillons PDF filigranés, vérifiez la mise en page et la couverture, puis approuvez la version finale.',
        stepPdfDraftButton: 'Démarrer la révision PDF',
        stepExportTitle: 'Exporter le brouillon PDF',
        stepExportDesc: 'Téléchargez et prévisualisez votre brouillon PDF filigrané avant l’approbation finale.',
        stepExportButton: 'Ouvrir l’export',
        stepApproveTitle: 'Approuver le PDF final',
        stepApproveDesc: 'Confirmez que le PDF est prêt et lancez le filtrage automatique du contenu.',
        stepApproveButton: 'Approuver et lancer le filtrage',
        approveDisabledHint:
          'Exportez au moins un brouillon PDF filigrané avant d’approuver. Ouvrez Export pour générer votre premier brouillon.',
        approveAiPendingHint:
          'Attendez la fin de la révision IA du brouillon après l’export, ou exportez un nouveau brouillon si nécessaire.',
        approveAiSuggestionsHint:
          'L’IA a suggéré des améliorations dans Export. Vous pouvez tout de même approuver si ce brouillon vous convient.',
        severity3BlockHint:
          'Ce brouillon contient des problèmes critiques signalés par l’IA. Consultez les retours et exportez un nouveau brouillon avant d’approuver.',
        publishedTitle: 'Publiée',
        publishedDesc: 'Votre biographie a passé le filtrage. Vous pouvez exporter le PDF final à tout moment.',
        draftProgress: 'Brouillons générés : {count}',
      },
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
      markIncomplete: 'Rouvrir pour modifier',
      sectionCompletedHint: 'Cette section est marquée comme terminée. Cliquez sur « Rouvrir pour modifier » pour la modifier à nouveau.',
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
      microphoneDenied: 'Acc\u00e8s au microphone refus\u00e9.',
      noSpeechDetected: 'Aucune parole d\u00e9tect\u00e9e. R\u00e9essayez.',
      voiceNetworkError: 'Erreur r\u00e9seau. V\u00e9rifiez votre connexion.',
      voiceServiceUnavailable: 'Service vocal indisponible.',
      microphoneNotFound: 'Aucun microphone trouv\u00e9.',
      voiceUnknownError: 'Erreur de reconnaissance vocale. R\u00e9essayez.',
      voiceNotSupported: 'La saisie vocale n\'est pas support\u00e9e dans ce navigateur. Essayez Chrome ou Edge.',
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
      downloadRtf: 'T\u00e9l\u00e9charger RTF',
      downloadTxt: 'T\u00e9l\u00e9charger TXT',
      downloadDocx: 'T\u00e9l\u00e9charger DOCX',
      by: 'Par',
      writtenBy: 'Écrit par',
      preservingStories: 'Parce que chaque vie mérite d\'être rappelée',
      tokenMissing: 'Jeton d\'acc\u00e8s manquant',
      notFoundOrDenied: 'Biographie introuvable ou acc\u00e8s refus\u00e9',
      biographyPrivate: 'Cette biographie est priv\u00e9e',
      archivedBanner: 'Cette biographie a \u00e9t\u00e9 archiv\u00e9e.',
      publishedOn: 'Publi\u00e9',
      reportButton: 'Signaler',
      reportModalTitle: 'Signaler cette biographie',
      reportModalSubtitle: 'Aidez-nous \u00e0 maintenir la biblioth\u00e8que s\u00fbre et exacte.',
      reportTypeLabel: 'Motif du signalement',
      reportTypePlaceholder: 'S\u00e9lectionnez un motif...',
      reportDescriptionLabel: 'D\u00e9tails suppl\u00e9mentaires (facultatif)',
      reportDescriptionPlaceholder: 'Fournissez tout contexte suppl\u00e9mentaire...',
      reportSubmit: 'Envoyer le signalement',
      reportSubmitting: 'Envoi en cours...',
      reportSuccess: 'Signalement re\u00e7u. Notre \u00e9quipe l\u2019examinera.',
      reportError: 'Une erreur s\'est produite. Veuillez r\u00e9essayer.',
      reportTypeLevel1: 'Contenu nuisible ou ill\u00e9gal',
      reportTypeLevel2: 'Discours haineux ou harc\u00e8lement',
      reportTypeLivingPerson: 'Cette personne est vivante',
      reportTypeRightToOblivion: 'Supprimer mes donn\u00e9es personnelles',
      reportTypeImpersonation: 'Fausse identit\u00e9',
      reportTypeCopyright: 'Violation du droit d\'auteur',
      reportTypeOther: 'Autre',
      writtenIn: 'Écrite en {language}',
      contentRightsNoticeAriaLabel: 'Avis de droit d\'auteur et d\'usage IA',
      contentRightsNoticeParagraph1:
        'Le texte de cette biographie est la propriété exclusive de l\'auteur, qui conserve tout droit d\'agir contre toute utilisation non autorisée, y compris pour l\'entraînement de systèmes d\'intelligence artificielle.',
      contentRightsNoticeParagraph2:
        'Biography Library interdit l\'utilisation des contenus hébergés sur ses serveurs pour le text mining, l\'entraînement IA ou le machine learning, conformément à la loi suisse sur le droit d\'auteur (LDA) et au droit exclusif d\'usage de l\'auteur prévu par le droit suisse.',
      pdfOriginalLanguage: 'PDF, TXT et DOCX disponibles uniquement dans la langue originale ({language})',
      downloadsUnavailable:
        'Les téléchargements Word et texte brut ne sont pas disponibles pour cette biographie. Vous pouvez toujours utiliser le bouton PDF ci-dessus.',
      languageSwitcher: 'Langue de lecture',
      showOriginal: 'Original',
      readInLanguage: 'Lire en {language}',
      translating: 'Traduction en cours…',
      translationFailed: 'Échec de la traduction. Veuillez réessayer.',
      languageNameEn: 'anglais',
      languageNameIt: 'italien',
      languageNameFr: 'français',
      languageNameDe: 'allemand',
      galleryPhotos: 'Photos',
      galleryLightboxTitle: 'Galerie photos',
      galleryLightboxPrevious: 'Photo précédente',
      galleryLightboxNext: 'Photo suivante',
      galleryPhotoCounter: 'Photo {current} sur {total}',
      galleryOpenPhoto: 'Voir la photo : {caption}',
    },
    footer: {
      hostedInSwitzerland: 'Biography Library - H\u00e9berg\u00e9 en Suisse',
      termsOfService: 'T&C',
      privacyPolicy: 'Confidentialit\u00e9',
      cookiePolicy: 'Cookies',
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
      checkingContent: 'V\u00e9rification des r\u00e8gles de contenu...',
      publishBlocked: 'Publication bloqu\u00e9e. Cette biographie contient du contenu qui enfreint nos r\u00e8gles.',
      publishUnderReview: 'Votre biographie a \u00e9t\u00e9 envoy\u00e9e pour examen. Vous serez inform\u00e9 du r\u00e9sultat.',
      tooManyRequests: 'Trop de tentatives. Attendez une minute et r\u00e9essayez.',
      requestFailed: 'Une erreur s\'est produite. Veuillez r\u00e9essayer.',
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
      conversationPending: 'Vous avez une session en cours. Continuer?',
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
      reviewPeriodTitle: 'Publication et signalements',
      reviewPeriodText:
        'Une fois publi\u00e9e, la biographie comm\u00e9morative est visible selon la visibilit\u00e9 choisie (priv\u00e9e, lien uniquement ou publique). Tout lecteur peut signaler un probl\u00e8me ; notre \u00e9quipe de mod\u00e9ration examine les signalements et peut intervenir si n\u00e9cessaire.',
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
      titleFreeflow: 'Importer du texte',
      titleWithSection: 'Importer du texte dans {sectionName}',
      titleNoSection: 'Importer du texte dans la section',
      description: 'Téléchargez un fichier ou collez le texte à importer',
      dragFile: 'Glissez un fichier ici ou cliquez pour sélectionner',
      dragFileHint: 'Format supporté : .txt (max 5MB)',
      formats: 'Formats supportés : .txt, .docx, .rtf (max 5 Mo chacun, jusqu\'à 10 fichiers)',
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
      fileTooLarge: 'Fichier trop volumineux. Taille maximale : 5 Mo',
      docUnsupported: 'Format .doc non pris en charge. Convertissez en .docx ou .txt',
      formatUnsupported: 'Format non pris en charge. Utilisez .txt, .docx ou .rtf',
      tooManyFiles: 'Trop de fichiers. Maximum 10 par importation',
      filesQueued: '{count} fichier(s) prêt(s) à importer',
    },
    importMapping: {
      title: 'Associer les chapitres aux sections',
      description: 'Vérifiez comment les chapitres importés seront placés dans les sections de la biographie.',
      suggestAi: 'Suggérer avec l\'IA',
      aiError: 'Échec de la suggestion IA. Choisissez une section manuellement.',
      sourceAi: 'Suggéré par l\'IA',
      sourceTitle: 'Correspondance titre',
      sourceManual: 'Manuel',
      confidenceHigh: 'Haute confiance',
      confidenceMedium: 'Confiance moyenne',
      confidenceLow: 'Faible confiance',
      skipBlock: 'Ignorer',
      confirmImport: 'Confirmer l\'importation',
      reviewRequired: 'Certains blocs ont une faible confiance. Vérifiez avant d\'importer.',
      untitledBlock: 'Bloc sans titre',
    },
    notesAndTodos: {
      title: 'Notes et Rappels',
      recordAudio: 'Enregistrer audio',
      importText: 'Importer texte',
      exportText: 'Exporter texte',
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
      editTodo: 'Modifier',
      deleteTodo: 'Supprimer',
      confirmDelete: 'Confirmer la suppression',
      confirmDeleteNote: 'Supprimer cette note ? Cette action est irréversible.',
      confirmDeleteTodo: 'Supprimer ce rappel ? Cette action est irréversible.',
      sortBy: 'Trier par',
      sortByDate: 'Date d\'ajout',
      sortByPriority: 'Priorité',
      sortByDueDate: 'Date d\'échéance',
      globalTitle: 'Notes et Rappels',
      notesAndTodosMenuItem: 'Notes et Rappels',
    },
    aiReview: {
      title: 'Révision IA de la Section',
      reviewButton: 'Réviser',
      suggestionsTab: 'Suggestions',
      rewriteTab: 'Réécriture Complète',
      rewriteDesc: 'Une révision qui améliore la fluidité entre les passages, en conservant tous les faits et votre voix.',
      rewriteVersionLabel: 'Version {n}',
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
      appliedRewrite: 'Révision appliquée à la section',
      apertusButton: 'Relecture avec IA suisse',
      apertusTitle: 'Relecture avec IA suisse',
      apertusSubtitle: 'Retour éditorial sur « {section} » via Apertus (IA open source suisse)',
      apertusLoading: 'Apertus lit votre section…',
      apertusError: 'Relecture avec IA suisse indisponible. Réessayez plus tard.',
      apertusModelNote: 'Modèle : {model}',
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
      successToastBio: 'Votre biographie a été supprimée.',
      errorDeleteBio: 'Échec de la suppression de la biographie. Veuillez réessayer.',
      successMessageAccount: 'Votre compte a été supprimé',
    },
    aiUsage: {
      dailyLimit: '40 actions/jour',
      weeklyLimit: '150 actions/semaine',
      dailyLimitReached: 'Limite quotidienne IA atteinte',
      weeklyLimitReached: 'Limite hebdomadaire IA atteinte',
      dailyLimitDetail: 'Vous avez utilisé vos 40 actions IA pour aujourd\'hui. La limite se réinitialise à minuit UTC.',
      weeklyLimitDetail: 'Vous avez utilisé vos 150 actions IA pour cette semaine. La limite se réinitialise le lundi.',
      resetsAt: 'Réinitialisation à',
      today: 'Aujourd\'hui',
      thisWeek: 'Cette semaine',
      usageIndicatorTitle: 'Utilisation IA',
      unlimited: 'Illimité',
    },
    photos: {
      panelTitle: 'Photos',
      counter: '{count}/{max} photos',
      uploadButton: 'Télécharger une photo',
      captionPlaceholder: 'Ajouter une légende...',
      layoutLabel: 'Mise en page',
      layoutFullPage: 'Pleine page',
      layoutCover: 'Couverture',
      layoutTwoVertical: 'Deux photos — empilées',
      layoutTwoHorizontal: 'Deux photos — empilées (paire)',
      layoutThreeMixed: 'Trois photos — large en haut, deux en bas',
      coverCompositeTitle: 'Photo de couverture (carte titre)',
      customA5CoverLabel: 'Couverture personnalisée A5 (176×250mm)',
      customA5CoverHint:
        'Téléchargez une image déjà mise en page au format A5 (176×250mm, 300dpi recommandés). Si les proportions diffèrent, l’image sera adaptée.',
      galleryPhotosHeading: 'Galerie photos',
      deleteButton: 'Supprimer la photo',
      deleteConfirmTitle: 'Supprimer la photo',
      deleteConfirmMessage: 'Êtes-vous sûr de vouloir supprimer cette photo ? Cette action est irréversible.',
      uploadProgress: 'Téléchargement...',
      fileTooLarge: 'Fichier trop volumineux. La taille maximale est de 5 Mo.',
      invalidFileType: 'Type de fichier invalide. Veuillez télécharger une image JPG, PNG ou WEBP.',
      uploadError: 'Échec du téléchargement. Veuillez réessayer.',
      limitReached: 'Vous avez atteint le maximum de {max} photos par biographie.',
      deleteError: 'Échec de la suppression. Veuillez réessayer.',
      viewGrid: 'Vue miniatures',
      viewDetail: 'Vue détaillée',
      gridEditHint: 'Glissez pour réordonner. Cliquez sur une photo pour la légende et la mise en page.',
    },
    admin: {
      freezeBiography: 'Geler la biographie',
      freezeConfirmTitle: 'Geler cette biographie ?',
      freezeConfirmMessage: 'Cette action rendra la biographie entièrement en lecture seule pour l\'auteur. Elle ne peut pas être annulée depuis l\'éditeur.',
      freezing: 'Gel en cours...',
      frozenBannerTitle: 'Cette biographie a été gelée',
      frozenBannerMessage: 'Cette biographie est en lecture seule et ne peut pas être modifiée.',
      moderationTitle: 'Modération',
      moderationSubtitle: 'Signalements utilisateurs et contenus signal\u00e9s — pour la r\u00e9vision IA de l\u2019auteur, voir R\u00e9vision',
      moderationUnassignedBadge: 'non assignés',
      filterStatus: 'Statut',
      filterType: 'Type',
      filterSort: 'Trier',
      filterAll: 'Tous',
      statusUnassigned: 'Non assigné',
      statusAssigned: 'Assigné',
      statusInReview: 'En révision',
      statusDecided: 'Décidé',
      sortNewest: 'Plus récents',
      sortOldest: 'Plus anciens',
      typeLevel1: 'Niveau 1 – Bloqué',
      typeLevel2: 'Niveau 2 – Révision',
      typeLevel3: 'Niveau 3 – Avertissement',
      typeUserReport: 'Signalement utilisateur',
      typeLivingPerson: 'Personne vivante',
      typeRightToOblivion: 'Droit à l\'oubli',
      typeImpersonation: 'Usurpation d\'identité',
      typeCopyright: 'Droits d\'auteur',
      typeOther: 'Autre',
      colDate: 'Date',
      colType: 'Type',
      colBiography: 'Biographie',
      colStatus: 'Statut',
      colAiSummary: 'Résumé IA',
      colActions: 'Actions',
      actionOpen: 'Ouvrir',
      noReports: 'Aucun signalement trouvé.',
      loadingReports: 'Chargement des signalements…',
      errorLoading: 'Impossible de charger les signalements.',
      unknownBiography: 'Biographie sans titre',
      unknownAuthor: 'Auteur inconnu',
      aiNoSummary: 'Aucun résumé disponible',
      panelBiographyInfo: 'Biographie',
      panelReportInfo: 'Détails du signalement',
      panelActions: 'Actions du modérateur',
      panelInternalNotes: 'Notes internes',
      viewBiography: 'Voir la biographie',
      biographyStatus: 'Statut',
      aiViolationLevel: 'Niveau de violation IA',
      aiSummaryFull: 'Résumé de l\'analyse IA',
      flaggedPassages: 'Passages signalés',
      flaggedPassageReason: 'Raison',
      flaggedPassageLevel: 'Niveau',
      reporterEmail: 'Signalé par',
      reporterReason: 'Catégorie de raison',
      reporterDetails: 'Détails',
      userReportDetails: 'Détail du signalement',
      noReportDescription: 'Aucun détail supplémentaire.',
      reportedAt: 'Signalé le',
      noFlaggedPassages: 'Aucun passage signalé.',
      reportLockedByOther: 'Ce signalement est en cours de révision par {name}.',
      reportLockedByOtherFallback: 'un autre modérateur',
      moderationConflictError: 'Un autre modérateur a soumis une décision pendant votre révision. Veuillez recharger.',
      moderationActionError: 'Impossible de terminer l\'action de modération.',
      moderationReaderReportHint: 'Les signalements lecteurs ne dépublient pas la biographie. Elle reste visible jusqu\'à ce que vous la geliez ou la supprimiez.',
      dismissReportKeepPublished: 'Classer le signalement (rester publiée)',
      confirmDismissReport: 'Classer ce signalement ?',
      confirmDismissReportDetail: 'La biographie reste publiée. L\'auteur ne sera pas notifié.',
      notifyReportDismissed: 'Un signalement sur votre biographie a été examiné et classé.',
      freezeAndNotifyAuthor: 'Geler et notifier l\'auteur',
      confirmFreezeAndNotify: 'Geler et notifier l\'auteur ?',
      confirmFreezeAndNotifyDetail: 'La biographie reste publiée mais devient en lecture seule pour l\'auteur. Votre message sera envoyé.',
      notifyFrozenFromReport: 'Votre biographie a été gelée suite à un signalement. Consultez vos notifications.',
      moderationFreezeWhileReviewingDetail: 'La biographie devient en lecture seule pour l\'auteur et le signalement est clos.',
      takeOwnership: 'Prendre en charge',
      takingOwnership: 'Prise en charge…',
      approveAndPublish: 'Approuver et publier',
      publishWithWarning: 'Publier avec avertissement',
      returnToAuthor: 'Retourner à l\'auteur',
      removeBiography: 'Supprimer la biographie',
      messageToAuthor: 'Message à l\'auteur',
      messageToAuthorPlaceholder: 'Expliquez ce qui doit être corrigé…',
      confirmApprove: 'Approuver et publier ?',
      confirmApproveDetail: 'La biographie sera publiée et l\'auteur sera notifié.',
      confirmPublishWarning: 'Publier avec avertissement ?',
      confirmPublishWarningDetail: 'La biographie sera publiée mais l\'auteur recevra un rappel sur les directives de contenu.',
      confirmReturn: 'Retourner à l\'auteur ?',
      confirmReturnDetail: 'La biographie repassera en brouillon et l\'auteur recevra votre message.',
      confirmRemove: 'Supprimer la biographie ?',
      confirmRemoveDetail: 'Cela supprimera définitivement la biographie. L\'auteur sera notifié. Action irréversible.',
      confirmAction: 'Confirmer',
      cancelAction: 'Annuler',
      internalNotesPlaceholder: 'Ajouter des notes internes (non visibles aux utilisateurs)…',
      saveNotes: 'Enregistrer les notes',
      savingNotes: 'Enregistrement…',
      notesSaved: 'Notes enregistrées',
      notifyPublished: 'Votre biographie a été examinée et publiée.',
      notifyPublishedWarning: 'Votre biographie a été publiée. Veuillez consulter nos directives de contenu.',
      notifyReturned: 'Votre biographie a été retournée pour révision.',
      notifyRemoved: 'Votre biographie a été supprimée pour violation de nos directives de contenu.',
      assignedToYou: 'Assigné à vous',
      assignedToOther: 'Assigné à un autre réviseur',
      usersTitle: 'Gestion des utilisateurs',
      usersSubtitle: 'Gérer les rôles et les comptes utilisateurs',
      usersNavLink: 'Utilisateurs',
      usersSearchPlaceholder: 'Rechercher par nom ou email…',
      usersColAvatar: 'Avatar',
      usersColName: 'Nom',
      usersColEmail: 'Email',
      usersColRole: 'Rôle',
      usersColJoined: 'Inscrit',
      usersColBiographies: 'Biographies',
      usersColActions: 'Actions',
      usersSaveRole: 'Enregistrer le rôle',
      usersRoleUser: 'Utilisateur',
      usersRoleReviewer: 'Réviseur',
      usersRoleAdmin: 'Admin',
      usersRoleSuperAdmin: 'Super Admin',
      usersChangeRoleTitle: 'Changer le rôle',
      usersChangeRoleMessage: "Changer le rôle de {name} de {old} à {new} ?",
      usersChangeRoleFrom: 'de',
      usersChangeRoleTo: 'à',
      usersRoleUpdated: 'Rôle mis à jour avec succès',
      usersCannotChangeSelf: 'Vous ne pouvez pas modifier votre propre rôle.',
      usersCannotChangeSelfTooltip: 'Vous ne pouvez pas modifier votre propre rôle',
      usersPrev: 'Précédent',
      usersNext: 'Suivant',
      usersPageOf: 'sur',
      usersAccessDenied: 'Accès Refusé',
      usersAccessDeniedMessage: 'Cette page est réservée aux super administrateurs.',
      usersPageRestrictedToAdmins: 'Cette page est réservée aux administrateurs.',
      usersRedirectingIn: 'Redirection dans',
      usersLoadError: 'Impossible de charger les utilisateurs.',
      usersColStatus: 'Compte',
      usersStatusActive: 'Actif',
      usersStatusSuspended: 'Suspendu',
      usersSuspend: 'Suspendre',
      usersReinstate: 'Réactiver',
      usersDeleteUser: 'Supprimer l’utilisateur',
      usersConfirmSuspendTitle: 'Suspendre ce compte ?',
      usersConfirmSuspendDetail:
        'L’utilisateur sera déconnecté, ne pourra pas se connecter et sa biographie publique sera masquée. Un e-mail sera envoyé.',
      usersConfirmReinstateTitle: 'Réactiver ce compte ?',
      usersConfirmReinstateDetail: 'L’utilisateur pourra à nouveau se connecter. Un e-mail sera envoyé.',
      usersConfirmDeleteTitle: 'Supprimer définitivement cet utilisateur ?',
      usersConfirmDeleteDetail:
        'Le compte et les données associées seront supprimés. Action irréversible. Un e-mail sera envoyé.',
      usersToastSuspended: 'Compte suspendu.',
      usersToastReinstated: 'Compte réactivé.',
      usersToastDeleted: 'Utilisateur supprimé.',
      usersActionFailed: 'Action impossible. Réessayez.',
      usersReviewerLanguages: 'Langues de révision',
      usersReviewerLanguagesSaved: 'Langues du réviseur mises à jour.',
      usersReviewerLanguagesError: 'Impossible de mettre à jour les langues du réviseur.',
      overviewTitle: 'Vue d\'ensemble Admin',
      overviewSubtitle: 'Santé de la plateforme et statistiques clés en un coup d\'œil',
      navOverview: 'Vue d\'ensemble',
      navModeration: 'Modération',
      navBiographies: 'Biographies',
      navPublicCatalog: 'Catalogue public',
      navReview: 'File de révision',
      navUsers: 'Utilisateurs',
      navAiStats: 'Stats IA',
      reviewPageTitle: 'File de révision des biographies',
      reviewPageSubtitle:
        'File d\u2019attente de r\u00e9vision auteur apr\u00e8s screening IA — n\u2019inclut pas les signalements des lecteurs (voir Mod\u00e9ration).',
      reviewColSubject: 'Sujet',
      reviewColTitle: 'Titre',
      reviewColAuthor: 'Auteur',
      reviewColLanguage: 'Langue',
      reviewColType: 'Type',
      reviewColSubmitted: 'Soumis le',
      reviewColRead: 'Lire',
      reviewColActions: 'Actions',
      reviewApprove: 'Approuver',
      reviewReject: 'Refuser',
      reviewConfirmReject: 'Confirmer le refus',
      reviewCancelReject: 'Annuler',
      reviewReasonLabel: 'Motif du refus',
      reviewReasonPlaceholder: 'Expliquez pourquoi la biographie est renvoyée pour révision…',
      reviewReasonRequired: 'Veuillez fournir un motif (au moins 10 caractères).',
      reviewEmpty: 'Aucune biographie en attente de révision',
      reviewEmptySubtitle: 'Tout est à jour ! Il n\'y a actuellement aucune biographie dans la file de révision.',
      reviewLoadError: 'Impossible de charger la file de révision.',
      reviewApproveError: 'Impossible d\'approuver la biographie.',
      reviewRejectError: 'Impossible de refuser la biographie.',
      reviewFlaggedPassages: 'passages signalés',
      reviewApprovePassage: 'Approuver le passage',
      reviewRejectPassage: 'Rejeter le passage',
      reviewAllPassagesReviewed: 'Tous les passages révisés — prêt à décider',
      reviewAiReason: 'Raison de l\'IA',
      aiStatsPageTitle: 'Statistiques d\'utilisation de l\'IA',
      aiStatsPageSubtitle: 'Surveiller l\'utilisation des fonctions IA par tous les utilisateurs',
      aiStatsDataNote: 'Note : les données d\'utilisation sont conservées pendant 30 jours.',
      aiStatsFilterToday: 'Aujourd\'hui',
      aiStatsFilterLast7: '7 derniers jours',
      aiStatsFilterLast30: '30 derniers jours',
      aiStatsFilterAllTime: 'Tout le temps',
      aiStatsTotalRequests: 'Requêtes IA totales',
      aiStatsUniqueUsers: 'Utilisateurs uniques',
      aiStatsMostUsedAction: 'Action la plus utilisée',
      aiStatsAvgPerUser: 'Moy. requêtes / utilisateur',
      aiStatsSection1: 'Résumé',
      aiStatsSection2: 'Utilisation par type d\'action',
      aiStatsSection3: 'Principaux utilisateurs IA',
      aiStatsSection4: 'Utilisation quotidienne (14 derniers jours)',
      aiStatsColAction: 'Action',
      aiStatsColCount: 'Requêtes',
      aiStatsColName: 'Nom',
      aiStatsColEmail: 'Email',
      aiStatsColTotalRequests: 'Requêtes totales',
      aiStatsColLastUsed: 'Dernière utilisation',
      aiStatsColDate: 'Date',
      aiStatsColUniqueUsers: 'Utilisateurs uniques',
      aiStatsNoData: 'Aucune donnée pour cette période.',
      aiStatsLoadError: 'Impossible de charger les statistiques IA.',
      aiStatsNever: 'Jamais',
      statTotalUsers: 'Utilisateurs Totaux',
      statNewThisWeek: 'Nouveaux cette semaine',
      statActiveThisMonth: 'Actifs ce mois',
      statTotalBiographies: 'Biographies Totales',
      statPublished: 'Publiées',
      statUnderReview: 'En révision',
      statRemoved: 'Supprimées',
      statOpenReports: 'Signalements ouverts',
      statInReview: 'En révision',
      statResolvedThisWeek: 'Résolus cette semaine',
      sectionUsers: 'Utilisateurs',
      sectionBiographies: 'Biographies',
      sectionModeration: 'Modération',
      sectionQuickActions: 'Actions Rapides',
      quickActionModeration: 'Aller à la Modération',
      quickActionUsers: 'Gérer les Utilisateurs',
      quickActionBiographies: 'Voir les Biographies',
      quickActionPublicCatalog: 'Ouvrir le catalogue public',
      quickActionReview: 'File de révision',
      guardAccessDenied: 'Accès refusé',
      guardAccessDeniedMessage: 'Vous n\'avez pas la permission d\'accéder à cette zone.',
      guardRedirectingIn: 'Redirection dans {seconds}s…',
      overviewPeriodLast7Days: '7 derniers jours',
      overviewPeriodLast30Days: '30 derniers jours',
      overviewParseErrorBanner: '{count} {count, plural, one {biographie publiée} other {biographies publiées}} au cours des 7 derniers jours ont contourné le filtrage IA en raison d\'une erreur d\'analyse. Une révision manuelle peut être nécessaire.',
      overviewViewAffected: 'Voir les biographies concernées',
      reviewNoLanguages: 'Aucune langue assignée — contactez un administrateur pour recevoir des attributions de révision.',
      reviewConflictTitle: 'Un autre réviseur travaille sur cette biographie',
      reviewConflictDescription: 'Un autre réviseur a cette biographie ouverte. En continuant, vous annulerez son verrou et soumettrez votre décision.',
      reviewConflictCancel: 'Annuler',
      reviewConflictProceed: 'Continuer quand même',
      reviewInReviewLabel: 'En révision',
      reviewUndo: 'Annuler',
      reviewPassagesRemaining: '{count} restants',
      reportLockWarning: 'Ce signalement est assigné à un autre modérateur.',
      usersNoUsersFound: 'Aucun utilisateur trouvé',
      bioPageTitle: 'Toutes les Biographies',
      bioPageSubtitle: 'Parcourez, recherchez et gérez toutes les biographies du système',
      bioSearchPlaceholder: 'Rechercher par titre ou auteur…',
      bioFilterStatus: 'Statut',
      bioFilterType: 'Type',
      bioFilterSort: 'Trier',
      bioFilterAll: 'Tous',
      bioStatusDraft: 'Brouillon',
      bioStatusPublished: 'Publiée',
      bioStatusUnderReview: 'En révision',
      bioStatusPdfDraft: 'Brouillon PDF',
      bioStatusLockedPendingScreening: 'Filtrage en attente',
      bioStatusRemoved: 'Supprimée',
      bioTypeAll: 'Tous les types',
      bioTypeAutobiography: 'Autobiographie',
      bioTypeDeceased: 'Défunt',
      bioSortNewest: 'Plus récentes',
      bioSortOldest: 'Plus anciennes',
      bioSortRecentlyPublished: 'Récemment publiées',
      bioSortMostViews: 'Plus vues',
      bioColTitle: 'Titre',
      bioColAuthor: 'Auteur',
      bioColType: 'Type',
      bioColStatus: 'Statut',
      bioColViews: 'Vues',
      bioColCreated: 'Créée',
      bioColPublished: 'Publiée',
      bioColActions: 'Actions',
      bioActionView: 'Voir',
      bioNoResults: 'Aucune biographie trouvée.',
      bioLoadError: 'Impossible de charger les biographies.',
      bioPrev: 'Précédent',
      bioNext: 'Suivant',
      bioPageOf: 'sur',
      bioPanelTitle: 'Détails de la Biographie',
      bioPanelSection1: 'Infos Biographie',
      bioPanelSection2: 'Aperçu du Contenu',
      bioPanelSection3: 'Actions Admin',
      bioPanelAuthor: 'Auteur',
      bioPanelEmail: 'Email',
      bioPanelType: 'Type',
      bioPanelStatus: 'Statut',
      bioPanelPrivacy: 'Confidentialité',
      bioPanelCreated: 'Créée',
      bioPanelUpdated: 'Mise à jour',
      bioPanelShareToken: 'Jeton de partage',
      bioPanelNoContent: 'Aucune section de contenu trouvée.',
      bioPanelOpenFull: 'Ouvrir la biographie complète',
      bioPrivatePrivacy: 'Privée',
      bioFamilyPrivacy: 'Famille',
      bioPublicPrivacy: 'Publique',
      bioActionForcePublish: 'Forcer la publication',
      bioActionSetDraft: 'Remettre en brouillon',
      bioActionRemove: 'Supprimer la biographie',
      bioActionRestore: 'Restaurer la biographie',
      bioActionForcePublishConfirm: 'Forcer la publication de cette biographie ?',
      bioActionForcePublishDetail: 'La biographie sera publiée immédiatement et l\'auteur sera notifié.',
      bioActionSetDraftConfirm: 'Remettre en brouillon ?',
      bioActionSetDraftDetail: 'La biographie sera remise en brouillon et l\'auteur sera notifié.',
      bioActionRemoveConfirm: 'Supprimer cette biographie ?',
      bioActionRemoveDetail: 'La biographie sera masquée pour tous les utilisateurs non-staff. L\'auteur sera notifié. Cette action est réversible.',
      bioActionRestoreConfirm: 'Restaurer cette biographie ?',
      bioActionRestoreDetail: 'La biographie sera restaurée en brouillon et l\'auteur pourra la réviser.',
      bioActionConfirm: 'Confirmer',
      bioActionCancel: 'Annuler',
      bioNotifyForcePublished: 'Votre biographie a été publiée par un administrateur.',
      bioNotifySetDraft: 'Votre biographie a été remise en brouillon par un administrateur.',
      bioNotifyRemoved: 'Votre biographie a été supprimée par un administrateur.',
      bioNotifyRestored: 'Votre biographie a été restaurée. Vous pouvez la réviser et la republier.',
      bioActionSuccess: 'Action effectuée avec succès.',
      bioActionError: 'Impossible d\'effectuer l\'action.',
      bioActionChapterCooldownError: 'Publication impossible : le délai annuel entre chapitres est encore actif.',
      bioActionFreeze: 'Geler la biographie',
      bioActionUnfreeze: 'Dégeler la biographie',
      bioActionFreezeConfirm: 'Geler cette biographie ?',
      bioActionFreezeDetail: 'La biographie sera en lecture seule pour l\'auteur. L\'auteur sera notifié. Cette action est réversible.',
      bioActionUnfreezeConfirm: 'Dégeler cette biographie ?',
      bioActionUnfreezeDetail: 'L\'auteur retrouvera un accès complet à l\'édition. L\'auteur sera notifié.',
      bioNotifyFrozen: 'Votre biographie a été gelée par un administrateur et est maintenant en lecture seule.',
      bioNotifyUnfrozen: 'Votre biographie a été dégelée par un administrateur. Vous pouvez à nouveau la modifier.',
      bioStatusFrozen: 'Gelée',
    },
    publicBiographies: {
      pageTitle: 'Biographies Publiées',
      pageSubtitle: 'Découvrez des histoires de vie partagées avec le monde.',
      searchPlaceholder: 'Rechercher par titre ou auteur…',
      filterLanguage: 'Langue',
      filterType: 'Type',
      filterAll: 'Tous',
      typeAutobiography: 'Autobiographie',
      typeMemorial: 'Mémorial',
      langAll: 'Toutes les langues',
      chaptersCount: 'Chapitres',
      publishedOn: 'Publié',
      readBiography: 'Lire la biographie',
      noResults: 'Aucune biographie trouvée',
      noResultsSubtitle: 'Essayez de modifier votre recherche ou vos filtres.',
      loading: 'Chargement des biographies…',
      errorLoading: 'Impossible de charger les biographies.',
      untitled: 'Biographie sans titre',
      unknownAuthor: 'Auteur inconnu',
      featuredTitle: 'À la Une',
      mostReadTitle: 'Les Plus Lues',
      discoverTitle: 'Découvrir',
      signIn: 'Se connecter',
      startBiography: 'Commencer votre biographie',
      viewsCount: 'vues',
      langOriginal: 'Langue originale',
      langTranslation: 'Traduction disponible',
    },
    pwa: {
      installBannerText: 'Ajouter Biography Library à votre écran d\'accueil',
      installButton: 'Installer',
      dismissButton: 'Fermer',
      iosInstallText: "Pour installer : appuyez sur Partager (\u{1F4E4}) puis 'Sur l\u2019écran d\u2019accueil'",
    },
    meta: {
      tagline: 'Parce que chaque vie mérite d\'être rappelée',
    },
    notifications: {
      title: 'Notifications',
      empty: 'Vous n\'avez aucune notification pour le moment. Revenez plus tard.',
      markAllRead: 'Tout marquer comme lu',
      markAsRead: 'Marquer comme lu',
      justNow: 'À l\'instant',
      biographyApproved: 'Votre biographie a été approuvée et publiée.',
      biographyRejected: 'Votre biographie a été retournée pour révision : ',
      biographyRejectedWithPassages: 'Votre biographie nécessite une révision. Passages signalés:\n{passages}\nNote du réviseur: {note}',
      biographyAutoPublished: 'Votre biographie a été révisée et publiée automatiquement.',
      reviewAssigned: 'Une biographie vous a été assignée pour révision.',
    },
    errors: {
      title: 'Une erreur s\'est produite',
      description: 'Une erreur inattendue s\'est produite. Votre travail a été sauvegardé automatiquement.',
      tryAgain: 'Réessayer',
      goToDashboard: 'Aller au tableau de bord',
    },
    settings: {
      biographyType: {
        label: 'Type de biographie',
        autobiography: 'Autobiographie',
        memorial: 'Mémorial',
      },
      coverMode: {
        label: 'Style de couverture',
        graphic: 'Graphique (couleur de marque)',
        photo: 'Photo (depuis la galerie)',
        noPhotoWarning: 'Aucune photo de couverture sélectionnée. Allez dans la galerie et définissez le layout d\'une photo sur "Couverture".',
      },
      slug: {
        label: 'Identifiant URL',
        helper: 'Utilisé dans l\'URL publique. Lettres minuscules, chiffres et tirets uniquement.',
        duplicateError: 'Cet identifiant est déjà utilisé. Veuillez en choisir un autre.',
      },
      coverPreview: 'Aperçu de la couverture',
      noCoverPhoto: 'Aucune photo de couverture',
      goToPhotos: 'Ajouter dans Photos',
    },
    helpChatbot: {
      title: 'Aide',
      placeholder: 'Posez une question…',
      send: 'Envoyer',
      loading: 'Je réfléchis…',
      lowConfidence: "Je ne suis pas sûr à 100 % — consultez le guide complet pour plus de détails.",
      clearChat: 'Effacer la conversation',
      openHelp: 'Ouvrir l\'aide',
      closeHelp: 'Fermer l\'aide',
      sessionExpired: 'Votre session a expiré. Veuillez vous reconnecter.',
      rateLimitError: 'Trop de requêtes. Veuillez patienter un moment.',
      genericError: 'Une erreur est survenue. Veuillez réessayer.',
      signInRequired: 'Connectez-vous pour utiliser l\'assistant.',
    },
    onboardingWizard: {
      stepProgress: 'Étape {current} sur {total}',
      typeSubtitle: 'Indiquez pour qui est cette biographie. Vous confirmerez vos droits légaux à l\'étape suivante.',
      accountModelInfo:
        'Chaque compte gère une seule biographie (autobiographie ou mémorial — choisissez avec soin). Pour un autre projet plus tard, créez un compte séparé avec une autre adresse e-mail. D\'autres proches peuvent écrire leur propre perspective sur la même personne avec leurs propres comptes.',
      legalSubtitle: 'Veuillez lire et confirmer chaque déclaration pour continuer.',
      pathTitle: 'Comment souhaitez-vous travailler ?',
      pathSubtitle: 'Choisissez votre parcours initial. Vous pourrez changer d\'approche plus tard.',
      pathHint: 'Après cette étape, un court tour guidé de l\'éditeur s\'affichera dans votre langue.',
      publishReadyDescription: 'Importez un texte terminé et avancez vers la publication et l\'export PDF.',
      skipForNow: 'Passer pour l\'instant',
      startTour: 'Créer et lancer le tour',
      resumeIntro: 'Reprendre l\'introduction',
      resumeIntroDescription: 'Reprenez la configuration guidée là où vous l\'avez laissée.',
      reviewIntro: 'Revoir l\'introduction',
      tourCompleted: 'Tour terminé — bonne écriture !',
      tourSkip: 'Passer le tour',
      tourNext: 'Suivant',
      tourBack: 'Retour',
      tourFinish: 'Terminer',
      tourStepOptional: 'Vous pouvez essayer l\'action mise en évidence, ou appuyer sur Suivant pour continuer sans.',
      tourTryStep: 'Essayer',
      tryActionHint: 'Essayez l\'action mise en évidence pour continuer.',
    },
    onboardingTour: {
      sectionsOverviewTitle: 'Chapitres',
      sectionsOverviewDesc:
        'Votre biographie est organisée en chapitres. Sélectionnez-en un dans la liste pour y travailler avec Echo.',
      bookTitleTitle: 'Titre du livre',
      bookTitleDesc: 'Cliquez sur le titre en haut pour renommer votre biographie à tout moment.',
      privacyTitle: 'Visibilité',
      privacyDesc:
        'Ce bouton indique qui peut voir votre biographie. Touchez-le pour passer entre Privé, Lien famille et Public.',
      echoPanelTitle: 'Écrire avec Echo',
      echoPanelDesc:
        'Discutez avec Echo ici pour rédiger votre chapitre par texte ou voix. Posez des questions, demandez des suggestions ou un brouillon.',
      editSectionTitle: 'Modifier',
      editSectionDesc:
        'Utilisez Modifier pour ouvrir l\'éditeur de texte du chapitre. Affinez le brouillon d\'Echo, collez votre texte ou écrivez directement — Echo reste votre assistant.',
      aiCreditsTitle: 'Crédits IA',
      aiCreditsDesc:
        'Ce compteur indique combien d\'actions assistées par IA il vous reste aujourd\'hui et cette semaine. Les comptes standard ont des limites quotidiennes et hebdomadaires.',
      echoVoiceTitle: 'Voix d\'Echo',
      echoVoiceDesc:
        'Utilisez l\'icône haut-parleur pour activer ou désactiver les réponses vocales d\'Echo. En mode muet, Echo répond uniquement par texte.',
      echoVoiceFreeflowTitle: 'Voix d\'Echo',
      echoVoiceFreeflowDesc:
        'Ouvrez Echo via le bouton flottant, puis utilisez l\'icône haut-parleur dans le chat pour couper ou réactiver la voix.',
      notesTitle: 'Notes et rappels',
      notesDesc: 'Conservez ici vos notes de recherche et rappels — séparés du texte publié.',
      photosTitle: 'Photos',
      photosDesc: 'Ajoutez des images à la galerie et associez-les aux chapitres si besoin.',
      importTextTitle: 'Importer du texte',
      importTextDesc: 'Collez ou téléversez du texte existant depuis Word, PDF ou fichiers texte.',
      exportTextTitle: 'Exporter le texte',
      exportTextDesc: 'Téléchargez votre biographie en TXT ou DOCX, ou lancez un brouillon PDF pour la révision.',
      bookStructureTitle: 'Structure du livre',
      bookStructureDesc: 'Définissez la couverture, la page de crédits et les options de mise en page avant l\'export.',
      reviewPublicationTitle: 'Révision et publication',
      reviewPublicationDesc:
        'Soumettez votre biographie à la révision, vérifiez les brouillons PDF et publiez quand vous êtes prêt.',
      freeflowEditorTitle: 'Zone d\'écriture',
      freeflowEditorDesc:
        'C\'est votre espace principal d\'écriture. Tapez librement ou collez du texte importé, puis utilisez les outils du panneau latéral.',
      echoBubbleTitle: 'Assistant Echo',
      echoBubbleDesc:
        'Touchez le bouton Echo en bas à droite pour ouvrir l\'assistant IA pendant que vous écrivez.',
      publishImportTitle: 'Importer votre texte',
      publishImportDesc: 'Amenez votre biographie terminée sur la plateforme via Importer.',
      publishFinalTitle: 'Version finale',
      publishFinalDesc: 'Peaufinez votre texte ici avant de passer aux brouillons PDF et à la publication.',
      publishExportTitle: 'Exporter',
      publishExportDesc: 'Exportez un brouillon PDF ou une copie texte pour voir à quoi ressemblera le livre.',
      mobileMenuTitle: 'Menu chapitres et outils',
      mobileMenuDesc:
        'Sur téléphone et tablette, touchez l\'icône menu en haut à droite de la barre d\'édition pour ouvrir chapitres et outils. Le tour ouvrira ce panneau automatiquement aux étapes suivantes.',
      mobileSidebarOverviewHint:
        'La liste des chapitres et les outils sont dans ce panneau. Sur téléphone et tablette, ouvrez-le avec le bouton menu en haut à droite de la barre d\'édition.',
    },
    echo: {
      hubEmpty: 'Bonjour ! Je suis Echo. Je vous guide pour votre biographie — à voix ou par écrit.',
      resumeBiography: 'Continuer : {title}',
      resumeButton: 'Reprendre la biographie',
      newGuided: 'Racontez avec Echo, votre IA personnelle qui vous guide pas à pas.',
      newImport: 'J\'ai déjà un texte à importer',
      newPublishOnly: 'Préparer un texte existant pour publication',
      myBiographies: 'Mes biographies',
      pickBiography: 'Choisir une biographie',
      untitledBiography: 'Sans titre',
      inputPlaceholder: 'Écrivez ou utilisez le micro…',
      statusListening: 'Je vous écoute…',
      statusSpeaking: 'Je parle…',
      statusThinking: 'Je réfléchis…',
      statusFormulatingReply: 'J\'élabore la réponse…',
      statusWelcome: 'Écrivez ou utilisez le micro — je suis là pour vous guider',
      statusReady: 'Prêt pour votre prochaine question',
      statusVoiceMuted: 'Texte seul — voix désactivée',
      statusPreparingReply: 'Je prépare une réponse…',
      statusReadingMessage: 'Je lis votre message…',
      statusWriting: 'J\'écris…',
      statusStillWorking: 'Cela prend un peu plus de temps que d\'habitude…',
      statusSlowApology: 'Désolé pour l\'attente — j\'y suis presque…',
      statusLoadingHistory: 'Je charge notre conversation…',
      statusLoadingOlder: 'Chargement des messages précédents…',
      errorGeneric: 'Une erreur s\'est produite. Réessayez.',
      openEcho: 'Demander à Echo',
      closeEcho: 'Fermer',
      aiToolsMenu: 'Outils IA',
      changePath: 'Changer de parcours',
      changePathTitle: 'Changer de parcours d\'écriture',
      changePathDescription: 'Votre contenu sera conservé. Vous pouvez exporter une copie avant.',
      exportBeforeChange: 'Exporter une copie d\'abord',
      confirmPathChange: 'Convertir et continuer',
      onboardingWelcome: 'Bienvenue sur Biography Library. Je suis Echo — commençons.',
      pathChanged: 'Parcours mis à jour.',
      concentrationMode: 'Mode concentration',
      exitConcentration: 'Quitter le mode concentration',
      consultEcho: 'Echo',
      stopSpeaking: 'Arrêter',
      muteVoice: 'Couper la voix d\'Echo',
      unmuteVoice: 'Activer la voix d\'Echo',
      speakingBanner: 'Echo lit à voix haute…',
      activeSectionContext: 'Vous travaillez sur : {section}',
      sectionSwitchPrefix: '[Section active : « {section} »]',
      icebreakerHint: 'Vous pouvez demander, par exemple :',
      icebreakerDefaultSection: 'ce chapitre',
      insertDraftPrompt: 'Insérer ce texte dans l\'éditeur ?',
      insertDraftConfirm: 'Insérer dans l\'éditeur',
      insertDraftDismiss: 'Plus tard',
      insertDraftDone: 'Texte inséré dans l\'éditeur.',
      insertDraftCardTitle: 'Brouillon pour {section}',
      insertDraftCardSubtitle: 'Relisez le texte ci-dessous, puis insérez-le dans la biographie.',
      insertDraftLater: 'Plus tard',
      insertDraftShowPreview: 'Afficher l\'aperçu complet',
      insertDraftHidePreview: 'Réduire l\'aperçu',
      insertDraftReady: 'Brouillon prêt',
      insertDraftSectionMismatch: 'Sera inséré dans : {section} (pas le chapitre affiché actuellement).',
      insertDraftSuccessTitle: 'Texte inséré',
      insertDraftSuccessBody: 'Le brouillon a été ajouté à l\'éditeur. Vous pouvez le relire et le modifier à tout moment.',
      insertDraftOpenEditor: 'Ouvrir l\'éditeur',
      insertDraftDialogTitle: 'Brouillon inséré',
      insertDraftDialogDescription: 'Le texte a été ajouté à {section}. Ouvrez l\'éditeur pour le vérifier.',
      insertDraftContinueChat: 'Continuer dans le chat',
      insertDraftPendingBadge: '{count} brouillon à insérer',
      loadOlderMessages: 'Charger les messages précédents',
      loadingOlderMessages: 'Chargement…',
      ...getEchoGuideCopy('fr'),
      icebreakerPools: getEchoIcebreakerPools('fr'),
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
      demoBiographies: 'Demo-Biografien',
      workspace: 'Workspace',
      dashboard: 'Dashboard',
      biography: 'Biografie',
      settings: 'Einstellungen',
      logout: 'Abmelden',
      admin: 'Admin',
      reviewer: 'Prüfer',
      notifications: 'Benachrichtigungen',
      darkMode: 'Dunkelmodus',
      decreaseFontSize: 'Schriftgr\u00f6\u00dfe verringern',
      increaseFontSize: 'Schriftgr\u00f6\u00dfe vergr\u00f6\u00dfern',
      signOut: 'Abmelden',
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
      createYourAccount: 'Erstellen Sie Ihr Konto',
      registerSubtitle: 'Beginnen Sie noch heute, Lebensgeschichten zu bewahren und zu teilen',
      fullName: 'Vollst\u00e4ndiger Name',
      yourName: 'Ihr Name',
      emailPlaceholder: 'sie@beispiel.de',
      enterPassword: 'Geben Sie Ihr Passwort ein',
      atLeastSixChars: 'Mindestens 6 Zeichen',
      repeatPassword: 'Passwort wiederholen',
      passwordsDoNotMatch: 'Passw\u00f6rter stimmen nicht \u00fcberein',
      passwordMinLength: 'Das Passwort muss mindestens 8 Zeichen lang sein',
      createOne: 'Konto erstellen',
      createAccount: 'Konto erstellen',
      forgotPassword: 'Passwort vergessen?',
      forgotPasswordTitle: 'Ihr Passwort zur\u00fccksetzen',
      forgotPasswordSubtitle: 'Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zur\u00fccksetzen Ihres Passworts',
      forgotPasswordButton: 'Zur\u00fccksetzen-Link senden',
      forgotPasswordSending: 'Wird gesendet...',
      forgotPasswordSuccess: '\u00dcberpr\u00fcfen Sie Ihre E-Mail',
      forgotPasswordSuccessDetail: 'Wir haben einen Link zum Zur\u00fccksetzen des Passworts an Ihre E-Mail-Adresse gesendet. Bitte \u00fcberpr\u00fcfen Sie Ihren Posteingang.',
      backToLogin: 'Zur\u00fcck zur Anmeldung',
      resetPassword: 'Passwort zur\u00fccksetzen',
      resetPasswordTitle: 'Neues Passwort festlegen',
      resetPasswordSubtitle: 'Geben Sie Ihr neues Passwort unten ein',
      newPassword: 'Neues Passwort',
      confirmNewPassword: 'Neues Passwort best\u00e4tigen',
      resetPasswordButton: 'Passwort aktualisieren',
      resetPasswordUpdating: 'Wird aktualisiert...',
      resetPasswordSuccess: 'Passwort aktualisiert',
      resetPasswordSuccessDetail: 'Ihr Passwort wurde erfolgreich aktualisiert. Sie k\u00f6nnen sich jetzt mit Ihrem neuen Passwort anmelden.',
      resetPasswordInvalidLink: 'Ung\u00fcltiger oder abgelaufener Link',
      resetPasswordInvalidLinkDetail: 'Dieser Link zum Zur\u00fccksetzen des Passworts ist abgelaufen oder wurde bereits verwendet. Bitte fordern Sie einen neuen an.',
      resetPasswordRequestNew: 'Neuen Zur\u00fccksetzen-Link anfordern',
      resetPasswordVerifying: 'Ihr Link wird \u00fcberpr\u00fcft...',
      atLeastEightChars: 'Mindestens 8 Zeichen',
      verifyEmailTitle: 'E-Mail best\u00e4tigen',
      verifyEmailSubtitle: 'Wir haben eine Best\u00e4tigungs-E-Mail an Ihre Adresse gesendet. Bitte \u00fcberpr\u00fcfen Sie Ihren Posteingang und klicken Sie auf den Link, um Ihr Konto zu aktivieren.',
      verifySentTo: 'Wir haben einen Best\u00e4tigungslink gesendet an',
      verifyEmailDetail: 'Keine E-Mail erhalten? \u00dcberpr\u00fcfen Sie Ihren Spam-Ordner oder senden Sie sie erneut.',
      verifyEmailLinkSent: 'Wir haben Ihnen einen Best\u00e4tigungslink gesendet. Klicken Sie auf den Link in der E-Mail, um Ihr Konto zu aktivieren.',
      verifyEmailAutoUpdate: 'Diese Seite wird nach der Best\u00e4tigung automatisch aktualisiert.',
      verifyEmailChecking: 'Wird \u00fcberpr\u00fcft...',
      verifyEmailAlreadyConfirmed: 'Ich habe bereits best\u00e4tigt, anmelden',
      verifyEmailConfirmedTitle: 'E-Mail best\u00e4tigt!',
      verifyEmailConfirmedDetail: 'Ihr Konto wurde verifiziert. Weiterleitung zum Dashboard...',
      verifyEmailFailedTitle: 'Best\u00e4tigung fehlgeschlagen',
      verifyEmailFailedDetail: 'Der Best\u00e4tigungslink ist abgelaufen oder wurde bereits verwendet. Bitte fordern Sie einen neuen an.',
      verifyEmailResendSuccessInline: 'E-Mail gesendet! \u00dcberpr\u00fcfen Sie Ihren Posteingang.',
      verifyEmailDidntReceive: 'Keine E-Mail erhalten? Erneut senden',
      resendVerification: 'Best\u00e4tigungs-E-Mail erneut senden',
      resendVerificationSending: 'Wird gesendet...',
      resendVerificationSuccess: 'Best\u00e4tigungs-E-Mail gesendet',
      useAnotherEmail: 'Andere E-Mail-Adresse verwenden',
      resendCooldown: 'Erneut senden in {seconds}s',
      resendNewConfirmEmail: 'Neue Best\u00e4tigungs-E-Mail senden',
      emailNotVerified: 'E-Mail nicht best\u00e4tigt',
      emailNotVerifiedDetail: 'Bitte best\u00e4tigen Sie Ihre E-Mail-Adresse, um auf das Dashboard zuzugreifen.',
      mustAcceptTerms: 'Erforderlich \u2014 Sie m\u00fcssen die Bedingungen akzeptieren, um fortzufahren',
      accountSuspended:
        'Ihr Konto wurde gesperrt. Wenn Sie glauben, dass dies ein Fehler ist, antworten Sie auf die erhaltene E-Mail.',
      registrationLanguage: 'Ihre Sprache',
      registrationLanguageHint:
        'E-Mails, Onboarding und Oberfl\u00e4che verwenden diese Sprache. Die Wahl kann sp\u00e4ter nicht ge\u00e4ndert werden.',
      registrationLanguageAlertTitle: 'Sprache kann sp\u00e4ter nicht ge\u00e4ndert werden',
      registrationLanguageAlertMessage:
        'Die gew\u00e4hlte Sprache gilt f\u00fcr E-Mails, Onboarding und die gesamte App. Nach der Registrierung ist keine \u00c4nderung mehr m\u00f6glich.',
    },
    accountSettings: {
      language: 'Sprache',
      languageLockedHint: 'Bei der Registrierung gew\u00e4hlt und nicht \u00e4nderbar.',
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
      sectionsComplete: 'Abschnitte Vollständig',
      finalVersion: 'Endversion',
      statusRemoved: 'Entfernt',
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
      statusPublished: 'Veröffentlicht',
      statusUnderReview: 'In Prüfung',
      statusPdfDraft: 'PDF-Entwurf',
      statusLockedPendingScreening: 'Screening ausstehend',
      underReviewMessage: 'Unser Team prüft Ihre Biografie. Sie werden über das Ergebnis informiert.',
      untitledBiography: 'Biografie ohne Titel',
      goToWorkspace: 'Zum Workspace',
      continueLastSection: 'Letzte Sektion Fortsetzen',
      updateAvailabilityMessage: 'Sie können Ihrer Biografie einmal im Jahr ein neues Kapitel hinzufügen, um zu erzählen, was sich in Ihrem Leben verändert hat.',
      oneBiographyLimit: 'Sie haben bereits eine Biografie. Jedes Konto ist auf eine Biografie beschränkt, um Fokus und Qualität zu bewahren.',
      nextChapterAvailableNow: 'Sie können jetzt ein neues Kapitel zu Ihrer Biografie hinzufügen.',
      nextChapterAvailableOn: 'Nächstes Kapitel verfügbar am {date}.',
      nextChapterCooldownDays: 'Noch {days} Tage bis zum nächsten Kapitel.',
      chapterCooldownBlocked: 'Sie können ein neues Kapitel ein Jahr nach Ihrer letzten Veröffentlichung veröffentlichen.',
    },
    biography: {
      newBiography: 'Neue Biografie',
      biographyTitle: 'Biografietitel',
      titlePlaceholder: 'z.B. Meine Geschichte — den Titel können Sie später ändern',
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
      aiTimeout: 'Die KI braucht zu lange. Bitte erneut versuchen.',
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
      subjectNameLabel: 'Name des Protagonisten',
      subjectNamePlaceholder: 'z.B., Francesco Brignole',
      writerNameLabel: 'Name des Autors',
      writerNamePlaceholder: 'Ihr Name als Autor',
      writtenBy: 'Geschrieben von',
      memorialDetailsSubtitle: 'Wer ist das Thema dieser Biografie und wer schreibt sie?',
      addAuthorName: 'Autorennamen hinzufügen…',
    },
    writingModeOnboarding: {
      stepTitle: 'Wie möchten Sie schreiben?',
      stepSubtitle: 'Wählen Sie, wie Sie Ihre Biografie beginnen möchten. Sie können Ihre Inhalte jederzeit exportieren und erneut importieren.',
      writeHereTitle: 'In Biography Library schreiben',
      writeHereDescription: 'Verfassen Sie Ihre Biografie direkt hier. Wir führen Sie durch die Kapitel, oder Sie schreiben frei.',
      guidedChaptersLabel: 'Führen Sie mich durch die Kapitel',
      guidedChaptersDescription: 'Strukturierter Ansatz: Kindheit, Familie, Bildung, Karriere und mehr — ein Kapitel nach dem anderen.',
      freewritingLabel: 'Ich schreibe frei',
      freewritingDescription: 'Freies Schreiben. Keine feste Struktur. Schreiben oder diktieren Sie in Ihrem eigenen Stil.',
      importTitle: 'Einen vorhandenen Text importieren',
      importDescription: 'Sie haben bereits eine geschriebene Biografie oder ein Dokument. Importieren Sie es und nutzen Sie Biography Library als Archiv.',
      continueButton: 'Schreiben beginnen',
      backButton: 'Zurück',
    },
    modeSwitchWarning: {
      step1Title: 'Warnung: Das Wechseln des Modus löscht Ihre aktuellen Inhalte',
      step1Message: 'Wenn Sie von {from} zu {to} wechseln, wird der gesamte Text, den Sie in {from} geschrieben haben, dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
      step1Confirm: 'Ich verstehe, weiter',
      step2Title: 'Exportieren Sie Ihre Inhalte vor dem Wechsel',
      step2Message: 'Bevor Sie Ihre Inhalte in {from} löschen, empfehlen wir dringend, sie zu exportieren. Sie können sie dann in den neuen Modus reimportieren.',
      step2ExportButton: 'Inhalte jetzt exportieren (.txt und .docx)',
      step2SkipButton: 'Ich habe bereits eine Kopie, Export überspringen',
      step2Exporting: 'Exportieren...',
      step3Title: '{from}-Inhalte dauerhaft löschen?',
      step3Message: 'Sie sind dabei, alle Ihre {from}-Inhalte dauerhaft zu löschen. Dies kann nicht wiederhergestellt werden.',
      step3Checkbox: 'Ich verstehe, dass meine Inhalte gelöscht werden und dies nicht rückgängig gemacht werden kann.',
      step3Confirm: 'Löschen und Modus wechseln',
      step3Cancel: 'Inhalte behalten, zurückgehen',
      step3Deleting: 'Löschen...',
      fromSections: 'Abschnitte',
      fromFreeflow: 'freies Schreiben',
      toSections: 'Abschnitte',
      toFreeflow: 'freies Schreiben',
      goBack: 'Zurückgehen',
    },
    exportDialog: {
      title: 'Biografie exportieren',
      description: 'Format und Abschnitte zum Exportieren auswählen',
      pdfNotice: 'Der PDF-Export ist erst verfügbar, wenn die Biografie abgeschlossen und genehmigt wurde. In der Zwischenzeit können Sie in den Formaten TXT, RTF und DOCX exportieren.',
      formatLabel: 'Exportformat',
      contentLabel: 'Inhaltsauswahl',
      allSections: 'Vollständige Biografie (alle Abschnitte)',
      completedSections: 'Nur abgeschlossene Abschnitte',
      customSections: 'Bestimmte Abschnitte auswählen',
      additionalOptions: 'Zusätzliche Optionen',
      separateFiles: 'In separate Dateien pro Abschnitt aufteilen (.zip-Archiv)',
      includeMetadata: 'Metadaten einschließen (Erstellungsdatum, letzte Änderung)',
      includeNotesTodos: 'Notizen und Erinnerungen einschließen',
      cancel: 'Abbrechen',
      export: 'Exportieren',
      exporting: 'Exportieren...',
      noSectionsError: 'Keine Abschnitte zum Exportieren.',
      exportError: 'Fehler beim Exportieren. Bitte erneut versuchen.',
      fontLoadError: 'Schriftart nicht verfügbar — Export abgebrochen. Bitte Seite neu laden und erneut versuchen.',
      pdfFormat: 'PDF - Vollständiges formatiertes Dokument',
      pdfB5Standard: 'PDF B5 (176×250mm)',
      txtFormat: 'TXT - Einfacher Text ohne Formatierung',
      rtfFormat: 'RTF - Text mit einfacher Formatierung',
      docxFormat: 'DOCX - Word-Dokument',
      emptySection: '(leer)',
      createdWith: 'Erstellt mit Biography Library',
      allRightsReserved: '© {year} alle Rechte vorbehalten',
      preface: 'Vorwort',
      epilogue: 'Nachwort',
      acknowledgements: 'Danksagung',
      specificCredits: 'Quellenangaben',
      backCoverDescription:
        'Diese Biografie wurde mit Biography Library erstellt, dem digitalen Archiv der menschlichen Erinnerung, das frei Werkzeuge anbietet, um die eigene Geschichte oder die eines geliebten Menschen zu erstellen und zu bewahren.',
      backCoverPropertyStatement:
        'Der Text dieser Biografie ist ausschließliches Eigentum des Autors, der alle Rechte behält, gegen jede unbefugte Nutzung vorzugehen, einschließlich der Nutzung für KI-Trainingszwecke.',
      backCoverAiStatement:
        'Biography Library untersagt die Nutzung von auf seinen Servern gehosteten Inhalten für Text-Mining, KI-Training oder maschinelles Lernen gemäß dem Schweizer Urheberrechtsgesetz (URG/LDA) und dem ausschließlichen Nutzungsrecht des Autors nach Schweizer Recht.',
      backCoverFooter: 'Biography Library · biographylibrary.org',
      noCoverPhotoWarning: 'Ein Titelfoto ist erforderlich, um das PDF zu erstellen. Lade ein Foto hoch und markiere es als Titelbild im Fotos-Bereich.',
      pdfDraftNotice: 'Dies ist ein Entwurfs-PDF. Es spiegelt den aktuellen Stand der Biografie wider und ermöglicht es dir, Layout und Inhalt vor der Einreichung zur Überprüfung zu verifizieren.',
      draftIterationNone: 'Noch kein Entwurfs-PDF generiert. Beim Exportieren wird dein erster Entwurf erstellt.',
      draftIterationCurrent: 'Entwurf {n} bereits generiert. Beim Exportieren wird Entwurf {next} erstellt.',
      draftIterationWarning: 'Du hast bereits {n} Entwurfs-PDFs generiert. Reiche die Biografie bald zur Überprüfung ein.',
      draftLimitReached: 'Du hast die maximale Anzahl an Entwurfs-PDFs für diese Biografie erreicht. Reiche zur Überprüfung ein, bevor du weitere erstellst.',
      draftPhaseRequiredBeforeDraft:
        'Starte zuerst die PDF-Prüfphase im Editor (PDF-Prüfung starten), bevor du Entwürfe mit Wasserzeichen herunterlädst.',
      finalDraftConfirmTitle: 'Dritten und letzten Entwurf generieren',
      finalDraftConfirmDescription: 'Dies ist dein dritter und letzter Entwurf. Nach diesem Export sind keine weiteren Entwurfsrevisionen möglich. Stelle sicher, dass deine Biografie bereit ist, bevor du fortfährst.',
      draftAiReviewTitle: 'KI-Entwurfsprüfung',
      draftAiQuality: 'Qualität: {n}/5',
      draftAiUnavailable: 'KI-Analyse nicht verfügbar. Sie können trotzdem zur Veröffentlichung fortfahren.',
      draftAiSeverity3Block: 'Dieser Entwurf enthält Inhalte, die die Veröffentlichung blockieren könnten. Bitte vor dem Fortfahren prüfen.',
      draftAiStrengths: 'Stärken',
      draftAiSuggestions: 'Vorschläge',
      draftAiSuggestionNarrative: 'Erzählung',
      draftAiSuggestionCompleteness: 'Vollständigkeit',
      draftAiSuggestionClarity: 'Klarheit',
      draftAiSuggestionStyle: 'Stil',
      draftAiFeedbackUnavailable: 'KI-Feedback zum Entwurf für diesen Export nicht verfügbar.',
    },
    sectionTitles: {
      childhood: 'Kindheit und Frühe Jahre',
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
      publishedChapterNotice: 'Dieses Kapitel ist veröffentlicht und kann nicht bearbeitet werden.',
      freeFlowTab: 'Freier Text',
      sectionsTab: 'Abschnitte',
      freeFlowReadOnly: 'Freier Text (nur lesen)',
      importFreeFlowHint: 'Importieren Sie eine woanders geschriebene Biografie? Wählen Sie Freier Text. Sie können Abschnitte später manuell kopieren.\nImportieren Sie einen einzelnen Abschnitt aus einem Biography Library-Export? Fügen Sie nur den Text dieses Abschnitts ein und wählen Sie, wo er gespeichert werden soll.',
      importSaveTo: 'Speichern in',
      importDestinationFreeFlow: 'Freier Text',
      importFieldNotEmpty: 'Dieses Feld enthält bereits Text. Was möchten Sie tun?',
      importReplace: 'Ersetzen',
      importAddAtEnd: 'Am Ende hinzufügen',
      exportModeFreeFlow: 'Export im Modus Freier Text — Abschnitte werden nicht einbezogen.',
      exportModeSections: 'Export im Modus Abschnitte — freier Text wird nicht einbezogen.',
      bookStructureTitle: 'Buchstruktur',
      bookStructureAuthorCopyrightPage:
        'Kurze Autoren-/Copyright-Seite vor dem Titelblatt einfügen (PDF). Der vollständige Rechtstext bleibt auf der Rückseite.',
      bookStructureFrontMatter: 'Vorspann',
      bookStructureBackMatter: 'Nachspann',
      bookStructureDedication: 'Widmung',
      bookStructureEpigraph: 'Epigraph',
      bookStructureEpigraphQuote: 'Zitat',
      bookStructureEpigraphSource: 'Quellenangabe',
      bookStructurePreface: 'Vorwort / Incipit',
      bookStructureEpilogue: 'Epilog',
      bookStructureAcknowledgements: 'Danksagungen',
      bookStructureCredits: 'Spezifische Credits',
      bookStructureDedicationPlaceholder: 'z.B. «Meiner Mutter»',
      bookStructureEpigraphQuotePlaceholder: 'Zitattext…',
      bookStructureEpigraphSourcePlaceholder: 'Autor, Quelle…',
      bookStructurePrefacePlaceholder: 'Vorwort schreiben…',
      bookStructureEpiloguePlaceholder: 'Epilog schreiben…',
      bookStructureAcknowledgementsPlaceholder: 'Danksagungen schreiben…',
      bookStructureCreditPlaceholder: 'Spezifische Credits…',
      importNoticeSectionsMode: 'Sie befinden sich im Abschnittsmodus — der Text wird in den aktuell ausgewählten Abschnitt importiert. Um in ein anderes Kapitel zu importieren, wählen Sie es zuerst in der Seitenleiste aus. Um eine vollständige, anderswo verfasste Biografie als einzelnen Block zu importieren, wechseln Sie vor dem Import in den Freitextmodus.',
      importNoticeFreeflowMode: 'Sie befinden sich im Freitextmodus — ideal für den Import von Texten, die außerhalb von Biography Library geschrieben wurden. Wählen Sie, ob Sie den aktuellen Inhalt ersetzen oder den importierten Text am Ende hinzufügen möchten. Wenn Sie einen kapitelweisen Ansatz bevorzugen, wechseln Sie vor dem Import in den Abschnittsmodus.',
      importFreeFlowReplace: 'Gesamten vorhandenen Inhalt ersetzen',
      importFreeFlowAppend: 'Am Ende des vorhandenen Inhalts hinzufügen',
      bookStructureMainText: 'Haupttext',
      bookStructureImportText: 'Text importieren',
      bookStructureImportTitle: 'Haupttext importieren',
      bookStructureImportDescription: 'Fügen Sie Ihren Text ein oder laden Sie eine .txt-Datei hoch. Dadurch wird der aktuelle Hauptinhalt ersetzt.',
      bookStructureImportPaste: 'Text einfügen',
      bookStructureImportPastePlaceholder: 'Fügen Sie Ihren Text hier ein…',
      bookStructureImportOrFile: 'oder Datei hochladen',
      bookStructureImportSelectFile: '.txt-Datei auswählen',
      bookStructureImportConfirm: 'Importieren',
      bookStructureImportReplaceWarning: 'Der Haupttext enthält bereits Inhalt. Beim Importieren wird er ersetzt. Sind Sie sicher?',
      bookStructureImportReplace: 'Ja, ersetzen',
      bookStructureImportCancel: 'Abbrechen',
      noChaptersWarning: 'Keine Kapitel definiert. Das Buch wird ein fortlaufender Text ohne Kapitelunterbrechungen sein. Um Kapitel hinzuzufügen, wechseln Sie in den Abschnitte-Modus.',
      revisionRequired: 'Überarbeitung erforderlich. Der Prüfer hat Folgendes markiert:',
      revisionRequiredAiScreening:
        'Die automatische Prüfung hat die folgenden Passagen markiert. Bearbeiten Sie diese Teile oder den gesamten Endtext, und senden Sie danach erneut zum Screening.',
      aiScreeningFlaggedEditHint:
        'Sie können nur die aufgeführten Abschnitte oder den vollständigen Endtext anpassen; ein Prüfer wird den Bericht dennoch prüfen.',
      resubmitAiScreening: 'Erneut zum Screening senden',
      resubmitAiScreeningPublishedToast: 'Screening bestanden — Ihre Biografie ist live.',
      resubmitAiScreeningStillFlaggedToast: 'Es gibt weiterhin markierte Passagen. Die Liste unten ist aktualisiert.',
      resubmitAiScreeningErrorToast: 'Das automatische Screening wurde nicht abgeschlossen. In einigen Minuten erneut versuchen oder auf einen Prüfer warten.',
      revisionFlaggedPassages: 'Markierte Passagen',
      revisionReviewerNote: 'Hinweis des Prüfers',
      revisionDismiss: 'Schließen',
      publicationStartPdfButton: 'PDF-Prüfung starten',
      publicationPdfDraftHint:
        'Laden Sie bis zu drei PDFs mit Wasserzeichen über Export herunter, und genehmigen Sie dann die Endversion für das automatische Screening.',
      publicationApproveFinalButton: 'End-PDF genehmigen & Screening starten',
      publicationExportPdf: 'PDF exportieren',
      publicationLegacySubmitHint:
        'Für den vollen druckfertigen Ablauf (PDF-Entwürfe → automatisches Screening) nutzen Sie zuerst „Abschließende Überprüfung mit KI“, dann „PDF-Prüfung starten“. Sie können hier weiterhin zur schnelleren Prüfung ohne PDF-Phase einreichen.',
      reviewPublication: {
        menuItem: 'Überprüfung & Veröffentlichung',
        title: 'Überprüfung & Veröffentlichung',
        description:
          'Schließen Sie den Überprüfungsablauf ab und veröffentlichen Sie Ihre Biografie mit druckfertigem PDF-Export.',
        incompleteMessage:
          'Bevor Sie mit Überprüfung und Veröffentlichung beginnen, vervollständigen Sie jedes Kapitel in der Seitenleiste. Jeder Abschnitt sollte Ihren Text enthalten und als abgeschlossen markiert sein.',
        freeflowEmptyHint:
          'Fügen Sie Ihren Biografietext im Editor hinzu, bevor Sie mit Überprüfung und Veröffentlichung beginnen.',
        statusUnderReview: 'In Überprüfung',
        statusLockedPendingScreening: 'Screening läuft',
        underReviewHint:
          'Ihre Biografie wird überprüft. Kehren Sie hierher zurück, wenn die Überprüfung abgeschlossen ist, um mit dem PDF-Export fortzufahren.',
        lockedPendingScreeningHint:
          'Ihr finales PDF wurde genehmigt und das automatische Screening läuft. Sie werden benachrichtigt, wenn es abgeschlossen ist.',
        screeningPendingHint: 'Automatische Textanalyse läuft…',
        revisionFlaggedHint:
          'Einige Passagen wurden markiert. Bearbeiten Sie die hervorgehobenen Abschnitte im Editor und senden Sie erneut zum Screening, wenn Sie bereit sind.',
        stepAiReviewTitle: 'Optional: narrative KI-Überprüfung',
        stepAiReviewDesc:
          'Erkunden Sie alternative Kapitelreihenfolgen und Erzählstrukturen, die von der KI vorgeschlagen werden, bevor Sie einreichen.',
        stepAiReviewButton: 'KI-Abschlussüberprüfung öffnen',
        stepFreeflowPrepareTitle: 'Endtext für PDF vorbereiten',
        stepFreeflowPrepareDesc:
          'Sperren Sie Ihren Freitext als Endversion, um PDF-Entwürfe mit Wasserzeichen zu starten.',
        stepFreeflowPrepareButton: 'Endtext vorbereiten',
        stepSubmitTitle: 'Schnelleinreichung (Legacy)',
        stepSubmitDesc:
          'Überspringen Sie die PDF-Entwurfsphase und senden Sie direkt zum automatischen Screening. Für druckfertige PDFs nutzen Sie zuerst die Schritte oben.',
        stepSubmitButton: 'Zur Überprüfung einreichen',
        stepPdfDraftTitle: 'PDF-Prüfung starten',
        stepPdfDraftDesc:
          'Erstellen Sie PDF-Entwürfe mit Wasserzeichen, prüfen Sie Layout und Cover und genehmigen Sie die Endversion.',
        stepPdfDraftButton: 'PDF-Prüfung starten',
        stepExportTitle: 'PDF-Entwurf exportieren',
        stepExportDesc: 'Laden Sie Ihren PDF-Entwurf mit Wasserzeichen herunter und prüfen Sie die Vorschau vor der endgültigen Freigabe.',
        stepExportButton: 'Export öffnen',
        stepApproveTitle: 'Endgültiges PDF genehmigen',
        stepApproveDesc: 'Bestätigen Sie, dass das PDF bereit ist, und starten Sie das automatische Inhalts-Screening.',
        stepApproveButton: 'Genehmigen & Screening starten',
        approveDisabledHint:
          'Exportieren Sie mindestens einen PDF-Entwurf mit Wasserzeichen, bevor Sie genehmigen. Öffnen Sie Export, um Ihren ersten Entwurf zu erstellen.',
        approveAiPendingHint:
          'Warten Sie nach dem Export auf die KI-Entwurfsprüfung oder exportieren Sie bei Bedarf einen neuen Entwurf.',
        approveAiSuggestionsHint:
          'Die KI hat in Export Verbesserungen vorgeschlagen. Sie können trotzdem genehmigen, wenn Sie mit diesem Entwurf zufrieden sind.',
        severity3BlockHint:
          'Dieser Entwurf enthält kritische Probleme, die von der KI markiert wurden. Prüfen Sie das Feedback und exportieren Sie einen neuen Entwurf, bevor Sie genehmigen.',
        publishedTitle: 'Veröffentlicht',
        publishedDesc: 'Ihre Biografie hat das Screening bestanden. Sie können das finale PDF jederzeit exportieren.',
        draftProgress: 'Entwürfe erstellt: {count}',
      },
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
      markIncomplete: 'Zur Bearbeitung öffnen',
      sectionCompletedHint: 'Dieser Abschnitt ist als abgeschlossen markiert. Klicken Sie auf «Zur Bearbeitung öffnen», um ihn erneut zu bearbeiten.',
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
      microphoneDenied: 'Mikrofonzugriff verweigert.',
      noSpeechDetected: 'Keine Sprache erkannt. Versuchen Sie es erneut.',
      voiceNetworkError: 'Netzwerkfehler. \u00dcberpr\u00fcfen Sie Ihre Verbindung.',
      voiceServiceUnavailable: 'Sprachdienst nicht verf\u00fcgbar.',
      microphoneNotFound: 'Kein Mikrofon gefunden.',
      voiceUnknownError: 'Spracherkennungsfehler. Versuchen Sie es erneut.',
      voiceNotSupported: 'Spracheingabe wird in diesem Browser nicht unterst\u00fctzt. Versuchen Sie Chrome oder Edge.',
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
      downloadRtf: 'RTF herunterladen',
      downloadTxt: 'TXT herunterladen',
      downloadDocx: 'DOCX herunterladen',
      by: 'Von',
      writtenBy: 'Geschrieben von',
      preservingStories: 'Denn jedes Leben verdient es, in Erinnerung zu bleiben',
      tokenMissing: 'Zugriffstoken fehlt',
      notFoundOrDenied: 'Biografie nicht gefunden oder Zugriff verweigert',
      biographyPrivate: 'Diese Biografie ist privat',
      archivedBanner: 'Diese Biografie wurde archiviert.',
      publishedOn: 'Ver\u00f6ffentlicht',
      reportButton: 'Melden',
      reportModalTitle: 'Diese Biografie melden',
      reportModalSubtitle: 'Helfen Sie uns, die Bibliothek sicher und korrekt zu halten.',
      reportTypeLabel: 'Grund der Meldung',
      reportTypePlaceholder: 'Grund ausw\u00e4hlen...',
      reportDescriptionLabel: 'Zus\u00e4tzliche Details (optional)',
      reportDescriptionPlaceholder: 'Weiteren Kontext angeben...',
      reportSubmit: 'Meldung absenden',
      reportSubmitting: 'Wird gesendet...',
      reportSuccess: 'Meldung erhalten. Unser Team wird sie pr\u00fcfen.',
      reportError: 'Ein Fehler ist aufgetreten. Bitte erneut versuchen.',
      reportTypeLevel1: 'Sch\u00e4dlicher oder illegaler Inhalt',
      reportTypeLevel2: 'Hassrede oder Bel\u00e4stigung',
      reportTypeLivingPerson: 'Diese Person lebt noch',
      reportTypeRightToOblivion: 'Meine pers\u00f6nlichen Daten l\u00f6schen',
      reportTypeImpersonation: 'Falsche Identit\u00e4t',
      reportTypeCopyright: 'Urheberrechtsverletzung',
      reportTypeOther: 'Sonstiges',
      writtenIn: 'Geschrieben in {language}',
      contentRightsNoticeAriaLabel: 'Hinweis zu Urheberrecht und KI-Nutzung',
      contentRightsNoticeParagraph1:
        'Der Text dieser Biografie ist ausschliessliches Eigentum der Autorin oder des Autors, die oder der jedes Recht behält, gegen jede unbefugte Nutzung vorzugehen, einschliesslich der Nutzung zum Training von KI-Systemen.',
      contentRightsNoticeParagraph2:
        'Biography Library untersagt die Nutzung der auf seinen Servern gehosteten Inhalte für Text Mining, KI-Training oder Machine Learning gemäss dem schweizerischen Urheberrechtsgesetz (URG) und dem ausschliesslichen Nutzungsrecht der Autorin oder des Autors nach schweizerischem Recht.',
      pdfOriginalLanguage: 'PDF, TXT und DOCX nur in der Originalsprache verfügbar ({language})',
      downloadsUnavailable:
        'Word- und Text-Downloads sind für diese Biografie nicht verfügbar. Sie können weiterhin die PDF-Schaltfläche oben verwenden.',
      languageSwitcher: 'Lesesprache',
      showOriginal: 'Original',
      readInLanguage: 'Auf {language} lesen',
      translating: 'Übersetzung läuft…',
      translationFailed: 'Übersetzung fehlgeschlagen. Bitte erneut versuchen.',
      languageNameEn: 'Englisch',
      languageNameIt: 'Italienisch',
      languageNameFr: 'Französisch',
      languageNameDe: 'Deutsch',
      galleryPhotos: 'Fotos',
      galleryLightboxTitle: 'Fotogalerie',
      galleryLightboxPrevious: 'Vorheriges Foto',
      galleryLightboxNext: 'Nächstes Foto',
      galleryPhotoCounter: 'Foto {current} von {total}',
      galleryOpenPhoto: 'Foto anzeigen: {caption}',
    },
    footer: {
      hostedInSwitzerland: 'Biography Library - Gehostet in der Schweiz',
      termsOfService: 'AGB',
      privacyPolicy: 'Datenschutz',
      cookiePolicy: 'Cookies',
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
      checkingContent: 'Inhaltsrichtlinien werden \u00fcberpr\u00fcft...',
      publishBlocked: 'Ver\u00f6ffentlichung blockiert. Diese Biografie enth\u00e4lt Inhalte, die gegen unsere Richtlinien versto\u00dfen.',
      publishUnderReview: 'Ihre Biografie wurde zur \u00dcberpr\u00fcfung eingereicht. Sie werden \u00fcber das Ergebnis informiert.',
      tooManyRequests: 'Zu viele Versuche. Bitte eine Minute warten und erneut versuchen.',
      requestFailed: 'Etwas ist schiefgelaufen. Bitte erneut versuchen.',
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
      conversationPending: 'Sie haben eine laufende Sitzung. Fortfahren?',
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
      reviewPeriodTitle: 'Ver\u00f6ffentlichung und Meldungen',
      reviewPeriodText:
        'Nach der Ver\u00f6ffentlichung ist die Gedenkbiografie je nach gew\u00e4hlter Sichtbarkeit sichtbar (privat, nur Link oder \u00f6ffentlich). Jede Leserin und jeder Leser kann eine Meldung einreichen; unser Moderationsteam pr\u00fcft Meldungen und kann bei Bedarf eingreifen.',
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
      titleFreeflow: 'Text importieren',
      titleWithSection: 'Text importieren in {sectionName}',
      titleNoSection: 'Text in Abschnitt importieren',
      description: 'Datei hochladen oder Text einfügen zum Importieren',
      dragFile: 'Datei hierher ziehen oder klicken zum Auswählen',
      dragFileHint: 'Unterstütztes Format: .txt (max 5MB)',
      formats: 'Unterstützte Formate: .txt, .docx, .rtf (max. 5 MB je Datei, bis zu 10 Dateien)',
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
      fileTooLarge: 'Datei zu groß. Maximale Größe: 5 MB',
      docUnsupported: 'Nicht unterstütztes .doc-Format. In .docx oder .txt konvertieren',
      formatUnsupported: 'Nicht unterstütztes Format. Verwenden Sie .txt, .docx oder .rtf',
      tooManyFiles: 'Zu viele Dateien. Maximal 10 pro Import',
      filesQueued: '{count} Datei(en) bereit zum Import',
    },
    importMapping: {
      title: 'Kapitel den Abschnitten zuordnen',
      description: 'Prüfen Sie, wie importierte Kapitel in die Biografie-Abschnitte eingefügt werden.',
      suggestAi: 'Mit KI vorschlagen',
      aiError: 'KI-Vorschlag fehlgeschlagen. Wählen Sie manuell einen Abschnitt.',
      sourceAi: 'KI-Vorschlag',
      sourceTitle: 'Titelabgleich',
      sourceManual: 'Manuell',
      confidenceHigh: 'Hohe Sicherheit',
      confidenceMedium: 'Mittlere Sicherheit',
      confidenceLow: 'Geringe Sicherheit',
      skipBlock: 'Überspringen',
      confirmImport: 'Import bestätigen',
      reviewRequired: 'Einige Blöcke haben geringe Sicherheit. Bitte vor dem Import prüfen.',
      untitledBlock: 'Block ohne Titel',
    },
    notesAndTodos: {
      title: 'Notizen & Erinnerungen',
      recordAudio: 'Audio aufnehmen',
      importText: 'Text importieren',
      exportText: 'Text exportieren',
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
      editTodo: 'Bearbeiten',
      deleteTodo: 'Löschen',
      confirmDelete: 'Löschen bestätigen',
      confirmDeleteNote: 'Diese Notiz löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
      confirmDeleteTodo: 'Diese Erinnerung löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
      sortBy: 'Sortieren nach',
      sortByDate: 'Hinzufügedatum',
      sortByPriority: 'Priorität',
      sortByDueDate: 'Fälligkeitsdatum',
      globalTitle: 'Notizen & Erinnerungen',
      notesAndTodosMenuItem: 'Notizen & Erinnerungen',
    },
    aiReview: {
      title: 'KI-Abschnittsüberprüfung',
      reviewButton: 'Überprüfen',
      suggestionsTab: 'Vorschläge',
      rewriteTab: 'Vollständige Umschreibung',
      rewriteDesc: 'Eine Überarbeitung, die den Fluss zwischen den Abschnitten verbessert und alle Fakten sowie Ihre Stimme bewahrt.',
      rewriteVersionLabel: 'Version {n}',
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
      appliedRewrite: 'Überarbeitung auf den Abschnitt angewendet',
      apertusButton: 'Lektüre mit Schweizer KI',
      apertusTitle: 'Lektüre mit Schweizer KI',
      apertusSubtitle: 'Redaktionelles Feedback zu «{section}» via Apertus (Schweizer Open-Source-KI)',
      apertusLoading: 'Apertus liest Ihren Abschnitt…',
      apertusError: 'Lektüre mit Schweizer KI nicht verfügbar. Bitte später erneut versuchen.',
      apertusModelNote: 'Modell: {model}',
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
      successToastBio: 'Ihre Biografie wurde gelöscht.',
      errorDeleteBio: 'Biografie konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.',
      successMessageAccount: 'Ihr Konto wurde gelöscht',
    },
    aiUsage: {
      dailyLimit: '40 Aktionen/Tag',
      weeklyLimit: '150 Aktionen/Woche',
      dailyLimitReached: 'Tägliches KI-Limit erreicht',
      weeklyLimitReached: 'Wöchentliches KI-Limit erreicht',
      dailyLimitDetail: 'Sie haben alle 40 KI-Aktionen für heute aufgebraucht. Das Limit wird um Mitternacht UTC zurückgesetzt.',
      weeklyLimitDetail: 'Sie haben alle 150 KI-Aktionen für diese Woche aufgebraucht. Das Limit wird am Montag zurückgesetzt.',
      resetsAt: 'Zurücksetzen um',
      today: 'Heute',
      thisWeek: 'Diese Woche',
      usageIndicatorTitle: 'KI-Nutzung',
      unlimited: 'Unbegrenzt',
    },
    photos: {
      panelTitle: 'Fotos',
      counter: '{count}/{max} Fotos',
      uploadButton: 'Foto hochladen',
      captionPlaceholder: 'Bildunterschrift hinzufügen...',
      layoutLabel: 'Layout',
      layoutFullPage: 'Ganze Seite',
      layoutCover: 'Titelseite',
      layoutTwoVertical: 'Zwei Fotos — übereinander',
      layoutTwoHorizontal: 'Zwei Fotos — gestapelt (Paar)',
      layoutThreeMixed: 'Drei Fotos — breit oben, zwei unten',
      coverCompositeTitle: 'Titelbild (Titelseite)',
      customA5CoverLabel: 'Benutzerdefiniertes A5-Cover (176×250mm)',
      customA5CoverHint:
        'Laden Sie ein fertig gestaltetes Bild im A5-Format hoch (176×250mm, 300dpi empfohlen). Bei abweichenden Proportionen wird es angepasst.',
      galleryPhotosHeading: 'Fotogalerie',
      deleteButton: 'Foto löschen',
      deleteConfirmTitle: 'Foto löschen',
      deleteConfirmMessage: 'Möchten Sie dieses Foto wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
      uploadProgress: 'Wird hochgeladen...',
      fileTooLarge: 'Datei zu groß. Maximale Größe ist 5 MB.',
      invalidFileType: 'Ungültiger Dateityp. Bitte laden Sie ein JPG-, PNG- oder WEBP-Bild hoch.',
      uploadError: 'Foto konnte nicht hochgeladen werden. Bitte versuchen Sie es erneut.',
      limitReached: 'Sie haben das Maximum von {max} Fotos pro Biografie erreicht.',
      deleteError: 'Foto konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.',
      viewGrid: 'Miniaturansicht',
      viewDetail: 'Detailansicht',
      gridEditHint: 'Ziehen zum Sortieren. Foto anklicken für Bildunterschrift und Layout.',
    },
    admin: {
      freezeBiography: 'Biografie einfrieren',
      freezeConfirmTitle: 'Diese Biografie einfrieren?',
      freezeConfirmMessage: 'Dadurch wird die Biografie für den Autor vollständig schreibgeschützt. Diese Aktion kann nicht über den Editor rückgängig gemacht werden.',
      freezing: 'Einfrieren...',
      frozenBannerTitle: 'Diese Biografie wurde eingefroren',
      frozenBannerMessage: 'Diese Biografie ist schreibgeschützt und kann nicht bearbeitet werden.',
      moderationTitle: 'Moderation',
      moderationSubtitle: 'Nutzer-Meldungen und gemeldete Inhalte — f\u00fcr KI-Autorenpr\u00fcfung siehe Pr\u00fcfung',
      moderationUnassignedBadge: 'nicht zugewiesen',
      filterStatus: 'Status',
      filterType: 'Typ',
      filterSort: 'Sortieren',
      filterAll: 'Alle',
      statusUnassigned: 'Nicht zugewiesen',
      statusAssigned: 'Zugewiesen',
      statusInReview: 'In Prüfung',
      statusDecided: 'Entschieden',
      sortNewest: 'Neueste zuerst',
      sortOldest: 'Älteste zuerst',
      typeLevel1: 'Stufe 1 – Gesperrt',
      typeLevel2: 'Stufe 2 – Prüfung',
      typeLevel3: 'Stufe 3 – Warnung',
      typeUserReport: 'Nutzermeldung',
      typeLivingPerson: 'Lebende Person',
      typeRightToOblivion: 'Recht auf Vergessen',
      typeImpersonation: 'Identitätsmissbrauch',
      typeCopyright: 'Urheberrecht',
      typeOther: 'Sonstiges',
      colDate: 'Datum',
      colType: 'Typ',
      colBiography: 'Biografie',
      colStatus: 'Status',
      colAiSummary: 'KI-Zusammenfassung',
      colActions: 'Aktionen',
      actionOpen: 'Öffnen',
      noReports: 'Keine Meldungen gefunden.',
      loadingReports: 'Meldungen werden geladen…',
      errorLoading: 'Meldungen konnten nicht geladen werden.',
      unknownBiography: 'Biografie ohne Titel',
      unknownAuthor: 'Unbekannter Autor',
      aiNoSummary: 'Keine Zusammenfassung verfügbar',
      panelBiographyInfo: 'Biografie',
      panelReportInfo: 'Meldungsdetails',
      panelActions: 'Moderatoraktionen',
      panelInternalNotes: 'Interne Notizen',
      viewBiography: 'Biografie ansehen',
      biographyStatus: 'Status',
      aiViolationLevel: 'KI-Verstoßstufe',
      aiSummaryFull: 'KI-Analysezusammenfassung',
      flaggedPassages: 'Markierte Passagen',
      flaggedPassageReason: 'Grund',
      flaggedPassageLevel: 'Stufe',
      reporterEmail: 'Gemeldet von',
      reporterReason: 'Grundkategorie',
      reporterDetails: 'Details',
      userReportDetails: 'Meldungsdetails',
      noReportDescription: 'Keine weiteren Angaben.',
      reportedAt: 'Gemeldet am',
      noFlaggedPassages: 'Keine markierten Passagen.',
      reportLockedByOther: 'Diese Meldung wird von {name} bearbeitet.',
      reportLockedByOtherFallback: 'einem anderen Moderator',
      moderationConflictError: 'Ein anderer Moderator hat während Ihrer Prüfung eine Entscheidung abgegeben. Bitte laden Sie die Seite neu.',
      moderationActionError: 'Moderationsaktion konnte nicht abgeschlossen werden.',
      moderationReaderReportHint: 'Lesermeldungen depublizieren die Biografie nicht. Sie bleibt sichtbar, bis Sie sie einfrieren oder entfernen.',
      dismissReportKeepPublished: 'Meldung abweisen (veröffentlicht lassen)',
      confirmDismissReport: 'Diese Meldung abweisen?',
      confirmDismissReportDetail: 'Die Biografie bleibt veröffentlicht. Der Autor wird nicht benachrichtigt.',
      notifyReportDismissed: 'Eine Lesermeldung zu Ihrer Biografie wurde geprüft und abgewiesen.',
      freezeAndNotifyAuthor: 'Einfrieren und Autor benachrichtigen',
      confirmFreezeAndNotify: 'Einfrieren und Autor benachrichtigen?',
      confirmFreezeAndNotifyDetail: 'Die Biografie bleibt veröffentlicht, wird für den Autor aber schreibgeschützt. Ihre Nachricht wird gesendet.',
      notifyFrozenFromReport: 'Ihre Biografie wurde nach einer Lesermeldung eingefroren. Bitte prüfen Sie Ihre Benachrichtigungen.',
      moderationFreezeWhileReviewingDetail: 'Die Biografie wird für den Autor schreibgeschützt und die Meldung wird geschlossen.',
      takeOwnership: 'Übernehmen',
      takingOwnership: 'Wird übernommen…',
      approveAndPublish: 'Genehmigen und veröffentlichen',
      publishWithWarning: 'Mit Warnung veröffentlichen',
      returnToAuthor: 'An Autor zurückgeben',
      removeBiography: 'Biografie entfernen',
      messageToAuthor: 'Nachricht an den Autor',
      messageToAuthorPlaceholder: 'Erläutern Sie, was korrigiert werden muss…',
      confirmApprove: 'Genehmigen und veröffentlichen?',
      confirmApproveDetail: 'Die Biografie wird veröffentlicht und der Autor wird benachrichtigt.',
      confirmPublishWarning: 'Mit Warnung veröffentlichen?',
      confirmPublishWarningDetail: 'Die Biografie wird veröffentlicht, aber der Autor erhält eine Erinnerung zu den Inhaltsrichtlinien.',
      confirmReturn: 'An Autor zurückgeben?',
      confirmReturnDetail: 'Die Biografie wird als Entwurf zurückgesetzt und der Autor erhält Ihre Nachricht.',
      confirmRemove: 'Biografie entfernen?',
      confirmRemoveDetail: 'Die Biografie wird dauerhaft entfernt. Der Autor wird benachrichtigt. Diese Aktion kann nicht rückgängig gemacht werden.',
      confirmAction: 'Bestätigen',
      cancelAction: 'Abbrechen',
      internalNotesPlaceholder: 'Interne Notizen hinzufügen (für Benutzer nicht sichtbar)…',
      saveNotes: 'Notizen speichern',
      savingNotes: 'Wird gespeichert…',
      notesSaved: 'Notizen gespeichert',
      notifyPublished: 'Ihre Biografie wurde geprüft und veröffentlicht.',
      notifyPublishedWarning: 'Ihre Biografie wurde veröffentlicht. Bitte lesen Sie unsere Inhaltsrichtlinien.',
      notifyReturned: 'Ihre Biografie wurde zur Überarbeitung zurückgegeben.',
      notifyRemoved: 'Ihre Biografie wurde wegen Verstoßes gegen unsere Inhaltsrichtlinien entfernt.',
      assignedToYou: 'Ihnen zugewiesen',
      assignedToOther: 'Einem anderen Prüfer zugewiesen',
      usersTitle: 'Benutzerverwaltung',
      usersSubtitle: 'Benutzerrollen und Konten verwalten',
      usersNavLink: 'Benutzer',
      usersSearchPlaceholder: 'Nach Name oder E-Mail suchen…',
      usersColAvatar: 'Avatar',
      usersColName: 'Name',
      usersColEmail: 'E-Mail',
      usersColRole: 'Rolle',
      usersColJoined: 'Beigetreten',
      usersColBiographies: 'Biografien',
      usersColActions: 'Aktionen',
      usersSaveRole: 'Rolle speichern',
      usersRoleUser: 'Benutzer',
      usersRoleReviewer: 'Prüfer',
      usersRoleAdmin: 'Admin',
      usersRoleSuperAdmin: 'Super Admin',
      usersChangeRoleTitle: 'Rolle ändern',
      usersChangeRoleMessage: "Rolle von {name} von {old} zu {new} ändern?",
      usersChangeRoleFrom: 'von',
      usersChangeRoleTo: 'zu',
      usersRoleUpdated: 'Rolle erfolgreich aktualisiert',
      usersCannotChangeSelf: 'Sie können Ihre eigene Rolle nicht ändern.',
      usersCannotChangeSelfTooltip: 'Sie können Ihre eigene Rolle nicht ändern',
      usersPrev: 'Zurück',
      usersNext: 'Weiter',
      usersPageOf: 'von',
      usersAccessDenied: 'Zugriff verweigert',
      usersAccessDeniedMessage: 'Diese Seite ist nur für Super-Administratoren zugänglich.',
      usersPageRestrictedToAdmins: 'Diese Seite ist nur für Administratoren zugänglich.',
      usersRedirectingIn: 'Weiterleitung in',
      usersLoadError: 'Benutzer konnten nicht geladen werden.',
      usersColStatus: 'Konto',
      usersStatusActive: 'Aktiv',
      usersStatusSuspended: 'Gesperrt',
      usersSuspend: 'Sperren',
      usersReinstate: 'Wiederherstellen',
      usersDeleteUser: 'Benutzer löschen',
      usersConfirmSuspendTitle: 'Dieses Konto sperren?',
      usersConfirmSuspendDetail:
        'Der Benutzer wird abgemeldet, kann sich nicht anmelden und die öffentliche Biografie wird ausgeblendet. Eine E-Mail wird gesendet.',
      usersConfirmReinstateTitle: 'Dieses Konto wiederherstellen?',
      usersConfirmReinstateDetail: 'Der Benutzer kann sich wieder anmelden. Eine E-Mail wird gesendet.',
      usersConfirmDeleteTitle: 'Diesen Benutzer dauerhaft löschen?',
      usersConfirmDeleteDetail:
        'Konto und zugehörige Daten werden entfernt. Nicht rückgängig zu machen. Eine E-Mail wird gesendet.',
      usersToastSuspended: 'Konto gesperrt.',
      usersToastReinstated: 'Konto wiederhergestellt.',
      usersToastDeleted: 'Benutzer gelöscht.',
      usersActionFailed: 'Aktion fehlgeschlagen. Bitte erneut versuchen.',
      usersReviewerLanguages: 'Prüfsprachen',
      usersReviewerLanguagesSaved: 'Prüfersprachen aktualisiert.',
      usersReviewerLanguagesError: 'Prüfersprachen konnten nicht aktualisiert werden.',
      overviewTitle: 'Admin-Übersicht',
      overviewSubtitle: 'Plattformzustand und wichtige Statistiken auf einen Blick',
      navOverview: 'Übersicht',
      navModeration: 'Moderation',
      navBiographies: 'Biografien',
      navPublicCatalog: 'Öffentlicher Katalog',
      navReview: 'Überprüfungswarteschlange',
      navUsers: 'Benutzer',
      navAiStats: 'KI-Statistiken',
      reviewPageTitle: 'Biografien-Überprüfungswarteschlange',
      reviewPageSubtitle:
        'Warteschlange Autorenrevision nach KI-Screening — ohne Leser-Meldungen (siehe Moderation).',
      reviewColSubject: 'Person',
      reviewColTitle: 'Titel',
      reviewColAuthor: 'Autor',
      reviewColLanguage: 'Sprache',
      reviewColType: 'Typ',
      reviewColSubmitted: 'Eingereicht am',
      reviewColRead: 'Lesen',
      reviewColActions: 'Aktionen',
      reviewApprove: 'Genehmigen',
      reviewReject: 'Ablehnen',
      reviewConfirmReject: 'Ablehnung bestätigen',
      reviewCancelReject: 'Abbrechen',
      reviewReasonLabel: 'Ablehnungsgrund',
      reviewReasonPlaceholder: 'Erklären Sie, warum die Biografie zur Überarbeitung zurückgesendet wird…',
      reviewReasonRequired: 'Bitte geben Sie einen Grund an (mindestens 10 Zeichen).',
      reviewEmpty: 'Keine Biografien zur Überprüfung',
      reviewEmptySubtitle: 'Alles erledigt! Es befinden sich derzeit keine Biografien in der Überprüfungswarteschlange.',
      reviewLoadError: 'Überprüfungswarteschlange konnte nicht geladen werden.',
      reviewApproveError: 'Biografie konnte nicht genehmigt werden.',
      reviewRejectError: 'Biografie konnte nicht abgelehnt werden.',
      reviewFlaggedPassages: 'markierte Passagen',
      reviewApprovePassage: 'Passage genehmigen',
      reviewRejectPassage: 'Passage ablehnen',
      reviewAllPassagesReviewed: 'Alle Passagen überprüft — bereit zur Entscheidung',
      reviewAiReason: 'KI-Begründung',
      aiStatsPageTitle: 'KI-Nutzungsstatistiken',
      aiStatsPageSubtitle: 'KI-Funktionsnutzung aller Benutzer überwachen',
      aiStatsDataNote: 'Hinweis: Nutzungsdaten werden 30 Tage lang aufbewahrt.',
      aiStatsFilterToday: 'Heute',
      aiStatsFilterLast7: 'Letzte 7 Tage',
      aiStatsFilterLast30: 'Letzte 30 Tage',
      aiStatsFilterAllTime: 'Gesamte Zeit',
      aiStatsTotalRequests: 'Gesamt KI-Anfragen',
      aiStatsUniqueUsers: 'Eindeutige Benutzer',
      aiStatsMostUsedAction: 'Meistgenutzte Aktion',
      aiStatsAvgPerUser: 'Ø Anfragen / Benutzer',
      aiStatsSection1: 'Zusammenfassung',
      aiStatsSection2: 'Nutzung nach Aktionstyp',
      aiStatsSection3: 'Top-Nutzer nach KI-Nutzung',
      aiStatsSection4: 'Tägliche Nutzung (letzte 14 Tage)',
      aiStatsColAction: 'Aktion',
      aiStatsColCount: 'Anfragen',
      aiStatsColName: 'Name',
      aiStatsColEmail: 'E-Mail',
      aiStatsColTotalRequests: 'Gesamtanfragen',
      aiStatsColLastUsed: 'Zuletzt verwendet',
      aiStatsColDate: 'Datum',
      aiStatsColUniqueUsers: 'Eindeutige Benutzer',
      aiStatsNoData: 'Keine Daten für diesen Zeitraum.',
      aiStatsLoadError: 'KI-Statistiken konnten nicht geladen werden.',
      aiStatsNever: 'Nie',
      statTotalUsers: 'Gesamtbenutzer',
      statNewThisWeek: 'Neu diese Woche',
      statActiveThisMonth: 'Aktiv diesen Monat',
      statTotalBiographies: 'Biografien Gesamt',
      statPublished: 'Veröffentlicht',
      statUnderReview: 'In Prüfung',
      statRemoved: 'Entfernt',
      statOpenReports: 'Offene Meldungen',
      statInReview: 'In Prüfung',
      statResolvedThisWeek: 'Diese Woche gelöst',
      sectionUsers: 'Benutzer',
      sectionBiographies: 'Biografien',
      sectionModeration: 'Moderation',
      sectionQuickActions: 'Schnellaktionen',
      quickActionModeration: 'Zur Moderation',
      quickActionUsers: 'Benutzer verwalten',
      quickActionBiographies: 'Biografien ansehen',
      quickActionPublicCatalog: 'Öffentlichen Katalog öffnen',
      quickActionReview: 'Prüfwarteschlange',
      guardAccessDenied: 'Zugriff verweigert',
      guardAccessDeniedMessage: 'Sie haben keine Berechtigung für diesen Bereich.',
      guardRedirectingIn: 'Weiterleitung in {seconds}s…',
      overviewPeriodLast7Days: 'Letzte 7 Tage',
      overviewPeriodLast30Days: 'Letzte 30 Tage',
      overviewParseErrorBanner: '{count} {count, plural, one {Biografie} other {Biografien}} in den letzten 7 Tagen wurden wegen eines Parse-Fehlers ohne KI-Prüfung veröffentlicht. Manuelle Prüfung kann erforderlich sein.',
      overviewViewAffected: 'Betroffene Biografien anzeigen',
      reviewNoLanguages: 'Keine Sprachen zugewiesen — wenden Sie sich an einen Administrator für Prüfaufträge.',
      reviewConflictTitle: 'Ein anderer Prüfer arbeitet an dieser Biografie',
      reviewConflictDescription: 'Ein anderer Prüfer hat diese Biografie geöffnet. Wenn Sie fortfahren, wird dessen Sperre aufgehoben und Ihre Entscheidung übermittelt.',
      reviewConflictCancel: 'Abbrechen',
      reviewConflictProceed: 'Trotzdem fortfahren',
      reviewInReviewLabel: 'In Prüfung',
      reviewUndo: 'Rückgängig',
      reviewPassagesRemaining: '{count} verbleibend',
      reportLockWarning: 'Dieser Bericht ist einem anderen Moderator zugewiesen.',
      usersNoUsersFound: 'Keine Benutzer gefunden',
      bioPageTitle: 'Alle Biografien',
      bioPageSubtitle: 'Alle Biografien im System durchsuchen, filtern und verwalten',
      bioSearchPlaceholder: 'Nach Titel oder Autor suchen…',
      bioFilterStatus: 'Status',
      bioFilterType: 'Typ',
      bioFilterSort: 'Sortieren',
      bioFilterAll: 'Alle',
      bioStatusDraft: 'Entwurf',
      bioStatusPublished: 'Veröffentlicht',
      bioStatusUnderReview: 'In Prüfung',
      bioStatusPdfDraft: 'PDF-Entwurf',
      bioStatusLockedPendingScreening: 'Screening ausstehend',
      bioStatusRemoved: 'Entfernt',
      bioTypeAll: 'Alle Typen',
      bioTypeAutobiography: 'Autobiografie',
      bioTypeDeceased: 'Verstorben',
      bioSortNewest: 'Neueste zuerst',
      bioSortOldest: 'Älteste zuerst',
      bioSortRecentlyPublished: 'Zuletzt veröffentlicht',
      bioSortMostViews: 'Meiste Aufrufe',
      bioColTitle: 'Titel',
      bioColAuthor: 'Autor',
      bioColType: 'Typ',
      bioColStatus: 'Status',
      bioColViews: 'Aufrufe',
      bioColCreated: 'Erstellt',
      bioColPublished: 'Veröffentlicht',
      bioColActions: 'Aktionen',
      bioActionView: 'Ansehen',
      bioNoResults: 'Keine Biografien gefunden.',
      bioLoadError: 'Biografien konnten nicht geladen werden.',
      bioPrev: 'Zurück',
      bioNext: 'Weiter',
      bioPageOf: 'von',
      bioPanelTitle: 'Biografiedetails',
      bioPanelSection1: 'Biografieinfo',
      bioPanelSection2: 'Inhaltsvorschau',
      bioPanelSection3: 'Admin-Aktionen',
      bioPanelAuthor: 'Autor',
      bioPanelEmail: 'E-Mail',
      bioPanelType: 'Typ',
      bioPanelStatus: 'Status',
      bioPanelPrivacy: 'Datenschutz',
      bioPanelCreated: 'Erstellt',
      bioPanelUpdated: 'Aktualisiert',
      bioPanelShareToken: 'Freigabe-Token',
      bioPanelNoContent: 'Keine Inhaltsabschnitte gefunden.',
      bioPanelOpenFull: 'Vollständige Biografie öffnen',
      bioPrivatePrivacy: 'Privat',
      bioFamilyPrivacy: 'Familie',
      bioPublicPrivacy: 'Öffentlich',
      bioActionForcePublish: 'Erzwungen veröffentlichen',
      bioActionSetDraft: 'Als Entwurf setzen',
      bioActionRemove: 'Biografie entfernen',
      bioActionRestore: 'Biografie wiederherstellen',
      bioActionForcePublishConfirm: 'Diese Biografie erzwungen veröffentlichen?',
      bioActionForcePublishDetail: 'Die Biografie wird sofort veröffentlicht und der Autor wird benachrichtigt.',
      bioActionSetDraftConfirm: 'Als Entwurf zurücksetzen?',
      bioActionSetDraftDetail: 'Die Biografie wird als Entwurf zurückgesetzt und der Autor wird benachrichtigt.',
      bioActionRemoveConfirm: 'Diese Biografie entfernen?',
      bioActionRemoveDetail: 'Die Biografie wird für alle Nicht-Staff-Benutzer ausgeblendet. Der Autor wird benachrichtigt. Diese Aktion ist reversibel.',
      bioActionRestoreConfirm: 'Diese Biografie wiederherstellen?',
      bioActionRestoreDetail: 'Die Biografie wird als Entwurf wiederhergestellt und der Autor kann sie überprüfen.',
      bioActionConfirm: 'Bestätigen',
      bioActionCancel: 'Abbrechen',
      bioNotifyForcePublished: 'Ihre Biografie wurde von einem Administrator veröffentlicht.',
      bioNotifySetDraft: 'Ihre Biografie wurde von einem Administrator als Entwurf zurückgesetzt.',
      bioNotifyRemoved: 'Ihre Biografie wurde von einem Administrator entfernt.',
      bioNotifyRestored: 'Ihre Biografie wurde wiederhergestellt. Sie können sie überprüfen und erneut veröffentlichen.',
      bioActionSuccess: 'Aktion erfolgreich abgeschlossen.',
      bioActionError: 'Aktion konnte nicht abgeschlossen werden.',
      bioActionChapterCooldownError: 'Veröffentlichung nicht möglich: Die jährliche Kapitel-Wartezeit ist noch aktiv.',
      bioActionFreeze: 'Biografie einfrieren',
      bioActionUnfreeze: 'Biografie auftauen',
      bioActionFreezeConfirm: 'Diese Biografie einfrieren?',
      bioActionFreezeDetail: 'Die Biografie wird für den Autor schreibgeschützt. Der Autor wird benachrichtigt. Diese Aktion kann rückgängig gemacht werden.',
      bioActionUnfreezeConfirm: 'Diese Biografie auftauen?',
      bioActionUnfreezeDetail: 'Der Autor erhält wieder vollen Bearbeitungszugang. Der Autor wird benachrichtigt.',
      bioNotifyFrozen: 'Ihre Biografie wurde von einem Administrator eingefroren und ist jetzt schreibgeschützt.',
      bioNotifyUnfrozen: 'Ihre Biografie wurde von einem Administrator aufgetaut. Sie können sie wieder bearbeiten.',
      bioStatusFrozen: 'Eingefroren',
    },
    publicBiographies: {
      pageTitle: 'Veröffentlichte Biografien',
      pageSubtitle: 'Entdecken Sie Lebensgeschichten, die mit der Welt geteilt werden.',
      searchPlaceholder: 'Nach Titel oder Autor suchen…',
      filterLanguage: 'Sprache',
      filterType: 'Typ',
      filterAll: 'Alle',
      typeAutobiography: 'Autobiografie',
      typeMemorial: 'Gedenkschrift',
      langAll: 'Alle Sprachen',
      chaptersCount: 'Kapitel',
      publishedOn: 'Veröffentlicht',
      readBiography: 'Biografie lesen',
      noResults: 'Keine Biografien gefunden',
      noResultsSubtitle: 'Versuchen Sie, Ihre Suche oder Filter anzupassen.',
      loading: 'Biografien werden geladen…',
      errorLoading: 'Biografien konnten nicht geladen werden.',
      untitled: 'Biografie ohne Titel',
      unknownAuthor: 'Unbekannter Autor',
      featuredTitle: 'Ausgewählte Geschichten',
      mostReadTitle: 'Meistgelesen',
      discoverTitle: 'Entdecken',
      signIn: 'Anmelden',
      startBiography: 'Biografie starten',
      viewsCount: 'Aufrufe',
      langOriginal: 'Originalsprache',
      langTranslation: 'Verfügbare Übersetzung',
    },
    pwa: {
      installBannerText: 'Biography Library zum Startbildschirm hinzufügen',
      installButton: 'Installieren',
      dismissButton: 'Schließen',
      iosInstallText: "Zum Installieren: Teilen-Taste (\u{1F4E4}) antippen, dann 'Zum Home-Bildschirm'",
    },
    meta: {
      tagline: 'Denn jedes Leben verdient es, in Erinnerung zu bleiben',
    },
    notifications: {
      title: 'Benachrichtigungen',
      empty: 'Sie haben zurzeit keine Benachrichtigungen. Schauen Sie später wieder vorbei.',
      markAllRead: 'Alle als gelesen markieren',
      markAsRead: 'Als gelesen markieren',
      justNow: 'Gerade eben',
      biographyApproved: 'Ihre Biografie wurde genehmigt und veröffentlicht.',
      biographyRejected: 'Ihre Biografie wurde zur Überarbeitung zurückgesandt: ',
      biographyRejectedWithPassages: 'Ihre Biografie muss überarbeitet werden. Markierte Passagen:\n{passages}\nHinweis des Prüfers: {note}',
      biographyAutoPublished: 'Ihre Biografie wurde automatisch geprüft und veröffentlicht.',
      reviewAssigned: 'Eine Biografie wurde Ihnen zur Überprüfung zugewiesen.',
    },
    errors: {
      title: 'Etwas ist schiefgelaufen',
      description: 'Ein unerwarteter Fehler ist aufgetreten. Ihre Arbeit wurde automatisch gespeichert.',
      tryAgain: 'Erneut versuchen',
      goToDashboard: 'Zum Dashboard',
    },
    settings: {
      biographyType: {
        label: 'Biografietyp',
        autobiography: 'Autobiografie',
        memorial: 'Gedenkbuch',
      },
      coverMode: {
        label: 'Deckblatt-Stil',
        graphic: 'Grafisch (Markenfarbe)',
        photo: 'Foto (aus der Galerie)',
        noPhotoWarning: 'Kein Titelbild ausgewählt. Gehen Sie zur Fotogalerie und setzen Sie das Layout eines Fotos auf "Cover".',
      },
      slug: {
        label: 'URL-Kennung',
        helper: 'Wird in der öffentlichen URL verwendet. Nur Kleinbuchstaben, Zahlen und Bindestriche.',
        duplicateError: 'Dieser Slug ist bereits vergeben. Bitte wählen Sie einen anderen.',
      },
      coverPreview: 'Vorschau Titelbild',
      noCoverPhoto: 'Kein Titelfoto',
      goToPhotos: 'In Fotos hinzufügen',
    },
    helpChatbot: {
      title: 'Hilfe',
      placeholder: 'Stellen Sie eine Frage…',
      send: 'Senden',
      loading: 'Ich denke nach…',
      lowConfidence: 'Ich bin nicht 100 % sicher — schauen Sie in die vollständige Anleitung für weitere Details.',
      clearChat: 'Chat leeren',
      openHelp: 'Hilfe öffnen',
      closeHelp: 'Hilfe schließen',
      sessionExpired: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',
      rateLimitError: 'Zu viele Anfragen. Bitte warten Sie einen Moment.',
      genericError: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
      signInRequired: 'Melden Sie sich an, um den Assistenten zu nutzen.',
    },
    onboardingWizard: {
      stepProgress: 'Schritt {current} von {total}',
      typeSubtitle: 'Geben Sie an, für wen diese Biografie ist. Im nächsten Schritt bestätigen Sie Ihre rechtlichen Angaben.',
      accountModelInfo:
        'Jedes Konto verwaltet nur eine Biografie (Autobiografie oder Gedenkbuch — wählen Sie sorgfältig). Für ein weiteres Projekt später erstellen Sie ein separates Konto mit anderer E-Mail. Andere Angehörige können ihre eigene Perspektive auf dieselbe Person mit eigenen Konten schreiben.',
      legalSubtitle: 'Bitte lesen und bestätigen Sie jede Erklärung, um fortzufahren.',
      pathTitle: 'Wie möchten Sie arbeiten?',
      pathSubtitle: 'Wählen Sie Ihren Startweg. Sie können den Ansatz später ändern.',
      pathHint: 'Danach erhalten Sie eine kurze geführte Tour im Editor in Ihrer Sprache.',
      publishReadyDescription: 'Importieren Sie fertigen Text und gehen Sie schnell zur Veröffentlichung und PDF-Export.',
      skipForNow: 'Jetzt überspringen',
      startTour: 'Erstellen und Tour starten',
      resumeIntro: 'Einführung fortsetzen',
      resumeIntroDescription: 'Setzen Sie die geführte Einrichtung dort fort, wo Sie aufgehört haben.',
      reviewIntro: 'Einführung erneut ansehen',
      tourCompleted: 'Tour abgeschlossen — viel Erfolg beim Schreiben!',
      tourSkip: 'Tour überspringen',
      tourNext: 'Weiter',
      tourBack: 'Zurück',
      tourFinish: 'Fertig',
      tourStepOptional: 'Sie können die hervorgehobene Aktion jetzt ausprobieren oder mit Weiter ohne Aktion fortfahren.',
      tourTryStep: 'Ausprobieren',
      tryActionHint: 'Probieren Sie die hervorgehobene Aktion aus, um fortzufahren.',
    },
    onboardingTour: {
      sectionsOverviewTitle: 'Kapitel',
      sectionsOverviewDesc:
        'Ihre Biografie ist in Kapitel gegliedert. Wählen Sie eines aus der Liste, um mit Echo daran zu arbeiten.',
      bookTitleTitle: 'Buchtitel',
      bookTitleDesc: 'Klicken Sie oben auf den Titel, um Ihre Biografie jederzeit umzubenennen.',
      privacyTitle: 'Sichtbarkeit',
      privacyDesc:
        'Diese Schaltfläche zeigt, wer Ihre Biografie sehen kann. Tippen Sie, um zwischen Privat, Familienlink und Öffentlich zu wechseln.',
      echoPanelTitle: 'Mit Echo schreiben',
      echoPanelDesc:
        'Chatten Sie hier mit Echo, um Ihr Kapitel per Text oder Sprache zu entwerfen. Stellen Sie Fragen, holen Sie sich Vorschläge oder einen Entwurf.',
      editSectionTitle: 'Bearbeiten',
      editSectionDesc:
        'Nutzen Sie Bearbeiten, um den Texteditor für dieses Kapitel zu öffnen. Überarbeiten Sie Echos Entwurf, fügen Sie eigenen Text ein oder schreiben Sie direkt — Echo bleibt Ihr Assistent.',
      aiCreditsTitle: 'KI-Guthaben',
      aiCreditsDesc:
        'Dieser Zähler zeigt, wie viele KI-gestützte Aktionen Ihnen heute und diese Woche noch bleiben. Standardkonten haben tägliche und wöchentliche Limits.',
      echoVoiceTitle: 'Echo-Stimme',
      echoVoiceDesc:
        'Nutzen Sie das Lautsprechersymbol, um gesprochene Antworten von Echo ein- oder auszuschalten. Stummgeschaltet antwortet Echo nur per Text.',
      echoVoiceFreeflowTitle: 'Echo-Stimme',
      echoVoiceFreeflowDesc:
        'Öffnen Sie Echo über die schwebende Schaltfläche und nutzen Sie dann das Lautsprechersymbol im Chat zum Stummschalten.',
      notesTitle: 'Notizen & Erinnerungen',
      notesDesc: 'Bewahren Sie hier Recherchenotizen und To-dos auf — getrennt vom veröffentlichten Text.',
      photosTitle: 'Fotos',
      photosDesc: 'Fügen Sie Bilder zur Galerie hinzu und verknüpfen Sie sie bei Bedarf mit Kapiteln.',
      importTextTitle: 'Text importieren',
      importTextDesc: 'Fügen Sie vorhandenen Text aus Word, PDF oder Textdateien ein oder laden Sie ihn hoch.',
      exportTextTitle: 'Text exportieren',
      exportTextDesc: 'Laden Sie Ihre Biografie als TXT oder DOCX herunter oder starten Sie einen PDF-Entwurf zur Überprüfung.',
      bookStructureTitle: 'Buchstruktur',
      bookStructureDesc: 'Legen Sie Cover, Impressum und Layout-Optionen vor dem Export fest.',
      reviewPublicationTitle: 'Überprüfung & Veröffentlichung',
      reviewPublicationDesc:
        'Reichen Sie Ihre Biografie zur Überprüfung ein, prüfen Sie PDF-Entwürfe und veröffentlichen Sie, wenn Sie bereit sind.',
      freeflowEditorTitle: 'Schreibbereich',
      freeflowEditorDesc:
        'Dies ist Ihr Haupt-Schreibbereich. Tippen Sie frei oder fügen Sie importierten Text ein, dann nutzen Sie die Werkzeuge im Seitenpanel.',
      echoBubbleTitle: 'Echo-Assistent',
      echoBubbleDesc:
        'Tippen Sie unten rechts auf Echo, um den KI-Assistenten beim Schreiben zu öffnen.',
      publishImportTitle: 'Text importieren',
      publishImportDesc: 'Bringen Sie Ihre fertige Biografie über Import auf die Plattform.',
      publishFinalTitle: 'Endversion',
      publishFinalDesc: 'Feilen Sie hier am Text, bevor Sie zu PDF-Entwürfen und Veröffentlichung übergehen.',
      publishExportTitle: 'Export',
      publishExportDesc: 'Exportieren Sie einen PDF-Entwurf oder eine Textkopie, um das Buch zu prüfen.',
      mobileMenuTitle: 'Kapitel- und Werkzeugmenü',
      mobileMenuDesc:
        'Auf Smartphone und Tablet tippen Sie auf das Menüsymbol oben rechts in der Editor-Leiste, um Kapitel und Werkzeuge zu öffnen. Die Tour öffnet dieses Panel in den nächsten Schritten automatisch.',
      mobileSidebarOverviewHint:
        'Kapitelliste und Werkzeuge befinden sich in diesem Panel. Auf Smartphone und Tablet öffnen Sie es mit der Menütaste oben rechts in der Editor-Leiste.',
    },
    echo: {
      hubEmpty: 'Hallo! Ich bin Echo. Ich begleite Sie bei Ihrer Biografie — per Sprache oder Text.',
      resumeBiography: 'Fortsetzen: {title}',
      resumeButton: 'Biografie fortsetzen',
      newGuided: 'Erzählen Sie mit Echo, Ihrer persönlichen KI, die Sie Schritt für Schritt begleitet.',
      newImport: 'Ich habe bereits Text zum Importieren',
      newPublishOnly: 'Vorhandenen Text zur Veröffentlichung vorbereiten',
      myBiographies: 'Meine Biografien',
      pickBiography: 'Biografie wählen',
      untitledBiography: 'Ohne Titel',
      inputPlaceholder: 'Tippen oder Mikrofon nutzen…',
      statusListening: 'Ich höre zu…',
      statusSpeaking: 'Ich spreche…',
      statusThinking: 'Ich denke nach…',
      statusFormulatingReply: 'Ich erstelle die Antwort…',
      statusWelcome: 'Tippen oder Mikrofon — ich begleite Sie',
      statusReady: 'Bereit für Ihre nächste Frage',
      statusVoiceMuted: 'Nur Text — Stimme aus',
      statusPreparingReply: 'Ich bereite eine Antwort vor…',
      statusReadingMessage: 'Ich lese Ihre Nachricht…',
      statusWriting: 'Ich schreibe…',
      statusStillWorking: 'Das dauert etwas länger als sonst…',
      statusSlowApology: 'Entschuldigen Sie die Wartezeit — gleich fertig…',
      statusLoadingHistory: 'Gespräch wird geladen…',
      statusLoadingOlder: 'Frühere Nachrichten werden geladen…',
      errorGeneric: 'Etwas ist schiefgelaufen. Bitte erneut versuchen.',
      openEcho: 'Echo fragen',
      closeEcho: 'Schließen',
      aiToolsMenu: 'KI-Werkzeuge',
      changePath: 'Schreibweg wechseln',
      changePathTitle: 'Schreibweg ändern',
      changePathDescription: 'Ihr Inhalt bleibt erhalten. Sie können vorher exportieren.',
      exportBeforeChange: 'Zuerst Kopie exportieren',
      confirmPathChange: 'Konvertieren und fortfahren',
      onboardingWelcome: 'Willkommen bei Biography Library. Ich bin Echo — legen wir los.',
      pathChanged: 'Schreibweg aktualisiert.',
      concentrationMode: 'Konzentrationsmodus',
      exitConcentration: 'Konzentrationsmodus beenden',
      consultEcho: 'Echo',
      stopSpeaking: 'Stoppen',
      muteVoice: 'Echo-Stimme stummschalten',
      unmuteVoice: 'Echo-Stimme aktivieren',
      speakingBanner: 'Echo liest vor…',
      activeSectionContext: 'Sie arbeiten an: {section}',
      sectionSwitchPrefix: '[Aktiver Abschnitt: «{section}»]',
      icebreakerHint: 'Sie können zum Beispiel fragen:',
      icebreakerDefaultSection: 'dieses Kapitel',
      insertDraftPrompt: 'Diesen Text in den Editor einfügen?',
      insertDraftConfirm: 'In den Editor einfügen',
      insertDraftDismiss: 'Später',
      insertDraftDone: 'Text im Editor eingefügt.',
      insertDraftCardTitle: 'Entwurf für {section}',
      insertDraftCardSubtitle: 'Lesen Sie den Text unten, dann fügen Sie ihn in die Biografie ein.',
      insertDraftLater: 'Später',
      insertDraftShowPreview: 'Vollständige Vorschau anzeigen',
      insertDraftHidePreview: 'Vorschau einklappen',
      insertDraftReady: 'Entwurf bereit',
      insertDraftSectionMismatch: 'Wird eingefügt in: {section} (nicht das aktuell angezeigte Kapitel).',
      insertDraftSuccessTitle: 'Text eingefügt',
      insertDraftSuccessBody: 'Der Entwurf wurde dem Editor hinzugefügt. Sie können ihn jederzeit überarbeiten.',
      insertDraftOpenEditor: 'Editor öffnen',
      insertDraftDialogTitle: 'Entwurf eingefügt',
      insertDraftDialogDescription: 'Der Text wurde zu {section} hinzugefügt. Öffnen Sie den Editor zur Kontrolle.',
      insertDraftContinueChat: 'Im Chat fortfahren',
      insertDraftPendingBadge: '{count} Entwurf einzufügen',
      loadOlderMessages: 'Ältere Nachrichten laden',
      loadingOlderMessages: 'Laden…',
      ...getEchoGuideCopy('de'),
      icebreakerPools: getEchoIcebreakerPools('de'),
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
