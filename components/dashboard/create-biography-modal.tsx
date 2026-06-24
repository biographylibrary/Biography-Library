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
import { Lock, Users, Globe, Loader as Loader2, PenLine, Columns2 as Columns, AlignLeft, Upload, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WritingModeChoice = 'sections' | 'freeflow' | 'import';

interface CreateBiographyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, visibility: 'private' | 'link-only' | 'public', mode: WritingModeChoice) => Promise<void>;
  existingBiographiesCount?: number;
}

type Step = 'details' | 'mode';
type WriteHereSubMode = null | 'sections' | 'freeflow';

export function CreateBiographyModal({
  open,
  onOpenChange,
  onSubmit,
  existingBiographiesCount = 0,
}: CreateBiographyModalProps) {
  const [step, setStep] = useState<Step>('details');
  const [title, setTitle] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'link-only' | 'public'>('private');
  const [writeHereSubMode, setWriteHereSubMode] = useState<WriteHereSubMode>(null);
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
      value: 'link-only' as const,
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

  const handleDetailsNext = () => {
    if (existingBiographiesCount > 0) {
      setError(t.dashboard.oneBiographyLimit);
      return;
    }
    if (!title.trim()) {
      setError(t.biography.enterTitle);
      return;
    }
    setError('');
    setStep('mode');
  };

  const handleSubmit = async (mode: WritingModeChoice) => {
    setIsCreating(true);
    setError('');
    try {
      await onSubmit(title.trim(), privacy, mode);
      resetState();
    } catch (err: any) {
      setError(err.message || t.biography.failedToCreate);
    } finally {
      setIsCreating(false);
    }
  };

  const resetState = () => {
    setStep('details');
    setTitle('');
    setPrivacy('private');
    setWriteHereSubMode(null);
    setError('');
  };

  const handleClose = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        {step === 'details' && (
          <>
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
                    if (e.key === 'Enter') handleDetailsNext();
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
              <Button variant="outline" onClick={() => handleClose(false)}>
                {t.common.cancel}
              </Button>
              <Button onClick={handleDetailsNext}>
                {t.writingModeOnboarding.continueButton}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'mode' && (
          <>
            <DialogHeader>
              <DialogTitle>{t.writingModeOnboarding.stepTitle}</DialogTitle>
              <DialogDescription>
                {t.writingModeOnboarding.stepSubtitle}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <button
                type="button"
                onClick={() => setWriteHereSubMode(writeHereSubMode === null ? 'sections' : null)}
                className="w-full text-left flex items-start gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/40 transition-all group"
              >
                <div className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <PenLine className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{t.writingModeOnboarding.writeHereTitle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.writingModeOnboarding.writeHereDescription}</p>

                  {writeHereSubMode !== null && (
                    <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setWriteHereSubMode('sections')}
                        className={cn(
                          'w-full text-left flex items-start gap-3 p-3 rounded-lg border-2 transition-all',
                          writeHereSubMode === 'sections'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/30'
                        )}
                      >
                        <Columns className={cn('h-4 w-4 mt-0.5 flex-shrink-0', writeHereSubMode === 'sections' ? 'text-primary' : 'text-muted-foreground')} />
                        <div>
                          <p className="text-xs font-semibold">{t.writingModeOnboarding.guidedChaptersLabel}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{t.writingModeOnboarding.guidedChaptersDescription}</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setWriteHereSubMode('freeflow')}
                        className={cn(
                          'w-full text-left flex items-start gap-3 p-3 rounded-lg border-2 transition-all',
                          writeHereSubMode === 'freeflow'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/30'
                        )}
                      >
                        <AlignLeft className={cn('h-4 w-4 mt-0.5 flex-shrink-0', writeHereSubMode === 'freeflow' ? 'text-primary' : 'text-muted-foreground')} />
                        <div>
                          <p className="text-xs font-semibold">{t.writingModeOnboarding.freewritingLabel}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{t.writingModeOnboarding.freewritingDescription}</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSubmit('import')}
                disabled={isCreating}
                className="w-full text-left flex items-start gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/40 transition-all"
              >
                <div className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{t.writingModeOnboarding.importTitle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.writingModeOnboarding.importDescription}</p>
                </div>
              </button>
            </div>

            <DialogFooter className="gap-2 flex-row justify-between sm:justify-between">
              <Button
                variant="ghost"
                onClick={() => { setStep('details'); setWriteHereSubMode(null); setError(''); }}
                disabled={isCreating}
              >
                {t.writingModeOnboarding.backButton}
              </Button>
              <Button
                onClick={() => {
                  if (!writeHereSubMode) {
                    setError('Please choose a writing mode to continue.');
                    return;
                  }
                  handleSubmit(writeHereSubMode as WritingModeChoice);
                }}
                disabled={isCreating || writeHereSubMode === null}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.biography.creating}
                  </>
                ) : (
                  t.writingModeOnboarding.continueButton
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
