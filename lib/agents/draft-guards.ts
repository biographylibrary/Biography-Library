import type { ChatMessage } from '@/lib/agents/infomaniak-client';
import { unicodeWordBoundaries } from '@/lib/echo/draft-affirmative';

/**
 * Controlli sul testo di Echo che non dipendono dal modello. Il modello a volte racconta
 * un inserimento senza aver chiamato `propose_draft`: l'autore legge «ho inserito» o
 * «controlla tra un istante» e non vede nessuna scheda «Inserisci». Qui si riconosce quel caso
 * (in italiano, inglese, francese e tedesco) perché l'app possa chiedere la proposta vera.
 */

const CLAIM_PATTERNS: RegExp[] = [
  // italiano
  /\b(ho|abbiamo)\s+(appena\s+)?(inserit[oa]|aggiunt[oa]|sostituit[oa]|incollat[oa]|inviat[oa])\b/i,
  /\b(inserimento|sostituzione|aggiunta|modifica)\s+(è\s+)?(effettuat[oa]|completat[oa]|eseguit[oa]|fatt[oa]|avvenut[oa])\b/i,
  /\bsto\s+(inserendo|inviando|aggiungendo|sostituendo|mandando)\b/i,
  /\bprocedo\s+(subito\s+|ora\s+)?(con\s+)?(all'|alla\s+|l')?(inserimento|sostituzione)\b/i,
  /\b(riprovo|provo)\s+(immediatamente\s+|subito\s+)?a\s+(inviare|inserire|mandare)\b/i,
  /\bcontrolla\s+(tra|fra)\s+un\s+istante\b/i,
  /\bdovresti\s+(ora\s+)?vedere\b[^.]{0,80}\b(inserit|inserimento|pronto)/i,
  // inglese
  /\bI(?:'ve|\s+have)\s+(?:just\s+)?(inserted|added|replaced|sent|pasted)\b/i,
  /\b(insertion|replacement)\s+(is\s+)?(done|complete|completed|made)\b/i,
  /\bI(?:'m|\s+am)\s+(inserting|sending|adding|replacing)\b/i,
  // francese
  /\bj'ai\s+(inséré|ajouté|remplacé|envoyé|collé)\b/i,
  /\b(insertion|remplacement)\s+(est\s+)?(effectué|terminé|fait)e?\b/i,
  /\bje\s+(procède|vais\s+procéder)\b[^.]{0,40}\b(insertion|remplacement)\b/i,
  // tedesco
  /\bich\s+habe\b[^.]{0,60}\b(eingefügt|hinzugefügt|ersetzt|gesendet)\b/i,
  /\b(einfügung|ersetzung)\s+(ist\s+)?(erfolgt|abgeschlossen|fertig)\b/i,
].map(unicodeWordBoundaries);

/** Vero se il testo dice che un inserimento o una sostituzione è fatta o in corso. */
export function claimsTextInserted(text: string): boolean {
  const t = text ?? '';
  return CLAIM_PATTERNS.some((re) => re.test(t));
}

const OFFER_PATTERNS: RegExp[] = [
  /\b(posso|vuoi che|se\s+(vuoi|sì|si|ti\s+piace)|lo\s+(aggiungo|inserisco|metto))\b[^.?!]{0,80}\b(aggiung|inser|sostitu|mett)/i,
  /\b(aggiungerlo|inserirlo|metterlo|sostituirlo)\b/i,
  /\b(shall|should)\s+I\b[^.?!]{0,60}\b(add|insert|replace|put)\b/i,
  /\b(want\s+me\s+to|I\s+can)\b[^.?!]{0,60}\b(add|insert|replace|put)\b/i,
  /\b(je\s+peux|voulez-vous\s+que|souhaitez-vous\s+que)\b[^.?!]{0,60}\b(ajouter|insérer|remplacer|mettre)\b/i,
  /\b(soll\s+ich|ich\s+kann)\b[^.?!]{0,60}\b(einfügen|hinzufügen|ersetzen)\b/i,
].map(unicodeWordBoundaries);

/**
 * Vero se l'ultima risposta di Echo, senza una proposta vera, offriva di inserire del testo.
 * Se l'autore risponde «sì» a quell'offerta, l'app non ha nessuna scheda da applicare: si pretende
 * la proposta al posto di un'altra frase a parole.
 */
export function lastAssistantOfferedInsertion(history: ChatMessage[]): boolean {
  for (let i = history.length - 1; i >= 0; i--) {
    const message = history[i];
    if (message.role === 'tool') continue;
    if (message.role !== 'assistant') return false;
    if (message.tool_calls && (message.tool_calls as unknown[]).length > 0) return false;
    const content = typeof message.content === 'string' ? message.content : '';
    return OFFER_PATTERNS.some((re) => re.test(content));
  }
  return false;
}

const APOLOGY_ADVERBS =
  '(?:profondamente|sinceramente|sentitamente|enormemente|infinitamente|di\\s+cuore|moltissimo|tantissimo|davvero|veramente|vivamente)';

/**
 * Una scusa è «mi scuso», e basta. Il modello aggiunge spesso avverbi enfatici: si tolgono dal
 * testo che arriva all'autore (le istruzioni lo chiedono già, questo è il controllo finale).
 */
export function plainApology(text: string): string {
  return (text ?? '')
    .replace(new RegExp(`\\b(mi\\s+scuso)\\s+${APOLOGY_ADVERBS}\\b`, 'gi'), '$1')
    .replace(new RegExp(`\\b${APOLOGY_ADVERBS}\\s+(mi\\s+scuso)\\b`, 'gi'), '$1')
    .replace(/\b(I)\s+(?:deeply|sincerely|truly|really|profoundly|sincerely\s+and\s+deeply)\s+(apologi[sz]e)\b/gi, '$1 $2')
    .replace(/\b(I\s+apologi[sz]e)\s+(?:deeply|sincerely|profusely|from\s+the\s+bottom\s+of\s+my\s+heart)\b/gi, '$1')
    .replace(/\b(je\s+m'excuse|je\s+vous\s+prie\s+de\s+m'excuser)\s+(?:profondément|sincèrement|infiniment|vivement)\b/gi, '$1')
    .replace(/\b(ich\s+entschuldige\s+mich)\s+(?:vielmals|aufrichtig|zutiefst|herzlich)\b/gi, '$1')
    .replace(/\b(Mi\s+scuso)\s+sentitamente\b/g, '$1');
}
