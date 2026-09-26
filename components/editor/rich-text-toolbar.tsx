'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/lib/i18n/i18n-context';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  RemoveFormatting,
  ChevronDown,
  Type,
  Undo2,
  SwatchBook,
} from 'lucide-react';
import { EditorFontSizeControl } from './editor-font-size-control';
import { EditorAiToolsMenu, type EditorAiToolsMenuProps } from './editor-ai-tools-menu';
import { AiUsageIndicator } from './ai-usage-indicator';
import { cn } from '@/lib/utils';
import { IconHint } from '@/components/ui/icon-hint';

type MobileStyleKey = 'bold' | 'italic' | 'title' | 'bullet' | 'number' | 'quote';

const MOBILE_STYLE_ORDER: MobileStyleKey[] = [
  'title',
  'bullet',
  'number',
  'quote',
  'bold',
  'italic',
];

function isMobileStyleActive(editor: Editor, key: MobileStyleKey): boolean {
  switch (key) {
    case 'bold':
      return editor.isActive('bold');
    case 'italic':
      return editor.isActive('italic');
    case 'title':
      return editor.isActive('heading', { level: 1 });
    case 'bullet':
      return editor.isActive('bulletList');
    case 'number':
      return editor.isActive('orderedList');
    case 'quote':
      return editor.isActive('blockquote');
  }
}

function activeMobileStyles(editor: Editor): MobileStyleKey[] {
  return MOBILE_STYLE_ORDER.filter((key) => isMobileStyleActive(editor, key));
}

interface RichTextToolbarProps {
  editor: Editor | null;
  biographyId?: string;
  editorFontSize?: number;
  onEditorFontSizeChange?: (size: number) => void;
  aiTools?: Omit<EditorAiToolsMenuProps, 'className' | 'buttonClassName'>;
  aiUsageRefresh?: number;
  countsOnly?: boolean;
  undoLastChange?: { label: string; hint: string; onUndo: () => void };
}

