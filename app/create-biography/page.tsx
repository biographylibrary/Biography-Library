'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { User, Flame, AlertTriangle, Loader2 } from 'lucide-react';

export default function CreateBiographyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleAutobiography = () => {
    router.push('/dashboard');
  };

  const handleDeceased = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-serif font-semibold tracking-tight">
              {t.biographyType.title}
            </h1>
            <p className="text-muted-foreground">
              {t.biographyType.subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-2 transition-all hover:border-primary hover:shadow-lg cursor-pointer">
              <CardContent className="p-8 space-y-6" onClick={handleAutobiography}>
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                    {t.biographyType.mostPopular}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">
                    {t.biographyType.autobiography}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t.biographyType.autobiographyDescription}
                  </p>
                </div>

                <Button className="w-full h-11" size="lg">
                  {t.biographyType.autobiographyButton}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 transition-all hover:border-primary hover:shadow-lg cursor-pointer">
              <CardContent className="p-8 space-y-6" onClick={handleDeceased}>
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Flame className="h-8 w-8 text-primary" />
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    {t.biographyType.reviewPeriod}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">
                    {t.biographyType.deceased}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t.biographyType.deceasedDescription}
                  </p>
                </div>

                <Button className="w-full h-11" size="lg" variant="outline">
                  {t.biographyType.deceasedButton}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            <AlertDescription className="text-sm space-y-2 text-amber-900 dark:text-amber-100">
              <p className="font-semibold">{t.biographyType.warningTitle}</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{t.biographyType.warningLine1}</li>
                <li>{t.biographyType.warningLine2}</li>
                <li>{t.biographyType.warningLine3}</li>
              </ul>
              <p className="font-medium pt-1">{t.biographyType.warningLine4}</p>
            </AlertDescription>
          </Alert>
        </div>
      </main>

      <Footer />
    </div>
  );
}
