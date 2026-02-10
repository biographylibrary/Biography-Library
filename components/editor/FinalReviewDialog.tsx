'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Check, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  analyzeThemes,
  proposeAlternativeStructures,
  type SectionThemeAnalysis,
  type NarrativeStructureProposal,
} from '@/lib/ai/narrative-structure-service';
import { supabase } from '@/lib/supabase';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';

interface FinalReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  biographyId: string;
  sections: { key: string; title: string; content: string }[];
  onApplyStructure: (sectionOrder: string[], structureType: string, rationale: string) => void;
}

export function FinalReviewDialog({
  open,
  onOpenChange,
  biographyId,
  sections,
  onApplyStructure,
}: FinalReviewDialogProps) {
  const { session } = useAuth();
  const { t, language } = useTranslation();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [themeAnalysis, setThemeAnalysis] = useState<SectionThemeAnalysis[]>([]);
  const [proposals, setProposals] = useState<NarrativeStructureProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const originalOrder = BIOGRAPHY_SECTIONS.map(s => s.key);

  useEffect(() => {
    if (open && session?.access_token && sections.length > 0) {
      analyzeStructure();
    }
  }, [open, session, sections]);

  const analyzeStructure = async () => {
    if (!session?.access_token) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const { data: { session: freshSession } } = await supabase.auth.getSession();

      if (!freshSession?.access_token) {
        throw new Error('No valid session found. Please refresh the page and try again.');
      }

      const themes = await analyzeThemes(
        freshSession.access_token,
        sections.filter(s => s.content.trim().length > 50),
        language
      );

      setThemeAnalysis(themes);

      const structureProposals = await proposeAlternativeStructures(
        freshSession.access_token,
        themes,
        originalOrder,
        language
      );

      setProposals(structureProposals);
    } catch (err: any) {
      console.error('Error analyzing structure:', err);
      setError(err.message || 'Failed to analyze narrative structure');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyStructure = async () => {
    if (selectedProposal === null) return;

    const proposal = selectedProposal === -1
      ? {
          structureType: 'chronological',
          sectionOrder: originalOrder,
          rationale: 'Original chronological order',
        }
      : proposals[selectedProposal];

    if (!proposal) return;

    try {
      const { data: { session: freshSession } } = await supabase.auth.getSession();

      if (!freshSession?.user?.id) {
        throw new Error('No valid session found');
      }

      await supabase
        .from('narrative_structures')
        .upsert({
          biography_id: biographyId,
          user_id: freshSession.user.id,
          original_order: originalOrder,
          selected_order: proposal.sectionOrder,
          structure_type: proposal.structureType,
          rationale: proposal.rationale,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'biography_id'
        });

      onApplyStructure(proposal.sectionOrder, proposal.structureType, proposal.rationale);
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving structure:', err);
      setError('Failed to save structure');
    }
  };

  const getSectionTitle = (key: string) => {
    return t.sectionTitles[key as keyof typeof t.sectionTitles] ||
           BIOGRAPHY_SECTIONS.find(s => s.key === key)?.title || key;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {language === 'it' ? 'Revisione Finale della Struttura Narrativa' :
             language === 'fr' ? 'Révision Finale de la Structure Narrative' :
             language === 'de' ? 'Abschließende Überprüfung der Erzählstruktur' :
             'Final Narrative Structure Review'}
          </DialogTitle>
          <DialogDescription>
            {language === 'it' ? 'L\'IA ha analizzato tutte le sezioni completate e propone strutture narrative alternative. Puoi mantenere l\'ordine cronologico originale o esplorare nuovi modi di raccontare la tua storia.' :
             language === 'fr' ? 'L\'IA a analysé toutes les sections complétées et propose des structures narratives alternatives. Vous pouvez conserver l\'ordre chronologique d\'origine ou explorer de nouvelles façons de raconter votre histoire.' :
             language === 'de' ? 'Die KI hat alle abgeschlossenen Abschnitte analysiert und schlägt alternative Erzählstrukturen vor. Sie können die ursprüngliche chronologische Reihenfolge beibehalten oder neue Wege erkunden, Ihre Geschichte zu erzählen.' :
             'AI has analyzed all completed sections and proposes alternative narrative structures. You can keep the original chronological order or explore new ways to tell your story.'}
          </DialogDescription>
        </DialogHeader>

        {isAnalyzing ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                {language === 'it' ? 'Analisi delle sezioni in corso...' :
                 language === 'fr' ? 'Analyse des sections en cours...' :
                 language === 'de' ? 'Abschnitte werden analysiert...' :
                 'Analyzing sections...'}
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="py-8">
            <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-900/10">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={analyzeStructure}
                className="mt-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {language === 'it' ? 'Riprova' :
                 language === 'fr' ? 'Réessayer' :
                 language === 'de' ? 'Erneut versuchen' :
                 'Retry'}
              </Button>
            </Card>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <Card
              className={cn(
                'p-5 cursor-pointer transition-all border-2',
                selectedProposal === -1
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
              onClick={() => setSelectedProposal(-1)}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5',
                  selectedProposal === -1
                    ? 'border-primary bg-primary'
                    : 'border-border'
                )}>
                  {selectedProposal === -1 && <Check className="h-4 w-4 text-primary-foreground" />}
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-lg">
                    {language === 'it' ? 'Ordine Cronologico Originale' :
                     language === 'fr' ? 'Ordre Chronologique Original' :
                     language === 'de' ? 'Original Chronologische Reihenfolge' :
                     'Original Chronological Order'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === 'it' ? 'Mantieni la struttura cronologica tradizionale della tua biografia.' :
                     language === 'fr' ? 'Conservez la structure chronologique traditionnelle de votre biographie.' :
                     language === 'de' ? 'Behalten Sie die traditionelle chronologische Struktur Ihrer Biografie bei.' :
                     'Keep the traditional chronological structure of your biography.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {originalOrder.map((key, index) => (
                      <div key={key} className="flex items-center gap-1">
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {getSectionTitle(key)}
                        </span>
                        {index < originalOrder.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {proposals.map((proposal, index) => (
              <Card
                key={index}
                className={cn(
                  'p-5 cursor-pointer transition-all border-2',
                  selectedProposal === index
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
                onClick={() => setSelectedProposal(index)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5',
                    selectedProposal === index
                      ? 'border-primary bg-primary'
                      : 'border-border'
                  )}>
                    {selectedProposal === index && <Check className="h-4 w-4 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg">{proposal.structureType}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === 'it' ? 'Tema: ' :
                         language === 'fr' ? 'Thème: ' :
                         language === 'de' ? 'Thema: ' :
                         'Theme: '}
                        <span className="font-medium">{proposal.focusTheme}</span>
                      </p>
                    </div>
                    <p className="text-sm leading-relaxed">{proposal.rationale}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {proposal.sectionOrder.map((key, idx) => (
                        <div key={key} className="flex items-center gap-1">
                          <span className="text-xs bg-primary/10 px-2 py-1 rounded font-medium">
                            {getSectionTitle(key)}
                          </span>
                          {idx < proposal.sectionOrder.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                    {proposal.transitionNotes && proposal.transitionNotes.length > 0 && (
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          {language === 'it' ? 'Note di Transizione:' :
                           language === 'fr' ? 'Notes de Transition:' :
                           language === 'de' ? 'Übergangshinweise:' :
                           'Transition Notes:'}
                        </p>
                        <ul className="space-y-1">
                          {proposal.transitionNotes.map((note, i) => (
                            <li key={i} className="text-xs text-muted-foreground">• {note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {language === 'it' ? 'Annulla' :
             language === 'fr' ? 'Annuler' :
             language === 'de' ? 'Abbrechen' :
             'Cancel'}
          </Button>
          <Button
            onClick={handleApplyStructure}
            disabled={selectedProposal === null || isAnalyzing}
          >
            {language === 'it' ? 'Applica Struttura' :
             language === 'fr' ? 'Appliquer la Structure' :
             language === 'de' ? 'Struktur Anwenden' :
             'Apply Structure'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
