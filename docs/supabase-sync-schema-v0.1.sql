-- Learn English cloud sync schema draft v0.1
-- Target: Supabase Postgres + Supabase Auth

create table if not exists public.learning_sync_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_key text not null,
  storage_value text not null,
  value_hash text not null,
  size_bytes integer not null default 0,
  device_id text not null,
  client_updated_at timestamptz not null,
  server_updated_at timestamptz not null default now(),
  unique (user_id, storage_key)
);

create table if not exists public.learning_sync_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  schema_version integer not null,
  record_count integer not null default 0,
  total_bytes integer not null default 0,
  records jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.learning_sync_records enable row level security;
alter table public.learning_sync_snapshots enable row level security;

create policy "Users can read their learning sync records"
  on public.learning_sync_records
  for select
  using (auth.uid() = user_id);

create policy "Users can upsert their learning sync records"
  on public.learning_sync_records
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read their learning sync snapshots"
  on public.learning_sync_snapshots
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their learning sync snapshots"
  on public.learning_sync_snapshots
  for insert
  with check (auth.uid() = user_id);
