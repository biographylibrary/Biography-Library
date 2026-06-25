import { describe, expect, it } from 'vitest';
import {
  adaptMemorialPrompt,
  buildBiographyNarrativeContext,
  buildMemorialNarrativeBlock,
  isMemorialNarrative,
} from '@/lib/biography-narrative-context';

describe('buildBiographyNarrativeContext', () => {
  it('builds memorial context from biography row', () => {
    const ctx = buildBiographyNarrativeContext({
      biography_type: 'memorial',
      subject_name: 'Francesco',
      title: 'La storia di Francesco',
      author_name: 'Maria',
    });
    expect(ctx.biographyType).toBe('memorial');
    expect(ctx.subjectName).toBe('Francesco');
    expect(ctx.writerName).toBe('Maria');
    expect(isMemorialNarrative(ctx)).toBe(true);
  });

  it('falls back to title when subject_name is missing', () => {
    const ctx = buildBiographyNarrativeContext({
      biography_type: 'memorial',
      subject_name: null,
      title: 'Nonno Luigi',
      author_name: 'Anna',
    });
    expect(ctx.subjectName).toBe('Nonno Luigi');
  });
});

describe('buildMemorialNarrativeBlock', () => {
  const memorialCtx = {
    biographyType: 'autobiography' as const,
    subjectName: 'Francesco',
    writerName: 'Maria',
  };

  it('returns empty string for autobiography type', () => {
    expect(buildMemorialNarrativeBlock(memorialCtx, 'en')).toBe('');
  });

  it('includes subject name and avoids your-childhood framing in EN', () => {
    const ctx = { biographyType: 'memorial' as const, subjectName: 'Francesco', writerName: 'Maria' };
    const block = buildMemorialNarrativeBlock(ctx, 'en');
    expect(block).toContain('Francesco');
    expect(block).toContain('Maria');
    expect(block).toContain('NEVER phrase questions');
    expect(block).toContain("Francesco's childhood");
  });

  it('includes Italian memorial instructions', () => {
    const ctx = { biographyType: 'memorial' as const, subjectName: 'Francesco', writerName: 'Maria' };
    const block = buildMemorialNarrativeBlock(ctx, 'it');
    expect(block).toContain('BIOGRAFIA MEMORIAL');
    expect(block).toContain('Francesco');
    expect(block).toContain("infanzia di Francesco");
  });
});

describe('adaptMemorialPrompt', () => {
  const ctx = {
    biographyType: 'memorial' as const,
    subjectName: 'Francesco',
    writerName: 'Maria',
  };

  it('adapts Italian childhood prompt away from second person', () => {
    const { prompt, starter } = adaptMemorialPrompt(
      "Com'era la tua casa d'infanzia?",
      'La mia casa era piccola ma accogliente.',
      ctx,
      'it'
    );
    expect(prompt.toLowerCase()).not.toMatch(/\btua\b/);
    expect(prompt).toContain('Francesco');
    expect(starter).not.toMatch(/^La mia\b/i);
  });

  it('adapts English childhood prompt', () => {
    const { prompt } = adaptMemorialPrompt(
      'What was your childhood home like?',
      'My home was small but cozy.',
      ctx,
      'en'
    );
    expect(prompt).not.toMatch(/\byour childhood\b/i);
    expect(prompt).toContain("Francesco");
  });

  it('returns unchanged for autobiography', () => {
    const auto = { biographyType: 'autobiography' as const, subjectName: '', writerName: 'Maria' };
    const original = { prompt: 'What was your childhood like?', starter: 'I remember...' };
    expect(adaptMemorialPrompt(original.prompt, original.starter, auto, 'en')).toEqual(original);
  });
});
