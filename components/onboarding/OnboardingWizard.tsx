'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Flame, Loader as Loader2, PenLine, Upload, BookOpen, Lock, Users, Globe, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import {
  AutobiographyDeclarationForm,
  isAutobiographyDeclarationComplete,
  type AutobiographyDeclarationValues,
} from '@/components/onboarding/forms/AutobiographyDeclarationForm';
import {
  MemorialDeclarationForm,
  isMemorialDeclarationComplete,
  type MemorialDeclarationValues,
} from '@/components/onboarding/forms/MemorialDeclarationForm';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useAuth } from '@/lib/auth-context';
import { useOnboardingGate } from '@/components/onboarding/OnboardingGateProvider';
import { patchOnboarding } from '@/lib/onboarding/onboarding-client';
import { createBiography, fetchBiographies, ONE_BIOGRAPHY_PER_USER_ERROR } from '@/lib/biographies';
import {
  WIZARD_STEP_ORDER,
  type BiographyTypeChoice,
  type WizardStep,
  type WritingPath,
} from '@/lib/onboarding/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const WIZARD_DRAFT_KEY = 'bl_onboarding_wizard_draft';

const EMPTY_AUTO: AutobiographyDeclarationValues = {
  identity: false,
  ageConfirm: false,
  termsAccept: false,
  responsibility: false,
};

const SELECTED_CHOICE_CLASS =
  'border-foreground !bg-brand-blue shadow-md dark:border-foreground dark:!bg-brand-blue';
const UNSELECTED_CHOICE_CLASS =
  'border-border bg-card hover:border-foreground/30 hover:bg-brand-blue/40';

const EMPTY_MEM: MemorialDeclarationValues = {
  deceased: false,
  truthful: false,
  respectRights: false,
  proofOfDeath: false,
  termsAccept: false,
};

function prevStep(step: WizardStep): WizardStep {
  const idx = WIZARD_STEP_ORDER.indexOf(step);
  return WIZARD_STEP_ORDER[Math.max(0, idx - 1)];
}

function nextStep(step: WizardStep): WizardStep {
  const idx = WIZARD_STEP_ORDER.indexOf(step);
  return WIZARD_STEP_ORDER[Math.min(idx + 1, WIZARD_STEP_ORDER.length - 1)];
}

