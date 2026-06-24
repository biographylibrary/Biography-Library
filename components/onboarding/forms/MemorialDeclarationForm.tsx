'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Clock, TriangleAlert as AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';

export type MemorialDeclarationValues = {
  deceased: boolean;
  truthful: boolean;
  respectRights: boolean;
  proofOfDeath: boolean;
  termsAccept: boolean;
};

interface MemorialDeclarationFormProps {
  values: MemorialDeclarationValues;
  onChange: (values: MemorialDeclarationValues) => void;
}

export function isMemorialDeclarationComplete(v: MemorialDeclarationValues): boolean {
  return v.deceased && v.truthful && v.respectRights && v.proofOfDeath && v.termsAccept;
}

export function MemorialDeclarationForm({ values, onChange }: MemorialDeclarationFormProps) {
  const { t } = useTranslation();

  const toggle = (key: keyof MemorialDeclarationValues) => {
    onChange({ ...values, [key]: !values[key] });
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
    <div className="space-y-6">
      <Alert className="border-brand-mustardDark/45 dark:border-brand-mustardDark/40 bg-brand-mustardLight/50 dark:bg-brand-mustardDark/15">
        <Clock className="h-5 w-5 text-brand-ink dark:text-brand-mustardLight" />
        <AlertTitle className="text-brand-ink dark:text-brand-beigeLight font-semibold">
          {t.deceasedDeclaration.reviewPeriodTitle}
        </AlertTitle>
        <AlertDescription className="text-sm text-brand-ink dark:text-brand-beigeLight space-y-2 mt-2">
          <p>{t.deceasedDeclaration.reviewPeriodText}</p>
        </AlertDescription>
      </Alert>

      <div className="space-y-3 border-l-4 border-brand-wine pl-4 bg-brand-wine/8 dark:bg-brand-wine/15 py-3">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="ob-deceased"
            checked={values.deceased}
            onCheckedChange={() => toggle('deceased')}
            className="mt-1"
          />
          <div className="flex-1 space-y-1">
            <Label htmlFor="ob-deceased" className="text-base font-semibold leading-relaxed cursor-pointer">
              {t.deceasedDeclaration.checkbox1}
            </Label>
            <p className="text-sm text-brand-wineDark dark:text-brand-mustardLight font-medium">
              {t.deceasedDeclaration.checkbox1Helper}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <Checkbox
          id="ob-truthful"
          checked={values.truthful}
          onCheckedChange={() => toggle('truthful')}
          className="mt-1"
        />
        <div className="flex-1 space-y-1">
          <Label htmlFor="ob-truthful" className="text-base font-normal leading-relaxed cursor-pointer">
            {t.deceasedDeclaration.checkbox2}
          </Label>
          <p className="text-sm text-muted-foreground">{t.deceasedDeclaration.checkbox2Helper}</p>
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <Checkbox
          id="ob-respect"
          checked={values.respectRights}
          onCheckedChange={() => toggle('respectRights')}
          className="mt-1"
        />
        <div className="flex-1 space-y-1">
          <Label htmlFor="ob-respect" className="text-base font-normal leading-relaxed cursor-pointer">
            {t.deceasedDeclaration.checkbox3}
          </Label>
          <p className="text-sm text-muted-foreground">{t.deceasedDeclaration.checkbox3Helper}</p>
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <Checkbox
          id="ob-proof"
          checked={values.proofOfDeath}
          onCheckedChange={() => toggle('proofOfDeath')}
          className="mt-1"
        />
        <div className="flex-1 space-y-1">
          <Label htmlFor="ob-proof" className="text-base font-normal leading-relaxed cursor-pointer">
            {t.deceasedDeclaration.checkbox4}
          </Label>
          <p className="text-sm text-muted-foreground">{t.deceasedDeclaration.checkbox4Helper}</p>
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <Checkbox
          id="ob-mem-terms"
          checked={values.termsAccept}
          onCheckedChange={() => toggle('termsAccept')}
          className="mt-1"
        />
        <div className="flex-1 space-y-1">
          <Label htmlFor="ob-mem-terms" className="text-base font-normal leading-relaxed cursor-pointer">
            {renderCheckbox5Label()}
          </Label>
          <p className="text-sm font-medium text-brand-wineDark dark:text-brand-mustardLight">
            {t.auth.mustAcceptTerms}
          </p>
        </div>
      </div>

      <Alert className="border-brand-wine/40 bg-brand-wine/10">
        <AlertTriangle className="h-5 w-5 text-brand-wine" />
        <AlertDescription className="text-sm space-y-2">
          <p className="font-semibold">{t.deceasedDeclaration.legalWarningTitle}</p>
          <p>{t.deceasedDeclaration.legalWarningText}</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>{t.deceasedDeclaration.legalWarningBullet1}</li>
            <li>{t.deceasedDeclaration.legalWarningBullet2}</li>
            <li>{t.deceasedDeclaration.legalWarningBullet3}</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
