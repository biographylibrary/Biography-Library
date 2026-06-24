import { afterEach, describe, expect, it } from 'vitest';
import {
  AGENT_TYPE_TO_ROLE,
  DEFAULT_MODELS,
  getModelForRole,
} from '@/lib/agents/models';

describe('publication AI models', () => {
  afterEach(() => {
    delete process.env.AGENT_MODEL_REVIEWER;
    delete process.env.AGENT_MODEL_APERTUS;
  });

  it('routes publication_reviewer agent type to reviewer role (Gemma), not apertus', () => {
    expect(AGENT_TYPE_TO_ROLE.publication_reviewer).toBe('reviewer');
    expect(AGENT_TYPE_TO_ROLE.publication_reviewer).not.toBe('apertus');
  });

  it('uses Gemma 4 as default reviewer model for publication screening', () => {
    expect(getModelForRole('reviewer').primary).toBe('google/gemma-4-31B-it');
    expect(DEFAULT_MODELS.reviewer.primary).toBe('google/gemma-4-31B-it');
  });

  it('keeps Apertus isolated to the optional section editorial review role', () => {
    expect(DEFAULT_MODELS.apertus.primary).toContain('Apertus');
    expect(getModelForRole('reviewer').primary).not.toContain('Apertus');
  });

  it('respects AGENT_MODEL_REVIEWER override for publication flows', () => {
    process.env.AGENT_MODEL_REVIEWER = 'google/gemma-4-31B-it';
    expect(getModelForRole('reviewer').primary).toBe('google/gemma-4-31B-it');
  });
});
