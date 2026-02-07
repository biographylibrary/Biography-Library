'use client';

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
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Loader2 } from 'lucide-react';
import type { Biography } from '@/lib/biographies';

interface DeleteBiographyDialogProps {
  biography: Biography | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteBiographyDialog({
  biography,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteBiographyDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={!!biography} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.biography.deleteTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.biography.deleteMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {t.common.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.biography.deleting}
              </>
            ) : (
              t.common.delete
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
