'use client';

import type { ReactNode } from 'react';

function formatEchoInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={`${match.index}-b`}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={`${match.index}-i`}>{token.slice(1, -1)}</em>);
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

export function EchoMessageContent({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <>
      {lines.map((line, index) => {
        const listMatch = line.match(/^\s*[\*\-]\s+(.*)$/);
        const display = listMatch ? `• ${listMatch[1]}` : line;

        return (
          <span key={index}>
            {index > 0 && <br />}
            {formatEchoInlineMarkdown(display)}
          </span>
        );
      })}
    </>
  );
}
