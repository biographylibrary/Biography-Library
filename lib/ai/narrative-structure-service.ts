export interface SectionThemeAnalysis {
  sectionKey: string;
  sectionTitle: string;
  themes: string[];
  mainTheme: string;
  contentSummary: string;
}

export interface NarrativeStructureProposal {
  structureType: string;
  sectionOrder: string[];
  rationale: string;
  transitionNotes: string[];
  focusTheme: string;
}

export interface StructureAnalysisResult {
  themeAnalysis: SectionThemeAnalysis[];
  proposals: NarrativeStructureProposal[];
  originalOrder: string[];
}

export async function analyzeNarrativeStructure(
  token: string,
  sections: { key: string; title: string; content: string }[],
  language: string
): Promise<StructureAnalysisResult> {
  const response = await fetch('/api/ai-analyze-structure', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sections, language }),
  });

  if (!response.ok) {
    throw new Error('Failed to analyze narrative structure');
  }

  return response.json();
}

export async function analyzeThemes(
  accessToken: string,
  sections: { key: string; title: string; content: string }[],
  language: string
): Promise<SectionThemeAnalysis[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const prompt = `Analyze the following biography sections and identify the main themes in each section.

For each section, identify:
1. Main themes (career, relationships, travel, personal growth, challenges, family, education, hobbies, life lessons)
2. The primary theme (the most dominant theme)
3. A brief content summary

Sections:
${sections.map(s => `
Section: ${s.title}
Content: ${s.content.substring(0, 500)}...
`).join('\n')}

Respond in JSON format:
{
  "analysis": [
    {
      "sectionKey": "string",
      "sectionTitle": "string",
      "themes": ["theme1", "theme2"],
      "mainTheme": "primary theme",
      "contentSummary": "brief summary"
    }
  ]
}`;

  const response = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      prompt,
      language,
      maxTokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to analyze themes');
  }

  const data = await response.json();

  try {
    const parsed = JSON.parse(data.response);
    return parsed.analysis;
  } catch {
    return [];
  }
}

export async function proposeAlternativeStructures(
  accessToken: string,
  themeAnalysis: SectionThemeAnalysis[],
  originalOrder: string[],
  language: string
): Promise<NarrativeStructureProposal[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const prompt = `Based on this theme analysis of biography sections, propose 3 alternative narrative structures.

Theme Analysis:
${JSON.stringify(themeAnalysis, null, 2)}

Original Order: ${originalOrder.join(' → ')}

IMPORTANT RULES:
- DO NOT change any content or words
- ONLY reorder sections to create better narrative flow
- Each proposal should focus on different storytelling approach
- Provide clear rationale for each structure
- Explain how transitions work between reordered sections

Proposal types to consider:
1. Thematic grouping (group by theme like career, relationships, personal growth)
2. Emotional arc (arrange by emotional journey)
3. Impact-based (start with most impactful moments)

Respond in JSON format:
{
  "proposals": [
    {
      "structureType": "descriptive name",
      "sectionOrder": ["key1", "key2", ...],
      "rationale": "why this order works",
      "transitionNotes": ["how section1 leads to section2", ...],
      "focusTheme": "main theme of this structure"
    }
  ]
}`;

  const response = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      prompt,
      language,
      maxTokens: 3000,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to propose structures');
  }

  const data = await response.json();

  try {
    const parsed = JSON.parse(data.response);
    return parsed.proposals || [];
  } catch {
    return [];
  }
}
