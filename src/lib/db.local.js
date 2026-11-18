/**
 * FILE: src/lib/db.local.js
 * PURPOSE: Data store in this browser (localStorage) — used when Supabase isn't configured (preview mode, tests).
 *   Same async functions as db.remote.js.
 */
import { empty, withProfile, withCheckin, withDone, withSession } from './userData.js';

const KEY = 'sh.db.v1';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const update = (uid, change, ...args) => { const all = read(); all[uid] = change(all[uid] || empty(), ...args); localStorage.setItem(KEY, JSON.stringify(all)); };

export async function load(uid) { return read()[uid] || empty(); }
export async function saveProfile(uid, profile) { update(uid, withProfile, profile); }
export async function saveCheckin(uid, date, mood) { update(uid, withCheckin, date, mood); }
export async function setDone(uid, date, module, practiceId, done) { update(uid, withDone, date, module, practiceId, done); }
export async function addSession(uid, session) { update(uid, withSession, session); }
export async function deleteAll(uid) { const all = read(); delete all[uid]; localStorage.setItem(KEY, JSON.stringify(all)); }
