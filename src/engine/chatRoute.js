/**
 * FILE: src/engine/chatRoute.js
 * PURPOSE: Decides how Prana answers a message before any AI is involved (CORE_LOGIC §7).
 *   Order: crisis → misuse → emotional → personal → FAQ → app question → off-topic. Crisis always wins.
 *   Used by the chat widget (instant, private replies) and again by api/chat.js (the browser can't be trusted).
 * OUTPUT: { type, reply?, strike?, gemini? } — gemini: true only for a plain app question with no FAQ answer.
 */
import { PATTERNS, APP_WORDS, REPLIES } from '../content/chatSafety.js';

const compile = (list) => list.map((p) => new RegExp(p, 'i'));
const RX = Object.fromEntries(Object.entries(PATTERNS).map(([k, v]) => [k, compile(v)]));
const APP = compile(APP_WORDS);
const any = (rxs, text) => rxs.some((r) => r.test(text));
export const MAX_LEN = 300;

/**
 * FAQ answer by whole-word keyword overlap (CORE_LOGIC §7.0b). Returns the answer text or null.
 * FAQ keys must be specific words (no "who", "help"…) so ordinary questions don't match by accident.
 */
export function matchFaq(text, faq) {
  const word = (k) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|es)?\\b`, 'i'); // plurals count
  const best = faq.map((f) => ({ f, hits: f.keys.filter((k) => word(k).test(text)).length })).sort((a, b) => b.hits - a.hits)[0];
  return best?.hits ? best.f.a : null;
}

export function route(raw, { faq = [] } = {}) {
  const text = String(raw ?? '').trim();
  if (any(RX.crisis, text)) return { type: 'crisis', reply: REPLIES.crisis };   // checked before length: never refuse a crisis
  if (!text) return { type: 'empty', reply: '' };
  if (text.length > MAX_LEN) return { type: 'tooLong', reply: REPLIES.tooLong };
  if (any(RX.misuse, text)) return { type: 'misuse', reply: REPLIES.misuse, strike: true };
  if (any(RX.emotional, text)) return { type: 'emotional', reply: REPLIES.emotional };
  if (any(RX.personal, text)) return { type: 'personal', reply: REPLIES.personal };
  const faqAnswer = matchFaq(text, faq);
  if (faqAnswer) return { type: 'faq', reply: faqAnswer };
  if (any(APP, text)) return { type: 'app', gemini: true };
  return { type: 'offTopic', reply: REPLIES.offTopic };
}

/** §7.5 — replaces an AI reply that breaks the rules with a safe line. */
const BANNED = /\b(treat\w*|cure[sd]?|curing|heals?|healing|diagnos\w*|therap\w*|disorders?|symptoms?|patients?|prescri\w*|dosage|\d+\s?mg)\b/i;
export function safeOutput(reply) {
  const text = String(reply ?? '').trim();
  const checked = text.replace(/sattva heals/gi, ''); // the brand name isn't a claim
  const words = text.split(/\s+/).length, listItems = (text.match(/^\s*([-*•]|\d+\.)\s/gm) || []).length;
  if (!text || BANNED.test(checked) || text.includes('```') || words > 160 || listItems > 6) return REPLIES.unsafeOutput;
  return text;
}
