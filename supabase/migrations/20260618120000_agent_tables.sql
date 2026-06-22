-- Agent platform tables (Fase 1): threads, messages, memory, RAG, usage quotas
create extension if not exists vector;

create table agent_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  biography_id uuid references biographies(id) on delete cascade,
  agent_type text not null check (agent_type in ('platform_guide','biography_coach','publication_reviewer')),
  locale char(2) not null default 'en',
  status text not null default 'active' check (status in ('active','archived')),
  rolling_summary text default '',
  message_count int not null default 0,
  last_message_at timestamptz default now(),
  created_at timestamptz default now()
);

-- PostgreSQL: NULL in unique index does not deduplicate — separate partial indexes
create unique index agent_threads_platform_guide_active
  on agent_threads (user_id, agent_type)
  where status = 'active' and biography_id is null;

create unique index agent_threads_bio_active
  on agent_threads (user_id, biography_id, agent_type)
  where status = 'active' and biography_id is not null;

create index agent_threads_user_id_idx on agent_threads (user_id);
create index agent_threads_biography_id_idx on agent_threads (biography_id) where biography_id is not null;

create table agent_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references agent_threads(id) on delete cascade,
  role text not null check (role in ('user','assistant','tool','system')),
  content text not null default '',
  tool_calls jsonb,
  created_at timestamptz default now()
);

create index agent_messages_thread_created_idx on agent_messages (thread_id, created_at);

create table agent_memory_facts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references agent_threads(id) on delete cascade,
  fact_type text not null,
  fact_json jsonb not null,
  created_at timestamptz default now()
);

create index agent_memory_facts_thread_id_idx on agent_memory_facts (thread_id);

create table biography_chunks (
  id uuid primary key default gen_random_uuid(),
  biography_id uuid not null references biographies(id) on delete cascade,
  section_key text,
  chunk_index int not null,
  content text not null,
  text_hash text not null,
  embedding vector(3584),
  created_at timestamptz default now()
);

create index biography_chunks_biography_id_idx on biography_chunks (biography_id);
create unique index biography_chunks_unique_chunk_idx
  on biography_chunks (biography_id, section_key, chunk_index);

create table kb_chunks (
  id uuid primary key default gen_random_uuid(),
  locale char(2) not null default 'en',
  source_key text not null,
  chunk_index int not null,
  content text not null,
  text_hash text not null,
  embedding vector(3584),
  created_at timestamptz default now()
);

create unique index kb_chunks_locale_source_chunk_idx
  on kb_chunks (locale, source_key, chunk_index);
create index kb_chunks_locale_idx on kb_chunks (locale);

create table agent_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  turn_count int not null default 0,
  primary key (user_id, usage_date)
);

-- RLS: deny direct client access; gateway uses service_role after ownership checks
alter table agent_threads enable row level security;
alter table agent_messages enable row level security;
alter table agent_memory_facts enable row level security;
alter table biography_chunks enable row level security;
alter table kb_chunks enable row level security;
alter table agent_usage enable row level security;

create policy agent_threads_deny_all on agent_threads for all using (false);
create policy agent_messages_deny_all on agent_messages for all using (false);
create policy agent_memory_facts_deny_all on agent_memory_facts for all using (false);
create policy biography_chunks_deny_all on biography_chunks for all using (false);
create policy kb_chunks_deny_all on kb_chunks for all using (false);
create policy agent_usage_deny_all on agent_usage for all using (false);
