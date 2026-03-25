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
import { TriangleAlert as AlertTriangle, Loader as Loader2 } from 'lucide-react';

interface PublishConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isChecking?: boolean;
  checkingText?: string;
}

export function PublishConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  isChecking = false,
  checkingText,
}: PublishConfirmationDialogProps) {
  const { language } = useTranslation();

  const title = {
    en: 'Publish Biography Definitively?',
    it: 'Pubblicare la Biografia Definitivamente?',
    fr: 'Publier la Biographie Définitivement?',
    de: 'Biografie Endgültig Veröffentlichen?',
  }[language] || 'Publish Biography Definitively?';

  const description = {
    en: 'This action is irreversible. Once published, you will not be able to edit this biography anymore. The biography will be locked and available for PDF export. Are you absolutely sure you want to proceed?',
    it: 'Questa azione è irreversibile. Una volta pubblicata, non potrai più modificare questa biografia. La biografia verrà bloccata e sarà disponibile per l\'esportazione in PDF. Sei assolutamente sicuro di voler procedere?',
    fr: 'Cette action est irréversible. Une fois publiée, vous ne pourrez plus modifier cette biographie. La biographie sera verrouillée et disponible pour l\'exportation en PDF. Êtes-vous absolument sûr de vouloir continuer?',
    de: 'Diese Aktion ist irreversibel. Nach der Veröffentlichung können Sie diese Biografie nicht mehr bearbeiten. Die Biografie wird gesperrt und für den PDF-Export verfügbar sein. Sind Sie absolut sicher, dass Sie fortfahren möchten?',
  }[language] || 'This action is irreversible.';

  const cancelText = {
    en: 'Cancel',
    it: 'Annulla',
    fr: 'Annuler',
    de: 'Abbrechen',
  }[language] || 'Cancel';

  const confirmText = {
    en: 'Yes, Publish Definitively',
    it: 'Sì, Pubblica Definitivamente',
    fr: 'Oui, Publier Définitivement',
    de: 'Ja, Endgültig Veröffentlichen',
  }[language] || 'Yes, Publish Definitively';

  const warningText = {
    en: 'Warning: This cannot be undone!',
    it: 'Attenzione: Questo non può essere annullato!',
    fr: 'Attention: Cela ne peut pas être annulé!',
    de: 'Warnung: Dies kann nicht rückgängig gemacht werden!',
  }[language] || 'Warning: This cannot be undone!';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>{description}</p>
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                {warningText}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {isChecking && (
          <div className="flex items-center gap-2 px-1 pb-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{checkingText}</span>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isChecking}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isChecking}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
