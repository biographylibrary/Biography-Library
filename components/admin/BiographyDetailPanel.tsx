'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Snowflake } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications-service';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export interface AdminBiographyRow {
  id: string;
  title: string;
  author_name: string | null;
  author_id: string;
  author_email: string | null;
  type: string;
  status: string;
  privacy: string;
  share_token: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  is_frozen: boolean;
}

interface SectionPreview {
  section_name: string;
  content: string;
}

type ConfirmAction = 'force_publish' | 'set_draft' | 'remove' | 'restore' | 'freeze' | 'unfreeze' | null;

interface BiographyDetailPanelProps {
  biography: AdminBiographyRow | null;
  onClose: () => void;
  onRefresh: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: t.admin.bioStatusDraft, className: 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700' },
    published: { label: t.admin.bioStatusPublished, className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800' },
    under_review: { label: t.admin.bioStatusUnderReview, className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800' },
    removed: { label: t.admin.bioStatusRemoved, className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800' },
  };
  const cfg = map[status] ?? map['draft'];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function PrivacyBadge({ privacy }: { privacy: string }) {
  const { t } = useTranslation();
  const map: Record<string, { label: string; className: string }> = {
    private: { label: t.admin.bioPrivatePrivacy, className: 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400' },
    family: { label: t.admin.bioFamilyPrivacy, className: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300' },
    public: { label: t.admin.bioPublicPrivacy, className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300' },
  };
  const cfg = map[privacy] ?? map['private'];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2">
      <span className="text-xs text-muted-foreground w-28 shrink-0 mt-0.5">{label}</span>
      <span className="text-sm text-foreground flex-1">{children}</span>
    </div>
  );
}

export function BiographyDetailPanel({ biography, onClose, onRefresh }: BiographyDetailPanelProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sections, setSections] = useState<SectionPreview[]>([]);
  const [sectionsLoaded, setSectionsLoaded] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [saving, setSaving] = useState(false);

  async function loadSections(id: string) {
    if (sectionsLoaded) return;
    try {
      const { data } = await supabase
        .from('biography_sections')
        .select('section_name, content')
        .eq('biography_id', id)
        .not('content', 'is', null)
        .neq('content', '')
        .order('section_name');
      setSections((data ?? []) as SectionPreview[]);
    } catch {
    }
    setSectionsLoaded(true);
  }

  function handleOpen(bio: AdminBiographyRow) {
    setSectionsLoaded(false);
    setSections([]);
    loadSections(bio.id);
  }

  async function logAction(actionType: string, targetId: string, details: Record<string, unknown>) {
    try {
      await supabase.from('admin_action_log').insert({
        performed_by: user!.id,
        action_type: actionType,
        target_type: 'biography',
        target_id: targetId,
        details,
      });
    } catch {
    }
  }

  async function performAction(action: ConfirmAction) {
    if (!biography || !action || !user) return;
    setSaving(true);
    try {
      if (action === 'freeze' || action === 'unfreeze') {
        const isFreezing = action === 'freeze';
        const updateData: Record<string, unknown> = {
          is_frozen: isFreezing,
          frozen_at: isFreezing ? new Date().toISOString() : null,
          frozen_reason: isFreezing ? 'admin_action' : null,
        };
        const { error } = await supabase
          .from('biographies')
          .update(updateData)
          .eq('id', biography.id);
        if (error) throw error;
        const notifyMsg = isFreezing ? t.admin.bioNotifyFrozen : t.admin.bioNotifyUnfrozen;
        await createNotification(biography.author_id, notifyMsg);
        await logAction(action, biography.id, { is_frozen: isFreezing });
        toast({ title: t.admin.bioActionSuccess });
        onRefresh();
        return;
      }

      const oldStatus = biography.status;
      let newStatus = '';
      let notifyMsg = '';

      switch (action) {
        case 'force_publish':
          newStatus = 'published';
          notifyMsg = t.admin.bioNotifyForcePublished;
          break;
        case 'set_draft':
          newStatus = 'draft';
          notifyMsg = t.admin.bioNotifySetDraft;
          break;
        case 'remove':
          newStatus = 'removed';
          notifyMsg = t.admin.bioNotifyRemoved;
          break;
        case 'restore':
          newStatus = 'draft';
          notifyMsg = t.admin.bioNotifyRestored;
          break;
      }

      const updateData: Record<string, unknown> = { status: newStatus };
      if (action === 'force_publish') {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('biographies')
        .update(updateData)
        .eq('id', biography.id);

      if (error) throw error;

      await createNotification(biography.author_id, notifyMsg);
      await logAction(action, biography.id, { old_status: oldStatus, new_status: newStatus });

      toast({ title: t.admin.bioActionSuccess });
      onRefresh();
    } catch {
      toast({ title: t.admin.bioActionError, variant: 'destructive' });
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  }

  const confirmConfig: Record<NonNullable<ConfirmAction>, { title: string; detail: string }> = {
    force_publish: { title: t.admin.bioActionForcePublishConfirm, detail: t.admin.bioActionForcePublishDetail },
    set_draft: { title: t.admin.bioActionSetDraftConfirm, detail: t.admin.bioActionSetDraftDetail },
    remove: { title: t.admin.bioActionRemoveConfirm, detail: t.admin.bioActionRemoveDetail },
    restore: { title: t.admin.bioActionRestoreConfirm, detail: t.admin.bioActionRestoreDetail },
    freeze: { title: t.admin.bioActionFreezeConfirm, detail: t.admin.bioActionFreezeDetail },
    unfreeze: { title: t.admin.bioActionUnfreezeConfirm, detail: t.admin.bioActionUnfreezeDetail },
  };

  return (
    <>
      <Sheet
        open={!!biography}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <SheetContent
          className="w-full sm:max-w-lg overflow-y-auto"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            if (biography) handleOpen(biography);
          }}
        >
          <SheetHeader className="mb-6">
            <SheetTitle className="font-serif text-xl">{t.admin.bioPanelTitle}</SheetTitle>
          </SheetHeader>

          {biography && (
            <div className="space-y-6">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  {t.admin.bioPanelSection1}
                </h3>
                <div className="rounded-xl border border-border bg-muted/20 px-4 divide-y divide-border/60">
                  <InfoRow label={t.admin.bioColTitle}>
                    <span className="font-medium">{biography.title || '—'}</span>
                  </InfoRow>
                  <InfoRow label={t.admin.bioPanelAuthor}>
                    {biography.author_name || '—'}
                  </InfoRow>
                  <InfoRow label={t.admin.bioPanelEmail}>
                    <span className="text-muted-foreground">{biography.author_email || '—'}</span>
                  </InfoRow>
                  <InfoRow label={t.admin.bioPanelType}>
                    {biography.type === 'autobiography' ? t.admin.bioTypeAutobiography : t.admin.bioTypeDeceased}
                  </InfoRow>
                  <InfoRow label={t.admin.bioPanelStatus}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={biography.status} />
                      {biography.is_frozen && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800">
                          <Snowflake className="h-3 w-3" />
                          {t.admin.bioStatusFrozen}
                        </span>
                      )}
                    </div>
                  </InfoRow>
                  <InfoRow label={t.admin.bioPanelPrivacy}>
                    <PrivacyBadge privacy={biography.privacy} />
                  </InfoRow>
                  <InfoRow label={t.admin.bioPanelCreated}>{fmt(biography.created_at)}</InfoRow>
                  <InfoRow label={t.admin.bioPanelUpdated}>{fmt(biography.updated_at)}</InfoRow>
                  {biography.share_token && (
                    <InfoRow label={t.admin.bioPanelShareToken}>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono break-all">
                        {biography.share_token}
                      </code>
                    </InfoRow>
                  )}
                </div>
              </section>

              <Separator />

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  {t.admin.bioPanelSection2}
                </h3>
                {sections.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">{t.admin.bioPanelNoContent}</p>
                ) : (
                  <div className="space-y-3">
                    {sections.map((s) => (
                      <div key={s.section_name} className="rounded-lg border border-border bg-muted/20 p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                          {s.section_name}
                        </p>
                        <p className="text-sm text-foreground line-clamp-4 leading-relaxed">
                          {s.content.slice(0, 500)}
                          {s.content.length > 500 && '…'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4">
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <Link href={`/biography/${biography.id}/view`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      {t.admin.bioPanelOpenFull}
                    </Link>
                  </Button>
                </div>
              </section>

              <Separator />

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  {t.admin.bioPanelSection3}
                </h3>
                <div className="flex flex-col gap-2">
                  {biography.status !== 'published' && (
                    <Button
                      variant="outline"
                      className="justify-start gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                      onClick={() => setConfirmAction('force_publish')}
                      disabled={saving}
                    >
                      {t.admin.bioActionForcePublish}
                    </Button>
                  )}
                  {biography.status !== 'draft' && biography.status !== 'removed' && (
                    <Button
                      variant="outline"
                      className="justify-start gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
                      onClick={() => setConfirmAction('set_draft')}
                      disabled={saving}
                    >
                      {t.admin.bioActionSetDraft}
                    </Button>
                  )}
                  {biography.status === 'draft' && (
                    <Button
                      variant="outline"
                      className="justify-start gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
                      onClick={() => setConfirmAction('set_draft')}
                      disabled={true}
                      style={{ display: 'none' }}
                    >
                      {t.admin.bioActionSetDraft}
                    </Button>
                  )}
                  {biography.status !== 'removed' && (
                    <Button
                      variant="outline"
                      className="justify-start gap-2 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
                      onClick={() => setConfirmAction('remove')}
                      disabled={saving}
                    >
                      {t.admin.bioActionRemove}
                    </Button>
                  )}
                  {biography.status === 'removed' && (
                    <Button
                      variant="outline"
                      className="justify-start gap-2 border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/30"
                      onClick={() => setConfirmAction('restore')}
                      disabled={saving}
                    >
                      {t.admin.bioActionRestore}
                    </Button>
                  )}
                  {!biography.is_frozen && (
                    <Button
                      variant="outline"
                      className="justify-start gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30"
                      onClick={() => setConfirmAction('freeze')}
                      disabled={saving}
                    >
                      <Snowflake className="h-4 w-4" />
                      {t.admin.bioActionFreeze}
                    </Button>
                  )}
                  {biography.is_frozen && (
                    <Button
                      variant="outline"
                      className="justify-start gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30"
                      onClick={() => setConfirmAction('unfreeze')}
                      disabled={saving}
                    >
                      <Snowflake className="h-4 w-4" />
                      {t.admin.bioActionUnfreeze}
                    </Button>
                  )}
                </div>
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction ? confirmConfig[confirmAction].title : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction ? confirmConfig[confirmAction].detail : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t.admin.bioActionCancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={() => performAction(confirmAction)}
            >
              {saving ? '…' : t.admin.bioActionConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
