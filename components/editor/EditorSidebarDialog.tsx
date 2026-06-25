'use client';

import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export const editorSidebarDialogContentClass =
  'max-w-2xl w-[calc(100vw-2rem)] sm:w-full p-0 gap-0 !flex !flex-col max-h-[85svh] !overflow-hidden';

export const editorSidebarDialogContentStyle = { maxHeight: '85svh' } as const;

interface EditorSidebarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  icon?: ReactNode;
  headerExtra?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  /** When false, body does not scroll — child must manage overflow (e.g. fixed footer). */
  bodyScroll?: boolean;
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
  bodyScroll = true,
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

        {bodyScroll ? (
          <div className="overflow-y-auto overscroll-contain min-h-[12rem] max-h-[calc(85svh-4.75rem)]">
            <div className={bodyClassName}>{children}</div>
          </div>
        ) : (
          <div className="flex min-h-[12rem] max-h-[calc(85svh-4.75rem)] flex-col overflow-hidden">
            <div className={cn(bodyClassName, 'flex flex-col flex-1 min-h-0 overflow-hidden')}>
              {children}
            </div>
          </div>
        )}

        {footer}
      </DialogContent>
    </Dialog>
  );
}
