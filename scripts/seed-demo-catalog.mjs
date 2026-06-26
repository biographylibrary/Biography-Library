/**
 * Seed four public demo biographies (IT, EN, FR, DE) for the catalogue.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local — dev only.
 *
 * Usage: node scripts/seed-demo-catalog.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const DEMO_PASSWORD = 'DemoCatalog2026!';

const DEMOS = [
  {
    email: 'demo-author-it@biographylibrary.test',
    name: 'Demo Autore IT',
    language: 'it',
    content_language: 'it',
    slug: 'demo-mia-storia-it',
    title: 'La mia storia',
    author_name: 'Elena Rossi',
    sections: [
      {
        key: 'childhood',
        title: 'Infanzia',
        text: '<p>Sono nata a Lugano, tra il lago e le montagne. I pomeriggi d\'estate li passavo in cortile con mia nonna, che raccontava storie di un\'altra epoca mentre preparava la polenta.</p><p>Quella casa odorava di legno e di pane appena sfornato. Ancora oggi, quando sento quell\'odore, mi torna in mente il suo sorriso.</p>',
      },
      {
        key: 'career',
        title: 'Carriera',
        text: '<p>Dopo gli studi in pedagogia ho insegnato per trent\'anni. Ogni classe era diversa, ogni anno una nuova sfida. Ho imparato che ascoltare conta più di spiegare.</p>',
      },
      {
        key: 'legacy',
        title: 'Eredità',
        text: '<p>Questa biografia è un dono ai miei nipoti: non solo fatti, ma il modo in cui ho vissuto le piccole cose quotidiane che fanno una vita.</p>',
      },
    ],
    coverSeed: 'demo-it-cover',
  },
  {
    email: 'demo-author-en@biographylibrary.test',
    name: 'Demo Author EN',
    language: 'en',
    content_language: 'en',
    slug: 'demo-my-story-en',
    title: 'My Story',
    author_name: 'James Whitfield',
    sections: [
      {
        key: 'childhood',
        title: 'Childhood',
        text: '<p>I grew up in a small coastal town where the fog rolled in every morning. My father repaired boats; my mother kept a notebook of recipes she never wrote down for anyone else.</p><p>Sundays meant long walks on the pier and stories about sailors who never came home.</p>',
      },
      {
        key: 'career',
        title: 'Career',
        text: '<p>I became a nurse because I wanted to be useful on the hardest days. The work taught me patience, and how much courage quiet people can have.</p>',
      },
      {
        key: 'legacy',
        title: 'Legacy',
        text: '<p>I write this so my children know where they come from — not just places, but values: kindness, persistence, and laughter at the kitchen table.</p>',
      },
    ],
    coverSeed: 'demo-en-cover',
  },
  {
    email: 'demo-author-fr@biographylibrary.test',
    name: 'Demo Auteur FR',
    language: 'fr',
    content_language: 'fr',
    slug: 'demo-mon-histoire-fr',
    title: 'Mon histoire',
    author_name: 'Marie Dubois',
    sections: [
      {
        key: 'childhood',
        title: 'Enfance',
        text: '<p>J\'ai grandi à Lyon, entre les marchés colorés et les cloches de l\'église du quartier. Ma mère cousait des robes; mon grand-père me lisait des poèmes le soir.</p><p>Ces soirées m\'ont appris que les mots peuvent réchauffer autant qu\'un feu.</p>',
      },
      {
        key: 'career',
        title: 'Carrière',
        text: '<p>J\'ai travaillé dans une bibliothèque municipale pendant vingt-cinq ans. Chaque livre rendu était une petite histoire de vie qui passait entre mes mains.</p>',
      },
      {
        key: 'legacy',
        title: 'Héritage',
        text: '<p>Je laisse ces pages à ceux qui viendront après moi, pour qu\'ils sachent d\'où vient notre famille et ce que nous avons aimé.</p>',
      },
    ],
    coverSeed: 'demo-fr-cover',
  },
  {
    email: 'demo-author-de@biographylibrary.test',
    name: 'Demo Autor DE',
    language: 'de',
    content_language: 'de',
    slug: 'demo-meine-geschichte-de',
    title: 'Meine Geschichte',
    author_name: 'Hans Müller',
    sections: [
      {
        key: 'childhood',
        title: 'Kindheit',
        text: '<p>Ich bin in einem Dorf bei Zürich aufgewachsen. Im Winter roch es nach Holzofen, im Sommer nach frisch gemähtem Gras. Mein Vater war Uhrmacher, meine Mutter Lehrerin.</p><p>Sie zeigten mir, dass Genauigkeit und Geduld Hand in Hand gehen.</p>',
      },
      {
        key: 'career',
        title: 'Beruf',
        text: '<p>Ich wurde Ingenieur und half beim Bau von Brücken in der ganzen Schweiz. Jedes Bauwerk war ein Versprechen, Menschen sicher von einem Ufer zum anderen zu bringen.</p>',
      },
      {
        key: 'legacy',
        title: 'Vermächtnis',
        text: '<p>Diese Biografie ist für meine Enkel: damit sie wissen, wer wir waren, und dass ein einfaches Leben reich sein kann.</p>',
      },
    ],
    coverSeed: 'demo-de-cover',
  },
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

function picsum(seed, w, h) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}.jpg`;
}

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get('content-type') || 'image/jpeg';
  return { buf, contentType: ct };
}

async function ensureUser(supabase, demo) {
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users?.find((u) => u.email === demo.email);
  if (existing) return existing.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email: demo.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { name: demo.name },
  });
  if (error) throw new Error(`Create user ${demo.email}: ${error.message}`);
  return data.user.id;
}

async function ensureProfile(supabase, userId, demo) {
  await supabase.from('profiles').upsert({
    id: userId,
    email: demo.email,
    name: demo.name,
    language: demo.language,
    language_confirmed_at: new Date().toISOString(),
    onboarding_completed_at: new Date().toISOString(),
  });
}

function buildContent(demo) {
  const content = {};
  for (const s of demo.sections) {
    content[s.key] = { text: s.text, todo: false, audioTranscript: '' };
  }
  return content;
}

function buildFinalVersion(demo) {
  return demo.sections.map((s) => `<h2>${s.title}</h2>\n\n${s.text}`).join('\n\n');
}

async function uploadCover(supabase, userId, biographyId, seed) {
  const url = picsum(seed, 900, 1200);
  const { buf, contentType } = await downloadImage(url);
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  const fileName = `demo-cover-${seed}.${ext}`;
  const storagePath = `${userId}/${biographyId}/${fileName}`;

  await supabase.storage.from('biography-photos').upload(storagePath, buf, {
    contentType,
    cacheControl: '3600',
    upsert: true,
  });

  const { data: urlData } = supabase.storage.from('biography-photos').getPublicUrl(storagePath);
  const fileUrl = urlData.publicUrl;

  await supabase.from('biography_media').delete().eq('biography_id', biographyId).in('layout', ['cover', 'cover_a5']);
  await supabase.from('biography_media').insert({
    biography_id: biographyId,
    user_id: userId,
    file_url: fileUrl,
    file_name: fileName,
    caption: 'Demo cover',
    layout: 'cover',
    display_order: 0,
  });

  return fileUrl;
}

async function ensureBiography(supabase, userId, demo) {
  const { data: existing } = await supabase
    .from('biographies')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  const content = buildContent(demo);
  const finalVersion = buildFinalVersion(demo);
  const listingCover = picsum(`${demo.coverSeed}-listing`, 400, 560);
  const now = new Date().toISOString();

  const payload = {
    user_id: userId,
    title: demo.title,
    author_name: demo.author_name,
    content,
    final_version: finalVersion,
    content_language: demo.content_language,
    visibility: 'public',
    status: 'published',
    slug: demo.slug,
    biography_type: 'autobiography',
    biography_mode: 'sections',
    published_at: now,
    listing_cover_url: listingCover,
    chapters_count: demo.sections.length,
    ai_screening_status: 'passed',
  };

  if (existing?.id) {
    const { error } = await supabase.from('biographies').update(payload).eq('id', existing.id);
    if (error) throw new Error(error.message);
    return existing.id;
  }

  const { data, error } = await supabase.from('biographies').insert(payload).select('id').single();
  if (error) throw new Error(error.message);
  return data.id;
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
  console.log('Seeding demo catalogue (4 biographies)…\n');

  for (const demo of DEMOS) {
    process.stdout.write(`${demo.content_language.toUpperCase()} ${demo.title}… `);
    const userId = await ensureUser(supabase, demo);
    await ensureProfile(supabase, userId, demo);
    const bioId = await ensureBiography(supabase, userId, demo);
    await uploadCover(supabase, userId, bioId, demo.coverSeed);
    console.log(`ok → /biography/${demo.slug}/view`);
  }

  console.log('\nDone. Open /biographies to see the catalogue.');
  console.log(`Demo accounts password (all): ${DEMO_PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
