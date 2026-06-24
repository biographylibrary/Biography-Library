/**
 * Popola una biografia di test con testi lunghi, 10 foto galleria (layout misti)
 * e copertine cover + cover_a5 su Supabase Storage.
 *
 * Uso: node scripts/seed-test-biography.mjs [biographyId]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const BIOGRAPHY_ID =
  process.argv[2]?.trim() || '204ddb9f-831a-432f-8506-a68bb2b124d8';

const SECTIONS = [
  { key: 'childhood', title: 'Infanzia e Primi Anni' },
  { key: 'family', title: 'Origini Familiari' },
  { key: 'education', title: 'Istruzione' },
  { key: 'career', title: 'Carriera e Lavoro' },
  { key: 'life-events', title: 'Eventi Importanti della Vita' },
  { key: 'relationships', title: 'Relazioni e Amore' },
  { key: 'challenges', title: 'Sfide e Lezioni Apprese' },
  { key: 'passions', title: 'Passioni e Hobby' },
  { key: 'legacy', title: 'Eredità e Pensieri Finali' },
];

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  const raw = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

function paragraph(topic, idx) {
  return (
    `<p>Nel capitolo dedicato a <strong>${topic}</strong>, il ricordo numero ${idx + 1} ` +
    `si apre con dettagli che rendono viva la scena: odori, rumori, volti e piccoli gesti quotidiani. ` +
    `Quando racconto questi momenti ai nipoti, cerco sempre di spiegare non solo cosa accadde, ma anche ` +
    `come ci si sentiva in quell'epoca, tra attese lunghe e gioie improvvise. A Genova il mare era una presenza ` +
    `costante, e spesso torna nei miei pensieri come sfondo di ogni conversazione. ` +
    `Le frasi che seguono non vogliono essere perfette: vogliono essere vere, anche quando la memoria ` +
    `si affaccia a scatti, lasciando piccoli vuoti che colmiamo con il sorriso.</p>`
  );
}

function sectionHtml(title, topic) {
  const body = Array.from({ length: 8 }, (_, i) => paragraph(topic, i)).join('\n');
  return body;
}

function buildContent() {
  const content = {};
  for (const s of SECTIONS) {
    content[s.key] = {
      text: sectionHtml(s.title, s.title),
      todo: false,
      audioTranscript: '',
    };
  }
  return content;
}

function buildFinalVersion(content) {
  return SECTIONS.map((s) => {
    const sectionData = content[s.key];
    return `<h2>${s.title}</h2>\n\n${sectionData.text}`;
  }).join('\n\n');
}

/** Picsum: stabile, leggero, adatto a test PDF */
function picsum(seed, w, h) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}.jpg`;
}

const GALLERY_PLAN = [
  { layout: 'full-page', seed: 'ugo-g1', w: 1200, h: 1600, caption: 'Vista sul porto al tramonto' },
  { layout: 'full-page', seed: 'ugo-g2', w: 1200, h: 900, caption: 'La famiglia riunita in cortile' },
  { layout: 'two-vertical', seed: 'ugo-g3', w: 800, h: 1200, caption: 'Lucia al mercato' },
  { layout: 'two-vertical', seed: 'ugo-g4', w: 800, h: 1200, caption: 'Marco e Sara bambini' },
  { layout: 'two-horizontal', seed: 'ugo-g5', w: 1200, h: 800, caption: 'Cantiere navale, anni Settanta' },
  { layout: 'two-horizontal', seed: 'ugo-g6', w: 1200, h: 800, caption: 'Primo giorno in università' },
  { layout: 'three-mixed', seed: 'ugo-g7', w: 900, h: 900, caption: 'Barca a vela verso la Corsica' },
  { layout: 'three-mixed', seed: 'ugo-g8', w: 900, h: 900, caption: 'Acquerelli al tavolo' },
  { layout: 'three-mixed', seed: 'ugo-g9', w: 900, h: 900, caption: 'Torta alla genovese' },
];

/** Max 10 media per biography (DB trigger) — 1 cover_a5 + 9 gallery */
const COVER_A5 = {
  layout: 'cover_a5',
  seed: 'ugo-cover-a5-genova',
  w: 880,
  h: 1250,
  caption: 'Copertina A5 personalizzata — Genova',
};

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get('content-type') || 'image/jpeg';
  return { buf, contentType: ct };
}

function storagePathFromUrl(fileUrl) {
  try {
    const parts = new URL(fileUrl).pathname.split('/biography-photos/');
    if (parts[1]) return decodeURIComponent(parts[1]);
  } catch {
    /* ignore */
  }
  return null;
}

async function uploadPhoto(supabase, userId, biographyId, spec, displayOrder) {
  const url = picsum(spec.seed, spec.w, spec.h);
  const { buf, contentType } = await downloadImage(url);
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  const fileName = `seed-${spec.seed}.${ext}`;
  const storagePath = `${userId}/${biographyId}/${fileName}`;

  const { error: upErr } = await supabase.storage
    .from('biography-photos')
    .upload(storagePath, buf, { contentType, cacheControl: '3600', upsert: true });

  if (upErr) throw new Error(`Upload ${storagePath}: ${upErr.message}`);

  const { data: urlData } = supabase.storage.from('biography-photos').getPublicUrl(storagePath);
  const fileUrl = urlData.publicUrl;

  const { error: insErr } = await supabase.from('biography_media').insert({
    biography_id: biographyId,
    user_id: userId,
    file_url: fileUrl,
    file_name: fileName,
    caption: spec.caption ?? '',
    layout: spec.layout,
    display_order: displayOrder,
  });

  if (insErr) throw new Error(`Insert media: ${insErr.message}`);
  return fileUrl;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: bio, error: bioErr } = await supabase
    .from('biographies')
    .select('id, user_id, title')
    .eq('id', BIOGRAPHY_ID)
    .maybeSingle();

  if (bioErr || !bio) {
    console.error('Biography not found:', BIOGRAPHY_ID, bioErr?.message);
    process.exit(1);
  }

  const userId = bio.user_id;
  console.log(`Seeding "${bio.title}" (${BIOGRAPHY_ID}) for user ${userId}…`);

  const { data: existingMedia } = await supabase
    .from('biography_media')
    .select('id, file_url')
    .eq('biography_id', BIOGRAPHY_ID);

  const pathsToRemove = (existingMedia ?? [])
    .map((r) => storagePathFromUrl(r.file_url))
    .filter(Boolean);

  if (pathsToRemove.length) {
    await supabase.storage.from('biography-photos').remove(pathsToRemove);
  }
  if (existingMedia?.length) {
    await supabase.from('biography_media').delete().eq('biography_id', BIOGRAPHY_ID);
  }

  console.log('Uploading cover A5 (custom print, full bleed)…');
  await uploadPhoto(supabase, userId, BIOGRAPHY_ID, COVER_A5, 0);

  console.log(`Uploading ${GALLERY_PLAN.length} gallery photos (max 9 with cover_a5 = 10 total)…`);
  for (let i = 0; i < GALLERY_PLAN.length; i++) {
    const spec = GALLERY_PLAN[i];
    process.stdout.write(`  ${i + 1}/${GALLERY_PLAN.length} ${spec.layout}… `);
    await uploadPhoto(supabase, userId, BIOGRAPHY_ID, spec, i + 1);
    console.log('ok');
  }

  const content = buildContent();
  const finalVersion = buildFinalVersion(content);

  const { error: updErr } = await supabase
    .from('biographies')
    .update({
      content,
      final_version: finalVersion,
      status: 'final_version',
      pdf_draft_iteration: null,
      draft_ai_feedback: null,
      pdf_draft_started_at: null,
      ai_screening_status: null,
      published_at: null,
      final_pdf_url: null,
      final_pdf_approved_at: null,
    })
    .eq('id', BIOGRAPHY_ID);

  if (updErr) throw new Error(updErr.message);

  await supabase.from('section_completions').delete().eq('biography_id', BIOGRAPHY_ID);
  const { error: scErr } = await supabase.from('section_completions').insert(
    SECTIONS.map((s) => ({
      user_id: userId,
      biography_id: BIOGRAPHY_ID,
      section_key: s.key,
      completed_at: new Date().toISOString(),
    }))
  );
  if (scErr) throw new Error(scErr.message);

  const { count } = await supabase
    .from('biography_media')
    .select('id', { count: 'exact', head: true })
    .eq('biography_id', BIOGRAPHY_ID);

  console.log('\nDone.');
  console.log(`  Sections: ${SECTIONS.length} (8 paragraphs each)`);
  console.log(`  Media rows: ${count ?? '?'} (1 cover_a5 + ${GALLERY_PLAN.length} gallery)`);
  console.log(`  Status: final_version`);
  console.log(`  Open: /biography/${BIOGRAPHY_ID}/edit`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
