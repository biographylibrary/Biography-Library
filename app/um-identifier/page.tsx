'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/i18n-context';
import {
  UM_SPEC_VECTORS,
  umIdentifierPageCopy,
} from '@/lib/i18n/um-identifier-page';

export default function UmIdentifierPage() {
  const { language, t } = useTranslation();
  const copy = umIdentifierPageCopy(language);

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-serif font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-lg text-muted-foreground">{copy.version}</p>
        <p className="text-sm leading-relaxed">{copy.issuer}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{copy.date}</p>
        <p className="text-sm leading-relaxed">{copy.equalValue}</p>
      </header>

      {copy.sections.map((section) => (
        <section key={section.heading} className="space-y-3">
          <h2 className="text-xl font-serif font-semibold tracking-tight">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-base leading-relaxed whitespace-pre-wrap">
              {paragraph}
            </p>
          ))}
          {section.heading.startsWith('7.') ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <caption className="sr-only">{copy.vectorCaption}</caption>
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-4 font-medium">{copy.yearColumn}</th>
                    <th className="py-2 pr-4 font-medium">{copy.bodyColumn}</th>
                    <th className="py-2 font-medium">{copy.idColumn}</th>
                  </tr>
                </thead>
                <tbody>
                  {UM_SPEC_VECTORS.map((row) => (
                    <tr key={row.id} className="border-b border-border/40">
                      <td className="py-2 pr-4">{row.year}</td>
                      <td className="py-2 pr-4 font-mono">{row.body}</td>
                      <td className="py-2 font-mono">{row.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {section.heading.startsWith('9.') ? (
            <p className="text-sm font-mono break-all">{copy.resolveExample}</p>
          ) : null}
        </section>
      ))}

      <p className="text-sm">
        <Link href="/credits" className="text-primary hover:underline">
          {t.footer.credits}
        </Link>
      </p>
    </main>
  );
}
