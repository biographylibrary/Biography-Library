import { describe, expect, it } from 'vitest';
import type { ToolDefinition } from '@/lib/agents/infomaniak-client';
import { recoverTextToolCalls } from '@/lib/agents/text-tool-calls';

const tool = (name: string): ToolDefinition => ({
  type: 'function',
  function: { name, description: name, parameters: {} },
});
const TOOLS = [tool('propose_draft'), tool('read_section'), tool('get_progress')];

/** La risposta ricevuta il 5 ottobre 2026 nella prova con l'account di prova. */
const REPORTED = [
  'That is a beautiful and generous motivation to begin with. It sets a tone of legacy and purpose for the rest of your story.',
  '',
  'I have prepared a draft that captures this feeling of excitement and your desire to contribute something meaningful to others.',
  '',
  'propose_draft(sectionKey="freeflow", draftText="The Biography Library project has brought a renewed sense of excitement and joy into my life. There is a profound satisfaction in the act of recording my journey, driven by the hope that these reflections may one day serve as something useful for all mankind.")',
  '',
  'I have drafted a passage based on your words to start your document.',
].join('\n');

describe('recoverTextToolCalls', () => {
  it('riconosce la chiamata scritta come testo nella risposta segnalata e lascia le frasi attorno', () => {
    const { text, calls } = recoverTextToolCalls(REPORTED, TOOLS);
    expect(calls).toHaveLength(1);
    expect(calls[0].type).toBe('function');
    expect(calls[0].id).toMatch(/^text-call-/);
    expect(calls[0].function.name).toBe('propose_draft');
    expect(JSON.parse(calls[0].function.arguments)).toEqual({
      sectionKey: 'freeflow',
      draftText:
        'The Biography Library project has brought a renewed sense of excitement and joy into my life. There is a profound satisfaction in the act of recording my journey, driven by the hope that these reflections may one day serve as something useful for all mankind.',
    });
    expect(text).not.toContain('propose_draft');
    expect(text).toBe(
      [
        'That is a beautiful and generous motivation to begin with. It sets a tone of legacy and purpose for the rest of your story.',
        '',
        'I have prepared a draft that captures this feeling of excitement and your desire to contribute something meaningful to others.',
        '',
        'I have drafted a passage based on your words to start your document.',
      ].join('\n')
    );
  });

  it('legge virgolette con barra, a capo, parentesi dentro il testo e valori che non sono testo', () => {
    const content =
      'Ecco.\n\npropose_draft(sectionKey="freeflow", replaceText="disse \\"ciao\\" (forte)", draftText="Riga uno\\nRiga due", replaceAll=true)\n';
    const { text, calls } = recoverTextToolCalls(content, TOOLS);
    expect(calls).toHaveLength(1);
    expect(JSON.parse(calls[0].function.arguments)).toEqual({
      sectionKey: 'freeflow',
      replaceText: 'disse "ciao" (forte)',
      draftText: 'Riga uno\nRiga due',
      replaceAll: true,
    });
    expect(text).toBe('Ecco.');
  });

  it('accetta anche un solo oggetto JSON come argomenti', () => {
    const { calls } = recoverTextToolCalls('propose_draft({"sectionKey":"freeflow","draftText":"Un (testo)."})', TOOLS);
    expect(calls).toHaveLength(1);
    expect(JSON.parse(calls[0].function.arguments)).toEqual({ sectionKey: 'freeflow', draftText: 'Un (testo).' });
  });

  it('toglie anche il blocco di codice che avvolge la chiamata', () => {
    const content = 'Prima.\n\n```tool_code\npropose_draft(sectionKey="freeflow", draftText="Testo.")\n```\n\nDopo.';
    const { text, calls } = recoverTextToolCalls(content, TOOLS);
    expect(calls).toHaveLength(1);
    expect(text).toBe('Prima.\n\nDopo.');
  });

  it('riconosce più chiamate nello stesso messaggio, nell\'ordine, e una chiamata senza argomenti', () => {
    const content =
      'get_progress()\n\nread_section(sectionKey="freeflow")\n\npropose_draft(sectionKey="freeflow", draftText="X")';
    const { calls, text } = recoverTextToolCalls(content, TOOLS);
    expect(calls.map((c) => c.function.name)).toEqual(['get_progress', 'read_section', 'propose_draft']);
    expect(JSON.parse(calls[0].function.arguments)).toEqual({});
    expect(new Set(calls.map((c) => c.id)).size).toBe(3);
    expect(text).toBe('');
  });

  describe('lascia il testo com\'è (nessuna chiamata)', () => {
    it('quando lo strumento non è fra quelli offerti al modello', () => {
      const content = 'delete_everything(sectionKey="freeflow")';
      expect(recoverTextToolCalls(content, TOOLS)).toEqual({ text: content, calls: [] });
    });

    it('quando non ci sono strumenti o il testo è vuoto', () => {
      expect(recoverTextToolCalls(REPORTED, undefined)).toEqual({ text: REPORTED, calls: [] });
      expect(recoverTextToolCalls(REPORTED, [])).toEqual({ text: REPORTED, calls: [] });
      expect(recoverTextToolCalls('', TOOLS)).toEqual({ text: '', calls: [] });
    });

    it('quando il nome è citato dentro una frase', () => {
      const content = 'Per aggiungere il testo uso propose_draft(sectionKey="freeflow", draftText="X") appena sei pronto.';
      expect(recoverTextToolCalls(content, TOOLS)).toEqual({ text: content, calls: [] });
    });

    it('quando il nome è parte di un\'altra parola o di un percorso', () => {
      const content = 'my_propose_draft(sectionKey="a")\nobj.propose_draft(sectionKey="a")';
      expect(recoverTextToolCalls(content, TOOLS)).toEqual({ text: content, calls: [] });
    });

    it('quando la parola è nominata senza argomenti riconoscibili', () => {
      const content = 'propose_draft (vedi sopra)\n\npropose_draft(draftText=Testo senza virgolette)';
      expect(recoverTextToolCalls(content, TOOLS)).toEqual({ text: content, calls: [] });
    });

    it('quando la chiamata è incompleta (stringa o parentesi non chiuse)', () => {
      const open = 'propose_draft(sectionKey="freeflow", draftText="testo che non finisce';
      expect(recoverTextToolCalls(open, TOOLS)).toEqual({ text: open, calls: [] });
      const noParen = 'propose_draft(sectionKey="freeflow", draftText="finito"';
      expect(recoverTextToolCalls(noParen, TOOLS)).toEqual({ text: noParen, calls: [] });
    });
  });

  it('non riconosce più di quattro chiamate per messaggio', () => {
    const content = Array.from({ length: 6 }, () => 'get_progress()').join('\n');
    const { calls } = recoverTextToolCalls(content, TOOLS);
    expect(calls).toHaveLength(4);
  });
});
