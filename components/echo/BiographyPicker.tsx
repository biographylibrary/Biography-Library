'use client';

import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Biography } from '@/lib/biographies';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface BiographyPickerProps {
  biographies: Biography[];
  currentId?: string;
  className?: string;
}

export function BiographyPicker({ biographies, currentId, className }: BiographyPickerProps) {
  const router = useRouter();
  const { t } = useTranslation();

  if (biographies.length === 0) return null;

  const value = currentId ?? biographies[0]?.id ?? '';

  return (
    <Select
      value={value}
      onValueChange={(id) => router.push(`/biography/${id}/edit`)}
    >
      <SelectTrigger className={className ?? 'min-w-0 flex-1 max-w-[12.5rem] h-9 text-sm'}>
        <SelectValue placeholder={t.echo.pickBiography} />
      </SelectTrigger>
      <SelectContent>
        {biographies.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.title || t.echo.untitledBiography}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
