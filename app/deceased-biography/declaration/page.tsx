'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info, Loader2, Clock, Scale } from 'lucide-react';

export default function DeceasedDeclarationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const [checkboxes, setCheckboxes] = useState({
    deceased: false,
    truthful: false,
    respectRights: false,
    proofOfDeath: false,
    termsAccept: false,
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

  const renderCheckbox5Label = () => {
    const text = t.deceasedDeclaration.checkbox5;
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
          {t.deceasedDeclaration.checkbox5TermsLink}
        </a>
        {afterTerms[0]}
        <a
          href="/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {t.deceasedDeclaration.checkbox5PrivacyLink}
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
              {t.deceasedDeclaration.stepIndicator}
            </div>
            <h1 className="text-3xl font-serif font-semibold tracking-tight">
              {t.deceasedDeclaration.title}
            </h1>
            <p className="text-muted-foreground">
              {t.deceasedDeclaration.subtitle}
            </p>
          </div>

          <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            <AlertTitle className="text-amber-900 dark:text-amber-100 font-semibold">
              {t.deceasedDeclaration.reviewPeriodTitle}
            </AlertTitle>
            <AlertDescription className="text-sm text-amber-900 dark:text-amber-100 space-y-2 mt-2">
              <p>{t.deceasedDeclaration.reviewPeriodText}</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{t.deceasedDeclaration.reviewPeriodBullet1}</li>
                <li>{t.deceasedDeclaration.reviewPeriodBullet2}</li>
                <li>{t.deceasedDeclaration.reviewPeriodBullet3}</li>
                <li>{t.deceasedDeclaration.reviewPeriodBullet4}</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Card>
            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="space-y-6">
                <div className="space-y-3 border-l-4 border-red-500 pl-4 bg-red-50 dark:bg-red-950/20 py-3 -ml-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="deceased"
                      checked={checkboxes.deceased}
                      onCheckedChange={() => handleCheckboxChange('deceased')}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor="deceased"
                        className="text-base font-semibold leading-relaxed cursor-pointer"
                      >
                        {t.deceasedDeclaration.checkbox1}
                      </Label>
                      <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                        {t.deceasedDeclaration.checkbox1Helper}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="truthful"
                      checked={checkboxes.truthful}
                      onCheckedChange={() => handleCheckboxChange('truthful')}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor="truthful"
                        className="text-base font-normal leading-relaxed cursor-pointer"
                      >
                        {t.deceasedDeclaration.checkbox2}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t.deceasedDeclaration.checkbox2Helper}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="respectRights"
                      checked={checkboxes.respectRights}
                      onCheckedChange={() => handleCheckboxChange('respectRights')}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor="respectRights"
                        className="text-base font-normal leading-relaxed cursor-pointer"
                      >
                        {t.deceasedDeclaration.checkbox3}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t.deceasedDeclaration.checkbox3Helper}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="proofOfDeath"
                      checked={checkboxes.proofOfDeath}
                      onCheckedChange={() => handleCheckboxChange('proofOfDeath')}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor="proofOfDeath"
                        className="text-base font-normal leading-relaxed cursor-pointer"
                      >
                        {t.deceasedDeclaration.checkbox4}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t.deceasedDeclaration.checkbox4Helper}
                      </p>
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
                        {renderCheckbox5Label()}
                      </Label>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-500">
                        Required - You must accept the terms to continue
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-500" />
            <AlertTitle className="text-blue-900 dark:text-blue-100 font-semibold">
              {t.deceasedDeclaration.perspectivesTitle}
            </AlertTitle>
            <AlertDescription className="text-sm text-blue-900 dark:text-blue-100 space-y-2 mt-2">
              <p>{t.deceasedDeclaration.perspectivesText}</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{t.deceasedDeclaration.perspectivesBullet1}</li>
                <li>{t.deceasedDeclaration.perspectivesBullet2}</li>
                <li>{t.deceasedDeclaration.perspectivesBullet3}</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
            <Scale className="h-5 w-5 text-red-600 dark:text-red-500" />
            <AlertTitle className="text-red-900 dark:text-red-100 font-semibold">
              {t.deceasedDeclaration.legalWarningTitle}
            </AlertTitle>
            <AlertDescription className="text-sm text-red-900 dark:text-red-100 space-y-2 mt-2">
              <p>{t.deceasedDeclaration.legalWarningText}</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{t.deceasedDeclaration.legalWarningBullet1}</li>
                <li>{t.deceasedDeclaration.legalWarningBullet2}</li>
                <li>{t.deceasedDeclaration.legalWarningBullet3}</li>
              </ul>
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
              {t.deceasedDeclaration.acceptButton}
            </Button>
          </div>
        </div>
    </div>
  );
}
