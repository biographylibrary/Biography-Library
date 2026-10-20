export type MaintenanceLocale = 'en' | 'it' | 'fr' | 'de';

export const MAINTENANCE_MESSAGES: Record<
  MaintenanceLocale,
  { title: string; body: string }
> = {
  en: {
    title: 'We will be back soon',
    body: 'The site is under maintenance. Please try again later.',
  },
  it: {
    title: 'Torniamo presto',
    body: 'Il sito è in manutenzione. Riprova più tardi.',
  },
  fr: {
    title: 'Nous revenons bientôt',
    body: 'Le site est en maintenance. Réessayez plus tard.',
  },
  de: {
    title: 'Wir sind bald zurück',
    body: 'Die Website wird gewartet. Bitte versuchen Sie es später erneut.',
  },
};

export function resolveMaintenanceLocale(
  acceptLanguage: string | null,
  prefCookie: string | null
): MaintenanceLocale {
  const fromCookie = (prefCookie ?? '').trim().slice(0, 2).toLowerCase();
  if (fromCookie === 'en' || fromCookie === 'it' || fromCookie === 'fr' || fromCookie === 'de') {
    return fromCookie;
  }
  const tags = (acceptLanguage ?? '')
    .split(',')
    .map((part) => part.trim().split(';')[0]?.toLowerCase() ?? '');
  for (const tag of tags) {
    const base = tag.slice(0, 2);
    if (base === 'en' || base === 'it' || base === 'fr' || base === 'de') {
      return base;
    }
  }
  return 'en';
}
