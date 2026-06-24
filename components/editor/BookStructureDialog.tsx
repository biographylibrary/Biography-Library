'use client';

import { BookOpen } from 'lucide-react';
import { EditorSidebarDialog } from './EditorSidebarDialog';
import { BookStructurePanel } from './BookStructurePanel';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface BookStructureDialogProps {
  biographyId: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookStructureDialog({
  biographyId,
  userId,
  open,
  onOpenChange,
}: BookStructureDialogProps) {
  const { t } = useTranslation();

  return (
    <EditorSidebarDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.editor.bookStructureTitle}
      icon={<BookOpen className="h-5 w-5 text-primary" />}
      bodyClassName="px-4 py-4"
    >
      {open && (
        <BookStructurePanel biographyId={biographyId} userId={userId} hideTitle />
      )}
    </EditorSidebarDialog>
  );
}
