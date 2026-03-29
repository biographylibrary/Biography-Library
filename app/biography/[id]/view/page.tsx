'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { type BiographyContent } from '@/lib/editor-constants';
import { generateBiographyPDF } from '@/lib/pdf-export';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { FileDown, Loader as Loader2, Lock, Info, Archive, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { ReportBiographyModal } from '@/components/editor/ReportBiographyModal';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

interface BiographyViewData {
  id: string;
  title: string;
  author_name: string;
  content: BiographyContent;
  visibility: string;
  status: string;
  share_token: string | null;
  created_at: string;
  published_at: string | null;
  is_frozen: boolean | null;
  frozen_at: string | null;
}

interface SectionWithDate {
  key: string;
  title: string;
  text: string;
  sectionCreatedAt: string | null;
}

type ViewError = 'not-found' | 'private' | null;

function formatDate(dateStr: string, locale?: string): string {
  return new Date(dateStr).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getReviewEndDate(publishedAt: string): Date {
  const d = new Date(publishedAt);
  d.setDate(d.getDate() + 30);
  return d;
}

function isInReviewPeriod(biography: BiographyViewData): boolean {
  if (biography.status === 'under_review') return true;
  if (!biography.published_at) return false;
  const reviewEnd = getReviewEndDate(biography.published_at);
  return new Date() < reviewEnd;
}

export default function BiographyViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const id = params.id as string;
  const token = searchParams.get('token');

  const { toast } = useToast();
  const [biography, setBiography] = useState<BiographyViewData | null>(null);
  const [orderedSections, setOrderedSections] = useState<SectionWithDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ViewError>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const resolveId = async (): Promise<string | null> => {
      if (UUID_RE.test(id)) return id;
      const { data } = await supabase
        .from('biographies')
        .select('id')
        .eq('slug', id)
        .maybeSingle();
      return data?.id ?? null;
    };

    const load = async () => {
      setIsLoading(true);

      const resolvedId = await resolveId();
      if (!resolvedId) {
        setError('not-found');
        setIsLoading(false);
        return;
      }

      let data: BiographyViewData | null = null;

      const publicQuery = await supabase
        .from('biographies')
        .select('id, title, author_name, content, visibility, status, share_token, created_at, published_at, is_frozen, frozen_at')
        .eq('id', resolvedId)
        .in('visibility', ['public', 'link-only'])
        .eq('status', 'published')
        .maybeSingle();

      if (!publicQuery.error && publicQuery.data) {
        data = publicQuery.data as BiographyViewData;
        supabase.rpc('increment_view_count', { biography_uuid: resolvedId });
      } else if (token) {
        const tokenQuery = await supabase
          .from('biographies')
          .select('id, title, author_name, content, visibility, status, share_token, created_at, published_at, is_frozen, frozen_at')
          .eq('id', resolvedId)
          .eq('share_token', token)
          .maybeSingle();

        if (!tokenQuery.error && tokenQuery.data) {
          if (tokenQuery.data.visibility === 'private') {
            setError('private');
            setIsLoading(false);
            return;
          }
          data = tokenQuery.data as BiographyViewData;
        }
      }

      if (!data) {
        setError('not-found');
        setIsLoading(false);
        return;
      }

      setBiography(data);

      const sectionsQuery = await supabase
        .from('biography_sections')
        .select('section_name, created_at')
        .eq('biography_id', resolvedId)
        .order('created_at', { ascending: true });

      const sectionTimestamps: Record<string, string> = {};
      if (!sectionsQuery.error && sectionsQuery.data) {
        for (const row of sectionsQuery.data) {
          if (row.section_name && row.created_at) {
            sectionTimestamps[row.section_name] = row.created_at;
          }
        }
      }

      const content = data.content as BiographyContent;
      const sections: SectionWithDate[] = Object.entries(content)
        .filter(([, sectionData]) => sectionData?.text?.trim())
        .map(([key, sectionData]) => ({
          key,
          title: key,
          text: sectionData.text,
          sectionCreatedAt: sectionTimestamps[key] ?? null,
        }))
        .sort((a, b) => {
          if (a.sectionCreatedAt && b.sectionCreatedAt) {
            return new Date(a.sectionCreatedAt).getTime() - new Date(b.sectionCreatedAt).getTime();
          }
          if (a.sectionCreatedAt) return -1;
          if (b.sectionCreatedAt) return 1;
          return 0;
        });

      setOrderedSections(sections);
      setIsLoading(false);
    };

    load();
  }, [id, token]);

  const getErrorMessage = (err: ViewError) => {
    switch (err) {
      case 'not-found': return t.view.notFoundOrDenied;
      case 'private': return t.view.biographyPrivate;
      default: return t.view.notAvailable;
    }
  };

  const handleExportPDF = () => {
    if (!biography) return;
    generateBiographyPDF({
      title: biography.title,
      author_name: biography.author_name,
      content: biography.content,
      created_at: biography.created_at,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !biography) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">{t.view.accessDenied}</h1>
        <p className="text-muted-foreground text-center max-w-md">
          {error ? getErrorMessage(error) : t.view.notAvailable}
        </p>
        <Button variant="outline" onClick={() => router.push('/')}>
          {t.view.returnHome}
        </Button>
      </div>
    );
  }

  const inReview = isInReviewPeriod(biography);
  const reviewEndDate = biography.published_at
    ? getReviewEndDate(biography.published_at)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo height={40} />
            <h1 className="text-lg font-serif font-semibold truncate max-w-[300px] sm:max-w-none">
              {biography.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">{t.view.downloadPdf}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReportOpen(true)}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Flag className="h-4 w-4" />
              <span className="hidden sm:inline">{t.view.reportButton}</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {biography.is_frozen && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 border border-border/50 rounded-lg px-4 py-2.5">
            <Archive className="h-4 w-4 shrink-0" />
            <span>{t.view.archivedBanner}</span>
          </div>
        )}

        {inReview && reviewEndDate && (
          <div className="mb-6 flex items-start gap-2.5 text-sm bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-lg px-4 py-3">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              {t.view.reviewBannerPrefix}{' '}
              <strong>{formatDate(reviewEndDate.toISOString())}</strong>
              {t.view.reviewBannerSuffix}
            </span>
          </div>
        )}

        <article className="prose prose-gray dark:prose-invert max-w-none">
          <div className="mb-12 pb-8 border-b border-border">
            <h1 className="text-4xl font-serif font-bold mb-2">
              {biography.title}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t.view.by} {biography.author_name}
            </p>
            {biography.published_at && (
              <p className="text-sm text-muted-foreground mt-1">
                {t.view.publishedOn} {formatDate(biography.published_at)}
              </p>
            )}
          </div>

          {orderedSections.map((section) => {
            const sectionTitle =
              t.sectionTitles[section.key as keyof typeof t.sectionTitles] || section.key;

            return (
              <section key={section.key} className="mb-12">
                <div className="flex items-baseline justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-serif font-semibold text-primary">
                    {sectionTitle}
                  </h2>
                  {section.sectionCreatedAt && (
                    <span className="shrink-0 text-xs text-muted-foreground border border-border/60 rounded-full px-2.5 py-0.5 whitespace-nowrap">
                      {t.view.publishedOn} {formatDate(section.sectionCreatedAt)}
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-wrap leading-relaxed font-serif text-base">
                  {section.text.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className={cn('mb-4', !paragraph.trim() && 'hidden')}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            );
          })}
        </article>

        <footer className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>{t.view.preservingStories}</p>
        </footer>
      </main>

      <ReportBiographyModal
        biographyId={biography.id}
        open={reportOpen}
        onOpenChange={setReportOpen}
        onSuccess={() =>
          toast({ title: t.view.reportSuccess })
        }
      />
      <Toaster />
    </div>
  );
}
