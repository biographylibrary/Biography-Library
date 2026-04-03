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
import { Send, Lock, Sparkles, Download, ChevronRight, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, Loader as Loader2 } from 'lucide-react';

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
    icon: <Lock className="h-6 w-6 text-brand-mustardDark dark:text-brand-mustardLight" />,
    title: {
      en: 'Your biography will become read-only',
      it: 'La tua biografia diventerà di sola lettura',
      fr: 'Votre biographie deviendra en lecture seule',
      de: 'Ihre Biografie wird schreibgeschützt',
    },
    body: {
      en: 'Once submitted, you will no longer be able to edit the content of your biography. The text will be locked while the automatic screening runs.',
      it: 'Una volta inviata, non potrai più modificare il contenuto della tua biografia. Il testo verrà bloccato durante l\'analisi automatica.',
      fr: 'Une fois soumise, vous ne pourrez plus modifier le contenu de votre biographie. Le texte sera verrouillé pendant l\'analyse automatique.',
      de: 'Nach der Einreichung können Sie den Inhalt Ihrer Biografie nicht mehr bearbeiten. Der Text wird während der automatischen Prüfung gesperrt.',
    },
    warning: {
      en: 'Exception: if passages are flagged for human review and returned, editing will be re-enabled for those sections only.',
      it: 'Eccezione: se dei passaggi vengono segnalati per revisione umana e restituiti, la modifica verrà riabilitata solo per quelle sezioni.',
      fr: 'Exception : si des passages sont signalés pour révision humaine et retournés, l\'édition sera réactivée uniquement pour ces sections.',
      de: 'Ausnahme: Wenn Passagen zur manuellen Überprüfung markiert und zurückgeschickt werden, wird die Bearbeitung nur für diese Abschnitte wieder aktiviert.',
    },
  },
  {
    icon: <Sparkles className="h-6 w-6 text-brand-blue dark:text-brand-beigeLight" />,
    title: {
      en: 'What happens next',
      it: 'Cosa succede dopo',
      fr: 'Ce qui se passe ensuite',
      de: 'Was als nächstes passiert',
    },
    body: {
      en: 'An automatic content screening will run immediately after you submit. This checks the text for policy compliance.',
      it: 'Un\'analisi automatica del contenuto verrà eseguita subito dopo l\'invio. Controlla il testo per il rispetto delle policy.',
      fr: 'Une analyse automatique du contenu s\'exécutera immédiatement après la soumission. Elle vérifie la conformité du texte aux règles.',
      de: 'Eine automatische Inhaltsprüfung wird sofort nach der Einreichung durchgeführt. Sie überprüft den Text auf Richtlinienkonformität.',
    },
    items: {
      en: [
        'If the text passes: you proceed directly to PDF generation — no human reviewer needed',
        'If passages are flagged: only those specific passages go to a human reviewer',
        'You will see the result immediately on this screen',
        'If revisions are requested, only the flagged sections need to be updated',
      ],
      it: [
        'Se il testo supera l\'analisi: procedi direttamente alla generazione del PDF — nessun revisore umano necessario',
        'Se dei passaggi vengono segnalati: solo quei passaggi specifici vanno a un revisore umano',
        'Vedrai il risultato immediatamente su questo schermo',
        'Se vengono richieste revisioni, solo le sezioni segnalate devono essere aggiornate',
      ],
      fr: [
        'Si le texte passe : vous accédez directement à la génération du PDF — aucun réviseur humain nécessaire',
        'Si des passages sont signalés : seuls ces passages spécifiques sont transmis à un réviseur humain',
        'Vous verrez le résultat immédiatement sur cet écran',
        'Si des révisions sont demandées, seules les sections signalées doivent être mises à jour',
      ],
      de: [
        'Wenn der Text besteht: Sie kommen direkt zur PDF-Erstellung — kein menschlicher Prüfer nötig',
        'Wenn Passagen markiert werden: Nur diese spezifischen Passagen gehen an einen menschlichen Prüfer',
        'Sie sehen das Ergebnis sofort auf diesem Bildschirm',
        'Wenn Überarbeitungen angefordert werden, müssen nur die markierten Abschnitte aktualisiert werden',
      ],
    },
  },
  {
    icon: <Download className="h-6 w-6 text-brand-greenDark dark:text-brand-greenLight" />,
    title: {
      en: 'After screening: your book is ready',
      it: 'Dopo la verifica: il tuo libro è pronto',
      fr: 'Après la vérification : votre livre est prêt',
      de: 'Nach der Prüfung: Ihr Buch ist fertig',
    },
    body: {
      en: 'If the text passes screening, you can immediately generate the complete book as a beautifully formatted PDF — ready to print, share with family, or keep as a lasting personal archive.',
      it: 'Se il testo supera la verifica, puoi subito generare il libro completo in formato PDF splendidamente impaginato — pronto per la stampa, da condividere con la famiglia o da conservare come archivio personale duraturo.',
      fr: 'Si le texte passe la vérification, vous pouvez immédiatement générer le livre complet en PDF magnifiquement mis en page — prêt à imprimer, à partager avec la famille ou à conserver comme archive personnelle durable.',
      de: 'Wenn der Text die Prüfung besteht, können Sie sofort das vollständige Buch als wunderschön formatiertes PDF erstellen — druckfertig, zum Teilen mit der Familie oder als dauerhaftes persönliches Archiv.',
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
    en: 'Run Screening & Submit',
    it: 'Avvia Verifica e Invia',
    fr: 'Lancer la Vérification',
    de: 'Prüfung Starten',
  };

  const screeningLabel: Record<string, string> = {
    en: 'Running screening…',
    it: 'Analisi in corso…',
    fr: 'Vérification en cours…',
    de: 'Prüfung läuft…',
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
          <div className="flex items-start gap-2.5 rounded-lg border border-brand-wine/40 bg-brand-wine/10 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-brand-wine" />
            <p className="text-sm text-brand-wineDark dark:text-brand-beigeLight leading-relaxed">{readinessError}</p>
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
                  <CheckCircle2 className="h-4 w-4 text-brand-greenDark dark:text-brand-greenLight mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          )}

          {current.warning && (
            <div className={[
              'rounded-lg border p-3 flex items-start gap-2.5',
              isLastStep
                ? 'bg-brand-mustardLight/45 border-brand-mustardDark/40 dark:bg-brand-mustardDark/20 dark:border-brand-mustardDark/50'
                : 'bg-brand-blue/25 border-brand-blue/55 dark:bg-brand-blue/15 dark:border-brand-blue/45',
            ].join(' ')}>
              <AlertTriangle className={[
                'h-4 w-4 mt-0.5 shrink-0',
                isLastStep ? 'text-brand-mustardDark dark:text-brand-mustardLight' : 'text-brand-ink dark:text-brand-beigeLight',
              ].join(' ')} />
              <p className={[
                'text-sm font-medium',
                isLastStep
                  ? 'text-brand-ink dark:text-brand-beigeLight'
                  : 'text-brand-ink dark:text-brand-beigeLight',
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
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {label(screeningLabel, language)}
              </>
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
