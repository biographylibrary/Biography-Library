'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect, useRef, useState } from 'react';
import { RichTextToolbar } from './rich-text-toolbar';
import type { EditorAiToolsMenuProps } from './editor-ai-tools-menu';
import {
  archiveMarkdownToEditorHtml,
  archiveTiptapExtensions,
} from '@/lib/editor-archive-tiptap';
import { registerActiveEditorTarget } from '@/lib/editor/active-editor-selection';
import {
  echoChangeHighlight,
  echoHighlightKey,
  decorationsForDraft,
  ECHO_CHANGE_HIGHLIGHT_MS,
} from './echo-change-highlight';
import { htmlToArchiveMarkdown, normalizeArchiveMarkdown } from '@/lib/archive-markdown';
import { cleanEditorIncomingHtml } from '@/lib/editor-content-clean';
import { handleArchivePasteEvent } from '@/lib/editor-paste';
import { editorLoadMatchesStored } from '@/lib/editor-load-guard';
import { useTranslation } from '@/lib/i18n/i18n-context';
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
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastExternalContentRef = useRef(content);
  const highlightTextRef = useRef(highlightChange?.text);
  highlightTextRef.current = highlightChange?.text;
  const onPasteWarningsRef = useRef(onPasteWarnings);
  onPasteWarningsRef.current = onPasteWarnings;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [loadBlocked, setLoadBlocked] = useState(false);
  const loadBlockedRef = useRef(false);

  const applyLoadGuard = (instance: NonNullable<typeof editor>, stored: string) => {
    const ok = !stored.trim() || editorLoadMatchesStored(stored, instance);
    loadBlockedRef.current = !ok;
    setLoadBlocked(!ok);
    instance.setEditable(ok && !isPublished);
    return ok;
  };

  const editor = useEditor({
    immediatelyRender: false,
    editable: !isPublished,
    extensions: [...archiveTiptapExtensions(placeholder), CharacterCount, echoChangeHighlight],
    content: archiveMarkdownToEditorHtml(content || ''),
    editorProps: {
      attributes: {
        class:
          'w-full min-h-[200px] max-w-none focus:outline-none px-3 py-4 [&_p]:leading-[1.5] max-sm:!text-[length:calc(var(--writing-size)*0.85)] [&_hr]:border-0 [&_hr]:my-6 [&_hr]:text-center [&_hr]:before:content-["*_*_*"] [&_hr]:before:tracking-[0.4em] [&_hr]:before:text-muted-foreground',
      },
      handlePaste(view, event) {
        return handleArchivePasteEvent(view, event, (warnings) => {
          onPasteWarningsRef.current?.(warnings);
        });
      },
      transformPastedHTML(html) {
        const cleaned = cleanEditorIncomingHtml(html);
        if (cleaned.warnings.length) {
          onPasteWarningsRef.current?.(cleaned.warnings);
        }
        return cleaned.html || archiveMarkdownToEditorHtml(cleaned.markdown);
      },
    },
    onCreate: ({ editor: instance }) => {
      applyLoadGuard(instance, normalizeArchiveMarkdown(content || ''));
    },
    onUpdate: ({ editor: instance }) => {
      if (loadBlockedRef.current) return;
      // Canonical storage: our serializer (escape + NFC + ***), not TipTap getMarkdown.
      const markdown = nfc(htmlToArchiveMarkdown(instance.getHTML()));
      onChangeRef.current(markdown);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const incoming = normalizeArchiveMarkdown(content || '');
    const current = htmlToArchiveMarkdown(editor.getHTML());
    if (incoming !== current) {
      editor.commands.setContent(archiveMarkdownToEditorHtml(incoming), { emitUpdate: false });
      applyLoadGuard(editor, incoming);

      const grew = content.length > lastExternalContentRef.current.length;
      lastExternalContentRef.current = content;
      if (grew && !highlightTextRef.current && !loadBlockedRef.current) {
        requestAnimationFrame(() => {
          const el = scrollContainerRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        });
      }
    } else {
      lastExternalContentRef.current = content;
      applyLoadGuard(editor, incoming);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- guard helpers close over latest isPublished
  }, [content, editor, isPublished]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !highlightChange?.text || loadBlocked) return;
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
  }, [editor, highlightChange?.id, highlightChange?.text, loadBlocked]);

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
    if (!editor) return;
    editor.setEditable(!loadBlocked && !isPublished);
  }, [editor, isPublished, loadBlocked]);

  useEffect(() => {
    if (editor && editorFontSize) {
      const editorElement = editor.view.dom;
      editorElement.style.setProperty('--writing-size', `${editorFontSize}px`);
      editorElement.style.fontSize = 'var(--writing-size)';
      editorElement.style.lineHeight = '1.5';
    }
  }, [editor, editorFontSize]);

  const readOnly = isPublished || loadBlocked;

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
      {loadBlocked && (
        <div
          role="alert"
          className="shrink-0 border-b border-amber-700/40 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          {t.editor.loadTextLostReadOnly}
        </div>
      )}
      <RichTextToolbar
        editor={editor}
        biographyId={biographyId}
        editorFontSize={editorFontSize}
        onEditorFontSizeChange={onEditorFontSizeChange}
        aiTools={aiTools}
        aiUsageRefresh={aiUsageRefresh}
        countsOnly={readOnly}
        undoLastChange={loadBlocked ? undefined : undoLastChange}
      />
      <div
        ref={scrollContainerRef}
        className={`flex-1 min-h-0 overflow-y-auto${readOnly ? ' opacity-70 cursor-not-allowed select-none' : ''}`}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
