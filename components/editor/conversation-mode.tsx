'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { User, Send, Mic, Loader as Loader2, ArrowLeft, CircleCheck as CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { getFallbackPrompts } from '@/lib/ai-constants';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import { VoiceRecorder } from './voice-recorder';
import { cn } from '@/lib/utils';
import { analyzeAndRespond, type ConversationHistory } from '@/lib/ai/smart-followup';
import { useAuth } from '@/lib/auth-context';
import {
  saveCheckpoint,
  loadCheckpoint,
  deleteCheckpointByBioSection,
  type ConversationMessage,
} from '@/lib/checkpoint-service';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useParams } from 'next/navigation';
import { Logo } from '@/components/logo';
import { useTheme } from 'next-themes';

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
  const params = useParams();
  const biographyId = params.id as string;

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
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [checkpointData, setCheckpointData] = useState<any>(null);
  const [hasCheckedCheckpoint, setHasCheckedCheckpoint] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const prompts = useMemo(
    () => getFallbackPrompts(language)[sectionKey] || [],
    [language, sectionKey]
  );
  const section = BIOGRAPHY_SECTIONS.find((s) => s.key === sectionKey);
  const sectionTitle = section ? t.sectionTitles[sectionKey as keyof typeof t.sectionTitles] : '';

  useEffect(() => {
    const checkForCheckpoint = async () => {
      if (!session?.user?.id || !biographyId || hasCheckedCheckpoint) return;

      const checkpoint = await loadCheckpoint(session.user.id, biographyId, sectionKey);

      if (checkpoint && checkpoint.conversation_log.length > 0) {
        setCheckpointData(checkpoint);
        setShowResumeDialog(true);
      } else if (prompts.length > 0 && messages.length === 0) {
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

      setHasCheckedCheckpoint(true);
    };

    checkForCheckpoint();
  }, [session, biographyId, sectionKey, prompts, messages.length, hasCheckedCheckpoint]);

  useEffect(() => {
    if (prompts.length > 0 && messages.length === 0 && hasCheckedCheckpoint && !checkpointData) {
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
  }, [prompts, messages.length, hasCheckedCheckpoint, checkpointData]);

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

  const saveCurrentCheckpoint = useCallback(async () => {
    if (!session?.user?.id || !biographyId || messages.length === 0) return;

    const lastQuestion = messages[messages.length - 1]?.type === 'ai'
      ? messages[messages.length - 1]?.content
      : null;

    await saveCheckpoint(
      session.user.id,
      biographyId,
      sectionKey,
      messages as ConversationMessage[],
      currentQuestionIndex,
      lastQuestion,
      answers,
      isFollowUp,
      hasHadFollowUp
    );
  }, [session, biographyId, sectionKey, messages, currentQuestionIndex, answers, isFollowUp, hasHadFollowUp]);

  useEffect(() => {
    if (messages.length > 0 && hasCheckedCheckpoint) {
      autoSaveIntervalRef.current = setInterval(() => {
        saveCurrentCheckpoint();
      }, 120000);

      return () => {
        if (autoSaveIntervalRef.current) {
          clearInterval(autoSaveIntervalRef.current);
        }
      };
    }
  }, [messages.length, hasCheckedCheckpoint, saveCurrentCheckpoint]);

  useEffect(() => {
    return () => {
      if (messages.length > 0) {
        saveCurrentCheckpoint();
      }
    };
  }, [messages.length, saveCurrentCheckpoint]);

  const handleResumeConversation = () => {
    if (!checkpointData) return;

    const restoredMessages = checkpointData.conversation_log.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));

    setMessages(restoredMessages);
    setAnswers(checkpointData.answers || []);
    setCurrentQuestionIndex(checkpointData.questions_completed || 0);
    setIsFollowUp(checkpointData.is_follow_up || false);
    setHasHadFollowUp(checkpointData.has_had_follow_up || false);
    setShowResumeDialog(false);
    setCheckpointData(null);
  };

  const handleStartFresh = async () => {
    if (!session?.user?.id || !biographyId) return;

    await deleteCheckpointByBioSection(session.user.id, biographyId, sectionKey);

    setShowResumeDialog(false);
    setCheckpointData(null);

    const firstQuestion = prompts[0].prompt;
    setMessages([
      {
        id: '1',
        type: 'ai',
        content: firstQuestion,
        timestamp: new Date(),
      },
    ]);
  };

  const generateAcknowledgment = useCallback((_answer: string): string => {
    const acknowledgments = {
      en: [
        'Thank you for sharing these memories.',
        'These are wonderful memories.',
        'I appreciate you opening up about these memories.',
        'These memories sound meaningful.',
        'Thank you for sharing these insights.',
      ],
      it: [
        'Grazie per aver condiviso questi ricordi.',
        'Questi sono ricordi meravigliosi.',
        'Apprezzo che tu ti sia aperto su questi ricordi.',
        'Questi ricordi sembrano molto significativi.',
        'Grazie per queste riflessioni.',
      ],
      fr: [
        'Merci d\'avoir partagé ces souvenirs.',
        'Ce sont de merveilleux souvenirs.',
        'J\'apprécie que vous vous ouvriez sur ces souvenirs.',
        'Ces souvenirs semblent significatifs.',
        'Merci pour ces réflexions.',
      ],
      de: [
        'Danke, dass Sie diese Erinnerungen geteilt haben.',
        'Das sind wunderbare Erinnerungen.',
        'Ich schätze es, dass Sie sich über diese Erinnerungen geöffnet haben.',
        'Diese Erinnerungen klingen bedeutungsvoll.',
        'Danke für diese Einsichten.',
      ],
    };

    const langAcknowledgments = acknowledgments[language as keyof typeof acknowledgments] || acknowledgments.en;
    const randomIndex = Math.floor(Math.random() * langAcknowledgments.length);
    return langAcknowledgments[randomIndex];
  }, [language]);

  const handleSendAnswer = useCallback(async () => {
    if (!currentAnswer.trim() || currentQuestionIndex >= prompts.length) return;
    if (!session) return;

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
          content: analysis.followUpQuestion,
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
            content: nextQuestion,
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

      const nextQuestionIndex = currentQuestionIndex + 1;

      if (nextQuestionIndex < prompts.length) {
        const nextQuestion = prompts[nextQuestionIndex].prompt;

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: nextQuestion,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
        setCurrentQuestionIndex(nextQuestionIndex);
      } else {
        const fallbackAcknowledgment = generateAcknowledgment(currentAnswer);
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
  }, [currentAnswer, currentQuestionIndex, prompts, answers, language, session, isFollowUp, hasHadFollowUp, messages, generateAcknowledgment]);

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

  const handleFinishSection = () => {
    if (answers.length < 3) {
      alert(t.conversation.answerMinimum);
      return;
    }

    setShowReview(true);
  };

  const handleContinueAnswering = () => {
    setShowReview(false);
  };

  const handleApproveAndGenerate = async () => {
    const isDraft1Complete = answers.length >= 8;

    setIsGenerating(true);
    try {
      await onGenerateDraft(answers);

      if (session?.user?.id && biographyId) {
        await deleteCheckpointByBioSection(session.user.id, biographyId, sectionKey);
      }

      setShowReview(false);
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

  if (showReview) {
    return (
      <div className="flex flex-col h-full bg-background overflow-hidden">
        <div className="border-b border-border/50 px-4 py-3 bg-card/50 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {language === 'it' ? 'Rivedi le tue risposte' :
               language === 'fr' ? 'Révisez vos réponses' :
               language === 'de' ? 'Überprüfen Sie Ihre Antworten' :
               'Review Your Answers'}
            </h3>
            <span className={cn(
              "text-sm font-medium px-3 py-1 rounded-full",
              answers.length >= 8
                ? "bg-brand-greenLight/50 text-brand-greenDark dark:bg-brand-greenLight/15 dark:text-brand-greenLight"
                : "bg-[#DDCF88] text-[#121212] dark:bg-[#DDCF88]/20 dark:text-[#DDCF88]"
            )}>
              {answers.length} {language === 'it' ? 'risposte' : language === 'fr' ? 'réponses' : language === 'de' ? 'Antworten' : 'answers'}
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {answers.map((qa, index) => (
              <Card key={index} className="p-4 bg-card border-border/50">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-primary mb-1">
                      {language === 'it' ? 'Domanda' : language === 'fr' ? 'Question' : language === 'de' ? 'Frage' : 'Question'} {index + 1}
                    </p>
                    <p className="text-sm text-muted-foreground">{qa.question}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-primary mb-1">
                      {language === 'it' ? 'Risposta' : language === 'fr' ? 'Réponse' : language === 'de' ? 'Antwort' : 'Answer'}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{qa.answer}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="border-t border-border/50 bg-card/50 p-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-foreground">
                {answers.length >= 8 ? (
                  <>
                    {language === 'it' ? '✓ Ottimo! Hai risposto a ' :
                     language === 'fr' ? '✓ Excellent ! Vous avez répondu à ' :
                     language === 'de' ? '✓ Ausgezeichnet! Sie haben ' :
                     '✓ Great! You\'ve answered '}
                    <strong>{answers.length} {language === 'it' ? 'domande' : language === 'fr' ? 'questions' : language === 'de' ? 'Fragen' : 'questions'}</strong>.
                    {language === 'it' ? ' Clicca su "Approva e Genera Bozza" per creare il tuo testo.' :
                     language === 'fr' ? ' Cliquez sur "Approuver et Générer" pour créer votre texte.' :
                     language === 'de' ? ' Klicken Sie auf "Genehmigen und Erstellen" um Ihren Text zu erstellen.' :
                     ' Click "Approve & Generate Draft" to create your text.'}
                  </>
                ) : (
                  <>
                    {language === 'it' ? 'Hai risposto a ' :
                     language === 'fr' ? 'Vous avez répondu à ' :
                     language === 'de' ? 'Sie haben ' :
                     'You\'ve answered '}
                    <strong>{answers.length} {language === 'it' ? 'domande' : language === 'fr' ? 'questions' : language === 'de' ? 'Fragen' : 'questions'}</strong>.
                    {language === 'it' ? ' Puoi rispondere ad altre domande per una bozza più completa, oppure procedere ora.' :
                     language === 'fr' ? ' Vous pouvez répondre à plus de questions pour un brouillon plus complet, ou continuer maintenant.' :
                     language === 'de' ? ' Sie können weitere Fragen beantworten für einen umfassenderen Entwurf, oder jetzt fortfahren.' :
                     ' You can answer more questions for a more complete draft, or proceed now.'}
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <Button
                variant="outline"
                onClick={handleContinueAnswering}
                disabled={isGenerating}
              >
                {language === 'it' ? 'Continua a Rispondere' :
                 language === 'fr' ? 'Continuer à Répondre' :
                 language === 'de' ? 'Weiter Antworten' :
                 'Continue Answering'}
              </Button>
              <Button
                variant="default"
                onClick={handleApproveAndGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t.conversation.generatingDraft}
                  </>
                ) : (
                  <>
                    {language === 'it' ? 'Approva e Genera Bozza' :
                     language === 'fr' ? 'Approuver et Générer' :
                     language === 'de' ? 'Genehmigen und Erstellen' :
                     'Approve & Generate Draft'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="border-b border-border/50 px-4 py-3 bg-card/50 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToEditor}
            className="gap-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.conversation.backToEditor}
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground bg-primary/10 px-3 py-1 rounded-full w-fit">
            {progressText}
          </span>
          {answers.length > 0 && (
            <span className={cn(
              "text-xs font-medium px-3 py-1 rounded-full w-fit",
              answers.length >= 8
                ? "bg-brand-greenLight/50 text-brand-greenDark dark:bg-brand-greenLight/15 dark:text-brand-greenLight"
                : "bg-[#DDCF88] text-[#121212] dark:bg-[#DDCF88]/20 dark:text-[#DDCF88]"
            )}>
              {answers.length >= 8 ? '✓ ' : ''}{answers.length} {language === 'it' ? 'risposte' : language === 'fr' ? 'réponses' : language === 'de' ? 'Antworten' : 'answers'}
              {answers.length < 8 && ` (${8 - answers.length} ${language === 'it' ? 'per bozza completa' : language === 'fr' ? 'pour brouillon complet' : language === 'de' ? 'für vollständigen Entwurf' : 'for complete draft'})`}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-4 pb-4">
          {messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1;
            const isLastAIMessage = isLastMessage && message.type === 'ai';
            const canSkip = isLastAIMessage && (currentQuestionIndex < prompts.length - 1 || isFollowUp);

            return (
              <div key={message.id} className="space-y-2">
                <div
                  className={cn(
                    'flex gap-3',
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.type === 'ai' && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center p-1">
                        <Logo height={24} />
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
                {canSkip && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 flex-shrink-0" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSkipQuestion}
                      disabled={isGenerating || isAnalyzing}
                      className="text-xs"
                    >
                      {t.conversation.skipQuestion}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          {(isGenerating || isAnalyzing) && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center p-1">
                  <Logo height={24} />
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
      </div>

      <div className="border-t border-border/50 bg-card/50 p-4 shrink-0">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.conversation.typeYourAnswer}
                className="min-h-[120px] resize-none"
                disabled={isGenerating || isAnalyzing || currentQuestionIndex >= prompts.length}
              />
            </div>
            <div className="flex sm:flex-col gap-2 justify-end sm:justify-center">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowVoice(!showVoice)}
                disabled={isGenerating || isAnalyzing}
                className="h-10 w-10 rounded-full bg-[#A84B2F] hover:bg-[#6B2F1F] hover:text-[#FDFBF7] text-[#FDFBF7]"
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
              {answers.length >= 3 && !isFollowUp && (
                <Button
                  size="icon"
                  onClick={handleFinishSection}
                  disabled={isGenerating || isAnalyzing}
                  className="h-10 w-10 text-[#2F4F2F] hover:opacity-90"
                  style={{ backgroundColor: '#C8DFBE' }}
                  title={language === 'it' ? 'Rivedi Risposte' :
                         language === 'fr' ? 'Réviser les Réponses' :
                         language === 'de' ? 'Antworten Überprüfen' :
                         'Review Answers'}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {showVoice && (
            <VoiceRecorder
              onTranscript={setAudioTranscript}
              onClearTranscript={() => setAudioTranscript('')}
              audioTranscript={audioTranscript}
            />
          )}
        </div>
      </div>

      <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'it' ? 'Conversazione in sospeso' : language === 'fr' ? 'Conversation en attente' : language === 'de' ? 'Ausstehende Unterhaltung' : 'Conversation in Progress'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'it'
                ? 'Hai una conversazione in sospeso per questa sezione. Vuoi continuare da dove hai lasciato o ricominciare da capo?'
                : language === 'fr'
                ? 'Vous avez une conversation en attente pour cette section. Voulez-vous continuer là où vous vous êtes arrêté ou recommencer?'
                : language === 'de'
                ? 'Sie haben eine ausstehende Unterhaltung für diesen Abschnitt. Möchten Sie dort fortfahren, wo Sie aufgehört haben, oder von vorne beginnen?'
                : 'You have a conversation in progress for this section. Do you want to continue where you left off or start fresh?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStartFresh}>
              {language === 'it' ? 'Ricomincia da capo' : language === 'fr' ? 'Recommencer' : language === 'de' ? 'Von vorne beginnen' : 'Start Fresh'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleResumeConversation}>
              {language === 'it' ? 'Riprendi' : language === 'fr' ? 'Reprendre' : language === 'de' ? 'Fortsetzen' : 'Resume'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
