import { pickToday, scorePractice, MODULES, MOOD_TARGET } from './pickToday.js';
import practices from '../content/practices.json';

const MOODS = [...Object.keys(MOOD_TARGET), 'okay'];
const DIETS = ['vegetarian', 'eggetarian', 'non-vegetarian', 'vegan', 'jain'];
const MINUTES = [5, 10, 20];
const DOSHAS = ['vata', 'pitta', 'kapha'];
const base = { practices, dominant: 'vata', mood: 'overthinking', prefs: { minutes: 10, diet: 'vegetarian' }, date: '2026-11-18' };
const fits = (p, diet) => p.diet.includes('all') || p.diet.includes(diet);

describe('pickToday — every scenario (3 doshas × 7 moods × 5 diets × 3 time options = 315)', () => {
  const chosen = new Set();
  for (const dominant of DOSHAS) for (const mood of MOODS) for (const diet of DIETS) for (const minutes of MINUTES) {
    it(`${dominant} · ${mood} · ${diet} · ${minutes} min`, () => {
      const plan = pickToday({ ...base, dominant, mood, prefs: { minutes, diet } });
      expect(Object.keys(plan)).toEqual(MODULES);
      for (const m of MODULES) {
        const p = plan[m];
        expect(p, `${m} should never be empty with the real content`).not.toBeNull();
        expect(p.module).toBe(m);
        expect(fits(p, diet), `${p.id} must fit ${diet}`).toBe(true);
        // time is respected whenever any practice of that module fits the time
        if (practices.some((q) => q.module === m && fits(q, diet) && q.minutes <= minutes)) expect(p.minutes).toBeLessThanOrEqual(minutes);
        // the pick suits today's target dosha (the whole point of the engine)
        expect(p.doshas).toContain(MOOD_TARGET[mood] ?? dominant);
        chosen.add(p.id);
      }
      expect(pickToday({ ...base, dominant, mood, prefs: { minutes, diet } })).toEqual(plan); // deterministic
    });
  }
  afterAll(() => {
    // content check: practices no scenario ever picks are dead weight (some are only picked to avoid repeats)
    const never = practices.filter((p) => !chosen.has(p.id)).map((p) => p.id);
    console.log(`picked in fresh scenarios: ${chosen.size}/${practices.length}; only via variety: ${never.join(', ') || 'none'}`);
  });
});

describe('pickToday — variety (§4.3)', () => {
  it('never repeats yesterday when an alternative exists', () => {
    const day1 = pickToday(base);
    const history = MODULES.map((m) => ({ date: '2026-11-17', practiceId: day1[m].id }));
    const day2 = pickToday({ ...base, history });
    for (const m of MODULES) expect(day2[m].id).not.toBe(day1[m].id);
  });
  it('a 7-day run uses more than one practice per module', () => {
    const history = []; const used = { dinacharya: new Set(), ahara: new Set(), mantra: new Set() };
    for (let d = 1; d <= 7; d++) {
      const date = `2026-11-${String(10 + d).padStart(2, '0')}`;
      const plan = pickToday({ ...base, date, history });
      for (const m of MODULES) { used[m].add(plan[m].id); history.push({ date, practiceId: plan[m].id }); }
    }
    for (const m of MODULES) expect(used[m].size).toBeGreaterThan(1);
  });
  it('history older than 7 days, today, or in the future does not count', () => {
    const p = practices[0]; const ctx = { target: 'vata', dominant: 'vata', mood: 'anxious', date: '2026-11-18' };
    const fresh = scorePractice(p, { ...ctx, history: [] });
    for (const date of ['2026-11-10', '2026-11-18', '2026-11-25']) expect(scorePractice(p, { ...ctx, history: [{ date, practiceId: p.id }] })).toBe(fresh);
    expect(scorePractice(p, { ...ctx, history: [{ date: '2026-11-17', practiceId: p.id }] })).toBe(fresh - 5);
    expect(scorePractice(p, { ...ctx, history: [{ date: '2026-11-12', practiceId: p.id }] })).toBe(fresh - 1);
    // done yesterday AND last week → yesterday wins (most recent)
    expect(scorePractice(p, { ...ctx, history: [{ date: '2026-11-12', practiceId: p.id }, { date: '2026-11-17', practiceId: p.id }] })).toBe(fresh - 5);
  });
  it('works across month and year boundaries', () => {
    const p = practices[0]; const ctx = { target: 'vata', dominant: 'vata', mood: 'anxious', history: [{ date: '2025-12-31', practiceId: p.id }] };
    expect(scorePractice(p, { ...ctx, date: '2026-01-01' })).toBe(scorePractice(p, { ...ctx, history: [], date: '2026-01-01' }) - 5);
  });
});

describe('pickToday — keep and edge cases', () => {
  it('keeps done cards when re-picking after a mood change (§4.5)', () => {
    const morning = pickToday(base);
    const later = pickToday({ ...base, mood: 'irritable', keep: { dinacharya: morning.dinacharya.id } });
    expect(later.dinacharya).toBe(morning.dinacharya);
    expect(later.ahara.doshas).toContain('pitta');
  });
  it('ignores a kept id that no longer exists', () => {
    const plan = pickToday({ ...base, keep: { mantra: 'deleted-practice' } });
    expect(plan.mantra.module).toBe('mantra');
  });
  it('relaxes the time filter but never the diet filter', () => {
    const only = [{ id: 'x', module: 'ahara', minutes: 20, doshas: ['vata'], moods: [], diet: ['vegan'] }];
    expect(pickToday({ ...base, practices: only, prefs: { minutes: 5, diet: 'vegan' } }).ahara.id).toBe('x');
    expect(pickToday({ ...base, practices: only, prefs: { minutes: 5, diet: 'jain' } }).ahara).toBeNull();
  });
  it('empty content gives an all-null plan instead of crashing', () => {
    expect(pickToday({ ...base, practices: [] })).toEqual({ dinacharya: null, ahara: null, mantra: null });
  });
  it('unknown mood falls back to the user’s own dosha', () => {
    expect(pickToday({ ...base, dominant: 'kapha', mood: 'confused' })).toEqual(pickToday({ ...base, dominant: 'kapha', mood: 'okay' }));
  });
  it('ties break alphabetically by id', () => {
    const twins = ['b', 'a'].map((id) => ({ id, module: 'mantra', minutes: 5, doshas: ['vata'], moods: [], diet: ['all'] }));
    expect(pickToday({ ...base, practices: twins }).mantra.id).toBe('a');
  });
});

describe('pickToday — no dead content', () => {
  it('every practice is picked within a week for at least one kind of user', () => {
    const seen = new Set();
    for (const dominant of DOSHAS) for (const mood of MOODS) for (const diet of DIETS) for (const minutes of MINUTES) {
      const history = [];
      for (let d = 1; d <= 7; d++) {
        const date = `2026-11-${String(10 + d).padStart(2, '0')}`;
        const plan = pickToday({ practices, dominant, mood, prefs: { minutes, diet }, date, history });
        for (const m of MODULES) { seen.add(plan[m].id); history.push({ date, practiceId: plan[m].id }); }
      }
    }
    expect(practices.filter((p) => !seen.has(p.id)).map((p) => p.id)).toEqual([]);
  });
});
