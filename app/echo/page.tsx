'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { EchoHeader } from '@/components/echo/EchoHeader';
import { EchoChat } from '@/components/echo/EchoChat';
import { EchoProvider } from '@/lib/echo/echo-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  createBiography,
  fetchBiographies,
  type Biography,
} from '@/lib/biographies';
import { useTranslation } from '@/lib/i18n/i18n-context';
import {
  isOnboardingComplete,
  markOnboardingComplete,
  loadOnboardingState,
  saveOnboardingState,
} from '@/lib/echo/onboarding';
import { Loader as Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

function EchoHubContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t, language } = useTranslation();
  const [biographies, setBiographies] = useState<Biography[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const onboardingIncomplete = !isOnboardingComplete();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?returnTo=/echo');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetchBiographies(user.id).then(({ data }) => {
      setBiographies(data ?? []);
      setLoading(false);
    });
  }, [user]);

  const createAndGo = useCallback(
    async (mode: 'sections' | 'freeflow', importFlag = false) => {
      if (!user) return;
      setCreating(mode);
      try {
        const title = t.echo.untitledBiography;
        const { data, error } = await createBiography(
          user.id,
          title,
          'private',
          mode,
          user.user_metadata?.name || user.email || ''
        );
        if (error || !data) throw new Error(error ?? 'Failed');
        markOnboardingComplete();
        const path = importFlag
          ? `/biography/${data.id}/edit?import=1`
          : `/biography/${data.id}/edit`;
        router.push(path);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t.echo.errorGeneric);
      } finally {
        setCreating(null);
      }
    },
    [user, router, t]
  );

  const handleOnboardingEvent = useCallback(
    (event: { tool: string; data?: unknown }) => {
      if (event.tool === 'confirm_onboarding_step') {
        const state = loadOnboardingState() ?? { step: 'language' as const };
        saveOnboardingState({ ...state, completed: false });
      }
      if (event.tool === 'set_biography_preferences' || event.tool === 'confirm_onboarding_step') {
        const step = (event.data as { onboardingStep?: string })?.onboardingStep;
        if (step === 'terms') markOnboardingComplete();
      }
    },
    []
  );

  const latestBio = biographies[0];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#EDEBE7]">
      <EchoHeader biographies={biographies} />
      <main className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4 py-6 min-h-0">
        {latestBio && !onboardingIncomplete && (
          <Card className="mb-4 shrink-0">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t.echo.resumeButton}</p>
                <p className="font-serif font-medium truncate">
                  {latestBio.title || t.echo.untitledBiography}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => router.push(`/biography/${latestBio.id}/edit`)}
              >
                {t.echo.resumeButton}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {!onboardingIncomplete && biographies.length === 0 && (
          <div className="flex flex-col gap-2 mb-4 shrink-0">
            <Button
              variant="outline"
              disabled={!!creating}
              onClick={() => void createAndGo('sections')}
            >
              {creating === 'sections' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t.echo.newGuided}
            </Button>
            <Button
              variant="outline"
              disabled={!!creating}
              onClick={() => void createAndGo('freeflow', true)}
            >
              {t.echo.newImport}
            </Button>
          </div>
        )}

        <EchoChat
          echoPage="hub"
          onboardingIncomplete={onboardingIncomplete}
          emptyState={
            onboardingIncomplete ? t.echo.onboardingWelcome : t.echo.hubEmpty
          }
          className="flex-1 min-h-0"
          orbSize="xl"
          onOnboardingEvent={handleOnboardingEvent}
        />
      </main>
    </div>
  );
}

export default function EchoHubPage() {
  return (
    <EchoProvider page="hub">
      <EchoHubContent />
    </EchoProvider>
  );
}
