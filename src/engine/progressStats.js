/**
 * FILE: src/engine/progressStats.js
 * PURPOSE: Numbers for the Progress screen (docs/CORE_LOGIC.md §8).
 * INPUT: { checkins: [{date, mood}], completions: [{date}], sessions: [{date, kind, avgHum, steadyRounds, rounds, before, after}], today }
 * OUTPUT: { daysPractised, days[14], moodGroups[14], works, avgHumByWeek, steadyPct }
 */
const DAY = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const MOOD_GROUP = { okay: 'okay', anxious: 'busy', overthinking: 'busy', irritable: 'heated', stressed: 'heated', low: 'heavy', sluggish: 'heavy' };
const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

export function progressStats({ checkins = [], completions = [], sessions = [], today }) {
  const t0 = Date.parse(today);
  const days = Array.from({ length: 14 }, (_, i) => iso(t0 - (13 - i) * DAY)); // oldest → today
  const doneDays = new Set(completions.map((c) => c.date));
  const moodOf = Object.fromEntries(checkins.map((c) => [c.date, MOOD_GROUP[c.mood] ?? null]));

  // §8 "what works": average (after − before) per kind, only with ≥ 3 complete pairs
  const works = {};
  for (const kind of ['bhramari', 'om']) {
    const pairs = sessions.filter((s) => s.kind === kind && Number.isInteger(s.before) && Number.isInteger(s.after));
    if (pairs.length >= 3) works[kind] = { change: Math.round(avg(pairs.map((s) => s.after - s.before)) * 10) / 10, sessions: pairs.length };
  }

  const inWeek = (s, w) => { const ago = (t0 - Date.parse(s.date)) / DAY; return ago >= w * 7 && ago < (w + 1) * 7; };
  const analysed = sessions.filter((s) => s.steadyRounds != null); // timer-only sessions have no steadiness
  const rounds = analysed.reduce((n, s) => n + s.rounds, 0);
  return {
    days: days.map((d) => ({ date: d, done: doneDays.has(d) })),
    daysPractised: days.filter((d) => doneDays.has(d)).length,
    moodGroups: days.map((d) => moodOf[d] ?? null),
    works,
    avgHumByWeek: [1, 0].map((w) => avg(sessions.filter((s) => inWeek(s, w)).map((s) => s.avgHum))), // [last week, this week]
    steadyPct: rounds ? Math.round((analysed.reduce((n, s) => n + s.steadyRounds, 0) / rounds) * 100) : null,
  };
}
