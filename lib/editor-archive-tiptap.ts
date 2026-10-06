import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';
import type { Extensions } from '@tiptap/react';

/**
 * TipTap extensions for the archive document.
 * Markdown extension (same major as TipTap 3.19) for load/save contentType.
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
        autolink: true,
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
