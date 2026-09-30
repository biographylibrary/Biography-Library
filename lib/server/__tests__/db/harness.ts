import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

/**
 * Database di prova in memoria (PGlite, Postgres vero compilato in WASM): mai la
 * produzione. Riproduce ruoli, auth.uid(), get_my_role() e le policy RLS di
 * produzione per le tabelle in esame, poi esegue le migrazioni VERE del
 * repository. Se una migrazione non fa quello che dice, i test falliscono qui.
 */
const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations');

export const U = {
  author: '00000000-0000-0000-0000-00000000a001',
  other: '00000000-0000-0000-0000-00000000a002',
  staff: '00000000-0000-0000-0000-00000000b001',
  waitlist: '00000000-0000-0000-0000-00000000c001',
  /** Utenti attivi senza nessuna biografia (una sola per utente). */
  fresh: '00000000-0000-0000-0000-00000000e001',
  fresh2: '00000000-0000-0000-0000-00000000e002',
} as const;

export const BIO = {
  draft: '10000000-0000-0000-0000-000000000001',
  published: '10000000-0000-0000-0000-000000000002',
  underReview: '10000000-0000-0000-0000-000000000003',
  removed: '10000000-0000-0000-0000-000000000004',
  suspended: '10000000-0000-0000-0000-000000000005',
  otherDraft: '10000000-0000-0000-0000-000000000006',
  lockedPending: '10000000-0000-0000-0000-000000000007',
  pdfDraft: '10000000-0000-0000-0000-000000000008',
  finalVersion: '10000000-0000-0000-0000-000000000009',
  revisionRequested: '10000000-0000-0000-0000-00000000000a',
  revisionPending: '10000000-0000-0000-0000-00000000000b',
  revisionOverdue: '10000000-0000-0000-0000-00000000000c',
  sectionsComplete: '10000000-0000-0000-0000-00000000000d',
} as const;

