'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';

interface EditorFontSizeControlProps {
  biographyId: string;
  currentSize: number;
  onSizeChange: (size: number) => void;
}

const fontSizes = [14, 15, 16, 17, 18, 19, 20, 22, 24];

export function EditorFontSizeControl({
  biographyId,
  currentSize,
  onSizeChange,
}: EditorFontSizeControlProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSizeChange = async (sizeStr: string) => {
    const size = parseInt(sizeStr, 10);
    setIsUpdating(true);

    const { error } = await supabase
      .from('biographies')
      .update({ editor_font_size: size })
      .eq('id', biographyId);

    if (!error) {
      onSizeChange(size);
    }

    setIsUpdating(false);
  };

  return (
    <div className="flex items-center shrink-0">
      <Select
        value={currentSize.toString()}
        onValueChange={handleSizeChange}
        disabled={isUpdating}
      >
        <SelectTrigger
          className="h-8 w-auto shrink-0 gap-1 px-2 text-[11px] md:text-xs [&>span]:line-clamp-none [&>span]:overflow-visible [&>span]:shrink-0 [&>span]:whitespace-nowrap [&>svg]:h-3 [&>svg]:w-3 [&>svg]:shrink-0"
          aria-label={`${currentSize}px`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          align="start"
          className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]"
        >
          {fontSizes.map((size) => (
            <SelectItem
              key={size}
              value={size.toString()}
              className="justify-center px-2 py-1 text-[11px] md:text-xs data-[state=checked]:bg-accent [&>span:first-child]:hidden"
            >
              {size}px
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
