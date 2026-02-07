'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Lock, Users, Globe, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateBiographyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, privacy: 'private' | 'family' | 'public') => Promise<void>;
}

export function CreateBiographyModal({
  open,
  onOpenChange,
  onSubmit,
}: CreateBiographyModalProps) {
  const [title, setTitle] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'family' | 'public'>('private');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  const privacyOptions = [
    {
      value: 'private' as const,
      icon: Lock,
      label: t.dashboard.private,
      description: t.biography.onlyYouCanAccess,
    },
    {
      value: 'family' as const,
      icon: Users,
      label: t.dashboard.family,
      description: t.biography.shareWithFamily,
    },
    {
      value: 'public' as const,
      icon: Globe,
      label: t.dashboard.public,
      description: t.biography.anyoneWithLink,
    },
  ];

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError(t.biography.enterTitle);
      return;
    }
    setIsCreating(true);
    setError('');
    try {
      await onSubmit(title.trim(), privacy);
      setTitle('');
      setPrivacy('private');
    } catch (err: any) {
      setError(err.message || t.biography.failedToCreate);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t.biography.newBiography}</DialogTitle>
          <DialogDescription>
            {t.biography.startDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="space-y-2">
            <Label>{t.biography.titleLabel}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.biography.titlePlaceholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>{t.biography.privacyLabel}</Label>
            <div className="grid grid-cols-3 gap-2">
              {privacyOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = privacy === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPrivacy(option.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-center',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5',
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                    <span className="text-xs font-medium">{option.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.biography.creating}
              </>
            ) : (
              t.biography.startWritingButton
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
