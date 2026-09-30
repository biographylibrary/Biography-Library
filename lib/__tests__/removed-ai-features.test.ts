import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const exists = (rel: string) => existsSync(join(root, rel));

describe('strumenti di intelligenza artificiale tolti', () => {
  it('la rotta di traduzione automatica per i lettori non esiste più', () => {
    expect(exists('app/api/biography/[id]/translate-view')).toBe(false);
    expect(exists('app/api/biography/[id]/available-languages')).toBe(false);
    expect(exists('lib/biography-view-translate.ts')).toBe(false);
    expect(exists('lib/biography-translation-locales.ts')).toBe(false);
  });

  it('la tabella delle traduzioni viene eliminata da una migrazione nuova', () => {
    const drop = readdirSync(join(root, 'supabase/migrations')).find((f) => f.endsWith('_drop_biography_view_translations.sql'));
    expect(drop).toBeTruthy();
    expect(readFileSync(join(root, 'supabase/migrations', drop!), 'utf8')).toMatch(
      /DROP TABLE IF EXISTS public\.biography_view_translations/
    );
  });

  it('nessun codice dell\'applicazione legge o scrive biography_view_translations', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
        if (['node_modules', '.next', '__tests__'].includes(entry.name)) continue;
        const rel = join(dir, entry.name);
        if (entry.isDirectory()) walk(rel);
        else if (/\.(ts|tsx)$/.test(entry.name)) {
          if (readFileSync(join(root, rel), 'utf8').includes('biography_view_translations')) offenders.push(rel);
        }
      }
    };
    for (const dir of ['app', 'lib', 'components', 'hooks', 'shared']) walk(dir);
    expect(offenders).toEqual([]);
  });

  it('l\'Edge Function ai-assistant è stata eliminata del tutto', () => {
    expect(exists('supabase/functions/ai-assistant')).toBe(false);
  });

  it('le altre funzioni Deno restano (trascrizione compresa)', () => {
    expect(exists('supabase/functions/audio-transcription/index.ts')).toBe(true);
  });

  it.each([
    'app/api/agents/apertus-review',
    'lib/agents/apertus-review.ts',
    'components/editor/AISectionReview.tsx',
    'components/editor/ApertusReviewDialog.tsx',
    'components/import/SectionAssignmentWizard.tsx',
    'lib/agents/prompts/coach.ts',
    'lib/agents/prompts/platform-guide.ts',
    'lib/agents/agent-edge-fallback.ts',
    'lib/ai/ai-client.ts',
    'lib/ai/ai-provider.ts',
    'lib/ai/smart-followup.ts',
    'lib/ai/narrative-structure-service.ts',
  ])('%s non esiste più', (rel) => {
    expect(exists(rel)).toBe(false);
  });

  it('a chiamare un modello restano quattro casi più le funzioni di servizio di Echo', () => {
    // Ogni chiamata passa da infomaniak-client: nessun altro file parla con /chat/completions.
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
        if (['node_modules', '.next', '__tests__'].includes(entry.name)) continue;
        const rel = join(dir, entry.name);
        if (entry.isDirectory()) walk(rel);
        else if (/\.(ts|tsx)$/.test(entry.name) && !rel.endsWith('lib/agents/infomaniak-client.ts')) {
          if (/chat\/completions['"`]\s*[,)]|\/embeddings['"`]/.test(readFileSync(join(root, rel), 'utf8'))) {
            offenders.push(rel);
          }
        }
      }
    };
    for (const dir of ['app', 'lib', 'components']) walk(dir);
    expect(offenders).toEqual([]);
  });
});
