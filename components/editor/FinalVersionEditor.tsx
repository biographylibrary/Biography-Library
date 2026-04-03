'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RichTextEditor } from './rich-text-editor';
import { useTranslation } from '@/lib/i18n/i18n-context';
import {
  Lock,
  FileCheck,
  RotateCcw,
  Loader2,
} from 'lucide-react';

interface FinalVersionEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  biographyId: string;
  isLocked: boolean;
  onPublish: () => void;
  editorFontSize?: number;
  onRevertToDraft?: () => void;
  /** Hide the primary / publish row (e.g. PDF phase uses a banner in the parent). */
  hidePrimaryActions?: boolean;
  /** Override the primary button label (e.g. “Start PDF review”). */
  primaryButtonLabel?: string;
  primaryActionPending?: boolean;
}

export function FinalVersionEditor({
  content,
  onContentChange,
  biographyId,
  isLocked,
  onPublish,
  editorFontSize = 16,
  onRevertToDraft,
  hidePrimaryActions = false,
  primaryButtonLabel,
  primaryActionPending = false,
}: FinalVersionEditorProps) {
  const { language } = useTranslation();

  const finalVersionTitle = {
    en: 'Final Complete Version',
    it: 'Versione Finale Completa',
    fr: 'Version Finale Complète',
    de: 'Endgültige Vollversion',
  }[language] || 'Final Complete Version';

  const publishButtonText = {
    en: 'Publish Definitively',
    it: 'Pubblica Definitivamente',
    fr: 'Publier Définitivement',
    de: 'Endgültig Veröffentlichen',
  }[language] || 'Publish Definitively';

  const lockedMessage = {
    en: 'This biography has been published and is now locked. No further edits are allowed.',
    it: 'Questa biografia è stata pubblicata ed è ora bloccata. Non sono consentite ulteriori modifiche.',
    fr: 'Cette biographie a été publiée et est maintenant verrouillée. Aucune autre modification n\'est autorisée.',
    de: 'Diese Biografie wurde veröffentlicht und ist jetzt gesperrt. Weitere Bearbeitungen sind nicht erlaubt.',
  }[language] || 'This biography has been published and is now locked.';

  const editInstructionsText = {
    en: 'This is your final combined biography. You can continue editing and refining this version with AI assistance until you\'re completely satisfied.',
    it: 'Questa è la tua biografia finale combinata. Puoi continuare a modificare e perfezionare questa versione con l\'assistenza dell\'IA fino a quando non sei completamente soddisfatto.',
    fr: 'Ceci est votre biographie finale combinée. Vous pouvez continuer à modifier et affiner cette version avec l\'assistance de l\'IA jusqu\'à ce que vous soyez complètement satisfait.',
    de: 'Dies ist Ihre endgültige kombinierte Biografie. Sie können diese Version weiterhin mit KI-Unterstützung bearbeiten und verfeinern, bis Sie vollständig zufrieden sind.',
  }[language] || 'This is your final combined biography.';

  const revertLabel = {
    en: 'Back to Editing',
    it: 'Torna alla Modifica',
    fr: 'Retour à l\'Édition',
    de: 'Zurück zur Bearbeitung',
  }[language] || 'Back to Editing';

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-border/50 px-6 py-4 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {isLocked && <Lock className="h-5 w-5 text-primary" />}
              {finalVersionTitle}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isLocked ? lockedMessage : editInstructionsText}
            </p>
          </div>

          {!isLocked && !hidePrimaryActions && (
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {onRevertToDraft && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRevertToDraft}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {revertLabel}
                </Button>
              )}
              <Button
                onClick={onPublish}
                size="sm"
                className="gap-2"
                disabled={primaryActionPending || !content || content.trim().length < 100}
              >
                {primaryActionPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileCheck className="h-4 w-4" />
                )}
                {primaryButtonLabel ?? publishButtonText}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <Card className="max-w-4xl mx-auto p-6">
          {isLocked ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              style={{ fontSize: `${editorFontSize}px` }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <RichTextEditor
              content={content}
              onChange={onContentChange}
              placeholder={
                language === 'it' ? 'La tua versione finale apparirà qui...' :
                language === 'fr' ? 'Votre version finale apparaîtra ici...' :
                language === 'de' ? 'Ihre endgültige Version erscheint hier...' :
                'Your final version will appear here...'
              }
              editorFontSize={editorFontSize}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