const BOOTSTRAP = `
create role authenticated nologin;
create role anon nologin;
create role service_role nologin bypassrls;

create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth, public to authenticated, anon, service_role;
-- Come in Supabase: le tabelle nuove nascono con tutti i privilegi ai ruoli API.
alter default privileges in schema public grant all on tables to authenticated, anon, service_role;
grant execute on function auth.uid() to public;

create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb
);

create table public.profiles (
  id uuid primary key,
  email text not null,
  name text,
  language text,
  language_confirmed_at timestamptz,
  ui_font_size text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  ai_features_enabled boolean not null default false,
  role text not null default 'user',
  account_status text not null default 'waitlist',
  legal_declaration_type text,
  legal_declaration_accepted_at timestamptz,
  legal_declaration_version text default '2026-06',
  welcome_email_sent_at timestamptz,
  waitlist_granted_at timestamptz,
  onboarding_phase text,
  onboarding_wizard_step text,
  onboarding_writing_path text,
  onboarding_skipped_at timestamptz,
  onboarding_completed_at timestamptz
);

create function public.get_my_role() returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() limit 1
$$;
create function public.get_my_account_status() returns text language sql stable security definer set search_path = public as $$
  select account_status from public.profiles where id = auth.uid() limit 1
$$;

create sequence public.biography_host_seq;

-- Colonne e valori predefiniti di public.biographies come in produzione (30 settembre 2026).
create table public.biographies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  title text not null default '',
  content jsonb default '{}'::jsonb,
  visibility text not null default 'private',
  status text not null default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  share_token text,
  completed_at timestamptz,
  content_language text not null default 'en',
  editor_font_size integer default 16,
  final_version text default '',
  narrative_order jsonb default '[]'::jsonb,
  published_at timestamptz,
  author_name text not null default '',
  frozen_at timestamptz,
  frozen_reason text,
  last_chapter_published_at timestamptz,
  next_chapter_available_at timestamptz,
  chapters_count integer not null default 0,
  linked_biography_ids jsonb not null default '[]'::jsonb,
  is_frozen boolean not null default false,
  view_count integer not null default 0,
  is_featured boolean not null default false,
  featured_at timestamptz,
  featured_by uuid,
  biography_mode text not null default 'sections',
  content_freeflow text,
  biography_type text not null default 'autobiography',
  slug text,
  ai_screening_status text default 'pending',
  pdf_draft_iteration integer,
  reviewed_by uuid,
  reviewed_at timestamptz,
  export_txt_url text,
  export_docx_url text,
  pdf_draft_started_at timestamptz,
  final_pdf_approved_at timestamptz,
  final_pdf_url text,
  listing_cover_url text,
  draft_ai_feedback jsonb,
  chapter_available_email_sent_at timestamptz,
  pdf_draft_reminder_sent_at timestamptz,
  subject_name text,
  um_id text,
  schema_version integer not null default 2,
  record_language_tag text,
  record_script text,
  record_direction text,
  record_language_endonym text,
  name_as_written text,
  name_given text,
  name_family text,
  name_order text,
  name_romanized text,
  romanization_system text,
  published_at_iso date,
  published_um_year integer,
  rights_statement_uri text,
  rights_chosen_at timestamptz,
  rights_holder text,
  consent_basis text,
  consent_recorded_at timestamptz,
  content_html_legacy jsonb,
  provisional_until timestamptz,
  revised_at timestamptz,
  is_pioneer boolean not null default false
);

create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  biography_id uuid references public.biographies(id),
  reporter_id uuid,
  report_type text,
  description text,
  status text not null default 'unassigned',
  ai_analysis jsonb default '{}'::jsonb,
  ai_violation_level integer,
  decision text,
  origin text,
  created_at timestamptz default now()
);

create table public.section_completions (
  id uuid primary key default gen_random_uuid(),
  biography_id uuid not null references public.biographies(id) on delete cascade,
  user_id uuid not null,
  section_key text not null,
  completed_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (biography_id, section_key)
);

create table public.biography_media (
  id uuid primary key default gen_random_uuid(),
  biography_id uuid not null references public.biographies(id) on delete cascade,
  user_id uuid not null,
  file_url text not null,
  file_name text,
  caption text default '',
  layout text not null default 'full-page',
  display_order integer not null default 0,
  created_at timestamptz default now()
);

create function public.check_biography_media_limit() returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.layout in ('cover', 'cover_a5') then return new; end if;
  if (select count(*) from public.biography_media where biography_id = new.biography_id and layout not in ('cover','cover_a5')) >= 30 then
    raise exception 'A biography may have at most 30 gallery photos.';
  end if;
  return new;
end; $$;
create trigger enforce_biography_media_limit before insert on public.biography_media
  for each row execute function public.check_biography_media_limit();


create table public.biography_sections (
  id uuid primary key default gen_random_uuid(),
  biography_id uuid not null references public.biographies(id) on delete cascade,
  section_name text,
  content text,
  audio_transcript text,
  created_at timestamptz default now(),
  status varchar default 'in_progress',
  draft_version integer default 1,
  approved_at timestamptz,
  revision_history jsonb default '[]'::jsonb,
  section_key text,
  unique (biography_id, section_key)
);

create table public.biography_book_structure (
  id uuid primary key default gen_random_uuid(),
  biography_id uuid not null references public.biographies(id) on delete cascade,
  user_id uuid not null,
  dedication_content text,
  epigraph_content text,
  epigraph_source text,
  preface_content text,
  epilogue_content text,
  acknowledgements_content text,
  specific_credits_content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.person_events (
  id uuid primary key default gen_random_uuid(),
  biography_id uuid not null references public.biographies(id) on delete cascade,
  event_type text not null,
  event_label text,
  sequence integer,
  date_as_given text,
  place_name_as_given text,
  source_note text,
  created_at timestamptz default now()
);

create table public.person_relations (
  id uuid primary key default gen_random_uuid(),
  biography_id uuid not null references public.biographies(id) on delete cascade,
  relation_code text not null,
  relation_label text,
  related_name_as_written text,
  source_note text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.biographies enable row level security;
alter table public.moderation_reports enable row level security;
alter table public.section_completions enable row level security;
alter table public.biography_media enable row level security;
alter table public.biography_sections enable row level security;
alter table public.biography_book_structure enable row level security;
alter table public.person_events enable row level security;
alter table public.person_relations enable row level security;

create policy "Users can read own section completions" on public.section_completions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert own section completions" on public.section_completions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own section completions" on public.section_completions for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete own section completions" on public.section_completions for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read own media" on public.biography_media for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert own media" on public.biography_media for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own media" on public.biography_media for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete own media" on public.biography_media for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Policy come in produzione (30 settembre 2026): la proprietà, mai lo stato della scheda.
create policy "Users can read own biography sections" on public.biography_sections for select to authenticated
  using (exists (select 1 from public.biographies b where b.id = biography_sections.biography_id and b.user_id = (select auth.uid())));
create policy "Users can insert own biography sections" on public.biography_sections for insert to authenticated
  with check (exists (select 1 from public.biographies b where b.id = biography_sections.biography_id and b.user_id = (select auth.uid())));
create policy "Users can update own biography sections" on public.biography_sections for update to authenticated
  using (exists (select 1 from public.biographies b where b.id = biography_sections.biography_id and b.user_id = (select auth.uid())))
  with check (exists (select 1 from public.biographies b where b.id = biography_sections.biography_id and b.user_id = (select auth.uid())));
create policy "Users can delete own biography sections" on public.biography_sections for delete to authenticated
  using (exists (select 1 from public.biographies b where b.id = biography_sections.biography_id and b.user_id = (select auth.uid())));

create policy "Users can select own book structure" on public.biography_book_structure for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can insert own book structure" on public.biography_book_structure for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can update own book structure" on public.biography_book_structure for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own book structure" on public.biography_book_structure for delete to authenticated
  using (auth.uid() = user_id);

create policy "person_events: owner select" on public.person_events for select to authenticated
  using (exists (select 1 from public.biographies b where b.id = person_events.biography_id and b.user_id = (select auth.uid())));
create policy "person_events: owner insert" on public.person_events for insert to authenticated
  with check (exists (select 1 from public.biographies b where b.id = person_events.biography_id and b.user_id = (select auth.uid()) and coalesce(b.is_frozen, false) = false));
create policy "person_events: owner update" on public.person_events for update to authenticated
  using (exists (select 1 from public.biographies b where b.id = person_events.biography_id and b.user_id = (select auth.uid()) and coalesce(b.is_frozen, false) = false))
  with check (exists (select 1 from public.biographies b where b.id = person_events.biography_id and b.user_id = (select auth.uid()) and coalesce(b.is_frozen, false) = false));
create policy "person_events: owner delete" on public.person_events for delete to authenticated
  using (exists (select 1 from public.biographies b where b.id = person_events.biography_id and b.user_id = (select auth.uid()) and coalesce(b.is_frozen, false) = false));

create policy "person_relations: owner select" on public.person_relations for select to authenticated
  using (exists (select 1 from public.biographies b where b.id = person_relations.biography_id and b.user_id = (select auth.uid())));
create policy "person_relations: owner insert" on public.person_relations for insert to authenticated
  with check (exists (select 1 from public.biographies b where b.id = person_relations.biography_id and b.user_id = (select auth.uid()) and coalesce(b.is_frozen, false) = false));
create policy "person_relations: owner update" on public.person_relations for update to authenticated
  using (exists (select 1 from public.biographies b where b.id = person_relations.biography_id and b.user_id = (select auth.uid()) and coalesce(b.is_frozen, false) = false))
  with check (exists (select 1 from public.biographies b where b.id = person_relations.biography_id and b.user_id = (select auth.uid()) and coalesce(b.is_frozen, false) = false));
create policy "person_relations: owner delete" on public.person_relations for delete to authenticated
  using (exists (select 1 from public.biographies b where b.id = person_relations.biography_id and b.user_id = (select auth.uid()) and coalesce(b.is_frozen, false) = false));

-- Policy come in produzione (30 settembre 2026), prima della migrazione.
create policy "Users can insert own profile" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "Users can read own profile" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "Admins can read all profiles" on public.profiles for select to authenticated
  using (get_my_role() = any (array['admin','super_admin']));
create policy "Users can update own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Biographies: owner or public access" on public.biographies for select to authenticated
  using (get_my_role() = any (array['reviewer','admin','super_admin'])
    or (status <> 'removed' and user_id = (select auth.uid())));
create policy "Users can insert own biographies" on public.biographies for insert to authenticated
  with check (((select auth.uid()) = user_id) and (get_my_account_status() = 'active'));
create policy "Biographies: owner or staff can update, blocked if frozen" on public.biographies for update to authenticated
  using ((user_id = (select auth.uid()) and not is_frozen and get_my_account_status() = 'active')
    or get_my_role() = any (array['reviewer','admin','super_admin']))
  with check ((user_id = (select auth.uid()) and not is_frozen and get_my_account_status() = 'active')
    or get_my_role() = any (array['reviewer','admin','super_admin']));

create policy "Users can delete own biographies" on public.biographies for delete to authenticated
  using (((select auth.uid()) = user_id) and (get_my_account_status() = 'active'));

create policy "Any authenticated user can file a report" on public.moderation_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create policy "Anonymous users can file a report without reporter_id" on public.moderation_reports for insert to anon
  with check (reporter_id is null);
create policy "Reporters see own reports; staff see all" on public.moderation_reports for select to authenticated
  using ((select auth.uid()) = reporter_id or get_my_role() = any (array['reviewer','admin','super_admin']));
create policy "Staff can update reports" on public.moderation_reports for update to authenticated
  using (get_my_role() = any (array['reviewer','admin','super_admin']))
  with check (get_my_role() = any (array['reviewer','admin','super_admin']));

-- Privilegi di default di Supabase: tutto concesso ai ruoli API.
grant all on all tables in schema public to authenticated, anon, service_role;
`;

