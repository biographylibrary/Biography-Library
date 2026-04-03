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
  sky: 'bg-[#C4DAEB] text-[#121212] dark:bg-[#C4DAEB]/20 dark:text-[#C4DAEB]',
  emerald: 'bg-[#C8DFBE] text-[#121212] dark:bg-[#C8DFBE]/20 dark:text-[#C8DFBE]',
  amber: 'bg-[#DDCF88] dark:bg-[#DDCF88]/20 text-[#121212] dark:text-[#DDCF88]',
  red: 'bg-[#6D323E] text-white dark:bg-[#6D323E] dark:text-white',
  neutral: 'bg-brand-beigeBg dark:bg-brand-ink/40 text-brand-greenDark dark:text-brand-beigeLight/80',
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
