'use client';

import { Landmark } from 'lucide-react';
import { EditorSidebarDialog } from './EditorSidebarDialog';
import { PermanencePanel } from './permanence/PermanencePanel';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface PermanenceDialogProps {
  biographyId: string;
  nameAsWritten: string;
  recordLanguageTag: string | null;
  recordScript: string | null;
  biographyType: 'autobiography' | 'memorial';
  disabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNameSaved?: (name: string) => void;
}

export function PermanenceDialog({
  biographyId,
  nameAsWritten,
  recordLanguageTag,
  recordScript,
  biographyType,
  disabled = false,
  open,
  onOpenChange,
  onNameSaved,
}: PermanenceDialogProps) {
  const { t } = useTranslation();

  return (
    <EditorSidebarDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        biographyType === 'autobiography' ? t.permanence.titleSelf : t.permanence.title
      }
      icon={<Landmark className="h-5 w-5 text-primary" />}
      bodyClassName="px-4 py-4 flex flex-col min-h-0 overflow-hidden"
      bodyScroll={false}
    >
      {open && (
        <PermanencePanel
          biographyId={biographyId}
          nameAsWritten={nameAsWritten}
          recordLanguageTag={recordLanguageTag}
          recordScript={recordScript}
          showDeath={biographyType === 'memorial'}
          isAutobiography={biographyType === 'autobiography'}
          disabled={disabled}
          hideTitle
          onNameSaved={onNameSaved}
        />
      )}
    </EditorSidebarDialog>
  );
}
