'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TriangleAlert as AlertTriangle, Loader as Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { exportAsPlainText, exportAsDOCX } from '@/lib/export-utils';

interface BiographySnapshot {
  title: string;
  author_name: string;
  created_at: string;
  biography_mode: 'sections' | 'freeflow';
  content: Record<string, { text: string }>;
  content_freeflow?: string;
  sections: Array<{ key: string; title: string; content: string }>;
}

interface ModeSwitchWarningDialogProps {
  open: boolean;
  fromMode: 'sections' | 'freeflow';
  toMode: 'sections' | 'freeflow';
  biography: BiographySnapshot;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

type Step = 1 | 2 | 3;

export function ModeSwitchWarningDialog({
  open,
  fromMode,
  toMode,
  biography,
  onConfirm,
  onCancel,
}: ModeSwitchWarningDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(1);
  const [deleteCheckbox, setDeleteCheckbox] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const fromLabel = fromMode === 'sections'
    ? t.modeSwitchWarning.fromSections
    : t.modeSwitchWarning.fromFreeflow;
  const toLabel = toMode === 'sections'
    ? t.modeSwitchWarning.toSections
    : t.modeSwitchWarning.toFreeflow;

  const interpolate = (template: string) =>
    template.replace(/\{from\}/g, fromLabel).replace(/\{to\}/g, toLabel);

  const handleClose = () => {
    setStep(1);
    setDeleteCheckbox(false);
    onCancel();
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const bioData = {
        title: biography.title,
        author_name: biography.author_name,
        content: biography.content,
        content_freeflow: biography.content_freeflow,
        biography_mode: fromMode,
        created_at: biography.created_at,
      };

      if (fromMode === 'freeflow') {
        await exportAsPlainText(bioData, [], false);
        await exportAsDOCX(bioData, [], false);
      } else {
        await exportAsPlainText(bioData, biography.sections, false);
        await exportAsDOCX(bioData, biography.sections, false);
      }

      setStep(3);
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      setStep(1);
      setDeleteCheckbox(false);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 1 && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <DialogTitle className="text-amber-900 dark:text-amber-200">
                  {t.modeSwitchWarning.step1Title}
                </DialogTitle>
              </div>
              <DialogDescription className="text-sm leading-relaxed pt-1">
                {interpolate(t.modeSwitchWarning.step1Message)}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              {interpolate(t.modeSwitchWarning.step1Message)}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleClose} className="sm:mr-auto">
                {t.modeSwitchWarning.goBack}
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white border-0"
                onClick={() => setStep(2)}
              >
                {t.modeSwitchWarning.step1Confirm}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>{t.modeSwitchWarning.step2Title}</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed pt-1">
                {interpolate(t.modeSwitchWarning.step2Message)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <Button
                className="w-full"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.modeSwitchWarning.step2Exporting}
                  </>
                ) : (
                  t.modeSwitchWarning.step2ExportButton
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setStep(3)}
                disabled={isExporting}
              >
                {t.modeSwitchWarning.step2SkipButton}
              </Button>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep(1)} disabled={isExporting}>
                {t.modeSwitchWarning.goBack}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <DialogTitle className="text-destructive">
                  {interpolate(t.modeSwitchWarning.step3Title)}
                </DialogTitle>
              </div>
              <DialogDescription className="text-sm leading-relaxed pt-1">
                {interpolate(t.modeSwitchWarning.step3Message)}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-4 py-4 space-y-4">
              <p className="text-sm text-destructive leading-relaxed">
                {interpolate(t.modeSwitchWarning.step3Message)}
              </p>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="delete-confirm"
                  checked={deleteCheckbox}
                  onCheckedChange={(checked) => setDeleteCheckbox(checked as boolean)}
                />
                <Label
                  htmlFor="delete-confirm"
                  className="text-sm leading-relaxed cursor-pointer text-foreground"
                >
                  {t.modeSwitchWarning.step3Checkbox}
                </Label>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="sm:mr-auto" disabled={isConfirming}>
                {t.modeSwitchWarning.step3Cancel}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={!deleteCheckbox || isConfirming}
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.biography.creating}
                  </>
                ) : (
                  t.modeSwitchWarning.step3Confirm
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
