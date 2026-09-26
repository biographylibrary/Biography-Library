'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect, useRef } from 'react';
import { RichTextToolbar } from './rich-text-toolbar';
import type { EditorAiToolsMenuProps } from './editor-ai-tools-menu';
import { archiveTiptapExtensions } from '@/lib/editor-archive-tiptap';
import { registerActiveEditorTarget } from '@/lib/editor/active-editor-selection';
import {
  echoChangeHighlight,
  echoHighlightKey,
  decorationsForDraft,
  ECHO_CHANGE_HIGHLIGHT_MS,
} from './echo-change-highlight';
import {
  archiveMarkdownToHtml,
  htmlToArchiveMarkdown,
  storedToArchiveMarkdown,
} from '@/lib/archive-markdown';

interface RichTextEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  biographyId?: string;
  editorFontSize?: number;
  onEditorFontSizeChange?: (size: number) => void;
  isPublished?: boolean;
  aiTools?: Omit<EditorAiToolsMenuProps, 'className' | 'buttonClassName'>;
  aiUsageRefresh?: number;
  /** Newly added or replaced text, shown in bold for a few seconds. */
  highlightChange?: { id: number; text: string } | null;
  undoLastChange?: { label: string; hint: string; onUndo: () => void };
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  biographyId,
  editorFontSize = 16,
  onEditorFontSizeChange,
  isPublished = false,
  aiTools,
  aiUsageRefresh,
  highlightChange,
  undoLastChange,
}: RichTextEditorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastExternalContentRef = useRef(content);
  const highlightTextRef = useRef(highlightChange?.text);
  highlightTextRef.current = highlightChange?.text;

  const editor = useEditor({
    immediatelyRender: false,
    editable: !isPublished,
    extensions: [...archiveTiptapExtensions(placeholder), CharacterCount, echoChangeHighlight],
    content: archiveMarkdownToHtml(storedToArchiveMarkdown(content || '')),
    editorProps: {
      attributes: {
        class:
          'w-full min-h-[200px] max-w-none focus:outline-none px-3 py-4 [&_p]:leading-[1.5] max-sm:!text-[length:calc(var(--writing-size)*0.85)]',
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(htmlToArchiveMarkdown(instance.getHTML()));
    },
  });

  useEffect(() => {
    if (!editor) return;
    const incoming = storedToArchiveMarkdown(content || '');
    const current = htmlToArchiveMarkdown(editor.getHTML());
    if (incoming !== current) {
      editor.commands.setContent(archiveMarkdownToHtml(incoming), { emitUpdate: false });

      const grew = content.length > lastExternalContentRef.current.length;
      lastExternalContentRef.current = content;
      if (grew && !highlightTextRef.current) {
        requestAnimationFrame(() => {
          const el = scrollContainerRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        });
      }
    } else {
      lastExternalContentRef.current = content;
    }
  }, [content, editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !highlightChange?.text) return;
    const mark = decorationsForDraft(editor.state.doc, highlightChange.text);
    if (mark) {
      editor.view.dispatch(editor.state.tr.setMeta(echoHighlightKey, mark.set));
      const dom = editor.view.domAtPos(mark.from);
      const el = dom.node instanceof HTMLElement ? dom.node : dom.node.parentElement;
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    const timer = window.setTimeout(() => {
      if (editor.isDestroyed) return;
      editor.view.dispatch(editor.state.tr.setMeta(echoHighlightKey, 'clear'));
    }, ECHO_CHANGE_HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [editor, highlightChange?.id, highlightChange?.text]);

  useEffect(() => {
    if (!editor) return;
    return registerActiveEditorTarget(() => {
      const { from, to, $from } = editor.state.selection;
      const selectedText = from === to ? '' : editor.state.doc.textBetween(from, to, '\n');
      const blockText = $from.parent.isTextblock ? $from.parent.textContent : '';
      return { selectedText, blockText };
    });
  }, [editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!isPublished);
    }
  }, [editor, isPublished]);

  useEffect(() => {
    if (editor && editorFontSize) {
      const editorElement = editor.view.dom;
      editorElement.style.setProperty('--writing-size', `${editorFontSize}px`);
      editorElement.style.fontSize = 'var(--writing-size)';
      editorElement.style.lineHeight = '1.5';
    }
  }, [editor, editorFontSize]);

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
      <RichTextToolbar
        editor={editor}
        biographyId={biographyId}
        editorFontSize={editorFontSize}
        onEditorFontSizeChange={onEditorFontSizeChange}
        aiTools={aiTools}
        aiUsageRefresh={aiUsageRefresh}
        countsOnly={isPublished}
        undoLastChange={undoLastChange}
      />
      <div
        ref={scrollContainerRef}
        className={`flex-1 min-h-0 overflow-y-auto${isPublished ? ' opacity-70 cursor-not-allowed select-none' : ''}`}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
