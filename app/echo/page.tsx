'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { EchoHeader } from '@/components/echo/EchoHeader';
import { EchoChat } from '@/components/echo/EchoChat';
import { EchoProvider } from '@/lib/echo/echo-context';
import { EchoChatProvider } from '@/lib/echo/echo-chat-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fetchBiographies, type Biography } from '@/lib/biographies';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useOnboardingGate } from '@/components/onboarding/OnboardingGateProvider';
import { patchOnboarding } from '@/lib/onboarding/onboarding-client';
import { Loader as Loader2, ChevronRight } from 'lucide-react';
import { ChapterCooldownBanner } from '@/components/dashboard/ChapterCooldownBanner';

function EchoHubContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { onboardingState, refreshOnboarding } = useOnboardingGate();
  const [biographies, setBiographies] = useState<Biography[]>([]);
  const [loading, setLoading] = useState(true);

  const showResumeIntro =
    onboardingState?.onboarding_phase === 'skipped' ||
    onboardingState?.onboarding_phase === 'wizard';

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

  const latestBio = biographies[0];

  const handleResumeIntro = async () => {
    await patchOnboarding({ action: 'resume' });
    await refreshOnboarding();
    router.push('/onboarding');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <EchoChatProvider echoPage="hub">
      <div className="min-h-screen flex flex-col bg-[#EDEBE7]">
        <EchoHeader biographies={biographies} />
        <main className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4 py-6 min-h-0">
          {showResumeIntro && (
            <Card className="mb-4 shrink-0 border-primary/30">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{t.onboardingWizard.resumeIntro}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.onboardingWizard.resumeIntroDescription}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 self-start sm:self-center"
                  onClick={() => void handleResumeIntro()}
                >
                  <span className="sm:hidden">{t.welcome.continue}</span>
                  <span className="hidden sm:inline">{t.onboardingWizard.resumeIntro}</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {latestBio && (
            <Card className="mb-4 shrink-0">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{t.echo.resumeButton}</p>
                    <p className="font-serif font-medium truncate">
                      {latestBio.title || t.echo.untitledBiography}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 self-start sm:self-center"
                    onClick={() => router.push(`/biography/${latestBio.id}/edit`)}
                  >
                    <span className="hidden sm:inline">{t.echo.resumeButton}</span>
                    <span className="sm:hidden">{t.welcome.continue}</span>
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                {latestBio.status === 'published' && (
                  <ChapterCooldownBanner biography={latestBio} compact />
                )}
              </CardContent>
            </Card>
          )}

          <EchoChat emptyState={t.echo.hubEmpty} className="flex-1 min-h-0" orbSize="xl" />
        </main>
      </div>
    </EchoChatProvider>
  );
}

export default function EchoHubPage() {
  return (
    <EchoProvider page="hub">
      <EchoHubContent />
    </EchoProvider>
  );
}
