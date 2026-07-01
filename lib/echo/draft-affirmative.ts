const NEGATION_PATTERNS = [
  /\b(no|not|never|don't|dont|nope|nah)\b/i,
  /\b(non|mai|niente)\b/i,
  /\b(pas|jamais|non)\b/i,
  /\b(nicht|nein|nie)\b/i,
  /\b(not now|non ora|pas maintenant|nicht jetzt|later|più tardi|plus tard|später)\b/i,
];

const AFFIRMATIVE_PATTERNS = [
  /^(s[iì]|ok|okay|va bene|certo|procedi|inserisci|aggiungi|metti|copia|confermo)\b/i,
  /^(yes|yeah|yep|sure|ok|okay|insert|add|copy|confirm|go ahead|please)\b/i,
  /^(oui|ok|d'accord|insère|insérer|ajoute|confirme)\b/i,
  /^(ja|ok|einfügen|einfuegen|hinzufügen|bestätigen)\b/i,
  /\b(inserisci|inserire|aggiungi|copia)\b/i,
  /\b(insert|add it|copy it)\b/i,
  /\b(insère|insérer|ajoute)\b/i,
  /\b(einfügen|einfuegen|hinzufügen)\b/i,
];

const DISMISSIVE_PATTERNS = [
  /\b(not now|later|più tardi|dopo|non ora|rimanda)\b/i,
  /\b(pas maintenant|plus tard)\b/i,
  /\b(nicht jetzt|später)\b/i,
];

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function isAffirmativeDraftReply(text: string): boolean {
  const normalized = normalize(text);
  if (!normalized || normalized.length > 120) return false;
  if (matchesAny(normalized, NEGATION_PATTERNS)) return false;
  return matchesAny(normalized, AFFIRMATIVE_PATTERNS);
}

export function isDismissiveDraftReply(text: string): boolean {
  const normalized = normalize(text);
  if (!normalized || normalized.length > 120) return false;
  if (matchesAny(normalized, AFFIRMATIVE_PATTERNS)) return false;
  return matchesAny(normalized, DISMISSIVE_PATTERNS);
}
