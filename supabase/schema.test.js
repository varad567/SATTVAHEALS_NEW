/**
 * Runs supabase/schema.sql in a real Postgres (PGlite) with a stand-in for Supabase's auth schema,
 * then checks Row Level Security, constraints and cascade delete as two different users.
 * @vitest-environment node
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const A = '00000000-0000-0000-0000-00000000000a', B = '00000000-0000-0000-0000-00000000000b';
let pg;
const as = async (uid, sql, params) => {
  await pg.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`);
  return pg.query(sql, params);
};
const rows = async (uid, table) => (await as(uid, `select * from public.${table}`)).rows;

beforeAll(async () => {
  pg = new PGlite();
  // What Supabase provides out of the box: auth.users, auth.uid(), the "authenticated" role.
  await pg.exec(`
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role authenticated; create role service_role; grant usage on schema public, auth to authenticated, service_role;
    grant execute on function auth.uid() to authenticated;
    insert into auth.users values ('${A}'), ('${B}');`);
  await pg.exec(readFileSync('supabase/schema.sql', 'utf8'));
  await pg.exec('grant select, insert, update, delete on all tables in schema public to authenticated; grant usage on all sequences in schema public to authenticated;');
  const p = { prakriti: '{"dominant":"vata"}', prefs: '{"diet":"vegan"}' };
  await as(A, `insert into public.profiles (id, name, prakriti, prefs) values ($1, 'Asha', $2, $3)`, [A, p.prakriti, p.prefs]);
  await as(B, `insert into public.profiles (id, name, prakriti, prefs) values ($1, 'Ben', $2, $3)`, [B, p.prakriti, p.prefs]);
  await as(A, `insert into public.checkins (user_id, date, mood) values ($1, '2026-11-18', 'low')`, [A]);
  await as(A, `insert into public.completions (user_id, date, module, practice_id) values ($1, '2026-11-18', 'ahara', 'x')`, [A]);
  await as(A, `insert into public.hum_sessions (user_id, date, practice_id, kind, rounds) values ($1, '2026-11-18', 'man-om-6', 'om', 3)`, [A]);
});

describe('Row Level Security', () => {
  it.each(['profiles', 'checkins', 'completions', 'hum_sessions'])('%s: each user sees only their own rows', async (t) => {
    expect((await rows(B, t)).every((r) => (r.id ?? r.user_id) === B)).toBe(true);
    expect((await rows(A, t)).length).toBeGreaterThan(0);
  });
  it('a user cannot write rows for someone else', async () => {
    await expect(as(B, `insert into public.checkins (user_id, date, mood) values ($1, '2026-11-19', 'low')`, [A])).rejects.toThrow(/row-level security/);
  });
  it('a user cannot change or delete someone else’s rows (silently affects 0 rows)', async () => {
    expect((await as(B, `update public.profiles set name = 'hacked' where id = $1`, [A])).affectedRows).toBe(0);
    expect((await as(B, `delete from public.checkins where user_id = $1`, [A])).affectedRows).toBe(0);
    expect((await rows(A, 'profiles'))[0].name).toBe('Asha');
  });
  it('signed-out requests (no user id) see nothing', async () => {
    await pg.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); set role authenticated;`);
    expect((await pg.query('select * from public.profiles')).rows).toEqual([]);
  });
});

describe('Constraints', () => {
  it('one check-in per user per day; the app upserts on (user_id, date)', async () => {
    await expect(as(A, `insert into public.checkins (user_id, date, mood) values ($1, '2026-11-18', 'okay')`, [A])).rejects.toThrow(/unique/);
    await as(A, `insert into public.checkins (user_id, date, mood) values ($1, '2026-11-18', 'okay') on conflict (user_id, date) do update set mood = excluded.mood`, [A]);
    expect((await rows(A, 'checkins')).map((r) => r.mood)).toEqual(['okay']);
  });
  it('one completion per module per day', async () => {
    await expect(as(A, `insert into public.completions (user_id, date, module, practice_id) values ($1, '2026-11-18', 'ahara', 'y')`, [A])).rejects.toThrow(/unique/);
  });
  it.each([
    ["checkins mood", `insert into public.checkins (user_id, date, mood) values ('${A}', '2026-11-20', 'angry')`],
    ["completions module", `insert into public.completions (user_id, date, module, practice_id) values ('${A}', '2026-11-20', 'yoga', 'x')`],
    ["sessions kind", `insert into public.hum_sessions (user_id, date, practice_id, kind, rounds) values ('${A}', '2026-11-20', 'p', 'chant', 3)`],
    ["sessions with 1 round", `insert into public.hum_sessions (user_id, date, practice_id, kind, rounds) values ('${A}', '2026-11-20', 'p', 'om', 1)`],
    ["before tap of 6", `insert into public.hum_sessions (user_id, date, practice_id, kind, rounds, before) values ('${A}', '2026-11-20', 'p', 'om', 3, 6)`],
    ["31-character name", `update public.profiles set name = '${'x'.repeat(31)}' where id = '${A}'`],
  ])('rejects bad %s', async (_, sql) => { await expect(as(A, sql)).rejects.toThrow(/check/); });
});

describe('Delete my data', () => {
  it('deleting the auth user removes every row they own, and nobody else’s', async () => {
    await pg.exec(`reset role; delete from auth.users where id = '${A}';`);
    for (const t of ['profiles', 'checkins', 'completions', 'hum_sessions']) {
      const left = (await pg.query(`select count(*)::int as n from public.${t} where ${t === 'profiles' ? 'id' : 'user_id'} = $1`, [A])).rows[0].n;
      expect(left, t).toBe(0);
    }
    expect((await rows(B, 'profiles'))[0].name).toBe('Ben');
  });
});

describe('Chat limits (chat_check_and_count)', () => {
  const C = '00000000-0000-0000-0000-00000000000c';
  const check = async (strike = false, gemini = true, cap = 800) => {
    await pg.exec('reset role'); // the server calls this as the service role
    return (await pg.query('select public.chat_check_and_count($1, $2, $3, $4) as r', [C, strike, gemini, cap])).rows[0].r;
  };
  beforeEach(async () => { await pg.exec(`reset role; insert into auth.users values ('${C}') on conflict do nothing; delete from public.chat_usage; delete from public.chat_global;`); });

  it('the browser can\u2019t call it or read the counters', async () => {
    await expect(as(C, "select public.chat_check_and_count($1, false, true, 800)", [C])).rejects.toThrow(/permission denied/);
    expect(await rows(C, 'chat_usage')).toEqual([]);
  });
  it('10 messages per 10 minutes, then "rate"', async () => {
    for (let i = 0; i < 10; i++) expect(await check()).toBe('ok');
    expect(await check()).toBe('rate');
  });
  it('the 10-minute window resets', async () => {
    for (let i = 0; i < 10; i++) await check();
    await pg.exec("update public.chat_usage set window_start = now() - interval '11 minutes'");
    expect(await check()).toBe('ok');
  });
  it('40 per day even across windows', async () => {
    await pg.exec(`insert into public.chat_usage (user_id, day, day_count, window_start, window_count) values ('${C}', current_date, 40, now(), 0)`);
    expect(await check()).toBe('rate');
    await pg.exec("update public.chat_usage set day = current_date - 1");
    expect(await check()).toBe('ok'); // new day
  });
  it('3 strikes in 24 h lock chat for 24 h — even plain questions', async () => {
    expect(await check(true)).toBe('strike');
    expect(await check(true)).toBe('strike');
    expect(await check(true)).toBe('locked');
    expect(await check(false)).toBe('locked');
    await pg.exec("update public.chat_usage set locked_until = now() - interval '1 minute'");
    expect(await check(false)).toBe('ok'); // lock expires
  });
  it('old strikes (over 24 h) are forgotten', async () => {
    await check(true); await check(true);
    await pg.exec("update public.chat_usage set strikes_since = now() - interval '25 hours'");
    expect(await check(true)).toBe('strike');
  });
  it('site-wide daily Gemini cap', async () => {
    expect(await check(false, true, 2)).toBe('ok');
    expect(await check(false, true, 2)).toBe('ok');
    expect(await check(false, true, 2)).toBe('cap');
    expect(await check(false, false, 2)).toBe('ok'); // non-Gemini replies still work after the cap
  });
  it('strikes never count towards the Gemini cap', async () => {
    await check(true, true, 1); await check(true, true, 1);
    expect((await pg.exec('reset role'), await pg.query('select coalesce(sum(gemini_calls),0)::int as n from public.chat_global')).rows[0].n).toBe(0);
  });
  it('deleting the account removes the counters', async () => {
    await check();
    await pg.exec(`reset role; delete from auth.users where id = '${C}'`);
    expect((await pg.exec('reset role'), await pg.query('select count(*)::int as n from public.chat_usage')).rows[0].n).toBe(0);
  });
});
