/**
 * FILE: api/delete-account.js  (Vercel serverless function: POST /api/delete-account)
 * PURPOSE: "Delete my data" — deletes the signed-in user's account. The database deletes every row they own
 *   (on delete cascade, supabase/schema.sql). Needs the service role key, so it can only run on the server.
 * INPUT: header Authorization: Bearer <the user's access token>. A user can only ever delete themselves.
 */
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'not signed in' });
  const admin = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser(token); // proves who is asking
  if (error || !data?.user) return res.status(401).json({ error: 'not signed in' });
  const del = await admin.auth.admin.deleteUser(data.user.id);
  if (del.error) return res.status(500).json({ error: 'could not delete' });
  return res.status(200).json({ deleted: true });
}
