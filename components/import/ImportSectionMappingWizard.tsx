'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, TriangleAlert } from 'lucide-react';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import { suggestSectionForBlock } from '@/lib/import/section-matcher';
import { stripHtmlToPlain } from '@/lib/import/html-blocks';
import { matchSectionTitle } from '@/lib/import/html-normalizer';
import type { ParsedSection } from '@/lib/text-import-parser';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { AiLimitError } from '@/lib/ai/ai-provider';
import { cn } from '@/lib/utils';

export interface MappingBlock extends ParsedSection {
  id: string;
  selectedSection: string;
  skipped: boolean;
  asSubheading: boolean;
  source: 'title' | 'ai' | 'manual' | 'none';
  aiReason?: string;
}

interface ImportSectionMappingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocks: ParsedSection[];
  fallbackSectionKey: string;
  onConfirm: (assignments: Array<{ sectionKey: string; content: string; append: boolean }>) => void;
  onCancel: () => void;
}

function confidenceBadge(
  confidence: string,
  labels: { high: string; medium: string; low: string }
) {
  const map = {
    high: 'default' as const,
    medium: 'secondary' as const,
    low: 'outline' as const,
  };
  const label =
    confidence === 'high' ? labels.high : confidence === 'medium' ? labels.medium : labels.low;
  return <Badge variant={map[confidence as keyof typeof map] ?? 'outline'}>{label}</Badge>;
}

export function ImportSectionMappingWizard({
  open,
  onOpenChange,
  blocks,
  fallbackSectionKey,
  onConfirm,
  onCancel,
}: ImportSectionMappingWizardProps) {
  const { t, language } = useTranslation();
  const im = t.importMapping;

  const [items, setItems] = useState<MappingBlock[]>([]);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setItems(
      blocks.map((b, i) => {
        const titleMatch = b.title ? matchSectionTitle(b.title, language) : null;
        const sectionKey =
          b.sectionKey ?? titleMatch?.key ?? fallbackSectionKey;
        const confidence = b.confidence ?? titleMatch?.confidence ?? 'none';
        return {
          ...b,
          id: `block-${i}`,
          selectedSection: sectionKey,
          skipped: false,
          asSubheading: !b.title,
          source: titleMatch || b.sectionKey ? 'title' : 'none',
          confidence,
        };
      })
    );
    setAiError(null);
  }, [open, blocks, fallbackSectionKey, language]);

  const runAiForBlock = useCallback(
    async (id: string) => {
      const block = items.find((x) => x.id === id);
      if (!block) return;
      setAiLoadingId(id);
      setAiError(null);
      try {
        const suggestion = await suggestSectionForBlock(block.content, language);
        setItems((prev) =>
          prev.map((x) =>
            x.id === id
              ? {
                  ...x,
                  selectedSection: suggestion.section,
                  confidence: suggestion.confidence,
                  source: 'ai',
                  aiReason: suggestion.reason,
                }
              : x
          )
        );
      } catch (err) {
        if (err instanceof AiLimitError) {
          setAiError(
            err.limitType === 'daily' ? t.aiUsage.dailyLimitReached : t.aiUsage.weeklyLimitReached
          );
        } else {
          setAiError(im.aiError);
        }
      } finally {
        setAiLoadingId(null);
      }
    },
    [items, language, im.aiError, t.aiUsage]
  );

  const needsReview = items.some(
    (x) =>
      !x.skipped &&
      x.title &&
      (x.confidence === 'low' || x.confidence === 'none') &&
      x.source !== 'manual' &&
      x.source !== 'ai'
  );

  const handleConfirm = () => {
    const assignments: Array<{ sectionKey: string; content: string; append: boolean }> = [];
    for (const item of items) {
      if (item.skipped) continue;
      const html = item.asSubheading && item.title
        ? `<h2>${item.title}</h2>${item.content}`
        : item.content;
      assignments.push({
        sectionKey: item.selectedSection,
        content: html,
        append: true,
      });
    }
    onConfirm(assignments);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[min(90vh,720px)] flex flex-col">
        <DialogHeader>
          <DialogTitle>{im.title}</DialogTitle>
          <DialogDescription>{im.description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-2">
          <div className="space-y-4 py-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'rounded-lg border p-4 space-y-3',
                  item.confidence === 'low' && !item.skipped && 'border-amber-500/50 bg-amber-500/5'
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">
                      {item.title || im.untitledBlock}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {stripHtmlToPlain(item.content).slice(0, 160)}
                      {stripHtmlToPlain(item.content).length > 160 ? '…' : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {item.confidence && item.confidence !== 'none' &&
                      confidenceBadge(item.confidence, {
                        high: im.confidenceHigh,
                        medium: im.confidenceMedium,
                        low: im.confidenceLow,
                      })}
                    <Badge variant="outline">
                      {item.source === 'ai' ? im.sourceAi : item.source === 'title' ? im.sourceTitle : im.sourceManual}
                    </Badge>
                  </div>
                </div>

                {item.aiReason && (
                  <p className="text-xs text-muted-foreground italic">{item.aiReason}</p>
                )}

                <div className="flex flex-wrap gap-2 items-center">
                  <Select
                    value={item.selectedSection}
                    onValueChange={(v) =>
                      setItems((prev) =>
                        prev.map((x) =>
                          x.id === item.id
                            ? { ...x, selectedSection: v, source: 'manual' as const }
                            : x
                        )
                      )
                    }
                    disabled={item.skipped}
                  >
                    <SelectTrigger className="w-[200px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BIOGRAPHY_SECTIONS.map((s) => (
                        <SelectItem key={s.key} value={s.key}>
                          {t.sectionTitles[s.key as keyof typeof t.sectionTitles] || s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    disabled={item.skipped || aiLoadingId === item.id}
                    onClick={() => void runAiForBlock(item.id)}
                  >
                    {aiLoadingId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {im.suggestAi}
                  </Button>

                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.skipped}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === item.id ? { ...x, skipped: e.target.checked } : x
                          )
                        )
                      }
                    />
                    {im.skipBlock}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {needsReview && (
          <Alert>
            <TriangleAlert className="h-4 w-4" />
            <AlertDescription>{im.reviewRequired}</AlertDescription>
          </Alert>
        )}
        {aiError && (
          <Alert variant="destructive">
            <AlertDescription>{aiError}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t.common.cancel}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={needsReview}>
            {im.confirmImport}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
