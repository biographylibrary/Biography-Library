'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, CircleCheck as CheckCircle2, Circle as XCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';

export type AutobiographyDeclarationValues = {
  identity: boolean;
  ageConfirm: boolean;
  termsAccept: boolean;
  responsibility: boolean;
};

interface AutobiographyDeclarationFormProps {
  values: AutobiographyDeclarationValues;
  onChange: (values: AutobiographyDeclarationValues) => void;
}

export function isAutobiographyDeclarationComplete(v: AutobiographyDeclarationValues): boolean {
  return v.identity && v.ageConfirm && v.termsAccept && v.responsibility;
}

export function AutobiographyDeclarationForm({ values, onChange }: AutobiographyDeclarationFormProps) {
  const { t } = useTranslation();

  const toggle = (key: keyof AutobiographyDeclarationValues) => {
    onChange({ ...values, [key]: !values[key] });
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
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="ob-identity"
            checked={values.identity}
            onCheckedChange={() => toggle('identity')}
            className="mt-1"
          />
          <div className="flex-1 space-y-1">
            <Label htmlFor="ob-identity" className="text-base font-normal leading-relaxed cursor-pointer">
              {t.declaration.checkbox1}
            </Label>
            <p className="text-sm text-muted-foreground">{t.declaration.checkbox1Helper}</p>
          </div>
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <Checkbox
          id="ob-age"
          checked={values.ageConfirm}
          onCheckedChange={() => toggle('ageConfirm')}
          className="mt-1"
        />
        <Label htmlFor="ob-age" className="text-base font-normal leading-relaxed cursor-pointer">
          {t.declaration.checkbox2}
        </Label>
      </div>

      <div className="flex items-start space-x-3">
        <Checkbox
          id="ob-terms"
          checked={values.termsAccept}
          onCheckedChange={() => toggle('termsAccept')}
          className="mt-1"
        />
        <div className="flex-1 space-y-1">
          <Label htmlFor="ob-terms" className="text-base font-normal leading-relaxed cursor-pointer">
            {renderCheckbox3Label()}
          </Label>
          <p className="text-sm font-medium text-brand-wineDark dark:text-brand-mustardLight">
            {t.auth.mustAcceptTerms}
          </p>
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <Checkbox
          id="ob-responsibility"
          checked={values.responsibility}
          onCheckedChange={() => toggle('responsibility')}
          className="mt-1"
        />
        <div className="flex-1 space-y-1">
          <Label htmlFor="ob-responsibility" className="text-base font-normal leading-relaxed cursor-pointer">
            {t.declaration.checkbox4}
          </Label>
          <p className="text-sm text-muted-foreground">{t.declaration.checkbox4Helper}</p>
        </div>
      </div>

      <Alert className="border-brand-blue/50 dark:border-brand-blue/35 bg-brand-blue/20 dark:bg-brand-blue/10">
        <Info className="h-5 w-5 text-brand-ink dark:text-brand-blue" />
        <AlertDescription className="text-sm space-y-4 text-brand-ink dark:text-brand-beigeLight">
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
    </div>
  );
}
