'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface FreeflowImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentContent: string;
  onImport: (text: string) => void;
}

export function FreeflowImportModal({
  open,
  onOpenChange,
  currentContent,
  onImport,
}: FreeflowImportModalProps) {
  const { t } = useTranslation();
  const [pastedText, setPastedText] = useState('');
  const [showReplaceWarning, setShowReplaceWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPastedText(text || '');
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirm = () => {
    if (!pastedText.trim()) return;
    if (currentContent.trim()) {
      setShowReplaceWarning(true);
    } else {
      doImport();
    }
  };

  const doImport = () => {
    onImport(pastedText);
    setPastedText('');
    setShowReplaceWarning(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    setPastedText('');
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.editor.bookStructureImportTitle}</DialogTitle>
            <DialogDescription>{t.editor.bookStructureImportDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={t.editor.bookStructureImportPastePlaceholder}
              className="min-h-[200px] resize-none text-sm"
            />

            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">{t.editor.bookStructureImportOrFile}</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {t.editor.bookStructureImportSelectFile}
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              {t.editor.bookStructureImportCancel}
            </Button>
            <Button onClick={handleConfirm} disabled={!pastedText.trim()}>
              {t.editor.bookStructureImportConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showReplaceWarning} onOpenChange={setShowReplaceWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.editor.bookStructureImportTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.editor.bookStructureImportReplaceWarning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowReplaceWarning(false)}>
              {t.editor.bookStructureImportCancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={doImport}>
              {t.editor.bookStructureImportReplace}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
