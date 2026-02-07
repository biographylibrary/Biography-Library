'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Bot, User, Send, Mic, Loader2, ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { getFallbackPrompts } from '@/lib/ai-constants';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import { VoiceRecorder } from './voice-recorder';
import { cn } from '@/lib/utils';
import { analyzeAndRespond, type ConversationHistory } from '@/lib/ai/smart-followup';
import { useAuth } from '@/lib/auth-context';

interface Message {
  id: string;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

interface ConversationModeProps {
  sectionKey: string;
  onBackToEditor: () => void;
  onGenerateDraft: (answers: { question: string; answer: string }[]) => Promise<void>;
  currentText: string;
}

export function ConversationMode({
  sectionKey,
  onBackToEditor,
  onGenerateDraft,
  currentText,
}: ConversationModeProps) {
  const { t, language } = useTranslation();
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [audioTranscript, setAudioTranscript] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [hasHadFollowUp, setHasHadFollowUp] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const prompts = getFallbackPrompts(language)[sectionKey] || [];
  const section = BIOGRAPHY_SECTIONS.find((s) => s.key === sectionKey);
  const sectionTitle = section ? t.sectionTitles[sectionKey as keyof typeof t.sectionTitles] : '';

  useEffect(() => {
    if (prompts.length > 0 && messages.length === 0) {
      const firstQuestion = prompts[0].prompt;
      setMessages([
        {
          id: '1',
          type: 'ai',
          content: firstQuestion,
          timestamp: new Date(),
        },
      ]);
    }
  }, [prompts, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  useEffect(() => {
    if (audioTranscript) {
      setCurrentAnswer((prev) => {
        const separator = prev && !prev.endsWith(' ') ? ' ' : '';
        return prev + separator + audioTranscript;
      });
      setAudioTranscript('');
    }
  }, [audioTranscript]);

  const generateAcknowledgment = (answer: string): string => {
    const acknowledgments = {
      en: [
        'Thank you for sharing that.',
        'That\'s a wonderful memory.',
        'I appreciate you opening up about this.',
        'That sounds meaningful.',
        'Thank you for that insight.',
      ],
      it: [
        'Grazie per aver condiviso questo.',
        'È un ricordo meraviglioso.',
        'Apprezzo che tu ti sia aperto su questo.',
        'Sembra molto significativo.',
        'Grazie per questa riflessione.',
      ],
      fr: [
        'Merci d\'avoir partagé cela.',
        'C\'est un merveilleux souvenir.',
        'J\'apprécie que vous vous ouvriez sur ce sujet.',
        'Cela semble significatif.',
        'Merci pour cette réflexion.',
      ],
      de: [
        'Danke, dass Sie das geteilt haben.',
        'Das ist eine wunderbare Erinnerung.',
        'Ich schätze es, dass Sie sich dazu geöffnet haben.',
        'Das klingt bedeutungsvoll.',
        'Danke für diese Einsicht.',
      ],
    };

    const langAcknowledgments = acknowledgments[language as keyof typeof acknowledgments] || acknowledgments.en;
    const randomIndex = Math.floor(Math.random() * langAcknowledgments.length);
    return langAcknowledgments[randomIndex];
  };

  const handleSendAnswer = useCallback(async () => {
    if (!currentAnswer.trim() || currentQuestionIndex >= prompts.length) return;
    if (!session?.access_token) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: currentAnswer.trim(),
      timestamp: new Date(),
    };

    const currentQuestion = isFollowUp
      ? messages[messages.length - 1]?.content || prompts[currentQuestionIndex].prompt
      : prompts[currentQuestionIndex].prompt;

    if (!isFollowUp) {
      const newAnswers = [...answers, { question: currentQuestion, answer: currentAnswer.trim() }];
      setAnswers(newAnswers);
    } else {
      const updatedAnswers = [...answers];
      if (updatedAnswers.length > 0) {
        updatedAnswers[updatedAnswers.length - 1].answer += '\n\n' + currentAnswer.trim();
      }
      setAnswers(updatedAnswers);
    }

    setMessages((prev) => [...prev, userMessage]);
    setCurrentAnswer('');
    setIsAnalyzing(true);

    try {
      const conversationHistory: ConversationHistory[] = answers.slice(-3);

      const analysis = await analyzeAndRespond(
        session.access_token,
        currentAnswer.trim(),
        currentQuestion,
        conversationHistory,
        language,
        hasHadFollowUp
      );

      setIsAnalyzing(false);

      if (analysis.needsFollowUp && analysis.followUpQuestion && !isFollowUp) {
        setIsFollowUp(true);
        setHasHadFollowUp(true);

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: `${analysis.acknowledgment}\n\n${analysis.followUpQuestion}`,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } else {
        setIsFollowUp(false);
        setHasHadFollowUp(false);

        const nextQuestionIndex = currentQuestionIndex + 1;

        if (nextQuestionIndex < prompts.length) {
          const nextQuestion = prompts[nextQuestionIndex].prompt;

          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: `${analysis.acknowledgment}\n\n${nextQuestion}`,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, aiMessage]);
          setCurrentQuestionIndex(nextQuestionIndex);
        } else {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: analysis.acknowledgment,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
        }
      }

      textareaRef.current?.focus();
    } catch (error) {
      console.error('Failed to analyze answer:', error);
      setIsAnalyzing(false);

      const fallbackAcknowledgment = generateAcknowledgment(currentAnswer);
      const nextQuestionIndex = currentQuestionIndex + 1;

      if (nextQuestionIndex < prompts.length) {
        const nextQuestion = prompts[nextQuestionIndex].prompt;

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: `${fallbackAcknowledgment}\n\n${nextQuestion}`,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
        setCurrentQuestionIndex(nextQuestionIndex);
      } else {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: fallbackAcknowledgment,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      }

      textareaRef.current?.focus();
    }
  }, [currentAnswer, currentQuestionIndex, prompts, answers, language, session, isFollowUp, hasHadFollowUp, messages]);

