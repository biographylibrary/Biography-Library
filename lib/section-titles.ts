const SECTION_TRANSLATIONS = {
  en: {
    'childhood': 'Childhood & Early Years',
    'family': 'Family Background',
    'education': 'Education',
    'career': 'Career & Work',
    'life-events': 'Important Life Events',
    'relationships': 'Relationships & Love',
    'challenges': 'Challenges & Lessons Learned',
    'passions': 'Passions & Hobbies',
    'legacy': 'Legacy & Final Thoughts',
  },
  it: {
    'childhood': 'Infanzia e Primi Anni',
    'family': 'Famiglia e Origini',
    'education': 'Educazione',
    'career': 'Carriera e Lavoro',
    'life-events': 'Eventi Importanti',
    'relationships': 'Relazioni e Amore',
    'challenges': 'Sfide e Lezioni',
    'passions': 'Passioni e Hobby',
    'legacy': 'Eredità e Riflessioni',
  },
  fr: {
    'childhood': 'Enfance et Premières Années',
    'family': 'Famille et Origines',
    'education': 'Éducation',
    'career': 'Carrière et Travail',
    'life-events': 'Événements Importants',
    'relationships': 'Relations et Amour',
    'challenges': 'Défis et Leçons',
    'passions': 'Passions et Hobbies',
    'legacy': 'Héritage et Réflexions',
  },
  de: {
    'childhood': 'Kindheit und Frühe Jahre',
    'family': 'Familie und Herkunft',
    'education': 'Bildung',
    'career': 'Karriere und Arbeit',
    'life-events': 'Wichtige Ereignisse',
    'relationships': 'Beziehungen und Liebe',
    'challenges': 'Herausforderungen und Lektionen',
    'passions': 'Leidenschaften und Hobbys',
    'legacy': 'Vermächtnis und Gedanken',
  },
};

export function getSectionTitle(sectionKey: string, language: string): string {
  const translations = SECTION_TRANSLATIONS[language as keyof typeof SECTION_TRANSLATIONS] || SECTION_TRANSLATIONS.en;
  return translations[sectionKey as keyof typeof translations] || sectionKey;
}
