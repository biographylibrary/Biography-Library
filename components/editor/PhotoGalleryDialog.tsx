'use client';

import { Images } from 'lucide-react';
import { EditorSidebarDialog } from './EditorSidebarDialog';
import { PhotoGalleryPanel } from './PhotoGalleryPanel';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface PhotoGalleryDialogProps {
  biographyId: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhotoGalleryDialog({
  biographyId,
  userId,
  open,
  onOpenChange,
}: PhotoGalleryDialogProps) {
  const { t } = useTranslation();

  return (
    <EditorSidebarDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.photos.panelTitle}
      icon={<Images className="h-5 w-5 text-primary" />}
      bodyClassName="p-0"
    >
      {open ? (
        <PhotoGalleryPanel biographyId={biographyId} userId={userId} embedded />
      ) : null}
    </EditorSidebarDialog>
  );
}
