'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Download, Loader as Loader2, Info, TriangleAlert as AlertTriangle, X, RefreshCw, FileWarning, Eye } from 'lucide-react';
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
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import { generateBiographyPDF, checkBiographyPdfReadiness, getPdfReadinessMessage, type PdfReadinessIssue } from '@/lib/pdf-export';
import { exportAsPlainText, exportAsDOCX } from '@/lib/export-utils';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import { format as formatDate } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  isFinalVersionSourceStatus,
  isReviewOrScreeningLockStatus,
  type BiographyPublicationStatus,
} from '@/lib/publication-state';

interface BiographyData {
  id?: string;
  title: string;
  author_name: string;
  content: Record<string, { text: string }>;
  content_freeflow?: string;
  biography_mode?: 'sections' | 'freeflow';
  narrative_order?: string[] | null;
  final_version?: string | null;
  status?: string;
  created_at: string;
  /** Preferred UI language for watermarks (falls back to DB when dialog opens). */
  content_language?: string | null;
}

interface AdvancedExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  biography: BiographyData;
  isPublished?: boolean;
  /** When under review, show notice and block PDF generation until status changes. */
  biographyStatus?: string;
}

type ExportFormat = 'pdf-b5-standard' | 'txt' | 'docx';
type ContentSelection = 'all' | 'completed' | 'custom';
type ReadinessStatus = 'checking' | 'ready' | 'not-ready';

