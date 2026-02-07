'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { BiographyCard } from '@/components/dashboard/biography-card';
import { CreateBiographyModal } from '@/components/dashboard/create-biography-modal';
import { DeleteBiographyDialog } from '@/components/dashboard/delete-biography-dialog';
import { WelcomeLanguageModal } from '@/components/welcome-language-modal';
import {
  fetchBiographies,
  createBiography,
  deleteBiography,
  type Biography,
} from '@/lib/biographies';
import { BookOpen, Plus, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { toast } from 'sonner';
import { loadDemoBiography } from '@/lib/demo-loader';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [biographies, setBiographies] = useState<Biography[]>([]);
  const [isLoadingBios, setIsLoadingBios] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Biography | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const { t, language } = useTranslation();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadBiographies = useCallback(async () => {
    if (!user) return;
    setIsLoadingBios(true);
    setFetchError(null);
    const { data, error } = await fetchBiographies(user.id);
    if (error) {
      setFetchError(error);
    } else {
      setBiographies(data || []);
    }
    setIsLoadingBios(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadBiographies();
    }
  }, [user, loadBiographies]);

  const handleCreate = async (
    title: string,
    privacy: 'private' | 'family' | 'public'
  ) => {
    if (!user) return;
    const { data, error } = await createBiography(user.id, title, privacy);
    if (error) throw new Error(error);
    setShowCreateModal(false);
    if (data) {
      router.push(`/biography/${data.id}/edit`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const { error } = await deleteBiography(deleteTarget.id);
    if (!error) {
      setBiographies((prev) =>
        prev.filter((b) => b.id !== deleteTarget.id)
      );
    }
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  const handleLoadDemo = async () => {
    if (!user) return;
    setIsLoadingDemo(true);
    const result = await loadDemoBiography(user.id, language);
    if (result.success && result.biographyId) {
      toast.success(t.toast.demoLoaded);
      await loadBiographies();
      router.push(`/biography/${result.biographyId}/edit`);
    } else {
      toast.error(result.error || t.toast.error);
    }
    setIsLoadingDemo(false);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName =
    user.user_metadata?.name || user.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <WelcomeLanguageModal />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t.dashboard.welcome}, {displayName}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t.dashboard.yourWorkspace}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleLoadDemo}
              disabled={isLoadingDemo}
            >
              {isLoadingDemo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{t.dashboard.loadDemo}</span>
              <span className="sm:hidden">{t.dashboard.loadDemo}</span>
            </Button>
            <Button
              className="gap-2"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t.dashboard.createBiography}</span>
              <span className="sm:hidden">{t.dashboard.createBiography}</span>
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <StatsCards biographies={biographies} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{t.dashboard.yourBiographies}</h2>
        </div>

        {isLoadingBios ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : fetchError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
            <p className="text-sm text-destructive">{fetchError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={loadBiographies}
            >
              {t.dashboard.tryAgain}
            </Button>
          </div>
        ) : biographies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10">
                <BookOpen className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-medium mb-2">{t.dashboard.noBiographies}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              {t.dashboard.noBiographiesSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                className="gap-2"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4" />
                {t.dashboard.createBiography}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleLoadDemo}
                disabled={isLoadingDemo}
              >
                {isLoadingDemo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {t.dashboard.loadDemo}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {biographies.map((bio) => (
              <BiographyCard
                key={bio.id}
                biography={bio}
                onEdit={(id) => router.push(`/biography/${id}/edit`)}
                onDelete={(b) => setDeleteTarget(b)}
              />
            ))}
          </div>
        )}
      </main>

      <CreateBiographyModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSubmit={handleCreate}
      />

      <DeleteBiographyDialog
        biography={deleteTarget}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Footer />
    </div>
  );
}
