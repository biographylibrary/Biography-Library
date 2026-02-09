'use client';

import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Loader2 } from 'lucide-react';

interface DeleteAccountDialogProps {
  biographyCount: number;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function DeleteAccountDialog({
  biographyCount,
  isDeleting,
  onConfirm,
}: DeleteAccountDialogProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [isChecked, setIsChecked] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setIsChecked(false);
      setConfirmText('');
    }
  }, [isOpen]);

  const handleContinue = () => {
    setStep(2);
  };

  const handleConfirm = () => {
    onConfirm();
    setIsOpen(false);
  };

  const isConfirmValid = isChecked && confirmText.toUpperCase() === 'DELETE MY ACCOUNT';

  const bioCountMessage = t.deleteDialog.bioCount.replace('{count}', String(biographyCount));

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <button className="text-sm text-muted-foreground hover:text-destructive underline underline-offset-4 transition-colors">
          {t.deleteDialog.deleteAccountLink}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        {step === 1 ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.deleteDialog.accountModal1Title}</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>{t.deleteDialog.accountModal1Message}</p>
                {biographyCount > 0 && (
                  <p className="font-medium text-foreground">
                    {bioCountMessage}
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t.deleteDialog.buttonCancel}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleContinue}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {t.deleteDialog.buttonContinue}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.deleteDialog.accountModal2Title}</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p className="whitespace-pre-line">{t.deleteDialog.accountModal2Message}</p>

                <div className="flex items-start space-x-2 pt-2">
                  <Checkbox
                    id="confirm-all-data"
                    checked={isChecked}
                    onCheckedChange={(checked) => setIsChecked(checked === true)}
                  />
                  <Label
                    htmlFor="confirm-all-data"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {t.deleteDialog.checkboxAllData}
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-account-text" className="text-sm">
                    {t.deleteDialog.accountInputPlaceholder}
                  </Label>
                  <Input
                    id="confirm-account-text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={t.deleteDialog.accountInputPlaceholder}
                    className="font-mono text-xs"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t.deleteDialog.buttonCancel}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirm}
                disabled={!isConfirmValid || isDeleting}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.biography.deleting}
                  </>
                ) : (
                  t.deleteDialog.buttonDeleteAccount
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
