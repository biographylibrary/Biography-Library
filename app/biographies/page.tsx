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
  User,
  Globe,
  Layers,
  Calendar,
  Loader as Loader2,
  CircleAlert as AlertCircle,
  BookMarked,
  Eye,
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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

  return (
    <Link
      href={`/biography/${bio.id}/view`}
      className={cn(
        'group flex flex-col rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-200 overflow-hidden',
        featured && 'ring-1 ring-amber-200 dark:ring-amber-800/60'
      )}
    >
      <div className="flex flex-col flex-1 p-6 gap-4">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              'p-2.5 rounded-xl shrink-0',
              isMemorial ? 'bg-[#DDCF88] dark:bg-[#DDCF88]/20' : 'bg-sky-50 dark:bg-sky-950/30'
            )}
          >
            {isMemorial ? (
              <BookMarked className="h-5 w-5 text-[#121212] dark:text-[#DDCF88]" />
            ) : (
              <BookOpen className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {featured && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[#DDCF88] text-[#121212] dark:bg-[#DDCF88]/20 dark:text-[#DDCF88]">
                <Star className="h-3 w-3" />
                Featured
              </span>
            )}
            <span
              className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-full',
                isMemorial
                  ? 'bg-[#DDCF88] text-[#121212] dark:bg-[#DDCF88]/20 dark:text-[#DDCF88]'
                  : 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
              )}
            >
              {isMemorial ? t.publicBiographies.typeMemorial : t.publicBiographies.typeAutobiography}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
            {bio.title || t.publicBiographies.untitled}
          </h3>
          <p className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{bio.author_name || t.publicBiographies.unknownAuthor}</span>
          </p>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/50 gap-3 flex-wrap">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" />
              <span>{flag} {langLabel}</span>
            </span>
            <span className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              <span>{bio.chapters_count ?? 0} {t.publicBiographies.chaptersCount}</span>
            </span>
            {(bio.view_count ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                <span>{bio.view_count} {t.publicBiographies.viewsCount}</span>
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(bio.published_at)}
          </span>
        </div>
      </div>

      <div className="px-6 pb-5">
        <div className="w-full text-center text-xs font-medium text-primary group-hover:underline underline-offset-2 transition-all">
          {t.publicBiographies.readBiography} →
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
    <div className="min-h-screen bg-background">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
