'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GripVertical, Trash2, Upload, ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaRow {
  id: string;
  biography_id: string;
  user_id: string;
  file_url: string;
  file_name: string | null;
  caption: string | null;
  layout: string;
  display_order: number;
  created_at: string;
  previewUrl?: string;
}

interface PhotoGalleryPanelProps {
  biographyId: string;
  userId: string;
  onClose?: () => void;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_EXPIRES = 3600;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function storagePathFromUrl(fileUrl: string): string {
  try {
    const url = new URL(fileUrl);
    const parts = url.pathname.split('/biography-photos/');
    if (parts[1]) return parts[1];
  } catch {
  }
  return fileUrl;
}

async function getSignedUrl(storagePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from('biography-photos')
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRES);
  return data?.signedUrl ?? '';
}

interface PhotoCardProps {
  item: MediaRow;
  onCaptionChange: (id: string, caption: string) => void;
  onLayoutChange: (id: string, layout: string) => void;
  onDelete: (item: MediaRow) => void;
  dragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
}

function PhotoCard({
  item,
  onCaptionChange,
  onLayoutChange,
  onDelete,
  dragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: PhotoCardProps) {
  const { t } = useTranslation();
  const [localCaption, setLocalCaption] = useState(item.caption ?? '');
  const debouncedCaption = useDebounce(localCaption, 600);

  useEffect(() => {
    setLocalCaption(item.caption ?? '');
  }, [item.id, item.caption]);

  useEffect(() => {
    if (debouncedCaption !== (item.caption ?? '')) {
      onCaptionChange(item.id, debouncedCaption);
    }
  }, [debouncedCaption, item.caption, item.id, onCaptionChange]);

  const displayUrl = item.previewUrl || item.file_url;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, item.id)}
      onDragEnd={onDragEnd}
      className={cn(
        'group rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm transition-all duration-150',
        dragging && 'opacity-50'
      )}
    >
      <div className="relative bg-muted">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob/data URLs and remote storage URLs; next/image would require full URL config
          <img
            src={displayUrl}
            alt={item.file_name ?? ''}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 flex items-center justify-center">
            <ImagePlus className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute top-2 left-2 cursor-grab active:cursor-grabbing p-1 rounded bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4" />
        </div>
        <button
          type="button"
          onClick={() => onDelete(item)}
          className="absolute top-2 right-2 p-1.5 rounded bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-wine/80"
          title={t.photos.deleteButton}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 space-y-2">
        <Input
          value={localCaption}
          onChange={(e) => setLocalCaption(e.target.value)}
          placeholder={t.photos.captionPlaceholder}
          className="text-sm text-left not-italic"
        />

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">
            {t.photos.layoutLabel}
          </span>
          <Select
            value={item.layout}
            onValueChange={(val) => onLayoutChange(item.id, val)}
          >
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full-page">{t.photos.layoutFullPage}</SelectItem>
              <SelectItem value="two-vertical">{t.photos.layoutTwoVertical}</SelectItem>
              <SelectItem value="two-horizontal">{t.photos.layoutTwoHorizontal}</SelectItem>
              <SelectItem value="three-mixed">{t.photos.layoutThreeMixed}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export function PhotoGalleryPanel({ biographyId, userId, onClose }: PhotoGalleryPanelProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<MediaRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaRow | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const coverA5InputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const coverComposite = items.find((i) => i.layout === 'cover') ?? null;
  const coverA5Row = items.find((i) => i.layout === 'cover_a5') ?? null;
  const galleryItems = items
    .filter((i) => i.layout !== 'cover' && i.layout !== 'cover_a5')
    .sort((a, b) => a.display_order - b.display_order);

  useEffect(() => {
    return () => {
      // Ref must be read when unmounting to revoke URLs pushed after mount; not the same as DOM refs.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('biography_media')
      .select('*')
      .eq('biography_id', biographyId)
      .order('display_order', { ascending: true });

    if (!data) return;

    const rows = data as MediaRow[];

    const withUrls = await Promise.all(
      rows.map(async (row) => {
        const path = storagePathFromUrl(row.file_url);
        const signedUrl = await getSignedUrl(path);
        return { ...row, previewUrl: signedUrl };
      })
    );

    setItems(withUrls);
  }, [biographyId]);

  useEffect(() => {
    load();
  }, [load]);

  const uploadSpecialCover = useCallback(
    async (file: File, layout: 'cover' | 'cover_a5') => {
      setErrorMsg(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setErrorMsg(t.photos.invalidFileType);
        return;
      }
      if (file.size > MAX_BYTES) {
        setErrorMsg(t.photos.fileTooLarge);
        return;
      }

      const existing = items.find((i) => i.layout === layout);
      const localPreview = URL.createObjectURL(file);
      objectUrlsRef.current.push(localPreview);

      setUploading(true);
      setUploadProgress(10);

      try {
        if (existing) {
          const path = storagePathFromUrl(existing.file_url);
          if (path) await supabase.storage.from('biography-photos').remove([path]);
          await supabase.from('biography_media').delete().eq('id', existing.id);
        }

        const ext = file.name.split('.').pop() ?? 'jpg';
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const storagePath = `${userId}/${biographyId}/${uniqueName}`;

        const { error: uploadError } = await supabase.storage
          .from('biography-photos')
          .upload(storagePath, file, { cacheControl: '3600', upsert: false });

        setUploadProgress(70);

        if (uploadError) {
          setErrorMsg(t.photos.uploadError);
          URL.revokeObjectURL(localPreview);
          return;
        }

        const { data: urlData } = supabase.storage.from('biography-photos').getPublicUrl(storagePath);
        const fileUrl = urlData?.publicUrl ?? storagePath;

        const { data: inserted, error: insertError } = await supabase
          .from('biography_media')
          .insert({
            biography_id: biographyId,
            user_id: userId,
            file_url: fileUrl,
            file_name: file.name,
            caption: '',
            layout,
            display_order: 0,
          })
          .select()
          .maybeSingle();

        setUploadProgress(100);

        if (insertError || !inserted) {
          await supabase.storage.from('biography-photos').remove([storagePath]);
          setErrorMsg(t.photos.uploadError);
          URL.revokeObjectURL(localPreview);
        } else {
          await load();
        }
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [biographyId, userId, items, t, load]
  );

  const handleFileSelect = useCallback(
    async (file: File) => {
      setErrorMsg(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setErrorMsg(t.photos.invalidFileType);
        return;
      }
      if (file.size > MAX_BYTES) {
        setErrorMsg(t.photos.fileTooLarge);
        return;
      }
      if (galleryItems.length >= 10) {
        setErrorMsg(t.photos.limitReached);
        return;
      }

      const localPreview = URL.createObjectURL(file);
      objectUrlsRef.current.push(localPreview);

      setUploading(true);
      setUploadProgress(10);

      const ext = file.name.split('.').pop() ?? 'jpg';
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const storagePath = `${userId}/${biographyId}/${uniqueName}`;

      const { error: uploadError } = await supabase.storage
        .from('biography-photos')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });

      setUploadProgress(70);

      if (uploadError) {
        setErrorMsg(t.photos.uploadError);
        setUploading(false);
        setUploadProgress(0);
        URL.revokeObjectURL(localPreview);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('biography-photos')
        .getPublicUrl(storagePath);

      const fileUrl = urlData?.publicUrl ?? storagePath;

      const newOrder =
        galleryItems.length > 0 ? Math.max(...galleryItems.map((i) => i.display_order)) + 1 : 0;

      const { data: inserted, error: insertError } = await supabase
        .from('biography_media')
        .insert({
          biography_id: biographyId,
          user_id: userId,
          file_url: fileUrl,
          file_name: file.name,
          caption: '',
          layout: 'full-page',
          display_order: newOrder,
        })
        .select()
        .maybeSingle();

      setUploadProgress(100);

      if (insertError || !inserted) {
        await supabase.storage.from('biography-photos').remove([storagePath]);
        setErrorMsg(t.photos.uploadError);
        URL.revokeObjectURL(localPreview);
      } else {
        setItems((prev) => [
          ...prev,
          { ...(inserted as MediaRow), previewUrl: localPreview },
        ]);
      }

      setUploading(false);
      setUploadProgress(0);
    },
    [biographyId, userId, galleryItems, t]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
      e.target.value = '';
    },
    [handleFileSelect]
  );

  const handleCaptionChange = useCallback(async (id: string, caption: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, caption } : i)));
    await supabase.from('biography_media').update({ caption }).eq('id', id);
  }, []);

  const handleLayoutChange = useCallback(async (id: string, layout: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, layout } : i)));
    await supabase.from('biography_media').update({ layout }).eq('id', id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    const path = storagePathFromUrl(target.file_url);
    if (path) {
      await supabase.storage.from('biography-photos').remove([path]);
    }

    const { error } = await supabase.from('biography_media').delete().eq('id', target.id);
    if (error) {
      setErrorMsg(t.photos.deleteError);
    } else {
      setItems((prev) => prev.filter((i) => i.id !== target.id));
    }
  }, [deleteTarget, t]);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (!draggingId || draggingId === targetId) return;

      setItems((prev) => {
        const coverRows = prev
          .filter((i) => i.layout === 'cover' || i.layout === 'cover_a5')
          .sort((a, b) => (a.layout === 'cover' ? 0 : 1) - (b.layout === 'cover' ? 0 : 1));
        const gallery = prev
          .filter((i) => i.layout !== 'cover' && i.layout !== 'cover_a5')
          .sort((a, b) => a.display_order - b.display_order);
        const from = gallery.findIndex((i) => i.id === draggingId);
        const to = gallery.findIndex((i) => i.id === targetId);
        if (from === -1 || to === -1) return prev;
        const nextGallery = [...gallery];
        const [moved] = nextGallery.splice(from, 1);
        nextGallery.splice(to, 0, moved);
        const reordered = nextGallery.map((item, idx) => ({ ...item, display_order: idx }));

        reordered.forEach((item) => {
          supabase
            .from('biography_media')
            .update({ display_order: item.display_order })
            .eq('id', item.id)
            .then(() => {});
        });

        return [...coverRows, ...reordered];
      });
    },
    [draggingId]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  const counterText = t.photos.counter.replace('{count}', String(galleryItems.length));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 shrink-0 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t.photos.panelTitle}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{counterText}</span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title={t.common.close}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {errorMsg && (
          <div className="text-sm text-brand-wineDark dark:text-brand-beigeLight bg-brand-wine/10 dark:bg-brand-wine/20 rounded-lg px-3 py-2 border border-brand-wine/25">
            {errorMsg}
          </div>
        )}

        {uploading && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">{t.photos.uploadProgress}</p>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="text-xs font-semibold text-foreground">{t.photos.coverCompositeTitle}</p>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadSpecialCover(file, 'cover');
              e.target.value = '';
            }}
          />
          {coverComposite ? (
            <div className="flex gap-3 items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverComposite.previewUrl || coverComposite.file_url}
                alt=""
                className="w-24 h-32 object-cover rounded-md border border-border/60"
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={uploading}
                  onClick={() => coverInputRef.current?.click()}
                >
                  {t.photos.uploadButton}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive"
                  disabled={uploading}
                  onClick={() => setDeleteTarget(coverComposite)}
                >
                  {t.common.delete}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs"
              disabled={uploading}
              onClick={() => coverInputRef.current?.click()}
            >
              {t.photos.uploadButton}
            </Button>
          )}
        </div>

        <div className="space-y-2 rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="text-xs font-semibold text-foreground">{t.photos.customA5CoverLabel}</p>
          <p className="text-[11px] text-muted-foreground leading-snug">{t.photos.customA5CoverHint}</p>
          <input
            ref={coverA5InputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadSpecialCover(file, 'cover_a5');
              e.target.value = '';
            }}
          />
          {coverA5Row ? (
            <div className="flex gap-3 items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverA5Row.previewUrl || coverA5Row.file_url}
                alt=""
                className="w-24 h-36 object-cover rounded-md border border-border/60"
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={uploading}
                  onClick={() => coverA5InputRef.current?.click()}
                >
                  {t.photos.uploadButton}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive"
                  disabled={uploading}
                  onClick={() => setDeleteTarget(coverA5Row)}
                >
                  {t.common.delete}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs"
              disabled={uploading}
              onClick={() => coverA5InputRef.current?.click()}
            >
              {t.photos.uploadButton}
            </Button>
          )}
        </div>

        <p className="text-xs font-semibold text-foreground pt-1">{t.photos.galleryPhotosHeading}</p>

        {galleryItems.length === 0 && !uploading && (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
            <div className="rounded-full bg-muted p-4">
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground max-w-[200px]">
              {t.photos.uploadButton}
            </p>
          </div>
        )}

        {galleryItems.map((item) => (
          <PhotoCard
            key={item.id}
            item={item}
            onCaptionChange={handleCaptionChange}
            onLayoutChange={handleLayoutChange}
            onDelete={setDeleteTarget}
            dragging={draggingId === item.id}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-border/50">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileInput}
        />
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || galleryItems.length >= 10}
        >
          <Upload className="h-4 w-4" />
          {t.photos.uploadButton}
        </Button>
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.photos.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.photos.deleteConfirmMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-brand-wine hover:bg-brand-wineDark text-brand-paper"
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
