import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';

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

function splitIntoChunks(text: string): string[] {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

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

async function analyzeChunk(
  chunk: string,
  language: string,
  authToken: string
): Promise<{
  section: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}> {
  const sectionDescriptions = BIOGRAPHY_SECTIONS.map(s =>
    `- ${s.key}: ${s.title}`
  ).join('\n');

  const languageNames: Record<string, string> = {
    en: 'English',
    it: 'Italian',
    fr: 'French',
    de: 'German',
  };

  const sectionHints: Record<string, string> = {
    childhood: 'early memories, youth, first experiences',
    family: 'parents, siblings, relatives, ancestry',
    education: 'school, university, learning, studies',
    career: 'work, jobs, professional life, career milestones',
    'life-events': 'important moments, major events, turning points',
    relationships: 'spouse, partners, friendships, romantic life',
    challenges: 'difficulties, hardships, obstacles, lessons learned',
    passions: 'hobbies, interests, leisure activities',
    legacy: 'impact, what to be remembered for, final thoughts',
  };

  const detailedSections = BIOGRAPHY_SECTIONS.map(s =>
    `- ${s.key}: ${s.title} (${sectionHints[s.key] || ''})`
  ).join('\n');

  const prompt = `You are analyzing a biography excerpt to determine which section it belongs to.

Available sections:
${detailedSections}

Text excerpt:
"""
${chunk.substring(0, 500)}${chunk.length > 500 ? '...' : ''}
"""

Analyze this text and determine which biography section it most likely belongs to. Consider:
- The main theme and content
- Time period mentioned (childhood, adulthood, etc.)
- Subject matter (family, work, education, personal life, etc.)

Respond with ONLY a valid JSON object in this exact format (no markdown, no code blocks):
{"section": "section_key", "confidence": "high|medium|low", "reason": "Brief explanation in ${languageNames[language] || 'English'}"}`;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-assistant`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content || '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);

    const validSection = BIOGRAPHY_SECTIONS.find(s => s.key === result.section);
    if (!validSection) {
      return {
        section: 'early_years',
        confidence: 'low',
        reason: 'Could not determine appropriate section',
      };
    }

    return {
      section: result.section,
      confidence: result.confidence,
      reason: result.reason,
    };
  } catch (error) {
    console.error('Error analyzing chunk:', error);
    return {
      section: 'early_years',
      confidence: 'low',
      reason: 'Automatic detection failed',
    };
  }
}

export async function detectSections(
  importedText: string,
  language: string,
  authToken: string
): Promise<SectionDetectionResult> {
  const chunks = splitIntoChunks(importedText);
  const suggestions: SectionSuggestion[] = [];

  for (const chunk of chunks) {
    const analysis = await analyzeChunk(chunk, language, authToken);

    const excerpt = chunk.length > 100
      ? chunk.substring(0, 100) + '...'
      : chunk;

    suggestions.push({
      section: analysis.section,
      excerpt,
      confidence: analysis.confidence,
      reason: analysis.reason,
      fullText: chunk,
    });
  }

  const needsManualReview = suggestions.some(s => s.confidence === 'low');

  return {
    suggestions,
    needsManualReview,
  };
}
