/**
 * FILE: src/engine/hum/coach.js
 * PURPOSE: Turns a stream of frame readings into hum rounds, picks one tip, and summarises a session
 *   (CORE_LOGIC §6.1–6.6). Pure — the screen feeds it readings, it returns rounds.
 * All thresholds live in T below. Values marked (tune) in the doc are starting points.
 */
export const T = {
  noisyAbove: -45,           // §6.1 room is too noisy if its floor is louder than this (dBFS)
  humAbove: 12,              // §6.2 a hum is ≥ this many dB above the room's floor
  holdMs: 300,               // §6.2 must stay above/below that long to count as start/end
  goodLength: { bhramari: 8, om: 6 }, // §6.3 seconds
  minInhale: 3,              // seconds between hums
  wavy: 0.25,                // std ÷ mean of loudness during the hum
  tooLoud: -15,              // dBFS
  pitchRise: 1.15,           // later round's pitch vs the first round
  minRoundsToSave: 2,        // §6.5
};

export const isNoisy = (noiseFloor) => noiseFloor > T.noisyAbove;

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
export const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

/** Measures one finished hum. readings = [{ db, hz }] taken while humming. */
export function measureRound(readings, start, end, prevEnd) {
  const amp = readings.map((r) => 10 ** (r.db / 20)); // steadiness is judged on amplitude, not dB
  const m = mean(amp);
  const voiced = readings.map((r) => r.hz).filter(Boolean);
  return {
    length: (end - start) / 1000,
    gap: prevEnd == null ? null : (start - prevEnd) / 1000,
    steadiness: Math.sqrt(mean(amp.map((a) => (a - m) ** 2))) / m,
    loudness: 20 * Math.log10(m),
    pitch: median(voiced),
  };
}

/**
 * Feed it one reading per frame: feed(timeMs, db, hz). Returns a finished round when a hum ends, else null.
 * Blips shorter than holdMs neither start nor end a hum.
 */
export function createDetector(noiseFloor) {
  const on = noiseFloor + T.humAbove;
  let humming = false, edge = null, readings = [], start = null, prevEnd = null;
  return {
    get humming() { return humming; },
    get since() { return start; },
    feed(t, db, hz) {
      const loud = db >= on;
      if (loud !== humming) { edge ??= t; } else edge = null; // edge = when the level first crossed
      if (humming) readings.push({ t, db, hz });
      if (edge != null && t - edge >= T.holdMs) {
        if (!humming) { humming = true; start = edge; readings = []; edge = null; return null; }
        humming = false;
        const round = measureRound(readings.filter((r) => r.t < edge), start, edge, prevEnd);
        prevEnd = edge; edge = null; start = null;
        return round;
      }
      return null;
    },
  };
}

/** §6.4 one tip, highest priority first. Fields may be null in timer-only mode (no mic analysis). */
export function pickTip(round, { kind, firstPitch }) {
  if (round.loudness != null && round.loudness > T.tooLoud) return 'tooLoud';
  if (round.length < T.goodLength[kind]) return 'tooShort';
  if (round.steadiness != null && round.steadiness >= T.wavy) return 'wavy';
  if (round.pitch && firstPitch && round.pitch > firstPitch * T.pitchRise) return 'pitchRising';
  if (round.gap != null && round.gap < T.minInhale) return 'shortInhale';
  return 'good';
}

/** §6.6 what gets saved — numbers only. */
export function summarize(rounds) {
  const r1 = (x) => (x == null || Number.isNaN(x) ? null : Math.round(x * 10) / 10);
  const gaps = rounds.map((r) => r.gap).filter((g) => g != null);
  return {
    rounds: rounds.length,
    avgHum: r1(rounds.length ? mean(rounds.map((r) => r.length)) : null),
    avgInhale: r1(gaps.length ? mean(gaps) : null),
    // timer-only sessions have no analysis, so they report no steadiness rather than a fake 100%
    steadyRounds: rounds.some((r) => r.steadiness != null) ? rounds.filter((r) => r.steadiness != null && r.steadiness < T.wavy).length : null,
  };
}

export const canSave = (rounds) => rounds.length >= T.minRoundsToSave;
