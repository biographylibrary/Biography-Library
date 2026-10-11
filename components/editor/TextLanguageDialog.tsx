'use client';

import { Languages } from 'lucide-react';
import { EditorSidebarDialog } from './EditorSidebarDialog';
import { TextLanguageField } from './TextLanguageField';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface TextLanguageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  disabled?: boolean;
  onChange: (tag: string) => void;
}

export function TextLanguageDialog({
  open,
  onOpenChange,
  value,
  disabled = false,
  onChange,
}: TextLanguageDialogProps) {
  const { t } = useTranslation();

  return (
    <EditorSidebarDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.textLanguage.label}
      icon={<Languages className="h-5 w-5 text-primary" />}
    >
      <TextLanguageField value={value} disabled={disabled} onChange={onChange} />
    </EditorSidebarDialog>
  );
}
