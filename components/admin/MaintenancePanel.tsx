'use client';

import { useCallback, useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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

type MaintenanceStatus = {
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  updatedByEmail: string | null;
  updatedByName: string | null;
};

async function authHeaders(): Promise<HeadersInit | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return { Authorization: `Bearer ${session.access_token}` };
}

export function MaintenancePanel() {
  const { t, language } = useTranslation();
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const headers = await authHeaders();
    if (!headers) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/admin/maintenance', { headers });
      if (!res.ok) {
        setError(t.admin.maintenanceLoadError);
        return;
      }
      setStatus((await res.json()) as MaintenanceStatus);
    } catch {
      setError(t.admin.maintenanceLoadError);
    } finally {
      setLoading(false);
    }
  }, [t.admin.maintenanceLoadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyEnabled = async (enabled: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const headers = await authHeaders();
      if (!headers) {
        setError(t.admin.maintenanceSaveError);
        return;
      }
      const res = await fetch('/api/admin/maintenance', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        setError(t.admin.maintenanceSaveError);
        return;
      }
      setStatus((await res.json()) as MaintenanceStatus);
    } catch {
      setError(t.admin.maintenanceSaveError);
    } finally {
      setSaving(false);
    }
  };

  const onToggle = (next: boolean) => {
    if (next) {
      setConfirmOpen(true);
      return;
    }
    void applyEnabled(false);
  };

  const formatWhen = (iso: string | null) => {
    if (!iso) return t.admin.maintenanceNever;
    try {
      return new Intl.DateTimeFormat(language, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const who =
    status?.updatedByName ||
    status?.updatedByEmail ||
    (status?.updatedBy ? status.updatedBy.slice(0, 8) : null);

  return (
    <>
      <section>
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
          {t.admin.maintenanceSection}
        </h2>
        <div className="rounded-xl border border-border bg-card px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl tone-warning shrink-0">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-sm text-foreground">{t.admin.maintenanceTitle}</p>
                <p className="text-sm text-muted-foreground mt-1">{t.admin.maintenanceDescription}</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="maintenance-toggle"
                  checked={status?.enabled ?? false}
                  disabled={loading || saving || status === null}
                  onCheckedChange={onToggle}
                />
                <Label htmlFor="maintenance-toggle" className="text-sm cursor-pointer">
                  {status?.enabled
                    ? t.admin.maintenanceEnabledLabel
                    : t.admin.maintenanceDisabledLabel}
                </Label>
              </div>
              {!loading && status && (
                <p className="text-xs text-muted-foreground">
                  {t.admin.maintenanceLastChanged
                    .replace('{who}', who ?? t.admin.maintenanceUnknownActor)
                    .replace('{when}', formatWhen(status.updatedAt))}
                </p>
              )}
              {error && (
                <p className="notice tone-danger text-sm px-3 py-2 inline-block">{error}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.maintenanceConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.admin.maintenanceConfirmDetail}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t.admin.cancelAction}</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={() => {
                setConfirmOpen(false);
                void applyEnabled(true);
              }}
            >
              {t.admin.confirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
