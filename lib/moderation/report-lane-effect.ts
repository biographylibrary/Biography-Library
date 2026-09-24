import { reportLane, type ReportType } from '@/lib/moderation/types';

export type LaneEffect =
  | { kind: 'none' }
  | { kind: 'suspend' }
  | { kind: 'remove' };

/** What a new report does to a biography that is already public. */
export function laneEffect(type: ReportType, status: string): LaneEffect {
  if (status !== 'published') return { kind: 'none' };
  const lane = reportLane(type);
  if (lane === 'immediate') return { kind: 'suspend' };
  if (lane === 'level1') return { kind: 'remove' };
  return { kind: 'none' };
}

const SUSPEND: Record<string, string> = {
  it: 'Segnalazione in corsia immediata. La scheda non è più pubblica. L’autore ha 14 giorni per inviare un certificato di morte o un documento equivalente.',
  en: 'Immediate-lane report. The biography is no longer public. The author has 14 days to send a death certificate or equivalent document.',
  fr: 'Signalement en voie immédiate. La fiche n’est plus publique. L’auteur a 14 jours pour envoyer un certificat de décès ou un document équivalent.',
  de: 'Meldung auf der sofortigen Spur. Die Biografie ist nicht mehr öffentlich. Die Autorin oder der Autor hat 14 Tage Zeit, eine Sterbeurkunde oder ein gleichwertiges Dokument zu senden.',
};

const REMOVE: Record<string, string> = {
  it: 'Segnalazione di livello 1 su scheda già pubblica. La scheda è stata rimossa, senza sospensione in verifica.',
  en: 'Level 1 report on an already public biography. The biography was removed, without a verification suspension.',
  fr: 'Signalement de niveau 1 sur une fiche déjà publique. La fiche a été retirée, sans suspension pour vérification.',
  de: 'Meldung der Stufe 1 zu einer bereits öffentlichen Biografie. Die Biografie wurde entfernt, ohne Aussetzung zur Prüfung.',
};

const ORDINARY: Record<string, string> = {
  it: 'Segnalazione in corsia ordinaria. La scheda resta pubblica finché un revisore non decide.',
  en: 'Ordinary-lane report. The biography stays public until a reviewer decides.',
  fr: 'Signalement en voie ordinaire. La fiche reste publique jusqu’à la décision d’un réviseur.',
  de: 'Meldung auf der ordentlichen Spur. Die Biografie bleibt öffentlich, bis eine Prüferin oder ein Prüfer entscheidet.',
};

export function laneRegisterMessage(lang: string, effect: LaneEffect): string {
  const key = ['it', 'en', 'fr', 'de'].includes(lang) ? lang : 'en';
  if (effect.kind === 'suspend') return SUSPEND[key];
  if (effect.kind === 'remove') return REMOVE[key];
  return ORDINARY[key];
}
