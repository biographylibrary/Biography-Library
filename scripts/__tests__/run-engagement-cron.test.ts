import { mkdtempSync, writeFileSync, chmodSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = join(process.cwd(), 'scripts', 'run-engagement-cron.sh');

describe('run-engagement-cron.sh', () => {
  it('scrive l’intestazione anche senza SUPABASE_PROJECT_REF (niente rete)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'engagement-cron-'));
    try {
      writeFileSync(join(dir, '.env'), 'CRON_SECRET=test-secret\n', 'utf8');
      // No SUPABASE_PROJECT_REF, no NEXT_PUBLIC_SUPABASE_URL.

      const bin = join(dir, 'bin');
      mkdirSync(bin);
      const fakeCurl = join(bin, 'curl');
      writeFileSync(
        fakeCurl,
        `#!/usr/bin/env bash
# Simulate curl -sS -w "\\n%{http_code}"
echo '{"ok":true}'
echo '200'
`,
        'utf8'
      );
      chmodSync(fakeCurl, 0o755);

      const out = execFileSync('bash', [SCRIPT], {
        env: {
          ...process.env,
          ENV_FILE: join(dir, '.env'),
          FUNCTION_URL: 'http://127.0.0.1:9/functions/v1/send-engagement-emails',
          PATH: `${bin}:${process.env.PATH ?? ''}`,
        },
        encoding: 'utf8',
      });

      expect(out).toMatch(/POST http:\/\/127\.0\.0\.1:9\/functions\/v1\/send-engagement-emails/);
      expect(out).toMatch(/HTTP 200/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('con CRON_SECRET assente scrive un errore leggibile e non resta muto', () => {
    const dir = mkdtempSync(join(tmpdir(), 'engagement-cron-nosecret-'));
    try {
      writeFileSync(join(dir, '.env'), 'NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co\n', 'utf8');

      let err: Error & { status?: number; stdout?: string; stderr?: string };
      try {
        execFileSync('bash', [SCRIPT], {
          env: {
            ...process.env,
            ENV_FILE: join(dir, '.env'),
            FUNCTION_URL: 'http://127.0.0.1:9/never',
          },
          encoding: 'utf8',
        });
        throw new Error('expected non-zero exit');
      } catch (e) {
        err = e as Error & { status?: number; stdout?: string; stderr?: string };
      }

      expect(err.status).toBe(1);
      const combined = `${err.stdout ?? ''}${err.stderr ?? ''}`;
      expect(combined).toMatch(/ERROR: CRON_SECRET not set/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
