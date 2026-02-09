'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="px-4 py-8 md:py-12">
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

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 prose prose-sm dark:prose-invert max-w-none">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-serif font-semibold tracking-tight mb-2">
                Privacy Policy - Biography Library
              </h1>
              <p className="text-sm text-muted-foreground">Coming Soon</p>
            </div>

            <p className="lead text-base">
              Our detailed Privacy Policy is currently being prepared. It will cover:
            </p>

            <ul>
              <li>What data we collect and why</li>
              <li>How we protect your information</li>
              <li>Your rights under Swiss data protection law (nLPD)</li>
              <li>Data retention and deletion policies</li>
              <li>Third-party services we use</li>
            </ul>

            <p>
              For questions about privacy, please contact:{' '}
              <span className="font-mono text-sm">privacy@biographylibrary.org</span>
            </p>
          </div>
        </div>
    </div>
  );
}
