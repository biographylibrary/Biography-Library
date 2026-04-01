'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Send, Lock, FileCheck, Download, ChevronRight, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, Loader as Loader2 } from 'lucide-react';

interface SubmitForReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  readinessError?: string | null;
}

const STEP_COUNT = 3;

type StepConfig = {
  icon: React.ReactNode;
  title: Record<string, string>;
  body: Record<string, string>;
  warning?: Record<string, string>;
  items?: Record<string, string[]>;
};

const steps: StepConfig[] = [
  {
    icon: <Lock className="h-6 w-6 text-amber-500" />,
    title: {
      en: 'Your biography will become read-only',
      it: 'La tua biografia diventerà di sola lettura',
      fr: 'Votre biographie deviendra en lecture seule',
      de: 'Ihre Biografie wird schreibgeschützt',
    },
    body: {
      en: 'Once submitted for review, you will no longer be able to edit the content of your biography. The text will be locked pending approval by our editorial team.',
      it: 'Una volta inviata per la revisione, non potrai più modificare il contenuto della tua biografia. Il testo verrà bloccato in attesa dell\'approvazione del nostro team editoriale.',
      fr: 'Une fois soumise pour révision, vous ne pourrez plus modifier le contenu de votre biographie. Le texte sera verrouillé en attente d\'approbation par notre équipe éditoriale.',
      de: 'Nach der Einreichung zur Überprüfung können Sie den Inhalt Ihrer Biografie nicht mehr bearbeiten. Der Text wird gesperrt, bis unsere Redaktion ihn genehmigt hat.',
    },
    warning: {
      en: 'Exception: if a section is rejected during review, editing will be temporarily re-enabled for that section only.',
      it: 'Eccezione: se una sezione viene rifiutata durante la revisione, la modifica verrà temporaneamente riabilitata solo per quella sezione.',
      fr: 'Exception : si une section est rejetée lors de la révision, l\'édition sera temporairement réactivée pour cette section uniquement.',
      de: 'Ausnahme: Wird ein Abschnitt während der Überprüfung abgelehnt, wird die Bearbeitung nur für diesen Abschnitt vorübergehend wieder aktiviert.',
    },
  },
  {
    icon: <FileCheck className="h-6 w-6 text-sky-500" />,
    title: {
      en: 'What happens during review',
      it: 'Cosa succede durante la revisione',
      fr: 'Ce qui se passe pendant la révision',
      de: 'Was während der Überprüfung passiert',
    },
    body: {
      en: 'Our editorial team will carefully review your biography to ensure it meets our quality and content guidelines. This process may take a few days.',
      it: 'Il nostro team editoriale esaminerà attentamente la tua biografia per assicurarsi che rispetti le nostre linee guida sulla qualità e sui contenuti. Questo processo può richiedere alcuni giorni.',
      fr: 'Notre équipe éditoriale examinera attentivement votre biographie pour s\'assurer qu\'elle respecte nos directives de qualité et de contenu. Ce processus peut prendre quelques jours.',
      de: 'Unser Redaktionsteam wird Ihre Biografie sorgfältig prüfen, um sicherzustellen, dass sie unseren Qualitäts- und Inhaltsrichtlinien entspricht. Dieser Prozess kann einige Tage dauern.',
    },
    items: {
      en: [
        'You will receive a notification when the review begins',
        'You will be notified of the final decision (approved or changes requested)',
        'If changes are needed, you will be able to edit only the flagged sections',
        'Once approved, the biography will be published and locked permanently',
      ],
      it: [
        'Riceverai una notifica quando inizia la revisione',
        'Sarai notificato della decisione finale (approvata o modifiche richieste)',
        'Se sono necessarie modifiche, potrai modificare solo le sezioni segnalate',
        'Una volta approvata, la biografia verrà pubblicata e bloccata definitivamente',
      ],
      fr: [
        'Vous recevrez une notification au début de la révision',
        'Vous serez informé de la décision finale (approuvée ou modifications demandées)',
        'Si des modifications sont nécessaires, vous ne pourrez modifier que les sections signalées',
        'Une fois approuvée, la biographie sera publiée et définitivement verrouillée',
      ],
      de: [
        'Sie erhalten eine Benachrichtigung, wenn die Überprüfung beginnt',
        'Sie werden über die endgültige Entscheidung informiert (genehmigt oder Änderungen erforderlich)',
        'Wenn Änderungen erforderlich sind, können Sie nur die markierten Abschnitte bearbeiten',
        'Nach der Genehmigung wird die Biografie veröffentlicht und dauerhaft gesperrt',
      ],
    },
  },
  {
    icon: <Download className="h-6 w-6 text-emerald-500" />,
    title: {
      en: 'After approval: your book is ready',
      it: 'Dopo l\'approvazione: il tuo libro è pronto',
      fr: 'Après approbation : votre livre est prêt',
      de: 'Nach der Genehmigung: Ihr Buch ist fertig',
    },
    body: {
      en: 'Once your biography is approved and published, you will be able to download the complete book as a beautifully formatted PDF — ready to print, share with family, or keep as a lasting personal archive.',
      it: 'Una volta che la tua biografia sarà approvata e pubblicata, potrai scaricare il libro completo in formato PDF splendidamente impaginato — pronto per la stampa, da condividere con la famiglia o da conservare come archivio personale duraturo.',
      fr: 'Une fois votre biographie approuvée et publiée, vous pourrez télécharger le livre complet en PDF magnifiquement mis en page — prêt à imprimer, à partager avec la famille ou à conserver comme archive personnelle durable.',
      de: 'Sobald Ihre Biografie genehmigt und veröffentlicht ist, können Sie das vollständige Buch als wunderschön formatiertes PDF herunterladen — druckfertig, zum Teilen mit der Familie oder als dauerhaftes persönliches Archiv.',
    },
    warning: {
      en: 'Are you ready to submit? This step cannot be undone.',
      it: 'Sei pronto per inviare? Questo passaggio non può essere annullato.',
      fr: 'Êtes-vous prêt à soumettre ? Cette étape ne peut pas être annulée.',
      de: 'Sind Sie bereit zum Einreichen? Dieser Schritt kann nicht rückgängig gemacht werden.',
    },
  },
];

