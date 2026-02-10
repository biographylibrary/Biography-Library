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

  const response = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action: 'analyze-themes',
      sections,
      language,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to analyze themes' }));
    throw new Error(errorData.error || 'Failed to analyze themes');
  }

  const data = await response.json();
  return data.analysis || [];
}

export async function proposeAlternativeStructures(
  accessToken: string,
  themeAnalysis: SectionThemeAnalysis[],
  originalOrder: string[],
  language: string
): Promise<NarrativeStructureProposal[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const response = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action: 'propose-structures',
      themeAnalysis,
      originalOrder,
      language,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to propose structures' }));
    throw new Error(errorData.error || 'Failed to propose structures');
  }

  const data = await response.json();
  return data.proposals || [];
}
