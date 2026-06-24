'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/lib/i18n/i18n-context';
import {
  FileText,
  Landmark,
  MessageSquareText,
  MoreHorizontal,
  SpellCheck,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EditorAiToolsMenuProps {
  aiEnabled?: boolean;
  aiLoading?: boolean;
  hasText?: boolean;
  onGrammarCheck?: () => void;
  onGuidedPrompts?: () => void;
  onSummarize?: () => void;
  onReviewWithAi?: () => void;
  onApertusReview?: () => void;
  className?: string;
  buttonClassName?: string;
}

export function EditorAiToolsMenu({
  aiEnabled,
  aiLoading = false,
  hasText = false,
  onGrammarCheck,
  onGuidedPrompts,
  onSummarize,
  onReviewWithAi,
  onApertusReview,
  className,
  buttonClassName,
}: EditorAiToolsMenuProps) {
  const { t } = useTranslation();

  if (!aiEnabled) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('gap-1 text-xs h-8 px-2 shrink-0', buttonClassName, className)}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t.echo.aiToolsMenu}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {onGrammarCheck && (
          <DropdownMenuItem
            disabled={aiLoading || !hasText}
            onClick={onGrammarCheck}
          >
            <SpellCheck className="h-3.5 w-3.5 mr-2" />
            {t.editor.checkGrammar}
          </DropdownMenuItem>
        )}
        {onGuidedPrompts && (
          <DropdownMenuItem disabled={aiLoading} onClick={onGuidedPrompts}>
            <MessageSquareText className="h-3.5 w-3.5 mr-2" />
            {t.editor.needHelp}
          </DropdownMenuItem>
        )}
        {onSummarize && (
          <DropdownMenuItem
            disabled={aiLoading || !hasText}
            onClick={onSummarize}
          >
            <FileText className="h-3.5 w-3.5 mr-2" />
            {t.editor.summarize}
          </DropdownMenuItem>
        )}
        {onReviewWithAi && (
          <DropdownMenuItem
            disabled={aiLoading || !hasText}
            onClick={onReviewWithAi}
          >
            <Wand2 className="h-3.5 w-3.5 mr-2" />
            {t.aiReview.reviewButton}
          </DropdownMenuItem>
        )}
        {onApertusReview && (
          <DropdownMenuItem
            disabled={aiLoading || !hasText}
            onClick={onApertusReview}
          >
            <Landmark className="h-3.5 w-3.5 mr-2" />
            {t.aiReview.apertusButton}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
