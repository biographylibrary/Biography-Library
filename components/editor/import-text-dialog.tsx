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
  const [showConflict, setShowConflict] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCurrentDestinationContent = useCallback(() => {
    if (destination === 'freeflow') return currentFreeflowContent;
    if (destination === currentSectionKey) return currentSectionContent;
    return '';
  }, [destination, currentFreeflowContent, currentSectionContent, currentSectionKey]);

  const destinationHasContent = useCallback(() => {
    const content = getCurrentDestinationContent();
    return content && content.trim().length > 0;
  }, [getCurrentDestinationContent]);

  const resetDialog = useCallback(() => {
    setError(null);
    setPastedText('');
    setParsedContent(null);
    setInputMode('input');
    setLoading(false);
    setDragActive(false);
    setShowConflict(false);
    setSaving(false);
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

  const handlePasteAnalyze = useCallback(() => {
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

      if (destination === 'freeflow') {
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
    if (destinationHasContent()) {
      setShowConflict(true);
    } else {
      doSave('replace');
    }
  }, [parsedContent, destinationHasContent, doSave]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) resetDialog();
      onOpenChange(newOpen);
    },
    [onOpenChange, resetDialog]
  );

  const hintLines = t.editor.importFreeFlowHint.split('\n');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle>{t.importDialog.title.replace('{sectionName}', '')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <Alert className="bg-muted/60 border-border/60">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-sm text-muted-foreground space-y-1">
              {hintLines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </AlertDescription>
          </Alert>

          <div className="space-y-1.5">
            <Label>{t.editor.importSaveTo}</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="freeflow">{t.editor.importDestinationFreeFlow}</SelectItem>
                {BIOGRAPHY_SECTIONS.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {t.sectionTitles[s.key as keyof typeof t.sectionTitles] || s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                  accept=".txt,.rtf,.docx"
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
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handlePasteAnalyze}
                  disabled={!pastedText.trim() || loading}
                  className="w-full"
                >
                  {t.importDialog.analyzeText}
                </Button>
              </div>
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

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setParsedContent(null);
                  setInputMode('input');
                  setShowConflict(false);
                }}
              >
                {t.importDialog.back}
              </Button>
            </div>
          )}

          {showConflict && (
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="space-y-3">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{t.editor.importFieldNotEmpty}</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => doSave('replace')}
                    className="border-amber-400 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                    {t.editor.importReplace}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => doSave('append')}
                    className="border-amber-400 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                    {t.editor.importAddAtEnd}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={saving}
                    onClick={() => setShowConflict(false)}
                  >
                    {t.common.cancel}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
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
          {inputMode === 'preview' && !showConflict && (
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
