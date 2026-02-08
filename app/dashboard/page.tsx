'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { CreateBiographyModal } from '@/components/dashboard/create-biography-modal';
import { DeleteBiographyDialog } from '@/components/dashboard/delete-biography-dialog';
import { WelcomeLanguageModal } from '@/components/welcome-language-modal';
import { MainBiographyCard } from '@/components/dashboard/MainBiographyCard';
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
  const { t } = useTranslation();

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
      <div className="min-h-screen flex items-center justify-center bg-[#EDEBE7] dark:bg-[#1F2121]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName =
    user.user_metadata?.name || user.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-[#EDEBE7] dark:bg-[#1F2121] flex items-center justify-center">
      <WelcomeLanguageModal />

      <main className="w-full max-w-2xl px-4 sm:px-6 py-8">
        {biographies.length === 0 && (
          <div className="flex justify-end mb-6 sm:mb-8">
            <Button
              className="gap-2"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4" />
              <span>{t.dashboard.createBiography}</span>
            </Button>
          </div>
        )}

        {isLoadingBios ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : fetchError ? (
          <div className="rounded-2xl border-0 bg-[#EDEBE7] dark:bg-[#121212] p-6 sm:p-8 text-center">
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
        ) : (
          <MainBiographyCard
            biography={biographies[0] || null}
            userName={displayName}
            userId={user.id}
          />
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