  const handleSkipQuestion = () => {
    if (isFollowUp) {
      setIsFollowUp(false);
      setHasHadFollowUp(false);

      const nextQuestionIndex = currentQuestionIndex + 1;
      if (nextQuestionIndex >= prompts.length) return;

      const nextQuestion = prompts[nextQuestionIndex].prompt;

      const aiMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: nextQuestion,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setCurrentQuestionIndex(nextQuestionIndex);
      setCurrentAnswer('');
      return;
    }

    if (currentQuestionIndex >= prompts.length - 1) return;

    const nextQuestionIndex = currentQuestionIndex + 1;
    const nextQuestion = prompts[nextQuestionIndex].prompt;

    const aiMessage: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content: nextQuestion,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMessage]);
    setCurrentQuestionIndex(nextQuestionIndex);
    setCurrentAnswer('');
    setIsFollowUp(false);
    setHasHadFollowUp(false);
  };

  const handleFinishSection = async () => {
    if (answers.length < 3) {
      alert(t.conversation.answerMinimum);
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerateDraft(answers);

      const completionMessages = {
        en: t.conversation.draftGenerated + ' ' + t.conversation.switchToEditorToRefine,
        it: t.conversation.draftGenerated + ' ' + t.conversation.switchToEditorToRefine,
        fr: t.conversation.draftGenerated + ' ' + t.conversation.switchToEditorToRefine,
        de: t.conversation.draftGenerated + ' ' + t.conversation.switchToEditorToRefine,
      };

      const completionMessage = completionMessages[language as keyof typeof completionMessages];

      const aiMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: completionMessage,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to generate draft:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAnswer();
    }
  };

  const followUpLabels = {
    en: 'Follow-up question',
    it: 'Domanda di approfondimento',
    fr: 'Question de suivi',
    de: 'Nachfrage',
  };

  const progressText = isFollowUp
    ? followUpLabels[language as keyof typeof followUpLabels] || followUpLabels.en
    : t.conversation.questionOf
        .replace('{current}', String(currentQuestionIndex + 1))
        .replace('{total}', String(prompts.length))
        .replace('{section}', sectionTitle);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border/50 px-4 py-3 bg-card/50">
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToEditor}
            className="gap-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.conversation.backToEditor}
          </Button>
          <span className="text-xs font-medium text-muted-foreground bg-primary/10 px-3 py-1 rounded-full">
            {progressText}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.type === 'ai' && (
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                </div>
              )}
              <Card
                className={cn(
                  'px-4 py-3 max-w-[80%]',
                  message.type === 'ai'
                    ? 'bg-card border-border/50'
                    : 'bg-primary text-primary-foreground border-primary'
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </Card>
              {message.type === 'user' && (
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}
          {(isGenerating || isAnalyzing) && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
              </div>
              <Card className="px-4 py-3 bg-card border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isGenerating ? t.conversation.generatingDraft : (language === 'it' ? 'Sto pensando...' : language === 'fr' ? 'Je réfléchis...' : language === 'de' ? 'Ich denke nach...' : 'Thinking...')}
                </div>
              </Card>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-border/50 bg-card/50 p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.conversation.typeYourAnswer}
                className="min-h-[80px] resize-none"
                disabled={isGenerating || isAnalyzing || currentQuestionIndex >= prompts.length}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setShowVoice(!showVoice)}
                disabled={isGenerating || isAnalyzing}
                className="h-10 w-10"
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                onClick={handleSendAnswer}
                disabled={!currentAnswer.trim() || isGenerating || isAnalyzing || currentQuestionIndex >= prompts.length}
                className="h-10 w-10"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {showVoice && (
            <VoiceRecorder
              onTranscript={setAudioTranscript}
              onClearTranscript={() => setAudioTranscript('')}
              audioTranscript={audioTranscript}
            />
          )}

          <div className="flex items-center gap-2 justify-end">
            {(currentQuestionIndex < prompts.length - 1 || isFollowUp) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkipQuestion}
                disabled={isGenerating || isAnalyzing}
              >
                {t.conversation.skipQuestion}
              </Button>
            )}
            {answers.length >= 3 && !isFollowUp && (
              <Button
                variant="default"
                size="sm"
                onClick={handleFinishSection}
                disabled={isGenerating || isAnalyzing}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t.conversation.generatingDraft}
                  </>
                ) : (
                  t.conversation.finishSection
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
