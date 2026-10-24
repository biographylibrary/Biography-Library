/**
 * Regole della password per registrazione e reimpostazione.
 *
 * IMPORTANTE: questi valori devono restare identici alle impostazioni di
 * Supabase Authentication sul progetto di produzione a Zurigo
 * (Authentication -> Providers -> Email / Password Security, documentate in
 * DEPLOYMENT.md):
 * - lunghezza minima: 10 caratteri
 * - almeno una lettera minuscola ASCII (a-z)
 * - almeno una lettera maiuscola ASCII (A-Z)
 * - almeno una cifra (0-9)
 * - almeno un simbolo dall'elenco esatto di GoTrue
 * - rifiuto delle password compromesse (HaveIBeenPwned) lato Supabase
 */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_LOWERCASE_CHARS = 'abcdefghijklmnopqrstuvwxyz';
export const PASSWORD_UPPERCASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const PASSWORD_DIGIT_CHARS = '0123456789';
export const PASSWORD_SYMBOL_CHARS = '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~';

const LOWERCASE_SET = new Set(PASSWORD_LOWERCASE_CHARS);
const UPPERCASE_SET = new Set(PASSWORD_UPPERCASE_CHARS);
const DIGIT_SET = new Set(PASSWORD_DIGIT_CHARS);
const SYMBOL_SET = new Set(PASSWORD_SYMBOL_CHARS);

export const PASSWORD_RULE_KEYS = [
  'minLength',
  'lowercase',
  'uppercase',
  'digit',
  'symbol',
] as const;

export type PasswordRuleKey = (typeof PASSWORD_RULE_KEYS)[number];

export interface PasswordEvaluation {
  rules: Record<PasswordRuleKey, boolean>;
  missing: PasswordRuleKey[];
  valid: boolean;
}

function hasCharFromSet(value: string, set: ReadonlySet<string>): boolean {
  for (let i = 0; i < value.length; i++) {
    if (set.has(value[i]!)) return true;
  }
  return false;
}

export function evaluatePassword(password: string): PasswordEvaluation {
  const input = typeof password === 'string' ? password : '';
  const rules: Record<PasswordRuleKey, boolean> = {
    minLength: input.length >= PASSWORD_MIN_LENGTH,
    lowercase: hasCharFromSet(input, LOWERCASE_SET),
    uppercase: hasCharFromSet(input, UPPERCASE_SET),
    digit: hasCharFromSet(input, DIGIT_SET),
    symbol: hasCharFromSet(input, SYMBOL_SET),
  };
  const missing = PASSWORD_RULE_KEYS.filter((key) => !rules[key]);
  return {
    rules,
    missing,
    valid: missing.length === 0,
  };
}

export interface PasswordPolicyCopy {
  passwordMinLength: string;
  passwordMissingPrefix: string;
  passwordMissingConjunction: string;
  passwordMissingMinLength: string;
  passwordMissingLowercase: string;
  passwordMissingUppercase: string;
  passwordMissingDigit: string;
  passwordMissingSymbol: string;
  passwordValid: string;
  passwordPwned: string;
  passwordWeakCharacters: string;
  passwordWeakGeneric: string;
}

function missingItemLabel(key: PasswordRuleKey, copy: PasswordPolicyCopy): string {
  switch (key) {
    case 'minLength':
      return copy.passwordMissingMinLength;
    case 'lowercase':
      return copy.passwordMissingLowercase;
    case 'uppercase':
      return copy.passwordMissingUppercase;
    case 'digit':
      return copy.passwordMissingDigit;
    case 'symbol':
      return copy.passwordMissingSymbol;
  }
}

export function formatMissingPasswordRequirements(
  missing: readonly PasswordRuleKey[],
  copy: PasswordPolicyCopy
): string {
  if (missing.length === 0) return copy.passwordValid;
  const labels = missing.map((key) => missingItemLabel(key, copy));
  if (labels.length === 1) {
    return `${copy.passwordMissingPrefix}${labels[0]}`;
  }
  const head = labels.slice(0, -1).join(', ');
  const tail = labels[labels.length - 1]!;
  return `${copy.passwordMissingPrefix}${head}${copy.passwordMissingConjunction}${tail}`;
}

