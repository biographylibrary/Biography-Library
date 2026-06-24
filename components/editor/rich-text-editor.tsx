'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';
import { RichTextToolbar } from './rich-text-toolbar';
import type { EditorAiToolsMenuProps } from './editor-ai-tools-menu';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  biographyId?: string;
  editorFontSize?: number;
  onEditorFontSizeChange?: (size: number) => void;
  isPublished?: boolean;
  aiTools?: Omit<EditorAiToolsMenuProps, 'className' | 'buttonClassName'>;
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
}: RichTextEditorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastExternalContentRef = useRef(content);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !isPublished,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
      }),
      Superscript,
      Subscript,
      CharacterCount,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          'w-full min-h-[200px] prose prose-sm sm:prose max-w-none focus:outline-none px-4 sm:px-6 py-4',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      const isPlainText = !content.includes('<') && !content.includes('>');
      if (isPlainText) {
        const htmlContent = content.replace(/\n/g, '<br>');
        editor.commands.setContent(htmlContent || '');
      } else {
        editor.commands.setContent(content || '');
      }

      const grew = content.length > lastExternalContentRef.current.length;
      lastExternalContentRef.current = content;
      if (grew) {
        requestAnimationFrame(() => {
          const el = scrollContainerRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        });
      }
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!isPublished);
    }
  }, [editor, isPublished]);

  useEffect(() => {
    if (editor && editorFontSize) {
      const editorElement = editor.view.dom;
      editorElement.style.fontSize = `${editorFontSize}px`;
    }
  }, [editor, editorFontSize]);

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
      {!isPublished && (
        <RichTextToolbar
          editor={editor}
          biographyId={biographyId}
          editorFontSize={editorFontSize}
          onEditorFontSizeChange={onEditorFontSizeChange}
          aiTools={aiTools}
        />
      )}
      <div
        ref={scrollContainerRef}
        className={`flex-1 min-h-0 overflow-y-auto${isPublished ? ' opacity-70 cursor-not-allowed select-none' : ''}`}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
