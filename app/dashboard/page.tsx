'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { CreateBiographyModal } from '@/components/dashboard/create-biography-modal';
import { DeleteBiographyDialog } from '@/components/dashboard/delete-biography-dialog';
import { EchoShell } from '@/components/echo/EchoShell';
import { MainBiographyCard } from '@/components/dashboard/MainBiographyCard';
import {
  fetchBiographies,
  createBiography,
  deleteBiography,
  ONE_BIOGRAPHY_PER_USER_ERROR,
  type Biography,
} from '@/lib/biographies';
import { Loader as Loader2, CircleAlert as AlertCircle, Mail, CircleCheck as CheckCircle2 } from 'lucide-react';
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
  const [deleteError, setDeleteError] = useState<string | null>(null);
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
    visibility: 'private' | 'link-only' | 'public',
    mode: 'sections' | 'freeflow' | 'import'
  ) => {
    if (!user) return;
    const biographyMode = mode === 'import' ? 'freeflow' : mode;
    const { data, error } = await createBiography(user.id, title, visibility, biographyMode, user.user_metadata?.name || user.email || '');
    if (error === ONE_BIOGRAPHY_PER_USER_ERROR) {
      throw new Error(t.dashboard.oneBiographyLimit);
    }
    if (error) throw new Error(error);
    setShowCreateModal(false);
    if (data) {
      const url = mode === 'import'
        ? `/biography/${data.id}/edit?import=1`
        : `/biography/${data.id}/edit`;
      router.push(url);
    }
  };

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

  if (authLoading || !user) {
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
          <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-brand-blue/25 dark:bg-brand-blue/15 border border-brand-blue/50 dark:border-brand-blue/35 text-center">
            <div className="w-14 h-14 rounded-full bg-brand-blue/40 dark:bg-brand-blue/20 flex items-center justify-center">
              <Mail className="h-7 w-7 text-brand-ink dark:text-brand-blue" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-serif font-semibold text-brand-ink dark:text-brand-beigeLight">
                {t.auth.emailNotVerified}
              </h2>
              <p className="text-sm text-brand-ink/90 dark:text-brand-beigeLight/90">
                {t.auth.emailNotVerifiedDetail}
              </p>
              <p className="text-xs text-brand-greenDark dark:text-brand-blue/90">
                {t.auth.verifyEmailDetail}
              </p>
            </div>
            {resendSuccess ? (
              <div className="flex items-center gap-2 text-sm text-brand-greenDark dark:text-brand-greenLight font-medium">
                <CheckCircle2 className="h-4 w-4" />
                {t.auth.resendVerificationSuccess}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="border-brand-blue/60 dark:border-brand-blue/45 text-brand-ink dark:text-brand-blue hover:bg-brand-blue/30 dark:hover:bg-brand-blue/20"
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
    <EchoShell>
    <div className="h-full bg-[#ECE9E4] dark:bg-[#1F2121] flex items-center justify-center">

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
              onCreateClick={biographies.length === 0 ? () => setShowCreateModal(true) : undefined}
            />
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
    </EchoShell>
  );
}
