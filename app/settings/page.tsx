'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useTheme } from 'next-themes';
import { supabase } from '@/lib/supabase';
import { FontSizeControl } from '@/components/accessibility/font-size-control';
import { DeleteAccountDialog } from '@/components/settings/delete-account-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Language, languageNames, languageFlags } from '@/lib/i18n/translations';
import { toast } from 'sonner';
import {
  Languages,
  Sun,
  Moon,
  Type,
  UserX,
  LogOut,
  ChevronRight,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { patchOnboarding } from '@/lib/onboarding/onboarding-client';
import { useOnboardingGate } from '@/components/onboarding/OnboardingGateProvider';
import {
  interpretAiFeaturesToggleResponse,
  requestAiFeaturesToggle,
} from '@/lib/ai/ai-features-client';
import { cn } from '@/lib/utils';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2">
      {children}
    </h2>
  );
}

function SettingsRow({
  icon,
  label,
  description,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl bg-card border border-border',
        onClick && 'cursor-pointer hover:bg-muted/40 transition-colors'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-muted-foreground shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm text-foreground leading-tight">{label}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, loading, fontSize, setFontSize, signOut } = useAuth();
  const { language, t } = useTranslation();
  const { refreshOnboarding } = useOnboardingGate();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [biographyCount, setBiographyCount] = useState(0);
  const [latestBiographyId, setLatestBiographyId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiToggleBusy, setAiToggleBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    const fetchBiographyCount = async () => {
      const { count } = await supabase
        .from('biographies')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('translation_of', null);
      setBiographyCount(count ?? 0);

      const { data: latest } = await supabase
        .from('biographies')
        .select('id')
        .eq('user_id', user.id)
        .is('translation_of', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setLatestBiographyId(latest?.id ?? null);

      const { data: profile } = await supabase
        .from('profiles')
        .select('ai_features_enabled')
        .eq('id', user.id)
        .maybeSingle();
      setAiEnabled(Boolean(profile?.ai_features_enabled));
    };

    fetchBiographyCount();
  }, [user, loading, router]);

  const handleAiFeaturesToggle = async (next: boolean) => {
    if (!user || aiToggleBusy) return;
    const previous = aiEnabled;
    setAiEnabled(next);
    setAiToggleBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setAiEnabled(previous);
        toast.error(t.toast.requestFailed);
        return;
      }
      const response = await requestAiFeaturesToggle({
        enabled: next,
        accessToken: session.access_token,
      });
      const outcome = interpretAiFeaturesToggleResponse({
        previous,
        requested: next,
        responded: response.responded,
        status: response.status,
        body: response.body,
      });
      setAiEnabled(outcome.enabled);
      if (outcome.action === 'keep_off_retry') {
        toast.error(t.accountSettings.aiFeaturesPurgeRetry);
      } else if (outcome.action === 'restore') {
        toast.error(t.toast.requestFailed);
      }
    } finally {
      setAiToggleBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      await signOut({ redirectToLogin: true });
    } catch {
      toast.error(t.toast.error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirectToLogin: true });
  };

  const isDark = mounted && resolvedTheme === 'dark';

  const fontSizeLabels: Record<string, string> = {
    small: t.accountSettings.fontSizeSmall,
    normal: t.accountSettings.fontSizeNormal,
    large: t.accountSettings.fontSizeLarge,
    'extra-large': t.accountSettings.fontSizeExtraLarge,
  };

  if (!user) return null;

  return (
    <main className="min-h-full bg-background">
      <div className="max-w-lg mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl tracking-tight text-foreground">
            {t.nav.settings}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {user.user_metadata?.name || user.email}
          </p>
        </div>

        <section className="space-y-2">
          <SectionHeading>{t.accountSettings.appearance}</SectionHeading>

          <SettingsRow
            icon={isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            label={t.nav.darkMode}
          >
            <Switch
              checked={isDark}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </SettingsRow>

          <SettingsRow
            icon={<Type className="h-4 w-4" />}
            label={t.accountSettings.fontSize}
            description={fontSizeLabels[fontSize]}
          >
            <FontSizeControl
              currentSize={fontSize}
              onSizeChange={setFontSize}
              userId={user.id}
            />
          </SettingsRow>

          <SettingsRow
            icon={<Sparkles className="h-4 w-4" />}
            label={t.accountSettings.aiFeatures}
            description={t.accountSettings.aiFeaturesDescription}
          >
            <Switch
              checked={aiEnabled}
              disabled={aiToggleBusy}
              onCheckedChange={(checked) => {
                void handleAiFeaturesToggle(checked);
              }}
            />
          </SettingsRow>
        </section>

        <section className="space-y-2">
          <SectionHeading>{t.onboardingWizard.reviewIntro}</SectionHeading>
          <SettingsRow
            icon={<BookOpen className="h-4 w-4" />}
            label={t.onboardingWizard.reviewIntro}
            description={t.onboardingWizard.resumeIntroDescription}
            onClick={() => {
              void (async () => {
                if (latestBiographyId) {
                  await patchOnboarding({ action: 'restart_tour' });
                  await refreshOnboarding();
                  router.push(`/biography/${latestBiographyId}/edit?tour=1`);
                  return;
                }
                await patchOnboarding({ action: 'restart_intro' });
                await refreshOnboarding();
                router.push('/onboarding');
              })();
            }}
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </SettingsRow>
        </section>

        <section className="space-y-2">
          <SectionHeading>{t.accountSettings.language}</SectionHeading>

          <div className="rounded-xl border border-border bg-card px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <span className="mr-1">{languageFlags[language]}</span>
              <span className="text-sm text-foreground">{languageNames[language]}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t.accountSettings.languageLockedHint}</p>
          </div>
        </section>

        <Separator />

        <section className="space-y-2">
          <SectionHeading>{t.accountSettings.account}</SectionHeading>

          <SettingsRow
            icon={<LogOut className="h-4 w-4" />}
            label={t.nav.signOut}
            onClick={handleSignOut}
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </SettingsRow>
        </section>

        <section className="space-y-2">
          <SectionHeading>{t.accountSettings.dangerZone}</SectionHeading>

          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <UserX className="h-4 w-4 text-destructive shrink-0" />
              <div>
                <p className="text-sm text-foreground leading-tight">
                  {t.deleteDialog.deleteAccountLink}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                  {t.deleteDialog.accountModal1Message}
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <DeleteAccountDialog
                biographyCount={biographyCount}
                isDeleting={isDeleting}
                onConfirm={handleDeleteAccount}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
