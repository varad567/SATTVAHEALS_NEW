/**
 * FILE: src/lib/supabase.js
 * PURPOSE: The Supabase client, or null when the env vars aren't set (then the app runs in local preview mode).
 *   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (dev) or Vercel (live). See .env.example.
 *   The NEXT_PUBLIC_ names are what Vercel's Supabase integration creates, so those work too (vite.config envPrefix).
 */
import { createClient } from '@supabase/supabase-js';

const e = import.meta.env;
const url = e.VITE_SUPABASE_URL || e.NEXT_PUBLIC_SUPABASE_URL;
const key = e.VITE_SUPABASE_ANON_KEY || e.NEXT_PUBLIC_SUPABASE_ANON_KEY || e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;
