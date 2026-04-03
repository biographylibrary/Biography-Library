'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import { getSectionTitle } from '@/lib/ai/next-section-recommender';

interface NextSectionPromptProps {
  completedSectionKey: string;
  recommendedSection?: string;
  recommendationReason?: string;
  confidence?: 'high' | 'medium' | 'low';
  onStartSection: (sectionKey: string) => void;
  completedSections: string[];
  isLoading?: boolean;
}

export function NextSectionPrompt({
  completedSectionKey,
  recommendedSection,
  recommendationReason,
  confidence,
  onStartSection,
  completedSections,
  isLoading = false,
}: NextSectionPromptProps) {
  const { t, language } = useTranslation();
  const [selectedSection, setSelectedSection] = useState<string>('');

  const completedSectionTitle = getSectionTitle(completedSectionKey, language);

  const availableSections = BIOGRAPHY_SECTIONS.filter(
    (section) => !completedSections.includes(section.key)
  );

  const messages = {
    greatWork: {
      en: 'Great work on',
      it: 'Ottimo lavoro su',
      fr: 'Excellent travail sur',
      de: 'Großartige Arbeit an',
    },
    aiSuggests: {
      en: 'Based on what you wrote, we recommend working on',
      it: 'In base a quello che hai scritto, ti consigliamo di lavorare su',
      fr: 'Sur la base de ce que vous avez écrit, nous vous recommandons de travailler sur',
      de: 'Basierend auf dem, was Sie geschrieben haben, empfehlen wir die Arbeit an',
    },
    orChooseAnother: {
      en: 'Or choose another section:',
      it: 'Oppure scegli un\'altra sezione:',
      fr: 'Ou choisissez une autre section:',
      de: 'Oder wählen Sie einen anderen Abschnitt:',
    },
    selectSection: {
      en: 'Select a section',
      it: 'Seleziona una sezione',
      fr: 'Sélectionnez une section',
      de: 'Wählen Sie einen Abschnitt',
    },
    start: {
      en: 'Start',
      it: 'Inizia',
      fr: 'Commencer',
      de: 'Beginnen',
    },
    allSectionsComplete: {
      en: 'You\'ve completed all sections! Consider adding more details to any section.',
      it: 'Hai completato tutte le sezioni! Considera di aggiungere più dettagli a qualsiasi sezione.',
      fr: 'Vous avez terminé toutes les sections! Pensez à ajouter plus de détails à n\'importe quelle section.',
      de: 'Sie haben alle Abschnitte abgeschlossen! Erwägen Sie, beliebigen Abschnitten mehr Details hinzuzufügen.',
    },
    analyzingContent: {
      en: 'Analyzing your content...',
      it: 'Analisi del contenuto...',
      fr: 'Analyse de votre contenu...',
      de: 'Analysiere Ihren Inhalt...',
    },
  };

  const getMessage = (key: keyof typeof messages) => {
    const msg = messages[key];
    return msg[language as keyof typeof msg] || msg.en;
  };

  if (availableSections.length === 0) {
    return (
      <Card className="p-6 bg-status-success border-border-global dark:border-dark-btn-primary-border">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-text-primary dark:text-dark-text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-text-primary dark:text-dark-text-primary mb-1">
              {getMessage('greatWork')} {completedSectionTitle}!
            </h3>
            <p className="text-sm text-text-primary dark:text-dark-text-primary">
              {getMessage('allSectionsComplete')}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-status-success border-border-global dark:border-dark-btn-primary-border">
      <div className="flex items-start gap-3 mb-4">
        <CheckCircle2 className="h-6 w-6 text-text-primary dark:text-dark-text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-text-primary dark:text-dark-text-primary mb-1">
            {getMessage('greatWork')} {completedSectionTitle}!
          </h3>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-text-primary dark:text-dark-text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              {getMessage('analyzingContent')}
            </div>
          ) : recommendedSection && recommendationReason ? (
            <div className="space-y-3 mt-3">
              <p className="text-sm text-text-primary dark:text-dark-text-primary">
                {recommendationReason}
              </p>
              <Button
                onClick={() => onStartSection(recommendedSection)}
                className="bg-primary hover:bg-primary/90 text-white gap-2"
              >
                {getMessage('start')} {getSectionTitle(recommendedSection, language)}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 pt-3 border-t border-brand-greenLight/60 dark:border-brand-greenDark/50">
        <p className="text-sm text-text-primary dark:text-dark-text-primary font-medium">
          {getMessage('orChooseAnother')}
        </p>
        <div className="flex gap-2">
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="flex-1 bg-bg-surface dark:bg-dark-bg-surface">
              <SelectValue placeholder={getMessage('selectSection')} />
            </SelectTrigger>
            <SelectContent>
              {availableSections.map((section) => (
                <SelectItem key={section.key} value={section.key}>
                  {getSectionTitle(section.key, language)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => selectedSection && onStartSection(selectedSection)}
            disabled={!selectedSection}
            variant="outline"
            className="gap-2"
          >
            {getMessage('start')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
