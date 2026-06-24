'use client';

import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export const editorSidebarDialogContentClass =
  'max-w-2xl w-[calc(100vw-2rem)] sm:w-full p-0 gap-0 flex flex-col';

export const editorSidebarDialogContentStyle = { maxHeight: '85svh' } as const;

interface EditorSidebarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  icon?: ReactNode;
  headerExtra?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  footer?: ReactNode;
}

export function EditorSidebarDialog({
  open,
  onOpenChange,
  title,
  icon,
  headerExtra,
  children,
  bodyClassName = 'px-6 pb-6 pt-4',
  footer,
}: EditorSidebarDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={editorSidebarDialogContentClass}
        style={editorSidebarDialogContentStyle}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 text-lg m-0">
              {icon}
              {title}
            </DialogTitle>
            {headerExtra}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className={bodyClassName}>{children}</div>
        </ScrollArea>

        {footer}
      </DialogContent>
    </Dialog>
  );
}
