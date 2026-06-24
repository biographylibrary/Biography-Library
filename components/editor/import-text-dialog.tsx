'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, CircleAlert as AlertCircle, Loader as Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  editorSidebarDialogContentClass,
  editorSidebarDialogContentStyle,
} from '@/components/editor/EditorSidebarDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  parseTextFiles,
  parsePastedText,
  TextImportError,
  getImportErrorMessage,
  type ParsedText,
} from '@/lib/text-import-parser';
import { appendHtml } from '@/lib/import/html-blocks';
import { ImportSectionMappingWizard } from '@/components/import/ImportSectionMappingWizard';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { BIOGRAPHY_SECTIONS, type BiographyContent, getSectionData } from '@/lib/editor-constants';

interface ImportTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  biographyId: string;
  currentSectionKey: string;
  currentSectionContent: string;
  currentFreeflowContent: string;
  sectionContents?: BiographyContent;
  onImportedToSection: (sectionKey: string, newContent: string) => void;
  onImportedToFreeflow: (newContent: string) => void;
  onImportMultipleSections?: (
    sections: Array<{ title: string; content: string; sectionKey?: string }>
  ) => void;
  biographyMode?: 'sections' | 'freeflow';
}

type ConflictAction = 'replace' | 'append';

export function ImportTextDialog({
  open,
  onOpenChange,
  biographyId,
  currentSectionKey,
  currentSectionContent,
  currentFreeflowContent,
  sectionContents,
  onImportedToSection,
  onImportedToFreeflow,
  onImportMultipleSections,
  biographyMode = 'sections',
}: ImportTextDialogProps) {
  const { t, language } = useTranslation();
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [parsedContent, setParsedContent] = useState<ParsedText | null>(null);
  const [queuedFiles, setQueuedFiles] = useState<string[]>([]);
  const [destination, setDestination] = useState<string>(currentSectionKey);
  const [inputMode, setInputMode] = useState<'input' | 'preview'>('input');
  const [importMode, setImportMode] = useState<ConflictAction>('append');
  const [showMappingWizard, setShowMappingWizard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setDestination(currentSectionKey);
  }, [open, currentSectionKey]);

  const getDestinationContent = useCallback(
    (dest: string) => {
      if (biographyMode === 'freeflow') return currentFreeflowContent;
      if (sectionContents) return getSectionData(sectionContents, dest).text;
      if (dest === currentSectionKey) return currentSectionContent;
      return '';
    },
    [biographyMode, sectionContents, currentSectionKey, currentSectionContent, currentFreeflowContent]
  );

  const destinationHasContent = useCallback(() => {
    const content = getDestinationContent(destination);
    return Boolean(content && content.trim().length > 0);
  }, [destination, getDestinationContent]);

  const resetDialog = useCallback(() => {
    setError(null);
    setPastedText('');
    setParsedContent(null);
    setQueuedFiles([]);
    setInputMode('input');
    setLoading(false);
    setDragActive(false);
    setSaving(false);
    setImportMode('append');
    setShowMappingWizard(false);
  }, []);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      setLoading(true);
      try {
        const list = Array.from(files);
        const parsed = await parseTextFiles(list, language);
        setParsedContent(parsed);
        setQueuedFiles(parsed.fileNames ?? list.map((f) => f.name));
        setInputMode('preview');
        if (!destinationHasContent() && biographyMode === 'sections') {
          setImportMode('replace');
        } else {
          setImportMode('append');
        }
      } catch (err) {
        if (err instanceof TextImportError) {
          setError(getImportErrorMessage(err.message, t));
        } else {
          setError(t.importDialog.fileReadError);
        }
      } finally {
        setLoading(false);
      }
    },
    [language, destinationHasContent, biographyMode, t]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files?.length) {
        void processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        void processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  const handlePasteImport = useCallback(() => {
    if (!pastedText.trim()) {
      setError(t.importDialog.pasteTextFirst);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const parsed = parsePastedText(pastedText, language);
      setParsedContent(parsed);
      setQueuedFiles([]);
      setInputMode('preview');
      setImportMode(destinationHasContent() ? 'append' : 'replace');
    } catch {
      setError(t.importDialog.textAnalysisError);
    } finally {
      setLoading(false);
    }
  }, [pastedText, t, language, destinationHasContent]);

  const applySingleImport = useCallback(
    (action: ConflictAction) => {
      if (!parsedContent) return;
      const incomingText = parsedContent.content;

      if (biographyMode === 'freeflow') {
        const newValue =
          action === 'replace'
            ? incomingText
            : appendHtml(currentFreeflowContent, incomingText);
        onImportedToFreeflow(newValue);
      } else {
        const existing = getDestinationContent(destination);
        const newValue =
          action === 'replace' ? incomingText : appendHtml(existing, incomingText);
        onImportedToSection(destination, newValue);
      }
      resetDialog();
      onOpenChange(false);
    },
    [
      parsedContent,
      biographyMode,
      currentFreeflowContent,
      getDestinationContent,
      destination,
      onImportedToFreeflow,
      onImportedToSection,
      resetDialog,
      onOpenChange,
    ]
  );

  const handleMappingConfirm = useCallback(
    (assignments: Array<{ sectionKey: string; content: string; append: boolean }>) => {
      if (!onImportMultipleSections) return;
      const grouped = new Map<string, string>();
      for (const a of assignments) {
        const prev = grouped.get(a.sectionKey) ?? getDestinationContent(a.sectionKey);
        grouped.set(
          a.sectionKey,
          a.append ? appendHtml(prev, a.content) : a.content
        );
      }
      const sections = Array.from(grouped.entries()).map(([sectionKey, content]) => {
        const meta = BIOGRAPHY_SECTIONS.find((s) => s.key === sectionKey);
        return {
          title: sectionKey,
          content,
          sectionKey,
        };
      });
      onImportMultipleSections(sections);
      setShowMappingWizard(false);
      resetDialog();
      onOpenChange(false);
    },
    [onImportMultipleSections, getDestinationContent, resetDialog, onOpenChange]
  );

  const handleImportConfirm = useCallback(() => {
    if (!parsedContent) return;

    const multiBlocks =
      parsedContent.hasSections &&
      parsedContent.sections &&
      parsedContent.sections.filter((s) => s.title).length > 1;

    if (multiBlocks && biographyMode === 'sections' && onImportMultipleSections) {
      setShowMappingWizard(true);
      return;
    }

    if (parsedContent.hasSections && parsedContent.sections?.length && onImportMultipleSections) {
      onImportMultipleSections(
        parsedContent.sections.map((s) => ({
          title: s.title,
          content: s.content,
          sectionKey: s.sectionKey ?? undefined,
        }))
      );
      resetDialog();
      onOpenChange(false);
      return;
    }

    const action =
      importMode === 'append' || destinationHasContent() ? importMode : 'replace';
    applySingleImport(action);
  }, [
    parsedContent,
    biographyMode,
    onImportMultipleSections,
    importMode,
    destinationHasContent,
    applySingleImport,
    resetDialog,
    onOpenChange,
  ]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) resetDialog();
      onOpenChange(newOpen);
    },
    [onOpenChange, resetDialog]
  );

  const previewHtml =
    parsedContent?.content ||
    (parsedContent?.sections?.map((s) => `<h2>${s.title}</h2>${s.content}`).join('') ?? '');

  const importModeRadios = (
    <div className="space-y-2">
      <Label>{t.editor.importSaveTo}</Label>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="radio"
            name="import-mode"
            value="replace"
            checked={importMode === 'replace'}
            onChange={() => setImportMode('replace')}
            className="accent-foreground h-4 w-4 shrink-0"
          />
          <span className="text-sm">{t.editor.importFreeFlowReplace}</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="radio"
            name="import-mode"
            value="append"
            checked={importMode === 'append'}
            onChange={() => setImportMode('append')}
            className="accent-foreground h-4 w-4 shrink-0"
          />
          <span className="text-sm">{t.editor.importFreeFlowAppend}</span>
        </label>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={editorSidebarDialogContentClass}
          style={editorSidebarDialogContentStyle}
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5 text-primary" />
              {t.importDialog.titleFreeflow}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            <div className="rounded-md px-4 py-3.5" style={{ backgroundColor: '#C4DAEB' }}>
              <p className="text-sm leading-snug text-foreground">
                {biographyMode === 'freeflow'
                  ? t.editor.importNoticeFreeflowMode
                  : t.editor.importNoticeSectionsMode}
              </p>
            </div>

            {biographyMode === 'sections' && (
              <div className="space-y-1.5">
                <Label>{t.editor.importSaveTo}</Label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BIOGRAPHY_SECTIONS.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {t.sectionTitles[s.key as keyof typeof t.sectionTitles] || s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {inputMode === 'input' && (
              <div className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                    dragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.docx,.rtf"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium mb-1">{t.importDialog.dragFile}</p>
                  <p className="text-xs text-muted-foreground">{t.importDialog.formats}</p>
                  {loading && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.importDialog.loading}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t.importDialog.or}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paste-text">{t.importDialog.pasteLabel}</Label>
                  <Textarea
                    id="paste-text"
                    placeholder={t.importDialog.pastePlaceholder}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="min-h-[120px] font-mono text-sm"
                  />
                </div>

                {(biographyMode === 'freeflow' || biographyMode === 'sections') &&
                  (pastedText.trim() || parsedContent) &&
                  importModeRadios}
              </div>
            )}

            {inputMode === 'preview' && parsedContent && (
              <div className="space-y-3">
                {queuedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {queuedFiles.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="rounded-md border border-border/60 bg-muted/30 p-4 max-h-[240px] overflow-y-auto import-preview">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">
                    {t.importDialog.preview}
                  </p>
                  <div
                    className="prose prose-sm max-w-none text-sm [&_h1]:text-xl [&_h1]:font-serif [&_h2]:text-lg [&_h2]:font-serif [&_h3]:text-base [&_h3]:font-semibold"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>

                {importModeRadios}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setParsedContent(null);
                    setQueuedFiles([]);
                    setInputMode('input');
                  }}
                >
                  {t.importDialog.back}
                </Button>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t.common.cancel}
            </Button>
            {inputMode === 'input' && pastedText.trim() && (
              <Button type="button" onClick={handlePasteImport} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t.importDialog.import}
              </Button>
            )}
            {inputMode === 'preview' && (
              <Button type="button" onClick={handleImportConfirm} disabled={!parsedContent || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t.importDialog.import}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {parsedContent?.sections && (
        <ImportSectionMappingWizard
          open={showMappingWizard}
          onOpenChange={setShowMappingWizard}
          blocks={parsedContent.sections}
          fallbackSectionKey={destination}
          onConfirm={handleMappingConfirm}
          onCancel={() => setShowMappingWizard(false)}
        />
      )}
    </>
  );
}
