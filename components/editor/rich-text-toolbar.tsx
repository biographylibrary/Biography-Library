'use client';

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
} from 'lucide-react';
import { EditorFontSizeControl } from './editor-font-size-control';
import { EditorAiToolsMenu, type EditorAiToolsMenuProps } from './editor-ai-tools-menu';
import { AiUsageIndicator } from './ai-usage-indicator';
import { cn } from '@/lib/utils';
import { IconHint } from '@/components/ui/icon-hint';

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

  if (!editor) {
    return null;
  }

  const usageAndCount = (
    <div
      data-tour-id={aiTools?.aiEnabled ? 'ai-credits' : undefined}
      className="ml-auto flex h-8 flex-col items-end justify-center gap-px shrink-0 pl-2"
    >
      {aiTools?.aiEnabled && <AiUsageIndicator refreshTrigger={aiUsageRefresh} />}
      <span className="text-[10px] leading-none text-muted-foreground tabular-nums whitespace-nowrap">
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
    <div className="flex flex-nowrap items-center gap-1 px-3 py-1 border-b border-border/30 bg-muted/30 overflow-x-auto">
      {undoLastChange && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 shrink-0 gap-1"
          onClick={undoLastChange.onUndo}
          title={undoLastChange.hint}
        >
          <Undo2 className="h-4 w-4" />
          <span className="text-xs">{undoLastChange.label}</span>
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

      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8" data-tour-id="formatting-menu-btn">
              <Type className="h-4 w-4 mr-1" />
              {t.formatting.menu}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold className="h-4 w-4 mr-2" />
              {t.formatting.bold}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic className="h-4 w-4 mr-2" />
              {t.formatting.italic}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <Heading1 className="h-4 w-4 mr-2" />
              {t.formatting.chapterTitle}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <List className="h-4 w-4 mr-2" />
              {t.formatting.bulletList}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered className="h-4 w-4 mr-2" />
              {t.formatting.numberedList}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <Quote className="h-4 w-4 mr-2" />
              {t.formatting.quote}
            </DropdownMenuItem>
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
          <Separator orientation="vertical" className="h-6 mx-1" />
          <EditorAiToolsMenu {...aiTools} />
        </>
      )}

      {usageAndCount}
    </div>
  );
}
