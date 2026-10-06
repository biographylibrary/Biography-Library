import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Link } from '@tiptap/extension-link';
import { Markdown } from '@tiptap/markdown';
import type { Extensions } from '@tiptap/react';
import { archiveMarkdownToHtml, normalizeArchiveMarkdown } from '@/lib/archive-markdown';

/**
 * Explicit Link only: TipTap 3 StarterKit already bundles Link with autolink
 * defaults. We disable StarterKit's Link and register our own so pasteRules
 * cannot invent links from "consumo.La" (.La is a real TLD).
 */
const ArchiveLink = Link.extend({
  addPasteRules() {
    return [];
  },
}).configure({
  openOnClick: false,
  autolink: false,
  linkOnPaste: false,
  shouldAutoLink: () => false,
  defaultProtocol: 'https',
  protocols: ['http', 'https'],
  HTMLAttributes: {
    rel: 'noopener noreferrer nofollow',
    target: '_blank',
  },
});

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
      // TipTap 3 StarterKit includes Link; configure off and use ArchiveLink.
      link: false,
      // Scene separator (***) stays enabled (StarterKit default).
    }),
    ArchiveLink,
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
