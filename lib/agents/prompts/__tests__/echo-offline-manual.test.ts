import { describe, expect, it } from 'vitest';
import { buildEchoSystemPrompt } from '@/lib/agents/prompts/echo';

describe('Echo prompt — offline manual pointer', () => {
  it('indirizza ad Aiuto in footer o menu editor senza inventare URL', () => {
    const prompt = buildEchoSystemPrompt('en', { page: 'hub' });
    expect(prompt).toMatch(/Help \(Aiuto \/ Aide \/ Hilfe\)/);
    expect(prompt).toMatch(/site footer|editor side menu/i);
    expect(prompt).toMatch(/Do not invent URLs/);
  });

  it('prova di rottura: senza la riga sul manuale il test fallisce', () => {
    const prompt = buildEchoSystemPrompt('it', { page: 'editor_freeflow' });
    expect(prompt.includes('Do not invent URLs')).toBe(true);
  });
});
