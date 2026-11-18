-- FILE: supabase/schema.sql
-- PURPOSE: All tables for Sattva Heals (docs/ARCHITECTURE.md §4). Run once in Supabase → SQL Editor.
-- Rules: every table has Row Level Security; a user can only touch their own rows.
-- Deleting the auth user deletes all their rows (on delete cascade) — used by "Delete my data".

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

-- ── Prana chat limits (CORE_LOGIC §7.0) ─────────────────────────────────────────────
-- Counts only — never message text. RLS is on with no policies, so the browser can't read or write these;
-- only the server (service role) calls chat_check_and_count().
create table if not exists public.chat_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_start timestamptz, window_count int not null default 0,
  day date, day_count int not null default 0,
  strikes int not null default 0, strikes_since timestamptz,
  locked_until timestamptz
);
create table if not exists public.chat_global (day date primary key, gemini_calls int not null default 0);
alter table public.chat_usage enable row level security;
alter table public.chat_global enable row level security;

-- One atomic call per message. Returns: 'ok' | 'strike' | 'locked' | 'rate' | 'cap'.
--   locked  → 3 strikes within 24 h lock chat for 24 h
--   rate    → more than 10 messages in 10 minutes, or 40 in a day
--   cap     → the whole site has used today's Gemini allowance (p_cap)
create or replace function public.chat_check_and_count(p_uid uuid, p_strike boolean, p_gemini boolean, p_cap int)
returns text language plpgsql security definer set search_path = public as $$
declare u public.chat_usage; calls int;
begin
  insert into chat_usage (user_id) values (p_uid) on conflict do nothing;
  select * into u from chat_usage where user_id = p_uid for update;
  if u.locked_until > now() then return 'locked'; end if;
  if u.window_start is null or u.window_start < now() - interval '10 minutes' then u.window_start := now(); u.window_count := 0; end if;
  if u.day is distinct from current_date then u.day := current_date; u.day_count := 0; end if;
  if u.window_count >= 10 or u.day_count >= 40 then
    update chat_usage set window_start = u.window_start, window_count = u.window_count, day = u.day, day_count = u.day_count where user_id = p_uid;
    return 'rate';
  end if;
  u.window_count := u.window_count + 1; u.day_count := u.day_count + 1;
  if p_strike then
    if u.strikes_since is null or u.strikes_since < now() - interval '24 hours' then u.strikes := 0; u.strikes_since := now(); end if;
    u.strikes := u.strikes + 1;
    if u.strikes >= 3 then u.locked_until := now() + interval '24 hours'; end if;
  end if;
  update chat_usage set window_start = u.window_start, window_count = u.window_count, day = u.day, day_count = u.day_count,
    strikes = u.strikes, strikes_since = u.strikes_since, locked_until = u.locked_until where user_id = p_uid;
  if p_strike then return case when u.strikes >= 3 then 'locked' else 'strike' end; end if;
  if p_gemini then
    insert into chat_global (day, gemini_calls) values (current_date, 1)
      on conflict (day) do update set gemini_calls = chat_global.gemini_calls + 1 returning gemini_calls into calls;
    if calls > p_cap then return 'cap'; end if;
  end if;
  return 'ok';
end $$;
revoke all on function public.chat_check_and_count(uuid, boolean, boolean, int) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.chat_check_and_count(uuid, boolean, boolean, int) to service_role;
  end if;
end $$;
