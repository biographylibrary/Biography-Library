import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { Extensions } from '@tiptap/react';

/** Marks that do not enter the stored original are omitted. */
export function archiveTiptapExtensions(placeholder?: string): Extensions {
  const extensions: Extensions = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      strike: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      underline: false,
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