const label = (map: Record<string, string>, lang: string): string =>
  map[lang] || map['en'];

export function SubmitForReviewDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
  readinessError = null,
}: SubmitForReviewDialogProps) {
  const { language } = useTranslation();
  const [step, setStep] = useState(0);

  const current = steps[step];

  const nextLabel: Record<string, string> = {
    en: 'I understand, continue',
    it: 'Ho capito, continua',
    fr: 'Je comprends, continuer',
    de: 'Ich verstehe, weiter',
  };

  const submitLabel: Record<string, string> = {
    en: 'Submit for Review',
    it: 'Invia per la Revisione',
    fr: 'Soumettre pour Révision',
    de: 'Zur Überprüfung Einreichen',
  };

  const cancelLabel: Record<string, string> = {
    en: 'Cancel',
    it: 'Annulla',
    fr: 'Annuler',
    de: 'Abbrechen',
  };

  const backLabel: Record<string, string> = {
    en: 'Back',
    it: 'Indietro',
    fr: 'Retour',
    de: 'Zurück',
  };

  const stepLabel: Record<string, string> = {
    en: 'Step',
    it: 'Passaggio',
    fr: 'Étape',
    de: 'Schritt',
  };

  const ofLabel: Record<string, string> = {
    en: 'of',
    it: 'di',
    fr: 'sur',
    de: 'von',
  };

  function handleNext() {
    if (step < STEP_COUNT - 1) {
      setStep((s) => s + 1);
    } else {
      onConfirm();
    }
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function handleClose(val: boolean) {
    if (!val) setStep(0);
    onOpenChange(val);
  }

  const isLastStep = step === STEP_COUNT - 1;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-medium tracking-wide">
              {label(stepLabel, language)} {step + 1} {label(ofLabel, language)} {STEP_COUNT}
            </span>
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={[
                    'h-1.5 rounded-full transition-all duration-300',
                    i === step
                      ? 'w-6 bg-primary'
                      : i < step
                      ? 'w-2 bg-primary/40'
                      : 'w-2 bg-border',
                  ].join(' ')}
                />
              ))}
            </div>
          </div>
          <DialogTitle className="flex items-center gap-3 text-lg leading-snug">
            {current.icon}
            {label(current.title, language)}
          </DialogTitle>
        </DialogHeader>

        {readinessError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive leading-relaxed">{readinessError}</p>
          </div>
        )}

        <div className="space-y-4 py-1">
          <DialogDescription asChild>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {label(current.body, language)}
            </p>
          </DialogDescription>

          {current.items && (
            <ul className="space-y-2">
              {(current.items[language] || current.items['en']).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          )}

          {current.warning && (
            <div className={[
              'rounded-lg border p-3 flex items-start gap-2.5',
              isLastStep
                ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                : 'bg-sky-50 border-sky-200 dark:bg-sky-950/20 dark:border-sky-800',
            ].join(' ')}>
              <AlertTriangle className={[
                'h-4 w-4 mt-0.5 shrink-0',
                isLastStep ? 'text-amber-500' : 'text-sky-500',
              ].join(' ')} />
              <p className={[
                'text-sm font-medium',
                isLastStep
                  ? 'text-amber-800 dark:text-amber-200'
                  : 'text-sky-800 dark:text-sky-200',
              ].join(' ')}>
                {label(current.warning, language)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              {label(cancelLabel, language)}
            </Button>
            {step > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                {label(backLabel, language)}
              </Button>
            )}
          </div>

          <Button
            onClick={handleNext}
            disabled={isSubmitting || (isLastStep && !!readinessError)}
            className={isLastStep ? 'gap-2 bg-primary hover:bg-primary/90' : 'gap-2'}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLastStep ? (
              <>
                <Send className="h-4 w-4" />
                {label(submitLabel, language)}
              </>
            ) : (
              <>
                {label(nextLabel, language)}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
