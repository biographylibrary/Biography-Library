'use client';

import type { ReactNode } from 'react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { siteLegal, type LegalBlock, type LegalDocId } from '@/lib/legal/site-legal';

function renderBlocks(blocks: LegalBlock[], hideTitle: boolean) {
  const nodes: ReactNode[] = [];
  let items: string[] = [];

  const flushItems = (at: number) => {
    if (items.length === 0) return;
    const list = items;
    items = [];
    nodes.push(
      <ul key={`list-${at}`} className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
        {list.map((item, index) => (
          <li key={`${at}-${index}`}>{item}</li>
        ))}
      </ul>
    );
  };

  blocks.forEach((block, index) => {
    if (block.kind === 'item') {
      items.push(block.text);
      return;
    }
    flushItems(index);
    if (block.kind === 'title') {
      if (!hideTitle) {
        nodes.push(
          <h1 key={index} className="text-3xl font-serif font-semibold tracking-tight">
            {block.text}
          </h1>
        );
      }
    } else if (block.kind === 'version') {
      nodes.push(
        <p key={index} className="text-sm text-muted-foreground">
          {block.text}
        </p>
      );
    } else if (block.kind === 'heading') {
      nodes.push(
        <h2 key={index} className="text-xl font-serif font-semibold tracking-tight pt-4">
          {block.text}
        </h2>
      );
    } else {
      nodes.push(
        <p key={index} className="text-sm leading-relaxed">
          {block.text}
        </p>
      );
    }
  });
  flushItems(blocks.length);
  return nodes;
}

export function SiteLegalDocument({
  doc,
  hideTitle = false,
}: {
  doc: LegalDocId;
  hideTitle?: boolean;
}) {
  const { language } = useTranslation();
  const blocks = siteLegal[doc][language] ?? siteLegal[doc].en;
  return <article className="space-y-3">{renderBlocks(blocks, hideTitle)}</article>;
}

export function siteLegalTitle(doc: LegalDocId, language: 'it' | 'en' | 'fr' | 'de'): string {
  const blocks = siteLegal[doc][language] ?? siteLegal[doc].en;
  return blocks.find((block) => block.kind === 'title')?.text ?? '';
}
