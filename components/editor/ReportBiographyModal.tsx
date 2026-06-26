'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n/i18n-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CircleAlert as AlertCircle } from 'lucide-react';

type ReportType =
  | 'level1_content'
  | 'level2_content'
  | 'living_person'
  | 'right_to_oblivion'
  | 'impersonation'
  | 'copyright'
  | 'other';

interface Props {
  biographyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ReportBiographyModal({ biographyId, open, onOpenChange, onSuccess }: Props) {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState<ReportType | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState('');

  const reportTypes: { value: ReportType; label: string }[] = [
    { value: 'level1_content', label: t.view.reportTypeLevel1 },
    { value: 'level2_content', label: t.view.reportTypeLevel2 },
    { value: 'living_person', label: t.view.reportTypeLivingPerson },
    { value: 'right_to_oblivion', label: t.view.reportTypeRightToOblivion },
    { value: 'impersonation', label: t.view.reportTypeImpersonation },
    { value: 'copyright', label: t.view.reportTypeCopyright },
    { value: 'other', label: t.view.reportTypeOther },
  ];

  const handleClose = (nextOpen: boolean) => {
    if (!submitting) {
      if (!nextOpen) {
        setReportType('');
        setDescription('');
        setInlineError('');
      }
      onOpenChange(nextOpen);
    }
  };

  const handleSubmit = async () => {
    if (!reportType) return;
    setSubmitting(true);
    setInlineError('');

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      setInlineError(t.view.reportError);
      setSubmitting(false);
      return;
    }

    const res = await fetch('/api/moderation/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        biographyId,
        reportType,
        description: description.trim() || undefined,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      setInlineError(t.view.reportError);
      return;
    }

    setReportType('');
    setDescription('');
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.view.reportModalTitle}</DialogTitle>
          <DialogDescription>{t.view.reportModalSubtitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="report-type">{t.view.reportTypeLabel}</Label>
            <Select
              value={reportType}
              onValueChange={(v) => setReportType(v as ReportType)}
            >
              <SelectTrigger id="report-type" className="w-full">
                <SelectValue placeholder={t.view.reportTypePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-description">{t.view.reportDescriptionLabel}</Label>
            <Textarea
              id="report-description"
              placeholder={t.view.reportDescriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </p>
          </div>

          {inlineError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{inlineError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={submitting}
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!reportType || submitting}
            >
              {submitting ? t.view.reportSubmitting : t.view.reportSubmit}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
