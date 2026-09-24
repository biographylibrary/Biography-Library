import { describe, expect, it } from 'vitest';
import { buildCoachSystemPrompt } from '@/lib/agents/prompts/coach';
import { buildEchoSystemPrompt } from '@/lib/agents/prompts/echo';

const MARKERS = [
  'what they learned from life',
  'regrets',
  'what they learned from love',
  'what they learned from injustice',
  'advice they want to leave for future readers',
  'Do not romanticize',
  'Never write as if the writer lived that life',
];

describe('plain meaning rules', () => {
  it('is in both Echo and the coach, without new chapters', () => {
    const echo = buildEchoSystemPrompt('it', { page: 'editor_sections' });
    const coach = buildCoachSystemPrompt('it', 'legacy', 'Legacy');
    for (const prompt of [echo, coach]) {
      for (const marker of MARKERS) {
        expect(prompt).toContain(marker);
      }
      expect(prompt).toContain('Do not add chapters');
    }
  });
});
