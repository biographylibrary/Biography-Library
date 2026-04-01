'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
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
import { Plus, Loader as Loader2, CircleAlert as AlertCircle, Mail, CircleCheck as CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [biographies, setBiographies] = useState<Biography[]>([]);
  const [isLoadingBios, setIsLoadingBios] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Biography | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t, language } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

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
    visibility: 'private' | 'link-only' | 'public'
  ) => {
    if (!user) return;
    const { data, error } = await createBiography(user.id, title, visibility);
    if (error) throw new Error(error);
    setShowCreateModal(false);
    if (data) {
      router.push(`/biography/${data.id}/edit`);
    }
  };

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget || !user) return;
    setIsDeleting(true);
    setDeleteError(null);
    const { error } = await deleteBiography(deleteTarget.id, user.id);
    if (!error) {
      setIsDeleting(false);
      setDeleteTarget(null);
      toast.success(t.deleteDialog.successToastBio);
      router.push('/dashboard');
    } else {
      setDeleteError(t.deleteDialog.errorDeleteBio);
      setIsDeleting(false);
    }
  };


  const handleResendVerification = async () => {
    if (!user?.email) return;
    setResendLoading(true);
    setResendSuccess(false);
    await supabase.auth.resend({ type: 'signup', email: user.email });
    setResendLoading(false);
    setResendSuccess(true);
  };

  if (!mounted || authLoading || !user) {
    return (
      <div className="h-full flex items-center justify-center bg-[#ECE9E4] dark:bg-[#1F2121]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user.email_confirmed_at) {
    return (
      <div className="h-full bg-[#ECE9E4] dark:bg-[#1F2121] flex items-center justify-center px-4">
        <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <Mail className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-serif font-semibold text-blue-900 dark:text-blue-100">
                {t.auth.emailNotVerified}
              </h2>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {t.auth.emailNotVerifiedDetail}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {t.auth.verifyEmailDetail}
              </p>
            </div>
            {resendSuccess ? (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                {t.auth.resendVerificationSuccess}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                {resendLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    {t.auth.resendVerificationSending}
                  </>
                ) : (
                  t.auth.resendVerification
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    user.user_metadata?.name || user.email?.split('@')[0] || 'there';

  return (
    <div className="h-full bg-[#ECE9E4] dark:bg-[#1F2121] flex items-center justify-center">
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
          <div className="space-y-0">
            <MainBiographyCard
              biography={biographies[0] || null}
              userName={displayName}
              userId={user.id}
              onDeleteClick={() => setDeleteTarget(biographies[0])}
              onCreateClick={() => setShowCreateModal(true)}
            />

            {biographies.length > 0 && (
              <>
                <div className="flex flex-col items-center gap-6">
                  {biographies.some(b => b.status === 'published' && b.created_at) && (() => {
                const publishedBios = biographies.filter(b => b.status === 'published' && b.created_at);
                if (publishedBios.length === 0) return null;

                const oldestPublished = publishedBios.sort((a, b) =>
                  new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime()
                )[0];

                const monthsSincePublished = Math.floor(
                  (Date.now() - new Date(oldestPublished.created_at!).getTime()) / (1000 * 60 * 60 * 24 * 30)
                );

                if (monthsSincePublished >= 12) {
                  return (
                    <div className="flex flex-col items-center gap-6">
                      <p className="text-sm text-center text-muted-foreground max-w-2xl leading-relaxed">
                        {t.dashboard.updateAvailabilityMessage}
                      </p>
                      <Button
                        className="gap-2 min-h-[44px] px-6 bg-[#121212] hover:bg-[#121212]/90 text-[#FDFBF7]"
                        onClick={() => setShowCreateModal(true)}
                      >
                        <Plus className="h-5 w-5" />
                        <span>{t.dashboard.createBiography}</span>
                      </Button>
                    </div>
                  );
                }
                return null;
              })()}
                </div>
              </>
            )}
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
        deleteError={deleteError}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
      />
    </div>
  );
}
