import { describe, expect, it } from 'vitest';
import {
  assessStoredText,
  decideApply,
  htmlSnapshotFields,
} from '@/lib/archive-markdown-legacy';

describe('archive markdown legacy dry-run', () => {
  it('treats supported HTML as clean', () => {
    const field = assessStoredText(
      'content_freeflow',
      '<p>Hello <strong>world</strong></p>'
    );
    expect(field.kind).toBe('clean');
    expect(decideApply('published', {
      fields: [field],
      hasHtml: true,
      hasTextLoss: false,
      hasFormattingLoss: false,
    })).toBe('convert');
  });

  it('keeps published biographies with formatting loss for manual review', () => {
    const field = assessStoredText(
      'content.childhood.text',
      '<p style="text-align:center"><u>keep</u></p>'
    );
    expect(field.kind).toBe('formatting_loss');
    expect(field.unsupported).toEqual(['style', 'u']);
    expect(decideApply('published', {
      fields: [field],
      hasHtml: true,
      hasTextLoss: false,
      hasFormattingLoss: true,
    })).toBe('manual_review');
    expect(decideApply('draft', {
      fields: [field],
      hasHtml: true,
      hasTextLoss: false,
      hasFormattingLoss: true,
    })).toBe('convert');
  });

  it('never auto-applies a text loss', () => {
    const field = assessStoredText(
      'final_version',
      '<p>Ciao</p><img alt="foto di casa" src="https://example.com/a.jpg">'
    );
    expect(field.kind).toBe('text_loss');
    expect(decideApply('draft', {
      fields: [field],
      hasHtml: true,
      hasTextLoss: true,
      hasFormattingLoss: false,
    })).toBe('manual_review');
  });

  it('leaves Markdown untouched and snapshots only HTML', () => {
    expect(assessStoredText('content_freeflow', '## Gia markdown').kind).toBe('markdown');
    expect(decideApply('published', {
      fields: [],
      hasHtml: false,
      hasTextLoss: false,
      hasFormattingLoss: false,
    })).toBe('skip_unchanged');
    expect(
      htmlSnapshotFields([
        { path: 'content_freeflow', value: '<p>Ciao</p>' },
        { path: 'final_version', value: 'gia **md**' },
      ])
    ).toEqual({ content_freeflow: '<p>Ciao</p>' });
  });
});
