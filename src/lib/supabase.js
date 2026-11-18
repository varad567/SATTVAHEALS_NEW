/**
 * FILE: src/lib/supabase.js
 * PURPOSE: The Supabase client, or null when the env vars aren't set (then the app runs in local preview mode).
 *   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local (dev) or Vercel (live). See .env.example.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;
