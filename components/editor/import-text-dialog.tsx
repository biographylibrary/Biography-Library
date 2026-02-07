'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  parseTextFile,
  parsePastedText,
  TextImportError,
  type ParsedText,
} from '@/lib/text-import-parser';
import { detectSections, type SectionSuggestion } from '@/lib/import/section-matcher';
import { SectionAssignmentWizard } from '@/components/import/SectionAssignmentWizard';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface ImportTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionName: string;
  onImport: (content: string, replace: boolean) => void;
  onImportMultipleSections?: (sections: Array<{ title: string; content: string }>) => void;
}

export function ImportTextDialog({
  open,
  onOpenChange,
  sectionName,
  onImport,
  onImportMultipleSections,
}: ImportTextDialogProps) {
  const { session } = useAuth();
  const { language } = useTranslation();
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [parsedContent, setParsedContent] = useState<ParsedText | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [importMode, setImportMode] = useState<'file' | 'paste' | 'preview'>('file');
  const [showWizard, setShowWizard] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<SectionSuggestion[]>([]);
  const [detectingAi, setDetectingAi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetDialog = useCallback(() => {
    setError(null);
    setPastedText('');
    setParsedContent(null);
    setReplaceExisting(false);
    setImportMode('file');
    setLoading(false);
    setDragActive(false);
    setShowWizard(false);
    setAiSuggestions([]);
    setDetectingAi(false);
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);

    try {
      const parsed = await parseTextFile(file);
      setParsedContent(parsed);
      setImportMode('preview');
    } catch (err) {
      if (err instanceof TextImportError) {
        setError(err.message);
      } else {
        setError('Errore nella lettura del file');
      }
    } finally {
      setLoading(false);
    }
  }, []);

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
      setError('Incolla del testo prima di continuare');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const parsed = parsePastedText(pastedText);
      setParsedContent(parsed);
      setImportMode('preview');
    } catch (err) {
      setError('Errore nell\'analisi del testo');
    } finally {
      setLoading(false);
    }
  }, [pastedText]);

  const handleAiDetection = useCallback(async () => {
    if (!parsedContent || !session) {
      setError('Devi essere autenticato per usare l\'AI');
      return;
    }

    setDetectingAi(true);
    setError(null);

    try {
      const token = session.access_token;
      const result = await detectSections(parsedContent.content, language, token);

      if (result.suggestions.length === 0) {
        setError('L\'AI non è riuscita a rilevare sezioni nel testo');
        return;
      }

      setAiSuggestions(result.suggestions);
      setShowWizard(true);
    } catch (err) {
      console.error('AI detection error:', err);
      setError('Errore durante il rilevamento automatico delle sezioni');
    } finally {
      setDetectingAi(false);
    }
  }, [parsedContent, session, language]);

  const handleWizardAccept = useCallback((assignments: { section: string; text: string }[]) => {
    if (onImportMultipleSections) {
      const sections = assignments.map(a => ({
        title: a.section,
        content: a.text,
      }));
      onImportMultipleSections(sections);
      resetDialog();
      onOpenChange(false);
    }
  }, [onImportMultipleSections, resetDialog, onOpenChange]);

  const handleImportConfirm = useCallback(() => {
    if (!parsedContent) return;

    if (parsedContent.hasSections && parsedContent.sections) {
      if (onImportMultipleSections) {
        onImportMultipleSections(parsedContent.sections);
        resetDialog();
        onOpenChange(false);
      } else {
        setError('Importazione multipla sezioni non disponibile');
      }
    } else {
      onImport(parsedContent.content, replaceExisting);
      resetDialog();
      onOpenChange(false);
    }
  }, [parsedContent, replaceExisting, onImport, onImportMultipleSections, resetDialog, onOpenChange]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        resetDialog();
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, resetDialog]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importa testo nella sezione &quot;{sectionName}&quot;</DialogTitle>
          <DialogDescription>
            Carica un file o incolla il testo da importare
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {importMode === 'file' && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.rtf,.docx"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm font-medium mb-2">
                  Trascina un file qui o clicca per selezionare
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Formati supportati: .txt, .rtf, .docx (max 5MB)
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Caricamento...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Seleziona File
                    </>
                  )}
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    oppure
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paste-text">Incolla il testo direttamente</Label>
                <Textarea
                  id="paste-text"
                  placeholder="Incolla qui il testo da importare..."
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
                  Analizza Testo
                </Button>
              </div>
            </div>
          )}

          {importMode === 'preview' && parsedContent && (
            <div className="space-y-4">
              {parsedContent.hasSections && parsedContent.sections ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Ho trovato <strong>{parsedContent.sections.length} sezioni</strong> nel
                    file. Vuoi importarle automaticamente?
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Questo testo verrà importato solo in <strong>{sectionName}</strong>. Per
                    importare multiple sezioni, usa marcatori nel file (## Titolo Sezione).
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label className="mb-2 block">Anteprima:</Label>
                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                  {parsedContent.hasSections && parsedContent.sections ? (
                    <div className="space-y-4">
                      {parsedContent.sections.map((section, index) => (
                        <div key={index} className="border-b pb-3 last:border-0">
                          <h4 className="font-semibold mb-1">{section.title}</h4>
                          <div
                            className="text-sm text-muted-foreground prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: section.content }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: parsedContent.content }}
                    />
                  )}
                </ScrollArea>
              </div>

              {!parsedContent.hasSections && (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="replace"
                      checked={replaceExisting}
                      onCheckedChange={(checked) => setReplaceExisting(checked === true)}
                    />
                    <Label
                      htmlFor="replace"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Sostituisci contenuto esistente
                    </Label>
                  </div>

                  <Alert className="bg-primary/5 border-primary/20">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <AlertDescription>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm">
                          Lascia che l&apos;AI analizzi il testo e suggerisca automaticamente le sezioni appropriate
                        </span>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={handleAiDetection}
                          disabled={detectingAi}
                          className="shrink-0"
                        >
                          {detectingAi ? (
                            <>
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              Analisi...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-3.5 w-3.5" />
                              Rileva Sezioni
                            </>
                          )}
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                </>
              )}

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setParsedContent(null);
                  setImportMode('file');
                }}
                className="w-full"
              >
                Indietro
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Annulla
          </Button>
          {importMode === 'preview' && (
            <Button type="button" onClick={handleImportConfirm} disabled={!parsedContent}>
              Importa
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      <SectionAssignmentWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        suggestions={aiSuggestions}
        onAcceptAll={handleWizardAccept}
        onCancel={() => {
          setShowWizard(false);
          setAiSuggestions([]);
        }}
      />
    </Dialog>
  );
}
