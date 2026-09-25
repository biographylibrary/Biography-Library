'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Copy, Check } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';

interface ShareLinkPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  biographyId: string;
  visibility: 'private' | 'link-only' | 'public';
  currentShareToken: string | null;
  onTokenGenerated: (token: string) => void;
}

export function ShareLinkPanel({
  open,
  onOpenChange,
  biographyId,
  visibility,
  currentShareToken,
  onTokenGenerated,
}: ShareLinkPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  if (visibility === 'private') {
    return null;
  }

  const generateShareLink = async () => {
    setIsGenerating(true);
    try {
      const token = crypto.randomUUID();
      const { error } = await supabase
        .from('biographies')
        .update({ share_token: token })
        .eq('id', biographyId);

      if (!error) {
        onTokenGenerated(token);
      }
    } catch (err) {
      console.error('Error generating share link:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const shareUrl =
    currentShareToken && typeof window !== 'undefined'
      ? `${window.location.origin}/biography/${biographyId}/view?token=${currentShareToken}`
      : '';

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const description =
    visibility === 'public' ? t.share.publicViewDescription : t.share.familyViewDescription;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.biography.shareLink}</DialogTitle>
          <DialogDescription>
            {currentShareToken ? description : t.share.shareDescription}
          </DialogDescription>
        </DialogHeader>

        {!currentShareToken ? (
          <Button
            size="sm"
            onClick={generateShareLink}
            disabled={isGenerating}
            className="w-full sm:w-auto"
          >
            {isGenerating ? t.share.generating : t.share.generateLink}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Input
              value={shareUrl}
              readOnly
              className="text-sm"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={copyToClipboard}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  {t.share.copied}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  {t.share.copy}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
