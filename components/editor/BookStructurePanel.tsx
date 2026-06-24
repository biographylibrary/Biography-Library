'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Placeholder from '@tiptap/extension-placeholder';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RichTextToolbar } from './rich-text-toolbar';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface BookStructureData {
  id?: string;
  include_author_copyright_page: boolean;
  dedication_content: string;
  epigraph_content: string;
  epigraph_source: string;
  preface_content: string;
  epilogue_content: string;
  acknowledgements_content: string;
  specific_credits_content: string;
  dedication_enabled: boolean;
  epigraph_enabled: boolean;
  preface_enabled: boolean;
  epilogue_enabled: boolean;
  acknowledgements_enabled: boolean;
  specific_credits_enabled: boolean;
}

const EMPTY_DATA: BookStructureData = {
  include_author_copyright_page: false,
  dedication_content: '',
  epigraph_content: '',
  epigraph_source: '',
  preface_content: '',
  epilogue_content: '',
  acknowledgements_content: '',
  specific_credits_content: '',
  dedication_enabled: false,
  epigraph_enabled: false,
  preface_enabled: false,
  epilogue_enabled: false,
  acknowledgements_enabled: false,
  specific_credits_enabled: false,
};

interface RichBlockEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function RichBlockEditor({ content, onChange, placeholder }: RichBlockEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Superscript,
      Subscript,
      Placeholder.configure({ placeholder }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'min-h-[120px] prose prose-sm max-w-none focus:outline-none px-3 py-2 text-sm',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  return (
    <div className="border border-border rounded-md overflow-hidden bg-background">
      <RichTextToolbar editor={editor} />
      <div className="overflow-y-auto max-h-[300px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

interface CollapsibleGroupProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleGroup({ title, children, defaultOpen = true }: CollapsibleGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-sm font-semibold text-foreground"
      >
        <span>{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="divide-y divide-border/40">{children}</div>}
    </div>
  );
}

interface BlockProps {
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}

function Block({ label, enabled, onToggle, children }: BlockProps) {
  return (
    <div className="px-3 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          className="shrink-0"
        />
      </div>
      {enabled && <div className="pt-1">{children}</div>}
    </div>
  );
}

interface BookStructurePanelProps {
  biographyId: string;
  userId: string;
  /** Hide section title when rendered inside BookStructureDialog */
  hideTitle?: boolean;
}

export function BookStructurePanel({ biographyId, userId, hideTitle }: BookStructurePanelProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<BookStructureData>(EMPTY_DATA);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    const load = async () => {
      const { data: existing } = await supabase
        .from('biography_book_structure')
        .select('*')
        .eq('biography_id', biographyId)
        .maybeSingle();

      if (existing) {
        setRecordId(existing.id);
        setData({
          include_author_copyright_page:
            (existing as { include_author_copyright_page?: boolean }).include_author_copyright_page === true,
          dedication_content: existing.dedication_content || '',
          epigraph_content: existing.epigraph_content || '',
          epigraph_source: existing.epigraph_source || '',
          preface_content: existing.preface_content || '',
          epilogue_content: existing.epilogue_content || '',
          acknowledgements_content: existing.acknowledgements_content || '',
          specific_credits_content: existing.specific_credits_content || '',
          dedication_enabled: existing.dedication_enabled ?? false,
          epigraph_enabled: existing.epigraph_enabled ?? false,
          preface_enabled: existing.preface_enabled ?? false,
          epilogue_enabled: existing.epilogue_enabled ?? false,
          acknowledgements_enabled: existing.acknowledgements_enabled ?? false,
          specific_credits_enabled: existing.specific_credits_enabled ?? false,
        });
      } else {
        const { data: created } = await supabase
          .from('biography_book_structure')
          .insert({ biography_id: biographyId, user_id: userId })
          .select('id')
          .maybeSingle();
        if (created) setRecordId(created.id);
      }
      setIsLoaded(true);
    };
    load();
  }, [biographyId, userId]);

  const saveImmediate = useCallback(async (patch: Partial<BookStructureData>) => {
    if (!recordId) return;
    await supabase
      .from('biography_book_structure')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', recordId);
  }, [recordId]);

  const scheduleDebounce = useCallback((patch: Partial<BookStructureData>) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      saveImmediate(patch);
    }, 1500);
  }, [saveImmediate]);

  const handleToggle = useCallback((field: keyof BookStructureData, value: boolean) => {
    setData((prev) => {
      const next = { ...prev, [field]: value };
      saveImmediate({ [field]: value });
      return next;
    });
  }, [saveImmediate]);

  const handleTextChange = useCallback((field: keyof BookStructureData, value: string) => {
    setData((prev) => {
      const next = { ...prev, [field]: value };
      scheduleDebounce({ [field]: value });
      return next;
    });
  }, [scheduleDebounce]);

  if (!isLoaded) {
    if (hideTitle) {
      return (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return null;
  }

  return (
    <div className={hideTitle ? 'space-y-3' : 'space-y-3 px-2 pb-4'}>
      {!hideTitle && (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-2">
          {t.editor.bookStructureTitle}
        </p>
      )}

      <div className="border border-border/60 rounded-lg overflow-hidden px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground leading-snug">
            {t.editor.bookStructureAuthorCopyrightPage}
          </span>
          <Switch
            checked={data.include_author_copyright_page}
            onCheckedChange={(v) => handleToggle('include_author_copyright_page', v)}
            className="shrink-0"
          />
        </div>
      </div>

      <CollapsibleGroup title={t.editor.bookStructureFrontMatter}>
        <Block
          label={t.editor.bookStructureDedication}
          enabled={data.dedication_enabled}
          onToggle={(v) => handleToggle('dedication_enabled', v)}
        >
          <Textarea
            value={data.dedication_content}
            onChange={(e) => handleTextChange('dedication_content', e.target.value)}
            placeholder={t.editor.bookStructureDedicationPlaceholder}
            className="text-sm text-center resize-none min-h-[80px]"
          />
        </Block>

        <Block
          label={t.editor.bookStructureEpigraph}
          enabled={data.epigraph_enabled}
          onToggle={(v) => handleToggle('epigraph_enabled', v)}
        >
          <div className="space-y-2">
            <Textarea
              value={data.epigraph_content}
              onChange={(e) => handleTextChange('epigraph_content', e.target.value)}
              placeholder={t.editor.bookStructureEpigraphQuotePlaceholder}
              className="text-sm italic resize-none min-h-[80px]"
            />
            <Input
              value={data.epigraph_source}
              onChange={(e) => handleTextChange('epigraph_source', e.target.value)}
              placeholder={t.editor.bookStructureEpigraphSourcePlaceholder}
              className="text-sm"
            />
          </div>
        </Block>

        <Block
          label={t.editor.bookStructurePreface}
          enabled={data.preface_enabled}
          onToggle={(v) => handleToggle('preface_enabled', v)}
        >
          <RichBlockEditor
            content={data.preface_content}
            onChange={(html) => handleTextChange('preface_content', html)}
            placeholder={t.editor.bookStructurePrefacePlaceholder}
          />
        </Block>
      </CollapsibleGroup>

      <CollapsibleGroup title={t.editor.bookStructureBackMatter}>
        <Block
          label={t.editor.bookStructureEpilogue}
          enabled={data.epilogue_enabled}
          onToggle={(v) => handleToggle('epilogue_enabled', v)}
        >
          <RichBlockEditor
            content={data.epilogue_content}
            onChange={(html) => handleTextChange('epilogue_content', html)}
            placeholder={t.editor.bookStructureEpiloguePlaceholder}
          />
        </Block>

        <Block
          label={t.editor.bookStructureAcknowledgements}
          enabled={data.acknowledgements_enabled}
          onToggle={(v) => handleToggle('acknowledgements_enabled', v)}
        >
          <RichBlockEditor
            content={data.acknowledgements_content}
            onChange={(html) => handleTextChange('acknowledgements_content', html)}
            placeholder={t.editor.bookStructureAcknowledgementsPlaceholder}
          />
        </Block>

        <Block
          label={t.editor.bookStructureCredits}
          enabled={data.specific_credits_enabled}
          onToggle={(v) => handleToggle('specific_credits_enabled', v)}
        >
          <Textarea
            value={data.specific_credits_content}
            onChange={(e) => handleTextChange('specific_credits_content', e.target.value)}
            placeholder={t.editor.bookStructureCreditPlaceholder}
            className="text-sm resize-none min-h-[80px]"
          />
        </Block>
      </CollapsibleGroup>
    </div>
  );
}
