'use client';

import { X, MessageCircleQuestion, LogIn } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useAuth } from '@/lib/auth-context';
import { AgentChat } from '@/components/agents/AgentChat';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface HelpChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpChatbot({ isOpen, onClose }: HelpChatbotProps) {
  const { t } = useTranslation();
  const { session } = useAuth();

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/20 z-40 transition-opacity duration-200',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t.helpChatbot.title}
        className={cn(
          'fixed z-50 bg-background border-border shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-in-out',
          'bottom-0 left-0 right-0 h-[70vh] border-t rounded-t-2xl',
          'md:bottom-auto md:top-16 md:right-0 md:left-auto md:h-[calc(100vh-4rem)] md:w-96 md:border-l md:border-t-0 md:rounded-none',
          isOpen
            ? 'translate-y-0 md:translate-x-0'
            : 'translate-y-full md:translate-y-0 md:translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircleQuestion className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">{t.helpChatbot.title}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            title={t.helpChatbot.closeHelp}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          {!session ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center gap-4 py-8 px-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <LogIn className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed">
                {t.helpChatbot.signInRequired}
              </p>
              <Button size="sm" asChild onClick={onClose}>
                <Link href="/login">{t.publicBiographies.signIn}</Link>
              </Button>
            </div>
          ) : (
            <AgentChat
              agentType="platform_guide"
              className="flex-1 min-h-0"
              emptyState={t.helpChatbot.placeholder}
              fallbackToHelpEdge
            />
          )}
        </div>
      </aside>
    </>
  );
}
