import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PAGE = join(__dirname, '../../app/biographies/page.tsx');

describe('public biographies featured chip', () => {
  it('usa t.publicBiographies.featured e non il testo fisso Featured', () => {
    const src = readFileSync(PAGE, 'utf8');
    expect(src).toContain('t.publicBiographies.featured');
    expect(src).not.toMatch(/>\s*Featured\s*</);
  });
});