export type WeakPasswordReason = 'length' | 'characters' | 'pwned';

export function extractWeakPasswordReasons(error: unknown): WeakPasswordReason[] | null {
  if (!error) return null;

  if (typeof error === 'object') {
    const obj = error as {
      code?: unknown;
      name?: unknown;
      message?: unknown;
      error?: unknown;
      reasons?: unknown;
      weakPasswordReasons?: unknown;
    };

    const rawReasons = Array.isArray(obj.reasons)
      ? obj.reasons
      : Array.isArray(obj.weakPasswordReasons)
        ? obj.weakPasswordReasons
        : null;

    const parsedReasons: WeakPasswordReason[] = [];
    if (rawReasons) {
      for (const r of rawReasons) {
        if (r === 'length' || r === 'characters' || r === 'pwned') {
          if (!parsedReasons.includes(r)) parsedReasons.push(r);
        }
      }
    }

    const isWeakCode =
      obj.code === 'weak_password' ||
      obj.name === 'AuthWeakPasswordError' ||
      obj.error === 'weak_password';

    const msg =
      typeof obj.message === 'string'
        ? obj.message
        : typeof obj.error === 'string'
          ? obj.error
          : '';

    const inferred = inferReasonsFromMessage(msg);
    for (const r of inferred) {
      if (!parsedReasons.includes(r)) parsedReasons.push(r);
    }

    if (isWeakCode || parsedReasons.length > 0) {
      return parsedReasons;
    }
    return null;
  }

  if (typeof error === 'string') {
    if (error === 'weak_password') return [];
    const inferred = inferReasonsFromMessage(error);
    return inferred.length > 0 ? inferred : null;
  }

  return null;
}

function inferReasonsFromMessage(message: string): WeakPasswordReason[] {
  const lower = message.toLowerCase();
  const out: WeakPasswordReason[] = [];
  if (
    lower.includes('known to be weak') ||
    lower.includes('easy to guess') ||
    lower.includes('pwned') ||
    lower.includes('compromised') ||
    lower.includes('data breach')
  ) {
    out.push('pwned');
  }
  if (
    lower.includes('password should be at least') ||
    lower.includes('at least 10 characters') ||
    lower.includes('least 6 characters') ||
    lower.includes('least 8 characters')
  ) {
    out.push('length');
  }
  if (
    lower.includes('password should contain at least one character') ||
    lower.includes('abcdefghijklmnopqrstuvwxyz')
  ) {
    out.push('characters');
  }
  return out;
}

/**
 * Converte un errore di autenticazione Supabase (incluso `weak_password` con
 * `reasons: ['length' | 'characters' | 'pwned']`) in un messaggio nella lingua
 * dell'interfaccia, senza mai esporre il testo inglese grezzo di GoTrue.
 */
export function resolvePasswordAuthError(
  error: unknown,
  copy: PasswordPolicyCopy,
  password?: string
): string {
  const reasons = extractWeakPasswordReasons(error);
  if (reasons !== null) {
    const parts: string[] = [];

    if (reasons.includes('pwned')) {
      parts.push(copy.passwordPwned);
    }

    const hasLengthOrChars =
      reasons.includes('length') || reasons.includes('characters');
    if (hasLengthOrChars) {
      const evalResult =
        typeof password === 'string' ? evaluatePassword(password) : null;
      if (evalResult && !evalResult.valid) {
        parts.push(formatMissingPasswordRequirements(evalResult.missing, copy));
      } else if (reasons.includes('length') && !reasons.includes('characters')) {
        parts.push(copy.passwordMinLength);
      } else if (reasons.includes('characters') && !reasons.includes('length')) {
        parts.push(copy.passwordWeakCharacters);
      } else {
        parts.push(`${copy.passwordMinLength}. ${copy.passwordWeakCharacters}`);
      }
    }

    if (parts.length > 0) {
      return parts.join(' ');
    }
    return copy.passwordWeakGeneric;
  }

  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const obj = error as { message?: unknown; error?: unknown };
    if (typeof obj.message === 'string' && obj.message) return obj.message;
    if (typeof obj.error === 'string' && obj.error) return obj.error;
  }
  return copy.passwordWeakGeneric;
}
