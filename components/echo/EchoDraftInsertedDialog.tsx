'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface EchoDraftInsertedDialogProps {
  open: boolean;
  title: string;
  description: string;
  openEditorLabel: string;
  continueLabel: string;
  sectionTitle: string;
  onOpenEditor: () => void;
  onContinue: () => void;
}

export function EchoDraftInsertedDialog({
  open,
  title,
  description,
  openEditorLabel,
  continueLabel,
  sectionTitle,
  onOpenEditor,
  onContinue,
}: EchoDraftInsertedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onContinue()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description.replace('{section}', sectionTitle)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onContinue}>
            {continueLabel}
          </Button>
          <Button type="button" onClick={onOpenEditor}>
            {openEditorLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
