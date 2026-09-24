'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const COPY = {
  it: {
    hidden: 'La scheda non è nel catalogo pubblico.',
    resubmit: 'Ho finito, rimandala in revisione',
    appeal: 'Presenta ricorso',
    sent: 'Inviato.',
    failed: 'Non è riuscito. Riprova.',
  },
  en: {
    hidden: 'This biography is not in the public catalog.',
    resubmit: 'I am done, send it back for review',
    appeal: 'File an appeal',
    sent: 'Sent.',
    failed: 'That did not work. Try again.',
  },
  fr: {
    hidden: 'Cette fiche n’est pas dans le catalogue public.',
    resubmit: 'J’ai terminé, renvoyez-la en révision',
    appeal: 'Former un recours',
    sent: 'Envoyé.',
    failed: 'Cela n’a pas fonctionné. Réessayez.',
  },
  de: {
    hidden: 'Diese Biografie ist nicht im öffentlichen Katalog.',
    resubmit: 'Ich bin fertig, zur Prüfung zurücksenden',
    appeal: 'Einspruch einlegen',
    sent: 'Gesendet.',
    failed: 'Das hat nicht geklappt. Bitte erneut versuchen.',
  },
} as const;

export function ReportDeadlineBanner({
  biographyId,
  status,
  language,
}: {
  biographyId: string;
  status: string;
  language: string;
}) {
  const copy = COPY[(language.split('-')[0] as keyof typeof COPY)] ?? COPY.en;
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const show = status === 'revision_requested' || status === 'revision_overdue' || status === 'suspended_pending_verification' || status === 'removed';
  if (!show) return null;

  async function post(path: string, body: Record<string, string>) {
    setBusy(true);
    setNote('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('no_session');
      const res = await fetch(path, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('failed');
      setNote(copy.sent);
    } catch {
      setNote(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shrink-0 border-b border-brand-mustardDark/40 bg-brand-mustardLight/40 px-4 py-3 dark:bg-brand-mustardDark/20">
      <div className="max-w-5xl mx-auto space-y-2">
        <p className="text-sm text-brand-ink dark:text-brand-beigeLight">{copy.hidden}</p>
        {status === 'revision_requested' && (
          <Button size="sm" disabled={busy} onClick={() => post('/api/moderation/resubmit', { biographyId })}>
            {copy.resubmit}
          </Button>
        )}
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
        <Button
          size="sm"
          variant="outline"
          disabled={busy || !reason.trim()}
          onClick={() => post('/api/moderation/appeal', { biographyId, reason: reason.trim() })}
        >
          {copy.appeal}
        </Button>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
    </div>
  );
}
