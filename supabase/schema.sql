-- FILE: supabase/schema.sql
-- PURPOSE: All tables for Sattva Heals (docs/ARCHITECTURE.md §4). Run once in Supabase → SQL Editor.
-- Rules: every table has Row Level Security; a user can only touch their own rows.
-- Deleting the auth user deletes all their rows (on delete cascade) — used by "Delete my data".
-- Chat tables are added with the chat milestone.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 30),
  prakriti jsonb not null,
  prefs jsonb not null,
  age_confirmed boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.checkins (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  mood text not null check (mood in ('anxious', 'overthinking', 'irritable', 'stressed', 'low', 'sluggish', 'okay')),
  unique (user_id, date)
);

create table if not exists public.completions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  module text not null check (module in ('dinacharya', 'ahara', 'mantra')),
  practice_id text not null,
  unique (user_id, date, module)
);

create table if not exists public.hum_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  practice_id text not null,
  kind text not null check (kind in ('bhramari', 'om')),
  rounds int not null check (rounds between 2 and 50),
  avg_hum real,
  avg_inhale real,
  steady_rounds int,
  before smallint check (before between 1 and 5),
  after smallint check (after between 1 and 5),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.checkins enable row level security;
alter table public.completions enable row level security;
alter table public.hum_sessions enable row level security;

-- One policy per table: own rows only, for every action.
create policy own_profile on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy own_checkins on public.checkins for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_completions on public.completions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_sessions on public.hum_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists completions_user_date on public.completions (user_id, date);
create index if not exists sessions_user_date on public.hum_sessions (user_id, date);
