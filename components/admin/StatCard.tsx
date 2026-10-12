'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  secondary?: string;
  accent?: 'sky' | 'emerald' | 'amber' | 'red' | 'neutral';
}

const accentMap = {
  sky: 'tone-info',
  emerald: 'tone-success',
  amber: 'tone-warning',
  red: 'tone-danger',
  neutral: 'bg-brand-beigeBg dark:bg-brand-ink/40 text-brand-ink dark:text-brand-beigeLight/80',
};

export function StatCard({ icon, label, value, secondary, accent = 'sky' }: StatCardProps) {
  return (
    <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={cn('p-2.5 rounded-xl shrink-0', accentMap[accent])}>
            {icon}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-3xl text-foreground tabular-nums tracking-tight">
            {value === null ? '—' : value.toLocaleString()}
          </p>
          <p className="text-sm text-foreground mt-1">{label}</p>
          {secondary && (
            <p className="text-xs text-muted-foreground mt-1">{secondary}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
