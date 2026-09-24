'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const TYPES = [
  'living_person',
  'illegal_content',
  'right_to_oblivion',
  'sensitive_personal_data',
  'defamation',
  'copyright',
  'impersonation',
  'other',
  'level1_content',
] as const;

interface EmailChannelReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function EmailChannelReportDialog({ open, onOpenChange, onCreated }: EmailChannelReportDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [biographyId, setBiographyId] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [reportType, setReportType] = useState<string>('living_person');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const labels: Record<string, string> = {
    living_person: t.admin.typeLivingPerson,
    illegal_content: t.admin.typeIllegalContent,
    right_to_oblivion: t.admin.typeRightToOblivion,
    sensitive_personal_data: t.admin.typeSensitivePersonalData,
    defamation: t.admin.typeDefamation,
    copyright: t.admin.typeCopyright,
    impersonation: t.admin.typeImpersonation,
    other: t.admin.typeOther,
    level1_content: t.admin.typeLevel1,
  };

  async function submit() {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('no_session');
      const res = await fetch('/api/admin/moderation/email-report', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          biographyId: biographyId.trim(),
          reportType,
          reporterName: reporterName.trim(),
          reporterEmail: reporterEmail.trim(),
          description: description.trim(),
        }),
      });
      if (!res.ok) throw new Error('failed');
      toast({ title: t.admin.emailReportSuccess });
      setBiographyId('');
      setReporterName('');
      setReporterEmail('');
      setDescription('');
      onOpenChange(false);
      onCreated();
    } catch {
      toast({ title: t.admin.emailReportError, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.admin.emailReportTitle}</DialogTitle>
          <DialogDescription>{t.admin.emailReportOpen}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="email-report-bio">{t.admin.emailReportBiographyId}</Label>
            <Input id="email-report-bio" value={biographyId} onChange={(e) => setBiographyId(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email-report-name">{t.admin.emailReportName}</Label>
            <Input id="email-report-name" value={reporterName} onChange={(e) => setReporterName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email-report-email">{t.admin.emailReportEmail}</Label>
            <Input id="email-report-email" type="email" value={reporterEmail} onChange={(e) => setReporterEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t.admin.filterType}</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{labels[type]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="email-report-body">{t.admin.emailReportDescription}</Label>
            <Textarea id="email-report-body" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={submit}
              disabled={submitting || !biographyId.trim() || !reporterName.trim() || !reporterEmail.trim()}
            >
              {t.admin.emailReportSubmit}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
