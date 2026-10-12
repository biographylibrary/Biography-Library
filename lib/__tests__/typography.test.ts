/** @vitest-environment jsdom */
/**
 * Peso 400 globale; grassetto solo in .ProseMirror / .rich-text / .echo-reply;
 * niente classi prose* (plugin non installato).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createElement } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BiographySectionBody } from '@/components/biography/BiographySectionBody';
import { EchoMessageContent } from '@/components/echo/EchoMessageContent';

const ROOT = join(__dirname, '../..');
const CSS_PATH = join(ROOT, 'app/globals.css');

/** Ambiti ammessi per font-weight 700 (ordine vincolante). */
const BOLD_SCOPES = ['.ProseMirror', '.rich-text', '.echo-reply'] as const;

const WEIGHT_NAMES = 'thin|extralight|light|medium|semibold|bold|extrabold|black';

const WEIGHT_CLASS_RE = new RegExp(
  String.raw`(?:^|[\s"'` +
    '`' +
    String.raw`])((?:[\w\[\]=\-.%/&*>_()]+:)*!?font-(?:` +
    WEIGHT_NAMES +
    String.raw`))(?=[\s"'` +
    '`' +
    String.raw`]|$)`,
  'g'
);

const FONT_WEIGHT_INLINE = /fontWeight\s*:\s*(?:[5-9]00|['"]bold['"]|['"]bolder['"])/;

const PROSE_CLASS_RE = new RegExp(
  String.raw`(?:^|[\s"'` +
    '`' +
    String.raw`])((?:[\w\[\]=\-.%/&*>_()]+:)*!?)?(prose(?:-[a-z0-9\[\]=/]+)?|not-prose)(?=[\s"'` +
    '`' +
    String.raw`]|$)`,
  'g'
);

function walkTsx(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.next' || name === '__tests__') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkTsx(full, out);
      continue;
    }
    if (name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/**
 * Letterali di classi: className / class: / argomenti di cn(...),
 * più qualsiasi stringa tra apici/virgolette che contiene già un token prose o font-WEIGHT
 * (copre cva e className multilinea).
 */
function classLikeLiterals(src: string): string[] {
  const hits: string[] = [];
  for (const m of Array.from(src.matchAll(/className\s*=\s*(["'`])([\s\S]*?)\1/g))) {
    hits.push(m[2]);
  }
  for (const m of Array.from(src.matchAll(/\bclass\s*:\s*(["'`])([\s\S]*?)\1/g))) {
    hits.push(m[2]);
  }
  for (const m of Array.from(src.matchAll(/\bcn\s*\(([^)]*)\)/g))) {
    for (const s of Array.from(m[1].matchAll(/(["'`])([^"'`]*?)\1/g))) {
      hits.push(s[2]);
    }
  }
  for (const m of Array.from(src.matchAll(/(["'`])([^"'`]*?)\1/g))) {
    const inner = m[2];
    if (
      /(?:^|\s)(?:[\w\[\]=\-.%/&*>_()]+:)*!?font-(?:thin|extralight|light|medium|semibold|bold|extrabold|black)(?:\s|$)/.test(
        inner
      ) ||
      /(?:^|\s)(?:[\w\[\]=\-.%/&*>_()]+:)*!?(?:prose(?:-[a-z0-9\[\]=/]+)?|not-prose)(?:\s|$)/.test(
        inner
      )
    ) {
      hits.push(inner);
    }
  }
  return hits;
}

describe('typography: no dead weight / prose classes', () => {
  const files = [...walkTsx(join(ROOT, 'app')), ...walkTsx(join(ROOT, 'components'))];

  it('nessuna classe font-(thin|…|black) né fontWeight 500–900 in app/components', () => {
    const failures: string[] = [];
    for (const file of files) {
      const rel = relative(ROOT, file).replace(/\\/g, '/');
      const text = readFileSync(file, 'utf8');
      text.split(/\n/).forEach((line, idx) => {
        WEIGHT_CLASS_RE.lastIndex = 0;
        for (const m of Array.from(line.matchAll(WEIGHT_CLASS_RE))) {
          failures.push(`${rel}:${idx + 1} ${m[1]}`);
        }
        if (FONT_WEIGHT_INLINE.test(line)) {
          failures.push(`${rel}:${idx + 1} fontWeight inline`);
        }
      });
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('nessuna classe prose / prose-* / not-prose in app/components', () => {
    const failures: string[] = [];
    for (const file of files) {
      const rel = relative(ROOT, file).replace(/\\/g, '/');
      const text = readFileSync(file, 'utf8');
      for (const lit of classLikeLiterals(text)) {
        PROSE_CLASS_RE.lastIndex = 0;
        for (const m of Array.from(lit.matchAll(PROSE_CLASS_RE))) {
          failures.push(`${rel} ${m[3] ?? m[2] ?? m[0]}`);
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
});

describe('typography: CSS bold scopes and rich-text selectors', () => {
  const css = readFileSync(CSS_PATH, 'utf8');

  it('regola globale font-weight: 400 !important su *, *::before, *::after', () => {
    expect(css).toMatch(
      /\*\s*,\s*\*::before\s*,\s*\*::after\s*\{[^}]*font-weight:\s*400\s*!important/
    );
  });

  it('ambiti del grassetto (700) sono esattamente BOLD_SCOPES, una sola volta', () => {
    const scopesList = BOLD_SCOPES.join(', ');
    const re = new RegExp(
      String.raw`:is\(([^)]+)\)\s*:is\(strong,\s*b\)\s*,\s*:is\(([^)]+)\)\s*:is\(strong,\s*b\)\s*\*\s*\{[^}]*font-weight:\s*700\s*!important`
    );
    const m = css.match(re);
    expect(m, 'regola grassetto 700 non trovata').toBeTruthy();
    expect(m![1].replace(/\s+/g, ' ').trim()).toBe(scopesList);
    expect(m![2].replace(/\s+/g, ' ').trim()).toBe(scopesList);
    const count = (
      css.match(
        /:is\(\s*\.ProseMirror\s*,\s*\.rich-text\s*,\s*\.echo-reply\s*\)\s*:is\(strong,\s*b\)/g
      ) || []
    ).length;
    expect(count).toBe(2);
  });

  it(':is(.ProseMirror, .rich-text) per h1–a; nessuna regola solo .ProseMirror per questi', () => {
    for (const el of ['h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 'blockquote', 'hr', 'a']) {
      expect(css, el).toMatch(
        new RegExp(String.raw`:is\(\.ProseMirror,\s*\.rich-text\)\s+${el}\s*\{`)
      );
      const lone = new RegExp(String.raw`(?:^|[^\w-])\.ProseMirror\s+${el}\s*\{`, 'm');
      expect(css.match(lone), `solo .ProseMirror ${el}`).toBeNull();
    }
  });

  it('@import Noto Sans e Noto Serif con pesi 400 e 700 (anche corsivo)', () => {
    const m = css.match(/@import url\('([^']+)'\)/);
    expect(m).toBeTruthy();
    const url = m![1];
    expect(url).toMatch(/family=Noto\+Sans:ital,wght@[^&]*0,400/);
    expect(url).toMatch(/family=Noto\+Sans:ital,wght@[^&]*0,700/);
    expect(url).toMatch(/family=Noto\+Serif:ital,wght@[^&]*0,400/);
    expect(url).toMatch(/family=Noto\+Serif:ital,wght@[^&]*0,700/);
    expect(url).toMatch(/1,400/);
    expect(url).toMatch(/1,700/);
  });
});

describe('typography: components', () => {
  afterEach(() => cleanup());

  it('BiographySectionBody rende rich-text senza prose', () => {
    const { container } = render(
      createElement(BiographySectionBody, { text: '**Ciao**\n\nParagrafo.' })
    );
    const el = container.querySelector('.rich-text');
    expect(el).toBeTruthy();
    expect(el!.className).not.toMatch(/\bprose\b/);
  });

  it('EchoMessageContent con **testo** rende strong dentro .echo-reply', () => {
    const { container } = render(createElement(EchoMessageContent, { content: '**testo**' }));
    const reply = container.querySelector('.echo-reply');
    expect(reply).toBeTruthy();
    const strong = reply!.querySelector('strong');
    expect(strong).toBeTruthy();
    expect(strong!.textContent).toBe('testo');
  });
});
