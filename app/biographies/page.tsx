'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/i18n-context';
import {
  fetchPublishedBiographies,
  fetchPublicEditionsOf,
  type PublishedBiography,
  type PublicEditionRow,
} from '@/lib/biographies';
import { formatMemorialAuthorAttribution, memorialSubjectName } from '@/lib/biography-display';
import { isWithinProvisionalWindow } from '@/lib/provisional-window';
import { BiographyLanguageBadges } from '@/components/biography/BiographyLanguageBadges';
import { PioneerBadge } from '@/components/biography/PioneerBadge';
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
import { brandHex } from '@/lib/ui-palette';
import {
  buildWorkVersions,
  languageBase,
  pickDisplayVersion,
  workMatchesLanguage,
  workMatchesSearch,
  type WorkVersion,
} from '@/lib/work-languages';
import { textLanguageLabels } from '@/lib/text-languages';
import { mergeEditionsByOriginal } from '@/lib/catalog-editions';
import { usePublicCatalogInitialLoad } from '@/hooks/use-public-catalog-initial-load';

function biographyHref(version: { id: string; slug: string | null }): string {
  return version.slug
    ? `/biography/${version.slug}/view`
    : `/biography/${version.id}/view`;
}

function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}

interface CoverPhotoState {
  url: string | null;
  loaded: boolean;
}

