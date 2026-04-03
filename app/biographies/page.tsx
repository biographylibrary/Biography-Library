'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/i18n-context';
import {
  fetchPublishedBiographies,
  fetchFeaturedBiographies,
  fetchMostReadBiographies,
  fetchDiscoverBiographies,
  type PublishedBiography,
} from '@/lib/biographies';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  BookOpen,
  Loader as Loader2,
  CircleAlert as AlertCircle,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  it: '🇮🇹',
  fr: '🇫🇷',
  de: '🇩🇪',
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'EN',
  it: 'IT',
  fr: 'FR',
  de: 'DE',
};

const BRAND_TEAL = '#14B8A6';

function biographyHref(bio: PublishedBiography): string {
  return bio.slug
    ? `/biography/${bio.slug}/view`
    : `/biography/${bio.id}/view`;
}

interface CoverPhotoState {
  url: string | null;
  loaded: boolean;
}

function GraphicCover({ title, authorName }: { title: string; authorName: string }) {
  return (
    <div
      style={{
        background: BRAND_TEAL,
        width: '100%',
        aspectRatio: '176 / 250',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        overflow: 'hidden',
      }}
    >
      <p
        style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          color: '#ffffff',
          fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)',
          fontWeight: 600,
          lineHeight: 1.25,
          textAlign: 'center',
          wordBreak: 'break-word',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {title}
      </p>
      {authorName && (
        <p
          style={{
            fontFamily: "'Noto Serif', Georgia, serif",
            color: 'rgba(255,255,255,0.8)',
            fontSize: 'clamp(0.7rem, 2vw, 0.875rem)',
            fontWeight: 400,
            lineHeight: 1.3,
            textAlign: 'center',
            marginTop: '0.625rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}
        >
          {authorName}
        </p>
      )}
    </div>
  );
}

interface BiographyCardProps {
  bio: PublishedBiography;
  t: ReturnType<typeof useTranslation>['t'];
  featured?: boolean;
}

function BiographyCard({ bio, t, featured }: BiographyCardProps) {
  const isMemorial = bio.biography_type === 'memorial';
  const lang = bio.content_language || 'en';
  const flag = LANGUAGE_FLAGS[lang] ?? '';
  const langLabel = LANGUAGE_LABELS[lang] ?? lang.toUpperCase();
  const typeLabel = isMemorial
    ? t.publicBiographies.typeMemorial
    : t.publicBiographies.typeAutobiography;

  const [cover, setCover] = useState<CoverPhotoState>({ url: null, loaded: false });

  useEffect(() => {
    let cancelled = false;
    if (bio.listing_cover_url?.trim()) {
      setCover({ url: bio.listing_cover_url.trim(), loaded: true });
      return () => {
        cancelled = true;
      };
    }
    supabase
      .from('biography_media')
      .select('storage_path, file_url')
      .eq('biography_id', bio.id)
      .eq('layout', 'cover')
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const url = data?.file_url ?? data?.storage_path ?? null;
        setCover({ url: url ?? null, loaded: true });
      });
    return () => {
      cancelled = true;
    };
  }, [bio.id, bio.listing_cover_url]);

  const showGraphic = !cover.url;
  const href = biographyHref(bio);

  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-200 overflow-hidden',
        featured && 'ring-1 ring-amber-200 dark:ring-amber-800/60'
      )}
    >
      <div className="relative w-full overflow-hidden rounded-t-2xl" style={{ aspectRatio: '176 / 250' }}>
        {!cover.loaded ? (
          <div className="w-full h-full" style={{ background: BRAND_TEAL }} />
        ) : showGraphic ? (
          <GraphicCover
            title={bio.title || t.publicBiographies.untitled}
            authorName={bio.author_name || t.publicBiographies.unknownAuthor}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- cover URLs from storage/CDN; dynamic domains
          <img
            src={cover.url!}
            alt={bio.title || ''}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {featured && (
          <span className="absolute top-2 right-2 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[#DDCF88] text-[#121212]">
            <Star className="h-3 w-3" />
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 p-4">
        <p className="text-sm font-semibold text-foreground truncate leading-snug group-hover:text-primary transition-colors">
          {bio.author_name || t.publicBiographies.unknownAuthor}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {bio.title || t.publicBiographies.untitled}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-blue/35 text-brand-ink dark:bg-brand-blue/20 dark:text-brand-blue">
            {flag} {langLabel}
          </span>
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              isMemorial
                ? 'bg-[#DDCF88]/60 text-[#6B5B1E] dark:bg-[#DDCF88]/20 dark:text-[#DDCF88]'
                : 'bg-brand-greenLight/45 text-brand-greenDark dark:bg-brand-greenLight/15 dark:text-brand-greenLight'
            )}
          >
            {typeLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

interface SectionProps {
  title: string;
  bios: PublishedBiography[];
  t: ReturnType<typeof useTranslation>['t'];
  featured?: boolean;
}

function BiographySection({ title, bios, t, featured }: SectionProps) {
  if (bios.length === 0) return null;
  return (
    <section className="mb-14">
      <h2 className="text-xl font-serif font-semibold text-foreground mb-6 flex items-center gap-2">
        {title}
        <span className="h-px flex-1 bg-border/60" />
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {bios.map((bio) => (
          <BiographyCard key={bio.id} bio={bio} t={t} featured={featured} />
        ))}
      </div>
    </section>
  );
}

export default function PublicBiographiesPage() {
  const { t } = useTranslation();
  const [allBios, setAllBios] = useState<PublishedBiography[]>([]);
  const [featured, setFeatured] = useState<PublishedBiography[]>([]);
  const [mostRead, setMostRead] = useState<PublishedBiography[]>([]);
  const [discover, setDiscover] = useState<PublishedBiography[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);

      const [featuredRes, mostReadRes] = await Promise.all([
        fetchFeaturedBiographies(),
        fetchMostReadBiographies(),
      ]);

      if (featuredRes.error || mostReadRes.error) {
        setError(featuredRes.error ?? mostReadRes.error ?? t.publicBiographies.errorLoading);
        setIsLoading(false);
        return;
      }

      const featuredData = featuredRes.data ?? [];
      const mostReadData = mostReadRes.data ?? [];

      const shownIds = [
        ...featuredData.map((b) => b.id),
        ...mostReadData.map((b) => b.id),
      ];
      const uniqueShownIds = shownIds.filter((id, i, arr) => arr.indexOf(id) === i);

      const discoverRes = await fetchDiscoverBiographies(uniqueShownIds);

      setFeatured(featuredData);
      setMostRead(mostReadData);
      setDiscover(discoverRes.data ?? []);
      setIsLoading(false);
    };

    load();
  }, [t.publicBiographies.errorLoading]);

  useEffect(() => {
    if (!search && langFilter === 'all' && typeFilter === 'all') return;
    const load = async () => {
      const { data } = await fetchPublishedBiographies();
      setAllBios(data ?? []);
    };
    load();
  }, [search, langFilter, typeFilter]);

  const isSearchActive = search.trim() !== '' || langFilter !== 'all' || typeFilter !== 'all';

  const filtered = useMemo(() => {
    if (!isSearchActive) return [];
    const q = search.trim().toLowerCase();
    return allBios.filter((bio) => {
      if (q) {
        const inTitle = (bio.title || '').toLowerCase().includes(q);
        const inAuthor = (bio.author_name || '').toLowerCase().includes(q);
        if (!inTitle && !inAuthor) return false;
      }
      if (langFilter !== 'all' && (bio.content_language || 'en') !== langFilter) return false;
      if (typeFilter === 'autobiography' && bio.biography_type === 'memorial') return false;
      if (typeFilter === 'memorial' && bio.biography_type !== 'memorial') return false;
      return true;
    });
  }, [allBios, search, langFilter, typeFilter, isSearchActive]);

  return (
    <div className="min-h-full bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10 space-y-2">
          <h1 className="text-3xl font-serif font-semibold tracking-tight text-foreground">
            {t.publicBiographies.pageTitle}
          </h1>
          <p className="text-muted-foreground text-base">
            {t.publicBiographies.pageSubtitle}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.publicBiographies.searchPlaceholder}
              className="pl-9"
            />
          </div>

          <Select value={langFilter} onValueChange={setLangFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder={t.publicBiographies.filterLanguage} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.publicBiographies.langAll}</SelectItem>
              <SelectItem value="en">🇬🇧 EN</SelectItem>
              <SelectItem value="it">🇮🇹 IT</SelectItem>
              <SelectItem value="fr">🇫🇷 FR</SelectItem>
              <SelectItem value="de">🇩🇪 DE</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder={t.publicBiographies.filterType} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.publicBiographies.filterAll}</SelectItem>
              <SelectItem value="autobiography">{t.publicBiographies.typeAutobiography}</SelectItem>
              <SelectItem value="memorial">{t.publicBiographies.typeMemorial}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <Loader2 className="h-7 w-7 animate-spin" />
            <p className="text-sm">{t.publicBiographies.loading}</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <AlertCircle className="h-7 w-7 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!isLoading && !error && isSearchActive && (
          <>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium text-foreground">{t.publicBiographies.noResults}</p>
                <p className="text-sm text-muted-foreground">{t.publicBiographies.noResultsSubtitle}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => { setSearch(''); setLangFilter('all'); setTypeFilter('all'); }}
                >
                  {t.publicBiographies.filterAll}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filtered.map((bio) => (
                  <BiographyCard key={bio.id} bio={bio} t={t} />
                ))}
              </div>
            )}
          </>
        )}

        {!isLoading && !error && !isSearchActive && (
          <>
            {featured.length > 0 && (
              <BiographySection
                title={t.publicBiographies.featuredTitle}
                bios={featured}
                t={t}
                featured
              />
            )}
            <BiographySection
              title={t.publicBiographies.mostReadTitle}
              bios={mostRead}
              t={t}
            />
            <BiographySection
              title={t.publicBiographies.discoverTitle}
              bios={discover}
              t={t}
            />
          </>
        )}
      </main>
    </div>
  );
}
