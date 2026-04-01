'use client';

import { BookOpen, Lock, Users, Globe, Trash2, PenLine, Clock } from 'lucide-react';
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

  const privacyConfig: Record<string, { icon: typeof Lock; label: string; className: string }> = {
    private: { icon: Lock, label: t.dashboard.private, className: 'text-slate-500 bg-slate-500/10' },
    'link-only': { icon: Users, label: t.dashboard.family, className: 'text-blue-500 bg-blue-500/10' },
    public: { icon: Globe, label: t.dashboard.public, className: 'text-emerald-500 bg-emerald-500/10' },
  };

  const statusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: t.dashboard.draft, className: 'text-[#121212] bg-[#DDCF88] dark:bg-[#DDCF88]/20 dark:text-[#DDCF88]' },
    sections_complete: { label: t.dashboard.sectionsComplete, className: 'text-blue-600 bg-blue-500/10' },
    final_version: { label: t.dashboard.finalVersion, className: 'text-sky-600 bg-sky-500/10' },
    under_review: { label: t.dashboard.statusUnderReview, className: 'text-[#121212] bg-[#DDCF88] dark:bg-[#DDCF88]/20 dark:text-[#DDCF88]' },
    published: { label: t.dashboard.statusPublished, className: 'text-green-600 bg-green-500/10' },
    removed: { label: t.dashboard.statusRemoved, className: 'text-white bg-red-700' },
  };

  const isUnderReview = biography.status === 'under_review';
  const privacy = privacyConfig[biography.visibility] || privacyConfig.private;
  const status = statusConfig[biography.status || 'draft'] || statusConfig.draft;
  const PrivacyIcon = privacy.icon;

  const date = new Date(biography.updated_at || biography.created_at);
  const formattedDate = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className={cn(
      'group relative rounded-xl border bg-card hover:bg-card/80 transition-all duration-200',
      isUnderReview
        ? 'border-orange-300/60 dark:border-orange-700/40'
        : 'border-border/50 hover:border-border'
    )}>
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
          <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', status.className)}>
            {isUnderReview && <Clock className="h-3 w-3" />}
            {status.label}
          </span>
        </div>

        {isUnderReview && (
          <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mb-4 leading-relaxed">
            {t.dashboard.underReviewMessage}
          </p>
        )}

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
