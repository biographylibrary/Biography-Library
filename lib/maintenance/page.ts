import {
  MAINTENANCE_MESSAGES,
  resolveMaintenanceLocale,
  type MaintenanceLocale,
} from '@/lib/maintenance/messages';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildMaintenanceHtml(locale: MaintenanceLocale): string {
  const { title, body } = MAINTENANCE_MESSAGES[locale];
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex, nofollow"/>
<title>${escapeHtml(title)} — Biography Library</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: Georgia, "Times New Roman", serif; background: #ECE9E4; color: #121212;
  }
  main { max-width: 28rem; padding: 2rem; text-align: center; }
  h1 { font-size: 1.75rem; font-weight: 400; margin: 0 0 0.75rem; }
  p { font-size: 1rem; line-height: 1.5; margin: 0; opacity: 0.85; }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(body)}</p>
</main>
</body>
</html>`;
}

export function maintenanceLocaleFromRequest(headers: Headers, cookieHeader: string | null): MaintenanceLocale {
  const pref =
    cookieHeader
      ?.split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('bl_lang=') || c.startsWith('userLanguage='))
      ?.split('=')[1] ?? null;
  return resolveMaintenanceLocale(headers.get('accept-language'), pref);
}
