import { supabase } from '@/lib/supabase';

const BUCKET = 'biography-photos';

function storagePath(fileUrl: string): string {
  try {
    const parts = new URL(fileUrl).pathname.split('/biography-photos/');
    return parts[1] || '';
  } catch {
    return '';
  }
}

/** Stores the prepared cover so the catalog card and the PDF first page show the same image. */
export async function saveOriginalCoverJpeg(opts: {
  biographyId: string;
  userId: string;
  jpegBase64: string;
}): Promise<void> {
  const binary = atob(opts.jpegBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  const filePath = `${opts.userId}/${opts.biographyId}/original-cover-${Date.now()}.jpg`;
  const file = new File([bytes], 'original-cover.jpg', { type: 'image/jpeg' });
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  const publicUrl = urlData.publicUrl;

  const { data: existing, error: readError } = await supabase
    .from('biography_media')
    .select('id, file_url, layout')
    .eq('biography_id', opts.biographyId)
    .in('layout', ['cover', 'cover_a5']);
  if (readError) {
    await supabase.storage.from(BUCKET).remove([filePath]);
    throw readError;
  }

  const oldRows = (existing ?? []) as Array<{ id: string; file_url: string; layout: string }>;
  const keptIds: string[] = [];
  let pointed = false;

  try {
    for (const layout of ['cover', 'cover_a5'] as const) {
      const row = oldRows.find((item) => item.layout === layout);
      if (row) {
        const { error } = await supabase
          .from('biography_media')
          .update({ file_url: publicUrl, file_name: 'original-cover.jpg' })
          .eq('id', row.id);
        if (error) throw error;
        pointed = true;
        keptIds.push(row.id);
      } else {
        const { data: inserted, error } = await supabase
          .from('biography_media')
          .insert({
            biography_id: opts.biographyId,
            user_id: opts.userId,
            file_url: publicUrl,
            file_name: 'original-cover.jpg',
            caption: '',
            layout,
            display_order: 0,
          })
          .select('id')
          .maybeSingle();
        if (error || !inserted) throw error ?? new Error('cover insert failed');
        pointed = true;
        keptIds.push((inserted as { id: string }).id);
      }
    }
  } catch (err) {
    if (!pointed) await supabase.storage.from(BUCKET).remove([filePath]);
    throw err;
  }

  const extras = oldRows.filter((row) => !keptIds.includes(row.id));
  if (extras.length > 0) {
    await supabase.from('biography_media').delete().in(
      'id',
      extras.map((row) => row.id)
    );
  }

  const stalePaths = oldRows
    .map((row) => storagePath(row.file_url))
    .filter((path) => path && path !== filePath);
  if (stalePaths.length > 0) await supabase.storage.from(BUCKET).remove(stalePaths);
}
