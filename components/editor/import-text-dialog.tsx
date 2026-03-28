'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, CircleAlert as AlertCircle, Loader as Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  parseTextFile,
  parsePastedText,
  TextImportError,
  type ParsedText,
} from '@/lib/text-import-parser';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';

interface ImportTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  biographyId: string;
  currentSectionKey: string;
  currentSectionContent: string;
  currentFreeflowContent: string;
  onImportedToSection: (sectionKey: string, newContent: string) => void;
  onImportedToFreeflow: (newContent: string) => void;
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
  onImportedToSection,
  onImportedToFreeflow,
  biographyMode = 'sections',
}: ImportTextDialogProps) {
  const { t } = useTranslation();
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [parsedContent, setParsedContent] = useState<ParsedText | null>(null);
  const [destination, setDestination] = useState<string>(currentSectionKey);
  const [inputMode, setInputMode] = useState<'input' | 'preview'>('input');
  const [freeflowImportMode, setFreeflowImportMode] = useState<ConflictAction>('replace');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCurrentDestinationContent = useCallback(() => {
    if (destination === currentSectionKey) return currentSectionContent;
    return '';
  }, [destination, currentSectionContent, currentSectionKey]);

  const destinationHasContent = useCallback(() => {
    if (biographyMode === 'freeflow') {
      return currentFreeflowContent && currentFreeflowContent.trim().length > 0;
    }
    const content = getCurrentDestinationContent();
    return content && content.trim().length > 0;
  }, [biographyMode, currentFreeflowContent, getCurrentDestinationContent]);

  const resetDialog = useCallback(() => {
    setError(null);
    setPastedText('');
    setParsedContent(null);
    setInputMode('input');
    setLoading(false);
    setDragActive(false);
    setSaving(false);
    setFreeflowImportMode('replace');
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const parsed = await parseTextFile(file);
      setParsedContent(parsed);
      setInputMode('preview');
    } catch (err) {
      if (err instanceof TextImportError) {
        setError(err.message);
      } else {
        setError(t.importDialog.fileReadError);
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

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
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    },
    [handleFileSelect]
  );

  const handlePasteImport = useCallback(() => {
    if (!pastedText.trim()) {
      setError(t.importDialog.pasteTextFirst);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const parsed = parsePastedText(pastedText);
      setParsedContent(parsed);
      setInputMode('preview');
    } catch {
      setError(t.importDialog.textAnalysisError);
    } finally {
      setLoading(false);
    }
  }, [pastedText, t]);

  const doSave = useCallback(async (action: ConflictAction) => {
    if (!parsedContent) return;
    setSaving(true);
    setError(null);

    try {
      const incomingText = parsedContent.content;

      if (biographyMode === 'freeflow') {
        let newValue: string;
        if (action === 'replace') {
          newValue = incomingText;
        } else {
          const sep = currentFreeflowContent && !currentFreeflowContent.endsWith('</p>') ? '<p></p>' : '';
          newValue = currentFreeflowContent + sep + incomingText;
        }
        const { error: dbErr } = await supabase
          .from('biographies')
          .update({ content_freeflow: newValue, biography_mode: 'freeflow' })
          .eq('id', biographyId);
        if (dbErr) throw dbErr;
        onImportedToFreeflow(newValue);
      } else {
        const existingContent = destination === currentSectionKey ? currentSectionContent : '';
        let newValue: string;
        if (action === 'replace') {
          newValue = incomingText;
        } else {
          const sep = existingContent && !existingContent.endsWith('</p>') ? '<p></p>' : '';
          newValue = existingContent + sep + incomingText;
        }
        const { error: dbErr } = await supabase
          .from('biography_sections')
          .upsert(
            { biography_id: biographyId, section_key: destination, content: newValue },
            { onConflict: 'biography_id,section_key' }
          );
        if (dbErr) throw dbErr;
        onImportedToSection(destination, newValue);
      }

      resetDialog();
      onOpenChange(false);
    } catch (err) {
      setError(t.importDialog.fileReadError);
    } finally {
      setSaving(false);
    }
  }, [
    parsedContent,
    biographyMode,
    destination,
    biographyId,
    currentFreeflowContent,
    currentSectionContent,
    currentSectionKey,
    onImportedToFreeflow,
    onImportedToSection,
    resetDialog,
    onOpenChange,
    t,
  ]);

  const handleImportConfirm = useCallback(() => {
    if (!parsedContent) return;
    if (biographyMode === 'freeflow') {
      doSave(freeflowImportMode);
    } else if (destinationHasContent()) {
      doSave('replace');
    } else {
      doSave('replace');
    }
  }, [parsedContent, biographyMode, freeflowImportMode, destinationHasContent, doSave]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) resetDialog();
      onOpenChange(newOpen);
    },
    [onOpenChange, resetDialog]
  );

  const hasInputContent = pastedText.trim().length > 0 || parsedContent !== null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle>{t.importDialog.titleFreeflow}</DialogTitle>
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
                  accept=".txt"
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

              {biographyMode === 'freeflow' && hasInputContent && (
                <div className="space-y-2">
                  <Label>{t.editor.importSaveTo}</Label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="freeflow-import-mode"
                        value="replace"
                        checked={freeflowImportMode === 'replace'}
                        onChange={() => setFreeflowImportMode('replace')}
                        className="accent-foreground h-4 w-4 shrink-0"
                      />
                      <span className="text-sm group-hover:text-foreground transition-colors">
                        {t.editor.importFreeFlowReplace}
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="freeflow-import-mode"
                        value="append"
                        checked={freeflowImportMode === 'append'}
                        onChange={() => setFreeflowImportMode('append')}
                        className="accent-foreground h-4 w-4 shrink-0"
                      />
                      <span className="text-sm group-hover:text-foreground transition-colors">
                        {t.editor.importFreeFlowAppend}
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {inputMode === 'preview' && parsedContent && (
            <div className="space-y-3">
              <div className="rounded-md border border-border/60 bg-muted/30 p-4 max-h-[200px] overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-2 font-medium">{t.importDialog.preview}</p>
                <div
                  className="prose prose-sm max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: parsedContent.content }}
                />
              </div>

              {biographyMode === 'freeflow' && (
                <div className="space-y-2">
                  <Label>{t.editor.importSaveTo}</Label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="freeflow-import-mode"
                        value="replace"
                        checked={freeflowImportMode === 'replace'}
                        onChange={() => setFreeflowImportMode('replace')}
                        className="accent-foreground h-4 w-4 shrink-0"
                      />
                      <span className="text-sm group-hover:text-foreground transition-colors">
                        {t.editor.importFreeFlowReplace}
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="freeflow-import-mode"
                        value="append"
                        checked={freeflowImportMode === 'append'}
                        onChange={() => setFreeflowImportMode('append')}
                        className="accent-foreground h-4 w-4 shrink-0"
                      />
                      <span className="text-sm group-hover:text-foreground transition-colors">
                        {t.editor.importFreeFlowAppend}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setParsedContent(null);
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
            <Button
              type="button"
              onClick={handlePasteImport}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t.importDialog.import}
            </Button>
          )}
          {inputMode === 'preview' && (
            <Button
              type="button"
              onClick={handleImportConfirm}
              disabled={!parsedContent || saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t.importDialog.import}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
