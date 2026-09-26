'use client';

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  parseTextFiles,
  parsePastedText,
  TextImportError,
  getImportErrorMessage,
  type ParsedText,
} from '@/lib/text-import-parser';
import { appendHtml } from '@/lib/import/html-blocks';
import { htmlHasText, sectionsToDocumentHtml } from '@/lib/editor/single-document';
import { saveOriginalCoverJpeg } from '@/lib/editor/save-original-cover';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { type BiographyContent } from '@/lib/editor-constants';

const MAX_PDF_BYTES = 30 * 1024 * 1024;

interface PdfOffer {
  fileName: string;
  previewUrl: string;
  coverJpegBase64: string;
  htmlAll: string;
  htmlAfterCover: string;
  bodyHasText: boolean;
}

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
  currentFreeflowContent,
  onImportedToFreeflow,
}: ImportTextDialogProps) {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [parsedContent, setParsedContent] = useState<ParsedText | null>(null);
  const [queuedFiles, setQueuedFiles] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<'input' | 'preview'>('input');
  const [pdfOffer, setPdfOffer] = useState<PdfOffer | null>(null);
  const [askConflict, setAskConflict] = useState(false);
  const [keepCover, setKeepCover] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLDivElement>(null);

  const sheetHasContent = useCallback(
    () => htmlHasText(currentFreeflowContent),
    [currentFreeflowContent]
  );

  const resetDialog = useCallback(() => {
    setError(null);
    setPastedText('');
    setParsedContent(null);
    setQueuedFiles([]);
    setInputMode('input');
    setLoading(false);
    setDragActive(false);
    setSaving(false);
    setAskConflict(false);
    setPdfOffer(null);
    setKeepCover(null);
    if (pasteRef.current) pasteRef.current.innerHTML = '';
  }, []);

  const readPdf = useCallback(
    async (file: File) => {
      if (file.size > MAX_PDF_BYTES) {
        setError(t.importDialog.pdfTooLarge);
        return;
      }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError(t.importDialog.fileReadError);
        return;
      }
      const form = new FormData();
      form.set('biographyId', biographyId);
      form.set('file', file);
      const response = await fetch('/api/import/pdf', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const body = (await response.json().catch(() => null)) as
        | {
            kind?: string;
            error?: string;
            bodyHasText?: boolean;
            htmlAll?: string;
            htmlAfterCover?: string;
            previewJpegBase64?: string;
            coverJpegBase64?: string;
          }
        | null;
      if (body?.kind === 'scanned') {
        setError(t.importDialog.pdfPhoto);
        return;
      }
      if (!response.ok || body?.kind !== 'text' || !body.previewJpegBase64 || !body.coverJpegBase64) {
        setError(body?.error === 'too_large' ? t.importDialog.pdfTooLarge : t.importDialog.fileReadError);
        return;
      }
      setPdfOffer({
        fileName: file.name,
        previewUrl: `data:image/jpeg;base64,${body.previewJpegBase64}`,
        coverJpegBase64: body.coverJpegBase64,
        htmlAll: body.htmlAll ?? '',
        htmlAfterCover: body.htmlAfterCover ?? '',
        bodyHasText: Boolean(body.bodyHasText),
      });
      setKeepCover(null);
      setParsedContent(null);
      setQueuedFiles([file.name]);
      setInputMode('preview');
    },
    [biographyId, t]
  );

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      setLoading(true);
      try {
        const list = Array.from(files);
        const pdfs = list.filter(
          (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
        );
        if (pdfs.length > 0) {
          if (list.length > 1) {
            setError(t.importDialog.pdfOneAtATime);
            return;
          }
          await readPdf(pdfs[0]);
          return;
        }
        const parsed = await parseTextFiles(list, language);
        setPdfOffer(null);
        setKeepCover(null);
        setParsedContent(parsed);
        setQueuedFiles(parsed.fileNames ?? list.map((f) => f.name));
        setInputMode('preview');
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
    [language, t, readPdf]
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
    } catch {
      setError(t.importDialog.textAnalysisError);
    } finally {
      setLoading(false);
    }
  }, [pastedText, t, language]);

  const incomingHtml = useCallback(() => {
    if (!parsedContent) return '';
    return parsedContent.hasSections && parsedContent.sections?.length
      ? sectionsToDocumentHtml(parsedContent.sections)
      : parsedContent.content;
  }, [parsedContent]);

  const applySingleImport = useCallback(
    (action: ConflictAction) => {
      const incomingText = incomingHtml();
      if (!htmlHasText(incomingText)) {
        resetDialog();
        onOpenChange(false);
        return;
      }
      const newValue =
        action === 'replace' || !htmlHasText(currentFreeflowContent)
          ? incomingText
          : appendHtml(currentFreeflowContent, incomingText);
      onImportedToFreeflow(newValue);
      resetDialog();
      onOpenChange(false);
    },
    [incomingHtml, currentFreeflowContent, onImportedToFreeflow, resetDialog, onOpenChange]
  );

  const chooseCover = useCallback(
    (keep: boolean) => {
      if (!pdfOffer) return;
      setKeepCover(keep);
      const html = keep ? pdfOffer.htmlAfterCover : pdfOffer.htmlAll;
      if (!htmlHasText(html)) {
        setParsedContent({ content: '', hasSections: false });
        return;
      }
      setParsedContent(parsePastedText(html, language));
    },
    [pdfOffer, language]
  );

  const finishImport = useCallback(
    async (action: ConflictAction) => {
      if (!parsedContent) return;
      setAskConflict(false);
      setSaving(true);
      setError(null);
      try {
        if (keepCover && pdfOffer) {
          if (!user?.id) {
            setError(t.importDialog.fileReadError);
            return;
          }
          await saveOriginalCoverJpeg({
            biographyId,
            userId: user.id,
            jpegBase64: pdfOffer.coverJpegBase64,
          });
        }
        applySingleImport(action);
      } catch {
        setError(t.photos.uploadError);
      } finally {
        setSaving(false);
      }
    },
    [parsedContent, keepCover, pdfOffer, user?.id, biographyId, t, applySingleImport]
  );

  const handleImportConfirm = useCallback(() => {
    if (!parsedContent) return;
    if (sheetHasContent() && htmlHasText(incomingHtml())) {
      setAskConflict(true);
      return;
    }
    void finishImport('replace');
  }, [parsedContent, sheetHasContent, incomingHtml, finishImport]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) resetDialog();
      onOpenChange(newOpen);
    },
    [onOpenChange, resetDialog]
  );

  const previewHtml =
    parsedContent?.hasSections && parsedContent.sections?.length
      ? sectionsToDocumentHtml(parsedContent.sections)
      : parsedContent?.content || '';

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
                {t.editor.importNoticeFreeflowMode}
              </p>
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
                    accept=".txt,.docx,.rtf,.pdf,application/pdf"
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
                  <div
                    id="paste-text"
                    ref={pasteRef}
                    role="textbox"
                    aria-multiline="true"
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder={t.importDialog.pastePlaceholder}
                    onInput={(e) => {
                      const el = e.currentTarget;
                      const text = el.innerText.replace(/\u00a0/g, ' ').trim();
                      setPastedText(text ? el.innerHTML : '');
                    }}
                    className="min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
                  />
                </div>

              </div>
            )}

            {inputMode === 'preview' && (parsedContent || pdfOffer) && (
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
                {pdfOffer && (
                  <div className="space-y-3">
                    <img
                      src={pdfOffer.previewUrl}
                      alt=""
                      className="mx-auto max-h-64 rounded-md border border-border/60 bg-[#ECE9E4] object-contain"
                    />
                    <p className="text-sm font-medium">{t.importDialog.keepCoverQuestion}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={keepCover === true ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => chooseCover(true)}
                      >
                        {t.importDialog.keepCoverYes}
                      </Button>
                      <Button
                        type="button"
                        variant={keepCover === false ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => chooseCover(false)}
                      >
                        {t.importDialog.keepCoverNo}
                      </Button>
                    </div>
                    {keepCover === true && !pdfOffer.bodyHasText && (
                      <p className="text-sm text-muted-foreground">{t.importDialog.pdfInsidePhoto}</p>
                    )}
                  </div>
                )}
                {parsedContent && htmlHasText(previewHtml) && (
                  <div className="rounded-md border border-border/60 bg-muted/30 p-4 max-h-[240px] overflow-y-auto import-preview">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">
                      {t.importDialog.preview}
                    </p>
                    <div
                      className="prose prose-sm max-w-none text-sm [&_h1]:text-xl [&_h1]:font-serif [&_h2]:text-lg [&_h2]:font-serif [&_h3]:text-base [&_h3]:font-semibold"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </div>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setParsedContent(null);
                    setQueuedFiles([]);
                    setPdfOffer(null);
                    setKeepCover(null);
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
      {askConflict &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-lg border bg-background p-6 space-y-4">
              <p className="text-base leading-snug">{t.editor.importConflictQuestion}</p>
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" disabled={saving} onClick={() => void finishImport('replace')}>
                  {t.editor.importFreeFlowReplace}
                </Button>
                <Button type="button" variant="outline" disabled={saving} onClick={() => void finishImport('append')}>
                  {t.editor.importFreeFlowAppend}
                </Button>
                <Button type="button" variant="ghost" disabled={saving} onClick={() => setAskConflict(false)}>
                  {t.common.cancel}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
