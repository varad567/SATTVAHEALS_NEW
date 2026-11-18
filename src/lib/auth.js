/**
 * FILE: src/lib/auth.js
 * PURPOSE: Who is signed in.
 * NOW: a local preview sign-in (one user per browser) until Supabase Google sign-in is connected (M2c).
 * LATER: signIn() → supabase.auth.signInWithOAuth({ provider: 'google' }); same return shape.
 */
const KEY = 'sh.user';
export const LOCAL_MODE = true; // shown on the welcome screen so nobody mistakes the preview for real accounts

export function currentUser() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
export async function signIn() { const user = { id: 'local-preview', name: '' }; localStorage.setItem(KEY, JSON.stringify(user)); return user; }
export async function signOut() { localStorage.removeItem(KEY); }
