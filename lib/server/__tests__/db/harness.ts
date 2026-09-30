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
} as const;

export const BIO = {
  draft: '10000000-0000-0000-0000-000000000001',
  published: '10000000-0000-0000-0000-000000000002',
  underReview: '10000000-0000-0000-0000-000000000003',
  removed: '10000000-0000-0000-0000-000000000004',
  suspended: '10000000-0000-0000-0000-000000000005',
  otherDraft: '10000000-0000-0000-0000-000000000006',
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

create table public.profiles (
  id uuid primary key,
  email text not null,
  name text,
  language text,
  ui_font_size integer,
  created_at timestamptz default now(),
  ai_features_enabled boolean not null default false,
  role text not null default 'user',
  account_status text not null default 'waitlist',
  legal_declaration_type text,
  legal_declaration_accepted_at timestamptz,
  legal_declaration_version text default '2026-06',
  welcome_email_sent_at timestamptz,
  waitlist_granted_at timestamptz
);

create function public.get_my_role() returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() limit 1
$$;
create function public.get_my_account_status() returns text language sql stable security definer set search_path = public as $$
  select account_status from public.profiles where id = auth.uid() limit 1
$$;

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
  published_at_iso date,
  published_um_year integer,
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

alter table public.profiles enable row level security;
alter table public.biographies enable row level security;
alter table public.moderation_reports enable row level security;

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
  ('${U.waitlist}', 'wait@test', 'user', 'waitlist');

insert into public.biographies (id, user_id, status, title, published_at) values
  ('${BIO.draft}', '${U.author}', 'draft', 'Bozza', null),
  ('${BIO.published}', '${U.author}', 'published', 'Pubblicata', now()),
  ('${BIO.underReview}', '${U.author}', 'under_review', 'In revisione', null),
  ('${BIO.removed}', '${U.author}', 'removed', 'Rimossa', null),
  ('${BIO.suspended}', '${U.author}', 'suspended_pending_verification', 'Sospesa', null),
  ('${BIO.otherDraft}', '${U.other}', 'draft', 'Di un altro', null);
`;

/** Riporta i dati allo stato iniziale (come postgres: i trigger lasciano passare). */
export async function reseed(db: PGlite): Promise<void> {
  await db.exec(
    'delete from public.ai_token_usage; delete from public.moderation_reports; delete from public.biographies; delete from public.profiles;'
  );
  await db.exec(SEED);
}

export type DbRole = 'authenticated' | 'anon' | 'service_role' | 'postgres';

export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(BOOTSTRAP);
  await db.exec(readFileSync(join(MIGRATIONS, '20260930120000_server_only_columns_and_reports.sql'), 'utf8'));
  await db.exec(readFileSync(join(MIGRATIONS, '20260930120300_ai_token_usage.sql'), 'utf8'));
  await db.exec(SEED);
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
