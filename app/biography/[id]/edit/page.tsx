'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { EditorTopBar } from '@/components/editor/editor-top-bar';
import { SectionSidebar } from '@/components/editor/section-sidebar';
import { SectionEditor } from '@/components/editor/section-editor';
import { GlobalNotesPanel } from '@/components/editor/GlobalNotesPanel';
import { AiSuggestionsPanel } from '@/components/editor/ai-suggestions-panel';
import { ShareLinkPanel } from '@/components/editor/share-link-panel';
import { PhotoGalleryPanel } from '@/components/editor/PhotoGalleryPanel';
import { ConversationMode } from '@/components/editor/conversation-mode';
import { NextSectionPrompt } from '@/components/editor/next-section-prompt';
import { AISectionReview } from '@/components/editor/AISectionReview';
import { FinalReviewDialog } from '@/components/editor/FinalReviewDialog';
import { FinalVersionEditor } from '@/components/editor/FinalVersionEditor';
import { PublishConfirmationDialog } from '@/components/editor/PublishConfirmationDialog';
import { SubmitForReviewDialog } from '@/components/editor/SubmitForReviewDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  BIOGRAPHY_SECTIONS,
  type BiographyContent,
  getEmptyContent,
  getSectionData,
} from '@/lib/editor-constants';
import {
  INITIAL_AI_STATE,
  getFallbackPrompts,
  type AiPanelState,
} from '@/lib/ai-constants';
import {
  checkGrammar,
  getGuidedPrompts,
  getSummary,
  AiLimitError,
  runPrePublicationCheck,
} from '@/lib/ai-service';
import { toast } from 'sonner';
import { AiUsageIndicator } from '@/components/editor/ai-usage-indicator';
import { recommendNextSection, type SectionRecommendation } from '@/lib/ai/next-section-recommender';
import type { Biography } from '@/lib/biographies';
import { generateBiographyPDF } from '@/lib/pdf-export';
import { AdvancedExportDialog } from '@/components/export/AdvancedExportDialog';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Loader as Loader2, Menu, X, Sparkles, Snowflake as SnowflakeIcon, Send as SendIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  markSectionComplete,
  markSectionIncomplete,
  getCompletedSections,
} from '@/lib/section-completion-service';

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

const AI_ENABLED_KEY = 'biography-ai-enabled';

export default function BiographyEditorPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { t, language } = useTranslation();
  const id = params.id as string;

  const [biography, setBiography] = useState<Biography | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'family' | 'public'>(
    'private'
  );
  const [status, setStatus] = useState<'draft' | 'completed'>('draft');
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [content, setContent] = useState<BiographyContent>(getEmptyContent());
  const [activeSection, setActiveSection] = useState<string>(
    BIOGRAPHY_SECTIONS[0].key
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showGlobalNotesPanel, setShowGlobalNotesPanel] = useState(false);
  const [showPhotosPanel, setShowPhotosPanel] = useState(false);
  const [showSidebarImport, setShowSidebarImport] = useState(false);
  const [globalNotesCount, setGlobalNotesCount] = useState(0);
  const [globalTodosCount, setGlobalTodosCount] = useState(0);
  const [editorMode, setEditorMode] = useState<'editor' | 'conversation'>('editor');
  const [editorFontSize, setEditorFontSize] = useState<number>(16);

  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiState, setAiState] = useState<AiPanelState>(INITIAL_AI_STATE);

  const [showNextSectionPrompt, setShowNextSectionPrompt] = useState(false);
  const [nextSectionRecommendation, setNextSectionRecommendation] = useState<SectionRecommendation | null>(null);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const [completedSectionKey, setCompletedSectionKey] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [showFinalReview, setShowFinalReview] = useState(false);
  const [finalVersion, setFinalVersion] = useState<string>('');
  const [narrativeOrder, setNarrativeOrder] = useState<string[]>([]);
  const [biographyStatus, setBiographyStatus] = useState<'draft' | 'sections_complete' | 'final_version' | 'published' | 'under_review'>('draft');
  const [isLocked, setIsLocked] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showSubmitForReviewDialog, setShowSubmitForReviewDialog] = useState(false);
  const [isSubmittingForReview, setIsSubmittingForReview] = useState(false);
  const [aiLimitError, setAiLimitError] = useState<AiLimitError | null>(null);
  const [aiUsageRefresh, setAiUsageRefresh] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
