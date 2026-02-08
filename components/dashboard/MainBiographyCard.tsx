'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sun,
  Sunset,
  Moon,
  Lock,
  Users,
  Globe,
  Clock,
  CheckSquare,
  AlertCircle,
  Calendar as CalendarIcon,
  ArrowRight,
  Play,
  Trophy,
  Star,
  PartyPopper,
  BookOpen,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { BIOGRAPHY_SECTIONS, type BiographyContent } from '@/lib/editor-constants';
import { getSectionTitle } from '@/lib/ai/next-section-recommender';
import type { Biography } from '@/lib/biographies';
import { format, isPast, isToday } from 'date-fns';
import { it, de, fr, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MainBiographyCardProps {
  biography: Biography | null;
  userName: string;
  userId: string;
}

interface PendingTodo {
  id: string;
  biography_id: string;
  section: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
}

interface ConversationCheckpoint {
  id: string;
  biography_id: string;
  section: string;
  questions_completed: number;
  updated_at: string;
}

export function MainBiographyCard({ biography, userName, userId }: MainBiographyCardProps) {
  const { t, language } = useTranslation();
  const router = useRouter();
  const [todos, setTodos] = useState<PendingTodo[]>([]);
  const [pendingConversation, setPendingConversation] = useState<ConversationCheckpoint | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

      const [todosResult, checkpointResult] = await Promise.all([
        supabase
          .from('section_todos')
          .select('id, biography_id, section, description, priority, due_date')
          .eq('biography_id', biography.id)
          .eq('is_completed', false)
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(3),
        supabase
          .from('conversation_checkpoints')
          .select('*')
          .eq('user_id', userId)
          .eq('biography_id', biography.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (todosResult.data) {
        setTodos(todosResult.data);
      }

      if (checkpointResult.data) {
        setPendingConversation(checkpointResult.data);
      }

      setIsLoading(false);
    };

    loadData();
  }, [biography, userId]);

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: t.coach.goodMorning, icon: Sun };
    if (hour < 18) return { text: t.coach.goodAfternoon, icon: Sunset };
    return { text: t.coach.goodEvening, icon: Moon };
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'private':
        return { icon: Lock, text: t.dashboard.private };
      case 'family':
        return { icon: Users, text: t.dashboard.family };
      case 'public':
        return { icon: Globe, text: t.dashboard.public };
      default:
        return { icon: Lock, text: t.dashboard.private };
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
        return {
          text: t.dashboard.statusPublished,
          className: 'bg-[#D3F1FF] text-[#121212]'
        };
      case 'draft_1':
        return {
          text: t.dashboard.statusDraft1,
          className: 'bg-[#FBDEC1] text-[#121212]'
        };
      case 'draft_2':
        return {
          text: t.dashboard.statusDraft2,
          className: 'bg-[#FBDEC1] text-[#121212]'
        };
      case 'draft_3':
        return {
          text: t.dashboard.statusDraft3,
          className: 'bg-[#FBDEC1] text-[#121212]'
        };
      case 'in_progress':
        return {
          text: t.dashboard.draft,
          className: 'bg-[#FBDEC1] text-[#121212]'
        };
      default:
        return {
          text: t.dashboard.draft,
          className: 'bg-[#FBDEC1] text-[#121212]'
        };
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
    if (totalWords >= 100) {
      milestones.push({ icon: PartyPopper, label: t.coach.firstHundredWords });
    }
    if (progress >= 25) {
      milestones.push({ icon: Star, label: t.coach.firstSectionComplete });
    }
    if (progress >= 100) {
      milestones.push({ icon: Trophy, label: t.coach.biographyComplete });
    }
    return milestones;
  };

  const getSmartSuggestion = () => {
    if (!biography) {
      return {
        message: t.coach.readyToStart,
        type: 'new-user' as const,
      };
    }

    const totalWords = getTotalWords();

    if (totalWords === 0) {
      return {
        message: t.coach.readyToStart,
        type: 'new-user' as const,
      };
    }

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

    return {
      message: t.coach.continueWriting,
      type: 'continue' as const,
    };
  };

  const isDueDateOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
  };

  const handleContinue = (section?: string) => {
    if (!biography) return;
    const url = section
      ? `/biography/${biography.id}/edit?section=${section}`
      : `/biography/${biography.id}/edit`;
    router.push(url);
  };

  const handleTodoClick = (section: string) => {
    if (!biography) return;
    router.push(`/biography/${biography.id}/edit?section=${section}`);
  };

  const greeting = getTimeBasedGreeting();
  const GreetingIcon = greeting.icon;
  const progress = calculateProgress();
  const milestones = getMilestones();
  const suggestion = getSmartSuggestion();
  const overdueTodos = todos.filter(t => isDueDateOverdue(t.due_date));

  if (!biography) {
    return (
      <div className="p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h3 className="text-lg font-medium mb-2">{t.dashboard.noBiographies}</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {t.dashboard.noBiographiesSubtitle}
        </p>
      </div>
    );
  }

  const privacyInfo = getPrivacyIcon(biography.privacy);
  const PrivacyIcon = privacyInfo.icon;

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <GreetingIcon className="h-6 w-6 text-text-primary dark:text-dark-text-primary" />
        <h1 className="text-3xl font-bold">
          {greeting.text}, {userName}!
        </h1>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-5 w-5" />
            <h2 className="text-lg font-semibold">
              {biography.title || t.dashboard.untitledBiography}
            </h2>
          </div>

          <div className="space-y-3 pl-7">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-24">{t.dashboard.status}:</span>
              <Badge className={getStatusBadgeConfig(biography.status).className}>
                {getStatusBadgeConfig(biography.status).text}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-24">{t.dashboard.visibility}:</span>
              <div className="flex items-center gap-1.5">
                <PrivacyIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{privacyInfo.text}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t.dashboard.progress}:</span>
                <span className="text-sm font-semibold text-foreground">
                  {progress}%
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300 ease-in-out"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: getProgressColor(progress)
                  }}
                />
              </div>
            </div>

            {biography.updated_at && (
              <div className="flex items-center gap-2 text-xs text-text-secondary dark:text-dark-text-secondary">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {t.dashboard.lastUpdated}: {format(new Date(biography.updated_at), 'd MMM yyyy, HH:mm', { locale: dateLocales[language] })}
                </span>
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

        {todos.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckSquare className="h-5 w-5 text-text-primary dark:text-dark-text-primary" />
                <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
                  {t.coach.pendingReminders}
                </h2>
                <Badge variant="secondary" className="ml-auto">
                  {todos.length}
                </Badge>
                {overdueTodos.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {overdueTodos.length}
                  </Badge>
                )}
              </div>

              <div className="space-y-2 pl-7">
                {todos.map((todo) => {
                  const isOverdue = isDueDateOverdue(todo.due_date);
                  const sectionTitle = getSectionTitle(todo.section, language);

                  return (
                    <Card
                      key={todo.id}
                      className={cn(
                        'p-3 cursor-pointer hover:bg-muted/50 transition-colors',
                        isOverdue && 'border-error bg-error/10'
                      )}
                      onClick={() => handleTodoClick(todo.section)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium line-clamp-1">
                            {todo.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{sectionTitle}</span>
                            {todo.due_date && (
                              <>
                                <span>•</span>
                                <span className={cn(isOverdue && 'text-error font-medium')}>
                                  {format(new Date(todo.due_date), 'd MMM', { locale: dateLocales[language] })}
                                  {isOverdue && ' ⚠️'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTodoClick(todo.section);
                          }}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}

                {todos.length >= 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => handleContinue()}
                  >
                    {t.coach.viewAllReminders}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        <Separator />

        <div>
          <div className="rounded-lg p-4 border bg-card">
            <p className="text-sm mb-4">
              {suggestion.message}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => router.push(`/biography/${biography.id}/edit`)}
                size="sm"
                variant="outline"
                className="gap-2 flex-1"
              >
                <BookOpen className="h-3.5 w-3.5" />
                {t.dashboard.goToWorkspace}
              </Button>
              <Button
                onClick={() => handleContinue(suggestion.type === 'pending-conversation' || suggestion.type === 'almost-done' ? suggestion.section : undefined)}
                size="sm"
                className="gap-2 flex-1"
              >
                <Play className="h-3.5 w-3.5" />
                {t.dashboard.continueLastSection}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
