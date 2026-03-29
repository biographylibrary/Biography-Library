'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings } from 'lucide-react';
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
}: BiographySettingsPanelProps) {
  const { t } = useTranslation();
  const [slugInput, setSlugInput] = useState(slug ?? '');
  const [slugError, setSlugError] = useState<string | null>(null);

  useEffect(() => {
    setSlugInput(slug ?? '');
  }, [slug]);

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

  return (
    <div className="px-4 sm:px-6 py-4 border-b border-border/30 bg-muted/20">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">{t.nav.settings}</h3>
      </div>

      <div className="space-y-5">
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
