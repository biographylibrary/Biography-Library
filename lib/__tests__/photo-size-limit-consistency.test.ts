import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { PHOTO_UPLOAD_MAX_BYTES } from '@/lib/client/biography-photo-upload';
import { MAX_UPLOAD_BYTES } from '@/lib/server/photo-processing';

// Il modulo del client importa il client Supabase, che in test non ha le variabili d'ambiente.
vi.mock('@/lib/auth-token', () => ({ fetchWithAgentAuth: vi.fn() }));

/**
 * Il peso massimo di una foto, 20 MB, sta in più punti: la rotta che le riceve, il pannello foto che
 * lo annuncia e lo controlla prima di inviare (non può importare il modulo del server, che porta
 * dentro sharp), il limite del bucket nella migrazione che chiude le scritture del browser, e le
 * frasi che l'utente legge (messaggio d'errore e guide). Prima la guida diceva «5 MB» e il bucket non
 * aveva nessun limite. Qui un punto dimenticato fa fallire la verifica automatica.
 */
const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const MB20 = 20 * 1024 * 1024;

describe('peso massimo di una foto (20 MB)', () => {
  it('la rotta e il pannello foto hanno lo stesso limite, e vale 20 MB', () => {
    expect(MAX_UPLOAD_BYTES).toBe(MB20);
    expect(PHOTO_UPLOAD_MAX_BYTES).toBe(MAX_UPLOAD_BYTES);
  });

  it('il limite del bucket, nella migrazione che lo fissa, è lo stesso numero di byte', () => {
    const sql = read('supabase/migrations/20261006120000_storage_biography_photos_server_only_writes.sql');
    const match = sql.match(/SET\s+file_size_limit\s*=\s*(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(MAX_UPLOAD_BYTES);
  });

  it('il messaggio «file troppo grande» del pannello foto dice 20 nelle quattro lingue', () => {
    const src = read('lib/i18n/translations.ts');
    for (const sentence of [
      'File is too large. Maximum size is 20 MB.',
      'Il file è troppo grande. La dimensione massima è 20 MB.',
      'Fichier trop volumineux. La taille maximale est de 20 Mo.',
      'Datei zu groß. Maximale Größe ist 20 MB.',
    ]) {
      expect(src, sentence).toContain(sentence);
    }
  });

  it('la guida (sorgente inglese, file generati, tre lingue) dice 20 e non il vecchio 5 per le foto', () => {
    for (const file of ['docs/PLATFORM_KB.md', 'lib/help/help-kb.en.generated.ts', 'lib/agents/kb/help-kb-sections.en.generated.ts']) {
      expect(read(file), file).toContain('JPG/PNG/WEBP up to 20 MB');
      expect(read(file), file).not.toContain('JPG/PNG/WEBP up to 5 MB');
    }
    const locales = read('lib/agents/kb/help-kb-sections.locales.ts');
    for (const phrase of ['JPG/PNG/WEBP fino a 20 MB', "JPG/PNG/WEBP jusqu'à 20 Mo", 'JPG/PNG/WEBP bis 20 MB']) {
      expect(locales, phrase).toContain(phrase);
    }
    expect(locales).not.toMatch(/JPG\/PNG\/WEBP (fino 5|jusqu'à 5|bis 5) /);
  });
});
