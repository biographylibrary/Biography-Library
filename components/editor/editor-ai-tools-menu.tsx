'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { MoreVertical, SpellCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconHint } from '@/components/ui/icon-hint';

export interface EditorAiToolsMenuProps {
  aiEnabled?: boolean;
  aiLoading?: boolean;
  hasText?: boolean;
  onGrammarCheck?: () => void;
  /** Se valorizzato, il controllo grammaticale è disattivato e mostra questa frase. */
  grammarUnavailable?: string | null;
  className?: string;
  buttonClassName?: string;
}

export function EditorAiToolsMenu({
  aiEnabled,
  aiLoading = false,
  hasText = false,
  onGrammarCheck,
  grammarUnavailable = null,
  className,
  buttonClassName,
}: EditorAiToolsMenuProps) {
  const { t } = useTranslation();

  if (!aiEnabled) return null;

  const grammarDisabled = aiLoading || !hasText || Boolean(grammarUnavailable);

  return (
    <IconHint label={t.echo.aiToolsMenu} maxWidth={639}>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              'h-8 w-8 shrink-0 gap-1 rounded-md p-0 text-xs sm:w-auto sm:px-2',
              buttonClassName,
              className,
            )}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="hidden sm:inline">{t.echo.aiToolsMenu}</span>
          </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {onGrammarCheck && (
          <DropdownMenuItem
            disabled={grammarDisabled}
            title={grammarUnavailable ?? undefined}
            onClick={grammarUnavailable ? undefined : onGrammarCheck}
          >
            <SpellCheck className="h-3.5 w-3.5 mr-2" />
            {grammarUnavailable || t.editor.checkGrammar}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    </IconHint>
  );
}
