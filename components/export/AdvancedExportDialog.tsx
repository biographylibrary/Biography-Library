'use client';

import { useState } from 'react';
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
import { Download, Loader as Loader2, Info, TriangleAlert as AlertTriangle, X } from 'lucide-react';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import { generateBiographyPDF, PdfVariant } from '@/lib/pdf-export';
import { exportAsPlainText, exportAsRTF, exportAsDOCX } from '@/lib/export-utils';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import { format as formatDate } from 'date-fns';
import { it } from 'date-fns/locale';

interface BiographyData {
  id?: string;
  title: string;
  author_name: string;
  content: Record<string, { text: string }>;
  content_freeflow?: string;
  biography_mode?: 'sections' | 'freeflow';
  created_at: string;
}

interface AdvancedExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  biography: BiographyData;
  isPublished?: boolean;
}

type ExportFormat = 'pdf-b5-standard' | 'pdf-b5-print' | 'txt' | 'rtf' | 'docx';
type ContentSelection = 'all' | 'completed' | 'custom';

export function AdvancedExportDialog({
  open,
  onOpenChange,
  biography,
  isPublished = false,
}: AdvancedExportDialogProps) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<ExportFormat>(isPublished ? 'pdf-b5-standard' : 'txt');
  const [contentSelection, setContentSelection] = useState<ContentSelection>('all');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [includeNotesAndTodos, setIncludeNotesAndTodos] = useState(false);
  const [separateFiles, setSeparateFiles] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [noChaptersWarningDismissed, setNoChaptersWarningDismissed] = useState(false);

  const isPdfFormat = format === 'pdf-b5-standard' || format === 'pdf-b5-print';

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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const isFreeFlow = biography.biography_mode === 'freeflow';

      if (isFreeFlow) {
        if (isPdfFormat) {
          const variant: PdfVariant = format === 'pdf-b5-print' ? 'b5-print' : 'b5-standard';
          await generateBiographyPDF(biography, variant, {
            createdWith: t.exportDialog.createdWith,
            allRightsReserved: t.exportDialog.allRightsReserved,
          });
        } else if (format === 'txt') {
          await exportAsPlainText(biography, [], false);
        } else if (format === 'rtf') {
          await exportAsRTF(biography, [], false);
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
        const variant: PdfVariant = format === 'pdf-b5-print' ? 'b5-print' : 'b5-standard';
        await generateBiographyPDF(filteredBiography, variant, {
          createdWith: t.exportDialog.createdWith,
          allRightsReserved: t.exportDialog.allRightsReserved,
        });
      } else if (format === 'txt') {
        await exportAsPlainText(biography, sections, separateFiles);
      } else if (format === 'rtf') {
        await exportAsRTF(biography, sections, separateFiles);
      } else if (format === 'docx') {
        await exportAsDOCX(biography, sections, separateFiles);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      alert(t.exportDialog.exportError);
    } finally {
      setIsExporting(false);
    }
  };

  const allFormats: { value: ExportFormat; label: string; pdfOnly?: boolean }[] = [
    { value: 'pdf-b5-standard', label: t.exportDialog.pdfB5Standard, pdfOnly: true },
    { value: 'pdf-b5-print', label: t.exportDialog.pdfB5PrintReady, pdfOnly: true },
    { value: 'txt', label: t.exportDialog.txtFormat },
    { value: 'rtf', label: t.exportDialog.rtfFormat },
    { value: 'docx', label: t.exportDialog.docxFormat },
  ];

  const visibleFormats = allFormats.filter((f) => isPublished || !f.pdfOnly);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.exportDialog.title}</DialogTitle>
          <DialogDescription>
            {t.exportDialog.description}
          </DialogDescription>
        </DialogHeader>

        {biography.biography_mode === 'freeflow' && !noChaptersWarningDismissed && (
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed flex-1">
              {t.editor.noChaptersWarning}
            </p>
            <button
              type="button"
              onClick={() => setNoChaptersWarningDismissed(true)}
              className="shrink-0 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
              aria-label={t.common.close}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {!isPublished && (
              <div className="flex items-start gap-3 rounded-lg bg-[#C8DFBE] dark:bg-[#C8DFBE]/20 border border-[#a8c99a] dark:border-[#C8DFBE]/30 px-4 py-3">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-[#3a6b30] dark:text-[#C8DFBE]" />
                <p className="text-sm text-[#2a4f27] dark:text-[#C8DFBE] leading-relaxed">
                  {t.exportDialog.pdfNotice}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-base font-semibold">{t.exportDialog.formatLabel}</Label>
              <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                {visibleFormats.map((fmt) => (
                  <div key={fmt.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={fmt.value} id={`format-${fmt.value}`} />
                    <Label htmlFor={`format-${fmt.value}`} className="font-normal cursor-pointer">
                      {fmt.label}
                    </Label>
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

        <div className="px-1 pb-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {biography.biography_mode === 'freeflow'
              ? t.editor.exportModeFreeFlow
              : t.editor.exportModeSections}
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            {t.exportDialog.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={isExporting || (biography.biography_mode !== 'freeflow' && contentSelection === 'custom' && selectedSections.length === 0)}
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
  );
}
