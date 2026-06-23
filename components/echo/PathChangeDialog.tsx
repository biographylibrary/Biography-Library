'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { exportAsDOCX, exportAsPlainText } from '@/lib/export-utils';
import { Loader as Loader2 } from 'lucide-react';

interface PathChangeDialogProps {
  open: boolean;
  fromMode: 'sections' | 'freeflow';
  toMode: 'sections' | 'freeflow';
  biographyTitle: string;
  biographySnapshot: {
    title: string;
    author_name: string;
    created_at: string;
    biography_mode: 'sections' | 'freeflow';
    content: Record<string, { text: string }>;
    content_freeflow?: string;
    sections: Array<{ key: string; title: string; content: string }>;
  };
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function PathChangeDialog({
  open,
  fromMode,
  toMode,
  biographyTitle,
  biographySnapshot,
  onConfirm,
  onCancel,
}: PathChangeDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    const bioData = {
      title: biographySnapshot.title,
      author_name: biographySnapshot.author_name,
      created_at: biographySnapshot.created_at,
      biography_mode: biographySnapshot.biography_mode,
      content: biographySnapshot.content,
      content_freeflow: biographySnapshot.content_freeflow,
    };
    if (fromMode === 'freeflow') {
      await exportAsPlainText(bioData, [], false);
      await exportAsDOCX(bioData, [], false);
    } else {
      await exportAsPlainText(bioData, biographySnapshot.sections, false);
      await exportAsDOCX(bioData, biographySnapshot.sections, false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.echo.changePathTitle}</DialogTitle>
          <DialogDescription>{t.echo.changePathDescription}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {fromMode === 'sections' ? 'Sezioni → Testo libero' : 'Testo libero → Sezioni'}
        </p>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={() => void handleExport()}>
            {t.echo.exportBeforeChange}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t.common.cancel}
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.echo.confirmPathChange}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
