'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import { useTranslation } from '@/lib/i18n/i18n-context';

const DEFAULT_BIOGRAPHY_SECTION_ORDER = BIOGRAPHY_SECTIONS.map((s) => s.key);

interface FinalReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  biographyId: string;
  /** Capitoli con testo: determinano quali titoli compaiono nell'ordine. */
  sections: { key: string; title: string; content: string }[];
  onApplyStructure: (sectionOrder: string[], structureType: string, rationale: string) => void;
}

const COPY = {
  it: {
    title: 'Prepara la versione finale',
    description:
      'I capitoli vengono riuniti in ordine cronologico nella versione finale, che rivedrai in PDF prima di pubblicare.',
    cancel: 'Annulla',
    apply: 'Prepara la versione finale',
    error: 'Non è stato possibile salvare la struttura.',
  },
  fr: {
    title: 'Préparer la version finale',
    description:
      "Les chapitres sont réunis dans l'ordre chronologique dans la version finale, que vous relirez en PDF avant de publier.",
    cancel: 'Annuler',
    apply: 'Préparer la version finale',
    error: "La structure n'a pas pu être enregistrée.",
  },
  de: {
    title: 'Endfassung vorbereiten',
    description:
      'Die Kapitel werden in chronologischer Reihenfolge zur Endfassung zusammengefasst, die Sie vor der Veröffentlichung als PDF prüfen.',
    cancel: 'Abbrechen',
    apply: 'Endfassung vorbereiten',
    error: 'Die Struktur konnte nicht gespeichert werden.',
  },
  en: {
    title: 'Prepare the final version',
    description:
      'Your chapters are combined in chronological order into the final version, which you will review as a PDF before publishing.',
    cancel: 'Cancel',
    apply: 'Prepare the final version',
    error: 'The structure could not be saved.',
  },
} as const;

/**
 * Passaggio del percorso di pubblicazione in modalità a sezioni: fissa l'ordine
 * dei capitoli (cronologico) e porta la biografia allo stato `final_version`.
 * Non usa l'intelligenza artificiale: le strutture alternative proposte dal
 * modello sono state tolte, il passaggio resta perché senza di esso la modalità
 * a sezioni non arriva alla bozza PDF.
 */
export function FinalReviewDialog({
  open,
  onOpenChange,
  biographyId,
  sections,
  onApplyStructure,
}: FinalReviewDialogProps) {
  const { t, language } = useTranslation();
  const copy = COPY[language as keyof typeof COPY] ?? COPY.en;
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const titleFor = (key: string) =>
    t.sectionTitles[key as keyof typeof t.sectionTitles] ||
    BIOGRAPHY_SECTIONS.find((s) => s.key === key)?.title ||
    key;

  const withText = new Set(sections.map((s) => s.key));
  const order = DEFAULT_BIOGRAPHY_SECTION_ORDER.filter((key) => withText.has(key));

  const handleApply = async () => {
    setSaving(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('No valid session found');

      await supabase.from('narrative_structures').upsert(
        {
          biography_id: biographyId,
          user_id: session.user.id,
          original_order: DEFAULT_BIOGRAPHY_SECTION_ORDER,
          selected_order: DEFAULT_BIOGRAPHY_SECTION_ORDER,
          structure_type: 'chronological',
          rationale: 'Original chronological order',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'biography_id' }
      );

      onApplyStructure(DEFAULT_BIOGRAPHY_SECTION_ORDER, 'chronological', 'Original chronological order');
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving structure:', err);
      setError(copy.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <Card className="p-5 border-2 border-primary bg-primary/5">
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full border-2 border-primary bg-primary flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {order.map((key, index) => (
                <div key={key} className="flex items-center gap-1">
                  <span className="text-xs bg-muted px-2 py-1 rounded">{titleFor(key)}</span>
                  {index < order.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.cancel}
          </Button>
          <Button onClick={handleApply} disabled={saving}>
            {copy.apply}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
