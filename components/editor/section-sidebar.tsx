'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Circle, Flag, ChevronRight, ChevronDown, StickyNote, Images, Upload, Download, Lock, BookOpen, FileCheck, RotateCcw, CircleCheck, Landmark, Link2, User, CloudOff, Loader as Loader2, Users, Globe } from 'lucide-react';
import {
  BIOGRAPHY_SECTIONS,
  type BiographyContent,
  getSectionData,
} from '@/lib/editor-constants';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { OPEN_EDITOR_TOOLS_EVENT } from '@/lib/onboarding/tour-mobile';

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';
type Privacy = 'private' | 'link-only' | 'public';

const privacyIcons: Record<Privacy, typeof Lock> = {
  private: Lock,
  'link-only': Users,
  public: Globe,
};

const privacyOrder: Privacy[] = ['private', 'link-only', 'public'];

interface SectionSidebarProps {
  content: BiographyContent;
  activeSection: string;
  onSectionChange: (key: string) => void;
  globalNotesCount: number;
  globalTodosCount: number;
  onToggleNotesPanel: () => void;
  onTogglePhotosPanel: () => void;
  onToggleBookStructurePanel: () => void;
  onTogglePermanencePanel: () => void;
  onToggleImportText: () => void;
  onToggleExportText: () => void;
  onToggleReviewPublication: () => void;
  /** When set, a share-link item sits beside Tools and opens a popup. */
  onOpenShareLink?: () => void;
  showShareLink?: boolean;
  shareLinkOpen?: boolean;
  /** When true, export control is disabled (e.g. biography under review). */
  exportDisabled?: boolean;
  showNotesPanel: boolean;
  showPhotosPanel: boolean;
  showBookStructurePanel: boolean;
  showPermanencePanel: boolean;
  permanenceLabel?: string;
  showImportDialog: boolean;
  showReviewPublicationDialog?: boolean;
  completedSections?: string[];
  onMarkSectionComplete?: (sectionKey: string) => void;
  onMarkSectionIncomplete?: (sectionKey: string) => void;
  biographyMode: 'sections' | 'freeflow';
  contentFreeflow: string;
  onModeChange: (mode: 'sections' | 'freeflow') => void;
  onModeChangeRequest?: (mode: 'sections' | 'freeflow') => void;
  onFreeflowChange: (value: string) => void;
  biographyId?: string;
  userId?: string;
  lockedSectionKeys?: Set<string>;
  title: string;
  onTitleChange: (title: string) => void;
  authorName?: string;
  onAuthorNameChange?: (name: string) => void;
  biographyType?: 'autobiography' | 'memorial';
  isFrozen?: boolean;
  saveStatus: SaveStatus;
  privacy: Privacy;
  onPrivacyChange: (privacy: Privacy) => void;
}

