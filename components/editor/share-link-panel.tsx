'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, Copy, Check } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';

interface ShareLinkPanelProps {
  biographyId: string;
  privacy: 'private' | 'family' | 'public';
  currentShareToken: string | null;
  onTokenGenerated: (token: string) => void;
}

export function ShareLinkPanel({
  biographyId,
  privacy,
  currentShareToken,
  onTokenGenerated,
}: ShareLinkPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  if (privacy === 'private') {
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

  const shareUrl = currentShareToken
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

  return (
    <div className="px-4 sm:px-6 py-4 border-b border-border/30 bg-muted/20">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">{t.biography.shareLink}</h3>
      </div>

      {!currentShareToken ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t.share.shareDescription}
          </p>
          <Button
            size="sm"
            onClick={generateShareLink}
            disabled={isGenerating}
            className="w-full sm:w-auto"
          >
            {isGenerating ? t.share.generating : t.share.generateLink}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {privacy === 'public'
              ? t.share.publicViewDescription
              : t.share.familyViewDescription}
          </p>
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
        </div>
      )}
    </div>
  );
}
