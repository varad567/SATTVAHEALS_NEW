/**
 * FILE: src/app/AppState.jsx
 * PURPOSE: The app's single source of truth: who's signed in, their data, today's date, Today's 3
 *   and Prana's colours. Pages read from useApp() and call its actions; they never touch db.js or the engine.
 * SAVING: each action writes to the store first, then applies the same pure change (lib/userData.js) to the
 *   screen. If a write fails, nothing on screen changes and saveError is shown.
 * PLAN RULE: Today's 3 is recomputed from inputs every render (pickToday is deterministic), with today's
 *   done cards kept (CORE_LOGIC §4.5). So mood changes, retakes and pref edits re-pick only not-done cards.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as db from '../lib/db.js';
import * as auth from '../lib/auth.js';
import { withProfile, withCheckin, withDone, withSession } from '../lib/userData.js';
import { todayISO, addDays } from '../lib/format.js';
import { skyAt } from '../lib/sky.js';
import { pickToday } from '../engine/pickToday.js';
import { colorsFor } from '../components/Prana.jsx';
import practices from '../content/practices.json';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still checking, null = signed out
  const [data, setData] = useState(null);
  const [date, setDate] = useState(todayISO);
  const [failed, setFailed] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => auth.onUser(setUser), []);
  useEffect(() => {
    let alive = true; setFailed(false); setData(null);
    if (user) db.load(user.id).then((d) => alive && setData(d), () => alive && setFailed(true));
    return () => { alive = false; };
  }, [user, attempt]);

  // New day at local midnight, even if the tab stayed open (Flow 3): re-check when the user comes back.
  useEffect(() => {
    const check = () => setDate(todayISO());
    document.addEventListener('visibilitychange', check);
    const t = setInterval(check, 60000);
    return () => { document.removeEventListener('visibilitychange', check); clearInterval(t); };
  }, []);

  const actions = useMemo(() => {
    if (!user) return {};
    const act = (write, change) => async (...args) => {
      try { await write(user.id, ...args); setSaveError(false); setData((d) => change(d, ...args)); }
      catch { setSaveError(true); }
    };
    return {
      saveProfile: act(db.saveProfile, withProfile),
      setMood: act((uid, mood) => db.saveCheckin(uid, date, mood), (d, mood) => withCheckin(d, date, mood)),
      setDone: act((uid, ...a) => db.setDone(uid, date, ...a), (d, ...a) => withDone(d, date, ...a)),
      addSession: act(db.addSession, withSession),
      deleteAll: async () => { try { await db.deleteAll(user.id); await auth.signOut(); setUser(null); } catch { setSaveError(true); } },
      signOut: async () => { await auth.signOut(); setUser(null); },
    };
  }, [user, date]);

  const view = useMemo(() => {
    if (!data?.profile) return {};
    const mood = data.checkins.find((c) => c.date === date)?.mood ?? null;
    const doneToday = Object.fromEntries(data.completions.filter((c) => c.date === date).map((c) => [c.module, c.practiceId]));
    const weekAgo = addDays(date, -7);
    const history = data.completions.filter((c) => c.date < date && c.date >= weekAgo);
    const { prakriti, prefs } = data.profile;
    const plan = pickToday({ practices, dominant: prakriti.dominant, mood: mood ?? 'okay', prefs, history, date, keep: doneToday });
    return { mood, doneToday, plan, colors: colorsFor(prakriti) };
  }, [data, date]);

  const value = {
    user, data, date, failed, saveError, retry: () => setAttempt((n) => n + 1),
    loading: user === undefined || (!!user && !data && !failed),
    idleMood: skyAt(new Date().getHours()) === 'night' ? 'sleepy' : 'idle', // Prana's resting face
    signIn: async () => { const u = await auth.signIn(); if (u) setUser(u); },
    ...actions, ...view,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