const [isPublishing, setIsPublishing] = useState(false);

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
  const contentRef = useRef(content);
  const titleRef = useRef(title);
  const privacyRef = useRef(privacy);

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
        setTitle(data.title);
        setPrivacy(data.privacy);
        setStatus(data.status || 'draft');
        setBiographyStatus(data.status || 'draft');
        setIsLocked(data.is_locked || false);
        setIsFrozen(data.is_frozen || false);
        setShareToken(data.share_token || null);
        setEditorFontSize(data.editor_font_size || 16);
        setFinalVersion(data.final_version || '');
        setNarrativeOrder((data.narrative_order as string[]) || []);
        const loaded = data.content as BiographyContent | null;
        if (loaded && typeof loaded === 'object') {
          setContent({ ...getEmptyContent(), ...loaded });
        }
      }
      setIsLoading(false);

      const completed = await getCompletedSections(id);
      setCompletedSections(completed);
    };
    load();
  }, [user, id]);

  const save = useCallback(async () => {
    if (!id || !dirtyRef.current) return;
    dirtyRef.current = false;
    setSaveStatus('saving');
    const { error } = await supabase
      .from('biographies')
      .update({
        title: titleRef.current,
        privacy: privacyRef.current,
        content: contentRef.current,
      })
      .eq('id', id);
    if (error) {
      setSaveStatus('error');
      dirtyRef.current = true;
    } else {
      setSaveStatus('saved');
    }
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

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      markDirty();
    },
    [markDirty]
  );

  const handlePrivacyChange = useCallback(
    (newPrivacy: 'private' | 'family' | 'public') => {
      setPrivacy(newPrivacy);
      markDirty();
    },
    [markDirty]
  );

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

  const handleReviewWithAi = useCallback(() => {
    const sectionData = getSectionData(contentRef.current, activeSection);
    if (!sectionData.text.trim()) return;
    setShowReviewDialog(true);
  }, [activeSection]);

  const handleMarkComplete = useCallback(async () => {
    const newStatus = status === 'completed' ? 'draft' : 'completed';
    try {
      const { error } = await supabase
        .from('biographies')
        .update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        })
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
        setCompletedSections(prev => prev.filter(key => key !== activeSection));
      } else {
        await markSectionComplete(user.id, id, activeSection);
        setCompletedSections(prev => [...prev, activeSection]);
      }
    } catch (err) {
      console.error('Error marking section complete:', err);
    }
  }, [user, id, activeSection, completedSections]);

  const handleApplyReviewChanges = useCallback(
    (newContent: string, changeType: 'improvements' | 'rewrite') => {
      setContent((prev) => ({
        ...prev,
        [activeSection]: {
          ...getSectionData(prev, activeSection),
          text: newContent,
        },
      }));
      markDirty();
    },
    [activeSection, markDirty]
  );

  const handleImportMultipleSections = useCallback(
    (sections: Array<{ title: string; content: string }>) => {
      setContent((prev) => {
        const updated = { ...prev };
        sections.forEach((section) => {
          const matchingSection = BIOGRAPHY_SECTIONS.find(
            (s) => s.key === section.title || s.title === section.title
          );
          if (matchingSection) {
            const currentData = getSectionData(prev, matchingSection.key);
            const separator = currentData.text && !currentData.text.endsWith('</p>') ? '<p></p>' : '';
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
    const sectionData = getSectionData(contentRef.current, activeSection);
    const section = BIOGRAPHY_SECTIONS.find((s) => s.key === activeSection);
    if (!sectionData.text.trim() || !section) return;

    if (!session) {
      setAiState({
        type: 'grammar',
        loading: false,
        suggestions: [],
        prompts: [],
        summary: '',
        error: t.editor.signInForAi,
      });
      return;
    }

    setAiState({
      type: 'grammar',
      loading: true,
      suggestions: [],
      prompts: [],
      summary: '',
      error: null,
    });

    try {
      const suggestions = await checkGrammar(
        section.title,
        sectionData.text,
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
      setAiState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || t.editor.failedGrammar,
      }));
    }
  }, [activeSection, session, language, t]);

  const handleGuidedPrompts = useCallback(async () => {
    const section = BIOGRAPHY_SECTIONS.find((s) => s.key === activeSection);
    if (!section) return;

    const langPrompts = getFallbackPrompts(language);
    const fallback = langPrompts[activeSection] || [];

    setAiState({
      type: 'prompts',
      loading: true,
      suggestions: [],
      prompts: [],
      summary: '',
      error: null,
    });

    if (!session) {
      setAiState((prev) => ({
        ...prev,
        loading: false,
        prompts: fallback,
      }));
      return;
    }

    try {
      const prompts = await getGuidedPrompts(
        activeSection,
        section.title,
        language
      );
      setAiUsageRefresh((n) => n + 1);
      setAiState((prev) => ({
        ...prev,
        loading: false,
        prompts: prompts.length > 0 ? prompts : fallback,
      }));
    } catch (err: any) {
      if (err instanceof AiLimitError) {
        setAiState(INITIAL_AI_STATE);
        setAiLimitError(err);
        return;
      }
      setAiState((prev) => ({
        ...prev,
        loading: false,
        prompts: fallback,
        error: null,
      }));
    }
  }, [activeSection, session, language]);

  const handleSummarize = useCallback(async () => {
    const sectionData = getSectionData(contentRef.current, activeSection);
    const section = BIOGRAPHY_SECTIONS.find((s) => s.key === activeSection);
    if (!sectionData.text.trim() || !section) return;

    if (!session) {
      setAiState({
        type: 'summary',
        loading: false,
        suggestions: [],
        prompts: [],
        summary: '',
        error: t.editor.signInForAi,
      });
      return;
    }

    setAiState({
      type: 'summary',
      loading: true,
      suggestions: [],
      prompts: [],
      summary: '',
      error: null,
    });

    try {
      const summary = await getSummary(
        section.title,
        sectionData.text,
        language
      );
      setAiUsageRefresh((n) => n + 1);
      setAiState((prev) => ({
        ...prev,
        loading: false,
        summary,
      }));
    } catch (err: any) {
      if (err instanceof AiLimitError) {
        setAiState(INITIAL_AI_STATE);
        setAiLimitError(err);
        return;
      }
      setAiState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || t.editor.failedSummary,
      }));
    }
  }, [activeSection, session, language, t]);

  const handleAcceptSuggestion = useCallback(
    (suggestionId: string) => {
      setAiState((prev) => {
        const updated = prev.suggestions.map((s) => {
          if (s.id !== suggestionId) return s;
          return { ...s, status: 'accepted' as const };
        });
        const accepted = prev.suggestions.find((s) => s.id === suggestionId);
        if (accepted && accepted.original) {
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

  const handleInsertPrompt = useCallback(
    (starter: string) => {
      setContent((prev) => {
        const current = getSectionData(prev, activeSection);
        const sep =
          current.text && !current.text.endsWith('\n') ? '\n\n' : '';
        markDirty();
        return {
          ...prev,
          [activeSection]: {
            ...current,
            text: current.text + sep + starter,
          },
        };
      });
    },
    [activeSection, markDirty]
  );

  const handleCloseAiPanel = useCallback(() => {
    setAiState(INITIAL_AI_STATE);
  }, []);

  const handleGenerateDraftFromConversation = useCallback(
    async (answers: { question: string; answer: string }[]) => {
      const draftText = answers
        .map(({ question, answer }) => {
          return `${answer}`;
        })
        .join('\n\n');

      setContent((prev) => {
        const current = getSectionData(prev, activeSection);
        const separator = current.text && !current.text.endsWith('\n') ? '\n\n' : '';
        return {
          ...prev,
          [activeSection]: {
            ...current,
            text: current.text + separator + draftText,
          },
        };
      });
      markDirty();
      setEditorMode('editor');

      const completedSections = BIOGRAPHY_SECTIONS
        .map(s => s.key)
        .filter(key => {
          const sectionData = getSectionData(contentRef.current, key);
          return sectionData.text.trim().length > 100 || key === activeSection;
        });

      setCompletedSectionKey(activeSection);
      setShowNextSectionPrompt(true);
      setIsLoadingRecommendation(true);

      try {
        if (session) {
          const updatedContent = {
            ...contentRef.current,
            [activeSection]: {
              ...getSectionData(contentRef.current, activeSection),
              text: (getSectionData(contentRef.current, activeSection).text || '') +
                    ((getSectionData(contentRef.current, activeSection).text && !getSectionData(contentRef.current, activeSection).text.endsWith('\n')) ? '\n\n' : '') +
                    draftText
            }
          };

          const sectionContent = updatedContent[activeSection]?.text || '';

          const recommendation = await recommendNextSection(
            activeSection,
            completedSections,
            sectionContent,
            BIOGRAPHY_SECTIONS.map(s => s.key),
            language
          );

          setNextSectionRecommendation(recommendation);
        }
      } catch (error) {
        console.error('Failed to get section recommendation:', error);
      } finally {
        setIsLoadingRecommendation(false);
      }
    },
    [activeSection, markDirty, session, language]
  );


  const allSectionsKeys = BIOGRAPHY_SECTIONS.map(s => s.key);
  const allSectionsComplete = allSectionsKeys.every(key => completedSections.includes(key));

  const sectionsForReview = BIOGRAPHY_SECTIONS.map(section => ({
    key: section.key,
    title: t.sectionTitles[section.key as keyof typeof t.sectionTitles] || section.title,
    content: getSectionData(content, section.key).text,
  })).filter(s => s.content.trim().length > 50);

  const handleApplyStructure = useCallback(async (sectionOrder: string[], structureType: string, rationale: string) => {
    const combinedText = sectionOrder.map(key => {
      const sectionData = getSectionData(contentRef.current, key);
      const sectionInfo = BIOGRAPHY_SECTIONS.find(s => s.key === key);
      const sectionTitle = t.sectionTitles[key as keyof typeof t.sectionTitles] || sectionInfo?.title || '';

      if (!sectionData.text.trim()) return '';

      return `<h2>${sectionTitle}</h2>\n\n${sectionData.text}`;
    }).filter(text => text.length > 0).join('\n\n');

    setFinalVersion(combinedText);
    setNarrativeOrder(sectionOrder);

    try {
      const { error } = await supabase
        .from('biographies')
        .update({
          final_version: combinedText,
          narrative_order: sectionOrder,
          status: 'final_version',
        })
        .eq('id', id);

      if (!error) {
        setBiographyStatus('final_version');
      }
    } catch (err) {
      console.error('Error saving final version:', err);
    }
  }, [id, t]);

  const handleFinalVersionChange = useCallback(async (newContent: string) => {
    setFinalVersion(newContent);

    try {
      await supabase
        .from('biographies')
        .update({
          final_version: newContent,
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
        prompts: [],
        summary: '',
        error: t.editor.signInForAi,
      });
      return;
    }
    setAiState({
      type: 'grammar',
      loading: true,
      suggestions: [],
      prompts: [],
      summary: '',
      error: null,
    });
    try {
      const suggestions = await checkGrammar('Final Biography', finalVersion, language);
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
  }, [finalVersion, session, language, t]);

  const handleFinalVersionGuidedPrompts = useCallback(async () => {
    const langPrompts = getFallbackPrompts(language);
    const fallback = langPrompts['general'] || [];
    setAiState({
      type: 'prompts',
      loading: true,
      suggestions: [],
      prompts: [],
      summary: '',
      error: null,
    });
    if (!session) {
      setAiState((prev) => ({ ...prev, loading: false, prompts: fallback }));
      return;
    }
    try {
      const prompts = await getGuidedPrompts('final_version', language === 'it' ? 'Versione Finale' : 'Final Version', language);
      setAiUsageRefresh((n) => n + 1);
      setAiState((prev) => ({ ...prev, loading: false, prompts: prompts.length > 0 ? prompts : fallback }));
    } catch (err: any) {
      if (err instanceof AiLimitError) {
        setAiState(INITIAL_AI_STATE);
        setAiLimitError(err);
        return;
      }
      setAiState((prev) => ({ ...prev, loading: false, prompts: fallback, error: null }));
    }
  }, [session, language]);

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

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);

    const biographyText = finalVersion ||
      Object.values(content).filter(Boolean).join('\n\n');

    let checkResult;
    try {
      checkResult = await runPrePublicationCheck(biographyText);
    } catch (err) {
      console.error('Pre-publication check failed:', err);
      setIsPublishing(false);
      return;
    }

    if (checkResult.violation_level === 1) {
      await supabase.from('moderation_reports').insert({
        biography_id: id,
        reporter_id: null,
        report_type: 'level1_content',
        status: 'unassigned',
        ai_analysis: checkResult,
        ai_violation_level: 1,
      });
      setIsPublishing(false);
      setShowPublishDialog(false);
      toast.error(t.toast.publishBlocked);
      return;
    }

    if (checkResult.violation_level === 2) {
      await supabase.from('biographies').update({ status: 'under_review' }).eq('id', id);
      await supabase.from('moderation_reports').insert({
        biography_id: id,
        reporter_id: null,
        report_type: 'level2_content',
        status: 'unassigned',
        ai_analysis: checkResult,
        ai_violation_level: 2,
      });
      setIsPublishing(false);
      setShowPublishDialog(false);
      setBiographyStatus('draft');
      toast.warning(t.toast.publishUnderReview);
      return;
    }

    if (checkResult.violation_level === 3) {
      await supabase.from('moderation_reports').insert({
        biography_id: id,
        report_type: 'other',
        status: 'decided',
        decision: 'publish',
        ai_analysis: checkResult,
        ai_violation_level: 3,
      });
    }

    try {
      const { error } = await supabase
        .from('biographies')
        .update({
          status: 'published',
          is_locked: true,
          published_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (!error) {
        await supabase.rpc('increment_biography_chapters', { biography_id: id });
        setBiographyStatus('published');
        setIsLocked(true);
        setShowPublishDialog(false);
      }
    } catch (err) {
      console.error('Error publishing biography:', err);
    } finally {
      setIsPublishing(false);
    }
  }, [id, finalVersion, content, t]);

  const handleSubmitForReview = useCallback(async () => {
    if (!user?.id) return;
    setIsSubmittingForReview(true);
    try {
      const { error } = await supabase
        .from('biographies')
        .update({ status: 'under_review' })
        .eq('id', id);

      if (!error) {
        setBiographyStatus('under_review');
        setShowSubmitForReviewDialog(false);
      }
    } catch (err) {
      console.error('Error submitting for review:', err);
    } finally {
      setIsSubmittingForReview(false);
    }
  }, [id, user]);

  const effectivelyLocked = isLocked || isFrozen;

  if (authLoading || !user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECE9E4] dark:bg-[#1F2121]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!biography) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#ECE9E4] dark:bg-[#1F2121] gap-4">
        <p className="text-muted-foreground">{t.biography.notFound}</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          {t.biography.returnToDashboard}
        </Button>
      </div>
    );
  }

  const activeSectionData = getSectionData(content, activeSection);

  return (
    <div className="h-full flex flex-col bg-[#ECE9E4] dark:bg-[#1F2121] overflow-hidden">
      <EditorTopBar
        title={title}
        privacy={privacy}
        saveStatus={saveStatus}
        onTitleChange={handleTitleChange}
        onPrivacyChange={handlePrivacyChange}
        isFrozen={isFrozen}
      />

      {isFrozen && (
        <div className="shrink-0 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800 px-4 py-2 flex items-center gap-3">
          <SnowflakeIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {t.admin.frozenBannerMessage}
          </p>
        </div>
      )}

      <div className="flex-1 flex min-h-0 relative">
        <div className="lg:hidden fixed bottom-4 left-4 z-40">
          <Button
            size="icon"
            className="h-12 w-12 rounded-full "
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          >
            {showMobileSidebar ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {showMobileSidebar && (
          <div
            className="lg:hidden absolute inset-0 bg-black/50 z-30"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        <aside
          className={cn(
            'w-[280px] border-r border-border/50 bg-card shrink-0 flex flex-col h-full',
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
            onTogglePhotosPanel={() => setShowPhotosPanel(!showPhotosPanel)}
            onToggleImportText={() => setShowSidebarImport(true)}
            onToggleExportText={() => setShowExportDialog(true)}
            showNotesPanel={showGlobalNotesPanel}
            showPhotosPanel={showPhotosPanel}
            completedSections={completedSections}
          />
        </aside>

        <div className="flex-1 flex min-w-0">
          <div className="flex-1 flex flex-col min-w-0">
            {biographyStatus !== 'published' && !isFrozen && (
              <div className="border-b border-border/50 px-4 py-2 bg-card/30 flex flex-wrap items-center gap-2 shrink-0">
                {biographyStatus !== 'final_version' && (
                  <>
                    <Button
                      variant={editorMode === 'editor' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setEditorMode('editor')}
                      className="h-8 text-xs"
                    >
                      {t.editor.editorMode}
                    </Button>
                    <Button
                      variant={editorMode === 'conversation' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setEditorMode('conversation')}
                      className="h-8 text-xs"
                    >
                      {t.editor.conversationMode}
                    </Button>
                  </>
                )}
                {aiEnabled && (
                  <div className={biographyStatus !== 'final_version' ? 'sm:ml-auto' : ''}>
                    <AiUsageIndicator refreshTrigger={aiUsageRefresh} />
                  </div>
                )}
              </div>
            )}

            <div ref={editorContainerRef} className="flex-1 min-h-0 flex flex-col overflow-y-auto">
              {biographyStatus === 'final_version' || biographyStatus === 'published' ? (
                <FinalVersionEditor
                  content={finalVersion}
                  onContentChange={handleFinalVersionChange}
                  biographyId={id}
                  isLocked={effectivelyLocked}
                  onPublish={() => setShowPublishDialog(true)}
                  editorFontSize={editorFontSize}
                  onRevertToDraft={!effectivelyLocked ? handleRevertToDraft : undefined}
                />
              ) : editorMode === 'conversation' && !isFrozen ? (
                <ConversationMode
                  sectionKey={activeSection}
                  onBackToEditor={() => setEditorMode('editor')}
                  onGenerateDraft={handleGenerateDraftFromConversation}
                  currentText={activeSectionData.text}
                />
              ) : (
                <SectionEditor
                  sectionKey={activeSection}
                  data={activeSectionData}
                  onTextChange={handleTextChange}
                  onTodoChange={handleTodoChange}
                  onAudioTranscriptChange={handleAudioTranscriptChange}
                  aiEnabled={aiEnabled}
                  onToggleAi={handleToggleAi}
                  onGrammarCheck={handleGrammarCheck}
                  onGuidedPrompts={handleGuidedPrompts}
                  onSummarize={handleSummarize}
                  onReviewWithAi={handleReviewWithAi}
                  aiLoading={aiState.loading}
                  biographyId={id}
                  editorFontSize={editorFontSize}
                  onEditorFontSizeChange={setEditorFontSize}
                  onImportMultipleSections={handleImportMultipleSections}
                  onMarkComplete={handleMarkSectionComplete}
                  isCompleted={completedSections.includes(activeSection)}
                  onTogglePhotos={() => setShowPhotosPanel((v) => !v)}
                  onToggleNotes={() => setShowGlobalNotesPanel((v) => !v)}
                  openImportDialog={showSidebarImport}
                  onImportDialogOpenChange={(v) => { if (!v) setShowSidebarImport(false); }}
                  isPublished={(biographyStatus as string) === 'published' || isFrozen}
                />
              )}

              {editorMode === 'editor' && showNextSectionPrompt && completedSectionKey && (
                <div className="p-4 border-b border-border/50 shrink-0">
                  <NextSectionPrompt
                    completedSectionKey={completedSectionKey}
                    recommendedSection={nextSectionRecommendation?.recommendedSection}
                    recommendationReason={nextSectionRecommendation?.reason}
                    confidence={nextSectionRecommendation?.confidence}
                    onStartSection={(sectionKey) => {
                      setActiveSection(sectionKey);
                      setShowNextSectionPrompt(false);
                      setNextSectionRecommendation(null);
                      setCompletedSectionKey(null);
                    }}
                    completedSections={BIOGRAPHY_SECTIONS
                      .map(s => s.key)
                      .filter(key => {
                        const sectionData = getSectionData(content, key);
                        return sectionData.text.trim().length > 100;
                      })}
                    isLoading={isLoadingRecommendation}
                  />
                </div>
              )}

              {editorMode === 'editor' && allSectionsComplete && biographyStatus === 'draft' && (
                <div className="p-6 border-t border-border/50 bg-gradient-to-br from-primary/5 to-primary/10 shrink-0">
                  <div className="max-w-3xl mx-auto text-center space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-foreground">
                        {language === 'it' ? '🎉 Tutte le Sezioni Complete!' :
                         language === 'fr' ? '🎉 Toutes les Sections Complètes!' :
                         language === 'de' ? '🎉 Alle Abschnitte Abgeschlossen!' :
                         '🎉 All Sections Complete!'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {language === 'it' ? 'Esplora strutture narrative alternative con l\'IA per migliorare il flusso della tua storia.' :
                         language === 'fr' ? 'Explorez des structures narratives alternatives avec l\'IA pour améliorer le flux de votre histoire.' :
                         language === 'de' ? 'Erkunden Sie alternative Erzählstrukturen mit KI, um den Fluss Ihrer Geschichte zu verbessern.' :
                         'Explore alternative narrative structures with AI to enhance your story\'s flow.'}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setShowFinalReview(true)}
                        className="gap-2"
                      >
                        <Sparkles className="h-5 w-5" />
                        {language === 'it' ? 'Revisione Finale con IA' :
                         language === 'fr' ? 'Révision Finale avec IA' :
                         language === 'de' ? 'Abschließende Überprüfung mit KI' :
                         'Final Review with AI'}
                      </Button>
                      <Button
                        size="lg"
                        onClick={() => setShowSubmitForReviewDialog(true)}
                        className="gap-2"
                      >
                        <SendIcon className="h-5 w-5" />
                        {language === 'it' ? 'Invia per la Revisione' :
                         language === 'fr' ? 'Soumettre pour Révision' :
                         language === 'de' ? 'Zur Überprüfung Einreichen' :
                         'Submit for Review'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {editorMode === 'editor' && (
              <div className="shrink-0">
                <ShareLinkPanel
                  biographyId={id}
                  privacy={privacy}
                  currentShareToken={shareToken}
                  onTokenGenerated={setShareToken}
                />
              </div>
            )}
          </div>

          {editorMode === 'editor' && aiState.type && (
            <AiSuggestionsPanel
              state={aiState}
              onClose={handleCloseAiPanel}
              onAcceptSuggestion={handleAcceptSuggestion}
              onRejectSuggestion={handleRejectSuggestion}
              onInsertPrompt={handleInsertPrompt}
            />
          )}

          {showPhotosPanel && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                onClick={() => setShowPhotosPanel(false)}
              />
              <div className={[
                'border-l border-border/50 bg-card flex flex-col min-h-0 overflow-hidden',
                'fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[320px] shadow-2xl',
                'lg:relative lg:z-auto lg:shadow-none lg:shrink-0',
              ].join(' ')}>
                <PhotoGalleryPanel
                  biographyId={id}
                  userId={user.id}
                  onClose={() => setShowPhotosPanel(false)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {biography && (
        <AdvancedExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          biography={{
            title: titleRef.current,
            author_name: biography.author_name,
            content: contentRef.current,
            created_at: biography.created_at,
          }}
          isPublished={biographyStatus === 'published'}
        />
      )}

      <AISectionReview
        open={showReviewDialog}
        onOpenChange={setShowReviewDialog}
        biographyId={id}
        sectionKey={activeSection}
        sectionTitle={
          t.sectionTitles[activeSection as keyof typeof t.sectionTitles] ||
          BIOGRAPHY_SECTIONS.find((s) => s.key === activeSection)?.title ||
          ''
        }
        content={activeSectionData.text}
        language={language}
        onApplyChanges={handleApplyReviewChanges}
      />

      <GlobalNotesPanel
        biographyId={id}
        open={showGlobalNotesPanel}
        onOpenChange={setShowGlobalNotesPanel}
        onCountsChange={(notes, todos) => {
          setGlobalNotesCount(notes);
          setGlobalTodosCount(todos);
        }}
      />

      <FinalReviewDialog
        open={showFinalReview}
        onOpenChange={setShowFinalReview}
        biographyId={id}
        sections={sectionsForReview}
        onApplyStructure={handleApplyStructure}
      />

      <PublishConfirmationDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        onConfirm={handlePublish}
        isChecking={isPublishing}
        checkingText={t.toast.checkingContent}
      />

      <SubmitForReviewDialog
        open={showSubmitForReviewDialog}
        onOpenChange={setShowSubmitForReviewDialog}
        onConfirm={handleSubmitForReview}
        isSubmitting={isSubmittingForReview}
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
    </div>
  );
}
