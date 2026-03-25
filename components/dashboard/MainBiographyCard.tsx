'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Lock, Users, Globe, Clock, CircleAlert as AlertCircle, Calendar as CalendarIcon, Play, Trophy, Star, PartyPopper, BookOpen, Trash2, StickyNote, SquareCheck as CheckSquare, ChevronRight } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { BIOGRAPHY_SECTIONS, type BiographyContent } from '@/lib/editor-constants';
import { getSectionTitle } from '@/lib/ai/next-section-recommender';
import type { Biography } from '@/lib/biographies';
import { GlobalNotesPanel } from '@/components/editor/GlobalNotesPanel';
import { format, isPast, isToday } from 'date-fns';
import { it, de, fr, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const GLOBAL_SECTION_KEY = '__global__';

interface MainBiographyCardProps {
  biography: Biography | null;
  userName: string;
  userId: string;
  onDeleteClick?: () => void;
  onCreateClick?: () => void;
}

interface GlobalNote {
  id: string;
  content: string;
  created_at: string;
}

interface GlobalTodo {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  is_completed: boolean;
}

interface ConversationCheckpoint {
  id: string;
  biography_id: string;
  section: string;
  questions_completed: number;
  updated_at: string;
}

export function MainBiographyCard({ biography, userName, userId, onDeleteClick, onCreateClick }: MainBiographyCardProps) {
  const { t, language } = useTranslation();
  const router = useRouter();
  const [globalNotes, setGlobalNotes] = useState<GlobalNote[]>([]);
  const [globalTodos, setGlobalTodos] = useState<GlobalTodo[]>([]);
  const [pendingConversation, setPendingConversation] = useState<ConversationCheckpoint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showGlobalNotesPanel, setShowGlobalNotesPanel] = useState(false);
  const [globalNotesCount, setGlobalNotesCount] = useState(0);
  const [globalTodosCount, setGlobalTodosCount] = useState(0);

  const dateLocales = {
    en: enUS,
    it: it,
    fr: fr,
    de: de,
  };

  useEffect(() => {
    const loadData = async () => {
      if (!biography) {
        setIsLoading(false);
        return;
      }

      const [notesResult, todosResult, checkpointResult] = await Promise.all([
        supabase
          .from('section_notes')
          .select('id, content, created_at')
          .eq('biography_id', biography.id)
          .eq('section', GLOBAL_SECTION_KEY)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('section_todos')
          .select('id, description, priority, due_date, is_completed')
          .eq('biography_id', biography.id)
          .eq('section', GLOBAL_SECTION_KEY)
          .eq('is_completed', false)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('conversation_checkpoints')
          .select('*')
          .eq('user_id', userId)
          .eq('biography_id', biography.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (notesResult.data) setGlobalNotes(notesResult.data);
      if (todosResult.data) setGlobalTodos(todosResult.data);
      if (checkpointResult.data) setPendingConversation(checkpointResult.data);

      setIsLoading(false);
    };

    loadData();
  }, [biography, userId]);

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.coach.goodMorning;
    if (hour < 18) return t.coach.goodAfternoon;
    return t.coach.goodEvening;
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'private': return { icon: Lock, text: t.dashboard.private };
      case 'family': return { icon: Users, text: t.dashboard.family };
      case 'public': return { icon: Globe, text: t.dashboard.public };
      default: return { icon: Lock, text: t.dashboard.private };
    }
  };

  const getStatusBadgeConfig = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
      case 'ready_to_publish':
        return {
          text: status === 'completed' ? t.dashboard.completed :
                status === 'approved' ? t.dashboard.statusApproved :
                t.dashboard.statusPublished,
          className: 'bg-[#C8DFBE] text-[#121212]'
        };
      case 'published':
        return { text: t.dashboard.statusPublished, className: 'bg-[#D3F1FF] text-[#121212]' };
      case 'under_review':
        return { text: t.dashboard.statusUnderReview, className: 'bg-[#FFE4C0] text-[#7C3A00]' };
      case 'draft_1':
        return { text: t.dashboard.statusDraft1, className: 'bg-[#FBDEC1] text-[#121212]' };
      case 'draft_2':
        return { text: t.dashboard.statusDraft2, className: 'bg-[#FBDEC1] text-[#121212]' };
      case 'draft_3':
        return { text: t.dashboard.statusDraft3, className: 'bg-[#FBDEC1] text-[#121212]' };
      default:
        return { text: t.dashboard.draft, className: 'bg-[#FBDEC1] text-[#121212]' };
    }
  };

  const calculateProgress = () => {
    if (!biography || !biography.content || typeof biography.content !== 'object') return 0;
    const content = biography.content as BiographyContent;
    const completedSections = Object.values(content).filter(section =>
      section?.text?.trim().length > 500
    ).length;
    return Math.min(Math.round((completedSections / BIOGRAPHY_SECTIONS.length) * 100), 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 67) return '#C8DFBE';
    if (percentage >= 34) return '#D3F1FF';
    return '#FBDEC1';
  };

  const getTotalWords = () => {
    if (!biography || !biography.content || typeof biography.content !== 'object') return 0;
    const content = biography.content as BiographyContent;
    return Object.values(content).reduce((sum, section) => {
      const words = section?.text?.trim().split(/\s+/).filter(w => w.length > 0).length || 0;
      return sum + words;
    }, 0);
  };

  const getMilestones = () => {
    const totalWords = getTotalWords();
    const progress = calculateProgress();
    const milestones = [];
    if (totalWords >= 100) milestones.push({ icon: PartyPopper, label: t.coach.firstHundredWords });
    if (progress >= 25) milestones.push({ icon: Star, label: t.coach.firstSectionComplete });
    if (progress >= 100) milestones.push({ icon: Trophy, label: t.coach.biographyComplete });
    return milestones;
  };

  const getSmartSuggestion = () => {
    if (!biography) return { message: t.coach.readyToStart, type: 'new-user' as const };

    const totalWords = getTotalWords();
    if (totalWords === 0) return { message: t.coach.readyToStart, type: 'new-user' as const };

    if (pendingConversation && !isLoading) {
      const sectionTitle = getSectionTitle(pendingConversation.section, language);
      return {
        message: (t.coach.conversationPending || 'You have a conversation in progress on {section}. Continue?').replace('{section}', sectionTitle),
        type: 'pending-conversation' as const,
        section: pendingConversation.section,
      };
    }

    if (biography.content) {
      const content = biography.content as BiographyContent;
      const sections = Object.entries(content);
      for (const [key, section] of sections) {
        const wordCount = section?.text?.trim().split(/\s+/).filter(w => w.length > 0).length || 0;
        if (wordCount >= 250 && wordCount < 500) {
          const sectionTitle = getSectionTitle(key, language);
          return {
            message: (t.coach.almostDone || 'You\'re almost done with {section}! Want to finish it?').replace('{section}', sectionTitle),
            type: 'almost-done' as const,
            section: key,
          };
        }
      }
    }

    return { message: t.coach.continueWriting, type: 'continue' as const };
  };

  const isDueDateOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
  };

  const getPriorityBadgeClass = (priority: string) => {
    const map: Record<string, string> = {
      low: 'bg-muted text-muted-foreground',
      medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return map[priority] || map.medium;
  };

  const handleContinue = (section?: string) => {
    if (!biography) return;
    router.push(section ? `/biography/${biography.id}/edit?section=${section}` : `/biography/${biography.id}/edit`);
  };

  const greeting = getTimeBasedGreeting();
  const progress = calculateProgress();
  const milestones = getMilestones();
  const suggestion = getSmartSuggestion();
  const hasNotesOrTodos = globalNotes.length > 0 || globalTodos.length > 0;
  const totalCount = globalNotesCount + globalTodosCount;

  if (!biography) {
    return (
      <div className="p-6 sm:p-8 text-center bg-transparent rounded-2xl">
        <div className="flex justify-center mb-6">
          <Logo height={100} />
        </div>
        <h3 className="text-2xl sm:text-3xl font-medium mb-2">{t.dashboard.noBiographies}</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
          {t.dashboard.noBiographiesSubtitle}
        </p>
        {onCreateClick && (
          <Button
            onClick={onCreateClick}
            className="gap-2 min-h-[44px] px-6 bg-[#121212] hover:bg-[#121212]/90 text-[#FDFBF7]"
          >
            <BookOpen className="h-5 w-5" />
            <span>{t.dashboard.createBiography}</span>
          </Button>
        )}
      </div>
    );
  }

  const privacyInfo = getPrivacyIcon(biography.privacy);
  const PrivacyIcon = privacyInfo.icon;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-transparent rounded-2xl">
      <div className="flex flex-col items-center mb-6 sm:mb-8">
        <div className="mb-3 sm:mb-4">
          <div className="hidden sm:block"><Logo height={100} /></div>
          <div className="block sm:hidden"><Logo height={70} /></div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-center">
          {greeting}, {userName}!
        </h1>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-start gap-2 mb-3">
            <BookOpen className="h-5 w-5 shrink-0 mt-0.5" />
            <h2 className="text-lg font-semibold break-words line-clamp-4">
              {biography.title || t.dashboard.untitledBiography}
            </h2>
          </div>

          <div className="space-y-3 pl-4 sm:pl-7">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-20 sm:w-24 shrink-0">{t.dashboard.status}:</span>
                <Badge className={getStatusBadgeConfig(biography.status).className}>
                  {getStatusBadgeConfig(biography.status).text}
                </Badge>
              </div>
              {biography.status === 'under_review' && (
                <p className="text-xs text-orange-600/80 dark:text-orange-400/80 leading-relaxed pl-[calc(5rem+0.5rem)] sm:pl-[calc(6rem+0.5rem)]">
                  {t.dashboard.underReviewMessage}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-20 sm:w-24 shrink-0">{t.dashboard.visibility}:</span>
              <div className="flex items-center gap-1.5">
                <PrivacyIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{privacyInfo.text}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t.dashboard.progress}:</span>
                <span className="text-sm font-semibold text-foreground">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-[#E5E1DA] dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300 ease-in-out"
                  style={{ width: `${progress}%`, backgroundColor: getProgressColor(progress) }}
                />
              </div>
            </div>

            {biography.updated_at && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-text-secondary dark:text-dark-text-secondary">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {t.dashboard.lastUpdated}: {format(new Date(biography.updated_at), 'd MMM yyyy, HH:mm', { locale: dateLocales[language] })}
                  </span>
                </div>
                {onDeleteClick && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={onDeleteClick}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          aria-label={t.deleteDialog.deleteBiographyLink}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t.deleteDialog.deleteBiographyLink}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}

            {milestones.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-2">
                {milestones.map((milestone, index) => (
                  <Badge key={index} className="gap-1.5 py-1 bg-[#C8DFBE] text-[#121212]">
                    <milestone.icon className="h-3.5 w-3.5" />
                    <span className="text-xs">{milestone.label}</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="h-5 w-5 shrink-0" />
            <h2 className="text-lg font-semibold">{t.notesAndTodos.notesAndTodosMenuItem}</h2>
            {totalCount > 0 && (
              <Badge className="ml-auto bg-[#C8DFBE] text-[#121212] hover:bg-[#C8DFBE]">
                {totalCount}
              </Badge>
            )}
          </div>

          <div className="space-y-2 pl-4 sm:pl-7">
            {globalNotes.length > 0 && (
              <Card className="p-3 border-0 bg-[#F8F6F2] dark:bg-white/5">
                <div className="flex items-start gap-2">
                  <StickyNote className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                  <p className="text-sm line-clamp-2 flex-1">{globalNotes[0].content}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 pl-6">
                  {format(new Date(globalNotes[0].created_at), 'd MMM yyyy', { locale: dateLocales[language] })}
                </p>
              </Card>
            )}

            {globalTodos.length > 0 && (
              <Card className={cn(
                'p-3 border-0 bg-[#F8F6F2] dark:bg-white/5',
                isDueDateOverdue(globalTodos[0].due_date) && 'border border-red-300 bg-red-50/50 dark:bg-red-950/20'
              )}>
                <div className="flex items-start gap-2">
                  <CheckSquare className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 space-y-1.5">
                    <p className="text-sm line-clamp-2">{globalTodos[0].description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn('text-xs border-0', getPriorityBadgeClass(globalTodos[0].priority))}>
                        {globalTodos[0].priority === 'low' && t.notesAndTodos.priorityLow}
                        {globalTodos[0].priority === 'medium' && t.notesAndTodos.priorityMedium}
                        {globalTodos[0].priority === 'high' && t.notesAndTodos.priorityHigh}
                      </Badge>
                      {globalTodos[0].due_date && (
                        <Badge variant="outline" className={cn(
                          'gap-1 text-xs',
                          isDueDateOverdue(globalTodos[0].due_date) && 'border-red-500 text-red-700'
                        )}>
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(globalTodos[0].due_date), 'd MMM', { locale: dateLocales[language] })}
                          {isDueDateOverdue(globalTodos[0].due_date) && <AlertCircle className="h-3 w-3" />}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {!hasNotesOrTodos && !isLoading && (
              <p className="text-sm text-muted-foreground pl-0">
                {t.notesAndTodos.noNotes}
              </p>
            )}

            <Button
              variant="outline"
              className="w-full mt-1 min-h-[44px] gap-2"
              onClick={() => setShowGlobalNotesPanel(true)}
            >
              <StickyNote className="h-4 w-4" />
              {t.notesAndTodos.globalTitle}
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <div className="rounded-lg p-4 sm:p-5 border-0 bg-[#F8F6F2] dark:bg-white/5">
            <p className="text-sm mb-4 text-center sm:text-left">
              {suggestion.message}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => router.push(`/biography/${biography.id}/edit`)}
                variant="outline"
                className="gap-2 flex-1 w-full sm:w-auto min-h-[44px]"
              >
                <BookOpen className="h-4 w-4" />
                <span className="truncate">{t.dashboard.goToWorkspace}</span>
              </Button>
              <Button
                onClick={() => handleContinue(suggestion.type === 'pending-conversation' || suggestion.type === 'almost-done' ? (suggestion as { section?: string }).section : undefined)}
                className="gap-2 flex-1 w-full sm:w-auto min-h-[44px]"
              >
                <Play className="h-4 w-4" />
                <span className="truncate">{t.dashboard.continueLastSection}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {biography && (
        <GlobalNotesPanel
          biographyId={biography.id}
          open={showGlobalNotesPanel}
          onOpenChange={setShowGlobalNotesPanel}
          onCountsChange={(notes, todos) => {
            setGlobalNotesCount(notes);
            setGlobalTodosCount(todos);
          }}
        />
      )}
    </div>
  );
}