function GraphicCover({ title, authorName }: { title: string; authorName: string }) {
  return (
    <div
      style={{
        background: brandHex.greenDark,
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
  versions: WorkVersion[];
  displayVersion: WorkVersion;
  languageFilter: string;
  searchText: string;
  t: ReturnType<typeof useTranslation>['t'];
  featured?: boolean;
}

function AvailableLanguageChips({
  versions,
  t,
  uiLanguage,
}: {
  versions: WorkVersion[];
  t: ReturnType<typeof useTranslation>['t'];
  uiLanguage: string;
}) {
  const bases = versions.map((v) => languageBase(v.tag)).filter(Boolean);
  const unique: string[] = [];
  for (const base of bases) {
    if (!unique.includes(base)) unique.push(base);
  }
  const shown = unique.slice(0, 3);
  const extra = unique.length - shown.length;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-muted-foreground">{t.publicBiographies.availableIn}</span>
      {shown.map((base) => {
        const labels = textLanguageLabels(base, uiLanguage);
        return (
          <span
            key={base}
            className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-border"
            title={labels.inUi}
          >
            {base.toUpperCase()}
            <span className="sr-only"> ({labels.inUi})</span>
          </span>
        );
      })}
      {extra > 0 && (
        <span
          className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-border"
          title={interpolate(t.publicBiographies.moreLanguagesAria, { count: String(extra) })}
        >
          +{extra}
          <span className="sr-only">
            {' '}
            ({interpolate(t.publicBiographies.moreLanguagesAria, { count: String(extra) })})
          </span>
        </span>
      )}
    </div>
  );
}

function BiographyCard({
  bio,
  versions,
  displayVersion,
  t,
  featured,
}: BiographyCardProps) {
  const { language } = useTranslation();
  const isMemorial = bio.biography_type === 'memorial';
  const displayTitle = displayVersion.title?.trim() || bio.title;
  const displaySubject =
    displayVersion.subjectName?.trim() || bio.subject_name || null;
  const subject = memorialSubjectName(displaySubject, displayTitle);
  const cardTitle = isMemorial
    ? subject || t.publicBiographies.untitled
    : displayTitle || t.publicBiographies.untitled;
  const cardSubtitle = isMemorial
    ? `${t.biography.writtenBy} ${bio.author_name || t.publicBiographies.unknownAuthor}`
    : bio.author_name || t.publicBiographies.unknownAuthor;
  const graphicTitle = isMemorial
    ? subject || t.publicBiographies.untitled
    : displayTitle || t.publicBiographies.untitled;
  const graphicAuthor = isMemorial
    ? formatMemorialAuthorAttribution(
        bio.author_name || t.publicBiographies.unknownAuthor,
        language
      )
    : bio.author_name || t.publicBiographies.unknownAuthor;
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
      .select('storage_path, file_url, layout')
      .eq('biography_id', bio.id)
      .in('layout', ['cover', 'cover_a5'])
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data as { file_url?: string | null; storage_path?: string | null; layout?: string }[] | null) ?? [];
        const prefer = rows.find((r) => r.layout === 'cover') ?? rows[0];
        const url = prefer?.file_url ?? prefer?.storage_path ?? null;
        setCover({ url: url ?? null, loaded: true });
      });
    return () => {
      cancelled = true;
    };
  }, [bio.id, bio.listing_cover_url]);

  const showGraphic = !cover.url;
  const href = biographyHref(displayVersion);
  const titleLang =
    languageBase(displayVersion.tag) !== language ? displayVersion.tag : undefined;
  const showAvailableIn = versions.length >= 2;

  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-200 overflow-hidden',
        featured && 'ring-1 ring-border'
      )}
    >
      <div className="relative w-full overflow-hidden rounded-t-2xl" style={{ aspectRatio: '176 / 250' }}>
        {!cover.loaded ? (
          <div className="w-full h-full" style={{ background: brandHex.greenDark }} />
        ) : showGraphic ? (
          <GraphicCover title={graphicTitle} authorName={graphicAuthor} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- cover URLs from storage/CDN; dynamic domains
          <img
            src={cover.url!}
            alt={cardTitle}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {bio.is_pioneer && (
          <span className="absolute top-2 left-2 z-10">
            <PioneerBadge label={t.publicBiographies.pioneer} />
          </span>
        )}
        {featured && (
          <span className="absolute top-2 right-2 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full tone-on-image tone-warning">
            <Star className="h-3 w-3" />
            {t.publicBiographies.featured}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 p-4">
        <p
          className="font-serif text-[1.05rem] font-normal text-foreground truncate leading-snug group-hover:text-primary transition-colors"
          lang={titleLang}
        >
          {cardTitle}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {cardSubtitle}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {showAvailableIn ? (
            <AvailableLanguageChips versions={versions} t={t} uiLanguage={language} />
          ) : (
            <BiographyLanguageBadges
              originalLanguage={bio.record_language_tag || 'en'}
              isOriginal
            />
          )}
          <span className="text-xs text-muted-foreground">
            {typeLabel}
          </span>
          {isWithinProvisionalWindow(bio.provisional_until) && (
            <span className="text-xs px-2 py-0.5 rounded-full tone-warning">
              {t.publicBiographies.provisionalMark}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

interface SectionProps {
  title: string;
  bios: PublishedBiography[];
  editionsByOriginal: Record<string, PublicEditionRow[]>;
  languageFilter: string;
  searchText: string;
  t: ReturnType<typeof useTranslation>['t'];
  featured?: boolean;
}

function versionsForBio(
  bio: PublishedBiography,
  editionsByOriginal: Record<string, PublicEditionRow[]>
): WorkVersion[] {
  const editions = editionsByOriginal[bio.id] ?? [];
  return buildWorkVersions(
    {
      id: bio.id,
      slug: bio.slug,
      title: bio.title,
      subjectName: bio.subject_name ?? null,
      tag: bio.record_language_tag || 'en',
    },
    editions.map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      subjectName: e.subject_name,
      tag: e.record_language_tag,
    }))
  );
}

function BiographySection({
  title,
  bios,
  editionsByOriginal,
  languageFilter,
  searchText,
  t,
  featured,
}: SectionProps) {
  if (bios.length === 0) return null;
  return (
    <section className="mb-14">
      <h2 className="text-xl font-serif text-foreground mb-6 flex items-center gap-2">
        {title}
        <span className="h-px flex-1 bg-border/60" />
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {bios.map((bio) => {
          const versions = versionsForBio(bio, editionsByOriginal);
          const displayVersion = pickDisplayVersion({
            versions,
            languageFilter,
            searchText,
            authorName: bio.author_name,
          });
          return (
            <BiographyCard
              key={bio.id}
              bio={bio}
              versions={versions}
              displayVersion={displayVersion}
              languageFilter={languageFilter}
              searchText={searchText}
              t={t}
              featured={featured}
            />
          );
        })}
      </div>
    </section>
  );
}

export default function BiographiesPage() {
  return <PublicBiographiesPage />;
}

function PublicBiographiesPage() {
  const { t, language } = useTranslation();
  const [allBios, setAllBios] = useState<PublishedBiography[]>([]);
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const {
    featured,
    mostRead,
    discover,
    editionsByOriginal,
    setEditionsByOriginal,
    languageMenu,
    isLoading,
    error,
  } = usePublicCatalogInitialLoad({
    errorLoadingMessage: t.publicBiographies.errorLoading,
    language,
  });

  useEffect(() => {
    if (!search && langFilter === 'all' && typeFilter === 'all') return;
    const load = async () => {
      const { data } = await fetchPublishedBiographies();
      const list = data ?? [];
      const ids = list.map((b) => b.id);
      const editionsRes = await fetchPublicEditionsOf(ids);
      // Stesso blocco sincrono: niente filtro a metà con allBios già pieno e edizioni vecchie.
      setAllBios(list);
      setEditionsByOriginal((prev) => mergeEditionsByOriginal(prev, editionsRes.data ?? []));
    };
    load();
  }, [search, langFilter, typeFilter, setEditionsByOriginal]);

  const isSearchActive = search.trim() !== '' || langFilter !== 'all' || typeFilter !== 'all';

  const filtered = useMemo(() => {
    if (!isSearchActive) return [];
    const q = search.trim();
    return allBios.filter((bio) => {
      const versions = versionsForBio(bio, editionsByOriginal);
      if (!workMatchesSearch({ versions, authorName: bio.author_name, searchText: q })) {
        return false;
      }
      if (!workMatchesLanguage(versions, langFilter)) return false;
      if (typeFilter === 'autobiography' && bio.biography_type === 'memorial') return false;
      if (typeFilter === 'memorial' && bio.biography_type !== 'memorial') return false;
      return true;
    });
  }, [allBios, search, langFilter, typeFilter, isSearchActive, editionsByOriginal]);

  return (
    <div className="min-h-full bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10 space-y-2">
          <h1 className="text-3xl font-serif tracking-tight text-foreground">
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
              {languageMenu.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
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
                <BookOpen className="h-10 w-10 text-muted-foreground" />
                <p className="text-foreground">{t.publicBiographies.noResults}</p>
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map((bio) => {
                  const versions = versionsForBio(bio, editionsByOriginal);
                  const displayVersion = pickDisplayVersion({
                    versions,
                    languageFilter: langFilter,
                    searchText: search,
                    authorName: bio.author_name,
                  });
                  return (
                    <BiographyCard
                      key={bio.id}
                      bio={bio}
                      versions={versions}
                      displayVersion={displayVersion}
                      languageFilter={langFilter}
                      searchText={search}
                      t={t}
                    />
                  );
                })}
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
                editionsByOriginal={editionsByOriginal}
                languageFilter={langFilter}
                searchText={search}
                t={t}
                featured
              />
            )}
            <BiographySection
              title={t.publicBiographies.mostReadTitle}
              bios={mostRead}
              editionsByOriginal={editionsByOriginal}
              languageFilter={langFilter}
              searchText={search}
              t={t}
            />
            <BiographySection
              title={t.publicBiographies.discoverTitle}
              bios={discover}
              editionsByOriginal={editionsByOriginal}
              languageFilter={langFilter}
              searchText={search}
              t={t}
            />
          </>
        )}
      </main>
    </div>
  );
}
