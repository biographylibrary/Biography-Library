import type { SupabaseClient } from '@supabase/supabase-js';
import {
  generateBiographyPDF,
  setPdfExportSupabaseClient,
  type BiographyData,
} from '@/lib/pdf-export';
import { renderPdfFirstPageToJpegBuffer } from '@/lib/server/render-pdf-first-page-jpeg';

type AnyClient = SupabaseClient<any, any, any>;

/**
 * Load biography row + sections into the shape expected by PDF generation.
 * Uses service client (RLS bypass) for server-side generation.
 */
export async function loadBiographyDataForPdfExport(
  svc: AnyClient,
  biographyId: string
): Promise<BiographyData> {
  const { data: bio, error } = await svc
    .from('biographies')
    .select(
      'title, author_name, biography_mode, content, content_freeflow, narrative_order, final_version, status, created_at'
    )
    .eq('id', biographyId)
    .maybeSingle();

  if (error || !bio) {
    throw new Error('Biography not found');
  }

  let content: Record<string, { text: string }> = {};

  if (bio.biography_mode === 'sections') {
    const { data: rows } = await svc
      .from('biography_sections')
      .select('section_key, content')
      .eq('biography_id', biographyId)
      .order('section_key');

    for (const row of (rows as any[]) ?? []) {
      if (row.section_key) {
        content[row.section_key] = { text: row.content ?? '' };
      }
    }
  } else {
    content = (bio.content as Record<string, { text: string }>) ?? {};
  }

  return {
    id: biographyId,
    title: bio.title ?? '',
    author_name: bio.author_name ?? '',
    content,
    content_freeflow: bio.content_freeflow ?? '',
    biography_mode: bio.biography_mode as 'sections' | 'freeflow',
    narrative_order: (bio.narrative_order as string[]) ?? null,
    final_version: bio.final_version ?? null,
    status: bio.status as string | undefined,
    created_at: bio.created_at ?? new Date().toISOString(),
  };
}

const DEFAULT_PDF_LABELS = {
  createdWith: 'Created with Biography Library',
  allRightsReserved: '© {year} all rights reserved',
  preface: 'Preface',
  epilogue: 'Epilogue',
  acknowledgements: 'Acknowledgements',
  specificCredits: 'Credits',
};

export type FinalPdfArtifacts = {
  finalPdfUrl: string;
  /** Copertina catalogo da prima pagina PDF; null se render/upload JPEG fallisce. */
  listingCoverUrl: string | null;
};

/**
 * Renders the full book PDF (no watermark), uploads to `biography-exports/{id}/final.pdf`,
 * genera una JPEG dalla prima pagina e la carica come `listing-cover.jpg` per il catalogo.
 * Non aggiorna il DB (lo fa il caller dopo il lock).
 */
export async function generateUploadFinalPdf(
  svc: AnyClient,
  biographyId: string,
  contentLanguage: string
): Promise<FinalPdfArtifacts> {
  setPdfExportSupabaseClient(svc);
  try {
    const bioData = await loadBiographyDataForPdfExport(svc, biographyId);
    const buf = await generateBiographyPDF(
      bioData,
      'b5-standard',
      DEFAULT_PDF_LABELS,
      null,
      contentLanguage || 'en',
      false,
      true
    );

    if (!(buf instanceof ArrayBuffer)) {
      throw new Error('PDF generation did not return buffer');
    }

    const pdfPath = `biography-exports/${biographyId}/final.pdf`;
    const body = Buffer.from(buf);
    const { error: upErr } = await svc.storage.from('biography-exports').upload(pdfPath, body, {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (upErr) {
      console.error('[final-pdf-artifacts] upload error:', upErr);
      throw new Error('final_pdf_upload_failed');
    }

    const { data: pub } = svc.storage.from('biography-exports').getPublicUrl(pdfPath);
    const finalPdfUrl = pub.publicUrl;

    let listingCoverUrl: string | null = null;
    try {
      const jpegBuf = await renderPdfFirstPageToJpegBuffer(buf);
      const coverPath = `biography-exports/${biographyId}/listing-cover.jpg`;
      const { error: coverErr } = await svc.storage.from('biography-exports').upload(coverPath, jpegBuf, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (coverErr) {
        console.error('[final-pdf-artifacts] listing cover upload error:', coverErr);
      } else {
        const { data: coverPub } = svc.storage.from('biography-exports').getPublicUrl(coverPath);
        listingCoverUrl = coverPub.publicUrl;
      }
    } catch (e) {
      console.error('[final-pdf-artifacts] listing cover render/upload failed:', e);
    }

    return { finalPdfUrl, listingCoverUrl };
  } finally {
    setPdfExportSupabaseClient(null);
  }
}
