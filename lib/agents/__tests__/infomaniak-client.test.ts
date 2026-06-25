import { describe, expect, it } from 'vitest';
import { extractTextContent } from '@/lib/agents/infomaniak-client';

describe('extractTextContent', () => {
  it('returns plain strings unchanged', () => {
    expect(extractTextContent('Ciao mondo')).toBe('Ciao mondo');
  });

  it('joins multipart content arrays', () => {
    expect(extractTextContent([{ text: 'Hello ' }, { text: 'world' }])).toBe('Hello world');
  });

  it('handles null and undefined', () => {
    expect(extractTextContent(null)).toBe('');
    expect(extractTextContent(undefined)).toBe('');
  });
});
