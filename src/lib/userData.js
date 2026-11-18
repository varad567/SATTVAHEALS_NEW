/**
 * FILE: src/lib/userData.js
 * PURPOSE: How each change updates a user's data, as pure functions: (data, ...args) → new data.
 *   Used twice so they can never disagree: by the local store to save, and by AppState to update the
 *   screen right after a successful Supabase write (no re-download needed).
 * DATA: { profile, checkins[{date,mood}], completions[{date,module,practiceId}], sessions[] }
 */
export const empty = () => ({ profile: null, checkins: [], completions: [], sessions: [] });

export const withProfile = (u, profile) => ({ ...u, profile });

/** One check-in per day: saving again the same day replaces it (Flow 3). */
export const withCheckin = (u, date, mood) => ({ ...u, checkins: [...u.checkins.filter((c) => c.date !== date), { date, mood }] });

/** One completion per module per day; done = false removes it (undo). */
export const withDone = (u, date, module, practiceId, done) => ({
  ...u,
  completions: [...u.completions.filter((c) => !(c.date === date && c.module === module)), ...(done ? [{ date, module, practiceId }] : [])],
});

export const withSession = (u, session) => ({ ...u, sessions: [...u.sessions, session] });
