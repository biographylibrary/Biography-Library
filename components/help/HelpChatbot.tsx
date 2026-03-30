'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Trash2, MessageCircleQuestion, Loader as Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useAuth } from '@/lib/auth-context';
import { askHelpBot } from '@/lib/help/help-service';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  lowConfidence?: boolean;
}

const MAX_MESSAGES = 10;

interface HelpChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpChatbot({ isOpen, onClose }: HelpChatbotProps) {
  const { t, language } = useTranslation();
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const totalMessages = messages.length;
    if (totalMessages >= MAX_MESSAGES) {
      setMessages([]);
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmed,
    };

    setMessages(prev => {
      const next = prev.length >= MAX_MESSAGES ? [] : prev;
      return [...next, userMsg];
    });
    setInput('');
    setError(null);
    setLoading(true);

    const accessToken = session?.access_token ?? null;
    if (!accessToken) {
      setError('Sessione non disponibile. Ricarica la pagina e riprova.');
      setLoading(false);
      return;
    }

    try {
      const response = await askHelpBot(trimmed, language as 'en' | 'it' | 'fr' | 'de', accessToken);
      const botMsg: Message = {
        id: crypto.randomUUID(),
        role: 'bot',
        text: response.answer,
        lowConfidence: response.confidence === 'low',
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'SESSION_EXPIRED') {
        setError(t.helpChatbot.sessionExpired);
      } else if (msg === 'NO_SESSION') {
        setError('Sessione non disponibile. Ricarica la pagina e riprova.');
      } else if (msg.toLowerCase().includes('rate limit')) {
        setError(t.helpChatbot.rateLimitError);
      } else if (msg) {
        setError(msg);
      } else {
        setError(t.helpChatbot.genericError);
      }
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages.length, language, t, session]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
  };

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
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleClear}
                title={t.helpChatbot.clearChat}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
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
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <MessageCircleQuestion className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
                {t.helpChatbot.placeholder}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-foreground text-background rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                )}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.lowConfidence && (
                  <p className="mt-2 text-xs text-muted-foreground border-t border-border/40 pt-2">
                    {t.helpChatbot.lowConfidence}
                  </p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t.helpChatbot.loading}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div className="bg-destructive/10 border border-destructive/20 rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[85%]">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="px-3 py-3 border-t border-border shrink-0">
          <div className="flex items-end gap-2 bg-muted rounded-xl px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.helpChatbot.placeholder}
              rows={1}
              disabled={loading}
              className={cn(
                'flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground',
                'min-h-[24px] max-h-[120px] leading-6 py-0',
                'disabled:opacity-50'
              )}
              style={{ overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden' }}
            />
            <Button
              size="icon"
              className="h-7 w-7 shrink-0 rounded-lg"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              title={t.helpChatbot.send}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
