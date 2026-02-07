'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { CheckCircle2, Circle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';

interface StatusManagerProps {
  biographyId: string;
  currentStatus: 'draft' | 'completed';
  onStatusChanged: (newStatus: 'draft' | 'completed') => void;
}

export function StatusManager({
  biographyId,
  currentStatus,
  onStatusChanged,
}: StatusManagerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { t } = useTranslation();

  const handleMarkComplete = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('biographies')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', biographyId);

      if (!error) {
        onStatusChanged('completed');
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setIsUpdating(false);
      setShowDialog(false);
    }
  };

  const handleMarkDraft = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('biographies')
        .update({
          status: 'draft',
          completed_at: null,
        })
        .eq('id', biographyId);

      if (!error) {
        onStatusChanged('draft');
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (currentStatus === 'completed') {
    return (
      <div className="px-4 sm:px-6 py-4 border-b border-border/30 bg-emerald-50 dark:bg-emerald-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                {t.status.biographyCompleted}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                {t.status.markedComplete}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkDraft}
            disabled={isUpdating}
          >
            {isUpdating ? t.status.updating : t.status.markAsDraft}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 sm:px-6 py-4 border-b border-border/30 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Circle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{t.status.draftBiography}</p>
              <p className="text-xs text-muted-foreground">
                {t.status.markCompleteWhenFinished}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowDialog(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            {t.status.markComplete}
          </Button>
        </div>
      </div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.status.confirmCompleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.status.confirmCompleteMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkComplete}
              disabled={isUpdating}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isUpdating ? t.status.updating : t.status.markComplete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
