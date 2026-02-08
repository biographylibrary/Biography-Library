'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { RichTextToolbar } from './rich-text-toolbar';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  biographyId?: string;
  editorFontSize?: number;
  onEditorFontSizeChange?: (size: number) => void;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  biographyId,
  editorFontSize = 16,
  onEditorFontSizeChange,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
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
        class: 'w-full h-full min-h-[200px] prose prose-sm sm:prose max-w-none focus:outline-none px-4 sm:px-6 py-4',
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
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor && editorFontSize) {
      const editorElement = editor.view.dom;
      editorElement.style.fontSize = `${editorFontSize}px`;
    }
  }, [editor, editorFontSize]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <RichTextToolbar
        editor={editor}
        biographyId={biographyId}
        editorFontSize={editorFontSize}
        onEditorFontSizeChange={onEditorFontSizeChange}
      />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
