'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Edit3, Loader2, Star, AlertCircle } from 'lucide-react';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import type { SectionSuggestion } from '@/lib/import/section-matcher';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface SectionAssignmentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: SectionSuggestion[];
  onAcceptAll: (assignments: { section: string; text: string }[]) => void;
  onCancel: () => void;
}

type AssignmentStatus = 'pending' | 'accepted' | 'skipped' | 'modified';

interface Assignment {
  suggestion: SectionSuggestion;
  selectedSection: string;
  status: AssignmentStatus;
}

export function SectionAssignmentWizard({
  open,
  onOpenChange,
  suggestions,
  onAcceptAll,
  onCancel,
}: SectionAssignmentWizardProps) {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState<Assignment[]>(
    suggestions.map((suggestion) => ({
      suggestion,
      selectedSection: suggestion.section,
      status: 'pending' as AssignmentStatus,
    }))
  );

  const handleAccept = (index: number) => {
    setAssignments((prev) =>
      prev.map((a, i) =>
        i === index ? { ...a, status: 'accepted' as AssignmentStatus } : a
      )
    );
  };

  const handleSkip = (index: number) => {
    setAssignments((prev) =>
      prev.map((a, i) =>
        i === index ? { ...a, status: 'skipped' as AssignmentStatus } : a
      )
    );
  };

  const handleSectionChange = (index: number, section: string) => {
    setAssignments((prev) =>
      prev.map((a, i) =>
        i === index
          ? {
              ...a,
              selectedSection: section,
              status: 'modified' as AssignmentStatus,
            }
          : a
      )
    );
  };

  const handleAcceptAll = () => {
    const finalAssignments = assignments
      .filter((a) => a.status !== 'skipped')
      .map((a) => ({
        section: a.selectedSection,
        text: a.suggestion.fullText,
      }));

    onAcceptAll(finalAssignments);
  };

  const handleAcceptAllSuggestions = () => {
    setAssignments((prev) =>
      prev.map((a) => ({
        ...a,
        status: a.status === 'skipped' ? 'skipped' : 'accepted',
      }))
    );
  };

  const getConfidenceBadge = (confidence: string) => {
    const configs = {
      high: {
        icon: '⭐⭐⭐',
        text: 'Alta',
        variant: 'default' as const,
      },
      medium: {
        icon: '⭐⭐',
        text: 'Media',
        variant: 'secondary' as const,
      },
      low: {
        icon: '⭐',
        text: 'Bassa',
        variant: 'outline' as const,
      },
    };

    const config = configs[confidence as keyof typeof configs] || configs.low;

    return (
      <Badge variant={config.variant} className="gap-1">
        <span>{config.icon}</span>
        <span>{config.text}</span>
      </Badge>
    );
  };

  const pendingCount = assignments.filter((a) => a.status === 'pending').length;
  const acceptedCount = assignments.filter((a) =>
    ['accepted', 'modified'].includes(a.status)
  ).length;
  const skippedCount = assignments.filter((a) => a.status === 'skipped').length;
  const hasLowConfidence = suggestions.some((s) => s.confidence === 'low');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Assegnazione Automatica Sezioni
            {hasLowConfidence && (
              <Badge variant="outline" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Revisione consigliata
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            L&apos;AI ha analizzato il testo importato e suggerito l&apos;assegnazione
            delle sezioni. Rivedi e conferma le assegnazioni.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 text-sm text-muted-foreground border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">Totale:</span>
            <Badge variant="secondary">{assignments.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Accettate:</span>
            <Badge variant="default">{acceptedCount}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">In sospeso:</span>
            <Badge variant="outline">{pendingCount}</Badge>
          </div>
          {skippedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Saltate:</span>
              <Badge variant="destructive">{skippedCount}</Badge>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            {assignments.map((assignment, index) => {
              const sectionInfo = BIOGRAPHY_SECTIONS.find(
                (s) => s.key === assignment.selectedSection
              );
              const isProcessed = ['accepted', 'modified', 'skipped'].includes(
                assignment.status
              );

              return (
                <Card
                  key={index}
                  className={`p-4 ${
                    assignment.status === 'accepted'
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                      : assignment.status === 'modified'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                      : assignment.status === 'skipped'
                      ? 'border-gray-300 bg-gray-50 dark:bg-gray-900/20 opacity-60'
                      : ''
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="text-sm text-muted-foreground italic border-l-2 border-border pl-3">
                          {assignment.suggestion.excerpt}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Sezione suggerita:
                          </span>
                          <Select
                            value={assignment.selectedSection}
                            onValueChange={(value) =>
                              handleSectionChange(index, value)
                            }
                            disabled={assignment.status === 'skipped'}
                          >
                            <SelectTrigger className="w-[280px] h-8">
                              <SelectValue>
                                {t.sectionTitles[
                                  assignment.selectedSection as keyof typeof t.sectionTitles
                                ] || sectionInfo?.title}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {BIOGRAPHY_SECTIONS.map((section) => (
                                <SelectItem key={section.key} value={section.key}>
                                  {t.sectionTitles[
                                    section.key as keyof typeof t.sectionTitles
                                  ] || section.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {getConfidenceBadge(assignment.suggestion.confidence)}
                          {assignment.status === 'modified' && (
                            <Badge variant="default" className="gap-1">
                              <Edit3 className="h-3 w-3" />
                              Modificato
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Motivo:</span>{' '}
                          {assignment.suggestion.reason}
                        </div>
                      </div>

                      {!isProcessed && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 gap-1"
                            onClick={() => handleAccept(index)}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Accetta
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
                            onClick={() => handleSkip(index)}
                          >
                            <X className="h-3.5 w-3.5" />
                            Salta
                          </Button>
                        </div>
                      )}

                      {isProcessed && assignment.status !== 'skipped' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Check className="h-5 w-5 text-green-600" />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() =>
                              setAssignments((prev) =>
                                prev.map((a, i) =>
                                  i === index ? { ...a, status: 'pending' } : a
                                )
                              )
                            }
                          >
                            Modifica
                          </Button>
                        </div>
                      )}

                      {assignment.status === 'skipped' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm text-muted-foreground">
                            Saltato
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() =>
                              setAssignments((prev) =>
                                prev.map((a, i) =>
                                  i === index ? { ...a, status: 'pending' } : a
                                )
                              )
                            }
                          >
                            Ripristina
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={false}
          >
            Annulla Import
          </Button>
          {pendingCount > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleAcceptAllSuggestions}
            >
              Accetta Tutto
            </Button>
          )}
          <Button
            type="button"
            onClick={handleAcceptAll}
            disabled={acceptedCount === 0}
          >
            <Check className="mr-2 h-4 w-4" />
            Conferma {acceptedCount > 0 && `(${acceptedCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
