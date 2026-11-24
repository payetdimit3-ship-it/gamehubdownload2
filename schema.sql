-- Zuri Studio: endesha SQL hii MOJA kwenye Supabase -> SQL Editor
create table if not exists profiles (
  id uuid primary key,
  email text,
  role text not null default 'user',
  active boolean not null default true,
  daily_limit int not null default 40,
  created_at timestamptz not null default now()
);
create table if not exists user_data (
  user_id uuid primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists app_secrets (
  id int primary key default 1,
  keys jsonb not null default '{}'::jsonb,
  models jsonb not null default '{}'::jsonb,
  active_provider text not null default 'auto'
);
insert into app_secrets (id) values (1) on conflict do nothing;
create table if not exists usage (
  user_id uuid not null,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);
create table if not exists site_files (
  id bigserial primary key,
  name text not null,
  content text not null,
  created_at timestamptz not null default now()
);
-- Usalama: hakuna mtu anayeweza kusoma jedwali hizi moja kwa moja kutoka kwenye browser.
-- Ni server yako tu (service key) inayoweza kuzifikia.
alter table profiles enable row level security;
alter table user_data enable row level security;
alter table app_secrets enable row level security;
alter table usage enable row level security;
alter table site_files enable row level security;
