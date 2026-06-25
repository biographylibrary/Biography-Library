'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileDown, Loader as Loader2, Lock, Info, Archive, Flag, Languages } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { translations, type Language, type Translations } from '@/lib/i18n/translations';
import { ReportBiographyModal } from '@/components/editor/ReportBiographyModal';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { logger } from '@/lib/logger';
import { memorialSubjectName } from '@/lib/biography-display';
import { BiographySectionBody } from '@/components/biography/BiographySectionBody';
import { BiographyContentRightsNotice } from '@/components/biography/BiographyContentRightsNotice';

type ViewLanguage = 'en' | 'it' | 'fr' | 'de';

interface BiographyViewData {
  id: string;
  title: string;
  subject_name?: string | null;
  biography_type?: 'autobiography' | 'memorial' | null;
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
  listing_cover_url?: string | null;
  content_language?: string | null;
  final_pdf_url?: string | null;
}

interface SectionWithDate {
  key: string;
  title: string;
  text: string;
  sectionCreatedAt: string | null;
}

type ViewError = 'not-found' | 'private' | 'invalid-token' | null;

const BIOGRAPHY_VIEW_SELECT =
  'id, title, subject_name, biography_type, author_name, content, visibility, status, share_token, created_at, published_at, is_frozen, frozen_at, export_txt_url, export_docx_url, listing_cover_url, content_language, final_pdf_url';

const VIEW_LANGUAGES: ViewLanguage[] = ['en', 'it', 'fr', 'de'];

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

function isViewLanguage(value: string | null | undefined): value is ViewLanguage {
  return !!value && VIEW_LANGUAGES.includes(value as ViewLanguage);
}

function languageLabel(lang: string, t: Translations): string {
  const map: Record<string, string> = {
    en: t.view.languageNameEn,
    it: t.view.languageNameIt,
    fr: t.view.languageNameFr,
    de: t.view.languageNameDe,
  };
  return map[lang] ?? lang.toUpperCase();
}

function interpolate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    template
  );
}

