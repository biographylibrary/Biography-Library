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
} from 'lucide-react';
import { cn } from '@/lib/utils';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-2">
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
        'flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl bg-card border border-border/60',
        onClick && 'cursor-pointer hover:bg-muted/40 transition-colors'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-muted-foreground shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground leading-tight">{label}</p>
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
  const { user, fontSize, setFontSize, signOut } = useAuth();
  const { language, setLanguage, t } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [biographyCount, setBiographyCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    const fetchBiographyCount = async () => {
      const { count } = await supabase
        .from('biographies')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setBiographyCount(count ?? 0);
    };

    fetchBiographyCount();
  }, [user, router]);

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      await signOut();
      router.push('/');
    } catch {
      toast.error(t.toast.error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/biographies');
  };

  const isDark = mounted && resolvedTheme === 'dark';

  const fontSizeLabels: Record<string, string> = {
    small: 'Small (90%)',
    normal: 'Normal (100%)',
    large: 'Large (115%)',
    'extra-large': 'Extra-large (130%)',
  };

  if (!user) return null;

  return (
    <main className="min-h-full bg-background">
      <div className="max-w-lg mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t.nav.settings}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {user.user_metadata?.name || user.email}
          </p>
        </div>

        <section className="space-y-2">
          <SectionHeading>Appearance</SectionHeading>

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
            label="Font size"
            description={fontSizeLabels[fontSize]}
          >
            <FontSizeControl
              currentSize={fontSize}
              onSizeChange={setFontSize}
              userId={user.id}
            />
          </SettingsRow>
        </section>

        <section className="space-y-2">
          <SectionHeading>Language</SectionHeading>

          <div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/60">
            {(['en', 'de', 'fr', 'it'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 text-sm transition-colors bg-card hover:bg-muted/40',
                  language === lang && 'bg-muted/60'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  <span className="mr-1">{languageFlags[lang]}</span>
                  <span className={cn('font-medium', language === lang ? 'text-foreground' : 'text-muted-foreground')}>
                    {languageNames[lang]}
                  </span>
                </div>
                {language === lang && (
                  <span className="h-2 w-2 rounded-full bg-foreground" />
                )}
              </button>
            ))}
          </div>
        </section>

        <Separator />

        <section className="space-y-2">
          <SectionHeading>Account</SectionHeading>

          <SettingsRow
            icon={<LogOut className="h-4 w-4" />}
            label={t.nav.signOut}
            onClick={handleSignOut}
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </SettingsRow>
        </section>

        <section className="space-y-2">
          <SectionHeading>Danger zone</SectionHeading>

          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <UserX className="h-4 w-4 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground leading-tight">
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
