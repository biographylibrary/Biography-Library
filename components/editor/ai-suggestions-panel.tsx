'use client';

import { Button } from '@/components/ui/button';
import { Check, XCircle, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import type { AiPanelState, AiSuggestion } from '@/lib/ai-constants';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { EditorSidebarDialog } from './EditorSidebarDialog';

interface AiSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: AiPanelState;
  onAcceptSuggestion: (id: string) => void;
  onRejectSuggestion: (id: string) => void;
}

function SuggestionCard({
  suggestion,
  onAccept,
  onReject,
}: {
  suggestion: AiSuggestion;
  onAccept: () => void;
  onReject: () => void;
}) {
  const { t } = useTranslation();
  const isResolved = suggestion.status !== 'pending';

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        suggestion.status === 'accepted' && 'border-brand-greenLight/50 bg-brand-greenLight/10',
        suggestion.status === 'rejected' && 'border-muted bg-muted/30 opacity-50',
        suggestion.status === 'pending' && 'border-border bg-card'
      )}
    >
      {suggestion.original && (
        <div className="mb-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            {t.editor.original}
          </span>
          <p className="text-sm text-foreground/80 mt-0.5 line-through decoration-red-400/50">
            {suggestion.original}
          </p>
        </div>
      )}
      <div className="mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          {t.editor.suggestion}
        </span>
        <p className="text-sm text-foreground mt-0.5">{suggestion.suggestion}</p>
      </div>
      {suggestion.explanation && (
        <p className="text-xs text-muted-foreground mb-3 italic">
          {suggestion.explanation}
        </p>
      )}
      {!isResolved && (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 text-brand-greenDark hover:text-brand-ink hover:bg-brand-greenLight/30 border-brand-greenLight/50 dark:text-brand-greenLight dark:hover:bg-brand-greenLight/10"
            onClick={onAccept}
          >
            <Check className="h-3 w-3" />
            {t.editor.accept}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive"
            onClick={onReject}
          >
            <XCircle className="h-3 w-3" />
            {t.editor.reject}
          </Button>
        </div>
      )}
      {suggestion.status === 'accepted' && (
        <span className="text-xs text-brand-greenDark dark:text-brand-greenLight font-medium flex items-center gap-1">
          <Check className="h-3 w-3" /> {t.editor.applied}
        </span>
      )}
      {suggestion.status === 'rejected' && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <XCircle className="h-3 w-3" /> {t.editor.dismissed}
        </span>
      )}
    </div>
  );
}

export function AiSuggestionsDialog({
  open,
  onOpenChange,
  state,
  onAcceptSuggestion,
  onRejectSuggestion,
}: AiSuggestionsDialogProps) {
  const { t } = useTranslation();

  const panelTitle = t.editor.grammarStyle;

  const PanelIcon = Sparkles;

  return (
    <EditorSidebarDialog
      open={open}
      onOpenChange={onOpenChange}
      title={panelTitle}
      icon={<PanelIcon className="h-5 w-5 text-primary" />}
      headerExtra={
        <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
          AI
        </span>
      }
      bodyClassName="px-6 pb-6 pt-4 space-y-3"
    >
      {state.loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            {t.editor.analyzingWithAi}
          </span>
        </div>
      )}

      {state.error && (
        <div className="flex flex-col gap-2 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{state.error}</p>
            </div>
          </div>
        </div>
      )}

      {!state.loading && !state.error && state.type === 'grammar' && (
        <>
          {state.suggestions.length === 0 ? (
            <div className="text-center py-8">
              <Check className="h-8 w-8 text-brand-greenDark dark:text-brand-greenLight mx-auto mb-2" />
              <p className="text-sm font-medium">{t.editor.lookingGood}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t.editor.noGrammarIssues}
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {state.suggestions.length} {t.editor.suggestionsFound}
              </p>
              {state.suggestions.map((s) => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  onAccept={() => onAcceptSuggestion(s.id)}
                  onReject={() => onRejectSuggestion(s.id)}
                />
              ))}
            </>
          )}
        </>
      )}

    </EditorSidebarDialog>
  );
}
