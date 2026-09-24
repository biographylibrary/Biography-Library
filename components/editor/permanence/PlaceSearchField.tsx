'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [box, setBox] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
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
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const placeBox = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 12;
    setBox({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(120, Math.min(192, below)),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    placeBox();
    const onMove = () => placeBox();
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open, hits.length, placeBox]);

  return (
    <div className="space-y-1.5" ref={wrapRef}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
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
        {open && hits.length > 0 && box && typeof document !== 'undefined' &&
          createPortal(
            <ul
              ref={listRef}
              className="fixed z-[80] rounded-md border bg-popover shadow-md overflow-auto text-sm"
              style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }}
            >
              {hits.map((hit, i) => (
                <li key={`${hit.geonamesId ?? hit.displayName}-${i}`}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted/80"
                    onMouseDown={(e) => e.preventDefault()}
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
            </ul>,
            document.body
          )}
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>
    </div>
  );
}
