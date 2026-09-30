'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { ReportDeadlineBanner } from '@/components/editor/ReportDeadlineBanner';
import { SectionSidebar } from '@/components/editor/section-sidebar';
import { PathChangeDialog } from '@/components/echo/PathChangeDialog';
import { GuidedSectionWorkspace } from '@/components/echo/GuidedSectionWorkspace';
import { EchoShell } from '@/components/echo/EchoShell';
import { OnboardingTourProvider } from '@/components/onboarding/OnboardingTourProvider';
import { useOnboardingGate } from '@/components/onboarding/OnboardingGateProvider';
import {
  EDITOR_SIDEBAR_STATE_EVENT,
  EDITOR_SIDEBAR_TOGGLE_EVENT,
} from '@/lib/onboarding/tour-mobile';
import type { WritingPath } from '@/lib/onboarding/types';
import { GlobalNotesPanel } from '@/components/editor/GlobalNotesPanel';
import { BookStructureDialog } from '@/components/editor/BookStructureDialog';
import { AiSuggestionsDialog } from '@/components/editor/ai-suggestions-panel';
import { ShareLinkPanel } from '@/components/editor/share-link-panel';
import { PhotoGalleryDialog } from '@/components/editor/PhotoGalleryDialog';
import { ImportTextDialog } from '@/components/editor/import-text-dialog';
import { FinalReviewDialog } from '@/components/editor/FinalReviewDialog';
import { ReviewPublicationDialog } from '@/components/editor/ReviewPublicationDialog';
import { FinalVersionEditor } from '@/components/editor/FinalVersionEditor';
import { SubmitForReviewDialog } from '@/components/editor/SubmitForReviewDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  BIOGRAPHY_SECTIONS,
  type BiographyContent,
  getEmptyContent,
  getSectionData,
  lastBiographyEditorModeStorageKey,
} from '@/lib/editor-constants';
import {
  appendChapter,
  composeSingleDocument,
  listChapterAnchors,
} from '@/lib/editor/single-document';
import { INITIAL_AI_STATE, type AiPanelState } from '@/lib/ai-constants';
import { checkGrammar, AiLimitError } from '@/lib/grammar-service';
import {
  REOPEN_SECTION_PAYLOAD,
  buildEditorSavePayload,
  buildFinalVersionPayload,
  buildLicenseChoicePayload,
  buildMarkCompletePayload,
} from '@/lib/editor/write-payloads';
import { toast } from 'sonner';
import type { Biography, BiographyPublicationStatus } from '@/lib/biographies';
import { canAuthorWriteText, isBiographyPublicationStatus, isReviewOrScreeningLockStatus } from '@/lib/publication-state';
import { generateBiographyPDF, checkBiographyPdfReadiness, checkPdfPreflight, getPdfReadinessMessage } from '@/lib/pdf-export';
import { AdvancedExportDialog } from '@/components/export/AdvancedExportDialog';
import { LicenseChoiceDialog } from '@/components/editor/LicenseChoiceDialog';
import { AuthorLicensePanel } from '@/components/editor/AuthorLicensePanel';
import { PermanenceDialog } from '@/components/editor/PermanenceDialog';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { LICENSE_BY_NC_SA_4, type ContentLicenseUri } from '@/lib/rights';
import { storedToArchiveMarkdown } from '@/lib/archive-markdown';
import { stripHtmlTags } from '@/lib/export-utils';
import { Loader as Loader2, Sparkles, Snowflake as SnowflakeIcon, Send as SendIcon, TriangleAlert, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  markSectionComplete,
  markSectionIncomplete,
  getCompletedSections,
} from '@/lib/section-completion-service';
import { buildBiographyNarrativeContext } from '@/lib/biography-narrative-context';
import { ChapterCooldownBanner } from '@/components/dashboard/ChapterCooldownBanner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getChapterCooldownState } from '@/lib/biography-chapter-cooldown';

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

const AI_ENABLED_KEY = 'biography-ai-enabled';

function EditorOnboardingTour({
  active,
  writingPath,
  biographyMode,
  biographyType,
  onOpenMobileSidebar,
  onCloseMobileSidebar,
  onTourFinished,
}: {
  active: boolean;
  writingPath: WritingPath;
  biographyMode: 'sections' | 'freeflow';
  biographyType: 'autobiography' | 'memorial';
  onOpenMobileSidebar: () => void;
  onCloseMobileSidebar: () => void;
  onTourFinished: () => void;
}) {
  return (
    <OnboardingTourProvider
      active={active}
      writingPath={writingPath}
      biographyMode={biographyMode}
      biographyType={biographyType}
      onOpenMobileSidebar={onOpenMobileSidebar}
      onCloseMobileSidebar={onCloseMobileSidebar}
      onFinished={onTourFinished}
    />
  );
}

