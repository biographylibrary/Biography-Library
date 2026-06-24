import { stripHtmlToPlain } from '@/lib/import/html-blocks';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import { callAI } from '@/lib/ai/ai-client';

export interface SectionSuggestion {
  section: string;
  excerpt: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  fullText: string;
}

export interface SectionDetectionResult {
  suggestions: SectionSuggestion[];
  needsManualReview: boolean;
}

export interface BlockSectionSuggestion {
  section: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  source: 'title' | 'ai';
}

async function analyzeChunk(
  chunk: string,
  language: string
): Promise<{
  section: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}> {
  try {
    const data = await callAI({
      action: 'detect-section',
      chunkText: chunk.substring(0, 500),
      language,
    });

    const section = data.section || '';
    const confidence = data.confidence || 'low';
    const reason = data.reason || '';

    const validSection = BIOGRAPHY_SECTIONS.find((s) => s.key === section);
    if (!validSection) {
      return {
        section: 'childhood',
        confidence: 'low',
        reason: 'Could not determine appropriate section',
      };
    }

    return { section, confidence, reason };
  } catch (error) {
    console.error('Error analyzing chunk:', error);
    return {
      section: 'childhood',
      confidence: 'low',
      reason: 'Automatic detection failed',
    };
  }
}

export async function suggestSectionForBlock(
  html: string,
  language: string
): Promise<BlockSectionSuggestion> {
  const plain = stripHtmlToPlain(html);
  const analysis = await analyzeChunk(plain, language);
  return {
    section: analysis.section,
    confidence: analysis.confidence,
    reason: analysis.reason,
    source: 'ai',
  };
}

function splitIntoChunks(text: string): string[] {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length < 1000) {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = para;
    }
  }

  if (currentChunk) chunks.push(currentChunk);

  return chunks.length > 0 ? chunks : [text];
}

export async function detectSections(
  importedText: string,
  language: string
): Promise<SectionDetectionResult> {
  const plain =
    importedText.includes('<') ? stripHtmlToPlain(importedText) : importedText;
  const chunks = splitIntoChunks(plain);
  const suggestions: SectionSuggestion[] = [];

  for (const chunk of chunks) {
    const analysis = await analyzeChunk(chunk, language);

    const excerpt =
      chunk.length > 100 ? chunk.substring(0, 100) + '...' : chunk;

    suggestions.push({
      section: analysis.section,
      excerpt,
      confidence: analysis.confidence,
      reason: analysis.reason,
      fullText: chunk,
    });
  }

  const needsManualReview = suggestions.some((s) => s.confidence === 'low');

  return {
    suggestions,
    needsManualReview,
  };
}
