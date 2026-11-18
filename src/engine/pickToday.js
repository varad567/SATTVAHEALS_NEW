/**
 * FILE: src/engine/pickToday.js
 * PURPOSE: Picks Today's 3 — one dinacharya, one ahara, one mantra (docs/CORE_LOGIC.md §4).
 * INPUT: { practices, dominant, mood, prefs: { minutes, diet }, history: [{ date, practiceId }], date: 'YYYY-MM-DD', keep }
 *   keep — { [module]: practiceId } cards already done today; they are kept as they are (§4.5)
 * OUTPUT: { dinacharya, ahara, mantra } — each a practice object, or null if nothing fits the diet
 * Pure and deterministic: the same input always gives the same plan.
 */
export const MODULES = ['dinacharya', 'ahara', 'mantra'];
export const MOOD_TARGET = { anxious: 'vata', overthinking: 'vata', irritable: 'pitta', stressed: 'pitta', low: 'kapha', sluggish: 'kapha' };

const DAY = 86400000;
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY); // ISO dates parse as UTC: no timezone drift

export function scorePractice(p, { target, dominant, mood, history, date }) {
  let score = 0;
  if (p.doshas.includes(target)) score += 3;
  if (dominant !== target && p.doshas.includes(dominant)) score += 1;
  if (p.moods.includes(mood)) score += 2;
  // §4.3 freshness: most recent time this practice was done
  const ago = Math.min(...history.filter((h) => h.practiceId === p.id).map((h) => daysBetween(h.date, date)).filter((d) => d >= 1));
  if (ago === 1) score -= 5;
  else if (ago <= 7) score -= 1;
  return score;
}

export function pickToday({ practices, dominant, mood: rawMood, prefs, history = [], date, keep = {} }) {
  const mood = rawMood in MOOD_TARGET ? rawMood : 'okay'; // unknown or missing mood is treated exactly as 'okay'
  const target = MOOD_TARGET[mood] ?? dominant; // 'okay' → the user's own dosha
  const ctx = { target, dominant, mood, history, date };
  const plan = {};
  for (const module of MODULES) {
    const all = practices.filter((p) => p.module === module);
    const kept = keep[module] && all.find((p) => p.id === keep[module]);
    if (kept) { plan[module] = kept; continue; }
    const diet = all.filter((p) => p.diet.includes('all') || p.diet.includes(prefs.diet));
    const timed = diet.filter((p) => p.minutes <= prefs.minutes);
    const pool = timed.length ? timed : diet; // §4.2 relax the time filter, never the diet filter
    plan[module] = pool
      .map((p) => ({ p, s: scorePractice(p, ctx) }))
      .sort((a, b) => b.s - a.s || a.p.id.localeCompare(b.p.id))[0]?.p ?? null;
  }
  return plan;
}
