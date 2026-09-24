'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { SiteLegalDocument } from '@/components/legal/SiteLegalDocument';

export default function CookiePolicyPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="px-4 py-8 md:py-12 bg-background">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t.common.back}
          </Button>
        </div>
        <SiteLegalDocument doc="cookies" />
      </div>
    </div>
  );
}
