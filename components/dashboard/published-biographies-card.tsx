'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import { BookOpen, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { it, fr, de } from 'date-fns/locale';

interface PublishedBiography {
  id: string;
  title: string;
  published_at: string;
  author_name: string;
}

interface PublishedBiographiesCardProps {
  userId: string;
}

export function PublishedBiographiesCard({ userId }: PublishedBiographiesCardProps) {
  const { t, language } = useTranslation();
  const router = useRouter();
  const [publishedBiographies, setPublishedBiographies] = useState<PublishedBiography[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPublishedBiographies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('biographies')
        .select('id, title, published_at, author_name')
        .eq('user_id', userId)
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (!error && data) {
        setPublishedBiographies(data);
      }
    } catch (err) {
      console.error('Error loading published biographies:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPublishedBiographies();
  }, [loadPublishedBiographies]);

  if (isLoading) {
    return null;
  }

  if (publishedBiographies.length === 0) {
    return null;
  }

  const cardTitle = {
    en: 'Published Biographies',
    it: 'Biografie Pubblicate',
    fr: 'Biographies Publiées',
    de: 'Veröffentlichte Biografien',
  }[language] || 'Published Biographies';

  const viewButtonText = {
    en: 'View',
    it: 'Visualizza',
    fr: 'Voir',
    de: 'Ansehen',
  }[language] || 'View';

  const getLocale = () => {
    switch (language) {
      case 'it': return it;
      case 'fr': return fr;
      case 'de': return de;
      default: return undefined;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          {cardTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {publishedBiographies.map((bio) => (
          <div
            key={bio.id}
            className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{bio.title}</h4>
              <p className="text-xs text-muted-foreground">
                {language === 'it' ? 'Pubblicato il ' :
                 language === 'fr' ? 'Publié le ' :
                 language === 'de' ? 'Veröffentlicht am ' :
                 'Published on '}
                {format(new Date(bio.published_at), 'PPP', { locale: getLocale() })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/biography/${bio.id}/view`)}
              className="shrink-0 ml-2"
            >
              {viewButtonText}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