export function OnboardingWizard() {
  const { user } = useAuth();
  const router = useRouter();
  const { t, language } = useTranslation();
  const { onboardingState, refreshOnboarding } = useOnboardingGate();

  const [step, setStep] = useState<WizardStep>('biography_type');
  const [biographyType, setBiographyType] = useState<BiographyTypeChoice | null>(null);
  const [autoDecl, setAutoDecl] = useState(EMPTY_AUTO);
  const [memDecl, setMemDecl] = useState(EMPTY_MEM);
  const [title, setTitle] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'link-only' | 'public'>('private');
  const [writingPath, setWritingPath] = useState<WritingPath | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fallback =
      (user.user_metadata?.name as string | undefined)?.trim() ||
      (user.email ?? '').split('@')[0].trim();
    if (fallback) setAuthorName(fallback);
  }, [user]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(WIZARD_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        title?: string;
        subjectName?: string;
        authorName?: string;
        privacy?: 'private' | 'link-only' | 'public';
      };
      if (draft.title) setTitle(draft.title);
      if (draft.subjectName) setSubjectName(draft.subjectName);
      if (draft.authorName) setAuthorName(draft.authorName);
      if (draft.privacy) setPrivacy(draft.privacy);
    } catch {
      /* ignore corrupt draft */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        WIZARD_DRAFT_KEY,
        JSON.stringify({ title, subjectName, authorName, privacy })
      );
    } catch {
      /* storage unavailable */
    }
  }, [title, subjectName, authorName, privacy]);

  useEffect(() => {
    if (!onboardingState) return;
    setStep(onboardingState.onboarding_wizard_step ?? 'biography_type');
    if (onboardingState.legal_declaration_type) {
      setBiographyType(onboardingState.legal_declaration_type);
    }
    if (onboardingState.onboarding_writing_path) {
      setWritingPath(onboardingState.onboarding_writing_path);
    }
  }, [onboardingState]);

  const privacyOptions = [
    { value: 'private' as const, icon: Lock, label: t.dashboard.private, description: t.biography.onlyYouCanAccess },
    { value: 'link-only' as const, icon: Users, label: t.dashboard.family, description: t.biography.shareWithFamily },
    { value: 'public' as const, icon: Globe, label: t.dashboard.public, description: t.biography.anyoneWithLink },
  ];

  const canContinue = (): boolean => {
    switch (step) {
      case 'biography_type':
        return biographyType !== null;
      case 'legal':
        return biographyType === 'autobiography'
          ? isAutobiographyDeclarationComplete(autoDecl)
          : isMemorialDeclarationComplete(memDecl);
      case 'details':
        if (biographyType === 'memorial') {
          return subjectName.trim().length > 0 && authorName.trim().length > 0;
        }
        return title.trim().length > 0;
      case 'path':
        return writingPath !== null;
      default:
        return false;
    }
  };

  const handleBack = async () => {
    const prev = prevStep(step);
    setStep(prev);
    await patchOnboarding({ wizardStep: prev });
    await refreshOnboarding();
  };

  const handleContinue = async () => {
    if (!canContinue()) return;

    if (step === 'path') {
      if (!writingPath || !biographyType || !user) {
        toast.error(t.toast.error);
        return;
      }
      if (!title.trim() && biographyType !== 'memorial') {
        toast.error(t.biography.titleLabel);
        setStep('details');
        return;
      }
      if (biographyType === 'memorial' && (!subjectName.trim() || !authorName.trim())) {
        toast.error(t.biography.memorialDetailsSubtitle);
        setStep('details');
        return;
      }

      setSubmitting(true);
      try {
        const { data: existing } = await fetchBiographies(user.id);
        if ((existing?.length ?? 0) > 0) {
          toast.error(t.dashboard.oneBiographyLimit);
          router.push('/dashboard');
          return;
        }

        const mode =
          writingPath === 'sections' ? 'sections' : ('freeflow' as const);
        const isMemorial = biographyType === 'memorial';
        const { data, error } = await createBiography(
          user.id,
          isMemorial ? subjectName.trim() : title.trim(),
          privacy,
          mode,
          isMemorial ? authorName.trim() : user.user_metadata?.name || user.email || '',
          biographyType,
          language,
          isMemorial ? subjectName.trim() : undefined
        );
        if (error || !data) {
          if (error === ONE_BIOGRAPHY_PER_USER_ERROR) {
            throw new Error(t.dashboard.oneBiographyLimit);
          }
          throw new Error(error ?? 'Failed');
        }

        const { error: patchError } = await patchOnboarding({
          action: 'complete_wizard',
          writingPath,
          biographyType,
        });
        if (patchError) {
          throw new Error(patchError);
        }

        try {
          sessionStorage.removeItem(WIZARD_DRAFT_KEY);
        } catch {
          /* ignore */
        }

        const params = new URLSearchParams({ tour: '1' });
        if (writingPath === 'freeflow_import' || writingPath === 'publish_ready') {
          params.set('import', '1');
        }
        router.push(`/biography/${data.id}/edit?${params.toString()}`);
        void refreshOnboarding();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t.echo.errorGeneric);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const next = nextStep(step);
    await patchOnboarding({
      action: 'advance_wizard',
      wizardStep: step,
      biographyType:
        step === 'biography_type' || step === 'legal' ? biographyType ?? undefined : undefined,
    });
    setStep(next);
    await refreshOnboarding();
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 sm:space-y-8">
      <OnboardingProgress currentStep={step} />

      {step === 'biography_type' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="space-y-1 text-center px-1">
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold">{t.biographyType.title}</h1>
            <p className="text-muted-foreground">{t.onboardingWizard.typeSubtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card
              className={cn(
                'border-2 cursor-pointer transition-all hover:shadow-md',
                biographyType === 'autobiography' ? SELECTED_CHOICE_CLASS : UNSELECTED_CHOICE_CLASS
              )}
              onClick={() => setBiographyType('autobiography')}
            >
              <CardContent className="p-6 space-y-4">
                <User className="h-8 w-8 text-primary" />
                <h3 className="font-semibold text-lg">{t.biographyType.autobiography}</h3>
                <p className="text-sm text-muted-foreground">{t.biographyType.autobiographyDescription}</p>
              </CardContent>
            </Card>
            <Card
              className={cn(
                'border-2 cursor-pointer transition-all hover:shadow-md',
                biographyType === 'memorial' ? SELECTED_CHOICE_CLASS : UNSELECTED_CHOICE_CLASS
              )}
              onClick={() => setBiographyType('memorial')}
            >
              <CardContent className="p-6 space-y-4">
                <Flame className="h-8 w-8 text-primary" />
                <h3 className="font-semibold text-lg">{t.biographyType.deceased}</h3>
                <p className="text-sm text-muted-foreground">{t.biographyType.deceasedDescription}</p>
              </CardContent>
            </Card>
          </div>
          <Alert className="border-primary/20 bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm leading-relaxed">
              {t.onboardingWizard.accountModelInfo}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {step === 'legal' && biographyType && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="space-y-1">
            <h1 className="text-2xl font-serif font-semibold">
              {biographyType === 'autobiography' ? t.declaration.title : t.deceasedDeclaration.title}
            </h1>
            <p className="text-muted-foreground text-sm">{t.onboardingWizard.legalSubtitle}</p>
          </div>
          <Card>
            <CardContent className="p-6">
              {biographyType === 'autobiography' ? (
                <AutobiographyDeclarationForm values={autoDecl} onChange={setAutoDecl} />
              ) : (
                <MemorialDeclarationForm values={memDecl} onChange={setMemDecl} />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'details' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="space-y-1">
            <h1 className="text-2xl font-serif font-semibold">{t.biography.newBiography}</h1>
            <p className="text-muted-foreground text-sm">
              {biographyType === 'memorial'
                ? t.biography.memorialDetailsSubtitle
                : t.biography.startDescription}
            </p>
          </div>
          {biographyType === 'memorial' ? (
            <>
              <div className="space-y-2">
                <Label>{t.biography.subjectNameLabel}</Label>
                <Input
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder={t.biography.subjectNamePlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.biography.writerNameLabel}</Label>
                <Input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder={t.biography.writerNamePlaceholder}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>{t.biography.titleLabel}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.biography.titlePlaceholder}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>{t.biography.privacyLabel}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {privacyOptions.map((option) => {
                const Icon = option.icon;
                const selected = privacy === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPrivacy(option.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-center',
                      selected ? SELECTED_CHOICE_CLASS : UNSELECTED_CHOICE_CLASS
                    )}
                  >
                    <Icon className={cn('h-5 w-5', selected ? 'text-brand-ink dark:text-brand-beigeLight' : 'text-muted-foreground')} />
                    <span className="text-xs font-medium">{option.label}</span>
                    <span className="text-[10px] text-muted-foreground">{option.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 'path' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="space-y-1">
            <h1 className="text-2xl font-serif font-semibold">{t.onboardingWizard.pathTitle}</h1>
            <p className="text-muted-foreground text-sm">{t.onboardingWizard.pathSubtitle}</p>
          </div>
          <div className="space-y-3">
            {(
              [
                {
                  id: 'sections' as WritingPath,
                  icon: PenLine,
                  title: t.echo.newGuided,
                  desc: t.writingModeOnboarding.guidedChaptersDescription,
                },
                {
                  id: 'freeflow_import' as WritingPath,
                  icon: Upload,
                  title: t.echo.newImport,
                  desc: t.writingModeOnboarding.importDescription,
                },
                {
                  id: 'publish_ready' as WritingPath,
                  icon: BookOpen,
                  title: t.echo.newPublishOnly,
                  desc: t.onboardingWizard.publishReadyDescription,
                },
              ] as const
            ).map(({ id, icon: Icon, title: cardTitle, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => setWritingPath(id)}
                className={cn(
                  'w-full text-left flex items-start gap-4 p-4 rounded-xl border-2 transition-all',
                  writingPath === id ? SELECTED_CHOICE_CLASS : UNSELECTED_CHOICE_CLASS
                )}
              >
                <Icon className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{cardTitle}</p>
                  <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                </div>
              </button>
            ))}
          </div>
          <Alert>
            <AlertDescription className="text-sm">{t.onboardingWizard.pathHint}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
        {step !== 'biography_type' && (
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => void handleBack()}
            disabled={submitting}
          >
            {t.common.back}
          </Button>
        )}
        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={() => void handleContinue()}
          disabled={!canContinue() || submitting}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {step === 'path' ? t.onboardingWizard.startTour : t.writingModeOnboarding.continueButton}
        </Button>
      </div>
    </div>
  );
}