export function RichTextToolbar({
  editor,
  biographyId,
  editorFontSize = 16,
  onEditorFontSizeChange,
  aiTools,
  aiUsageRefresh,
  countsOnly = false,
  undoLastChange,
}: RichTextToolbarProps) {
  const { t } = useTranslation();
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const [styleEpoch, setStyleEpoch] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const refresh = () => setStyleEpoch((n) => n + 1);
    editor.on('transaction', refresh);
    return () => {
      editor.off('transaction', refresh);
    };
  }, [editor]);

  const activeStyles = useMemo(
    () => (editor ? activeMobileStyles(editor) : []),
    [editor, styleEpoch],
  );

  if (!editor) {
    return null;
  }

  const mobileStyleLabel: Record<MobileStyleKey, string> = {
    bold: t.formatting.styleBold,
    italic: t.formatting.styleItalic,
    title: t.formatting.styleTitle,
    bullet: t.formatting.styleBullet,
    number: t.formatting.styleNumber,
    quote: t.formatting.styleQuote,
  };

  const applyMobileStyle = (key: MobileStyleKey) => {
    const saved = savedSelectionRef.current;
    const chain = editor.chain();
    if (saved) chain.setTextSelection(saved);
    chain.focus();
    if (key === 'bold') chain.toggleBold();
    else if (key === 'italic') chain.toggleItalic();
    else if (key === 'title') chain.toggleHeading({ level: 1 });
    else if (key === 'bullet') chain.toggleBulletList();
    else if (key === 'number') chain.toggleOrderedList();
    else chain.toggleBlockquote();
    chain.run();
  };

  const usageAndCount = (
    <div
      data-tour-id={aiTools?.aiEnabled ? 'ai-credits' : undefined}
      className="ml-auto flex h-8 flex-col items-end justify-center gap-px shrink-0 pl-1"
    >
      {aiTools?.aiEnabled && <AiUsageIndicator refreshTrigger={aiUsageRefresh} />}
      <span className="text-[9px] md:text-[10px] leading-none text-muted-foreground tabular-nums whitespace-nowrap">
        {editor.storage.characterCount?.characters() || 0} {t.editor.chars}
      </span>
    </div>
  );

  if (countsOnly) {
    return (
      <div className="flex h-8 items-center border-b border-border/30 bg-muted/30 px-3">
        {usageAndCount}
      </div>
    );
  }

  const ToolbarButton = ({
    onClick,
    isActive = false,
    title,
    icon: Icon,
    disabled = false,
  }: {
    onClick: () => void;
    isActive?: boolean;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    disabled?: boolean;
  }) => (
    <IconHint label={title}>
      <Button
        type="button"
        variant={isActive ? 'default' : 'ghost'}
        size="sm"
        className={cn('h-8 w-8 p-0', isActive && 'bg-primary text-primary-foreground')}
        onClick={onClick}
        title={title}
        disabled={disabled}
      >
        <Icon className="h-4 w-4" />
      </Button>
    </IconHint>
  );

  return (
    <div className="flex flex-nowrap items-center gap-0.5 md:gap-1 px-1.5 md:px-3 py-1 border-b border-border/30 bg-muted/30 overflow-x-auto scrollbar-none">
      {undoLastChange && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-1 md:px-2 shrink-0 gap-0.5"
          onClick={undoLastChange.onUndo}
          title={undoLastChange.hint}
        >
          <Undo2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span className="text-[11px] md:text-xs">{undoLastChange.label}</span>
        </Button>
      )}
      <div className="hidden md:flex items-center gap-0.5 flex-nowrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title={t.formatting.bold}
          icon={Bold}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title={t.formatting.italic}
          icon={Italic}
        />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'h-8 px-2 text-xs font-serif bg-transparent',
            editor.isActive('heading', { level: 1 }) && 'border-foreground'
          )}
          data-tour-id="chapter-title-btn"
          title={t.formatting.chapterTitle}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          {t.formatting.chapterTitle}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2"
              title={t.formatting.paragraph}
            >
              <Type className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={cn(
                'flex items-center gap-2',
                editor.isActive('paragraph') && 'bg-accent'
              )}
            >
              {t.formatting.paragraph}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={cn(
                'flex items-center gap-2',
                editor.isActive('heading', { level: 1 }) && 'bg-accent'
              )}
            >
              <Heading1 className="h-4 w-4" />
              {t.formatting.chapterTitle}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={cn(
                'flex items-center gap-2',
                editor.isActive('heading', { level: 2 }) && 'bg-accent'
              )}
            >
              <Heading2 className="h-4 w-4" />
              {t.formatting.heading2}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={cn(
                'flex items-center gap-2',
                editor.isActive('heading', { level: 3 }) && 'bg-accent'
              )}
            >
              <Heading3 className="h-4 w-4" />
              {t.formatting.heading3}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title={t.formatting.bulletList}
          icon={List}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title={t.formatting.numberedList}
          icon={ListOrdered}
        />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title={t.formatting.quote}
          icon={Quote}
        />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          isActive={false}
          title={t.formatting.clearFormatting}
          icon={RemoveFormatting}
        />
      </div>

      <div className="flex shrink-0 items-center gap-1.5 md:contents">
      <div className="md:hidden shrink-0">
        <DropdownMenu
          onOpenChange={(open) => {
            if (!open) return;
            const { from, to } = editor.state.selection;
            savedSelectionRef.current = { from, to };
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 min-w-[6.75rem] justify-between px-1.5 gap-1 text-[11px] leading-none"
              data-tour-id="formatting-menu-btn"
            >
              <SwatchBook className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">
                {activeStyles.length
                  ? activeStyles.map((key) => mobileStyleLabel[key]).join(' + ')
                  : t.formatting.menu}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]"
          >
            {(
              [
                ['bold', Bold],
                ['italic', Italic],
                ['title', Heading1],
                ['bullet', List],
                ['number', ListOrdered],
                ['quote', Quote],
              ] as const
            ).map(([key, Icon]) => (
              <DropdownMenuItem
                key={key}
                onSelect={(event) => {
                  event.preventDefault();
                  applyMobileStyle(key);
                }}
                className={cn(isMobileStyleActive(editor, key) && 'bg-accent')}
              >
                <Icon className="h-4 w-4 mr-2" />
                {mobileStyleLabel[key]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {biographyId && onEditorFontSizeChange && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1 hidden md:block" />
          <EditorFontSizeControl
            biographyId={biographyId}
            currentSize={editorFontSize}
            onSizeChange={onEditorFontSizeChange}
          />
        </>
      )}

      {aiTools?.aiEnabled && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1 hidden md:block" />
          <EditorAiToolsMenu {...aiTools} />
        </>
      )}
      </div>

      {usageAndCount}
    </div>
  );
}
