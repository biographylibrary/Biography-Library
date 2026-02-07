'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Type } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type FontSize = 'small' | 'normal' | 'large' | 'extra-large';

interface FontSizeControlProps {
  currentSize: FontSize;
  onSizeChange: (size: FontSize) => void;
  userId: string;
}

const fontSizeMap: Record<FontSize, string> = {
  'small': '90%',
  'normal': '100%',
  'large': '115%',
  'extra-large': '130%',
};

export function FontSizeControl({ currentSize, onSizeChange, userId }: FontSizeControlProps) {
  const { t } = useTranslation();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSizeChange = async (size: FontSize) => {
    setIsUpdating(true);

    const { error } = await supabase
      .from('profiles')
      .update({ ui_font_size: size })
      .eq('id', userId);

    if (error) {
      toast.error(t.toast.error);
      console.error('Error updating font size:', error);
    } else {
      onSizeChange(size);
      document.documentElement.style.fontSize = fontSizeMap[size];
    }

    setIsUpdating(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Type className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Select
        value={currentSize}
        onValueChange={handleSizeChange}
        disabled={isUpdating}
      >
        <SelectTrigger className="w-[80px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="small">{t.accessibility.small}</SelectItem>
          <SelectItem value="normal">{t.accessibility.normal}</SelectItem>
          <SelectItem value="large">{t.accessibility.large}</SelectItem>
          <SelectItem value="extra-large">{t.accessibility.extraLarge}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export { fontSizeMap };
export type { FontSize };
