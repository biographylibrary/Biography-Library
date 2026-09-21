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
import type { DateInputState, DatePrecision } from '@/lib/date-input';

type Labels = {
  precision: string;
  unknown: string;
  day: string;
  month: string;
  year: string;
  approx: string;
  decade: string;
  yearLabel: string;
  monthLabel: string;
  dayLabel: string;
  asGivenLabel: string;
  asGivenHint: string;
};

interface EdtfDateFieldsProps {
  value: DateInputState;
  asGivenFree: string;
  onChange: (next: DateInputState) => void;
  onAsGivenChange: (value: string) => void;
  labels: Labels;
  disabled?: boolean;
  /** Hidden on autobiographies: the author is the source of the date. */
  showAsGiven?: boolean;
}

export function EdtfDateFields({
  value,
  asGivenFree,
  onChange,
  onAsGivenChange,
  labels,
  disabled = false,
  showAsGiven = true,
}: EdtfDateFieldsProps) {
  const showMonth = value.precision === 'day' || value.precision === 'month';
  const showDay = value.precision === 'day';
  const showYear = value.precision !== 'unknown';

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{labels.precision}</Label>
        <Select
          value={value.precision}
          onValueChange={(v) =>
            onChange({ ...value, precision: v as DatePrecision })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unknown">{labels.unknown}</SelectItem>
            <SelectItem value="day">{labels.day}</SelectItem>
            <SelectItem value="month">{labels.month}</SelectItem>
            <SelectItem value="year">{labels.year}</SelectItem>
            <SelectItem value="approx">{labels.approx}</SelectItem>
            <SelectItem value="decade">{labels.decade}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showYear && (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{labels.yearLabel}</Label>
            <Input
              inputMode="numeric"
              maxLength={4}
              value={value.year}
              onChange={(e) => onChange({ ...value, year: e.target.value.replace(/\D/g, '') })}
              disabled={disabled}
              className="h-9"
            />
          </div>
          {showMonth && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{labels.monthLabel}</Label>
              <Input
                inputMode="numeric"
                maxLength={2}
                value={value.month}
                onChange={(e) => onChange({ ...value, month: e.target.value.replace(/\D/g, '') })}
                disabled={disabled}
                className="h-9"
              />
            </div>
          )}
          {showDay && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{labels.dayLabel}</Label>
              <Input
                inputMode="numeric"
                maxLength={2}
                value={value.day}
                onChange={(e) => onChange({ ...value, day: e.target.value.replace(/\D/g, '') })}
                disabled={disabled}
                className="h-9"
              />
            </div>
          )}
        </div>
      )}

      {showAsGiven && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{labels.asGivenLabel}</Label>
          <Input
            value={asGivenFree}
            onChange={(e) => onAsGivenChange(e.target.value)}
            disabled={disabled}
            className="h-9"
            placeholder={labels.asGivenHint}
          />
        </div>
      )}
    </div>
  );
}
