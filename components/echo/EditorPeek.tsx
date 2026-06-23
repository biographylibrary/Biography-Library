'use client';

import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { Button } from '@/components/ui/button';
import { X, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface EditorPeekProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionTitle: string;
  text: string;
  onTextChange: (html: string) => void;
  editorFontSize?: number;
  onEditorFontSizeChange?: (size: number) => void;
  isPublished?: boolean;
}

export function EditorPeek({
  open,
  onOpenChange,
  sectionTitle,
  text,
  onTextChange,
  editorFontSize = 16,
  onEditorFontSizeChange,
  isPublished = false,
}: EditorPeekProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 bg-background border-t shadow-2xl transition-transform duration-300 ease-out flex flex-col',
        open ? 'translate-y-0' : 'translate-y-full pointer-events-none'
      )}
      style={{ maxHeight: '50vh' }}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-xs text-muted-foreground">{t.common.edit}</p>
          <h2 className="font-serif text-lg font-medium truncate">{sectionTitle}</h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => onOpenChange(false)}
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden px-4 pb-4">
        <RichTextEditor
          content={text}
          onChange={onTextChange}
          editorFontSize={editorFontSize}
          onEditorFontSizeChange={onEditorFontSizeChange}
          isPublished={isPublished}
        />
      </div>
    </div>
  );
}
