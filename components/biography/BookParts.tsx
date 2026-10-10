'use client';

import { BiographySectionBody } from '@/components/biography/BiographySectionBody';
import { bookPartTitle, type BookPart } from '@/lib/book-parts';

interface BookPartsProps {
  position: 'front' | 'back';
  parts: BookPart[];
  languageTag: string | null | undefined;
}

export function BookParts({ position, parts, languageTag }: BookPartsProps) {
  if (parts.length === 0) return null;

  return (
    <div
      className={
        position === 'front'
          ? 'mb-10 space-y-10 pb-10 border-b border-border/60'
          : 'mt-12 space-y-10 pt-10 border-t border-border/60'
      }
    >
      {parts.map((part) => {
        const title = bookPartTitle(part.key, languageTag);
        if (part.key === 'dedication') {
          return (
            <section key={part.key} className="text-center" aria-label={title}>
              <BiographySectionBody
                text={part.text}
                className="italic text-lg [&_p]:text-center"
              />
            </section>
          );
        }
        if (part.key === 'epigraph') {
          return (
            <figure key={part.key} className="mx-auto max-w-2xl" aria-label={title}>
              <blockquote className="border-0 m-0 p-0 text-center italic">
                <BiographySectionBody
                  text={part.text}
                  className="italic text-lg [&_p]:text-center"
                />
              </blockquote>
              {part.source?.trim() ? (
                <figcaption className="mt-4 text-center text-sm text-muted-foreground not-italic">
                  — {part.source.trim()}
                </figcaption>
              ) : null}
            </figure>
          );
        }
        const headingId = `book-part-${part.key}`;
        return (
          <section key={part.key} className="mb-2" aria-labelledby={headingId}>
            <h2
              id={headingId}
              className="text-2xl font-serif font-semibold text-primary mb-6"
            >
              {title}
            </h2>
            <BiographySectionBody
              text={part.text}
              className={part.key === 'specific_credits' ? 'text-sm' : undefined}
            />
          </section>
        );
      })}
    </div>
  );
}
