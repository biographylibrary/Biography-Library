import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { isValidUmId, normalizeUmId, toCanonical } from '@/lib/um-id';
import { formatDateWithUmYear } from '@/lib/um';
import { translations, type Language } from '@/lib/i18n/translations';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function pickLanguage(acceptLanguage: string | null): Language {
  if (!acceptLanguage) return 'en';
  const preferred = acceptLanguage
    .split(',')
    .map((part) => part.trim().split(';')[0]?.toLowerCase() ?? '')
    .filter(Boolean);
  for (const tag of preferred) {
    const base = tag.slice(0, 2) as Language;
    if (base === 'it' || base === 'en' || base === 'fr' || base === 'de') return base;
  }
  return 'en';
}

function interpolate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    template
  );
}

/**
 * Risolutore identificativo UM — server component senza JS client.
 * Divulgazione minima: mai title / subject_name / author_name.
 */
export default async function UmIdResolverPage({
  params,
}: {
  params: { umId: string };
}) {
  const raw = decodeURIComponent(params.umId ?? '');
  const hdrs = headers();
  const lang = pickLanguage(hdrs.get('accept-language'));
  const t = translations[lang].umId;
  const locale =
    lang === 'it' ? 'it-IT' : lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-GB';

  if (!isValidUmId(raw)) {
    notFound();
  }

  const canonical = toCanonical(raw);
  if (raw !== canonical) {
    redirect(`/id/${canonical}`);
  }

  const normalized = normalizeUmId(canonical);
  const service = buildServiceClient();

  const { data: registry, error: regError } = await service
    .from('um_identifiers')
    .select('um_id, issued_at, biography_id')
    .eq('um_id', normalized)
    .maybeSingle();

  if (regError || !registry) {
    notFound();
  }

  const issuedLabel = interpolate(t.issuedOn, {
    date: formatDateWithUmYear(registry.issued_at as string, locale, 'day', t.yearWord),
  });

  // Minimal biography lookup — never title / subject_name / author_name
  if (registry.biography_id) {
    const { data: bio } = await service
      .from('biographies')
      .select('id, status, visibility, slug, user_id')
      .eq('id', registry.biography_id)
      .maybeSingle();

    if (bio) {
      const { data: profile } = await service
        .from('profiles')
        .select('account_status')
        .eq('id', bio.user_id)
        .maybeSingle();

      const isPubliclyReadable =
        bio.status === 'published' &&
        bio.visibility === 'public' &&
        (profile as { account_status?: string } | null)?.account_status === 'active';

      if (isPubliclyReadable) {
        redirect(
          bio.slug ? `/biography/${bio.slug}/view` : `/biography/${bio.id}/view`
        );
      }
    }
  }

  return (
    <main
      lang={lang}
      style={{
        fontFamily: 'Georgia, Times New Roman, serif',
        maxWidth: '40rem',
        margin: '3rem auto',
        padding: '0 1rem',
        lineHeight: 1.6,
        color: '#121212',
      }}
    >
      <p
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          letterSpacing: '0.04em',
          userSelect: 'text',
        }}
      >
        {canonical}
      </p>
      <p>{t.exists}</p>
      <p>{issuedLabel}</p>
      <p>{t.contentUnavailable}</p>
    </main>
  );
}
