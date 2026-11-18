/**
 * FILE: src/lib/auth.js
 * PURPOSE: Who is signed in. Google via Supabase when configured; a local preview user otherwise.
 *   onUser(cb) calls cb(user | null) now and on every change, and returns an unsubscribe function.
 *   user = { id, name } — name comes from the Google profile when available.
 */
import { supabase } from './supabase.js';

export const LOCAL_MODE = !supabase; // the welcome screen says "Preview mode" so nobody mistakes it for real accounts
const KEY = 'sh.user';
const fromSession = (s) => s?.user && { id: s.user.id, name: (s.user.user_metadata?.full_name || '').split(' ')[0] };

export function onUser(cb) {
  if (LOCAL_MODE) { let u = null; try { u = JSON.parse(localStorage.getItem(KEY)); } catch { /* corrupt → signed out */ } cb(u); return () => {}; }
  supabase.auth.getSession().then(({ data }) => cb(fromSession(data.session) || null));
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(fromSession(session) || null));
  return () => data.subscription.unsubscribe();
}

/** Local: returns the user. Google: leaves the page for Google and comes back to /app signed in. */
export async function signIn() {
  if (!LOCAL_MODE) { await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/app` } }); return null; }
  const user = { id: 'local-preview', name: '' };
  localStorage.setItem(KEY, JSON.stringify(user));
  return user;
}

export async function signOut() { if (LOCAL_MODE) localStorage.removeItem(KEY); else await supabase.auth.signOut(); }

/** The signed-in user's access token for server calls (chat), or null in preview mode / signed out. */
export async function getToken() { if (LOCAL_MODE) return null; const { data } = await supabase.auth.getSession(); return data.session?.access_token ?? null; }
