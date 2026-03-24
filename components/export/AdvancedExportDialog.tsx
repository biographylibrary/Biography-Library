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
import { Download, Loader as Loader2, Info } from 'lucide-react';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import { generateBiographyPDF } from '@/lib/pdf-export';
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
  created_at: string;
}

interface AdvancedExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  biography: BiographyData;
  isPublished?: boolean;
}

type ExportFormat = 'pdf' | 'txt' | 'rtf' | 'docx';
type ContentSelection = 'all' | 'completed' | 'custom';

export function AdvancedExportDialog({
  open,
  onOpenChange,
  biography,
  isPublished = false,
}: AdvancedExportDialogProps) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<ExportFormat>(isPublished ? 'pdf' : 'txt');
  const [contentSelection, setContentSelection] = useState<ContentSelection>('all');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [includeNotesAndTodos, setIncludeNotesAndTodos] = useState(false);
  const [separateFiles, setSeparateFiles] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

      switch (format) {
        case 'pdf':
          const filteredBiography = {
            ...biography,
            content: Object.fromEntries(
              sections.map((s) => [s.key, { text: s.content }])
            ),
          };
          generateBiographyPDF(filteredBiography);
          break;
        case 'txt':
          await exportAsPlainText(biography, sections, separateFiles);
          break;
        case 'rtf':
          await exportAsRTF(biography, sections, separateFiles);
          break;
        case 'docx':
          await exportAsDOCX(biography, sections, separateFiles);
          break;
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      alert(t.exportDialog.exportError);
    } finally {
      setIsExporting(false);
    }
  };

  const formatLabels: Record<ExportFormat, string> = {
    pdf: t.exportDialog.pdfFormat,
    txt: t.exportDialog.txtFormat,
    rtf: t.exportDialog.rtfFormat,
    docx: t.exportDialog.docxFormat,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.exportDialog.title}</DialogTitle>
          <DialogDescription>
            {t.exportDialog.description}
          </DialogDescription>
        </DialogHeader>

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
                {(['pdf', 'txt', 'rtf', 'docx'] as ExportFormat[])
                  .filter(fmt => isPublished || fmt !== 'pdf')
                  .map((fmt) => (
                    <div key={fmt} className="flex items-center space-x-2">
                      <RadioGroupItem value={fmt} id={`format-${fmt}`} />
                      <Label htmlFor={`format-${fmt}`} className="font-normal cursor-pointer">
                        {formatLabels[fmt]}
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

              {format !== 'pdf' && (
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
            disabled={isExporting || (contentSelection === 'custom' && selectedSections.length === 0)}
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
