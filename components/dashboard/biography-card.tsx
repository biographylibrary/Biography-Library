'use client';

import { BookOpen, Lock, Users, Globe, Trash2, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';
import type { Biography } from '@/lib/biographies';

interface BiographyCardProps {
  biography: Biography;
  onEdit: (id: string) => void;
  onDelete: (biography: Biography) => void;
}

export function BiographyCard({ biography, onEdit, onDelete }: BiographyCardProps) {
  const { t } = useTranslation();

  const privacyConfig = {
    private: { icon: Lock, label: t.dashboard.private, className: 'text-slate-500 bg-slate-500/10' },
    family: { icon: Users, label: t.dashboard.family, className: 'text-blue-500 bg-blue-500/10' },
    public: { icon: Globe, label: t.dashboard.public, className: 'text-emerald-500 bg-emerald-500/10' },
  };

  const statusConfig = {
    draft: { label: t.dashboard.draft, className: 'text-amber-600 bg-amber-500/10' },
    completed: { label: t.dashboard.completed, className: 'text-emerald-600 bg-emerald-500/10' },
  };

  const privacy = privacyConfig[biography.privacy] || privacyConfig.private;
  const status = statusConfig[biography.status || 'draft'] || statusConfig.draft;
  const PrivacyIcon = privacy.icon;

  const date = new Date(biography.updated_at || biography.created_at);
  const formattedDate = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="group relative rounded-xl border border-border/50 bg-card hover:bg-card/80 hover:border-border transition-all duration-200 hover:shadow-md">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <h3 className="font-medium text-sm truncate max-w-[180px]">
              {biography.title || t.biography.untitled}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 -mr-2 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(biography);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          {t.biography.updated} {formattedDate}
        </p>

        <div className="flex items-center gap-2 mb-4">
          <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', privacy.className)}>
            <PrivacyIcon className="h-3 w-3" />
            {privacy.label}
          </span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', status.className)}>
            {status.label}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={() => onEdit(biography.id)}
        >
          <PenLine className="h-3.5 w-3.5" />
          {t.biography.continueWriting}
        </Button>
      </div>
    </div>
  );
}
