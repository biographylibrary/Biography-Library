'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface ApertusReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  biographyId: string;
  sectionKey: string;
  sectionTitle: string;
}

export function ApertusReviewDialog({
  open,
  onOpenChange,
  biographyId,
  sectionKey,
  sectionTitle,
}: ApertusReviewDialogProps) {
  const { session } = useAuth();
  const { t, language } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState('');
  const [modelUsed, setModelUsed] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchReview = useCallback(async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);
    setReview('');

    try {
      const { data: { session: fresh } } = await supabase.auth.getSession();
      const token = fresh?.access_token ?? session.access_token;

      const res = await fetch('/api/agents/apertus-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          biographyId,
          sectionKey,
          language,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json.error as string) || t.aiReview.apertusError);
        return;
      }

      setReview((json.review as string) ?? '');
      setModelUsed((json.modelUsed as string) ?? '');
    } catch {
      setError(t.aiReview.apertusError);
    } finally {
      setLoading(false);
    }
  }, [session, biographyId, sectionKey, language, t.aiReview.apertusError]);

  useEffect(() => {
    if (open) {
      void fetchReview();
    } else {
      setReview('');
      setModelUsed('');
      setError(null);
    }
  }, [open, fetchReview]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.aiReview.apertusTitle}</DialogTitle>
          <DialogDescription>
            {t.aiReview.apertusSubtitle.replace('{section}', sectionTitle)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">{t.aiReview.apertusLoading}</span>
            </div>
          )}

          {!loading && error && (
            <p className="text-sm text-destructive py-4">{error}</p>
          )}

          {!loading && !error && review && (
            <ScrollArea className="max-h-[50vh] pr-3">
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{review}</div>
              {modelUsed && (
                <p className="text-xs text-muted-foreground mt-4 pt-3 border-t">
                  {t.aiReview.apertusModelNote.replace('{model}', modelUsed)}
                </p>
              )}
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {!loading && review && (
            <Button type="button" variant="outline" size="sm" onClick={() => void fetchReview()}>
              {t.aiReview.regenerate}
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t.aiReview.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
