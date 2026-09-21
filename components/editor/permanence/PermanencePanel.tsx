'use client';

import { useCallback, useEffect, useState } from 'react';
import { Landmark, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { nfcNullable, nfcTrim } from '@/lib/nfc';
import {
  buildEventRow,
  emptyEventForm,
  rowToForm,
  type EventFormState,
  type UiLang,
} from '@/lib/person-events';
import {
  buildRelationRow,
  emptyRelationForm,
  relationHasData,
  relationRowToForm,
  RELATION_CODE_LABELS,
  type RelationCode,
  type RelationFormState,
} from '@/lib/person-relations';
import { EdtfDateFields } from './EdtfDateFields';
import { PlaceSearchField } from './PlaceSearchField';
import { ProvenanceFields } from './ProvenanceFields';
import { toast } from 'sonner';

interface PermanencePanelProps {
  biographyId: string;
  nameAsWritten: string;
  recordLanguageTag: string | null;
  recordScript: string | null;
  /** Death is only for memorials. Autobiographies never show or save it. */
  showDeath?: boolean;
  /** First person: the author is writing about themselves. */
  isAutobiography?: boolean;
  hideTitle?: boolean;
  disabled?: boolean;
  onNameSaved?: (name: string) => void;
}

function toUiLang(tag: string | null | undefined): UiLang {
  const base = (tag ?? 'en').split('-')[0]?.toLowerCase();
  if (base === 'it' || base === 'fr' || base === 'de') return base;
  return 'en';
}

function EventBlock({
  title,
  form,
  onChange,
  lang,
  disabled,
  t,
  placeLabel,
  showAsGiven = true,
  showProvenance = true,
}: {
  title: string;
  form: EventFormState;
  onChange: (next: EventFormState) => void;
  lang: string;
  disabled: boolean;
  t: ReturnType<typeof useTranslation>['t'];
  placeLabel: string;
  showAsGiven?: boolean;
  showProvenance?: boolean;
}) {
  const p = t.permanence;
  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-3 bg-background/50">
      <h4 className="text-sm font-medium">{title}</h4>
      <EdtfDateFields
        value={form.date}
        asGivenFree={form.dateAsGivenFree}
        onChange={(date) => onChange({ ...form, date })}
        onAsGivenChange={(dateAsGivenFree) => onChange({ ...form, dateAsGivenFree })}
        disabled={disabled}
        labels={{
          precision: p.datePrecision,
          unknown: p.dateUnknown,
          day: p.dateExactDay,
          month: p.dateMonthYear,
          year: p.dateYearOnly,
          approx: p.dateApprox,
          decade: p.dateDecade,
          yearLabel: p.year,
          monthLabel: p.month,
          dayLabel: p.day,
          asGivenLabel: p.dateAsGiven,
          asGivenHint: p.dateAsGivenHint,
        }}
        showAsGiven={showAsGiven}
      />
      <PlaceSearchField
        query={form.placeQuery}
        selected={form.place}
        onQueryChange={(placeQuery) => onChange({ ...form, placeQuery })}
        onSelect={(place) =>
          onChange({
            ...form,
            place,
            placeQuery: place?.nameCurrent || place?.nameAsGiven || form.placeQuery,
          })
        }
        label={placeLabel}
        placeholder={p.placePlaceholder}
        hint={p.placeHint}
        clearLabel={p.clear}
        lang={lang}
        disabled={disabled}
      />
      {showProvenance && (
      <ProvenanceFields
        assertedBy={form.assertedBy}
        sourceNote={form.sourceNote}
        confidence={form.confidence}
        onAssertedBy={(assertedBy) => onChange({ ...form, assertedBy })}
        onSourceNote={(sourceNote) => onChange({ ...form, sourceNote })}
        onConfidence={(confidence) => onChange({ ...form, confidence })}
        disabled={disabled}
        labels={{
          howDoYouKnow: p.howDoYouKnow,
          self: p.assertedSelf,
          family: p.assertedFamily,
          document: p.assertedDocument,
          institution: p.assertedInstitution,
          unknown: p.assertedUnknown,
          sourceNote: p.sourceNote,
          sourceNoteHint: p.sourceNoteHint,
          confidence: p.confidence,
          certain: p.confidenceCertain,
          probable: p.confidenceProbable,
          uncertain: p.confidenceUncertain,
          confidenceUnknown: p.confidenceUnknown,
        }}
      />
      )}
    </div>
  );
}

