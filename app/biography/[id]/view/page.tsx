'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { type BiographyContent } from '@/lib/editor-constants';
import {
  generateBiographyPDF,
  checkBiographyPdfReadiness,
  getCoverPhotoDisplayUrl,
} from '@/lib/pdf-export';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { FileDown, Loader as Loader2, Lock, Info, Archive, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { ReportBiographyModal } from '@/components/editor/ReportBiographyModal';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { logger } from '@/lib/logger';

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
  export_txt_url: string | null;
  export_docx_url: string | null;
  /** Raster prima pagina PDF (catalogo); se assente si usa la foto copertina da biography_media */
  listing_cover_url?: string | null;
}

interface SectionWithDate {
  key: string;
  title: string;
  text: string;
  sectionCreatedAt: string | null;
}

type ViewError = 'not-found' | 'private' | 'invalid-token' | null;

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
  if (biography.status === 'under_review' || biography.status === 'locked_pending_screening') return true;
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const reportAutoOpenedRef = useRef(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfReady, setPdfReady] = useState<boolean | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

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
      let loadError: ViewError = null;
      let tokenSectionTimestamps: Record<string, string> | null = null;

      if (token) {
        // --- Token path: SECURITY DEFINER RPC enforces exact token match.
        // Returns one row per biography_section (LEFT JOIN), so biography
        // metadata is repeated. Section timestamps are embedded in the rows.
        // No separate biography_sections query needed — and none is safe to do
        // anonymously since the leaky anon policy has been removed.
        const tokenQuery = await supabase.rpc('get_biography_by_share_token', {
          p_biography_id: resolvedId,
          p_token: token,
        });

        if (!tokenQuery.error && tokenQuery.data && tokenQuery.data.length > 0) {
          const rows = tokenQuery.data as Array<BiographyViewData & { section_name: string | null; section_created_at: string | null }>;
          data = { ...rows[0], export_txt_url: null, export_docx_url: null } as BiographyViewData;
          tokenSectionTimestamps = {};
          for (const row of rows) {
            if (row.section_name && row.section_created_at) {
              tokenSectionTimestamps[row.section_name] = row.section_created_at;
            }
          }
          if (data.status === 'published') {
            supabase.rpc('increment_view_count', { biography_uuid: resolvedId });
          }
        } else {
          // Token present but no match — either wrong token, private, or not found.
          loadError = 'invalid-token';
        }
      } else {
        // --- No token: only show published public biographies.
        // link-only biographies are NOT accessible without a token.
        const publicQuery = await supabase
          .from('biographies')
          .select(
            'id, title, author_name, content, visibility, status, share_token, created_at, published_at, is_frozen, frozen_at, export_txt_url, export_docx_url, listing_cover_url'
          )
          .eq('id', resolvedId)
          .eq('visibility', 'public')
          .eq('status', 'published')
          .maybeSingle();

        if (!publicQuery.error && publicQuery.data) {
          data = publicQuery.data as BiographyViewData;
          supabase.rpc('increment_view_count', { biography_uuid: resolvedId });
        } else {
          loadError = 'not-found';
        }
      }

      if (!data) {
        logger.error('Biography view load failed', {
          feature: 'share-link',
          hasShareToken: !!token,
          route: typeof window !== 'undefined' ? window.location.pathname : null,
          reason: loadError,
        });
        setError(loadError ?? 'not-found');
        setIsLoading(false);
        return;
      }

      setBiography(data);

      checkBiographyPdfReadiness(resolvedId).then((result) => {
        setPdfReady(result.ok);
      });

      const listing = (data as BiographyViewData).listing_cover_url?.trim();
      if (listing) {
        setCoverImageUrl(listing);
      } else {
        getCoverPhotoDisplayUrl(resolvedId).then(setCoverImageUrl);
      }

      // Section timestamps come from the RPC result for token-accessed biographies.
      // For public (no-token) biographies, authenticated users see their own sections
      // via existing RLS; anon users get no timestamps (graceful degradation — sections
      // still display, just without date stamps).
      const sectionTimestamps: Record<string, string> = tokenSectionTimestamps ?? {};

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (
      !isLoading &&
      biography &&
      searchParams.get('action') === 'report' &&
      currentUserId &&
      !reportAutoOpenedRef.current
    ) {
      reportAutoOpenedRef.current = true;
      setReportOpen(true);
    }
  }, [isLoading, biography, searchParams, currentUserId]);

  const getErrorMessage = (err: ViewError) => {
    switch (err) {
      case 'not-found': return t.view.notFoundOrDenied;
      case 'private': return t.view.biographyPrivate;
      case 'invalid-token': return t.view.tokenMissing;
      default: return t.view.notAvailable;
    }
  };

  const getBiographyExportData = () => ({
    title: biography!.title,
    author_name: biography!.author_name,
    content: biography!.content,
    created_at: biography!.created_at,
  });

  const handleExportPDF = async () => {
    if (!biography || pdfLoading) return;
    setPdfLoading(true);
    try {
      const readiness = await checkBiographyPdfReadiness(biography.id, true);
      if (!readiness.ok) {
        setPdfReady(false);
        const hasCoverIssue = readiness.issues.includes('missing-cover') || readiness.issues.includes('cover-unreachable');
        toast({
          title: hasCoverIssue ? t.exportDialog.noCoverPhotoWarning : t.exportDialog.exportError,
          variant: 'destructive',
        });
        return;
      }
      setPdfReady(true);
      await generateBiographyPDF(getBiographyExportData());
    } catch (err: any) {
      const msg =
        err?.message === 'MISSING_COVER_PHOTO' || err?.message === 'MISSING_BIOGRAPHY_ID'
          ? t.exportDialog.noCoverPhotoWarning
          : err?.message === 'FONT_LOAD_FAILED'
          ? t.exportDialog.fontLoadError
          : t.exportDialog.exportError;
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setPdfLoading(false);
    }
  };

  const handleReportClick = () => {
    if (currentUserId) {
      setReportOpen(true);
    } else {
      const returnTo = `/biography/${id}/view?action=report`;
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  };

  const handleReportOpenChange = (open: boolean) => {
    setReportOpen(open);
    if (!open && searchParams.get('action') === 'report') {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('action');
      const newUrl = params.toString()
        ? `/biography/${id}/view?${params.toString()}`
        : `/biography/${id}/view`;
      router.replace(newUrl);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !biography) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-4">
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
    <div className="min-h-full bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo height={40} />
            <h1 className="text-lg font-serif font-semibold truncate max-w-[300px] sm:max-w-none">
              {biography.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end gap-0.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={pdfLoading || pdfReady === false}
                className="gap-2"
                title={
                  pdfReady === false
                    ? (t.exportDialog.noCoverPhotoWarning ?? 'Add cover photo and author name to enable PDF.')
                    : undefined
                }
              >
                {pdfLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{t.view.downloadPdf}</span>
              </Button>
              {pdfReady === false && (
                <span className="hidden sm:block text-[10px] text-muted-foreground max-w-[140px] text-right leading-tight">
                  {t.exportDialog.noCoverPhotoWarning}
                </span>
              )}
            </div>
            {biography.export_txt_url && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-2"
              >
                <a href={biography.export_txt_url} download>
                  <FileDown className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.view.downloadTxt}</span>
                </a>
              </Button>
            )}
            {biography.export_docx_url && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-2"
              >
                <a href={biography.export_docx_url} download>
                  <FileDown className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.view.downloadDocx}</span>
                </a>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReportClick}
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
        {coverImageUrl && (
          <div className="mb-10 flex justify-center">
            <div className="w-full max-w-2xl rounded-lg overflow-hidden border border-border bg-muted shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImageUrl}
                alt=""
                className="w-full h-auto max-h-[min(360px,42vh)] object-contain object-top bg-muted/50"
              />
            </div>
          </div>
        )}

        {biography.is_frozen && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 border border-border/50 rounded-lg px-4 py-2.5">
            <Archive className="h-4 w-4 shrink-0" />
            <span>{t.view.archivedBanner}</span>
          </div>
        )}

        {inReview && reviewEndDate && (
          <div className="mb-6 flex items-start gap-2.5 text-sm bg-brand-mustardLight/45 border border-brand-mustardDark/40 text-brand-ink dark:bg-brand-mustardDark/20 dark:border-brand-mustardDark/50 dark:text-brand-beigeLight rounded-lg px-4 py-3">
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
            {biography.status === 'published' &&
              !biography.export_txt_url &&
              !biography.export_docx_url && (
                <p className="text-sm text-muted-foreground mt-3 not-prose">
                  Word and plain-text downloads are not available for this biography. You can still use
                  the PDF button above if your cover and author details are complete.
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
        onOpenChange={handleReportOpenChange}
        onSuccess={() =>
          toast({ title: t.view.reportSuccess })
        }
      />
      <Toaster />
    </div>
  );
}