export default function BiographyViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, language: uiLanguage } = useTranslation();
  const id = params.id as string;
  const token = searchParams.get('token');

  const { toast } = useToast();
  const [biography, setBiography] = useState<BiographyViewData | null>(null);
  const [orderedSections, setOrderedSections] = useState<SectionWithDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ViewError>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadedViaShareToken, setLoadedViaShareToken] = useState(false);
  const reportAutoOpenedRef = useRef(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfReady, setPdfReady] = useState<boolean | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [resolvedBiographyId, setResolvedBiographyId] = useState<string | null>(null);
  const [availableTargets, setAvailableTargets] = useState<ViewLanguage[]>([]);
  const [readingLanguage, setReadingLanguage] = useState<'original' | ViewLanguage>('original');
  const [translatedSections, setTranslatedSections] = useState<Record<string, Record<string, string>>>({});
  const [translationLoading, setTranslationLoading] = useState(false);

  const contentLanguage = isViewLanguage(biography?.content_language)
    ? biography!.content_language!
    : 'en';

  const showRightsNotice =
    !!biography &&
    ((biography.visibility === 'public' && biography.status === 'published') || loadedViaShareToken);

  const hasServerPdf =
    biography?.status === 'published' && !!biography.final_pdf_url?.trim();

  const sectionTitlePack =
    readingLanguage === 'original'
      ? translations[contentLanguage as Language]?.sectionTitles ?? t.sectionTitles
      : translations[readingLanguage]?.sectionTitles ?? t.sectionTitles;

  const fetchAvailableLanguages = useCallback(
    async (bioId: string, shareToken: string | null) => {
      const qs = shareToken ? `?shareToken=${encodeURIComponent(shareToken)}` : '';
      try {
        const res = await fetch(`/api/biography/${bioId}/available-languages${qs}`);
        if (!res.ok) return;
        const data = await res.json();
        const targets = (data.availableTargets ?? []).filter(isViewLanguage) as ViewLanguage[];
        setAvailableTargets(targets);
      } catch {
        /* optional */
      }
    },
    []
  );

  const loadTranslation = useCallback(
    async (bioId: string, targetLang: ViewLanguage, shareToken: string | null) => {
      if (translatedSections[targetLang]) {
        setReadingLanguage(targetLang);
        return;
      }

      setTranslationLoading(true);
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

        const res = await fetch(`/api/biography/${bioId}/translate-view`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            targetLanguage: targetLang,
            shareToken: shareToken ?? undefined,
          }),
        });

        if (!res.ok) {
          toast({ title: t.view.translationFailed, variant: 'destructive' });
          return;
        }

        const data = await res.json();
        const sections = data.sections as Record<string, string>;
        setTranslatedSections((prev) => ({ ...prev, [targetLang]: sections }));
        setAvailableTargets((prev) =>
          prev.includes(targetLang) ? prev : [...prev, targetLang].sort()
        );
        setReadingLanguage(targetLang);
      } catch {
        toast({ title: t.view.translationFailed, variant: 'destructive' });
      } finally {
        setTranslationLoading(false);
      }
    },
    [t.view.translationFailed, toast, translatedSections]
  );

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
      setLoadedViaShareToken(false);
      setReadingLanguage('original');
      setTranslatedSections({});
      setAvailableTargets([]);

      const resolvedId = await resolveId();
      if (!resolvedId) {
        setError('not-found');
        setIsLoading(false);
        return;
      }
      setResolvedBiographyId(resolvedId);

      let data: BiographyViewData | null = null;
      let loadError: ViewError = null;
      let tokenSectionTimestamps: Record<string, string> | null = null;
      let viaToken = false;

      if (token) {
        const tokenQuery = await supabase.rpc('get_biography_by_share_token', {
          p_biography_id: resolvedId,
          p_token: token,
        });

        if (!tokenQuery.error && tokenQuery.data && tokenQuery.data.length > 0) {
          const rows = tokenQuery.data as Array<
            BiographyViewData & { section_name: string | null; section_created_at: string | null }
          >;
          data = { ...rows[0], export_txt_url: null, export_docx_url: null } as BiographyViewData;
          viaToken = true;
          tokenSectionTimestamps = {};
          for (const row of rows) {
            if (row.section_name && row.section_created_at) {
              tokenSectionTimestamps[row.section_name] = row.section_created_at;
            }
          }
          const { data: fullBio } = await supabase
            .from('biographies')
            .select('content_language, final_pdf_url')
            .eq('id', resolvedId)
            .maybeSingle();
          if (fullBio && data) {
            data.content_language = (fullBio as { content_language?: string }).content_language;
            data.final_pdf_url = (fullBio as { final_pdf_url?: string }).final_pdf_url ?? null;
          }
          if (data.status === 'published') {
            supabase.rpc('increment_view_count', { biography_uuid: resolvedId });
          }
        } else {
          loadError = 'invalid-token';
        }
      } else {
        const publicQuery = await supabase
          .from('biographies')
          .select(BIOGRAPHY_VIEW_SELECT)
          .eq('id', resolvedId)
          .eq('visibility', 'public')
          .eq('status', 'published')
          .maybeSingle();

        if (!publicQuery.error && publicQuery.data) {
          data = publicQuery.data as BiographyViewData;
          supabase.rpc('increment_view_count', { biography_uuid: resolvedId });
        } else {
          const { data: authData } = await supabase.auth.getSession();
          if (authData.session) {
            const privilegedQuery = await supabase
              .from('biographies')
              .select(BIOGRAPHY_VIEW_SELECT)
              .eq('id', resolvedId)
              .maybeSingle();

            if (!privilegedQuery.error && privilegedQuery.data) {
              data = privilegedQuery.data as BiographyViewData;
              if (data.status === 'published' && data.visibility === 'public') {
                supabase.rpc('increment_view_count', { biography_uuid: resolvedId });
              }
            } else {
              loadError = 'not-found';
            }
          } else {
            loadError = 'not-found';
          }
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
      setLoadedViaShareToken(viaToken);

      if (!hasServerPdfFor(data)) {
        checkBiographyPdfReadiness(resolvedId).then((result) => {
          setPdfReady(result.ok);
        });
      } else {
        setPdfReady(true);
      }

      const listing = data.listing_cover_url?.trim();
      if (listing) {
        setCoverImageUrl(listing);
      } else {
        getCoverPhotoDisplayUrl(resolvedId).then(setCoverImageUrl);
      }

      const sectionTimestamps: Record<string, string> = tokenSectionTimestamps ?? {};

      if (!tokenSectionTimestamps && Object.keys(sectionTimestamps).length === 0) {
        const { data: sectionRows } = await supabase
          .from('biography_sections')
          .select('section_key, created_at')
          .eq('biography_id', resolvedId);
        for (const row of sectionRows ?? []) {
          const key = (row as { section_key?: string | null }).section_key;
          const createdAt = (row as { created_at?: string | null }).created_at;
          if (key && createdAt) {
            sectionTimestamps[key] = createdAt;
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
      void fetchAvailableLanguages(resolvedId, token);
    };

    load();
  }, [id, token, fetchAvailableLanguages]);

  function hasServerPdfFor(bio: BiographyViewData): boolean {
    return bio.status === 'published' && !!bio.final_pdf_url?.trim();
  }

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
      case 'not-found':
        return t.view.notFoundOrDenied;
      case 'private':
        return t.view.biographyPrivate;
      case 'invalid-token':
        return t.view.tokenMissing;
      default:
        return t.view.notAvailable;
    }
  };

  const getBiographyExportData = () => ({
    id: biography!.id,
    title: biography!.title,
    author_name: biography!.author_name,
    subject_name: biography!.subject_name ?? null,
    biography_type: biography!.biography_type ?? 'autobiography',
    content: biography!.content,
    created_at: biography!.created_at,
  });

  const handleExportPDF = async () => {
    if (!biography || pdfLoading || hasServerPdf) return;
    setPdfLoading(true);
    try {
      const readiness = await checkBiographyPdfReadiness(biography.id, true);
      if (!readiness.ok) {
        setPdfReady(false);
        const hasCoverIssue =
          readiness.issues.includes('missing-cover') ||
          readiness.issues.includes('cover-unreachable');
        toast({
          title: hasCoverIssue ? t.exportDialog.noCoverPhotoWarning : t.exportDialog.exportError,
          variant: 'destructive',
        });
        return;
      }
      setPdfReady(true);
      await generateBiographyPDF(getBiographyExportData());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      const msg =
        message === 'MISSING_COVER_PHOTO' || message === 'MISSING_BIOGRAPHY_ID'
          ? t.exportDialog.noCoverPhotoWarning
          : message === 'FONT_LOAD_FAILED'
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

  const handleReadingLanguageChange = (value: string) => {
    if (!resolvedBiographyId) return;
    if (value === 'original') {
      setReadingLanguage('original');
      return;
    }
    if (!isViewLanguage(value)) return;
    void loadTranslation(resolvedBiographyId, value, token);
  };

  const suggestUiTranslation =
    isViewLanguage(uiLanguage) &&
    uiLanguage !== contentLanguage &&
    !availableTargets.includes(uiLanguage) &&
    readingLanguage === 'original';

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

  const activeTranslated =
    readingLanguage !== 'original' ? translatedSections[readingLanguage] : null;

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
            {hasServerPdf ? (
              <Button variant="outline" size="sm" asChild className="gap-2">
                <a href={biography.final_pdf_url!} target="_blank" rel="noopener noreferrer" download>
                  <FileDown className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.view.downloadPdf}</span>
                </a>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={pdfLoading || pdfReady === false}
                className="gap-2"
                title={
                  pdfReady === false ? t.exportDialog.noCoverPhotoWarning : undefined
                }
              >
                {pdfLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{t.view.downloadPdf}</span>
              </Button>
            )}
            {biography.export_txt_url && (
              <Button variant="outline" size="sm" asChild className="gap-2">
                <a href={biography.export_txt_url} download>
                  <FileDown className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.view.downloadTxt}</span>
                </a>
              </Button>
            )}
            {biography.export_docx_url && (
              <Button variant="outline" size="sm" asChild className="gap-2">
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
              {biography.biography_type === 'memorial'
                ? memorialSubjectName(biography.subject_name, biography.title)
                : biography.title}
            </h1>
            <p className="text-xl text-muted-foreground">
              {biography.biography_type === 'memorial'
                ? `${t.view.writtenBy} ${biography.author_name}`
                : `${t.view.by} ${biography.author_name}`}
            </p>
            {biography.published_at && (
              <p className="text-sm text-muted-foreground mt-1">
                {t.view.publishedOn} {formatDate(biography.published_at)}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2 not-prose">
              {interpolate(t.view.writtenIn, {
                language: languageLabel(contentLanguage, t),
              })}
            </p>
            {hasServerPdf && (
              <p className="text-xs text-muted-foreground mt-2 not-prose">
                {interpolate(t.view.pdfOriginalLanguage, {
                  language: languageLabel(contentLanguage, t),
                })}
              </p>
            )}

            {(availableTargets.length > 0 ||
              contentLanguage !== uiLanguage ||
              suggestUiTranslation) && (
              <div className="mt-4 flex flex-wrap items-center gap-3 not-prose">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Languages className="h-4 w-4 shrink-0" />
                  <span>{t.view.languageSwitcher}</span>
                </div>
                <Select
                  value={readingLanguage}
                  onValueChange={handleReadingLanguageChange}
                  disabled={translationLoading}
                >
                  <SelectTrigger className="w-[200px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">
                      {t.view.showOriginal} ({languageLabel(contentLanguage, t)})
                    </SelectItem>
                    {availableTargets.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {languageLabel(lang, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {translationLoading && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t.view.translating}
                  </span>
                )}
                {suggestUiTranslation && !translationLoading && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      resolvedBiographyId &&
                      loadTranslation(resolvedBiographyId, uiLanguage, token)
                    }
                  >
                    {interpolate(t.view.readInLanguage, {
                      language: languageLabel(uiLanguage, t),
                    })}
                  </Button>
                )}
              </div>
            )}

            {biography.status === 'published' &&
              !biography.export_txt_url &&
              !biography.export_docx_url && (
                <p className="text-sm text-muted-foreground mt-3 not-prose">
                  {t.view.downloadsUnavailable}
                </p>
              )}
          </div>

          {orderedSections.map((section) => {
            const sectionTitle =
              sectionTitlePack[section.key as keyof typeof sectionTitlePack] || section.key;
            const sectionText =
              activeTranslated?.[section.key] ?? section.text;

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
                <BiographySectionBody text={sectionText} />
              </section>
            );
          })}
        </article>

        <footer className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          {showRightsNotice && <BiographyContentRightsNotice />}
          <p className={showRightsNotice ? 'mt-6' : undefined}>{t.view.preservingStories}</p>
        </footer>
      </main>

      <ReportBiographyModal
        biographyId={biography.id}
        open={reportOpen}
        onOpenChange={handleReportOpenChange}
        onSuccess={() => toast({ title: t.view.reportSuccess })}
      />
      <Toaster />
    </div>
  );
}
