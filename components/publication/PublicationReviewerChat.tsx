'use client';

import { AgentChat } from '@/components/agents/AgentChat';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface PublicationReviewerChatProps {
  biographyId: string;
  className?: string;
}

export function PublicationReviewerChat({ biographyId, className }: PublicationReviewerChatProps) {
  const { language } = useTranslation();

  const emptyState =
    language === 'it'
      ? 'Chiedi se il testo è pronto per la pubblicazione, cosa significa uno screening o come rispondere a una segnalazione.'
      : language === 'fr'
        ? 'Demandez si votre texte est prêt à publier, ce qu’implique un contrôle ou comment répondre à un signalement.'
        : language === 'de'
          ? 'Fragen Sie, ob Ihr Text veröffentlichungsreif ist, was ein Screening bedeutet oder wie Sie auf eine Meldung reagieren.'
          : 'Ask whether your text is ready to publish, what screening means, or how to address a flag.';

  return (
    <AgentChat
      agentType="publication_reviewer"
      biographyId={biographyId}
      className={className}
      emptyState={emptyState}
      loadHistory
    />
  );
}