export function AdvancedExportDialog({
  open,
  onOpenChange,
  biography,
  isPublished = false,
  biographyStatus,
}: AdvancedExportDialogProps) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<ExportFormat>('pdf-b5-standard');
  const [contentSelection, setContentSelection] = useState<ContentSelection>('all');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [includeNotesAndTodos, setIncludeNotesAndTodos] = useState(false);
  const [separateFiles, setSeparateFiles] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [noChaptersWarningDismissed, setNoChaptersWarningDismissed] = useState(false);
  const [readinessStatus, setReadinessStatus] = useState<ReadinessStatus>('checking');
  const [readinessIssues, setReadinessIssues] = useState<PdfReadinessIssue[]>([]);
  const [exportError, setExportError] = useState<string | null>(null);
  const [draftIteration, setDraftIteration] = useState<number | null>(null);
  const [contentLanguage, setContentLanguage] = useState<string>('en');
  const [showFinalDraftConfirm, setShowFinalDraftConfirm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const isPdfFormat = format === 'pdf-b5-standard';

  const checkReadiness = useCallback(async () => {
    if (!biography.id) return;
    setReadinessStatus('checking');
    const result = await checkBiographyPdfReadiness(biography.id, true);
    setReadinessIssues(result.issues);
    setReadinessStatus(result.ok ? 'ready' : 'not-ready');
  }, [biography.id]);

  const fetchDraftState = useCallback(async () => {
    if (!biography.id) return;
    if (biography.content_language) {
      setContentLanguage(biography.content_language);
    }
    const { data } = await supabase
      .from('biographies')
      .select('pdf_draft_iteration, content_language')
      .eq('id', biography.id)
      .maybeSingle();
    setDraftIteration(data?.pdf_draft_iteration ?? null);
    if (data?.content_language) {
      setContentLanguage(data.content_language);
    } else if (!biography.content_language) {
      setContentLanguage('en');
    }
  }, [biography.id, biography.content_language]);

  useEffect(() => {
    if (open && isPdfFormat && biography.id) {
      checkReadiness();
      if (!isPublished) {
        fetchDraftState();
      }
    }
  }, [open, isPdfFormat, biography.id, checkReadiness, fetchDraftState, isPublished]);

  const toggleSection = (sectionKey: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionKey)
        ? prev.filter((key) => key !== sectionKey)
        : [...prev, sectionKey]
    );
  };

  const getSectionsToExport = () => {
    if (contentSelection === 'all') {
      return BIOGRAPHY_SECTIONS.filter(
        (section) => biography.content[section.key]?.text?.trim()
      );
    } else if (contentSelection === 'completed') {
      return BIOGRAPHY_SECTIONS.filter((section) => {
        const content = biography.content[section.key];
        return content?.text?.trim() && content.text.length > 100;
      });
    } else {
      return BIOGRAPHY_SECTIONS.filter((section) =>
        selectedSections.includes(section.key)
      );
    }
  };

  const fetchNotesAndTodos = async (sectionKey: string) => {
    if (!biography.id) return { notes: [], todos: [] };

    const [notesResult, todosResult] = await Promise.all([
      supabase
        .from('section_notes')
        .select('*')
        .eq('biography_id', biography.id)
        .eq('section', sectionKey)
        .order('created_at', { ascending: true }),
      supabase
        .from('section_todos')
        .select('*')
        .eq('biography_id', biography.id)
        .eq('section', sectionKey)
        .order('is_completed', { ascending: true })
        .order('created_at', { ascending: true }),
    ]);

    return {
      notes: notesResult.data || [],
      todos: todosResult.data || [],
    };
  };

  const formatNotesAndTodos = (notes: any[], todos: any[]) => {
    let formatted = '';

    if (notes.length > 0) {
      formatted += '\n\n--- NOTE ---\n\n';
      notes.forEach((note, index) => {
        const date = formatDate(new Date(note.created_at), 'd MMM yyyy', { locale: it });
        formatted += `${index + 1}. ${note.content} (${date})\n`;
      });
    }

    if (todos.length > 0) {
      formatted += '\n\n--- PROMEMORIA ---\n\n';
      todos.forEach((todo) => {
        const status = todo.is_completed ? '[✓]' : '[ ]';
        const priority = todo.priority === 'high' ? '⚠️' : todo.priority === 'medium' ? '➡️' : '➖';
        const dueDate = todo.due_date ? ` (Scadenza: ${formatDate(new Date(todo.due_date), 'd MMM yyyy', { locale: it })})` : '';
        formatted += `${status} ${priority} ${todo.description}${dueDate}\n`;
      });
    }

    return formatted;
  };

  const performExport = async (iterationToUse: number | null) => {
    setIsExporting(true);
    setExportError(null);
    try {
      const st = biography.status as BiographyPublicationStatus | undefined;
      const isFinalOrPublished = st ? isFinalVersionSourceStatus(st) : false;
      const isFreeFlow = biography.biography_mode === 'freeflow';

      if (isFinalOrPublished && biography.final_version) {
        const finalBio = {
          ...biography,
          biography_mode: 'freeflow' as const,
          content_freeflow: biography.final_version,
        };
        if (isPdfFormat) {
          await generateBiographyPDF(
            finalBio,
            'b5-standard',
            {
              createdWith: t.exportDialog.createdWith,
              allRightsReserved: t.exportDialog.allRightsReserved,
              preface: t.exportDialog.preface,
              epilogue: t.exportDialog.epilogue,
              acknowledgements: t.exportDialog.acknowledgements,
              specificCredits: t.exportDialog.specificCredits,
            },
            iterationToUse,
            contentLanguage
          );
        } else if (format === 'txt') {
          await exportAsPlainText(finalBio, [], false);
        } else if (format === 'docx') {
          await exportAsDOCX(finalBio, [], false);
        }
        onOpenChange(false);
        return;
      }

      if (isFreeFlow) {
        if (isPdfFormat) {
          await generateBiographyPDF(
            biography,
            'b5-standard',
            {
              createdWith: t.exportDialog.createdWith,
              allRightsReserved: t.exportDialog.allRightsReserved,
              preface: t.exportDialog.preface,
              epilogue: t.exportDialog.epilogue,
              acknowledgements: t.exportDialog.acknowledgements,
              specificCredits: t.exportDialog.specificCredits,
            },
            iterationToUse,
            contentLanguage
          );
        } else if (format === 'txt') {
          await exportAsPlainText(biography, [], false);
        } else if (format === 'docx') {
          await exportAsDOCX(biography, [], false);
        }
        onOpenChange(false);
        return;
      }

      const sectionsToExport = getSectionsToExport();

      if (sectionsToExport.length === 0) {
        alert(t.exportDialog.noSectionsError);
        setIsExporting(false);
        return;
      }

      const sections = await Promise.all(
        sectionsToExport.map(async (section) => {
          let content = biography.content[section.key].text;

          if (includeNotesAndTodos && biography.id) {
            const { notes, todos } = await fetchNotesAndTodos(section.key);
            if (notes.length > 0 || todos.length > 0) {
              content += formatNotesAndTodos(notes, todos);
            }
          }

          return {
            key: section.key,
            title: t.sectionTitles[section.key as keyof typeof t.sectionTitles] || section.title,
            content,
          };
        })
      );

      if (isPdfFormat) {
        const filteredBiography = {
          ...biography,
          content: Object.fromEntries(
            sections.map((s) => [s.key, { text: s.content }])
          ),
        };
        await generateBiographyPDF(
          filteredBiography,
          'b5-standard',
          {
            createdWith: t.exportDialog.createdWith,
            allRightsReserved: t.exportDialog.allRightsReserved,
            preface: t.exportDialog.preface,
            epilogue: t.exportDialog.epilogue,
            acknowledgements: t.exportDialog.acknowledgements,
            specificCredits: t.exportDialog.specificCredits,
          },
          iterationToUse,
          contentLanguage
        );
      } else if (format === 'txt') {
        await exportAsPlainText(biography, sections, separateFiles);
      } else if (format === 'docx') {
        await exportAsDOCX(biography, sections, separateFiles);
      }

      onOpenChange(false);
    } catch (error: any) {
      if (error?.message === 'MISSING_COVER_PHOTO' || error?.message === 'MISSING_BIOGRAPHY_ID') {
        setReadinessStatus('not-ready');
        setReadinessIssues(['missing-cover']);
        setExportError(t.exportDialog.noCoverPhotoWarning);
      } else if (error?.message === 'FONT_LOAD_FAILED') {
        setExportError(t.exportDialog.fontLoadError);
      } else {
        setExportError(t.exportDialog.exportError);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = async () => {
    if (!isPdfFormat || isPublished) {
      await performExport(null);
      return;
    }

    if (isPdfFormat && biography.status === 'final_version') {
      setExportError(t.exportDialog.draftPhaseRequiredBeforeDraft);
      return;
    }

    const nextIteration = (draftIteration ?? 0) + 1;

    if (nextIteration > 3) {
      setExportError(t.exportDialog.draftLimitReached);
      return;
    }

    if (nextIteration === 3 && !showFinalDraftConfirm) {
      setShowFinalDraftConfirm(true);
      return;
    }

    if (biography.id) {
      await supabase
        .from('biographies')
        .update({ pdf_draft_iteration: nextIteration })
        .eq('id', biography.id);
      setDraftIteration(nextIteration);
    }

    await performExport(nextIteration);
  };

  const handleConfirmFinalDraft = async () => {
    setShowFinalDraftConfirm(false);
    const nextIteration = 3;
    if (biography.id) {
      await supabase
        .from('biographies')
        .update({ pdf_draft_iteration: nextIteration })
        .eq('id', biography.id);
      setDraftIteration(nextIteration);
    }
    await performExport(nextIteration);
  };

  const handlePreview = async () => {
    if (biographyStatus && isReviewOrScreeningLockStatus(biographyStatus as BiographyPublicationStatus)) return;
    if (readinessStatus === 'not-ready') return;
    if (biography.status === 'final_version') {
      setExportError(t.exportDialog.draftPhaseRequiredBeforeDraft);
      return;
    }
    setIsPreviewing(true);
    setExportError(null);
    try {
      const isFreeFlow = biography.biography_mode === 'freeflow';

      let biographyForPreview = biography;

      if (!isFreeFlow) {
        const sectionsToExport = getSectionsToExport();
        if (sectionsToExport.length > 0) {
          biographyForPreview = {
            ...biography,
            content: Object.fromEntries(
              sectionsToExport.map((s) => [s.key, { text: biography.content[s.key]?.text ?? '' }])
            ),
          };
        }
      }

      const url = await generateBiographyPDF(
        biographyForPreview,
        'b5-standard',
        {
          createdWith: t.exportDialog.createdWith,
          allRightsReserved: t.exportDialog.allRightsReserved,
          preface: t.exportDialog.preface,
          epilogue: t.exportDialog.epilogue,
          acknowledgements: t.exportDialog.acknowledgements,
          specificCredits: t.exportDialog.specificCredits,
        },
        draftIteration,
        contentLanguage,
        true
      ) as string;

      setPreviewUrl(url);
    } catch (error: any) {
      if (error?.message === 'MISSING_COVER_PHOTO' || error?.message === 'MISSING_BIOGRAPHY_ID') {
        setExportError(t.exportDialog.noCoverPhotoWarning);
      } else if (error?.message === 'FONT_LOAD_FAILED') {
        setExportError(t.exportDialog.fontLoadError);
      } else {
        setExportError(t.exportDialog.exportError);
      }
    } finally {
      setIsPreviewing(false);
    }
  };

  const allFormats: { value: ExportFormat; label: string; description?: string; pdfOnly?: boolean }[] = [
    { value: 'pdf-b5-standard', label: t.exportDialog.pdfB5Standard, pdfOnly: true },
    { value: 'txt', label: 'Plain Text (.txt)', description: 'Plain text, no formatting preserved' },
    { value: 'docx', label: 'Word Document (.docx)', description: 'Text with bold and italic preserved. Compatible with Word, Pages, Google Docs.' },
  ];

  const visibleFormats = allFormats;

  const reviewLocked =
    !!biographyStatus && isReviewOrScreeningLockStatus(biographyStatus as BiographyPublicationStatus);
  const pdfNotReady = isPdfFormat && readinessStatus === 'not-ready';
  const draftLimitExceeded = !isPublished && isPdfFormat && (draftIteration ?? 0) >= 3;
  const downloadDisabled =
    isExporting ||
    reviewLocked ||
    (biography.biography_mode !== 'freeflow' &&
      contentSelection === 'custom' &&
      selectedSections.length === 0) ||
    pdfNotReady ||
    draftLimitExceeded;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.exportDialog.title}</DialogTitle>
          <DialogDescription>
            {t.exportDialog.description}
          </DialogDescription>
        </DialogHeader>

        {reviewLocked && (
          <div className="flex items-start gap-3 rounded-lg bg-brand-mustardLight/45 border border-brand-mustardDark/40 dark:bg-brand-mustardDark/20 dark:border-brand-mustardDark/50 px-4 py-3 text-sm text-brand-ink dark:text-brand-beigeLight">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Export is disabled while your biography is under review. You can download again after
              moderation finishes.
            </p>
          </div>
        )}

        {biography.biography_mode === 'freeflow' && !noChaptersWarningDismissed && (
          <div className="flex items-start gap-3 rounded-lg bg-brand-mustardLight/45 border border-brand-mustardDark/40 dark:bg-brand-mustardDark/20 dark:border-brand-mustardDark/50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-brand-mustardDark dark:text-brand-mustardLight" />
            <p className="text-sm text-brand-ink dark:text-brand-beigeLight leading-relaxed flex-1">
              {t.editor.noChaptersWarning}
            </p>
            <button
              type="button"
              onClick={() => setNoChaptersWarningDismissed(true)}
              className="shrink-0 text-brand-mustardDark dark:text-brand-mustardLight hover:text-brand-ink dark:hover:text-brand-beigeLight transition-colors"
              aria-label={t.common.close}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {isPdfFormat && readinessStatus === 'not-ready' && readinessIssues.length > 0 && (
          <div className="flex items-start gap-3 rounded-lg bg-brand-mustardLight/45 border border-brand-mustardDark/40 dark:bg-brand-mustardDark/20 dark:border-brand-mustardDark/50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-brand-mustardDark dark:text-brand-mustardLight" />
            <div className="flex-1 space-y-1">
              {readinessIssues.map((issue) => (
                <p key={issue} className="text-sm text-brand-ink dark:text-brand-beigeLight leading-relaxed">
                  {getPdfReadinessMessage(issue, t.exportDialog.noCoverPhotoWarning)}
                </p>
              ))}
            </div>
            <button
              type="button"
              onClick={checkReadiness}
              className="shrink-0 text-brand-mustardDark dark:text-brand-mustardLight hover:text-brand-ink dark:hover:text-brand-beigeLight transition-colors"
              aria-label="Retry"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        )}

        {exportError === t.exportDialog.fontLoadError && (
          <div className="flex items-start gap-3 rounded-lg bg-brand-wine/10 border border-brand-wine/35 px-4 py-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-brand-wine" />
            <p className="text-sm text-brand-wineDark dark:text-brand-beigeLight leading-relaxed flex-1">{t.exportDialog.fontLoadError}</p>
          </div>
        )}

        {exportError && exportError !== t.exportDialog.noCoverPhotoWarning && exportError !== t.exportDialog.fontLoadError && (
          <div className="flex items-start gap-3 rounded-lg bg-brand-wine/10 border border-brand-wine/35 px-4 py-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-brand-wine" />
            <p className="text-sm text-brand-wineDark dark:text-brand-beigeLight leading-relaxed flex-1">{exportError}</p>
          </div>
        )}

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {!isPublished && isPdfFormat && (
              <div className="flex items-start gap-3 rounded-lg bg-brand-mustardLight/45 border border-brand-mustardDark/40 dark:bg-brand-mustardDark/20 dark:border-brand-mustardDark/50 px-4 py-3">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-brand-ink/85 dark:text-brand-mustardLight" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm text-brand-ink dark:text-brand-beigeLight leading-relaxed">
                    {t.exportDialog.pdfDraftNotice}
                  </p>
                  <p className="text-xs text-brand-ink/80 dark:text-brand-beigeLight/85 font-medium">
                    {draftIteration == null
                      ? t.exportDialog.draftIterationNone
                      : t.exportDialog.draftIterationCurrent
                          .replace('{n}', String(draftIteration))
                          .replace('{next}', String((draftIteration ?? 0) + 1))
                          .replace('{max}', '3')}
                  </p>
                </div>
              </div>
            )}
            {!isPublished && isPdfFormat && (draftIteration ?? 0) >= 3 && (
              <div className="flex items-start gap-3 rounded-lg bg-brand-wine/12 border border-brand-wine/40 px-4 py-3 dark:bg-brand-wine/20 dark:border-brand-wine/45">
                <FileWarning className="h-4 w-4 mt-0.5 shrink-0 text-brand-wine dark:text-brand-beigeLight" />
                <p className="text-sm text-brand-wineDark dark:text-brand-beigeLight leading-relaxed">
                  {t.exportDialog.draftLimitReached}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-base font-semibold">{t.exportDialog.formatLabel}</Label>
              <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                {visibleFormats.map((fmt) => (
                  <div key={fmt.value} className="flex items-start space-x-2">
                    <RadioGroupItem value={fmt.value} id={`format-${fmt.value}`} className="mt-0.5" />
                    <div className="flex flex-col">
                      <Label htmlFor={`format-${fmt.value}`} className="font-normal cursor-pointer">
                        {fmt.label}
                      </Label>
                      {fmt.description && (
                        <span className="text-xs text-muted-foreground">{fmt.description}</span>
                      )}
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-base font-semibold">{t.exportDialog.contentLabel}</Label>
              <RadioGroup
                value={contentSelection}
                onValueChange={(v) => setContentSelection(v as ContentSelection)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="content-all" />
                  <Label htmlFor="content-all" className="font-normal cursor-pointer">
                    {t.exportDialog.allSections}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="completed" id="content-completed" />
                  <Label htmlFor="content-completed" className="font-normal cursor-pointer">
                    {t.exportDialog.completedSections}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="content-custom" />
                  <Label htmlFor="content-custom" className="font-normal cursor-pointer">
                    {t.exportDialog.customSections}
                  </Label>
                </div>
              </RadioGroup>

              {contentSelection === 'custom' && (
                <div className="ml-6 mt-3 space-y-2 border-l-2 border-border pl-4">
                  {BIOGRAPHY_SECTIONS.map((section) => {
                    const sectionTitle =
                      t.sectionTitles[section.key as keyof typeof t.sectionTitles] ||
                      section.title;
                    const hasContent = biography.content[section.key]?.text?.trim();

                    return (
                      <div key={section.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`section-${section.key}`}
                          checked={selectedSections.includes(section.key)}
                          onCheckedChange={() => toggleSection(section.key)}
                          disabled={!hasContent}
                        />
                        <Label
                          htmlFor={`section-${section.key}`}
                          className={`font-normal cursor-pointer ${
                            !hasContent ? 'text-muted-foreground' : ''
                          }`}
                        >
                          {sectionTitle}
                          {!hasContent && ` ${t.exportDialog.emptySection}`}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-base font-semibold">{t.exportDialog.additionalOptions}</Label>

              {!isPdfFormat && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="separate-files"
                    checked={separateFiles}
                    onCheckedChange={(checked) => setSeparateFiles(checked as boolean)}
                  />
                  <Label htmlFor="separate-files" className="font-normal cursor-pointer">
                    {t.exportDialog.separateFiles}
                  </Label>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-metadata"
                  checked={includeMetadata}
                  onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
                />
                <Label htmlFor="include-metadata" className="font-normal cursor-pointer">
                  {t.exportDialog.includeMetadata}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-notes-todos"
                  checked={includeNotesAndTodos}
                  onCheckedChange={(checked) => setIncludeNotesAndTodos(checked as boolean)}
                />
                <Label htmlFor="include-notes-todos" className="font-normal cursor-pointer">
                  {t.exportDialog.includeNotesTodos}
                </Label>
              </div>
            </div>
          </div>
        </ScrollArea>

        {previewUrl && (
          <div className="border border-border rounded-lg overflow-hidden flex flex-col" style={{ height: '420px' }}>
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border shrink-0">
              <span className="text-xs font-medium text-muted-foreground">PDF Preview</span>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close preview"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <iframe
              src={previewUrl}
              className="flex-1 w-full"
              title="PDF Preview"
            />
          </div>
        )}

        <div className="px-1 pb-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {biography.biography_mode === 'freeflow'
              ? t.editor.exportModeFreeFlow
              : t.editor.exportModeSections}
          </p>
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row items-end sm:items-center">
          {!isPublished && isPdfFormat && (
            <span className="text-xs text-muted-foreground sm:mr-auto">
              {(draftIteration ?? 0)} of 3 drafts used
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting || isPreviewing}
          >
            {t.exportDialog.cancel}
          </Button>
          {isPdfFormat && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              disabled={isExporting || isPreviewing || pdfNotReady}
            >
              {isPreviewing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </>
              )}
            </Button>
          )}
          <Button
            type="button"
            onClick={handleExport}
            disabled={downloadDisabled || isPreviewing}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.exportDialog.exporting}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {t.exportDialog.export}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showFinalDraftConfirm} onOpenChange={setShowFinalDraftConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.exportDialog.finalDraftConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.exportDialog.finalDraftConfirmDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.exportDialog.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmFinalDraft}>
            {t.exportDialog.export}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
