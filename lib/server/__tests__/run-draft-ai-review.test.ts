/**
 * `runDraftAiReview` è stato rimosso: il controllo finale è `runPreprintCheck`.
 * I comportamenti restano coperti da `preprint-check.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('runDraftAiReview rimosso', () => {
  it('il pipeline non esporta più runDraftAiReview', async () => {
    const src = readFileSync(
      join(process.cwd(), 'lib/server/review-submit-pipeline.ts'),
      'utf8'
    );
    expect(src).not.toMatch(/export async function runDraftAiReview/);
  });
});
