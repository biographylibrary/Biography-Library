/** @vitest-environment jsdom */
/**
 * Footer shadcn: gap-2 anche sotto sm (pulsanti impilati su mobile).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DialogFooter } from '@/components/ui/dialog';
import { AlertDialogFooter } from '@/components/ui/alert-dialog';
import { SheetFooter } from '@/components/ui/sheet';

const ROOT = join(__dirname, '../..');

const FOOTER_FILES = [
  {
    name: 'DialogFooter',
    path: 'components/ui/dialog.tsx',
    Component: DialogFooter,
  },
  {
    name: 'AlertDialogFooter',
    path: 'components/ui/alert-dialog.tsx',
    Component: AlertDialogFooter,
  },
  {
    name: 'SheetFooter',
    path: 'components/ui/sheet.tsx',
    Component: SheetFooter,
  },
] as const;

function footerClassString(src: string): string | null {
  const m = src.match(/(['"])(flex flex-col-reverse[^'"]*)\1/);
  return m ? m[2] : null;
}

describe('dialog footers spacing', () => {
  it('sorgenti: footer con gap-2 e flex-col-reverse, senza space-x/y', () => {
    const failures: string[] = [];
    for (const f of FOOTER_FILES) {
      const src = readFileSync(join(ROOT, f.path), 'utf8');
      const classStr = footerClassString(src);
      if (!classStr) {
        failures.push(`${f.name}: stringa classi footer non trovata`);
        continue;
      }
      if (!/\bgap-2\b/.test(classStr)) failures.push(`${f.name}: manca gap-2 (${classStr})`);
      if (!/\bflex-col-reverse\b/.test(classStr)) {
        failures.push(`${f.name}: manca flex-col-reverse`);
      }
      if (/\bspace-x-/.test(classStr)) failures.push(`${f.name}: contiene space-x- (${classStr})`);
      if (/\bspace-y-/.test(classStr)) failures.push(`${f.name}: contiene space-y- (${classStr})`);
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  afterEach(() => cleanup());

  it('render: DialogFooter, AlertDialogFooter e SheetFooter espongono gap-2', () => {
    const failures: string[] = [];
    for (const f of FOOTER_FILES) {
      const { container } = render(
        createElement(
          f.Component,
          null,
          createElement('button', { type: 'button' }, 'A'),
          createElement('button', { type: 'button' }, 'B')
        )
      );
      const el = container.firstElementChild;
      if (!el) {
        failures.push(`${f.name}: nessun elemento`);
        continue;
      }
      if (!/\bgap-2\b/.test(el.className)) {
        failures.push(`${f.name}: className senza gap-2 (${el.className})`);
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
});
