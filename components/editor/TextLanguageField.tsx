'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useTranslation } from '@/lib/i18n/i18n-context';
import {
  TEXT_LANGUAGE_BASES,
  canonicalizeTextLanguage,
  textLanguageLabels,
} from '@/lib/text-languages';
import { cn } from '@/lib/utils';

const UI_LANGUAGES = ['en', 'it', 'fr', 'de'] as const;

interface TextLanguageFieldProps {
  value: string | null;
  disabled?: boolean;
  onChange: (tag: string) => void;
  /** Se impostato, solo queste basi compaiono nell'elenco. */
  allowedBases?: readonly string[];
}

export function TextLanguageField({
  value,
  disabled,
  onChange,
  allowedBases,
}: TextLanguageFieldProps) {
  const { t, language } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [regionDraft, setRegionDraft] = useState<string | null>(null);
  const bases = allowedBases ?? TEXT_LANGUAGE_BASES;
  const canonical = canonicalizeTextLanguage(value) ?? bases[0] ?? 'en';
  const base = canonical.split('-')[0] ?? canonical;
  const region = canonical.includes('-') ? canonical.split('-')[1] ?? '' : '';
  const regionValue = regionDraft ?? region;
  const labels = textLanguageLabels(canonical, language);
  const copy = t.textLanguage;

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const ranked = bases.map((code) => {
      const names = textLanguageLabels(code, language);
      return { code, ...names };
    });
    if (!q) return ranked.slice(0, 40);
    return ranked
      .filter((row) => {
        const blob = `${row.code} ${row.own} ${row.inUi} ${UI_LANGUAGES.map((ui) => textLanguageLabels(row.code, ui).inUi).join(' ')}`.toLowerCase();
        return blob.includes(q) || row.code.startsWith(q);
      })
      .slice(0, 40);
  }, [language, query, bases]);

  const apply = (nextBase: string, nextRegion: string) => {
    const composed = nextRegion.trim()
      ? canonicalizeTextLanguage(`${nextBase}-${nextRegion.trim()}`)
      : canonicalizeTextLanguage(nextBase);
    if (composed) onChange(composed);
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{copy.label}</p>
        <p className="text-xs text-muted-foreground">{copy.hint}</p>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-between font-normal"
            aria-label={copy.label}
          >
            <span className="truncate text-left">
              {labels.inUi} — {labels.own} ({canonical})
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={copy.searchPlaceholder}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>{copy.noResults}</CommandEmpty>
              <CommandGroup>
                {options.map((row) => (
                  <CommandItem
                    key={row.code}
                    value={row.code}
                    onSelect={() => {
                      apply(row.code, region);
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', row.code === base ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate">
                      {row.inUi} — {row.own} ({row.code})
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="text-language-region">
          {copy.regionLabel}
        </label>
        <Input
          id="text-language-region"
          value={regionValue}
          disabled={disabled}
          maxLength={8}
          placeholder="BR"
          onChange={(event) => {
            const next = event.target.value.toUpperCase();
            setRegionDraft(next);
            if (next === '' || /^[A-Z]{2}$/.test(next)) {
              apply(base, next);
              if (next === '' || canonicalizeTextLanguage(`${base}-${next}`)) setRegionDraft(null);
            }
          }}
          onBlur={() => setRegionDraft(null)}
          className="h-8 max-w-[8rem]"
        />
        <p className="text-xs text-muted-foreground">{copy.regionHint}</p>
      </div>
    </div>
  );
}
