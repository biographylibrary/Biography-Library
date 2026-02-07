'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileEdit,
  RefreshCw,
  CheckCircle2,
  Lock,
  Unlock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { updateSectionStatus } from '@/lib/section-status-service';
import { cn } from '@/lib/utils';

type SectionStatus = 'in_progress' | 'draft_1' | 'draft_2' | 'draft_3' | 'approved' | 'locked';

interface SectionStatusBarProps {
  biographyId: string;
  sectionKey: string;
  currentStatus: SectionStatus;
  draftVersion: number;
  approvedAt?: string | null;
  onStatusChange: () => void;
  onReviewWithAi?: () => void;
}

export function SectionStatusBar({
  biographyId,
  sectionKey,
  currentStatus,
  draftVersion,
  approvedAt,
  onStatusChange,
  onReviewWithAi,
}: SectionStatusBarProps) {
  const { t, language } = useTranslation();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusConfig = {
    in_progress: {
      icon: FileEdit,
      label: {
        en: 'In Progress',
        it: 'In Corso',
        fr: 'En Cours',
        de: 'In Bearbeitung'
      },
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      emoji: '📝'
    },
    draft_1: {
      icon: RefreshCw,
      label: {
        en: 'Draft 1',
        it: 'Bozza 1',
        fr: 'Brouillon 1',
        de: 'Entwurf 1'
      },
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      emoji: '🔄'
    },
    draft_2: {
      icon: RefreshCw,
      label: {
        en: 'Draft 2',
        it: 'Bozza 2',
        fr: 'Brouillon 2',
        de: 'Entwurf 2'
      },
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      emoji: '🔄'
    },
    draft_3: {
      icon: RefreshCw,
      label: {
        en: 'Draft 3',
        it: 'Bozza 3',
        fr: 'Brouillon 3',
        de: 'Entwurf 3'
      },
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      emoji: '🔄'
    },
    approved: {
      icon: CheckCircle2,
      label: {
        en: 'Approved',
        it: 'Approvato',
        fr: 'Approuvé',
        de: 'Genehmigt'
      },
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      emoji: '✅'
    },
    locked: {
      icon: Lock,
      label: {
        en: 'Published',
        it: 'Pubblicato',
        fr: 'Publié',
        de: 'Veröffentlicht'
      },
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      emoji: '🔒'
    }
  };

  const config = statusConfig[currentStatus];
  const StatusIcon = config.icon;

  const updateStatus = async (newStatus: SectionStatus) => {
    setIsUpdating(true);
    setError(null);

    try {
      const updates: any = {
        status: newStatus,
      };

      if (newStatus === 'approved') {
        updates.approved_at = new Date().toISOString();
      } else if (newStatus === 'draft_2' || newStatus === 'draft_3') {
        updates.draft_version = parseInt(newStatus.split('_')[1]);
      }

      const success = await updateSectionStatus(biographyId, sectionKey, updates);

      if (!success) {
        throw new Error('Failed to update section status');
      }

      onStatusChange();
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('Failed to update status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getActionButton = () => {
    const buttonLabels = {
      markDraft1: {
        en: 'Mark as Draft 1',
        it: 'Segna come Bozza 1',
        fr: 'Marquer comme Brouillon 1',
        de: 'Als Entwurf 1 markieren'
      },
      reviewAI: {
        en: 'Review with AI',
        it: 'Rivedi con AI',
        fr: 'Réviser avec IA',
        de: 'Mit KI überprüfen'
      },
      approve: {
        en: 'Approve',
        it: 'Approva',
        fr: 'Approuver',
        de: 'Genehmigen'
      },
      reviewAgain: {
        en: 'Review Again',
        it: 'Rivedi Ancora',
        fr: 'Réviser à Nouveau',
        de: 'Erneut Überprüfen'
      },
      reopen: {
        en: 'Reopen',
        it: 'Riapri',
        fr: 'Rouvrir',
        de: 'Wieder Öffnen'
      },
      unlock: {
        en: 'Unlock',
        it: 'Sblocca',
        fr: 'Déverrouiller',
        de: 'Entsperren'
      }
    };

    switch (currentStatus) {
      case 'in_progress':
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateStatus('draft_1')}
            disabled={isUpdating}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            {buttonLabels.markDraft1[language as keyof typeof buttonLabels.markDraft1]}
          </Button>
        );

      case 'draft_1':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => updateStatus('approved')}
              disabled={isUpdating}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {buttonLabels.approve[language as keyof typeof buttonLabels.approve]}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReviewWithAi?.()}
              disabled={isUpdating}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {buttonLabels.reviewAI[language as keyof typeof buttonLabels.reviewAI]}
            </Button>
          </div>
        );

      case 'draft_2':
      case 'draft_3':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => updateStatus('approved')}
              disabled={isUpdating}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {buttonLabels.approve[language as keyof typeof buttonLabels.approve]}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReviewWithAi?.()}
              disabled={isUpdating}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {buttonLabels.reviewAgain[language as keyof typeof buttonLabels.reviewAgain]}
            </Button>
          </div>
        );

      case 'approved':
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateStatus('in_progress')}
            disabled={isUpdating}
            className="gap-2"
          >
            <Unlock className="h-4 w-4" />
            {buttonLabels.reopen[language as keyof typeof buttonLabels.reopen]}
          </Button>
        );

      case 'locked':
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateStatus('approved')}
            disabled={isUpdating}
            className="gap-2"
          >
            <Unlock className="h-4 w-4" />
            {buttonLabels.unlock[language as keyof typeof buttonLabels.unlock]}
          </Button>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className={cn("gap-2 px-3 py-1.5", config.color)}>
          <StatusIcon className="h-4 w-4" />
          <span className="font-medium">
            {config.emoji} {config.label[language as keyof typeof config.label]}
          </span>
        </Badge>

        {getActionButton()}
      </div>

      {approvedAt && currentStatus === 'approved' && (
        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-sm text-green-700 dark:text-green-300">
            {language === 'it'
              ? `Approvato il ${new Date(approvedAt).toLocaleDateString('it-IT')}`
              : language === 'fr'
              ? `Approuvé le ${new Date(approvedAt).toLocaleDateString('fr-FR')}`
              : language === 'de'
              ? `Genehmigt am ${new Date(approvedAt).toLocaleDateString('de-DE')}`
              : `Approved on ${new Date(approvedAt).toLocaleDateString('en-US')}`
            }
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
