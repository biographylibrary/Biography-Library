'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { TermsOfServiceContent } from '@/components/legal/terms-of-service-content';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';

export default function TermsOfServicePage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.common.back}
            </Button>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TermsOfServiceContent />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
