'use client';

import { Check, Circle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import {
  PASSWORD_RULE_KEYS,
  evaluatePassword,
  formatMissingPasswordRequirements,
  type PasswordRuleKey,
} from '@/lib/password-policy';
import { cn } from '@/lib/utils';

export interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

export function PasswordRequirements({
  password,
  className,
}: PasswordRequirementsProps) {
  const { t } = useTranslation();
  const { rules, missing, valid } = evaluatePassword(password);

  const ruleLabels: Record<PasswordRuleKey, string> = {
    minLength: t.auth.passwordReqMinLength,
    lowercase: t.auth.passwordReqLowercase,
    uppercase: t.auth.passwordReqUppercase,
    digit: t.auth.passwordReqDigit,
    symbol: t.auth.passwordReqSymbol,
  };

  const statusText = valid
    ? t.auth.passwordValid
    : formatMissingPasswordRequirements(missing, t.auth);

  return (
    <div
      data-testid="password-requirements"
      className={cn(
        'rounded-lg border border-border bg-muted/20 px-3 py-2.5 space-y-2 text-xs',
        className
      )}
    >
      <p className="text-foreground">{t.auth.passwordRequirementsTitle}</p>

      <ul className="space-y-1">
        {PASSWORD_RULE_KEYS.map((key) => {
          const met = rules[key];
          return (
            <li
              key={key}
              data-testid={`password-req-${key}`}
              data-met={met ? 'true' : 'false'}
              className={cn(
                'flex items-center gap-2 transition-colors',
                met
                  ? 'text-brand-greenDark dark:text-brand-greenLight'
                  : 'text-muted-foreground'
              )}
            >
              {met ? (
                <Check
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                  data-testid={`password-req-icon-met-${key}`}
                />
              ) : (
                <Circle
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                  data-testid={`password-req-icon-unmet-${key}`}
                />
              )}
              <span>{ruleLabels[key]}</span>
            </li>
          );
        })}
      </ul>

      <p
        aria-live="polite"
        data-testid="password-requirements-status"
        className={cn(
          'pt-1 border-t border-border leading-relaxed',
          valid
            ? 'text-brand-greenDark dark:text-brand-greenLight'
            : 'text-muted-foreground'
        )}
      >
        {statusText}
      </p>
    </div>
  );
}
