/**
 * Hum engine tests on synthetic audio: pure tones, harmonic "voice-like" hums, noise, wavering and rising pitch.
 */
import { loudness, pitch, SILENCE_DB } from './signal.js';
import { createDetector, measureRound, pickTip, summarize, canSave, isNoisy, T } from './coach.js';

const SR = 48000, N = 2048;
let seed = 1; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1; // repeatable noise
const tone = (hz, amp = 0.3, harmonics = [1], sr = SR) => Float32Array.from({ length: N }, (_, i) =>
  harmonics.reduce((s, h, k) => s + (amp / (k + 1)) * h * Math.sin((2 * Math.PI * hz * (k + 1) * i) / sr), 0));
const noise = (amp) => Float32Array.from({ length: N }, () => amp * rand());

describe('loudness', () => {
  it('silence is the floor value', () => expect(loudness(new Float32Array(N))).toBe(SILENCE_DB));
  it('full-scale sine ≈ −3 dBFS', () => expect(loudness(tone(200, 1))).toBeCloseTo(-3.01, 1));
  it('halving amplitude drops ~6 dB', () => expect(loudness(tone(200, 0.5)) - loudness(tone(200, 1))).toBeCloseTo(-6.02, 1));
});

describe('pitch', () => {
  it.each([82, 100, 130, 165, 220, 300, 390])('finds a %i Hz tone within 1%', (hz) => {
    expect(Math.abs(pitch(tone(hz), SR) - hz) / hz).toBeLessThan(0.01);
  });
  it.each([110, 140, 200])('finds the fundamental of a harmonic-rich hum at %i Hz (no octave error)', (hz) => {
    expect(Math.abs(pitch(tone(hz, 0.3, [1, 0.8, 0.6, 0.4, 0.3]), SR) - hz) / hz).toBeLessThan(0.02);
  });
  it.each([44100, 16000])('works at %i Hz sample rate too', (sr) => expect(Math.abs(pitch(tone(150, 0.3, [1], sr), sr) - 150)).toBeLessThan(1.5));
  it('a hum with light room noise is still found', () => {
    const f = tone(150); const n = noise(0.03); f.forEach((v, i) => (f[i] = v + n[i]));
    expect(Math.abs(pitch(f, SR) - 150)).toBeLessThan(3);
  });
  it.each([['silence', new Float32Array(N)], ['white noise', noise(0.3)]])('returns null for %s', (_, f) => expect(pitch(f, SR)).toBeNull());
  it('ignores tones outside the humming range', () => {
    expect(pitch(tone(1000), SR)).not.toBeCloseTo(1000, -1); // 1 kHz is not reported as a hum pitch
  });
});

/** Simulate a session: segments of [seconds, db, hz]. Readings every 50 ms, like the screen. */
function run(segments, floor = -60) {
  const d = createDetector(floor), rounds = []; let t = 0;
  for (const [sec, db, hz, wobble = 0] of segments) {
    for (let k = 0; k < sec * 20; k++, t += 50) {
      const r = d.feed(t, db + (wobble ? wobble * Math.sin(k / 2) : 0), hz);
      if (r) rounds.push(r);
    }
  }
  return { rounds, d };
}

