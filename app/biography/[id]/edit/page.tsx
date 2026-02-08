'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { EditorTopBar } from '@/components/editor/editor-top-bar';
import { SectionSidebar } from '@/components/editor/section-sidebar';
import { SectionEditor } from '@/components/editor/section-editor';
import { TodoPanel } from '@/components/editor/todo-panel';
import { NotesOverviewPanel } from '@/components/editor/notes-overview-panel';
import { AiSuggestionsPanel } from '@/components/editor/ai-suggestions-panel';
import { ShareLinkPanel } from '@/components/editor/share-link-panel';
import { ConversationMode } from '@/components/editor/conversation-mode';
import { NextSectionPrompt } from '@/components/editor/next-section-prompt';
import { AISectionReview } from '@/components/editor/AISectionReview';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
} from '@/lib/ai-service';
import { recommendNextSection, type SectionRecommendation } from '@/lib/ai/next-section-recommender';
import type { Biography } from '@/lib/biographies';
import { generateBiographyPDF } from '@/lib/pdf-export';
import { AdvancedExportDialog } from '@/components/export/AdvancedExportDialog';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Loader2, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const [showTodoPanel, setShowTodoPanel] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [notesCount, setNotesCount] = useState(0);
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

  useEffect(() => {
    const stored = localStorage.getItem(AI_ENABLED_KEY);
    if (stored === 'true') setAiEnabled(true);
  }, []);

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
        setShareToken(data.share_token || null);
        setEditorFontSize(data.editor_font_size || 16);
        const loaded = data.content as BiographyContent | null;
        if (loaded && typeof loaded === 'object') {
          setContent({ ...getEmptyContent(), ...loaded });
        }
      }
      setIsLoading(false);

      const { data: notesData } = await supabase
        .from('section_notes')
        .select('id')
        .eq('biography_id', id);
      if (notesData) {
        setNotesCount(notesData.length);
      }
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
  }, []);

  const handleToggleAi = useCallback(() => {
    setAiEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(AI_ENABLED_KEY, String(next));
      if (!next) setAiState(INITIAL_AI_STATE);
      return next;
    });
  }, []);

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

  const getToken = useCallback(async () => {
    const { data: { session: freshSession }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return '';
    }
    if (!freshSession || !freshSession.access_token) {
      console.error('No valid session or access token found');
      return '';
    }
    return freshSession.access_token;
  }, []);

  const handleGrammarCheck = useCallback(async () => {
    const token = await getToken();
    const sectionData = getSectionData(contentRef.current, activeSection);
    const section = BIOGRAPHY_SECTIONS.find((s) => s.key === activeSection);
    if (!sectionData.text.trim() || !section) return;

    if (!token) {
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
        token,
        section.title,
        sectionData.text,
        language
      );
      setAiState((prev) => ({
        ...prev,
        loading: false,
        suggestions,
      }));
    } catch (err: any) {
      setAiState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || t.editor.failedGrammar,
      }));
    }
  }, [activeSection, getToken, language, t]);

  const handleGuidedPrompts = useCallback(async () => {
    const token = await getToken();
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

    if (!token) {
      setAiState((prev) => ({
        ...prev,
        loading: false,
        prompts: fallback,
      }));
      return;
    }

    try {
      const prompts = await getGuidedPrompts(
        token,
        activeSection,
        section.title,
        language
      );
      setAiState((prev) => ({
        ...prev,
        loading: false,
        prompts: prompts.length > 0 ? prompts : fallback,
      }));
    } catch {
      setAiState((prev) => ({
        ...prev,
        loading: false,
        prompts: fallback,
        error: null,
      }));
    }
  }, [activeSection, getToken, language]);

  const handleSummarize = useCallback(async () => {
    const token = await getToken();
    const sectionData = getSectionData(contentRef.current, activeSection);
    const section = BIOGRAPHY_SECTIONS.find((s) => s.key === activeSection);
    if (!sectionData.text.trim() || !section) return;

    if (!token) {
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
        token,
        section.title,
        sectionData.text,
        language
      );
      setAiState((prev) => ({
        ...prev,
        loading: false,
        summary,
      }));
    } catch (err: any) {
      setAiState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || t.editor.failedSummary,
      }));
    }
  }, [activeSection, getToken, language, t]);

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
        const token = await getToken();
        if (token && session) {
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
            token,
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
    [activeSection, markDirty, getToken, session, language]
  );

  const todoCount = Object.values(content).filter((d) => d.todo).length;

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
    <div className="h-screen flex flex-col bg-[#ECE9E4] dark:bg-[#1F2121] overflow-hidden">
      <EditorTopBar
        title={title}
        privacy={privacy}
        saveStatus={saveStatus}
        onTitleChange={handleTitleChange}
        onPrivacyChange={handlePrivacyChange}
        onExportPDF={handleExportPDF}
      />

      <div className="flex-1 flex min-h-0">
        <div className="lg:hidden fixed bottom-4 left-4 z-40">
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg"
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
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        <aside
          className={cn(
            'w-[280px] border-r border-border/50 bg-card shrink-0 flex flex-col',
            'fixed lg:relative inset-y-0 left-0 z-30 top-[57px] lg:top-0',
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
            todoCount={todoCount}
            notesCount={notesCount}
            onToggleTodoPanel={() => setShowTodoPanel(!showTodoPanel)}
            onToggleNotesPanel={() => setShowNotesPanel(!showNotesPanel)}
            showTodoPanel={showTodoPanel}
            showNotesPanel={showNotesPanel}
          />
        </aside>

        <div className="flex-1 flex min-w-0">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="border-b border-border/50 px-4 py-2 bg-card/30 flex items-center gap-2 shrink-0">
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
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              {editorMode === 'conversation' ? (
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
                  onMarkComplete={handleMarkComplete}
                  isCompleted={status === 'completed'}
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

      <Dialog open={showTodoPanel} onOpenChange={setShowTodoPanel}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.biography.todos}</DialogTitle>
          </DialogHeader>
          <TodoPanel
            content={content}
            onSectionChange={(key) => {
              handleSectionChange(key);
              setShowTodoPanel(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showNotesPanel} onOpenChange={setShowNotesPanel}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.biography.notes}</DialogTitle>
          </DialogHeader>
          <NotesOverviewPanel
            biographyId={id}
            onSectionChange={(key) => {
              handleSectionChange(key);
              setShowNotesPanel(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
