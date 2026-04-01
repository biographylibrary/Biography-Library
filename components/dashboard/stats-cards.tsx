'use client';

import { BookOpen, FileText, CircleCheck as CheckCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import type { Biography } from '@/lib/biographies';

interface StatsCardsProps {
  biographies: Biography[];
}

export function StatsCards({ biographies }: StatsCardsProps) {
  const { t } = useTranslation();

  const stats = [
    {
      label: t.dashboard.totalBiographies,
      value: biographies.length,
      icon: BookOpen,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: t.dashboard.drafts,
      value: biographies.filter((b) => b.status !== 'sections_complete').length,
      icon: FileText,
      color: 'text-text-primary dark:text-dark-text-primary',
      bg: 'bg-status-warning',
    },
    {
      label: t.dashboard.sectionsComplete,
      value: biographies.filter((b) => b.status === 'sections_complete').length,
      icon: CheckCircle,
      color: 'text-text-primary dark:text-dark-text-primary',
      bg: 'bg-status-success',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4"
          >
            <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${stat.bg}`}>
              <Icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
