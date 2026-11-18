/**
 * FILE: api/chat.js  (Vercel serverless function: POST /api/chat)
 * PURPOSE: Prana chat with the API locked down (CORE_LOGIC §7). Gemini is reached only after every gate passes.
 * INPUT:  { message: string, history?: [{ from: 'you'|'prana', text }] } + header Authorization: Bearer <token>
 * OUTPUT: { reply, type }
 * ENV:    GEMINI_API_KEY, GEMINI_MODEL, CHAT_ENABLED ('true'), CHAT_DAILY_CAP, ALLOWED_ORIGINS,
 *         VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — placeholders in .env.example until keys exist.
 */
import { createClient } from '@supabase/supabase-js';
import { route, safeOutput } from '../src/engine/chatRoute.js';
import { REPLIES } from '../src/content/chatSafety.js';
import { PRANA_PROMPT } from './_prompt.js';

const env = (k, d = '') => process.env[k] ?? d;
const send = (res, code, reply, type) => res.status(code).json({ reply, type });

async function askGemini(message, history) {
  const contents = [...history.slice(-4).map((h) => ({ role: h.from === 'prana' ? 'model' : 'user', parts: [{ text: String(h.text).slice(0, 600) }] })),
    { role: 'user', parts: [{ text: message }] }];
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env('GEMINI_MODEL')}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env('GEMINI_API_KEY') },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: PRANA_PROMPT }] }, contents,
      generationConfig: { maxOutputTokens: 220, temperature: 0.3 },
      safetySettings: ['HARASSMENT', 'HATE_SPEECH', 'SEXUALLY_EXPLICIT', 'DANGEROUS_CONTENT'].map((c) => ({ category: `HARM_CATEGORY_${c}`, threshold: 'BLOCK_LOW_AND_ABOVE' })),
    }),
  });
  if (!r.ok) throw new Error(`gemini ${r.status}`);
  return (await r.json()).candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
}

export default async function handler(req, res) {
  const origins = env('ALLOWED_ORIGINS', 'https://sattvaheals.in,https://www.sattvaheals.in').split(',').map((o) => o.trim());
  if (req.method !== 'POST') return send(res, 405, '', 'method');
  if (!origins.includes(req.headers.origin)) return send(res, 403, '', 'origin');
  if (JSON.stringify(req.body ?? '').length > 2048) return send(res, 400, REPLIES.tooLong, 'tooLong');
  const { message, history = [] } = req.body ?? {};
  if (typeof message !== 'string' || !Array.isArray(history)) return send(res, 400, '', 'bad');

  const decision = route(message);
  if (decision.type === 'crisis') return send(res, 200, decision.reply, 'crisis'); // before everything else, always
  if (env('CHAT_ENABLED') !== 'true' || !env('GEMINI_API_KEY')) return send(res, 200, REPLIES.resting, 'resting');
  if (decision.type === 'empty' || decision.type === 'tooLong') return send(res, 400, decision.reply, decision.type);

  const admin = createClient(env('VITE_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const { data: who } = token ? await admin.auth.getUser(token) : { data: null };
  if (!who?.user) return send(res, 401, REPLIES.signIn, 'signIn');

  const { data: limit, error } = await admin.rpc('chat_check_and_count', { p_uid: who.user.id, p_strike: !!decision.strike, p_gemini: !!decision.gemini, p_cap: Number(env('CHAT_DAILY_CAP', '800')) });
  if (error) return send(res, 200, REPLIES.resting, 'resting');
  if (limit === 'locked') return send(res, 200, REPLIES.locked, 'locked');
  if (limit === 'rate') return send(res, 200, REPLIES.rate, 'rate');
  if (!decision.gemini) return send(res, 200, decision.reply, decision.type);
  if (limit === 'cap') return send(res, 200, REPLIES.resting, 'cap');

  try { return send(res, 200, safeOutput(await askGemini(message.trim(), history)), 'app'); }
  catch { return send(res, 200, REPLIES.resting, 'resting'); }
}
