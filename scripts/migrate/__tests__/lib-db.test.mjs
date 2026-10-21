import { describe, expect, it } from 'vitest';
import {
  DEST_PROJECT_REF,
  SOURCE_PROJECT_REF,
  assertSafeDest,
  maskDbUrl,
  parseArgs,
} from '../lib-db.mjs';

describe('maskDbUrl', () => {
  it('hides password', () => {
    const masked = maskDbUrl(
      'postgresql://postgres.abc:s3cret@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
    );
    expect(masked).toContain('***');
    expect(masked).not.toContain('s3cret');
  });
});

describe('assertSafeDest', () => {
  const zurich = `postgresql://postgres.${DEST_PROJECT_REF}:x@aws-0-eu-central-2.pooler.supabase.com:5432/postgres`;
  const ireland = `postgresql://postgres.${SOURCE_PROJECT_REF}:x@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`;
  const zurichApi = `https://${DEST_PROJECT_REF}.supabase.co`;

  it('allows Zurich dest with Ireland source (pooler username carries ref)', () => {
    expect(() => assertSafeDest(zurich, ireland)).not.toThrow();
  });

  it('allows Zurich API URL as dest', () => {
    expect(() => assertSafeDest(zurichApi, `https://${SOURCE_PROJECT_REF}.supabase.co`)).not.toThrow();
  });

  it('rejects Ireland as dest', () => {
    expect(() => assertSafeDest(ireland, zurich)).toThrow(/Ireland|gckmusbozgbclokvbnwx/i);
  });

  it('rejects dest without Zurich ref', () => {
    expect(() =>
      assertSafeDest('postgresql://postgres:x@localhost:5432/postgres', ireland)
    ).toThrow(/frycyhvhuifznxzamenn/);
  });

  it('rejects identical URLs', () => {
    expect(() => assertSafeDest(zurich, zurich)).toThrow(/identical/);
  });
});

describe('parseArgs', () => {
  it('detects dry-run', () => {
    expect(parseArgs(['--dry-run']).dryRun).toBe(true);
    expect(parseArgs([]).dryRun).toBe(false);
  });
});
