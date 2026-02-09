'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { CreateBiographyModal } from '@/components/dashboard/create-biography-modal';
import { DeleteBiographyDialog } from '@/components/dashboard/delete-biography-dialog';
import { WelcomeLanguageModal } from '@/components/welcome-language-modal';
import { MainBiographyCard } from '@/components/dashboard/MainBiographyCard';
import { PublishedBiographiesCard } from '@/components/dashboard/published-biographies-card';
import {
  fetchBiographies,
  createBiography,
  deleteBiography,
  type Biography,
} from '@/lib/biographies';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [biographies, setBiographies] = useState<Biography[]>([]);
  const [isLoadingBios, setIsLoadingBios] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Biography | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECE9E4] dark:bg-[#1F2121]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName =
    user.user_metadata?.name || user.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-[#ECE9E4] dark:bg-[#1F2121] flex items-center justify-center">
      <WelcomeLanguageModal />

      <main className="w-full max-w-2xl px-4 sm:px-6 py-8">
        {isLoadingBios ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : fetchError ? (
          <div className="rounded-2xl border-0 bg-transparent p-6 sm:p-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
            <p className="text-sm text-destructive">{fetchError}</p>
            <Button
              variant="outline"
              className="mt-4 min-h-[44px] px-6"
              onClick={loadBiographies}
            >
              {t.dashboard.tryAgain}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <MainBiographyCard
              biography={biographies[0] || null}
              userName={displayName}
              userId={user.id}
            />
            <PublishedBiographiesCard userId={user.id} />

            <div className="flex flex-col items-center gap-2 pt-2">
              {(biographies.length === 0 || biographies.some(b => b.status === 'published')) && (
                <Button
                  className="gap-2 min-h-[44px] px-6 bg-[#121212] hover:bg-[#121212]/90 text-[#FDFBF7]"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="h-5 w-5" />
                  <span>{t.dashboard.createBiography}</span>
                </Button>
              )}

              {biographies.length > 0 && biographies.some(b => b.status !== 'published') && (
                <p className="text-xs text-muted-foreground text-center max-w-md">
                  {t.dashboard.updateAvailabilityMessage}
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      <CreateBiographyModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSubmit={handleCreate}
        existingBiographiesCount={biographies.length}
      />

      <DeleteBiographyDialog
        biography={deleteTarget}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
