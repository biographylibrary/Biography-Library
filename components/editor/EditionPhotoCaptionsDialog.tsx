'use client';

import { Images } from 'lucide-react';
import { EditorSidebarDialog } from './EditorSidebarDialog';
import { EditionPhotoCaptionsPanel } from './EditionPhotoCaptionsPanel';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface EditionPhotoCaptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editionId: string;
  originalId: string;
  recordLanguageTag: string | null;
  readOnly?: boolean;
  readOnlyReason?: string;
}

export function EditionPhotoCaptionsDialog({
  open,
  onOpenChange,
  editionId,
  originalId,
  recordLanguageTag,
  readOnly = false,
  readOnlyReason,
}: EditionPhotoCaptionsDialogProps) {
  const { t } = useTranslation();

  return (
    <EditorSidebarDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.photos.editionCaptionsTitle}
      icon={<Images className="h-5 w-5 text-primary" />}
    >
      {open ? (
        <EditionPhotoCaptionsPanel
          editionId={editionId}
          originalId={originalId}
          recordLanguageTag={recordLanguageTag}
          readOnly={readOnly}
          readOnlyReason={readOnlyReason}
        />
      ) : null}
    </EditorSidebarDialog>
  );
}
