import { aiService } from '@/lib/ai/ai-provider';

async function exampleCheckGrammar(
  sectionTitle: string,
  text: string,
  language: string
) {
  try {
    const results = await aiService.checkGrammar(sectionTitle, text, language);

    console.log(`Found ${results.length} grammar suggestions:`);
    results.forEach((result) => {
      console.log(`- Original: "${result.original}"`);
      console.log(`  Suggestion: "${result.suggestion}"`);
      console.log(`  Explanation: ${result.explanation}`);
    });
  } catch (error) {
    console.error('Grammar check failed:', error);
  }
}

async function exampleGetPrompts(
  sectionKey: string,
  sectionTitle: string,
  language: string
) {
  try {
    const prompts = await aiService.getGuidedPrompts(sectionKey, sectionTitle, language);
    console.log(`Got ${prompts.length} writing prompts:`);
    prompts.forEach((p) => console.log(`- ${p.prompt}`));
  } catch (error) {
    console.error('Get prompts failed:', error);
  }
}

async function exampleGetSummary(
  sectionTitle: string,
  content: string,
  language: string
) {
  try {
    const summary = await aiService.getSummary(sectionTitle, content, language);
    console.log('Summary:', summary);
  } catch (error) {
    console.error('Summary failed:', error);
  }
}

export { exampleCheckGrammar, exampleGetPrompts, exampleGetSummary };
