'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, X } from 'lucide-react';
import type { PlaceSelection } from '@/lib/person-events';
import type { PlaceSearchHit } from '@/lib/places';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface PlaceSearchFieldProps {
  query: string;
  selected: PlaceSelection | null;
  onQueryChange: (q: string) => void;
  onSelect: (place: PlaceSelection | null) => void;
  label: string;
  placeholder: string;
  hint: string;
  clearLabel: string;
  lang: string;
  disabled?: boolean;
}

export function PlaceSearchField({
  query,
  selected,
  onQueryChange,
  onSelect,
  label,
  placeholder,
  hint,
  clearLabel,
  lang,
  disabled = false,
}: PlaceSearchFieldProps) {
  const [hits, setHits] = useState<PlaceSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setHits([]);
        return;
      }
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          setHits([]);
          return;
        }
        const res = await fetch(
          `/api/places/search?q=${encodeURIComponent(q.trim())}&lang=${encodeURIComponent(lang)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = (await res.json()) as { results?: PlaceSearchHit[] };
        setHits(data.results ?? []);
        setOpen(true);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    },
    [lang]
  );

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void runSearch(query);
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, runSearch]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="space-y-1.5" ref={wrapRef}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            if (selected) onSelect(null);
          }}
          onFocus={() => hits.length > 0 && setOpen(true)}
          disabled={disabled}
          className="h-9 pl-8 pr-8"
          placeholder={placeholder}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
        {!loading && (selected || query) && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 h-8 w-8"
            aria-label={clearLabel}
            onClick={() => {
              onQueryChange('');
              onSelect(null);
              setHits([]);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
        {open && hits.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-auto text-sm">
            {hits.map((hit, i) => (
              <li key={`${hit.geonamesId ?? hit.displayName}-${i}`}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted/80"
                  onClick={() => {
                    onSelect({
                      nameAsGiven: hit.name,
                      nameCurrent: hit.displayName,
                      lat: hit.lat,
                      lon: hit.lon,
                      geonamesId: hit.geonamesId,
                      wikidataQid: hit.wikidataQid,
                    });
                    onQueryChange(hit.displayName);
                    setOpen(false);
                  }}
                >
                  {hit.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>
    </div>
  );
}
