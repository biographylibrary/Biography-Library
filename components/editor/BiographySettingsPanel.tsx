'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, Camera, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface BiographySettingsPanelProps {
  biographyId: string;
  biographyType: 'autobiography' | 'memorial';
  slug: string | null;
  onBiographyTypeChange: (value: 'autobiography' | 'memorial') => void;
  onSlugChange: (value: string | null) => void;
  biographyTitle: string;
  authorName: string;
  onNavigateToPhotos: () => void;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function BiographySettingsPanel({
  biographyId,
  biographyType,
  slug,
  onBiographyTypeChange,
  onSlugChange,
  biographyTitle,
  authorName,
  onNavigateToPhotos,
}: BiographySettingsPanelProps) {
  const { t } = useTranslation();
  const [slugInput, setSlugInput] = useState(slug ?? '');
  const [slugError, setSlugError] = useState<string | null>(null);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
  const [coverPhotoChecked, setCoverPhotoChecked] = useState(false);

  useEffect(() => {
    setSlugInput(slug ?? '');
  }, [slug]);

  const fetchCoverPhoto = useCallback(async () => {
    const { data } = await supabase
      .from('biography_media')
      .select('file_url, storage_path')
      .eq('biography_id', biographyId)
      .eq('layout', 'cover')
      .limit(1)
      .maybeSingle();

    const url = data?.file_url ?? data?.storage_path ?? null;
    setCoverPhotoUrl(url);
    setCoverPhotoChecked(true);
  }, [biographyId]);

  useEffect(() => {
    fetchCoverPhoto();
  }, [fetchCoverPhoto]);

  const handleTypeChange = useCallback(
    async (value: 'autobiography' | 'memorial') => {
      onBiographyTypeChange(value);
      await supabase
        .from('biographies')
        .update({ biography_type: value })
        .eq('id', biographyId);
    },
    [biographyId, onBiographyTypeChange]
  );

  const handleSlugInput = useCallback((value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlugInput(cleaned);
    setSlugError(null);
  }, []);

  const handleSlugBlur = useCallback(async () => {
    const trimmed = slugInput.trim().replace(/^-+|-+$/g, '');
    if (!trimmed) {
      setSlugInput('');
      return;
    }
    const { error } = await supabase
      .from('biographies')
      .update({ slug: trimmed })
      .eq('id', biographyId);

    if (error) {
      if (error.code === '23505' || error.message?.toLowerCase().includes('unique')) {
        setSlugError(t.settings.slug.duplicateError);
      } else {
        setSlugError(error.message);
      }
    } else {
      setSlugError(null);
      onSlugChange(trimmed);
    }
  }, [biographyId, slugInput, onSlugChange, t.settings.slug.duplicateError]);

  const slugPlaceholder = biographyTitle ? generateSlug(biographyTitle) : '';
  const displaySlug = slugInput || slug || '';

  const displayTitle = biographyTitle || '\u00a0';
  const displayAuthor = authorName || '\u00a0';

  return (
    <div className="px-4 sm:px-6 py-4 border-b border-border/30 bg-muted/20">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">{t.nav.settings}</h3>
      </div>

      <div className="space-y-5">
        {/* ── COVER PREVIEW ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t.settings.coverPreview}
            </label>
            <button
              type="button"
              onClick={fetchCoverPhoto}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Refresh cover photo"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>

          {/* B5 ratio container: 176/250 */}
          <div
            style={{ aspectRatio: '176 / 250', backgroundColor: '#FFFFFF' }}
            className="w-full rounded overflow-hidden"
          >
            {/* Outer white border: 10/176 ≈ 5.68% */}
            <div
              style={{ padding: '5.68%', height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              {/* Box A — text box: 70/250 = 28% of total height */}
              <div
                style={{
                  backgroundColor: '#ECE9E4',
                  borderRadius: '4.55%',
                  height: '28%',
                  padding: '5.68%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {/* Title — top-aligned */}
                <div
                  style={{
                    fontFamily: "'Noto Serif', Georgia, serif",
                    fontSize: '1.18em',
                    lineHeight: 1.05,
                    color: '#121212',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {displayTitle}
                </div>
                {/* Author — bottom-aligned */}
                <div
                  style={{
                    fontFamily: "'Noto Serif', Georgia, serif",
                    fontSize: '0.64em',
                    color: '#121212',
                    marginTop: 'auto',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {displayAuthor}
                </div>
              </div>

              {/* Gap: 4/250 ≈ 1.6% of total height */}
              <div style={{ flexShrink: 0, height: '1.6%' }} />

              {/* Box B — photo: square, fills remaining width */}
              <div
                style={{
                  borderRadius: '4.55%',
                  overflow: 'hidden',
                  aspectRatio: '1 / 1',
                  width: '100%',
                  flexShrink: 0,
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {coverPhotoUrl ? (
                  <img
                    src={coverPhotoUrl}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      display: 'block',
                    }}
                  />
                ) : (
                  coverPhotoChecked && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6%',
                        padding: '8%',
                        textAlign: 'center',
                      }}
                    >
                      <Camera
                        style={{ width: '18%', height: '18%', color: '#999' }}
                      />
                      <span
                        style={{
                          fontSize: '0.55em',
                          color: '#888',
                          lineHeight: 1.2,
                        }}
                      >
                        {t.settings.noCoverPhoto}
                      </span>
                      <button
                        type="button"
                        onClick={onNavigateToPhotos}
                        style={{
                          fontSize: '0.5em',
                          color: '#555',
                          textDecoration: 'underline',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          lineHeight: 1.3,
                        }}
                      >
                        {t.settings.goToPhotos}
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── BIOGRAPHY TYPE ── */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t.settings.biographyType.label}
          </label>
          <div className="flex rounded-lg overflow-hidden border border-border/60 text-xs font-medium">
            <button
              onClick={() => handleTypeChange('autobiography')}
              className={cn(
                'flex-1 py-1.5 px-3 transition-colors',
                biographyType === 'autobiography'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              {t.settings.biographyType.autobiography}
            </button>
            <button
              onClick={() => handleTypeChange('memorial')}
              className={cn(
                'flex-1 py-1.5 px-3 transition-colors border-l border-border/60',
                biographyType === 'memorial'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              {t.settings.biographyType.memorial}
            </button>
          </div>
        </div>

        {/* ── SLUG ── */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t.settings.slug.label}
          </label>
          <input
            type="text"
            value={slugInput}
            onChange={(e) => handleSlugInput(e.target.value)}
            onBlur={handleSlugBlur}
            placeholder={slugPlaceholder}
            className={cn(
              'w-full h-8 px-2.5 text-xs rounded-md border bg-background',
              'focus:outline-none focus:ring-1 focus:ring-primary',
              slugError ? 'border-destructive' : 'border-border/60'
            )}
          />
          {slugError && (
            <p className="text-xs text-destructive">{slugError}</p>
          )}
          <p className="text-xs text-muted-foreground">{t.settings.slug.helper}</p>
          {displaySlug && (
            <p className="text-xs text-muted-foreground font-mono truncate">
              biographylibrary.org/{displaySlug}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
