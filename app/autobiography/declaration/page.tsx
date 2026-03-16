'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function AutobiographyDeclarationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const [checkboxes, setCheckboxes] = useState({
    identity: false,
    ageConfirm: false,
    termsAccept: false,
    responsibility: false,
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const allChecked = Object.values(checkboxes).every(Boolean);

  const handleCheckboxChange = (key: keyof typeof checkboxes) => {
    setCheckboxes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBack = () => {
    router.push('/create-biography');
  };

  const handleContinue = () => {
    if (allChecked) {
      router.push('/dashboard');
    }
  };

  const renderCheckbox3Label = () => {
    const text = t.declaration.checkbox3;
    const parts = text.split('{terms}');
    const afterTerms = parts[1]?.split('{privacy}') || ['', ''];

    return (
      <span>
        {parts[0]}
        <a
          href="/terms-of-service"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {t.declaration.checkbox3TermsLink}
        </a>
        {afterTerms[0]}
        <a
          href="/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {t.declaration.checkbox3PrivacyLink}
        </a>
        {afterTerms[1]}
      </span>
    );
  };

  return (
    <div className="px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground font-medium">
              {t.declaration.stepIndicator}
            </div>
            <h1 className="text-3xl font-serif font-semibold tracking-tight">
              {t.declaration.title}
            </h1>
            <p className="text-muted-foreground">
              {t.declaration.subtitle}
            </p>
          </div>

          <Card>
            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="identity"
                      checked={checkboxes.identity}
                      onCheckedChange={() => handleCheckboxChange('identity')}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor="identity"
                        className="text-base font-normal leading-relaxed cursor-pointer"
                      >
                        {t.declaration.checkbox1}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t.declaration.checkbox1Helper}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="age"
                      checked={checkboxes.ageConfirm}
                      onCheckedChange={() => handleCheckboxChange('ageConfirm')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="age"
                        className="text-base font-normal leading-relaxed cursor-pointer"
                      >
                        {t.declaration.checkbox2}
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms"
                      checked={checkboxes.termsAccept}
                      onCheckedChange={() => handleCheckboxChange('termsAccept')}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor="terms"
                        className="text-base font-normal leading-relaxed cursor-pointer"
                      >
                        {renderCheckbox3Label()}
                      </Label>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-500">
                        Required - You must accept the terms to continue
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="responsibility"
                      checked={checkboxes.responsibility}
                      onCheckedChange={() => handleCheckboxChange('responsibility')}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor="responsibility"
                        className="text-base font-normal leading-relaxed cursor-pointer"
                      >
                        {t.declaration.checkbox4}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t.declaration.checkbox4Helper}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-500" />
            <AlertDescription className="text-sm space-y-4 text-blue-900 dark:text-blue-100">
              <div className="space-y-2">
                <p className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {t.declaration.canWriteTitle}
                </p>
                <ul className="list-disc list-inside space-y-1 ml-6">
                  <li>{t.declaration.canWriteLine1}</li>
                  <li>{t.declaration.canWriteLine2}</li>
                  <li>{t.declaration.canWriteLine3}</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="font-semibold flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  {t.declaration.cannotWriteTitle}
                </p>
                <ul className="list-disc list-inside space-y-1 ml-6">
                  <li>{t.declaration.cannotWriteLine1}</li>
                  <li>{t.declaration.cannotWriteLine2}</li>
                  <li>{t.declaration.cannotWriteLine3}</li>
                  <li>{t.declaration.cannotWriteLine4}</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" onClick={handleBack} size="lg">
              {t.common.back}
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!allChecked}
              size="lg"
              className="min-w-[200px]"
            >
              {t.declaration.acceptButton}
            </Button>
          </div>
        </div>
    </div>
  );
}
