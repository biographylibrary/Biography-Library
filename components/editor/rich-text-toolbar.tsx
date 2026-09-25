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
} from 'lucide-react';
import { EditorFontSizeControl } from './editor-font-size-control';
import { EditorAiToolsMenu, type EditorAiToolsMenuProps } from './editor-ai-tools-menu';
import { cn } from '@/lib/utils';
import { IconHint } from '@/components/ui/icon-hint';

interface RichTextToolbarProps {
  editor: Editor | null;
  biographyId?: string;
  editorFontSize?: number;
  onEditorFontSizeChange?: (size: number) => void;
  aiTools?: Omit<EditorAiToolsMenuProps, 'className' | 'buttonClassName'>;
}

export function RichTextToolbar({
  editor,
  biographyId,
  editorFontSize = 16,
  onEditorFontSizeChange,
  aiTools,
}: RichTextToolbarProps) {
  const { t } = useTranslation();

  if (!editor) {
    return null;
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
    <div className="flex flex-nowrap sm:flex-wrap items-center gap-1 px-3 py-2 border-b border-border/30 bg-muted/30 overflow-x-auto sm:overflow-visible">
      <div className="hidden md:flex items-center gap-0.5 flex-wrap">
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
              {t.formatting.heading1}
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
            <Button variant="outline" size="sm" className="h-8">
              <Type className="h-4 w-4 mr-1" />
              Formatting
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
              {t.formatting.heading1}
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

      <div className="ml-auto text-xs text-muted-foreground text-right shrink-0 whitespace-nowrap pl-2">
        {editor.storage.characterCount?.characters() || 0} {t.editor.chars}
      </div>
    </div>
  );
}
