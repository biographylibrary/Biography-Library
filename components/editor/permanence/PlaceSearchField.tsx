'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, X } from 'lucide-react';
import type { PlaceSelection } from '@/lib/person-events';
import { dedupePlaceHits, shouldSearchPlace, type PlaceSearchHit } from '@/lib/places';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface PlaceSearchFieldProps {
  query: string;
  selected: PlaceSelection | null;
  /**
   * L'autore scrive (o svuota) il campo. Chi riceve questa chiamata azzera anche il luogo già
   * scelto: il campo non chiama mai due funzioni per lo stesso gesto, perché due modifiche di
   * seguito sullo stesso stato si cancellano a vicenda.
   */
  onQueryChange: (q: string) => void;
  /** L'autore sceglie un luogo dall'elenco: chi riceve la chiamata aggiorna anche il testo del campo. */
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
  /** Vero solo dopo che l'autore ha scritto nel campo: un valore caricato non fa partire ricerche. */
  const userTyped = useRef(false);
  const hasSelection = Boolean(selected);

  const runSearch = useCallback(
    async (q: string) => {
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
        setHits(dedupePlaceHits(data.results ?? []));
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
    if (!shouldSearchPlace(query, hasSelection, userTyped.current)) {
      setHits((prev) => (prev.length ? [] : prev));
      setOpen(false);
      return;
    }
    timer.current = setTimeout(() => {
      void runSearch(query);
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, hasSelection, runSearch]);

  // Un clic fuori dal campo chiude l'elenco.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
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
            userTyped.current = true;
            onQueryChange(e.target.value);
          }}
          onFocus={() => hits.length > 0 && !hasSelection && setOpen(true)}
          disabled={disabled}
          className="h-9 pl-8 pr-8"
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && hits.length > 0}
          aria-autocomplete="list"
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
              userTyped.current = false;
              onQueryChange('');
              setHits([]);
              setOpen(false);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/*
        L'elenco sta nel flusso della pagina, sotto il campo, e non in un contenitore fuori dalla
        finestra: dentro una finestra modale i clic fuori dal suo contenuto vengono ignorati, e
        l'elenco in un portale sul body si vedeva ma non si poteva scegliere.
      */}
      {open && hits.length > 0 && (
        <ul
          role="listbox"
          className="max-h-48 overflow-auto rounded-md border bg-popover text-sm shadow-sm"
        >
          {hits.map((hit, i) => (
            <li key={`${hit.geonamesId ?? hit.displayName}-${i}`} role="option" aria-selected={false}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-muted/80 focus:bg-muted/80 focus:outline-none"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  userTyped.current = false;
                  setHits([]);
                  setOpen(false);
                  onSelect({
                    nameAsGiven: hit.name,
                    nameCurrent: hit.displayName,
                    lat: hit.lat,
                    lon: hit.lon,
                    geonamesId: hit.geonamesId,
                    wikidataQid: hit.wikidataQid,
                  });
                }}
              >
                {hit.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>
    </div>
  );
}
