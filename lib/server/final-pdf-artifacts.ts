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

const DEFAULT_PDF_LABELS: Record<
  string,
  {
    createdWith: string;
    allRightsReserved: string;
    preface: string;
    epilogue: string;
    acknowledgements: string;
    specificCredits: string;
    backCoverDescription: string;
    backCoverPropertyStatement: string;
    backCoverAiStatement: string;
    backCoverFooter: string;
  }
> = {
  en: {
    createdWith: 'Created with Biography Library',
    allRightsReserved: '© {year} all rights reserved',
    preface: 'Preface',
    epilogue: 'Epilogue',
    acknowledgements: 'Acknowledgements',
    specificCredits: 'Credits',
    backCoverDescription:
      'This biography was managed with Biography Library, the digital archive of human memory that freely offers the tools to create and preserve your own story or that of a loved one.',
    backCoverPropertyStatement:
      'The text of this biography is the exclusive property of the author, who retains all rights to pursue any unauthorized use, including use for AI training purposes.',
    backCoverAiStatement:
      "Biography Library prohibits the use of content hosted on its servers for text mining, AI training or machine learning, pursuant to the Swiss Copyright Act (CopA/LDA) and the author's exclusive right of use under Swiss law.",
    backCoverFooter: 'Biography Library · biographylibrary.org',
  },
  it: {
    createdWith: 'Creato con Biography Library',
    allRightsReserved: '© {year} tutti i diritti riservati',
    preface: 'Prefazione',
    epilogue: 'Epilogo',
    acknowledgements: 'Ringraziamenti',
    specificCredits: 'Crediti',
    backCoverDescription:
      'Questa biografia è stata gestita con Biography Library, l’archivio digitale della memoria umana che offre liberamente gli strumenti per creare e preservare la propria storia o quella di una persona cara.',
    backCoverPropertyStatement:
      'Il testo di questa biografia è proprietà esclusiva dell’autore, che mantiene ogni diritto di agire contro qualsiasi uso non autorizzato, incluso l’uso per addestramento di sistemi di IA.',
    backCoverAiStatement:
      "Biography Library vieta l’uso dei contenuti ospitati sui propri server per text mining, addestramento IA o machine learning, ai sensi della Legge svizzera sul diritto d’autore (LDA) e del diritto esclusivo d’uso dell’autore previsto dal diritto svizzero.",
    backCoverFooter: 'Biography Library · biographylibrary.org',
  },
  fr: {
    createdWith: 'Créé avec Biography Library',
    allRightsReserved: '© {year} tous droits réservés',
    preface: 'Préface',
    epilogue: 'Épilogue',
    acknowledgements: 'Remerciements',
    specificCredits: 'Crédits',
    backCoverDescription:
      'Cette biographie a été gérée avec Biography Library, l’archive numérique de la mémoire humaine qui offre librement les outils pour créer et préserver votre propre histoire ou celle d’un proche.',
    backCoverPropertyStatement:
      "Le texte de cette biographie est la propriété exclusive de l’auteur, qui conserve tous les droits pour agir contre toute utilisation non autorisée, y compris l’usage à des fins d’entraînement d’IA.",
    backCoverAiStatement:
      "Biography Library interdit l’utilisation des contenus hébergés sur ses serveurs pour le text mining, l’entraînement d’IA ou le machine learning, conformément à la Loi suisse sur le droit d’auteur (LDA) et au droit d’usage exclusif de l’auteur en droit suisse.",
    backCoverFooter: 'Biography Library · biographylibrary.org',
  },
  de: {
    createdWith: 'Erstellt mit Biography Library',
    allRightsReserved: '© {year} alle Rechte vorbehalten',
    preface: 'Vorwort',
    epilogue: 'Nachwort',
    acknowledgements: 'Danksagung',
    specificCredits: 'Quellenangaben',
    backCoverDescription:
      'Diese Biografie wurde mit Biography Library erstellt, dem digitalen Archiv der menschlichen Erinnerung, das frei Werkzeuge anbietet, um die eigene Geschichte oder die eines geliebten Menschen zu erstellen und zu bewahren.',
    backCoverPropertyStatement:
      'Der Text dieser Biografie ist ausschließliches Eigentum des Autors, der alle Rechte behält, gegen jede unbefugte Nutzung vorzugehen, einschließlich der Nutzung für KI-Trainingszwecke.',
    backCoverAiStatement:
      'Biography Library untersagt die Nutzung von auf seinen Servern gehosteten Inhalten für Text-Mining, KI-Training oder maschinelles Lernen gemäß dem Schweizer Urheberrechtsgesetz (URG/LDA) und dem ausschließlichen Nutzungsrecht des Autors nach Schweizer Recht.',
    backCoverFooter: 'Biography Library · biographylibrary.org',
  },
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
    const labels = DEFAULT_PDF_LABELS[contentLanguage || 'en'] ?? DEFAULT_PDF_LABELS.en;
    const buf = await generateBiographyPDF(
      bioData,
      'b5-standard',
      labels,
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
