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
  sky: 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400',
  emerald: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-[#EDE4B9] dark:bg-[#EDE4B9]/20 text-[#121212] dark:text-[#EDE4B9]',
  red: 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400',
  neutral: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
};

export function StatCard({ icon, label, value, secondary, accent = 'sky' }: StatCardProps) {
  return (
    <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={cn('p-2.5 rounded-xl shrink-0', accentMap[accent])}>
            {icon}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold text-foreground tabular-nums tracking-tight">
            {value === null ? '—' : value.toLocaleString()}
          </p>
          <p className="text-sm font-medium text-foreground mt-1">{label}</p>
          {secondary && (
            <p className="text-xs text-muted-foreground mt-1">{secondary}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
