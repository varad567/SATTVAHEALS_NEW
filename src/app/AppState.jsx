/**
 * FILE: src/app/AppState.jsx
 * PURPOSE: The app's single source of truth: who's signed in, their data, today's date and Today's 3.
 *   Pages read from useApp() and call its actions; they never touch db.js or the engine directly.
 * PLAN RULE: Today's 3 is recomputed from inputs every render (pickToday is deterministic), with today's
 *   done cards kept (CORE_LOGIC §4.5). So mood changes, retakes and pref edits re-pick only not-done cards.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as db from '../lib/db.js';
import * as auth from '../lib/auth.js';
import { todayISO, addDays } from '../lib/date.js';
import { pickToday } from '../engine/pickToday.js';
import practices from '../content/practices.json';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [user, setUser] = useState(auth.currentUser);
  const [data, setData] = useState(null); // null = loading
  const [date, setDate] = useState(todayISO);

  useEffect(() => { let alive = true; if (user) db.load(user.id).then((d) => alive && setData(d)); else setData(null); return () => { alive = false; }; }, [user]);

  // New day at local midnight, even if the tab stayed open (Flow 3): re-check when the user comes back.
  useEffect(() => {
    const check = () => setDate(todayISO());
    document.addEventListener('visibilitychange', check);
    const t = setInterval(check, 60000);
    return () => { document.removeEventListener('visibilitychange', check); clearInterval(t); };
  }, []);

  const run = useCallback((fn) => async (...args) => setData(await fn(user.id, ...args)), [user]);
  const actions = useMemo(() => user && ({
    saveProfile: run(db.saveProfile),
    setMood: run((uid, mood) => db.saveCheckin(uid, date, mood)),
    setDone: run((uid, module, id, done) => db.setDone(uid, date, module, id, done)),
    addSession: run(db.addSession),
    deleteAll: async () => { await db.deleteAll(user.id); await auth.signOut(); setUser(null); },
    signOut: async () => { await auth.signOut(); setUser(null); },
  }), [user, date, run]);

  const view = useMemo(() => {
    if (!data?.profile) return {};
    const mood = data.checkins.find((c) => c.date === date)?.mood ?? null;
    const doneToday = Object.fromEntries(data.completions.filter((c) => c.date === date).map((c) => [c.module, c.practiceId]));
    const weekAgo = addDays(date, -7);
    const history = data.completions.filter((c) => c.date < date && c.date >= weekAgo);
    const { prakriti, prefs } = data.profile;
    const plan = pickToday({ practices, dominant: prakriti.dominant, mood: mood ?? 'okay', prefs, history, date, keep: doneToday });
    return { mood, doneToday, plan };
  }, [data, date]);

  const value = { user, data, date, loading: !!user && !data, signIn: async () => setUser(await auth.signIn()), ...actions, ...view };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
