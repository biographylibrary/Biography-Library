'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UsageData {
  daily_count: number;
  weekly_count: number;
}

const DAILY_LIMIT = 40;
const WEEKLY_LIMIT = 150;

interface AiUsageIndicatorProps {
  refreshTrigger?: number;
}

export function AiUsageIndicator({ refreshTrigger }: AiUsageIndicatorProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchUsage = async () => {
      const { data, error } = await supabase
        .rpc('get_ai_usage', { p_user_id: user.id });

      if (!error && data && data.length > 0) {
        setUsage({
          daily_count: data[0].daily_count,
          weekly_count: data[0].weekly_count,
        });
      }
    };

    fetchUsage();
  }, [user, refreshTrigger]);

  if (!usage) return null;

  const dailyPct = Math.min((usage.daily_count / DAILY_LIMIT) * 100, 100);
  const weeklyPct = Math.min((usage.weekly_count / WEEKLY_LIMIT) * 100, 100);

  const dailyWarning = dailyPct >= 80;
  const weeklyWarning = weeklyPct >= 80;
  const dailyCritical = dailyPct >= 100;
  const weeklyCritical = weeklyPct >= 100;

  return (
    <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors cursor-default select-none">
          <Sparkles className={cn(
            'h-3.5 w-3.5 shrink-0',
            (dailyCritical || weeklyCritical) ? 'text-destructive' :
            (dailyWarning || weeklyWarning) ? 'text-amber-500' :
            'text-muted-foreground'
          )} />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn(
              'font-medium tabular-nums',
              dailyCritical ? 'text-destructive' :
              dailyWarning ? 'text-amber-500' : ''
            )}>
              {usage.daily_count}/{DAILY_LIMIT}
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span className={cn(
              'font-medium tabular-nums',
              weeklyCritical ? 'text-destructive' :
              weeklyWarning ? 'text-amber-500' : ''
            )}>
              {usage.weekly_count}/{WEEKLY_LIMIT}
            </span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[200px]">
        <p className="font-medium text-xs mb-1.5">{t.aiUsage.usageIndicatorTitle}</p>
        <div className="space-y-1.5">
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-muted-foreground">{t.aiUsage.today}</span>
              <span className={cn(dailyCritical ? 'text-destructive' : dailyWarning ? 'text-amber-500' : '')}>
                {usage.daily_count}/{DAILY_LIMIT}
              </span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  dailyCritical ? 'bg-destructive' :
                  dailyWarning ? 'bg-amber-500' :
                  'bg-primary'
                )}
                style={{ width: `${dailyPct}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-muted-foreground">{t.aiUsage.thisWeek}</span>
              <span className={cn(weeklyCritical ? 'text-destructive' : weeklyWarning ? 'text-amber-500' : '')}>
                {usage.weekly_count}/{WEEKLY_LIMIT}
              </span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  weeklyCritical ? 'bg-destructive' :
                  weeklyWarning ? 'bg-amber-500' :
                  'bg-primary'
                )}
                style={{ width: `${weeklyPct}%` }}
              />
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
    </TooltipProvider>
  );
}
