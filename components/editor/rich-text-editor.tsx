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
  normalizeArchiveMarkdown,
} from '@/lib/archive-markdown';
import { cleanEditorIncomingHtml } from '@/lib/editor-content-clean';
import { nfc } from '@/lib/nfc';

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
  onPasteWarnings?: (warnings: Array<'tables' | 'images'>) => void;
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
  onPasteWarnings,
}: RichTextEditorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastExternalContentRef = useRef(content);
  const highlightTextRef = useRef(highlightChange?.text);
  highlightTextRef.current = highlightChange?.text;
  const onPasteWarningsRef = useRef(onPasteWarnings);
  onPasteWarningsRef.current = onPasteWarnings;

  const editor = useEditor({
    immediatelyRender: false,
    editable: !isPublished,
    extensions: [...archiveTiptapExtensions(placeholder), CharacterCount, echoChangeHighlight],
    content: normalizeArchiveMarkdown(content || ''),
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class:
          'w-full min-h-[200px] max-w-none focus:outline-none px-3 py-4 [&_p]:leading-[1.5] max-sm:!text-[length:calc(var(--writing-size)*0.85)] [&_hr]:border-0 [&_hr]:my-6 [&_hr]:text-center [&_hr]:before:content-["*_*_*"] [&_hr]:before:tracking-[0.4em] [&_hr]:before:text-muted-foreground',
      },
      transformPastedHTML(html) {
        const cleaned = cleanEditorIncomingHtml(html);
        if (cleaned.warnings.length) {
          onPasteWarningsRef.current?.(cleaned.warnings);
        }
        return cleaned.html || archiveMarkdownToHtml(cleaned.markdown);
      },
    },
    onUpdate: ({ editor: instance }) => {
      // Canonical storage: our serializer (escape + NFC + ***), not TipTap getMarkdown.
      const markdown = nfc(htmlToArchiveMarkdown(instance.getHTML()));
      onChange(markdown);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const incoming = normalizeArchiveMarkdown(content || '');
    const current = htmlToArchiveMarkdown(editor.getHTML());
    if (incoming !== current) {
      editor.commands.setContent(incoming, { contentType: 'markdown', emitUpdate: false });

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
