/**
 * FILE: src/lib/db.remote.js
 * PURPOSE: Data store in Supabase (ARCHITECTURE §4). Same functions and shapes as db.local.js.
 *   Database columns are snake_case; the app uses camelCase — mapping happens only here.
 *   Row Level Security makes sure each call can only reach the signed-in user's rows.
 */
import { supabase } from './supabase.js';

const ok = ({ data, error }) => { if (error) throw error; return data; };
const DAYS_KEPT_ON_SCREEN = 60; // Progress shows 14 days, variety looks back 7 — 60 is plenty
const since = () => new Date(Date.now() - DAYS_KEPT_ON_SCREEN * 86400000).toISOString().slice(0, 10);

export async function load(uid) {
  const [profile, checkins, completions, sessions] = await Promise.all([
    supabase.from('profiles').select('name, prakriti, prefs').eq('id', uid).maybeSingle(),
    supabase.from('checkins').select('date, mood').gte('date', since()),
    supabase.from('completions').select('date, module, practice_id').gte('date', since()),
    supabase.from('hum_sessions').select('date, practice_id, kind, rounds, avg_hum, avg_inhale, steady_rounds, before, after').gte('date', since()),
  ].map((q) => q.then(ok)));
  return {
    profile,
    checkins,
    completions: completions.map((c) => ({ date: c.date, module: c.module, practiceId: c.practice_id })),
    sessions: sessions.map((s) => ({ date: s.date, practiceId: s.practice_id, kind: s.kind, rounds: s.rounds, avgHum: s.avg_hum, avgInhale: s.avg_inhale, steadyRounds: s.steady_rounds, before: s.before, after: s.after })),
  };
}

export async function saveProfile(uid, { name, prakriti, prefs }) {
  ok(await supabase.from('profiles').upsert({ id: uid, name, prakriti, prefs, age_confirmed: true }));
}
export async function saveCheckin(uid, date, mood) {
  ok(await supabase.from('checkins').upsert({ user_id: uid, date, mood }, { onConflict: 'user_id,date' }));
}
export async function setDone(uid, date, module, practiceId, done) {
  ok(await (done
    ? supabase.from('completions').upsert({ user_id: uid, date, module, practice_id: practiceId }, { onConflict: 'user_id,date,module' })
    : supabase.from('completions').delete().eq('user_id', uid).eq('date', date).eq('module', module)));
}
export async function addSession(uid, s) {
  ok(await supabase.from('hum_sessions').insert({ user_id: uid, date: s.date, practice_id: s.practiceId, kind: s.kind, rounds: s.rounds, avg_hum: s.avgHum, avg_inhale: s.avgInhale, steady_rounds: s.steadyRounds, before: s.before, after: s.after }));
}
/** Deletes the account on the server (api/delete-account.js); the database cascade removes every row. */
export async function deleteAll() {
  const { data } = await supabase.auth.getSession();
  const res = await fetch('/api/delete-account', { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token}` } });
  if (!res.ok) throw new Error(`delete failed: ${res.status}`);
}
