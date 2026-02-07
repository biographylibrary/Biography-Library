import { aiService, type Improvement } from './ai-provider';

export async function exampleGrammarCheck(
  token: string,
  text: string,
  sectionTitle: string,
  language: string = 'en'
) {
  try {
    const results = await aiService.checkGrammar(token, sectionTitle, text, language);

    console.log(`Found ${results.length} grammar suggestions:`);
    results.forEach((result) => {
      console.log(`- Original: "${result.original}"`);
      console.log(`  Suggestion: "${result.suggestion}"`);
      console.log(`  Explanation: ${result.explanation}`);
    });

    return results;
  } catch (error) {
    console.error('Grammar check failed:', error);
    throw error;
  }
}

export async function exampleGetSuggestions(
  text: string,
  section: string,
  language: string = 'en'
): Promise<Improvement[]> {
  try {
    const improvements = await aiService.suggestImprovements(text, section, language);

    const highPriority = improvements.filter((i) => i.priority === 'high');
    const mediumPriority = improvements.filter((i) => i.priority === 'medium');
    const lowPriority = improvements.filter((i) => i.priority === 'low');

    console.log(`High priority improvements: ${highPriority.length}`);
    console.log(`Medium priority improvements: ${mediumPriority.length}`);
    console.log(`Low priority improvements: ${lowPriority.length}`);

    return improvements;
  } catch (error) {
    console.error('Failed to get suggestions:', error);
    throw error;
  }
}

export async function exampleGenerateSummary(
  token: string,
  text: string,
  sectionTitle: string,
  language: string = 'en'
): Promise<string> {
  try {
    const summary = await aiService.getSummary(token, sectionTitle, text, language);

    console.log('Generated summary:');
    console.log(summary);

    return summary;
  } catch (error) {
    console.error('Summary generation failed:', error);
    throw error;
  }
}

export async function exampleGetGuidedPrompts(
  token: string,
  sectionKey: string,
  sectionTitle: string,
  language: string = 'en'
) {
  try {
    const prompts = await aiService.getGuidedPrompts(token, sectionKey, sectionTitle, language);

    console.log(`Generated ${prompts.length} guided prompts:`);
    prompts.forEach((prompt, index) => {
      console.log(`${index + 1}. ${prompt.prompt}`);
      console.log(`   Starter: "${prompt.starter}"`);
    });

    return prompts;
  } catch (error) {
    console.error('Failed to get guided prompts:', error);
    throw error;
  }
}

export async function exampleProcessImprovements(
  improvements: Improvement[],
  onApply: (improvement: Improvement) => void
) {
  const sortedByPriority = improvements.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const byType = improvements.reduce((acc, imp) => {
    if (!acc[imp.type]) acc[imp.type] = [];
    acc[imp.type].push(imp);
    return acc;
  }, {} as Record<string, Improvement[]>);

  console.log('Improvements by type:');
  Object.entries(byType).forEach(([type, imps]) => {
    console.log(`${type}: ${imps.length}`);
  });

  console.log('\nApplying high-priority improvements automatically:');
  const highPriority = improvements.filter((i) => i.priority === 'high');
  highPriority.forEach((improvement) => {
    console.log(`Applying: ${improvement.suggestion}`);
    onApply(improvement);
  });

  return {
    total: improvements.length,
    byType,
    applied: highPriority.length,
  };
}
