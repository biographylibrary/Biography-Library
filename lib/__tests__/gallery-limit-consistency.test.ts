import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAX_BIOGRAPHY_GALLERY_PHOTOS } from '@/lib/biography-media-constants';

/**
 * Il numero massimo di foto di galleria sta in più punti: la costante da cui l'interfaccia ricava
 * il contatore «4/15» e il blocco del caricamento, il controllo nel database, le guide che Echo e
 * la pagina di aiuto leggono (quattro lingue) e il documento di progetto. Quando il limite è
 * stato portato da 30 a 15 la costante e il database dicevano ancora 30 e il contatore mostrava
 * «4/30». Qui un punto dimenticato fa fallire la verifica automatica.
 */
const ROOT = process.cwd();
const N = MAX_BIOGRAPHY_GALLERY_PHOTOS;
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe(`limite di foto di galleria (${N})`, () => {
  it('il controllo nel database, nell\'ultima migrazione che lo definisce, dice lo stesso numero', () => {
    const dir = join(ROOT, 'supabase', 'migrations');
    const latest = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .filter((f) => read(`supabase/migrations/${f}`).includes('check_biography_media_limit'))
      .pop();
    expect(latest).toBeDefined();
    const sql = read(`supabase/migrations/${latest}`);
    expect(sql).toMatch(new RegExp(`\\)\\s*>=\\s*${N}\\s+THEN`));
    expect(sql).toContain(`at most ${N} gallery photos`);
  });

  it('la guida in inglese (sorgente e file generati) dice lo stesso numero', () => {
    for (const file of [
      'docs/PLATFORM_KB.md',
      'lib/help/help-kb.en.generated.ts',
      'lib/agents/kb/help-kb-sections.en.generated.ts',
    ]) {
      expect(read(file), file).toContain(`max ${N} gallery photos`);
    }
  });

  it('le guide in italiano, francese e tedesco dicono lo stesso numero', () => {
    expect(read('docs/PLATFORM_KB.it.md')).toContain(`max ${N} in galleria`);
    expect(read('docs/PLATFORM_KB.fr.md')).toContain(`max ${N} en galerie`);
    expect(read('docs/PLATFORM_KB.de.md')).toContain(`max. ${N} Galerie-Fotos`);
  });

  it('il documento di progetto dice lo stesso numero', () => {
    expect(read('PROGETTO.md')).toContain(`Galleria foto fino a ${N} immagini per biografia`);
  });

  it('nessuna guida attuale nomina ancora un numero diverso', () => {
    for (const file of [
      'docs/PLATFORM_KB.md',
      'docs/PLATFORM_KB.it.md',
      'docs/PLATFORM_KB.fr.md',
      'docs/PLATFORM_KB.de.md',
    ]) {
      const text = read(file);
      const found = Array.from(
        text.matchAll(/max\.? (\d+) (?:gallery photos|in galleria|en galerie|Galerie-Fotos)/g),
        (m) => Number(m[1])
      );
      expect(found.length, file).toBeGreaterThan(0);
      expect(found.every((n) => n === N), `${file}: ${found.join(', ')}`).toBe(true);
    }
  });
});
