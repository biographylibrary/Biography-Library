'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AssertedByCode, ConfidenceCode } from '@/lib/person-events';

type Labels = {
  howDoYouKnow: string;
  self: string;
  family: string;
  document: string;
  institution: string;
  unknown: string;
  sourceNote: string;
  sourceNoteHint: string;
  confidence: string;
  certain: string;
  probable: string;
  uncertain: string;
  confidenceUnknown: string;
};

interface ProvenanceFieldsProps {
  assertedBy: AssertedByCode;
  sourceNote: string;
  confidence: ConfidenceCode;
  onAssertedBy: (v: AssertedByCode) => void;
  onSourceNote: (v: string) => void;
  onConfidence: (v: ConfidenceCode) => void;
  labels: Labels;
  disabled?: boolean;
}

export function ProvenanceFields({
  assertedBy,
  sourceNote,
  confidence,
  onAssertedBy,
  onSourceNote,
  onConfidence,
  labels,
  disabled = false,
}: ProvenanceFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{labels.howDoYouKnow}</Label>
        <Select
          value={assertedBy}
          onValueChange={(v) => onAssertedBy(v as AssertedByCode)}
          disabled={disabled}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="self">{labels.self}</SelectItem>
            <SelectItem value="family">{labels.family}</SelectItem>
            <SelectItem value="document">{labels.document}</SelectItem>
            <SelectItem value="institution">{labels.institution}</SelectItem>
            <SelectItem value="unknown">{labels.unknown}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{labels.sourceNote}</Label>
        <Input
          value={sourceNote}
          onChange={(e) => onSourceNote(e.target.value)}
          disabled={disabled}
          className="h-9"
          placeholder={labels.sourceNoteHint}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{labels.confidence}</Label>
        <Select
          value={confidence}
          onValueChange={(v) => onConfidence(v as ConfidenceCode)}
          disabled={disabled}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="certain">{labels.certain}</SelectItem>
            <SelectItem value="probable">{labels.probable}</SelectItem>
            <SelectItem value="uncertain">{labels.uncertain}</SelectItem>
            <SelectItem value="unknown">{labels.confidenceUnknown}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
