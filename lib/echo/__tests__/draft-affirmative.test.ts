import { describe, expect, it } from 'vitest';
import { isAffirmativeDraftReply, isDismissiveDraftReply } from '@/lib/echo/draft-affirmative';

describe('risposta affermativa a una proposta di Echo', () => {
  const yes = ['sì', 'Sì', 'sì!', 'sì grazie', 'sì, inserisci', 'si', 'ok', 'certo', 'va bene', 'procedi', 'inserisci pure',
    'yes', 'sure', 'go ahead', 'oui', "d'accord", 'insère', 'ja', 'einfügen', 'bestätigen', 'hinzufügen'];
  for (const text of yes) it(`«${text}» conferma`, () => expect(isAffirmativeDraftReply(text)).toBe(true));

  const no = ['no', 'non ora', 'non mi piace', 'più tardi', 'nein', 'pas maintenant', 'forse', 'cambia la prima frase'];
  for (const text of no) it(`«${text}» non conferma`, () => expect(isAffirmativeDraftReply(text)).toBe(false));

  it('«più tardi» rimanda', () => {
    expect(isDismissiveDraftReply('più tardi')).toBe(true);
    expect(isDismissiveDraftReply('später')).toBe(true);
    expect(isDismissiveDraftReply('sì')).toBe(false);
  });
});
