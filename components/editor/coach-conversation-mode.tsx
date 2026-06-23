'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AgentChat } from '@/components/agents/AgentChat';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';

interface CoachConversationModeProps {
  biographyId: string;
  sectionKey: string;
  onBackToEditor: () => void;
  onDraftApplied: (sectionKey: string) => void;
}

export function CoachConversationMode({
  biographyId,
  sectionKey,
  onBackToEditor,
  onDraftApplied,
}: CoachConversationModeProps) {
  const { t, language } = useTranslation();
  const section = BIOGRAPHY_SECTIONS.find((s) => s.key === sectionKey);
  const sectionTitle =
    t.sectionTitles[sectionKey as keyof typeof t.sectionTitles] || section?.title || sectionKey;

  const emptyState =
    language === 'it'
      ? `Condividi ricordi su «${sectionTitle}». Ti farò domande per aiutarti a scrivere — quando vuoi, chiedimi di aggiungere una bozza nell'editor.`
      : language === 'fr'
        ? `Partagez vos souvenirs sur « ${sectionTitle} ». Je vous poserai des questions — demandez-moi d'ajouter un brouillon dans l'éditeur quand vous le souhaitez.`
        : language === 'de'
          ? `Teilen Sie Erinnerungen zu «${sectionTitle}». Ich stelle Fragen — bitten Sie mich, einen Entwurf in den Editor einzufügen, wenn Sie bereit sind.`
          : `Share memories about "${sectionTitle}". I'll ask questions to help you write — ask me to add a draft to the editor when you're ready.`;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 border-b px-3 py-2 shrink-0">
        <Button type="button" variant="ghost" size="sm" onClick={onBackToEditor}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t.conversation.backToEditor}
        </Button>
        <span className="text-sm text-muted-foreground truncate">{sectionTitle}</span>
      </div>
      <AgentChat
        className="flex-1 min-h-0"
        agentType="biography_coach"
        biographyId={biographyId}
        activeSection={sectionKey}
        sectionTitle={sectionTitle}
        emptyState={emptyState}
        loadHistory
        fallbackToCoachEdge
        onDraftApplied={onDraftApplied}
      />
    </div>
  );
}