export default function BiographyEditorPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { t, language } = useTranslation();
  const { onboardingState, refreshOnboarding } = useOnboardingGate();
  const id = params.id as string;

  const tourActive =
    searchParams?.get('tour') === '1' || onboardingState?.onboarding_phase === 'tour';
  const tourWritingPath: WritingPath =
    (onboardingState?.onboarding_writing_path as WritingPath | null) ?? 'sections';

  const handleTourFinished = useCallback(() => {
    void refreshOnboarding();
    const next = new URLSearchParams(searchParams?.toString() ?? '');
    next.delete('tour');
    const q = next.toString();
    router.replace(q ? `/biography/${id}/edit?${q}` : `/biography/${id}/edit`);
  }, [id, refreshOnboarding, router, searchParams]);

  const [biography, setBiography] = useState<Biography | null>(null);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenLoading, setReopenLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'link-only' | 'public'>(
    'private'
  );
  const [rightsStatementUri, setRightsStatementUri] = useState<string | null>(null);
  const [recordLanguageTag, setRecordLanguageTag] = useState<string | null>(null);
  const [recordScript, setRecordScript] = useState<string | null>('Latn');
  const [licenseDialogOpen, setLicenseDialogOpen] = useState(false);
  const [licenseDialogMode, setLicenseDialogMode] = useState<'initial' | 'upgrade'>('initial');
  const [licenseBusy, setLicenseBusy] = useState(false);
  const [status, setStatus] = useState<'draft' | 'sections_complete'>('draft');
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [content, setContent] = useState<BiographyContent>(getEmptyContent());
  const [activeSection, setActiveSection] = useState<string>(
    BIOGRAPHY_SECTIONS[0].key
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  useEffect(() => {
    const onToggle = () => setShowMobileSidebar((open) => !open);
    window.addEventListener(EDITOR_SIDEBAR_TOGGLE_EVENT, onToggle);
    return () => window.removeEventListener(EDITOR_SIDEBAR_TOGGLE_EVENT, onToggle);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(EDITOR_SIDEBAR_STATE_EVENT, { detail: showMobileSidebar }));
  }, [showMobileSidebar]);
  const [showGlobalNotesPanel, setShowGlobalNotesPanel] = useState(false);
  const [showPhotosPanel, setShowPhotosPanel] = useState(false);
  const [showBookStructurePanel, setShowBookStructurePanel] = useState(false);
  const [showPermanencePanel, setShowPermanencePanel] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(() => searchParams?.get('import') === '1');
  const [globalNotesCount, setGlobalNotesCount] = useState(0);
  const [globalTodosCount, setGlobalTodosCount] = useState(0);
  const [editorFontSize, setEditorFontSize] = useState<number>(15);

  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiState, setAiState] = useState<AiPanelState>(INITIAL_AI_STATE);

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [showFinalReview, setShowFinalReview] = useState(false);
  const [showReviewPublicationDialog, setShowReviewPublicationDialog] = useState(false);
  const [finalVersion, setFinalVersion] = useState<string>('');
  const [narrativeOrder, setNarrativeOrder] = useState<string[]>([]);
  const [biographyStatus, setBiographyStatus] = useState<BiographyPublicationStatus>('draft');
  const [pdfDraftIteration, setPdfDraftIteration] = useState<number | null>(null);
  const [draftAiFeedback, setDraftAiFeedback] = useState<{
    ready_for_publication?: boolean;
    red_flags?: Array<{ severity?: number }>;
    aiError?: boolean;
  } | null>(null);
  const [publicationActionLoading, setPublicationActionLoading] = useState<
    'start' | 'approve' | 'prepare' | null
  >(null);
  const [publicationActionError, setPublicationActionError] = useState<string | null>(null);
  const [showSubmitForReviewDialog, setShowSubmitForReviewDialog] = useState(false);
  const [isSubmittingForReview, setIsSubmittingForReview] = useState(false);
  const [submitReadinessError, setSubmitReadinessError] = useState<string | null>(null);
  const [submitPreflightError, setSubmitPreflightError] = useState<string | null>(null);
  const [isPreflightChecking, setIsPreflightChecking] = useState(false);
  const [aiScreeningResult, setAiScreeningResult] = useState<
    'passed' | 'flagged' | 'pending' | 'ai_error' | 'parse_error' | null
  >(null);
  const [aiLimitError, setAiLimitError] = useState<AiLimitError | null>(null);
  const [aiUsageRefresh, setAiUsageRefresh] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  const [biographyMode, setBiographyMode] = useState<'sections' | 'freeflow'>('sections');
  const [contentFreeflow, setContentFreeflow] = useState<string>('');
  const [echoChangeHighlight, setEchoChangeHighlight] = useState<{ id: number; text: string } | null>(null);
  const [undoSheet, setUndoSheet] = useState<string | null>(null);
  const [pendingModeSwitch, setPendingModeSwitch] = useState<'sections' | 'freeflow' | null>(null);
  const [authorName, setAuthorName] = useState<string>('');
  const [biographyType, setBiographyType] = useState<'autobiography' | 'memorial'>('autobiography');
  const [slug, setSlug] = useState<string | null>(null);
  const [revisionPassages, setRevisionPassages] = useState<Array<{ section_key: string; ai_reason: string }>>([]);
  const [revisionNote, setRevisionNote] = useState<string | null>(null);
  const [revisionBannerDismissed, setRevisionBannerDismissed] = useState(false);

  const editorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProfilePreferences = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('ai_features_enabled')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setAiEnabled(data.ai_features_enabled);
        localStorage.setItem(AI_ENABLED_KEY, String(data.ai_features_enabled));
      }
    };

    loadProfilePreferences();
  }, [user]);

  const dirtyRef = useRef(false);
  const applyingEchoDraftRef = useRef(false);
  const contentRef = useRef(content);
  const titleRef = useRef(title);
  const privacyRef = useRef(privacy);
  const biographyModeRef = useRef(biographyMode);
  const contentFreeflowRef = useRef(contentFreeflow);
  const slugRef = useRef(slug);
  const authorNameRef = useRef(authorName);
  const biographyTypeRef = useRef(biographyType);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  useEffect(() => {
    privacyRef.current = privacy;
  }, [privacy]);
  useEffect(() => {
    biographyModeRef.current = biographyMode;
  }, [biographyMode]);
  useEffect(() => {
    contentFreeflowRef.current = contentFreeflow;
  }, [contentFreeflow]);

  useEffect(() => {
    slugRef.current = slug;
  }, [slug]);

  useEffect(() => {
    authorNameRef.current = authorName;
  }, [authorName]);

  useEffect(() => {
    biographyTypeRef.current = biographyType;
  }, [biographyType]);

  useEffect(() => {
    if (!id || !biographyMode) return;
    try {
      localStorage.setItem(lastBiographyEditorModeStorageKey(id), biographyMode);
    } catch {
      /* ignore quota / private mode */
    }
  }, [id, biographyMode]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      const { data } = await supabase
        .from('biographies')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (data) {
        setBiography(data);
        const loadedType = (data.biography_type as 'autobiography' | 'memorial') || 'autobiography';
        setBiographyType(loadedType);
        setTitle(
          loadedType === 'memorial'
            ? (data.subject_name as string | null)?.trim() || data.title
            : data.title
        );
        setPrivacy((data.visibility as 'private' | 'link-only' | 'public') ?? 'private');
        setRightsStatementUri(
          typeof data.rights_statement_uri === 'string' ? data.rights_statement_uri : null
        );
        setRecordLanguageTag(
          typeof data.record_language_tag === 'string'
            ? data.record_language_tag
            : typeof data.content_language === 'string'
              ? data.content_language
              : null
        );
        setRecordScript(
          typeof data.record_script === 'string' ? data.record_script : 'Latn'
        );
        setStatus(data.status || 'draft');
        setBiographyStatus(
          isBiographyPublicationStatus(data.status) ? data.status : 'draft'
        );
        setPdfDraftIteration(
          typeof data.pdf_draft_iteration === 'number' ? data.pdf_draft_iteration : null
        );
        setDraftAiFeedback(
          (data.draft_ai_feedback as {
            ready_for_publication?: boolean;
            red_flags?: Array<{ severity?: number }>;
          } | null) ?? null
        );
        setIsFrozen(data.is_frozen || false);
        setShareToken(data.share_token || null);
        setEditorFontSize(data.editor_font_size || 15);
        setFinalVersion(data.final_version || '');
        setNarrativeOrder((data.narrative_order as string[]) || []);
        const loadedContent =
          data.content && typeof data.content === 'object'
            ? { ...getEmptyContent(), ...(data.content as BiographyContent) }
            : getEmptyContent();
        const storedFlow = data.content_freeflow || '';
        const sheet = composeSingleDocument(loadedContent, storedFlow, (key) => {
          return t.sectionTitles[key as keyof typeof t.sectionTitles] || key;
        });
        setContent(loadedContent);
        contentRef.current = loadedContent;
        setContentFreeflow(sheet);
        contentFreeflowRef.current = sheet;
        setBiographyMode('freeflow');
        setActiveSection('freeflow');
        if (sheet !== storedFlow || (data.biography_mode || 'sections') !== 'freeflow') {
          dirtyRef.current = true;
          setSaveStatus('unsaved');
        }

        let resolvedAuthorName = data.author_name ?? '';
        if (!resolvedAuthorName.trim() && user) {
          const fallback =
            (user.user_metadata?.name as string | undefined)?.trim() ||
            (user.email ?? '').split('@')[0].trim();
          if (fallback) {
            resolvedAuthorName = fallback;
            await supabase
              .from('biographies')
              .update({ author_name: resolvedAuthorName })
              .eq('id', id);
          }
        }
        setAuthorName(resolvedAuthorName);

        if (data.slug) {
          setSlug(data.slug);
        } else {
          const authorPart = resolvedAuthorName;
          const combined = [authorPart, data.title].filter(Boolean).join(' ');
          const autoSlug = combined
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/-{2,}/g, '-');
          if (autoSlug) {
            await supabase.from('biographies').update({ slug: autoSlug }).eq('id', id);
            setSlug(autoSlug);
          }
        }
        const loaded = data.content as BiographyContent | null;
        if (loaded && typeof loaded === 'object') {
          setContent({ ...getEmptyContent(), ...loaded });
        }
      }
      setIsLoading(false);

      const completed = await getCompletedSections(id);
      setCompletedSections(completed);

      if (data) {
        const screening = data.ai_screening_status as string | null | undefined;
        if (screening === 'passed') setAiScreeningResult('passed');
        else if (screening === 'flagged') setAiScreeningResult('flagged');
        else if (screening === 'pending') setAiScreeningResult('pending');
        else if (screening === 'ai_error') setAiScreeningResult('ai_error');
        else if (screening === 'parse_error') setAiScreeningResult('parse_error');
        else setAiScreeningResult(null);

        if (data.status === 'draft') {
          const { data: report } = await supabase
            .from('moderation_reports')
            .select('moderator_notes')
            .eq('biography_id', id)
            .eq('status', 'decided')
            .eq('decision', 'request_edit')
            .order('decided_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (report?.moderator_notes) {
            const notes = report.moderator_notes as { rejectedPassages?: unknown[]; note?: unknown };
            if (Array.isArray(notes.rejectedPassages) && notes.rejectedPassages.length > 0) {
              setRevisionPassages(notes.rejectedPassages as { section_key: string; ai_reason: string }[]);
              setRevisionNote(typeof notes.note === 'string' ? notes.note : null);
            }
          }
        } else if (data.status === 'under_review' && screening === 'flagged') {
          const { data: openReport } = await supabase
            .from('moderation_reports')
            .select('ai_analysis')
            .eq('biography_id', id)
            .in('status', ['unassigned', 'assigned'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const raw = (openReport?.ai_analysis as { flagged_passages?: unknown } | null)?.flagged_passages;
          if (Array.isArray(raw) && raw.length > 0) {
            setRevisionPassages(
              raw.map((p: { section_key?: string; reason?: string }) => ({
                section_key: typeof p.section_key === 'string' ? p.section_key : 'unknown',
                ai_reason: typeof p.reason === 'string' ? p.reason : '',
              }))
            );
          }
        }
      }
    };
    load();
  }, [user, id]);

  const save = useCallback(async () => {
    if (!id || !dirtyRef.current || applyingEchoDraftRef.current) return;
    dirtyRef.current = false;
    setSaveStatus('saving');
    const isMemorial = biographyTypeRef.current === 'memorial';
    const savePayload = buildEditorSavePayload({
      fields: {
        title: titleRef.current,
        subject_name: isMemorial ? titleRef.current : undefined,
        author_name: authorNameRef.current,
        content: contentRef.current,
        content_freeflow: contentFreeflowRef.current,
        name_as_written: titleRef.current,
      },
      isMemorial,
      visibility: privacyRef.current,
      biographyMode: biographyModeRef.current,
    });
    const { error } = await supabase
      .from('biographies')
      .update(savePayload)
      .eq('id', id);
    if (error) {
      setSaveStatus('error');
      dirtyRef.current = true;
    } else {
      setSaveStatus('saved');
    }
  }, [id]);

  const flushEditorSave = useCallback(async () => {
    if (!id || !dirtyRef.current) return;
    dirtyRef.current = false;
    setSaveStatus('saving');
    const isMemorial = biographyTypeRef.current === 'memorial';
    const savePayload = buildEditorSavePayload({
      fields: {
        title: titleRef.current,
        subject_name: isMemorial ? titleRef.current : undefined,
        author_name: authorNameRef.current,
        content: contentRef.current,
        content_freeflow: contentFreeflowRef.current,
        name_as_written: titleRef.current,
      },
      isMemorial,
      visibility: privacyRef.current,
      biographyMode: biographyModeRef.current,
    });
    const { error } = await supabase
      .from('biographies')
      .update(savePayload)
      .eq('id', id);
    if (error) {
      setSaveStatus('error');
      dirtyRef.current = true;
      throw new Error(error.message);
    }
    setSaveStatus('saved');
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (dirtyRef.current) {
        save();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [save]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (dirtyRef.current) {
        save();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (dirtyRef.current) {
        save();
      }
    };
  }, [save]);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setSaveStatus('unsaved');
  }, []);

  const generateSlugFromTitle = (text: string): string =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

  const handleTitleChange = useCallback(
    async (newTitle: string) => {
      setTitle(newTitle);
      markDirty();
      if (!slugRef.current) {
        const authorPart = authorNameRef.current;
        const combined = [authorPart, newTitle].filter(Boolean).join(' ');
        const newSlug = generateSlugFromTitle(combined);
        if (newSlug) {
          const { error } = await supabase
            .from('biographies')
            .update({ slug: newSlug })
            .eq('id', id);
          if (!error) {
            setSlug(newSlug);
          }
        }
      }
    },
    [id, markDirty]
  );

  const handleAuthorNameChange = useCallback(
    (newName: string) => {
      setAuthorName(newName);
      markDirty();
    },
    [markDirty]
  );

  const handlePrivacyChange = useCallback(
    (newPrivacy: 'private' | 'link-only' | 'public') => {
      if (newPrivacy === 'public' && !rightsStatementUri?.trim()) {
        setLicenseDialogMode('initial');
        setLicenseDialogOpen(true);
        return;
      }
      setPrivacy(newPrivacy);
      markDirty();
      const privacyLabels: Record<'private' | 'link-only' | 'public', string> = {
        private: t.dashboard.private,
        'link-only': t.dashboard.family,
        public: t.dashboard.public,
      };
      toast.success(`${t.biography.privacyLabel}: ${privacyLabels[newPrivacy]}`);
    },
    [markDirty, rightsStatementUri, t]
  );

  const handleLicenseConfirm = useCallback(
    async (licenseUri: ContentLicenseUri) => {
      if (!id) return;
      setLicenseBusy(true);
      try {
        const now = new Date().toISOString();
        const isUpgrade = licenseDialogMode === 'upgrade';
        // One-way only: never write BY-NC-SA over an existing BY-SA
        if (
          isUpgrade &&
          rightsStatementUri &&
          rightsStatementUri !== LICENSE_BY_NC_SA_4
        ) {
          setLicenseDialogOpen(false);
          return;
        }

        const update = buildLicenseChoicePayload({
          licenseUri,
          now,
          authorName: authorNameRef.current,
          isUpgrade,
        });

        const { error } = await supabase
          .from('biographies')
          .update(update)
          .eq('id', id);
        if (error) {
          toast.error(error.message || t.toast.error);
          return;
        }
        setRightsStatementUri(licenseUri);
        if (!isUpgrade) {
          setPrivacy('public');
          toast.success(`${t.biography.privacyLabel}: ${t.dashboard.public}`);
        } else {
          toast.success(t.rightsChoice.optionBySaTitle);
        }
        setLicenseDialogOpen(false);
      } finally {
        setLicenseBusy(false);
      }
    },
    [id, licenseDialogMode, rightsStatementUri, t]
  );

  const handleModeChange = useCallback(
    (mode: 'sections' | 'freeflow') => {
      setBiographyMode(mode);
      markDirty();
    },
    [markDirty]
  );

  const handleModeChangeRequest = useCallback(
    (mode: 'sections' | 'freeflow') => {
      if (mode === biographyMode) return;
      const hasContent = biographyMode === 'freeflow'
        ? (contentFreeflowRef.current?.trim().length ?? 0) > 0
        : Object.values(contentRef.current).some((s: any) => s?.text?.trim().length > 0);
      if (!hasContent) {
        setBiographyMode(mode);
        markDirty();
        return;
      }
      setPendingModeSwitch(mode);
    },
    [biographyMode, markDirty]
  );

  const handleModeSwitchConfirm = useCallback(async () => {
    if (!pendingModeSwitch || !id || !session?.access_token) return;
    const targetMode = pendingModeSwitch;

    const res = await fetch('/api/biography/convert-mode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ biographyId: id, toMode: targetMode }),
    });

    if (!res.ok) {
      toast.error(t.echo.errorGeneric);
      return;
    }

    setBiographyMode(targetMode);
    biographyModeRef.current = targetMode;
    setPendingModeSwitch(null);
    toast.success(t.echo.pathChanged);

    const { data: bio } = await supabase
      .from('biographies')
      .select('content, content_freeflow, biography_mode')
      .eq('id', id)
      .maybeSingle();
    if (bio) {
      if (targetMode === 'freeflow') {
        setContentFreeflow((bio as { content_freeflow?: string }).content_freeflow ?? '');
      } else {
        setContent((bio as { content?: BiographyContent }).content ?? getEmptyContent());
      }
    }
  }, [pendingModeSwitch, id, session, t.echo.errorGeneric, t.echo.pathChanged]);

  const handleFreeflowChange = useCallback(
    (value: string) => {
      setContentFreeflow(value);
      markDirty();
    },
    [markDirty]
  );

  const handleAddChapter = useCallback(() => {
    setContentFreeflow((prev) => appendChapter(prev, t.editor.newChapterTitle));
    markDirty();
  }, [markDirty, t.editor.newChapterTitle]);

  const handleSelectChapter = useCallback((index: number) => {
    const root = document.querySelector('[data-tour-id="edit-section-btn"]');
    const heading = root?.querySelectorAll('h1')[index];
    heading?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleTextChange = useCallback(
    (text: string) => {
      setContent((prev) => ({
        ...prev,
        [activeSection]: { ...getSectionData(prev, activeSection), text },
      }));
      markDirty();
    },
    [activeSection, markDirty]
  );

  const handleTodoChange = useCallback(
    (todo: boolean) => {
      setContent((prev) => ({
        ...prev,
        [activeSection]: { ...getSectionData(prev, activeSection), todo },
      }));
      markDirty();
    },
    [activeSection, markDirty]
  );

  const handleAudioTranscriptChange = useCallback(
    (audioTranscript: string) => {
      setContent((prev) => ({
        ...prev,
        [activeSection]: {
          ...getSectionData(prev, activeSection),
          audioTranscript,
        },
      }));
      markDirty();
    },
    [activeSection, markDirty]
  );

  const handleSectionChange = useCallback((key: string) => {
    setActiveSection(key);
    setShowMobileSidebar(false);
    setAiState(INITIAL_AI_STATE);
    setTimeout(() => {
      editorContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }, []);

  const handleToggleAi = useCallback(async () => {
    if (!user) return;

    setAiEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(AI_ENABLED_KEY, String(next));
      if (!next) setAiState(INITIAL_AI_STATE);

      supabase
        .from('profiles')
        .update({ ai_features_enabled: next })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Failed to save AI preference:', error);
          }
        });

      return next;
    });
  }, [user]);

  const handleExportPDF = useCallback(() => {
    if (!biography) return;
    setShowExportDialog(true);
  }, [biography]);

  const handleMarkComplete = useCallback(async () => {
    const markPayload = buildMarkCompletePayload(status, new Date().toISOString());
    const newStatus = markPayload.status;
    try {
      const { error } = await supabase
        .from('biographies')
        .update(markPayload)
        .eq('id', id);

      if (!error) {
        setStatus(newStatus);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }, [id, status]);

  const handleMarkSectionComplete = useCallback(async () => {
    if (!user?.id) return;

    const isCurrentlyCompleted = completedSections.includes(activeSection);

    try {
      if (isCurrentlyCompleted) {
        await markSectionIncomplete(id, activeSection);
        const nextCompleted = completedSections.filter((key) => key !== activeSection);
        setCompletedSections(nextCompleted);
        if (status === 'sections_complete' && !BIOGRAPHY_SECTIONS.every((s) => nextCompleted.includes(s.key))) {
          const { error } = await supabase
            .from('biographies')
            .update(REOPEN_SECTION_PAYLOAD)
            .eq('id', id);
          if (!error) setStatus('draft');
        }
      } else {
        await markSectionComplete(user.id, id, activeSection);
        setCompletedSections((prev) => [...prev, activeSection]);
      }
    } catch (err) {
      console.error('Error marking section complete:', err);
    }
  }, [user, id, activeSection, completedSections, status]);

  const handleMarkSectionCompleteByKey = useCallback(
    async (sectionKey: string) => {
      if (!user?.id || completedSections.includes(sectionKey)) return;
      try {
        await markSectionComplete(user.id, id, sectionKey);
        setCompletedSections((prev) => [...prev, sectionKey]);
      } catch (err) {
        console.error('Error marking section complete:', err);
      }
    },
    [user, id, completedSections]
  );

  const handleMarkSectionIncomplete = useCallback(
    async (sectionKey: string) => {
      if (!completedSections.includes(sectionKey)) return;
      try {
        await markSectionIncomplete(id, sectionKey);
        const nextCompleted = completedSections.filter((key) => key !== sectionKey);
        setCompletedSections(nextCompleted);
        if (status === 'sections_complete' && !BIOGRAPHY_SECTIONS.every((s) => nextCompleted.includes(s.key))) {
          const { error } = await supabase
            .from('biographies')
            .update(REOPEN_SECTION_PAYLOAD)
            .eq('id', id);
          if (!error) setStatus('draft');
        }
        setActiveSection(sectionKey);
      } catch (err) {
        console.error('Error marking section incomplete:', err);
      }
    },
    [id, completedSections, status]
  );

  const handleEchoSectionCompletion = useCallback(
    async (sectionKey: string, completed: boolean) => {
      if (!user?.id) return;
      try {
        if (completed) {
          if (completedSections.includes(sectionKey)) return;
          await markSectionComplete(user.id, id, sectionKey);
          setCompletedSections((prev) => [...prev, sectionKey]);
        } else {
          if (!completedSections.includes(sectionKey)) return;
          await markSectionIncomplete(id, sectionKey);
          const nextCompleted = completedSections.filter((key) => key !== sectionKey);
          setCompletedSections(nextCompleted);
          if (status === 'sections_complete' && !BIOGRAPHY_SECTIONS.every((s) => nextCompleted.includes(s.key))) {
            const { error } = await supabase
              .from('biographies')
              .update(REOPEN_SECTION_PAYLOAD)
              .eq('id', id);
            if (!error) setStatus('draft');
          }
        }
      } catch (err) {
        console.error('Error updating section completion from Echo:', err);
      }
    },
    [user, id, completedSections, status]
  );

  const handleImportMultipleSections = useCallback(
    (sections: Array<{ title: string; content: string; sectionKey?: string }>) => {
      setContent((prev) => {
        const updated = { ...prev };
        sections.forEach((section) => {
          const matchingSection = section.sectionKey
            ? BIOGRAPHY_SECTIONS.find((s) => s.key === section.sectionKey)
            : BIOGRAPHY_SECTIONS.find(
                (s) => s.key === section.title || s.title === section.title
              );
          if (matchingSection) {
            const currentData = getSectionData(prev, matchingSection.key);
            const separator =
              currentData.text && !currentData.text.endsWith('</p>') ? '<p></p>' : '';
            updated[matchingSection.key] = {
              ...currentData,
              text: currentData.text + separator + section.content,
            };
          }
        });
        return updated;
      });
      markDirty();
    },
    [markDirty]
  );

  const handleGrammarCheck = useCallback(async () => {
    const onSheet = biographyModeRef.current === 'freeflow';
    const plain = onSheet
      ? stripHtmlTags(contentFreeflowRef.current).trim()
      : getSectionData(contentRef.current, activeSection).text.trim();
    const section = BIOGRAPHY_SECTIONS.find((s) => s.key === activeSection);
    const sectionTitle = onSheet
      ? titleRef.current.trim() || t.biography.untitled
      : section?.title;
    if (!plain || !sectionTitle) return;

    if (!session) {
      setAiState({
        type: 'grammar',
        loading: false,
        suggestions: [],
        error: t.editor.signInForAi,
      });
      return;
    }

    setAiState({
      type: 'grammar',
      loading: true,
      suggestions: [],
      error: null,
    });

    try {
      const suggestions = await checkGrammar(
        id,
        sectionTitle,
        plain,
        language
      );
      setAiUsageRefresh((n) => n + 1);
      setAiState((prev) => ({
        ...prev,
        loading: false,
        suggestions,
      }));
    } catch (err: any) {
      if (err instanceof AiLimitError) {
        setAiState(INITIAL_AI_STATE);
        setAiLimitError(err);
        return;
      }
      const message =
        err?.message === 'AI_TIMEOUT' ? t.biography.aiTimeout : err.message || t.editor.failedGrammar;
      setAiState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
    }
  }, [id, activeSection, session, language, t]);

  const handleAcceptSuggestion = useCallback(
    (suggestionId: string) => {
      setAiState((prev) => {
        const updated = prev.suggestions.map((s) => {
          if (s.id !== suggestionId) return s;
          return { ...s, status: 'accepted' as const };
        });
        const accepted = prev.suggestions.find((s) => s.id === suggestionId);
        if (accepted && accepted.original) {
          if (biographyModeRef.current === 'freeflow') {
            setContentFreeflow((prevSheet) => {
              const next = prevSheet.replace(accepted.original, accepted.suggestion);
              if (next !== prevSheet) {
                contentFreeflowRef.current = next;
                markDirty();
              }
              return next;
            });
          } else {
            setContent((prevContent) => {
              const current = getSectionData(prevContent, activeSection);
              const newText = current.text.replace(
                accepted.original,
                accepted.suggestion
              );
              if (newText !== current.text) {
                markDirty();
                return {
                  ...prevContent,
                  [activeSection]: { ...current, text: newText },
                };
              }
              return prevContent;
            });
          }
        }
        return { ...prev, suggestions: updated };
      });
    },
    [activeSection, markDirty]
  );

  const handleRejectSuggestion = useCallback((suggestionId: string) => {
    setAiState((prev) => ({
      ...prev,
      suggestions: prev.suggestions.map((s) =>
        s.id === suggestionId ? { ...s, status: 'rejected' as const } : s
      ),
    }));
  }, []);

  const handleCloseAiPanel = useCallback(() => {
    setAiState(INITIAL_AI_STATE);
  }, []);

  const handleCoachDraftApplied = useCallback(
    async (sectionKey: string, change?: { text: string }) => {
      applyingEchoDraftRef.current = true;
      try {
        if (sectionKey === 'freeflow') {
          const previousSheet = contentFreeflowRef.current;
          const { data } = await supabase
            .from('biographies')
            .select('content_freeflow')
            .eq('id', id)
            .maybeSingle();
          if (data?.content_freeflow !== undefined) {
            const nextSheet = data.content_freeflow ?? '';
            if (nextSheet !== previousSheet) setUndoSheet(previousSheet);
            setContentFreeflow(nextSheet);
            contentFreeflowRef.current = nextSheet;
          }
          if (change?.text) {
            setEchoChangeHighlight({ id: Date.now(), text: change.text });
          }
          dirtyRef.current = false;
          setSaveStatus('saved');
          return;
        }

        const { data } = await supabase.from('biographies').select('content').eq('id', id).maybeSingle();
        if (data?.content) {
          const nextContent = data.content as BiographyContent;
          setContent(nextContent);
          contentRef.current = nextContent;
        }
        dirtyRef.current = false;
        setSaveStatus('saved');
        setActiveSection(sectionKey);
      } finally {
        applyingEchoDraftRef.current = false;
      }
    },
    [id]
  );

  const handleUndoLastChange = useCallback(() => {
    if (undoSheet == null) return;
    setContentFreeflow(undoSheet);
    contentFreeflowRef.current = undoSheet;
    setUndoSheet(null);
    setEchoChangeHighlight(null);
    markDirty();
    void save();
  }, [undoSheet, markDirty, save]);

  const handleDraftApplying = useCallback(() => {
    applyingEchoDraftRef.current = true;
  }, []);

  const handleDraftApplyFinished = useCallback(() => {
    applyingEchoDraftRef.current = false;
  }, []);

  const handleOpenEditorForDraft = useCallback((sectionKey: string) => {
    if (sectionKey === 'freeflow') {
      document.getElementById('echo-freeflow-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setActiveSection(sectionKey);
  }, []);


  const sectionsForReview = BIOGRAPHY_SECTIONS.map(section => ({
    key: section.key,
    title: t.sectionTitles[section.key as keyof typeof t.sectionTitles] || section.title,
    content: getSectionData(content, section.key).text,
  })).filter(s => s.content.trim().length > 50);

  const handleApplyStructure = useCallback(async (sectionOrder: string[], structureType: string, rationale: string) => {
    const combinedText = storedToArchiveMarkdown(
      sectionOrder
        .map((key) => {
          const sectionData = getSectionData(contentRef.current, key);
          const sectionInfo = BIOGRAPHY_SECTIONS.find((s) => s.key === key);
          const sectionTitle =
            t.sectionTitles[key as keyof typeof t.sectionTitles] || sectionInfo?.title || '';

          if (!sectionData.text.trim()) return '';

          return `## ${sectionTitle}\n\n${storedToArchiveMarkdown(sectionData.text)}`;
        })
        .filter((text) => text.length > 0)
        .join('\n\n')
    );

    setFinalVersion(combinedText);
    setNarrativeOrder(sectionOrder);

    try {
      const { error } = await supabase
        .from('biographies')
        .update(buildFinalVersionPayload(combinedText, sectionOrder))
        .eq('id', id);

      if (!error) {
        setBiographyStatus('final_version');
      }
    } catch (err) {
      console.error('Error saving final version:', err);
    }
  }, [id, t]);

  const handleFinalVersionChange = useCallback(async (newContent: string) => {
    const markdown = storedToArchiveMarkdown(newContent);
    setFinalVersion(markdown);

    try {
      await supabase
        .from('biographies')
        .update({
          final_version: markdown,
        })
        .eq('id', id);
    } catch (err) {
      console.error('Error saving final version:', err);
    }
  }, [id]);

  const handleFinalVersionGrammarCheck = useCallback(async () => {
    if (!finalVersion.trim()) return;
    if (!session) {
      setAiState({
        type: 'grammar',
        loading: false,
        suggestions: [],
        error: t.editor.signInForAi,
      });
      return;
    }
    setAiState({
      type: 'grammar',
      loading: true,
      suggestions: [],
      error: null,
    });
    try {
      const suggestions = await checkGrammar(id, 'Final Biography', finalVersion, language);
      setAiUsageRefresh((n) => n + 1);
      setAiState((prev) => ({ ...prev, loading: false, suggestions }));
    } catch (err: any) {
      if (err instanceof AiLimitError) {
        setAiState(INITIAL_AI_STATE);
        setAiLimitError(err);
        return;
      }
      setAiState((prev) => ({ ...prev, loading: false, error: err.message || t.editor.failedGrammar }));
    }
  }, [id, finalVersion, session, language, t]);

  /** Fuori dagli stati di lavoro il testo è in sola lettura: lo si dice invece di lasciar fallire il salvataggio. */
  const notifyTextLocked = useCallback(() => {
    toast.info(t.editor.textLockedForStatus);
  }, [t]);

  /**
   * Da `published` a `draft` per scrivere un nuovo capitolo: lo stato lo scrive il server
   * (POST /api/biography/reopen), che controlla anche i 365 giorni fra un capitolo e l'altro.
   */
  const handleReopenForNewChapter = useCallback(async () => {
    if (!id) return;
    setReopenLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch('/api/biography/reopen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ biographyId: id }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error === 'chapter_cooldown_active' ? t.editor.reopenCooldownToast : t.toast.requestFailed);
        return;
      }
      setBiographyStatus('draft');
      setStatus('draft');
      setBiography((prev) => (prev ? { ...prev, status: 'draft' } : prev));
      setShowReopenDialog(false);
      toast.success(t.editor.reopenDone);
    } catch (err) {
      console.error('Error reopening biography:', err);
      toast.error(t.toast.requestFailed);
    } finally {
      setReopenLoading(false);
    }
  }, [id, t]);

  const handleRevertToDraft = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('biographies')
        .update({ status: 'draft' })
        .eq('id', id);
      if (!error) {
        setBiographyStatus('draft');
      }
    } catch (err) {
      console.error('Error reverting to draft:', err);
    }
  }, [id]);

  const handleSubmitForReview = useCallback(async () => {
    if (!user?.id) return;
    setIsSubmittingForReview(true);
    setSubmitReadinessError(null);
    try {
      const readiness = await checkBiographyPdfReadiness(id, true);
      if (!readiness.ok) {
        const issueMessages = readiness.issues.map((issue) =>
          issue === 'unsupported-script'
            ? t.umId.unsupportedScript
            : getPdfReadinessMessage(issue, t.exportDialog.noCoverPhotoWarning)
        );
        setSubmitReadinessError(issueMessages.join(' '));
        return;
      }

      const previousStatus = biographyStatus;
      setBiographyStatus('under_review');
      setShowSubmitForReviewDialog(false);
      setRevisionPassages([]);
      setRevisionNote(null);
      setRevisionBannerDismissed(false);
      setAiScreeningResult('pending');

      const { data: { session } } = await supabase.auth.getSession();
      let apiResult: {
        result?: string;
        error?: string;
        screeningDetail?: 'flagged' | 'ai_error' | 'parse_error' | 'text_changed' | 'too_long';
      } = {};
      try {
        const res = await fetch('/api/review/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ biographyId: id }),
        });
        apiResult = await res.json();
        if (!res.ok) {
          // Il server ha rifiutato prima di cambiare lo stato: si torna com'era.
          setBiographyStatus(previousStatus);
          setAiScreeningResult(null);
          setSubmitReadinessError(t.toast.requestFailed);
          return;
        }
      } catch (fetchErr) {
        console.error('AI review call failed:', fetchErr);
        apiResult = { result: 'under_review', screeningDetail: 'ai_error' };
      }

      if (apiResult.result === 'published') {
        setBiographyStatus('published');
        setAiScreeningResult('passed');
      } else if (apiResult.result === 'under_review') {
        const d = apiResult.screeningDetail;
        if (d === 'ai_error' || d === 'parse_error') {
          setAiScreeningResult(d);
        } else if (d === 'text_changed') {
          // Il testo è cambiato mentre lo screening lo esaminava: non è stato pubblicato.
          setAiScreeningResult('pending');
          toast.error(t.editor.screeningTextChanged);
        } else if (d === 'too_long') {
          // Testo più lungo di quanto il modello legga: lo esamina una persona.
          setAiScreeningResult('pending');
          toast.info(t.editor.screeningTooLong);
        } else {
          setAiScreeningResult('flagged');
        }
      }
    } catch (err) {
      console.error('Error submitting for review:', err);
    } finally {
      setIsSubmittingForReview(false);
    }
  }, [id, user, t, biographyStatus]);

  const handleOpenSubmitDialog = useCallback(async () => {
    setSubmitPreflightError(null);
    setIsPreflightChecking(true);
    try {
      const preflight = await checkPdfPreflight(id);
      if (!preflight.ready) {
        setSubmitPreflightError(
          t.exportDialog.noCoverPhotoWarning ?? 'A cover photo is required before submission.'
        );
        return;
      }
      setSubmitReadinessError(null);
      setShowReviewPublicationDialog(false);
      setShowSubmitForReviewDialog(true);
    } finally {
      setIsPreflightChecking(false);
    }
  }, [id, t]);

  const handlePrepareFreeflowFinal = useCallback(async () => {
    const text = storedToArchiveMarkdown(contentFreeflowRef.current);
    if (!text) return;
    setPublicationActionLoading('prepare');
    setPublicationActionError(null);
    setFinalVersion(text);
    try {
      const { error } = await supabase
        .from('biographies')
        .update(buildFinalVersionPayload(text))
        .eq('id', id);

      if (error) {
        setPublicationActionError(t.toast.requestFailed);
        toast.error(t.toast.requestFailed);
        return;
      }

      setBiographyStatus('final_version');
      setBiography((prev) =>
        prev ? { ...prev, final_version: text, status: 'final_version' } : prev
      );
      toast.success(
        language === 'it'
          ? 'Testo finale preparato. Puoi avviare la revisione PDF.'
          : language === 'fr'
            ? 'Texte final préparé. Vous pouvez démarrer la révision PDF.'
            : language === 'de'
              ? 'Endtext vorbereitet. Sie können die PDF-Prüfung starten.'
              : 'Final text prepared. You can start PDF review.'
      );
    } catch (e) {
      console.error(e);
      setPublicationActionError(t.toast.requestFailed);
      toast.error(t.toast.requestFailed);
    } finally {
      setPublicationActionLoading(null);
    }
  }, [id, t.toast.requestFailed, language]);

  const handleStartPdfDraft = useCallback(async () => {
    if (!user) return;
    setPublicationActionLoading('start');
    setPublicationActionError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/publication/start-pdf-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ biographyId: id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof payload?.message === 'string'
            ? payload.message
            : payload?.error === 'missing_cover'
              ? t.exportDialog.noCoverPhotoWarning
              : t.toast.requestFailed;
        setPublicationActionError(msg);
        toast.error(msg);
        return;
      }
      setBiographyStatus('pdf_draft');
      setPdfDraftIteration(null);
      setDraftAiFeedback(null);
      setBiography((prev) =>
        prev
          ? {
              ...prev,
              status: 'pdf_draft',
              pdf_draft_started_at: payload.pdf_draft_started_at ?? prev.pdf_draft_started_at,
              pdf_draft_iteration: null,
              draft_ai_feedback: null,
            }
          : prev
      );
      setShowReviewPublicationDialog(false);
      setShowExportDialog(true);
      toast.success(
        language === 'it'
          ? 'Revisione PDF avviata.'
          : language === 'fr'
            ? 'Révision PDF démarrée.'
            : language === 'de'
              ? 'PDF-Prüfung gestartet.'
              : 'PDF review started.'
      );
    } catch (e) {
      console.error(e);
      setPublicationActionError(t.toast.requestFailed);
      toast.error(t.toast.requestFailed);
    } finally {
      setPublicationActionLoading(null);
    }
  }, [user, id, t.exportDialog.noCoverPhotoWarning, t.toast.requestFailed, language]);

  const handleApproveFinalPdf = useCallback(async () => {
    if (!user?.id) return;
    setPublicationActionLoading('approve');
    setPublicationActionError(null);
    setSubmitReadinessError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/publication/approve-final-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ biographyId: id }),
      });
      const apiResult = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof apiResult?.message === 'string'
            ? apiResult.message
            : apiResult?.error === 'drafts_required'
              ? t.editor.reviewPublication.approveDisabledHint
              : apiResult?.error === 'missing_cover'
                ? t.exportDialog.noCoverPhotoWarning
                : apiResult?.error === 'final_pdf_failed'
                  ? (typeof apiResult?.message === 'string' ? apiResult.message : t.toast.requestFailed)
                  : t.toast.requestFailed;
        setPublicationActionError(msg);
        toast.error(msg);
        return;
      }

      const finalPdfUrlFromApi =
        typeof (apiResult as { finalPdfUrl?: string }).finalPdfUrl === 'string'
          ? (apiResult as { finalPdfUrl: string }).finalPdfUrl
          : null;

      setRevisionPassages([]);
      setRevisionNote(null);
      setRevisionBannerDismissed(false);

      if (apiResult.result === 'published') {
        setBiographyStatus('published');
        setAiScreeningResult('passed');
        setPdfDraftIteration(null);
        setDraftAiFeedback(null);
        setBiography((prev) =>
          prev
            ? {
                ...prev,
                status: 'published',
                published_at: new Date().toISOString(),
                ai_screening_status: 'passed',
                pdf_draft_iteration: null,
                draft_ai_feedback: null,
                final_pdf_url: finalPdfUrlFromApi ?? prev.final_pdf_url,
              }
            : prev
        );
        toast.success(
          language === 'it'
            ? 'Pubblicata dopo lo screening automatico.'
            : language === 'fr'
              ? 'Publiée après filtrage automatique.'
              : language === 'de'
                ? 'Nach automatischem Screening veröffentlicht.'
                : 'Published after automatic screening.'
        );
        return;
      }

      if (apiResult.result === 'under_review') {
        const d = apiResult.screeningDetail as string | undefined;
        setBiographyStatus('under_review');
        setPdfDraftIteration(null);
        setDraftAiFeedback(null);
        setBiography((prev) =>
          prev
            ? {
                ...prev,
                status: 'under_review',
                ai_screening_status:
                  d === 'ai_error' || d === 'parse_error'
                    ? d
                    : d === 'text_changed' || d === 'too_long'
                      ? 'pending'
                      : 'flagged',
                pdf_draft_iteration: null,
                draft_ai_feedback: null,
                final_pdf_url: finalPdfUrlFromApi ?? prev.final_pdf_url,
              }
            : prev
        );
        if (d === 'ai_error' || d === 'parse_error') {
          setAiScreeningResult(d as 'ai_error' | 'parse_error');
        } else if (d === 'text_changed' || d === 'too_long') {
          setAiScreeningResult('pending');
          if (d === 'text_changed') toast.error(t.editor.screeningTextChanged);
          else toast.info(t.editor.screeningTooLong);
        } else {
          setAiScreeningResult('flagged');
          const { data: openReport } = await supabase
            .from('moderation_reports')
            .select('ai_analysis')
            .eq('biography_id', id)
            .in('status', ['unassigned', 'assigned'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          const raw = (openReport?.ai_analysis as { flagged_passages?: unknown } | null)?.flagged_passages;
          if (Array.isArray(raw) && raw.length > 0) {
            setRevisionPassages(
              raw.map((p: { section_key?: string; reason?: string }) => ({
                section_key: typeof p.section_key === 'string' ? p.section_key : 'unknown',
                ai_reason: typeof p.reason === 'string' ? p.reason : '',
              }))
            );
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Request failed');
    } finally {
      setPublicationActionLoading(null);
    }
  }, [user, id, t.editor.publicationPdfDraftHint, t.exportDialog.noCoverPhotoWarning, language]);

  const effectivelyLocked = isFrozen || biographyStatus === 'locked_pending_screening';

  /**
   * Il testo si scrive solo negli stati di lavoro (elenco chiuso, lo stesso del database:
   * lib/publication-state.ts). Fuori elenco, anche in revisione o in attesa di screening,
   * l'editor è in sola lettura: il database rifiuterebbe comunque la scrittura.
   */
  const statusLocksText = !canAuthorWriteText(biographyStatus, false);

  /** Passaggi da correggere chiesti dal revisore: modifica limitata alle sezioni indicate (stato draft). */
  const isRevisionMode =
    revisionPassages.length > 0 && !revisionBannerDismissed && biographyStatus === 'draft';

  const editableSectionKeys = new Set(revisionPassages.map((p) => p.section_key));
  const isActiveSectionRevisionLocked = isRevisionMode && !editableSectionKeys.has(activeSection);
  const isSectionOrFreeflowRevisionLocked =
    biographyMode === 'freeflow'
      ? isRevisionMode && !editableSectionKeys.has('freeflow')
      : isActiveSectionRevisionLocked;

  /** Blocco completo dell'editor per lo stato della scheda. */
  const reviewQueueLocksEditor = statusLocksText;
  const draftHasSeverity3Flags = (draftAiFeedback?.red_flags ?? []).some((f) => f?.severity === 3);
  const aiUnavailable = draftAiFeedback?.ready_for_publication !== undefined && draftAiFeedback?.red_flags !== undefined
    ? (draftAiFeedback as { aiError?: boolean }).aiError === true
    : false;
  const draftAiReviewPending =
    (pdfDraftIteration ?? 0) >= 1 && draftAiFeedback == null && !aiUnavailable;
  /** Align with server: block only on missing drafts, severity-3 flags, or AI review still loading. */
  const canApproveFinalPdfFromDraftFeedback =
    (pdfDraftIteration ?? 0) >= 1 &&
    !draftHasSeverity3Flags &&
    (aiUnavailable || draftAiFeedback != null);

  const showFinalVersionEditorLayout =
    biographyStatus === 'final_version' ||
    biographyStatus === 'published' ||
    biographyStatus === 'pdf_draft' ||
    biographyStatus === 'locked_pending_screening' ||
    (biographyStatus === 'under_review' && (finalVersion?.trim().length ?? 0) >= 50);

  if (authLoading || !user || isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#ECE9E4] dark:bg-[#1F2121]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!biography) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#ECE9E4] dark:bg-[#1F2121] gap-4">
        <p className="text-muted-foreground">{t.biography.notFound}</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          {t.biography.returnToDashboard}
        </Button>
      </div>
    );
  }

  const activeSectionData = getSectionData(content, activeSection);

  const showEchoBubble = false;

  return (
    <EchoShell
      biographyId={id}
      sectionKey={activeSection}
      biographyMode={biographyMode}
      showBubble={showEchoBubble}
      onDraftApplied={handleCoachDraftApplied}
      onDraftApplying={handleDraftApplying}
      onDraftApplyFinished={handleDraftApplyFinished}
      onFlushEditorSave={flushEditorSave}
      onOpenEditor={handleOpenEditorForDraft}
      onSectionCompletionChanged={handleEchoSectionCompletion}
    >
    <div className="h-full flex flex-col bg-[#ECE9E4] dark:bg-[#1F2121] overflow-hidden">
      <ReportDeadlineBanner biographyId={id} status={biographyStatus} language={language} />

      <LicenseChoiceDialog
        open={licenseDialogOpen}
        onOpenChange={setLicenseDialogOpen}
        onConfirm={handleLicenseConfirm}
        mode={licenseDialogMode}
        busy={licenseBusy}
      />

      {isFrozen && (
        <div className="shrink-0 bg-brand-blue/25 border-b border-brand-blue/50 px-4 py-2 flex items-center gap-3 dark:bg-brand-blue/15 dark:border-brand-blue/40">
          <SnowflakeIcon className="h-4 w-4 text-brand-ink dark:text-brand-beigeLight shrink-0" />
          <p className="text-xs text-brand-ink dark:text-brand-beigeLight">
            {t.admin.frozenBannerMessage}
          </p>
        </div>
      )}

      {publicationActionError && (
        <div className="shrink-0 bg-brand-wine/10 border-b border-brand-wine/35 px-4 py-2">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs text-brand-wineDark dark:text-brand-mustardLight">{publicationActionError}</p>
          </div>
        </div>
      )}

      {biographyStatus === 'pdf_draft' && !isFrozen && (
        <div className="shrink-0 bg-brand-mustardLight/40 border-b border-brand-mustardDark/35 px-4 py-3 dark:bg-brand-mustardDark/15 dark:border-brand-mustardDark/45">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-brand-ink dark:text-brand-beigeLight">
                {t.editor.publicationPdfDraftHint}
              </p>
              <p className="text-xs text-brand-ink/80 dark:text-brand-beigeLight/85 mt-1">
                {t.editor.reviewPublication.draftProgress.replace(
                  '{count}',
                  String(pdfDraftIteration ?? 0)
                )}
              </p>
              {draftHasSeverity3Flags && (
                <p className="text-xs text-brand-wineDark dark:text-brand-mustardLight mt-1">
                  {language === 'it'
                    ? 'Questa bozza contiene contenuti che possono bloccare la pubblicazione. Rivedi prima di procedere.'
                    : language === 'fr'
                    ? 'Ce brouillon contient du contenu pouvant bloquer la publication. Révisez avant de continuer.'
                    : language === 'de'
                    ? 'Dieser Entwurf enthält Inhalte, die die Veröffentlichung blockieren können. Bitte vor dem Fortfahren prüfen.'
                    : 'This draft contains content that may block publication. Please review before proceeding.'}
                </p>
              )}
              {aiUnavailable && (
                <p className="text-xs text-brand-ink/80 dark:text-brand-beigeLight/85 mt-1">
                  {language === 'it'
                    ? 'Analisi AI non disponibile. Puoi comunque procedere alla pubblicazione.'
                    : language === 'fr'
                    ? 'Révision IA indisponible. Vous pouvez tout de même soumettre à publication.'
                    : language === 'de'
                    ? 'KI-Analyse nicht verfügbar. Sie können trotzdem zur Veröffentlichung fortfahren.'
                    : 'AI review unavailable. You can still proceed to publication.'}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowExportDialog(true)}
              >
                {t.editor.publicationExportPdf}
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5 bg-brand-wine hover:bg-brand-wine/90 text-white"
                disabled={publicationActionLoading !== null || !canApproveFinalPdfFromDraftFeedback}
                onClick={() => void handleApproveFinalPdf()}
              >
                {publicationActionLoading === 'approve' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {t.editor.publicationApproveFinalButton}
              </Button>
            </div>
          </div>
        </div>
      )}

      {aiScreeningResult === 'pending' &&
        (biographyStatus === 'under_review' || biographyStatus === 'locked_pending_screening') && (
        <div className="shrink-0 bg-brand-blue/25 border-b border-brand-blue/50 px-4 py-3 dark:bg-brand-blue/15 dark:border-brand-blue/40">
          <div className="max-w-5xl mx-auto flex items-center gap-3">
            <Loader2 className="h-4 w-4 text-brand-ink dark:text-brand-beigeLight animate-spin shrink-0" />
            <p className="text-sm text-brand-ink dark:text-brand-beigeLight">
              {language === 'it' ? 'Analisi automatica del testo in corso…' :
               language === 'fr' ? 'Analyse automatique du texte en cours…' :
               language === 'de' ? 'Automatische Textanalyse läuft…' :
               'Running automatic text screening…'}
            </p>
          </div>
        </div>
      )}

      {biographyStatus === 'published' && !isFrozen && biography && (
        <div className="shrink-0 border-b border-border/50 bg-card px-4 py-3">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0 flex-1">
              <ChapterCooldownBanner biography={biography} compact />
            </div>
            {getChapterCooldownState(biography)?.available && (
              <Button
                type="button"
                size="sm"
                className="shrink-0"
                disabled={reopenLoading}
                onClick={() => setShowReopenDialog(true)}
              >
                {t.editor.reopenForNewChapter}
              </Button>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.editor.reopenDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.editor.reopenDialogBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reopenLoading}>{t.editor.reopenCancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={reopenLoading}
              onClick={(e) => {
                e.preventDefault();
                void handleReopenForNewChapter();
              }}
            >
              {reopenLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.editor.reopenConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {aiScreeningResult === 'passed' && biographyStatus === 'published' && (
        <div className="shrink-0 bg-brand-greenLight/45 border-b border-brand-greenLight px-4 py-3 dark:bg-brand-greenLight/15 dark:border-brand-greenDark/40">
          <div className="max-w-5xl mx-auto flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-brand-greenDark dark:text-brand-greenLight shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-brand-greenDark dark:text-brand-greenLight">
                {language === 'it' ? 'Il testo ha superato la revisione automatica.' :
                 language === 'fr' ? 'Le texte a passé la révision automatique.' :
                 language === 'de' ? 'Der Text hat die automatische Prüfung bestanden.' :
                 'Your text passed the automatic screening.'}
              </p>
              <p className="text-xs text-brand-greenDark/90 dark:text-brand-greenLight/90 mt-1">
                {language === 'it' ? 'Ora puoi generare la bozza PDF dalla finestra di esportazione.' :
                 language === 'fr' ? 'Vous pouvez maintenant générer le brouillon PDF depuis la fenêtre d\'exportation.' :
                 language === 'de' ? 'Sie können jetzt den PDF-Entwurf im Export-Dialog erstellen.' :
                 'You can now generate the PDF draft from the export dialog.'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 h-8 text-xs border-brand-greenDark/50 text-brand-greenDark hover:bg-brand-greenLight/50 dark:border-brand-greenLight dark:text-brand-greenLight"
              onClick={() => setShowExportDialog(true)}
            >
              {language === 'it' ? 'Genera PDF' :
               language === 'fr' ? 'Générer le PDF' :
               language === 'de' ? 'PDF erstellen' :
               'Generate PDF'}
            </Button>
          </div>
        </div>
      )}

      {aiScreeningResult === 'flagged' &&
        (biographyStatus === 'under_review' || biographyStatus === 'locked_pending_screening') && (
        <div className="shrink-0 bg-brand-mustardLight/45 border-b border-brand-mustardDark/40 px-4 py-3 dark:bg-brand-mustardDark/20 dark:border-brand-mustardDark/50">
          <div className="max-w-5xl mx-auto flex items-start gap-3">
            <TriangleAlert className="h-4 w-4 text-brand-mustardDark dark:text-brand-mustardLight shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-brand-ink dark:text-brand-beigeLight">
                {language === 'it' ? 'Alcuni passaggi richiedono revisione umana.' :
                 language === 'fr' ? 'Certains passages nécessitent une révision humaine.' :
                 language === 'de' ? 'Einige Passagen erfordern eine manuelle Prüfung.' :
                 'Some passages require human review before proceeding.'}
              </p>
              <p className="text-xs text-brand-ink/80 dark:text-brand-beigeLight/85 mt-1">
                {language === 'it' ? 'Riceverai una notifica quando la revisione sarà completata.' :
                 language === 'fr' ? 'Vous serez notifié lorsque la révision sera terminée.' :
                 language === 'de' ? 'Sie werden benachrichtigt, wenn die Überprüfung abgeschlossen ist.' :
                 'You will be notified when the review is complete.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {(aiScreeningResult === 'ai_error' || aiScreeningResult === 'parse_error') &&
        (biographyStatus === 'under_review' || biographyStatus === 'locked_pending_screening') && (
          <div className="shrink-0 bg-brand-wine/10 border-b border-brand-wine/35 px-4 py-3 dark:bg-brand-wine/20 dark:border-brand-wine/45">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <TriangleAlert className="h-4 w-4 text-brand-wine dark:text-brand-beigeLight shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-brand-wineDark dark:text-brand-beigeLight">
                    {aiScreeningResult === 'parse_error'
                      ? language === 'it'
                        ? 'La risposta dell’analisi automatica non è stata letta correttamente. È stata avviata una revisione umana.'
                        : language === 'fr'
                          ? 'La réponse de l’analyse automatique n’a pas pu être lue. Une révision humaine a été demandée.'
                          : language === 'de'
                            ? 'Die automatische Analyse konnte nicht ausgewertet werden. Eine manuelle Prüfung wurde eingeleitet.'
                            : 'Automatic screening returned an unreadable response. Your biography was sent for human review.'
                      : language === 'it'
                        ? 'L’analisi automatica non è riuscita (servizio temporaneamente non disponibile). È stata avviata una revisione umana.'
                        : language === 'fr'
                          ? 'L’analyse automatique a échoué (service temporairement indisponible). Une révision humaine a été demandée.'
                          : language === 'de'
                            ? 'Die automatische Analyse ist fehlgeschlagen (Dienst vorübergehend nicht verfügbar). Eine manuelle Prüfung wurde eingeleitet.'
                            : 'Automatic screening could not complete (service issue). Your biography was sent for human review.'}
                  </p>
                  <p className="text-xs text-brand-wineDark/90 dark:text-brand-beigeLight/85 mt-1">
                    {language === 'it'
                      ? 'Puoi riprovare l’analisi automatica tra qualche minuto, oppure attendere il moderatore.'
                      : language === 'fr'
                        ? 'Vous pouvez réessayer dans quelques minutes ou attendre le modérateur.'
                        : language === 'de'
                          ? 'Sie können es in einigen Minuten erneut versuchen oder auf die Moderation warten.'
                          : 'You can retry automatic screening in a few minutes, or wait for a moderator.'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-brand-wine/50 text-brand-wineDark hover:bg-brand-wine/10 dark:border-brand-beigeLight/40 dark:text-brand-beigeLight"
                disabled={isSubmittingForReview}
                onClick={() => void handleSubmitForReview()}
              >
                {isSubmittingForReview ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : language === 'it' ? (
                  'Riprova analisi'
                ) : language === 'fr' ? (
                  'Réessayer'
                ) : language === 'de' ? (
                  'Erneut versuchen'
                ) : (
                  'Retry screening'
                )}
              </Button>
            </div>
          </div>
        )}

      {isRevisionMode && (
        <div className="shrink-0 border-b border-brand-mustardDark/40 bg-brand-mustardLight/45 px-4 py-3 dark:border-brand-mustardDark/50 dark:bg-brand-mustardDark/20">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-start gap-3">
              <TriangleAlert className="h-4 w-4 text-brand-mustardDark dark:text-brand-mustardLight shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-ink dark:text-brand-beigeLight mb-2">
                  {t.editor.revisionRequired}
                </p>
                <ul className="space-y-1 mb-2">
                  {revisionPassages.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-brand-ink/85 dark:text-brand-beigeLight/85">
                      <Lock className="h-3 w-3 shrink-0 mt-0.5" />
                      <span>
                        <span className="font-medium">{p.section_key}</span>
                        {': '}
                        {p.ai_reason}
                      </span>
                    </li>
                  ))}
                </ul>
                {revisionNote && (
                  <p className="text-xs text-brand-ink/85 dark:text-brand-beigeLight/85">
                    <span className="font-medium">{t.editor.revisionReviewerNote}:</span>{' '}
                    {revisionNote}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setRevisionBannerDismissed(true)}
                  className="text-xs text-brand-mustardDark dark:text-brand-mustardLight hover:text-brand-ink dark:hover:text-brand-beigeLight transition-colors underline"
                >
                  {t.editor.revisionDismiss}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex min-h-0 relative">
        {showMobileSidebar && (
          <div
            className="lg:hidden absolute inset-0 bg-black/50 z-30"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        <aside
          data-tour-id="section-list"
          className={cn(
            'w-full lg:w-72 border-r border-border/50 bg-card shrink-0 flex flex-col h-full',
            'absolute lg:relative inset-y-0 left-0 z-30 lg:top-0',
            'transition-transform duration-200',
            showMobileSidebar
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          )}
        >
          <SectionSidebar
            content={content}
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            globalNotesCount={globalNotesCount}
            globalTodosCount={globalTodosCount}
            onToggleNotesPanel={() => setShowGlobalNotesPanel(!showGlobalNotesPanel)}
            onTogglePhotosPanel={() => (statusLocksText ? notifyTextLocked() : setShowPhotosPanel(!showPhotosPanel))}
            onToggleBookStructurePanel={() =>
              statusLocksText ? notifyTextLocked() : setShowBookStructurePanel(!showBookStructurePanel)
            }
            onTogglePermanencePanel={() => (statusLocksText ? notifyTextLocked() : setShowPermanencePanel((v) => !v))}
            onToggleImportText={() => (statusLocksText ? notifyTextLocked() : setShowImportDialog((v) => !v))}
            onToggleExportText={() => {
              if (isReviewOrScreeningLockStatus(biographyStatus)) return;
              setShowExportDialog(true);
            }}
            onOpenShareLink={() => setShareDialogOpen(true)}
            showShareLink={privacy !== 'private'}
            shareLinkOpen={shareDialogOpen}
            onToggleReviewPublication={() => {
              setShowReviewPublicationDialog((open) => {
                if (!open) setSubmitPreflightError(null);
                return !open;
              });
            }}
            showReviewPublicationDialog={showReviewPublicationDialog}
            exportDisabled={isReviewOrScreeningLockStatus(biographyStatus)}
            showNotesPanel={showGlobalNotesPanel}
            showPhotosPanel={showPhotosPanel}
            showBookStructurePanel={showBookStructurePanel}
            showPermanencePanel={showPermanencePanel}
            permanenceLabel={
              biographyType === 'autobiography' ? t.permanence.titleSelf : t.permanence.title
            }
            showImportDialog={showImportDialog}
            completedSections={completedSections}
            onMarkSectionComplete={
              isFrozen || reviewQueueLocksEditor ? undefined : handleMarkSectionCompleteByKey
            }
            onMarkSectionIncomplete={
              isFrozen || reviewQueueLocksEditor ? undefined : handleMarkSectionIncomplete
            }
            biographyMode={biographyMode}
            contentFreeflow={contentFreeflow}
            chapters={listChapterAnchors(contentFreeflow)}
            onSelectChapter={handleSelectChapter}
            onAddChapter={statusLocksText ? notifyTextLocked : handleAddChapter}
            onModeChange={statusLocksText ? notifyTextLocked : handleModeChange}
            onModeChangeRequest={statusLocksText ? notifyTextLocked : handleModeChangeRequest}
            onFreeflowChange={handleFreeflowChange}
            biographyId={id}
            userId={user.id}
            lockedSectionKeys={
              isRevisionMode && !showFinalVersionEditorLayout ? editableSectionKeys : undefined
            }
            title={title}
            onTitleChange={statusLocksText ? notifyTextLocked : handleTitleChange}
            authorName={authorName}
            onAuthorNameChange={statusLocksText ? notifyTextLocked : handleAuthorNameChange}
            biographyType={biographyType}
            isFrozen={isFrozen}
            saveStatus={saveStatus}
            privacy={privacy}
            onPrivacyChange={handlePrivacyChange}
          />
        </aside>

        <div className="flex-1 flex min-w-0 min-h-0">
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div ref={editorContainerRef} data-tour-id="editor-main" className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {showFinalVersionEditorLayout ? (
                <FinalVersionEditor
                  content={finalVersion}
                  onContentChange={handleFinalVersionChange}
                  biographyId={id}
                  isLocked={effectivelyLocked || statusLocksText}
                  onPublish={
                    biographyStatus === 'final_version'
                      ? handleStartPdfDraft
                      : () => setShowReviewPublicationDialog(true)
                  }
                  primaryButtonLabel={
                    biographyStatus === 'final_version' ? t.editor.publicationStartPdfButton : undefined
                  }
                  primaryActionPending={publicationActionLoading === 'start'}
                  hidePrimaryActions={
                    biographyStatus === 'pdf_draft' || biographyStatus === 'locked_pending_screening'
                  }
                  editorFontSize={editorFontSize}
                  onRevertToDraft={biographyStatus === 'final_version' ? handleRevertToDraft : undefined}
                />
                    ) : (
                <GuidedSectionWorkspace
                  biographyId={id}
                  activeSection="freeflow"
                  documentMode
                  sectionText={contentFreeflow}
                  onSectionTextChange={handleFreeflowChange}
                  editorFontSize={editorFontSize}
                  onEditorFontSizeChange={setEditorFontSize}
                  isPublished={
                    (biographyStatus as string) === 'published' ||
                    isFrozen ||
                    isSectionOrFreeflowRevisionLocked ||
                    reviewQueueLocksEditor
                  }
                  aiEnabled={aiEnabled}
                  aiUsageRefresh={aiUsageRefresh}
                  aiLoading={aiState.loading}
                  highlightChange={echoChangeHighlight}
                  undoLastChange={
                    undoSheet != null && !isFrozen && !reviewQueueLocksEditor
                      ? {
                          label: t.echo.undoLastChange,
                          hint: t.echo.undoLastChangeHint,
                          onUndo: handleUndoLastChange,
                        }
                      : undefined
                  }
                  onGrammarCheck={handleGrammarCheck}
                />
              )}

              {!isFrozen && (
                <div className="shrink-0">
                  <AuthorLicensePanel
                    visibility={privacy}
                    rightsStatementUri={rightsStatementUri}
                    onRequestUpgrade={() => {
                      setLicenseDialogMode('upgrade');
                      setLicenseDialogOpen(true);
                    }}
                    disabled={licenseBusy}
                  />
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <ShareLinkPanel
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        biographyId={id}
        visibility={privacy}
        currentShareToken={shareToken}
        onTokenGenerated={setShareToken}
      />

      <AiSuggestionsDialog
        open={!!aiState.type}
        onOpenChange={(open) => {
          if (!open) handleCloseAiPanel();
        }}
        state={aiState}
        onAcceptSuggestion={handleAcceptSuggestion}
        onRejectSuggestion={handleRejectSuggestion}
      />

      {biography && (
        <AdvancedExportDialog
          open={showExportDialog}
          onOpenChange={(open) => {
            setShowExportDialog(open);
            if (!open && biographyStatus === 'pdf_draft' && id) {
              void (async () => {
                const { data } = await supabase
                  .from('biographies')
                  .select('pdf_draft_iteration, draft_ai_feedback')
                  .eq('id', id)
                  .maybeSingle();
                if (data && 'pdf_draft_iteration' in data) {
                  setPdfDraftIteration(
                    typeof data.pdf_draft_iteration === 'number'
                      ? data.pdf_draft_iteration
                      : null
                  );
                  setDraftAiFeedback(
                    (data.draft_ai_feedback as {
                      ready_for_publication?: boolean;
                      red_flags?: Array<{ severity?: number }>;
                    } | null) ?? null
                  );
                }
              })();
            }
          }}
          biography={{
            id,
            title: titleRef.current,
            author_name: authorNameRef.current,
            subject_name: biographyTypeRef.current === 'memorial' ? titleRef.current : null,
            biography_type: biographyTypeRef.current,
            content: contentRef.current,
            content_freeflow: contentFreeflowRef.current,
            biography_mode: biographyModeRef.current,
            narrative_order: narrativeOrder,
            final_version: finalVersion,
            status: biographyStatus,
            created_at: biography.created_at,
            content_language: biography.content_language ?? language,
          }}
          isPublished={biographyStatus === 'published'}
          biographyStatus={biographyStatus}
        />
      )}

      <GlobalNotesPanel
        biographyId={id}
        open={showGlobalNotesPanel}
        onOpenChange={setShowGlobalNotesPanel}
        onCountsChange={(notes, todos) => {
          setGlobalNotesCount(notes);
          setGlobalTodosCount(todos);
        }}
      />

      <BookStructureDialog
        biographyId={id}
        userId={user.id}
        open={showBookStructurePanel}
        onOpenChange={setShowBookStructurePanel}
      />

      <PermanenceDialog
        biographyId={id}
        nameAsWritten={title}
        recordLanguageTag={recordLanguageTag}
        recordScript={recordScript}
        biographyType={biographyType}
        disabled={isFrozen || statusLocksText}
        open={showPermanencePanel}
        onOpenChange={setShowPermanencePanel}
        onNameSaved={(name) => {
          setTitle(name);
          markDirty();
        }}
      />

      <PhotoGalleryDialog
        biographyId={id}
        userId={user.id}
        open={showPhotosPanel}
        onOpenChange={setShowPhotosPanel}
      />

      <ImportTextDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        biographyId={id}
        currentSectionKey={activeSection}
        currentSectionContent={activeSectionData.text}
        currentFreeflowContent={contentFreeflow}
        sectionContents={content}
        biographyMode={biographyMode}
        onImportedToSection={(sectionKey, newContent) => {
          setContent((prev) => ({
            ...prev,
            [sectionKey]: { ...getSectionData(prev, sectionKey), text: newContent },
          }));
          markDirty();
        }}
        onImportedToFreeflow={(newContent) => {
          setContentFreeflow(newContent);
          setBiographyMode('freeflow');
          markDirty();
        }}
        onImportMultipleSections={handleImportMultipleSections}
      />

      <FinalReviewDialog
        open={showFinalReview}
        onOpenChange={setShowFinalReview}
        biographyId={id}
        sections={sectionsForReview}
        onApplyStructure={handleApplyStructure}
      />

      <ReviewPublicationDialog
        open={showReviewPublicationDialog}
        onOpenChange={(open) => {
          if (!open) setSubmitPreflightError(null);
          setShowReviewPublicationDialog(open);
        }}
        biographyMode={biographyMode}
        completedSections={completedSections}
        contentFreeflow={contentFreeflow}
        biographyStatus={biographyStatus}
        isPreflightChecking={isPreflightChecking}
        publicationActionLoading={publicationActionLoading}
        canApproveFinalPdf={canApproveFinalPdfFromDraftFeedback}
        pdfDraftIteration={pdfDraftIteration}
        draftHasSeverity3Flags={draftHasSeverity3Flags}
        draftAiHasSuggestions={
          draftAiFeedback?.ready_for_publication === false && !draftHasSeverity3Flags
        }
        submitPreflightError={submitPreflightError}
        publicationActionError={publicationActionError}
        aiScreeningResult={aiScreeningResult}
        onOpenFinalReview={() => setShowFinalReview(true)}
        onSubmitForReview={() => void handleOpenSubmitDialog()}
        onPrepareFreeflowFinal={() => void handlePrepareFreeflowFinal()}
        onStartPdfDraft={() => void handleStartPdfDraft()}
        onOpenExport={() => setShowExportDialog(true)}
        onApproveFinalPdf={() => void handleApproveFinalPdf()}
      />

      <SubmitForReviewDialog
        open={showSubmitForReviewDialog}
        onOpenChange={(val) => {
          if (!val) setSubmitReadinessError(null);
          setShowSubmitForReviewDialog(val);
        }}
        onConfirm={handleSubmitForReview}
        isSubmitting={isSubmittingForReview}
        readinessError={submitReadinessError}
      />

      <Dialog open={!!aiLimitError} onOpenChange={(open) => { if (!open) setAiLimitError(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {aiLimitError?.limitType === 'daily'
                ? t.aiUsage.dailyLimitReached
                : t.aiUsage.weeklyLimitReached}
            </DialogTitle>
            <DialogDescription className="pt-1">
              {aiLimitError?.limitType === 'daily'
                ? t.aiUsage.dailyLimitDetail
                : t.aiUsage.weeklyLimitDetail}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            <span>{t.aiUsage.resetsAt}:</span>
            <span className="font-medium text-foreground">
              {aiLimitError
                ? new Date(aiLimitError.resetAt).toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short',
                  })
                : ''}
            </span>
          </div>
          <DialogFooter>
            <Button onClick={() => setAiLimitError(null)}>
              {t.common.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pendingModeSwitch && (
        <PathChangeDialog
          open={pendingModeSwitch !== null}
          fromMode={biographyMode}
          toMode={pendingModeSwitch}
          biographyTitle={title}
          biographySnapshot={{
            title,
            author_name: authorNameRef.current,
            created_at: biography?.created_at ?? new Date().toISOString(),
            biography_mode: biographyMode,
            content,
            content_freeflow: contentFreeflow,
            sections: BIOGRAPHY_SECTIONS.filter((s) => content[s.key]?.text?.trim()).map(
              (s) => ({
                key: s.key,
                title: t.sectionTitles[s.key as keyof typeof t.sectionTitles] || s.title,
                content: content[s.key]?.text ?? '',
              })
            ),
          }}
          onConfirm={handleModeSwitchConfirm}
          onCancel={() => setPendingModeSwitch(null)}
        />
      )}
      <EditorOnboardingTour
        active={tourActive && !isLoading}
        writingPath={tourWritingPath}
        biographyMode={biographyMode}
        biographyType={biographyType}
        onOpenMobileSidebar={() => setShowMobileSidebar(true)}
        onCloseMobileSidebar={() => setShowMobileSidebar(false)}
        onTourFinished={handleTourFinished}
      />
    </div>
    </EchoShell>
  );
}
