'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Languages, Loader as Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  editorSidebarDialogContentClass,
  editorSidebarDialogContentStyle,
} from '@/components/editor/EditorSidebarDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TextLanguageField } from '@/components/editor/TextLanguageField';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import { TEXT_LANGUAGE_BASES, textLanguageLabels } from '@/lib/text-languages';
import { availableLanguageBases, occupiedLanguageTags } from '@/lib/edition-languages';
import { originalIsNewerThanEditionAlignment } from '@/lib/edition-drift';
import { cn } from '@/lib/utils';

export type EditionListItem = {
  id: string;
  record_language_tag: string | null;
  status: string;
  original_version_at: string | null;
  title: string | null;
};

type StartChoice = 'copy' | 'blank' | 'import';

interface TranslateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalId: string;
  originalStatus: string;
  originalLanguageTag: string | null;
  originalTitle: string;
  originalRevisedAt: string | null;
  originalPublishedAt: string | null;
}

function statusLabel(
  status: string,
  t: { statusDraft: string; statusPublished: string; statusOther: string }
): string {
  if (status === 'draft') return t.statusDraft;
  if (status === 'published') return t.statusPublished;
  return t.statusOther;
}

function errorMessage(code: string | undefined, t: Record<string, string>): string {
  switch (code) {
    case 'invalid_language':
      return t.errorInvalidLanguage;
    case 'not_found':
      return t.errorNotFound;
    case 'forbidden':
      return t.errorForbidden;
    case 'original_is_edition':
      return t.errorOriginalIsEdition;
    case 'frozen':
      return t.errorFrozen;
    case 'original_not_published':
      return t.errorOriginalNotPublished;
    case 'language_already_present':
      return t.errorLanguageAlreadyPresent;
    default:
      return t.errorGeneric;
  }
}

export function TranslateDialog({
  open,
  onOpenChange,
  originalId,
  originalStatus,
  originalLanguageTag,
  originalRevisedAt,
  originalPublishedAt,
}: TranslateDialogProps) {
  const { t, language } = useTranslation();
  const router = useRouter();
  const copy = t.translate;
  const [editions, setEditions] = useState<EditionListItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [languageTag, setLanguageTag] = useState<string | null>(null);
  const [startChoice, setStartChoice] = useState<StartChoice>('copy');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = originalStatus === 'published';

  const loadEditions = useCallback(async () => {
    setLoadingList(true);
    try {
      const { data } = await supabase
        .from('biographies')
        .select('id, record_language_tag, status, original_version_at, title')
        .eq('translation_of', originalId)
        .order('created_at', { ascending: true });
      setEditions((data as EditionListItem[] | null) ?? []);
    } finally {
      setLoadingList(false);
    }
  }, [originalId]);

  useEffect(() => {
    if (open) {
      setError(null);
      setStartChoice('copy');
      void loadEditions();
    }
  }, [open, loadEditions]);

  const availableBases = useMemo(() => {
    const occupied = occupiedLanguageTags({
      originalTag: originalLanguageTag,
      editionTags: editions.map((e) => e.record_language_tag),
    });
    return availableLanguageBases(TEXT_LANGUAGE_BASES, occupied);
  }, [originalLanguageTag, editions]);

  useEffect(() => {
    if (!languageTag || !availableBases.includes(languageTag.split('-')[0] ?? '')) {
      setLanguageTag(availableBases[0] ?? null);
    }
  }, [availableBases, languageTag]);

  const handleCreate = useCallback(async () => {
    if (!languageTag || !canCreate) return;
    setCreating(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError(copy.errorGeneric);
        return;
      }
      const startFrom = startChoice === 'copy' ? 'copy' : 'blank';
      const res = await fetch('/api/biography/create-edition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ originalId, languageTag, startFrom }),
      });
      const payload = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !payload.id) {
        setError(errorMessage(payload.error, copy as unknown as Record<string, string>));
        return;
      }
      onOpenChange(false);
      const qs = startChoice === 'import' ? '?import=1' : '';
      router.push(`/biography/${payload.id}/edit${qs}`);
    } catch {
      setError(copy.errorGeneric);
    } finally {
      setCreating(false);
    }
  }, [languageTag, canCreate, startChoice, originalId, copy, onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={editorSidebarDialogContentClass}
        style={editorSidebarDialogContentStyle}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Languages className="h-5 w-5 text-primary" />
            {copy.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <p className="text-sm leading-relaxed text-foreground">{copy.instructions}</p>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">{copy.existingTitle}</h3>
            {loadingList ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.common.loading}
              </div>
            ) : editions.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-2">
                {editions.map((edition) => {
                  const tag = edition.record_language_tag ?? '';
                  const name = tag ? textLanguageLabels(tag, language).inUi : tag;
                  const drifted = originalIsNewerThanEditionAlignment({
                    originalVersionAt: edition.original_version_at,
                    originalRevisedAt,
                    originalPublishedAt,
                  });
                  return (
                    <li
                      key={edition.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{name}</span>
                      <span className="text-muted-foreground">{statusLabel(edition.status, copy)}</span>
                      {drifted && (
                        <span className="text-brand-mustardDark text-xs">{copy.originalRevised}</span>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-auto"
                        onClick={() => {
                          onOpenChange(false);
                          router.push(`/biography/${edition.id}/edit`);
                        }}
                      >
                        {copy.open}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {!canCreate ? (
            <Alert className="bg-brand-mustardLight/40 border-brand-mustardDark/40">
              <AlertDescription>{copy.notPublishedHint}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{copy.languageLabel}</Label>
                <TextLanguageField
                  value={languageTag}
                  onChange={setLanguageTag}
                  disabled={availableBases.length === 0}
                  allowedBases={availableBases}
                />
              </div>
              <fieldset className="space-y-2">
                {(
                  [
                    ['copy', copy.startCopy],
                    ['blank', copy.startBlank],
                    ['import', copy.startImport],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={cn(
                      'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer',
                      startChoice === value ? 'border-primary bg-primary/5' : 'border-border/60'
                    )}
                  >
                    <input
                      type="radio"
                      name="startFrom"
                      className="mt-1"
                      checked={startChoice === value}
                      onChange={() => setStartChoice(value)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/50 shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={!canCreate || !languageTag || creating || availableBases.length === 0}
            onClick={() => void handleCreate()}
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {copy.creating}
              </>
            ) : (
              copy.create
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
