/**
 * Enrich demo catalogue biographies: BL composite cover, full book structure, final PDF.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local — dev only.
 *
 * Usage: npm run demo:enrich
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function loadEnv(): Record<string, string> {
  const envPath = resolve(process.cwd(), '.env.local');
  const raw = readFileSync(envPath, 'utf8');
  const env: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
for (const [key, value] of Object.entries(env)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

const DEMO_SLUGS = [
  'demo-mia-storia-it',
  'demo-my-story-en',
  'demo-mon-histoire-fr',
  'demo-meine-geschichte-de',
] as const;

type DemoSlug = (typeof DEMO_SLUGS)[number];

type BookStructureSeed = {
  dedication_content: string;
  epigraph_content: string;
  epigraph_source: string;
  preface_content: string;
  epilogue_content: string;
  acknowledgements_content: string;
  specific_credits_content: string;
};

const BOOK_STRUCTURE_BY_SLUG: Record<DemoSlug, BookStructureSeed> = {
  'demo-mia-storia-it': {
    dedication_content: 'Ai miei genitori, che mi hanno insegnato a osservare il mondo con attenzione e tenerezza.',
    epigraph_content: 'Non è la vita che conta, ma il coraggio che vi mettiamo.',
    epigraph_source: 'Winston Churchill',
    preface_content:
      '<p>Ho scritto queste pagine per lasciare ai miei nipoti qualcosa di più di date e nomi: il modo in cui ho vissuto le piccole cose quotidiane che compongono una vita.</p><p>Biography Library mi ha aiutato a organizzare i ricordi e a dare forma a una storia che spero possa essere letta con calma, come si sfoglia un album di famiglia.</p>',
    epilogue_content:
      '<p>Chiudendo questo libro, sento di aver detto ciò che contava. Il resto vivrà nelle conversazioni attorno a un tavolo, nelle foto e nelle canzoni che ci riportano indietro.</p>',
    acknowledgements_content:
      '<p>Ringrazio i colleghi dell\'istituto comprensivo di Lugano, le famiglie degli alunni e soprattutto mia sorella Lucia, che ha riletto ogni capitolo con pazienza e buonumore.</p>',
    specific_credits_content:
      'Fotografie di famiglia: archivio privato Rossi.\nCopertina: foto di copertina con modello grafico Biography Library.',
  },
  'demo-my-story-en': {
    dedication_content: 'For my children — may you always find your way back to the kitchen table.',
    epigraph_content: 'We are not what we remember, but what we dare to write down.',
    epigraph_source: 'Anonymous',
    preface_content:
      '<p>I began this biography on quiet evenings after my shifts at the hospital. I wanted my children to know not only where I worked, but how I learned to listen.</p><p>Biography Library gave me a simple structure and the confidence to turn scattered memories into a book I am proud to share.</p>',
    epilogue_content:
      '<p>If you are reading these lines years from now, know that you were the reason I started writing. Carry forward kindness, persistence, and laughter.</p>',
    acknowledgements_content:
      '<p>Thanks to the nursing team at St. Anne\'s, to my neighbour Margaret for her notes on early drafts, and to my son Daniel for scanning old photographs.</p>',
    specific_credits_content:
      'Family photographs: Whitfield private archive.\nCover: Biography Library composite cover layout.',
  },
  'demo-mon-histoire-fr': {
    dedication_content: 'À mes petits-enfants, pour qu\'ils sachent d\'où ils viennent.',
    epigraph_content: 'Les livres sont des amis qui ne demandent jamais rien en retour.',
    epigraph_source: 'Marie Dubois',
    preface_content:
      '<p>Ces pages rassemblent des souvenirs de Lyon, de marchés colorés et de soirées de lecture. Je les ai écrites lentement, avec l\'aide de Biography Library, pour offrir à ma famille une mémoire partagée.</p>',
    epilogue_content:
      '<p>Une biographie n\'est jamais achevée : elle continue dans ceux qui la lisent et la transmettent.</p>',
    acknowledgements_content:
      '<p>Merci aux collègues de la bibliothèque municipale, à mon fils Antoine et à ma nièce Sophie pour leurs relectures attentives.</p>',
    specific_credits_content:
      'Photographies : archives familiales Dubois.\nCouverture : mise en page Biography Library (photo de couverture).',
  },
  'demo-meine-geschichte-de': {
    dedication_content: 'Für meine Enkel — damit ihr wisst, woher ihr kommt.',
    epigraph_content: 'Brücken verbinden nicht nur Ufer, sondern auch Generationen.',
    epigraph_source: 'Hans Müller',
    preface_content:
      '<p>Ich habe diese Biografie geschrieben, um Erinnerungen an Dorf, Werkstatt und Familie festzuhalten. Biography Library half mir, aus vielen Einzelheiten ein lesbares Buch zu formen.</p>',
    epilogue_content:
      '<p>Ein einfaches Leben kann reich sein. Ich hoffe, diese Seiten erinnern euch daran, dass Beständigkeit und Neugier zusammengehören.</p>',
    acknowledgements_content:
      '<p>Danke an meine Frau Elisabeth, an meine Kollegen im Ingenieurbüro und an meine Tochter Anna für die digitale Archivierung der Fotos.</p>',
    specific_credits_content:
      'Fotos: privates Müller-Archiv.\nUmschlag: Biography Library Komposit-Layout (Titelfoto).',
  },
};

function picsum(seed: string, w: number, h: number) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}.jpg`;
}

async function downloadImage(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get('content-type') || 'image/jpeg';
  return { buf, contentType: ct };
}

async function switchToCompositeCover(
  supabase: SupabaseClient,
  userId: string,
  biographyId: string,
  coverSeed: string,
) {
  await supabase
    .from('biography_media')
    .delete()
    .eq('biography_id', biographyId)
    .in('layout', ['cover', 'cover_a5']);

  const url = picsum(coverSeed, 900, 1200);
  const { buf, contentType } = await downloadImage(url);
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  const fileName = `demo-cover-composite-${coverSeed}.${ext}`;
  const storagePath = `${userId}/${biographyId}/${fileName}`;

  const { error: upErr } = await supabase.storage.from('biography-photos').upload(storagePath, buf, {
    contentType,
    cacheControl: '3600',
    upsert: true,
  });
  if (upErr) throw new Error(`Cover upload: ${upErr.message}`);

  const { data: urlData } = supabase.storage.from('biography-photos').getPublicUrl(storagePath);

  const { error: insErr } = await supabase.from('biography_media').insert({
    biography_id: biographyId,
    user_id: userId,
    file_url: urlData.publicUrl,
    file_name: fileName,
    caption: 'Demo cover (BL composite)',
    layout: 'cover',
    display_order: 0,
  });
  if (insErr) throw new Error(`Cover media insert: ${insErr.message}`);
}

async function upsertBookStructure(
  supabase: SupabaseClient,
  biographyId: string,
  userId: string,
  seed: BookStructureSeed,
) {
  const payload = {
    biography_id: biographyId,
    user_id: userId,
    include_author_copyright_page: true,
    dedication_enabled: true,
    epigraph_enabled: true,
    preface_enabled: true,
    epilogue_enabled: true,
    acknowledgements_enabled: true,
    specific_credits_enabled: true,
    ...seed,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from('biography_book_structure')
    .select('id')
    .eq('biography_id', biographyId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from('biography_book_structure').update(payload).eq('id', existing.id);
    if (error) throw new Error(`Book structure update: ${error.message}`);
    return;
  }

  const { error } = await supabase.from('biography_book_structure').insert(payload);
  if (error) throw new Error(`Book structure insert: ${error.message}`);
}

async function main() {
  const { generateUploadFinalPdf } = await import('@/lib/server/final-pdf-artifacts');
  const { generateAndStoreExports } = await import('@/lib/server/review-submit-pipeline');

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  console.log('Enriching demo catalogue (cover + book structure + PDF)…\n');

  for (const slug of DEMO_SLUGS) {
    process.stdout.write(`${slug}… `);

    const { data: bio, error: bioErr } = await supabase
      .from('biographies')
      .select('id, user_id, title, content_language, slug')
      .eq('slug', slug)
      .maybeSingle();

    if (bioErr) throw new Error(bioErr.message);
    if (!bio) {
      console.log('skip (not found — run seed-demo-catalog first)');
      continue;
    }

    const coverSeed = slug.replace('demo-', '').replace(/-/g, '_');
    await switchToCompositeCover(supabase, bio.user_id, bio.id, coverSeed);
    await upsertBookStructure(supabase, bio.id, bio.user_id, BOOK_STRUCTURE_BY_SLUG[slug]);

    const lang = (bio.content_language as string) || 'en';
    const { finalPdfUrl, listingCoverUrl } = await generateUploadFinalPdf(supabase, bio.id, lang);
    await generateAndStoreExports(supabase, bio.id);

    const listingFinal = listingCoverUrl ?? picsum(`${coverSeed}-listing`, 400, 560);

    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('biographies')
      .update({
        status: 'published',
        final_pdf_url: finalPdfUrl,
        listing_cover_url: listingFinal,
        final_pdf_approved_at: now,
        ai_screening_status: 'passed',
        pdf_draft_iteration: null,
      })
      .eq('id', bio.id);

    if (updateErr) throw new Error(`Biography update: ${updateErr.message}`);

    console.log(`ok\n  PDF: ${finalPdfUrl}`);
  }

  console.log('\nDone. Demo biographies now have BL composite covers, book structure, and downloadable PDFs.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
