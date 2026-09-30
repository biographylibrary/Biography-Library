import { afterEach, describe, expect, it } from 'vitest';
import {
  AGENT_TYPE_TO_ROLE,
  DEFAULT_MODELS,
  getModelForRole,
} from '@/lib/agents/models';

describe('publication AI models', () => {
  afterEach(() => {
    delete process.env.AGENT_MODEL_REVIEWER;
  });

  it('has a single conversational agent, Echo', () => {
    expect(Object.keys(AGENT_TYPE_TO_ROLE)).toEqual(['echo']);
  });

  it('uses Gemma 4 as default reviewer model for publication screening', () => {
    expect(getModelForRole('reviewer').primary).toBe('google/gemma-4-31B-it');
    expect(DEFAULT_MODELS.reviewer.primary).toBe('google/gemma-4-31B-it');
  });

  it('respects AGENT_MODEL_REVIEWER override for publication flows', () => {
    process.env.AGENT_MODEL_REVIEWER = 'google/gemma-4-31B-it';
    expect(getModelForRole('reviewer').primary).toBe('google/gemma-4-31B-it');
  });
});