describe('hum detection', () => {
  it('finds two hums with the right lengths and the gap between them', () => {
    const { rounds } = run([[2, -70], [9, -30, 150], [4, -70], [8, -30, 150], [2, -70]]);
    expect(rounds).toHaveLength(2);
    expect(rounds[0].length).toBeCloseTo(9, 1);
    expect(rounds[0].gap).toBeNull();
    expect(rounds[1].gap).toBeCloseTo(4, 1);
    expect(rounds[1].pitch).toBe(150);
  });
  it('a cough shorter than 300 ms is not a hum', () => expect(run([[2, -70], [0.2, -20], [2, -70]]).rounds).toHaveLength(0));
  it('a short dip inside a hum does not split it', () => {
    const { rounds } = run([[1, -70], [4, -30, 150], [0.2, -70], [4, -30, 150], [2, -70]]);
    expect(rounds).toHaveLength(1);
    expect(rounds[0].length).toBeCloseTo(8.2, 1);
  });
  it('a hum still going at the end is not reported yet, and the detector says it is humming', () => {
    const { rounds, d } = run([[1, -70], [5, -30, 150]]);
    expect(rounds).toHaveLength(0); expect(d.humming).toBe(true);
  });
  it('threshold is relative to the room: the same hum in a louder room needs to be louder', () => {
    expect(run([[1, -50], [6, -40, 150], [1, -50]], -50).rounds).toHaveLength(0); // only 10 dB above a −50 room
    expect(run([[1, -50], [6, -35, 150], [1, -50]], -50).rounds).toHaveLength(1);
  });
  it('steady vs wavering hum', () => {
    const steady = run([[1, -70], [8, -30, 150], [1, -70]]).rounds[0];
    const wavy = run([[1, -70], [8, -30, 150, 8], [1, -70]]).rounds[0];
    expect(steady.steadiness).toBeLessThan(0.01);
    expect(wavy.steadiness).toBeGreaterThan(T.wavy);
  });
  it('no voiced frames → pitch is null, not a crash', () => expect(run([[1, -70], [8, -30, null], [1, -70]]).rounds[0].pitch).toBeNull());
});

describe('noise check', () => {
  it.each([[-60, false], [-45, false], [-44.9, true], [-20, true]])('floor %i dB → noisy %s', (f, n) => expect(isNoisy(f)).toBe(n));
});

describe('tips (§6.4 priority)', () => {
  const good = { length: 10, gap: 4, steadiness: 0.05, loudness: -30, pitch: 150 };
  const ctx = { kind: 'bhramari', firstPitch: 150 };
  it.each([
    ['good', {}],
    ['tooLoud', { loudness: -10 }],
    ['tooShort', { length: 5 }],
    ['wavy', { steadiness: 0.3 }],
    ['pitchRising', { pitch: 180 }],
    ['shortInhale', { gap: 2 }],
    ['tooLoud', { loudness: -10, length: 3, steadiness: 0.5, gap: 1 }], // loudest problem wins
    ['tooShort', { length: 3, steadiness: 0.5, pitch: 200, gap: 1 }],
  ])('→ %s', (tip, change) => expect(pickTip({ ...good, ...change }, ctx)).toBe(tip));
  it('Om counts 6 s as long enough, Bhramari does not', () => {
    expect(pickTip({ ...good, length: 7 }, { kind: 'om' })).toBe('good');
    expect(pickTip({ ...good, length: 7 }, ctx)).toBe('tooShort');
  });
  it('first round (no gap, no first pitch yet) can still be "good"', () => expect(pickTip({ ...good, gap: null }, { kind: 'om', firstPitch: null })).toBe('good'));
  it('timer-only rounds (no loudness/steadiness/pitch) only get length and breath tips', () => {
    expect(pickTip({ length: 9, gap: 4, steadiness: null, loudness: null, pitch: null }, ctx)).toBe('good');
    expect(pickTip({ length: 9, gap: 1, steadiness: null, loudness: null, pitch: null }, ctx)).toBe('shortInhale');
  });
});

describe('summary + saving rule', () => {
  it('summarises numbers only', () => {
    const rounds = [measureRound([{ db: -30, hz: 150 }], 0, 9000, null), measureRound([{ db: -30, hz: 150 }], 13000, 21000, 9000)];
    expect(summarize(rounds)).toEqual({ rounds: 2, avgHum: 8.5, avgInhale: 4, steadyRounds: 2 });
  });
  it('timer-only sessions report no steadiness', () => expect(summarize([{ length: 8, gap: null, steadiness: null }]).steadyRounds).toBeNull());
  it('empty session is safe', () => expect(summarize([])).toEqual({ rounds: 0, avgHum: null, avgInhale: null, steadyRounds: null }));
  it.each([[0, false], [1, false], [2, true], [6, true]])('%i rounds → can save %s', (n, ok) => expect(canSave(Array(n).fill({}))).toBe(ok));
});