const SEED = `
insert into public.profiles (id, email, role, account_status) values
  ('${U.author}', 'author@test', 'user', 'active'),
  ('${U.other}', 'other@test', 'user', 'active'),
  ('${U.staff}', 'staff@test', 'reviewer', 'active'),
  ('${U.waitlist}', 'wait@test', 'user', 'waitlist'),
  ('${U.fresh}', 'fresh@test', 'user', 'active'),
  ('${U.fresh2}', 'fresh2@test', 'user', 'active');

insert into public.biographies (id, user_id, status, title, published_at) values
  ('${BIO.draft}', '${U.author}', 'draft', 'Bozza', null),
  ('${BIO.published}', '${U.author}', 'published', 'Pubblicata', now()),
  ('${BIO.underReview}', '${U.author}', 'under_review', 'In revisione', null),
  ('${BIO.removed}', '${U.author}', 'removed', 'Rimossa', null),
  ('${BIO.suspended}', '${U.author}', 'suspended_pending_verification', 'Sospesa', null),
  ('${BIO.otherDraft}', '${U.other}', 'draft', 'Di un altro', null),
  ('${BIO.lockedPending}', '${U.author}', 'locked_pending_screening', 'In attesa di screening', null),
  ('${BIO.pdfDraft}', '${U.author}', 'pdf_draft', 'Bozza PDF', null),
  ('${BIO.finalVersion}', '${U.author}', 'final_version', 'Versione finale', null),
  ('${BIO.revisionRequested}', '${U.author}', 'revision_requested', 'Revisione chiesta', null),
  ('${BIO.revisionPending}', '${U.author}', 'revision_pending_review', 'Revisione inviata', null),
  ('${BIO.revisionOverdue}', '${U.author}', 'revision_overdue', 'Revisione scaduta', null),
  ('${BIO.sectionsComplete}', '${U.author}', 'sections_complete', 'Sezioni complete', null);
`;