function residenceHasPlace(form: EventFormState): boolean {
  return Boolean(
    form.place?.nameAsGiven?.trim() ||
      form.place?.nameCurrent?.trim() ||
      form.placeQuery.trim()
  );
}

function asSelf(form: EventFormState, autobiography: boolean): EventFormState {
  return autobiography ? { ...form, assertedBy: 'self' } : form;
}

function RelationBlock({
  form,
  onChange,
  onRemove,
  disabled,
  t,
  recordLang,
  showProvenance = true,
}: {
  form: RelationFormState;
  onChange: (next: RelationFormState) => void;
  onRemove: () => void;
  disabled: boolean;
  t: ReturnType<typeof useTranslation>['t'];
  recordLang: UiLang;
  showProvenance?: boolean;
}) {
  const p = t.permanence;
  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-3 bg-background/50">
      <div className="flex items-center justify-between gap-2">
        <div className="grid sm:grid-cols-2 gap-3 flex-1 min-w-0">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{p.relationKind}</Label>
            <Select
              value={form.relationCode}
              onValueChange={(v) => {
                const code = v as RelationCode;
                onChange({
                  ...form,
                  relationCode: code,
                  relationLabel: RELATION_CODE_LABELS[code][recordLang],
                });
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parent">{p.relationParent}</SelectItem>
                <SelectItem value="child">{p.relationChild}</SelectItem>
                <SelectItem value="sibling">{p.relationSibling}</SelectItem>
                <SelectItem value="spouse">{p.relationSpouse}</SelectItem>
                <SelectItem value="other">{p.relationOther}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{p.relationLabel}</Label>
            <Input
              value={form.relationLabel}
              onChange={(e) => onChange({ ...form, relationLabel: e.target.value })}
              disabled={disabled}
              className="h-9"
              placeholder={p.relationLabelHint}
            />
          </div>
        </div>
        {!disabled && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="shrink-0"
            onClick={onRemove}
            aria-label={p.removeRelation}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{p.relatedName}</Label>
          <Input
            value={form.relatedName}
            onChange={(e) => onChange({ ...form, relatedName: e.target.value })}
            disabled={disabled}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{p.relatedUmId}</Label>
          <Input
            value={form.relatedUmId}
            onChange={(e) => onChange({ ...form, relatedUmId: e.target.value })}
            disabled={disabled}
            className="h-9 font-mono text-xs"
          />
        </div>
      </div>
      {showProvenance && (
      <ProvenanceFields
        assertedBy={form.assertedBy}
        sourceNote={form.sourceNote}
        confidence={form.confidence}
        onAssertedBy={(assertedBy) => onChange({ ...form, assertedBy })}
        onSourceNote={(sourceNote) => onChange({ ...form, sourceNote })}
        onConfidence={(confidence) => onChange({ ...form, confidence })}
        disabled={disabled}
        labels={{
          howDoYouKnow: p.howDoYouKnow,
          self: p.assertedSelf,
          family: p.assertedFamily,
          document: p.assertedDocument,
          institution: p.assertedInstitution,
          unknown: p.assertedUnknown,
          sourceNote: p.sourceNote,
          sourceNoteHint: p.sourceNoteHint,
          confidence: p.confidence,
          certain: p.confidenceCertain,
          probable: p.confidenceProbable,
          uncertain: p.confidenceUncertain,
          confidenceUnknown: p.confidenceUnknown,
        }}
      />
      )}
    </div>
  );
}

export function PermanencePanel({
  biographyId,
  nameAsWritten,
  recordLanguageTag,
  recordScript,
  showDeath = false,
  isAutobiography = false,
  hideTitle = false,
  disabled = false,
  onNameSaved,
}: PermanencePanelProps) {
  const { t, language } = useTranslation();
  const p = t.permanence;
  const recordLang = toUiLang(recordLanguageTag || language);

  const [name, setName] = useState(nameAsWritten);
  const [romanized, setRomanized] = useState('');
  const [romanizationSystem, setRomanizationSystem] = useState('');
  const [birth, setBirth] = useState<EventFormState>(emptyEventForm);
  const [death, setDeath] = useState<EventFormState>(emptyEventForm);
  const [places, setPlaces] = useState<EventFormState[]>([]);
  const [deletedPlaceIds, setDeletedPlaceIds] = useState<string[]>([]);
  const [relations, setRelations] = useState<RelationFormState[]>([]);
  const [deletedRelationIds, setDeletedRelationIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const showRomanization = Boolean(recordScript && recordScript !== 'Latn');

  useEffect(() => {
    setName(nameAsWritten);
  }, [nameAsWritten]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: bio }, { data: events }, { data: relRows }] = await Promise.all([
        supabase
          .from('biographies')
          .select('name_as_written, name_romanized, romanization_system, record_script')
          .eq('id', biographyId)
          .maybeSingle(),
        supabase
          .from('person_events')
          .select('*')
          .eq('biography_id', biographyId)
          .in('event_type', ['birth', 'death', 'residence']),
        supabase.from('person_relations').select('*').eq('biography_id', biographyId),
      ]);
      if (cancelled) return;
      if (bio) {
        if (typeof bio.name_as_written === 'string' && bio.name_as_written.trim()) {
          setName(bio.name_as_written);
        }
        setRomanized(typeof bio.name_romanized === 'string' ? bio.name_romanized : '');
        setRomanizationSystem(
          typeof bio.romanization_system === 'string' ? bio.romanization_system : ''
        );
      }
      const birthRow = (events ?? []).find((e) => e.event_type === 'birth');
      const deathRow = (events ?? []).find((e) => e.event_type === 'death');
      const residenceRows = (events ?? [])
        .filter((e) => e.event_type === 'residence')
        .sort((a, b) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));
      setBirth(birthRow ? rowToForm(birthRow) : emptyEventForm());
      setDeath(deathRow ? rowToForm(deathRow) : emptyEventForm());
      setPlaces(residenceRows.map((row) => rowToForm(row)));
      setDeletedPlaceIds([]);
      setRelations((relRows ?? []).map((r) => relationRowToForm(r)));
      setDeletedRelationIds([]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [biographyId]);

  const handleSave = useCallback(async () => {
    if (disabled) return;
    setSaving(true);
    try {
      const nameNfc = nfcTrim(name);
      if (!nameNfc) {
        toast.error(p.nameRequired);
        return;
      }

      const { error: bioError } = await supabase
        .from('biographies')
        .update({
          name_as_written: nameNfc,
          name_romanized: showRomanization ? nfcNullable(romanized) : null,
          romanization_system: showRomanization ? nfcNullable(romanizationSystem) : null,
        })
        .eq('id', biographyId);
      if (bioError) {
        toast.error(bioError.message || t.toast.error);
        return;
      }

      const upsertOne = async (type: 'birth' | 'death', form: EventFormState) => {
        const row = buildEventRow({
          biographyId,
          type,
          form: asSelf(form, isAutobiography),
          recordLang,
          existingId: form.id,
        });
        const { id: _rowId, ...fields } = row;

        if (form.id) {
          const { error } = await supabase
            .from('person_events')
            .update(fields)
            .eq('id', form.id)
            .eq('biography_id', biographyId);
          if (error) throw error;
          return form.id;
        }

        const hasData =
          fields.date_edtf ||
          fields.date_as_given ||
          fields.place_name_as_given ||
          (!isAutobiography && fields.asserted_by && fields.asserted_by !== 'unknown') ||
          fields.source_note;
        if (!hasData) return null;

        const { data, error } = await supabase
          .from('person_events')
          .insert(fields)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        return data?.id ?? null;
      };

      const birthId = await upsertOne('birth', birth);
      if (birthId && !birth.id) setBirth((b) => ({ ...b, id: birthId }));
      if (showDeath) {
        const deathId = await upsertOne('death', death);
        if (deathId && !death.id) setDeath((d) => ({ ...d, id: deathId }));
      }

      if (deletedPlaceIds.length > 0) {
        const { error } = await supabase
          .from('person_events')
          .delete()
          .in('id', deletedPlaceIds)
          .eq('biography_id', biographyId);
        if (error) throw error;
        setDeletedPlaceIds([]);
      }

      const nextPlaces = [...places];
      let placeSequence = 10;
      for (let i = 0; i < nextPlaces.length; i++) {
        const form = nextPlaces[i];
        if (!residenceHasPlace(form) && !form.id) continue;
        if (!residenceHasPlace(form) && form.id) {
          const { error } = await supabase
            .from('person_events')
            .delete()
            .eq('id', form.id)
            .eq('biography_id', biographyId);
          if (error) throw error;
          nextPlaces[i] = { ...form, id: null };
          continue;
        }
        const row = buildEventRow({
          biographyId,
          type: 'residence',
          form: asSelf(form, isAutobiography),
          recordLang,
          existingId: form.id,
          sequence: placeSequence,
        });
        placeSequence += 1;
        const { id: _placeId, ...fields } = row;
        if (form.id) {
          const { error } = await supabase
            .from('person_events')
            .update(fields)
            .eq('id', form.id)
            .eq('biography_id', biographyId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('person_events')
            .insert(fields)
            .select('id')
            .maybeSingle();
          if (error) throw error;
          if (data?.id) nextPlaces[i] = { ...form, id: data.id };
        }
      }
      setPlaces(nextPlaces.filter((place) => place.id || residenceHasPlace(place)));

      if (deletedRelationIds.length > 0) {
        const { error } = await supabase
          .from('person_relations')
          .delete()
          .in('id', deletedRelationIds)
          .eq('biography_id', biographyId);
        if (error) throw error;
        setDeletedRelationIds([]);
      }

      const nextRelations = [...relations];
      for (let i = 0; i < nextRelations.length; i++) {
        const form = nextRelations[i];
        if (!relationHasData(form) && !form.id) continue;
        if (!relationHasData(form) && form.id) {
          const { error } = await supabase
            .from('person_relations')
            .delete()
            .eq('id', form.id)
            .eq('biography_id', biographyId);
          if (error) throw error;
          nextRelations[i] = { ...form, id: null };
          continue;
        }
        const fields = buildRelationRow({
          biographyId,
          form: isAutobiography ? { ...form, assertedBy: 'self' } : form,
          recordLang,
        });
        if (form.id) {
          const { error } = await supabase
            .from('person_relations')
            .update(fields)
            .eq('id', form.id)
            .eq('biography_id', biographyId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('person_relations')
            .insert(fields)
            .select('id')
            .maybeSingle();
          if (error) throw error;
          if (data?.id) nextRelations[i] = { ...form, id: data.id };
        }
      }
      setRelations(nextRelations.filter((r) => r.id || relationHasData(r)));

      onNameSaved?.(nameNfc);
      toast.success(p.saved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.toast.error);
    } finally {
      setSaving(false);
    }
  }, [
    biographyId,
    birth,
    death,
    places,
    showDeath,
    isAutobiography,
    deletedPlaceIds,
    deletedRelationIds,
    disabled,
    name,
    onNameSaved,
    p.nameRequired,
    p.saved,
    recordLang,
    relations,
    romanizationSystem,
    romanized,
    showRomanization,
    t.toast.error,
  ]);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 py-4 border-b border-border/30 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {p.loading}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!hideTitle && (
        <div className="flex items-start gap-2">
          <Landmark className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <h3 className="text-sm font-medium">{isAutobiography ? p.titleSelf : p.title}</h3>
        </div>
      )}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {isAutobiography ? p.whySelf : p.why}
      </p>

      <div className="space-y-1.5 max-w-xl">
        <Label className="text-xs text-muted-foreground">
          {isAutobiography ? p.nameAsWrittenSelf : p.nameAsWritten}
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
          className="h-9"
        />
        <p className="text-[11px] text-muted-foreground">
          {isAutobiography ? p.nameHintSelf : p.nameHint}
        </p>
      </div>

      {showRomanization && (
        <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{p.romanized}</Label>
            <Input
              value={romanized}
              onChange={(e) => setRomanized(e.target.value)}
              disabled={disabled}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{p.romanizationSystem}</Label>
            <Input
              value={romanizationSystem}
              onChange={(e) => setRomanizationSystem(e.target.value)}
              disabled={disabled}
              className="h-9"
              placeholder={p.romanizationSystemHint}
            />
          </div>
        </div>
      )}

      <div className={showDeath ? 'grid lg:grid-cols-2 gap-3' : 'space-y-3'}>
        <EventBlock
          title={p.birth}
          form={birth}
          onChange={setBirth}
          lang={language}
          disabled={disabled}
          t={t}
          placeLabel={p.birthPlace}
          showAsGiven={!isAutobiography}
          showProvenance={!isAutobiography}
        />
        {showDeath && (
          <EventBlock
            title={p.death}
            form={death}
            onChange={setDeath}
            lang={language}
            disabled={disabled}
            t={t}
            placeLabel={p.deathPlace}
          />
        )}
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <h4 className="text-sm font-medium">{p.placesTitle}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isAutobiography ? p.placesHintSelf : p.placesHint}
          </p>
        </div>
        {places.map((place, index) => (
          <div
            key={place.id ?? `place-${index}`}
            className="rounded-lg border border-border/60 p-3 space-y-3 bg-background/50"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <PlaceSearchField
                  query={place.placeQuery}
                  selected={place.place}
                  onQueryChange={(placeQuery) =>
                    setPlaces((prev) =>
                      prev.map((row, i) => (i === index ? { ...row, placeQuery } : row))
                    )
                  }
                  onSelect={(selected) =>
                    setPlaces((prev) =>
                      prev.map((row, i) =>
                        i === index
                          ? {
                              ...row,
                              place: selected,
                              placeQuery:
                                selected?.nameCurrent || selected?.nameAsGiven || row.placeQuery,
                            }
                          : row
                      )
                    )
                  }
                  label={p.place}
                  placeholder={p.placePlaceholder}
                  hint={p.placeHint}
                  clearLabel={p.clear}
                  lang={language}
                  disabled={disabled}
                />
              </div>
              {!disabled && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="shrink-0 mt-6"
                  onClick={() => {
                    setPlaces((prev) => prev.filter((_, i) => i !== index));
                    if (place.id) setDeletedPlaceIds((ids) => [...ids, place.id!]);
                  }}
                  aria-label={p.removePlace}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {!isAutobiography && (
              <ProvenanceFields
                assertedBy={place.assertedBy}
                sourceNote={place.sourceNote}
                confidence={place.confidence}
                onAssertedBy={(assertedBy) =>
                  setPlaces((prev) =>
                    prev.map((row, i) => (i === index ? { ...row, assertedBy } : row))
                  )
                }
                onSourceNote={(sourceNote) =>
                  setPlaces((prev) =>
                    prev.map((row, i) => (i === index ? { ...row, sourceNote } : row))
                  )
                }
                onConfidence={(confidence) =>
                  setPlaces((prev) =>
                    prev.map((row, i) => (i === index ? { ...row, confidence } : row))
                  )
                }
                disabled={disabled}
                labels={{
                  howDoYouKnow: p.howDoYouKnow,
                  self: p.assertedSelf,
                  family: p.assertedFamily,
                  document: p.assertedDocument,
                  institution: p.assertedInstitution,
                  unknown: p.assertedUnknown,
                  sourceNote: p.sourceNote,
                  sourceNoteHint: p.sourceNoteHint,
                  confidence: p.confidence,
                  certain: p.confidenceCertain,
                  probable: p.confidenceProbable,
                  uncertain: p.confidenceUncertain,
                  confidenceUnknown: p.confidenceUnknown,
                }}
              />
            )}
          </div>
        ))}
        {!disabled && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setPlaces((prev) => [...prev, emptyEventForm()])}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {p.addPlace}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <h4 className="text-sm font-medium">
            {isAutobiography ? p.relationsTitleSelf : p.relationsTitle}
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">{p.relationsHint}</p>
        </div>
        {relations.map((rel, index) => (
          <RelationBlock
            key={rel.id ?? `new-${index}`}
            form={rel}
            onChange={(next) =>
              setRelations((prev) => prev.map((r, i) => (i === index ? next : r)))
            }
            onRemove={() => {
              setRelations((prev) => prev.filter((_, i) => i !== index));
              if (rel.id) setDeletedRelationIds((ids) => [...ids, rel.id!]);
            }}
            disabled={disabled}
            t={t}
            recordLang={recordLang}
            showProvenance={!isAutobiography}
          />
        ))}
        {!disabled && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setRelations((prev) => [...prev, emptyRelationForm(recordLang)])}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {p.addRelation}
          </Button>
        )}
      </div>

      {!disabled && (
        <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {p.save}
        </Button>
      )}
    </div>
  );
}
