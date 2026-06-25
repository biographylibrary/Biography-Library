'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { BIOGRAPHY_SECTIONS, type BiographyContent } from '@/lib/editor-constants';
import { getCoverPhotoDisplayUrl } from '@/lib/pdf-export';

function ReviewReadContent() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [mode, setMode] = useState<'sections' | 'freeflow' | null>(null);
  const [freeflowText, setFreeflowText] = useState<string | null>(null);
  const [sectionRows, setSectionRows] = useState<Array<{ section_key: string; content: string | null }>>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: bio, error: bioErr } = await supabase
      .from('biographies')
      .select('id, title, author_name, biography_mode, content_freeflow, content')
      .eq('id', id)
      .maybeSingle();

    if (bioErr || !bio) {
      setError('not_found');
      setLoading(false);
      return;
    }

    setTitle((bio as { title?: string }).title ?? '');
    setAuthorName((bio as { author_name?: string }).author_name ?? '');
    const bm = (bio as { biography_mode?: string }).biography_mode;
    setMode(bm === 'freeflow' ? 'freeflow' : 'sections');
    setFreeflowText((bio as { content_freeflow?: string | null }).content_freeflow ?? null);

    const { data: sections } = await supabase
      .from('biography_sections')
      .select('section_key, content')
      .eq('biography_id', id)
      .order('section_key', { ascending: true });

    let rows = (sections as Array<{ section_key: string; content: string | null }> | null) ?? [];
    if (bm !== 'freeflow' && rows.every((r) => !r.content?.trim())) {
      const c = (bio as { content?: BiographyContent | null }).content;
      if (c && typeof c === 'object') {
        rows = Object.entries(c)
          .filter(([, v]) => (v as { text?: string })?.text?.trim())
          .map(([section_key, v]) => ({
            section_key,
            content: (v as { text?: string }).text ?? '',
          }));
      }
    }
    setSectionRows(rows);

    getCoverPhotoDisplayUrl(id).then(setCoverUrl);

    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !mode) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <p className="text-muted-foreground mb-4">{t.view.notFoundOrDenied}</p>
        <Button variant="outline" onClick={() => router.push('/admin/review')}>
          {t.admin.reviewPageTitle}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5 shrink-0" asChild>
            <Link href="/admin/review">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t.admin.reviewPageTitle}</span>
            </Link>
          </Button>
          <span className="text-sm font-medium text-muted-foreground truncate">{title || '—'}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {coverUrl && (
          <div className="mb-8 rounded-lg overflow-hidden border border-border max-h-[320px] bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="" className="w-full h-auto max-h-[320px] object-cover" />
          </div>
        )}

        <article className="prose prose-gray dark:prose-invert max-w-none">
          <div className="mb-10 pb-6 border-b border-border">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-2">{title}</h1>
            <p className="text-lg text-muted-foreground">
              {t.view.by} {authorName || '—'}
            </p>
          </div>

          {mode === 'freeflow' && freeflowText?.trim() && (
            <section className="mb-10">
              <div className="whitespace-pre-wrap leading-relaxed font-serif text-base">{freeflowText}</div>
            </section>
          )}

          {mode === 'sections' &&
            BIOGRAPHY_SECTIONS.map((def) => {
              const row = sectionRows.find((r) => r.section_key === def.key);
              const text = row?.content?.trim() ?? '';
              if (!text) return null;
              const sectionTitle =
                t.sectionTitles[def.key as keyof typeof t.sectionTitles] || def.title;
              return (
                <section key={def.key} className="mb-10">
                  <h2 className="text-2xl font-serif font-semibold text-primary mb-4">{sectionTitle}</h2>
                  <div className="whitespace-pre-wrap leading-relaxed font-serif text-base">
                    {text.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className="mb-4">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              );
            })}
        </article>
      </main>
    </div>
  );
}

export default function AdminReviewReadPage() {
  return <ReviewReadContent />;
}