export function SectionSidebar({
  content,
  activeSection,
  onSectionChange,
  globalNotesCount,
  globalTodosCount,
  onToggleNotesPanel,
  onTogglePhotosPanel,
  onToggleBookStructurePanel,
  onTogglePermanencePanel,
  onToggleImportText,
  onToggleExportText,
  onToggleReviewPublication,
  onOpenShareLink,
  showShareLink = false,
  shareLinkOpen = false,
  exportDisabled = false,
  showNotesPanel,
  showPhotosPanel,
  showBookStructurePanel,
  showPermanencePanel,
  permanenceLabel,
  showImportDialog,
  showReviewPublicationDialog = false,
  completedSections = [],
  onMarkSectionComplete,
  onMarkSectionIncomplete,
  biographyMode,
  contentFreeflow,
  onModeChange,
  onModeChangeRequest,
  onFreeflowChange,
  biographyId,
  userId,
  lockedSectionKeys,
  title,
  onTitleChange,
  authorName = '',
  onAuthorNameChange,
  biographyType = 'autobiography',
  isFrozen = false,
  saveStatus,
  privacy,
  onPrivacyChange,
}: SectionSidebarProps) {
  const { t } = useTranslation();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isEditingAuthor, setIsEditingAuthor] = useState(false);
  const [editAuthor, setEditAuthor] = useState(authorName);
  const authorInputRef = useRef<HTMLInputElement>(null);
  const toolsVisible =
    toolsOpen ||
    showPermanencePanel ||
    showNotesPanel ||
    showPhotosPanel ||
    showBookStructurePanel ||
    showImportDialog ||
    showReviewPublicationDialog;

  const totalCount = globalNotesCount + globalTodosCount;
  const isFreeflow = biographyMode === 'freeflow';
  const handleModeClick = (mode: 'sections' | 'freeflow') => {
    if (mode === biographyMode) return;
    if (onModeChangeRequest) {
      onModeChangeRequest(mode);
    } else {
      onModeChange(mode);
    }
  };

  useEffect(() => {
    const openTools = () => setToolsOpen(true);
    window.addEventListener(OPEN_EDITOR_TOOLS_EVENT, openTools);
    return () => window.removeEventListener(OPEN_EDITOR_TOOLS_EVENT, openTools);
  }, []);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingAuthor && authorInputRef.current) {
      authorInputRef.current.focus();
      authorInputRef.current.select();
    }
  }, [isEditingAuthor]);

  useEffect(() => {
    if (!isEditingAuthor) setEditAuthor(authorName);
  }, [authorName, isEditingAuthor]);

  const handleTitleSubmit = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== title) {
      onTitleChange(trimmed);
    } else {
      setEditTitle(title);
    }
    setIsEditingTitle(false);
  };

  const handleAuthorSubmit = () => {
    onAuthorNameChange?.(editAuthor.trim());
    setIsEditingAuthor(false);
  };

  const isMemorial = biographyType === 'memorial';
  const titleDisplay = title || (isMemorial ? t.biography.subjectNameLabel : t.biography.untitled);
  const privacyLabels: Record<Privacy, string> = {
    private: t.dashboard.private,
    'link-only': t.dashboard.family,
    public: t.dashboard.public,
  };
  const saveStatusConfig: Record<SaveStatus, { icon: typeof Check; text: string; className: string }> = {
    saved: { icon: Check, text: t.common.saved, className: 'text-[#5E685A] dark:text-[#C8DFBE]' },
    saving: { icon: Loader2, text: t.common.saving, className: 'text-muted-foreground' },
    unsaved: { icon: CloudOff, text: t.editor.unsaved, className: 'text-brand-mustardDark dark:text-brand-mustardLight' },
    error: { icon: CloudOff, text: t.editor.saveFailed, className: 'text-destructive' },
  };
  const status = saveStatusConfig[saveStatus];
  const StatusIcon = status.icon;
  const CurrentPrivacyIcon = privacyIcons[privacy] ?? Lock;
  const nextPrivacy = privacyOrder[(privacyOrder.indexOf(privacy) + 1) % privacyOrder.length];

  return (
    <nav className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2.5 shrink-0 space-y-1 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="h-4 w-4 text-primary shrink-0" />
          {isEditingTitle ? (
            <Input
              ref={titleInputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setEditTitle(title);
                  setIsEditingTitle(false);
                }
              }}
              className="h-8 text-sm font-medium min-w-0"
            />
          ) : (
            <button
              type="button"
              data-tour-id="book-title-btn"
              onClick={() => {
                setEditTitle(title);
                setIsEditingTitle(true);
              }}
              className="text-sm font-medium truncate min-w-0 flex-1 text-left hover:text-primary transition-colors"
            >
              {titleDisplay}
            </button>
          )}
        </div>
        {onAuthorNameChange && !isFrozen && (
          <div className="flex items-center gap-2 min-w-0">
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {isEditingAuthor ? (
              <Input
                ref={authorInputRef}
                value={editAuthor}
                onChange={(e) => setEditAuthor(e.target.value)}
                onBlur={handleAuthorSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAuthorSubmit();
                  if (e.key === 'Escape') {
                    setEditAuthor(authorName);
                    setIsEditingAuthor(false);
                  }
                }}
                className="h-8 text-sm min-w-0"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditAuthor(authorName);
                  setIsEditingAuthor(true);
                }}
                className="text-sm text-muted-foreground truncate min-w-0 flex-1 text-left hover:text-foreground transition-colors"
              >
                {isMemorial && authorName
                  ? `${t.biography.writtenBy} ${authorName}`
                  : authorName || t.biography.addAuthorName}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="px-3 h-12 shrink-0 flex items-center border-b border-border/50">
        <div className="flex w-full rounded-lg overflow-hidden border border-border/60 text-xs font-medium min-w-0">
          <button
            onClick={() => handleModeClick('sections')}
            className={cn(
              'flex-1 min-w-0 py-1.5 px-1.5 transition-colors truncate text-center',
              biographyMode === 'sections'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            {t.editor.sectionsTab}
          </button>
          <button
            onClick={() => handleModeClick('freeflow')}
            className={cn(
              'flex-1 min-w-0 py-1.5 px-1.5 transition-colors border-l border-border/60 truncate text-center',
              biographyMode === 'freeflow'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            {t.editor.freeFlowTab}
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {!isFreeflow && (
          <div>
            {BIOGRAPHY_SECTIONS.map((section) => {
              const data = getSectionData(content, section.key);
              const isActive = activeSection === section.key;
              const hasContent = data.text.trim().length > 0;
              const isTodo = data.todo;
              const isCompleted = completedSections.includes(section.key);
              const isLockedByRevision = lockedSectionKeys?.has(section.key) === false && (lockedSectionKeys?.size ?? 0) > 0;
              const sectionTitle = t.sectionTitles[section.key as keyof typeof t.sectionTitles] || section.title;

              return (
                <button
                  key={section.key}
                  onClick={() => onSectionChange(section.key)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 lg:py-2.5 text-left text-sm transition-colors',
                    isCompleted
                      ? 'bg-[#C4DAEB] dark:bg-[#C4DAEB]/20 text-[#121212] dark:text-[#121212]'
                      : isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    isLockedByRevision && 'opacity-50'
                  )}
                  style={!isFreeflow ? {
                    fontFamily: "'Noto Serif', Georgia, serif",
                    fontWeight: 400,
                    fontSize: '1.0625rem',
                    lineHeight: '1.2',
                    fontSynthesis: 'none',
                  } : undefined}
                >
                  <span className="shrink-0">
                    {isLockedByRevision ? (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : isCompleted ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : isTodo ? (
                      <Flag className="h-3.5 w-3.5 text-text-primary dark:text-dark-text-primary" />
                    ) : hasContent ? (
                      <Check className="h-3.5 w-3.5 text-text-primary dark:text-dark-text-primary" />
                    ) : (
                      <Circle className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="truncate flex-1">{sectionTitle}</span>
                  {!isCompleted && onMarkSectionComplete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkSectionComplete(section.key);
                      }}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-primary/15 hover:text-primary"
                      title={t.status.markCompleteWhenFinished}
                      aria-label={t.status.markComplete}
                    >
                      <CircleCheck className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isCompleted && onMarkSectionIncomplete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkSectionIncomplete(section.key);
                      }}
                      className="shrink-0 rounded p-0.5 text-primary hover:bg-primary/15"
                      title={t.status.markIncomplete}
                      aria-label={t.status.markIncomplete}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  )}
                </button>
              );
            })}

          </div>
        )}
      </ScrollArea>

      <div className="border-t border-border/50 p-1.5 space-y-0.5 shrink-0">
        <div className={cn('flex items-center gap-2 px-3 py-1 lg:py-2 text-sm', status.className)}>
          <StatusIcon className={cn('h-4 w-4 shrink-0', saveStatus === 'saving' && 'animate-spin')} />
          <span className="truncate">{status.text}</span>
        </div>
        <button
          type="button"
          data-tour-id="export-pdf-btn"
          onClick={onToggleExportText}
          disabled={exportDisabled}
          title={
            exportDisabled
              ? 'Export is unavailable while the biography is under review.'
              : undefined
          }
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1 lg:py-2 rounded-lg text-sm transition-colors',
            exportDisabled
              ? 'text-muted-foreground/50 cursor-not-allowed'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )}
        >
          <Download className="h-4 w-4 shrink-0" />
          <span className="truncate min-w-0 flex-1 text-left">{t.notesAndTodos.exportText}</span>
        </button>
        {showShareLink && onOpenShareLink && (
          <button
            type="button"
            onClick={onOpenShareLink}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1 lg:py-2 rounded-lg text-sm transition-colors',
              shareLinkOpen
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <Link2 className="h-4 w-4 shrink-0" />
            <span className="truncate min-w-0 flex-1 text-left">{t.biography.shareLink}</span>
          </button>
        )}
        <div className="h-px bg-black dark:bg-white mx-2 my-1" />
        <button
          type="button"
          data-tour-id="editor-tools-btn"
          onClick={() => setToolsOpen((open) => !open)}
          className="w-full flex items-center gap-2 px-3 py-1 lg:py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', toolsVisible && 'rotate-180')} />
          <span className="truncate min-w-0 flex-1 text-left">{t.editor.tools}</span>
        </button>
        {toolsVisible && (
        <>
        {!isFrozen && (
          <button
            type="button"
            data-tour-id="privacy-btn"
            onClick={() => onPrivacyChange(nextPrivacy)}
            className="w-full flex items-center gap-2 px-3 py-1 lg:py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <CurrentPrivacyIcon className="h-4 w-4 shrink-0" />
            <span className="truncate min-w-0 flex-1 text-left">{privacyLabels[privacy]}</span>
          </button>
        )}
        {biographyId && (
          <button
            type="button"
            data-tour-id="permanence-btn"
            onClick={onTogglePermanencePanel}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1 lg:py-2 rounded-lg text-sm transition-colors',
              showPermanencePanel
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <Landmark className="h-4 w-4 shrink-0" />
            <span className="truncate min-w-0 flex-1 text-left">
              {permanenceLabel ?? t.permanence.title}
            </span>
          </button>
        )}
        <button
          type="button"
          data-tour-id="notes-btn"
          onClick={onToggleNotesPanel}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1 lg:py-2 rounded-lg text-sm transition-colors',
            showNotesPanel
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )}
        >
          <StickyNote className="h-4 w-4 shrink-0" />
          <span className="truncate min-w-0 flex-1 text-left">{t.notesAndTodos.notesAndTodosMenuItem}</span>
          {totalCount > 0 && (
            <span className="ml-auto text-xs font-medium bg-primary/20 text-foreground rounded-full px-2 py-0.5 shrink-0">
              {totalCount}
            </span>
          )}
        </button>
        <button
          type="button"
          data-tour-id="photos-btn"
          onClick={onTogglePhotosPanel}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1 lg:py-2 rounded-lg text-sm transition-colors',
            showPhotosPanel
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )}
        >
          <Images className="h-4 w-4 shrink-0" />
          <span className="truncate min-w-0 flex-1 text-left">{t.photos.panelTitle}</span>
        </button>
        {biographyId && userId && (
          <button
            type="button"
            data-tour-id="book-structure-btn"
            onClick={onToggleBookStructurePanel}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1 lg:py-2 rounded-lg text-sm transition-colors',
              showBookStructurePanel
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className="truncate min-w-0 flex-1 text-left">{t.editor.bookStructureTitle}</span>
          </button>
        )}
        <button
          type="button"
          data-tour-id="import-btn"
          onClick={onToggleImportText}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1 lg:py-2 rounded-lg text-sm transition-colors',
            showImportDialog
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )}
        >
          <Upload className="h-4 w-4 shrink-0" />
          <span className="truncate min-w-0 flex-1 text-left">{t.notesAndTodos.importText}</span>
        </button>
        <button
          type="button"
          data-tour-id="review-publication-btn"
          onClick={onToggleReviewPublication}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1 lg:py-2 rounded-lg text-sm transition-colors',
            showReviewPublicationDialog
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )}
        >
          <FileCheck className="h-4 w-4 shrink-0" />
          <span className="truncate min-w-0 flex-1 text-left">{t.editor.reviewPublication.menuItem}</span>
        </button>
        </>
        )}
      </div>

    </nav>
  );
}
