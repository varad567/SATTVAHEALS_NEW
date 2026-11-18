/**
 * FILE: src/lib/db.js
 * PURPOSE: Every read/write of user data goes through here (ARCHITECTURE §7).
 * NOW: a local stand-in that saves to this browser (localStorage) so the app works before Supabase is set up.
 * LATER (M2c): same functions, same shapes, backed by Supabase tables (ARCHITECTURE §4). Pages don't change.
 * All functions are async on purpose, so swapping in network calls needs no changes elsewhere.
 */
const KEY = 'sh.db.v1';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const write = (all) => localStorage.setItem(KEY, JSON.stringify(all));
const empty = () => ({ profile: null, checkins: [], completions: [], sessions: [] });

function update(uid, fn) {
  const all = read();
  all[uid] = fn(all[uid] || empty());
  write(all);
  return all[uid];
}

/** Everything for one user: { profile, checkins[{date,mood}], completions[{date,module,practiceId}], sessions[] } */
export async function load(uid) { return read()[uid] || empty(); }

/** profile = { name, prakriti: {vata,pitta,kapha,dominant,label}, prefs: {minutes,diet,wake} } */
export async function saveProfile(uid, profile) { return update(uid, (u) => ({ ...u, profile })); }

/** One check-in per day; saving again the same day replaces it (Flow 3). */
export async function saveCheckin(uid, date, mood) {
  return update(uid, (u) => ({ ...u, checkins: [...u.checkins.filter((c) => c.date !== date), { date, mood }] }));
}

/** Mark a card done or not done. One completion per module per day (ARCHITECTURE §4 unique key). */
export async function setDone(uid, date, module, practiceId, done) {
  return update(uid, (u) => ({
    ...u,
    completions: [...u.completions.filter((c) => !(c.date === date && c.module === module)), ...(done ? [{ date, module, practiceId }] : [])],
  }));
}

/** Hum coach sessions (M3). */
export async function addSession(uid, session) { return update(uid, (u) => ({ ...u, sessions: [...u.sessions, session] })); }

/** "Delete my data" — removes every record for this user. */
export async function deleteAll(uid) { const all = read(); delete all[uid]; write(all); }
