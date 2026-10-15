import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Impostazioni e editor devono solo leggere `ai_features_enabled`.
 * La scrittura passa da POST /api/profile/ai-features (service_role).
 */
describe('ai_features_enabled: nessun UPDATE dal browser', () => {
  it('Impostazioni legge la colonna e non la scrive con supabase.from().update', () => {
    const src = readFileSync('app/settings/page.tsx', 'utf8');
    expect(src).toContain("select('ai_features_enabled')");
    expect(src).toContain('requestAiFeaturesToggle');
    expect(src).not.toMatch(/\.update\([\s\S]*ai_features_enabled/);
  });

  it('l’editor legge la colonna e non la scrive', () => {
    const src = readFileSync('app/biography/[id]/edit/page.tsx', 'utf8');
    expect(src).toContain("select('ai_features_enabled')");
    expect(src).not.toMatch(/\.update\([\s\S]*ai_features_enabled/);
  });
});