/**
 * Riporta i dati allo stato iniziale. I dati di partenza sono inseriti con i
 * trigger ordinari spenti (session_replication_role = replica): altrimenti il
 * trigger "una biografia per utente" impedirebbe di preparare più schede in stati
 * diversi per lo stesso autore.
 */
export async function reseed(db: PGlite): Promise<void> {
  await db.exec(`
    set session_replication_role = replica;
    do $$ begin
      -- Le tabelle delle migrazioni più recenti possono mancare (prove sul ritorno indietro).
      if to_regclass('public.ai_token_usage') is not null then delete from public.ai_token_usage; end if;
      if to_regclass('public.publication_records') is not null then delete from public.publication_records; end if;
    end $$;
    delete from public.biography_media;
    delete from public.biography_sections;
    delete from public.biography_book_structure;
    delete from public.person_events;
    delete from public.person_relations;
    delete from public.section_completions;
    delete from public.moderation_reports;
    delete from public.biographies;
    delete from public.profiles;
    delete from auth.users;
    set session_replication_role = origin;
  `);
  await db.exec(`set session_replication_role = replica;`);
  await db.exec(SEED);
  await db.exec(`set session_replication_role = origin;`);
}

export type DbRole = 'authenticated' | 'anon' | 'service_role' | 'postgres';

export async function createTestDb(
  options: { skip?: string[]; only?: string[]; extraFiles?: string[] } = {}
): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(BOOTSTRAP);
  // Le migrazioni vere, nell'ordine in cui verranno applicate. `skip` serve solo ai
  // controlli negativi: dimostra che il banco si accorge dell'assenza di una migrazione.
  for (const file of [
    '20260930115900_align_biographies_profiles_triggers.sql',
    '20260930120000_server_only_columns_and_reports.sql',
    '20260930120100_author_text_whitelist.sql',
    '20260930120200_publication_records.sql',
    '20260930120300_ai_token_usage.sql',
  ]) {
    if (options.skip?.includes(file)) continue;
    if (options.only && !options.only.includes(file)) continue;
    await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
  }
  // File eseguiti dopo le migrazioni (percorsi dalla radice del repository): per provare il ritorno indietro.
  for (const file of options.extraFiles ?? []) {
    await db.exec(readFileSync(join(process.cwd(), file), 'utf8'));
  }
  await reseed(db);
  return db;
}

/** Esegue una query come il ruolo e l'utente indicati (come fa PostgREST con il JWT). */
export async function as<T = Record<string, unknown>>(
  db: PGlite,
  role: DbRole,
  userId: string | null,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  if (role === 'postgres') {
    return (await db.query<T>(sql, params)).rows;
  }
  await db.exec(`set role ${role}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? '']);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

/** Il messaggio dell'errore, o null se la query riesce. */
export async function errorOf(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}
