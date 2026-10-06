import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';
import type { Extensions } from '@tiptap/react';
import { archiveMarkdownToHtml, normalizeArchiveMarkdown } from '@/lib/archive-markdown';

/**
 * TipTap extensions for the archive document.
 * Load path uses archiveMarkdownToEditorHtml (not TipTap contentType markdown):
 * TipTap Markdown drops block text after a leading ordered/bullet list.
 * Storage still goes through lib/archive-markdown (escape + NFC + ***).
 */
export function archiveTiptapExtensions(placeholder?: string): Extensions {
  const extensions: Extensions = [
    Markdown.configure({
      markedOptions: {
        gfm: false,
        breaks: false,
      },
    }),
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      strike: false,
      code: false,
      codeBlock: false,
      underline: false,
      // Scene separator (***) stays enabled (StarterKit default).
      link: {
        openOnClick: false,
        // No autolink while typing/pasting prose ("consumo.La", "www…").
        // Explicit link command and paste of a full http(s) URL still work.
        autolink: false,
        linkOnPaste: true,
        defaultProtocol: 'https',
        protocols: ['http', 'https', 'mailto'],
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      },
    }),
  ];
  if (placeholder) {
    extensions.push(Placeholder.configure({ placeholder }));
  }
  return extensions;
}

/** HTML TipTap can load without the Markdown extension parse bug after lists. */
export function archiveMarkdownToEditorHtml(stored: string): string {
  const md = normalizeArchiveMarkdown(stored || '');
  if (!md) return '';
  return archiveMarkdownToHtml(md);
}
