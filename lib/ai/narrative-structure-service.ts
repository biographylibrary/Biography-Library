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

  console.log('[analyzeThemes] Calling AI assistant with', sections.length, 'sections');

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

  console.log('[analyzeThemes] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[analyzeThemes] Error response:', errorText);

    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: `HTTP ${response.status}: ${errorText}` };
    }

    throw new Error(errorData.error || 'Failed to analyze themes');
  }

  const data = await response.json();
  console.log('[analyzeThemes] Success, got', data.analysis?.length || 0, 'theme analyses');

  return data.analysis || [];
}

export async function proposeAlternativeStructures(
  accessToken: string,
  themeAnalysis: SectionThemeAnalysis[],
  originalOrder: string[],
  language: string
): Promise<NarrativeStructureProposal[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  console.log('[proposeAlternativeStructures] Calling AI assistant with', themeAnalysis.length, 'theme analyses');

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

  console.log('[proposeAlternativeStructures] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[proposeAlternativeStructures] Error response:', errorText);

    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: `HTTP ${response.status}: ${errorText}` };
    }

    throw new Error(errorData.error || 'Failed to propose structures');
  }

  const data = await response.json();
  console.log('[proposeAlternativeStructures] Success, got', data.proposals?.length || 0, 'proposals');

  return data.proposals || [];
}
