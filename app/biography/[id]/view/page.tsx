'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { BIOGRAPHY_SECTIONS, type BiographyContent } from '@/lib/editor-constants';
import { generateBiographyPDF } from '@/lib/pdf-export';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { FileDown, Loader as Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface BiographyViewData {
  id: string;
  title: string;
  author_name: string;
  content: BiographyContent;
  privacy: string;
  share_token: string | null;
  created_at: string;
}

type ViewError = 'token-missing' | 'not-found' | 'private' | null;

export default function BiographyViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const id = params.id as string;
  const token = searchParams.get('token');

  const [biography, setBiography] = useState<BiographyViewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ViewError>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError('token-missing');
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('biographies')
        .select('*')
        .eq('id', id)
        .eq('share_token', token)
        .maybeSingle();

      if (fetchError || !data) {
        setError('not-found');
        setIsLoading(false);
        return;
      }

      if (data.privacy === 'private') {
        setError('private');
        setIsLoading(false);
        return;
      }

      setBiography(data as BiographyViewData);
      setIsLoading(false);
    };

    load();
  }, [id, token]);

  const getErrorMessage = (err: ViewError) => {
    switch (err) {
      case 'token-missing': return t.view.tokenMissing;
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

  const visibleSections = BIOGRAPHY_SECTIONS.filter(
    (section) => biography.content[section.key]?.text?.trim()
  );

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
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <article className="prose prose-gray dark:prose-invert max-w-none">
          <div className="mb-12 pb-8 border-b border-border">
            <h1 className="text-4xl font-serif font-bold mb-2">
              {biography.title}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t.view.by} {biography.author_name}
            </p>
          </div>

          {visibleSections.map((section) => {
            const sectionData = biography.content[section.key];
            if (!sectionData?.text?.trim()) return null;
            const sectionTitle = t.sectionTitles[section.key as keyof typeof t.sectionTitles] || section.title;

            return (
              <section key={section.key} className="mb-12">
                <h2 className="text-2xl font-serif font-semibold text-primary mb-6">
                  {sectionTitle}
                </h2>
                <div className="whitespace-pre-wrap leading-relaxed font-serif text-base">
                  {sectionData.text.split('\n\n').map((paragraph, idx) => (
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
    </div>
  );
}
