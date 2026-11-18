/**
 * FILE: src/lib/db.js
 * PURPOSE: The one door to user data (ARCHITECTURE §7). Supabase when configured, this browser otherwise.
 *   Both stores have the same async functions; how each change updates data is in userData.js.
 */
import { supabase } from './supabase.js';
import * as local from './db.local.js';
import * as remote from './db.remote.js';

export const { load, saveProfile, saveCheckin, setDone, addSession, deleteAll } = supabase ? remote : local;
