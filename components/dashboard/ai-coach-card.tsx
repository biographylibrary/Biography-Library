'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Play,
  Plus,
  Clock,
  Trophy,
  Star,
  PartyPopper
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { BIOGRAPHY_SECTIONS, type BiographyContent } from '@/lib/editor-constants';
import { getSectionTitle } from '@/lib/ai/next-section-recommender';
import type { Biography } from '@/lib/biographies';

interface AICoachCardProps {
  biographies: Biography[];
  userName: string;
  userId: string;
}

interface ConversationCheckpoint {
  id: string;
  biography_id: string;
  section: string;
  questions_completed: number;
  updated_at: string;
}

export function AICoachCard({ biographies, userName, userId }: AICoachCardProps) {
  const { t, language } = useTranslation();
  const router = useRouter();
  const [pendingConversation, setPendingConversation] = useState<ConversationCheckpoint | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPendingConversation = async () => {
      if (biographies.length === 0) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('conversation_checkpoints')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setPendingConversation(data);
      }
      setIsLoading(false);
    };

    loadPendingConversation();
  }, [userId, biographies.length]);

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.coach.goodMorning;
    if (hour < 18) return t.coach.goodAfternoon;
    return t.coach.goodEvening;
  };

  const getTotalWords = () => {
    return biographies.reduce((total, bio) => {
      if (!bio.content || typeof bio.content !== 'object') return total;
      const content = bio.content as BiographyContent;
      return total + Object.values(content).reduce((sum, section) => {
        const words = section?.text?.trim().split(/\s+/).filter(w => w.length > 0).length || 0;
        return sum + words;
      }, 0);
    }, 0);
  };

  const getSectionCount = () => {
    return biographies.reduce((total, bio) => {
      if (!bio.content || typeof bio.content !== 'object') return total;
      const content = bio.content as BiographyContent;
      return total + Object.values(content).filter(section =>
        section?.text?.trim().length > 100
      ).length;
    }, 0);
  };

  const getCompletedSectionCount = () => {
    return biographies.reduce((total, bio) => {
      if (!bio.content || typeof bio.content !== 'object') return total;
      const content = bio.content as BiographyContent;
      return total + Object.values(content).filter(section =>
        section?.text?.trim().length > 500
      ).length;
    }, 0);
  };

  const getProgressPercentage = () => {
    const totalSections = biographies.length * BIOGRAPHY_SECTIONS.length;
    if (totalSections === 0) return 0;
    const completed = getCompletedSectionCount();
    return Math.min(Math.round((completed / totalSections) * 100), 100);
  };

  const getLastActiveDate = () => {
    if (biographies.length === 0) return null;
    const dates = biographies
      .map(b => new Date(b.updated_at))
      .sort((a, b) => b.getTime() - a.getTime());
    return dates[0];
  };

  const formatLastActivity = (date: Date) => {
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t.coach.today;
    if (diffDays === 1) return t.coach.yesterday;
    return (t.coach.daysAgo || '{count} days ago').replace('{count}', String(diffDays));
  };

  const getMilestones = () => {
    const totalWords = getTotalWords();
    const completedSections = getCompletedSectionCount();
    const completedBios = biographies.filter(b => b.status === 'completed').length;

    const milestones = [];
    if (totalWords >= 100) {
      milestones.push({ icon: PartyPopper, label: t.coach.firstHundredWords, color: 'text-blue-500' });
    }
    if (completedSections >= 1) {
      milestones.push({ icon: Star, label: t.coach.firstSectionComplete, color: 'text-yellow-500' });
    }
    if (completedBios >= 1) {
      milestones.push({ icon: Trophy, label: t.coach.biographyComplete, color: 'text-green-500' });
    }
    return milestones;
  };

  const getSmartSuggestion = () => {
    const totalWords = getTotalWords();
    const lastActiveDate = getLastActiveDate();

    if (biographies.length === 0 || totalWords === 0) {
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
        biographyId: pendingConversation.biography_id,
        section: pendingConversation.section,
      };
    }

    if (lastActiveDate) {
      const daysSince = Math.floor((new Date().getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 7) {
        return {
          message: t.coach.readyWhenYouAre,
          type: 'inactive' as const,
        };
      }
    }

    const mostRecentBio = biographies.sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0];

    if (mostRecentBio?.content) {
      const content = mostRecentBio.content as BiographyContent;
      const sections = Object.entries(content);

      for (const [key, section] of sections) {
        const wordCount = section?.text?.trim().split(/\s+/).filter(w => w.length > 0).length || 0;
        if (wordCount >= 250 && wordCount < 500) {
          const sectionTitle = getSectionTitle(key, language);
          return {
            message: (t.coach.almostDone || 'You\'re almost done with {section}! Want to finish it?').replace('{section}', sectionTitle),
            type: 'almost-done' as const,
            biographyId: mostRecentBio.id,
            section: key,
          };
        }
      }
    }

    return {
      message: t.coach.continueWriting,
      type: 'continue' as const,
      biographyId: mostRecentBio?.id,
    };
  };

  const handleContinue = () => {
    const suggestion = getSmartSuggestion();
    if (suggestion.biographyId) {
      router.push(`/biography/${suggestion.biographyId}/edit`);
    }
  };

  const handleQuickSession = () => {
    const mostRecentBio = biographies.sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0];

    if (mostRecentBio) {
      router.push(`/biography/${mostRecentBio.id}/edit`);
    }
  };

  const totalWords = getTotalWords();
  const sectionCount = getSectionCount();
  const progress = getProgressPercentage();
  const lastActiveDate = getLastActiveDate();
  const milestones = getMilestones();
  const suggestion = getSmartSuggestion();

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex-shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {getTimeBasedGreeting()}, {userName}!
          </h3>
          {totalWords > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {totalWords} {t.coach.wordsWritten}
              </span>
              <span className="text-gray-400">•</span>
              <span>
                {(t.coach.inSections || 'in {count} sections').replace('{count}', String(sectionCount))}
              </span>
            </div>
          )}
        </div>
      </div>

      {biographies.length > 0 && totalWords > 0 && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {progress}% {t.coach.progressComplete}
            </span>
            {lastActiveDate && (
              <span className="text-gray-500 dark:text-gray-500 text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t.coach.lastActivity}: {formatLastActivity(lastActiveDate)}
              </span>
            )}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {milestones.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {milestones.map((milestone, index) => (
            <Badge key={index} variant="secondary" className="gap-1.5 py-1">
              <milestone.icon className={`h-3.5 w-3.5 ${milestone.color}`} />
              <span className="text-xs">{milestone.label}</span>
            </Badge>
          ))}
        </div>
      )}

      <div className="bg-white/60 dark:bg-gray-900/40 rounded-lg p-4 mb-4">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          {suggestion.message}
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestion.type === 'pending-conversation' && suggestion.biographyId && (
            <Button
              onClick={() => router.push(`/biography/${suggestion.biographyId}/edit`)}
              size="sm"
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Play className="h-3.5 w-3.5" />
              {t.coach.continueConversation}
            </Button>
          )}
          {(suggestion.type === 'continue' || suggestion.type === 'almost-done') && suggestion.biographyId && (
            <Button
              onClick={handleContinue}
              size="sm"
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Play className="h-3.5 w-3.5" />
              {t.coach.continueWriting}
            </Button>
          )}
          {suggestion.type === 'inactive' && biographies.length > 0 && (
            <Button
              onClick={handleContinue}
              size="sm"
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Play className="h-3.5 w-3.5" />
              {t.coach.continueWriting}
            </Button>
          )}
          {biographies.length > 0 && (
            <Button
              onClick={handleQuickSession}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Clock className="h-3.5 w-3.5" />
              {t.coach.quickSession}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
