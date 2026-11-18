import { progressStats } from './progressStats.js';

const today = '2026-11-18';
const s = (date, kind, before, after, avgHum = 8, steadyRounds = 5, rounds = 6) => ({ date, kind, before, after, avgHum, steadyRounds, rounds });

describe('progressStats', () => {
  it('a brand-new user gets a friendly empty state, not errors', () => {
    const r = progressStats({ today });
    expect(r.days).toHaveLength(14);
    expect(r.daysPractised).toBe(0);
    expect(r.moodGroups.every((m) => m === null)).toBe(true);
    expect(r.works).toEqual({});
    expect(r.avgHumByWeek).toEqual([null, null]);
    expect(r.steadyPct).toBeNull();
  });
  it('14-day window ends today and ignores older or future days', () => {
    const r = progressStats({ today, completions: [{ date: '2026-11-05' }, { date: '2026-11-04' }, { date: '2026-11-18' }, { date: '2026-11-19' }, { date: '2026-11-18' }] });
    expect(r.days[0].date).toBe('2026-11-05');
    expect(r.days[13].date).toBe(today);
    expect(r.daysPractised).toBe(2); // 05 and 18 (18 counted once)
    expect(r.days[13].count).toBe(2); // two practices on the 18th → a 2-petal flower
    expect(r.days[0].count).toBe(1);
  });
  it('flower petals cap at 3 even with odd data', () => {
    expect(progressStats({ today, completions: Array(5).fill({ date: today }) }).days[13].count).toBe(3);
  });
  it('window crosses a month boundary correctly', () => {
    expect(progressStats({ today: '2026-12-03' }).days[0].date).toBe('2026-11-20');
  });
  it('groups moods', () => {
    const r = progressStats({ today, checkins: [{ date: '2026-11-18', mood: 'overthinking' }, { date: '2026-11-17', mood: 'low' }, { date: '2026-11-16', mood: 'okay' }, { date: '2026-11-15', mood: 'irritable' }, { date: '2026-11-14', mood: '???' }] });
    expect(r.moodGroups.slice(-5)).toEqual([null, 'heated', 'okay', 'heavy', 'busy']);
  });
  it('"what works" needs 3 complete before/after pairs per kind', () => {
    const two = progressStats({ today, sessions: [s('2026-11-18', 'om', 2, 4), s('2026-11-17', 'om', 2, 3)] });
    expect(two.works).toEqual({});
    const r = progressStats({ today, sessions: [s('2026-11-18', 'bhramari', 2, 4), s('2026-11-17', 'bhramari', 3, 4), s('2026-11-16', 'bhramari', 2, 3), s('2026-11-15', 'bhramari', null, 5), s('2026-11-14', 'om', 3, 3)] });
    expect(r.works).toEqual({ bhramari: { change: 1.3, sessions: 3 } }); // skipped taps are left out
  });
  it('handles a negative change honestly', () => {
    const r = progressStats({ today, sessions: [1, 2, 3].map((d) => s(`2026-11-1${d}`, 'om', 4, 3)) });
    expect(r.works.om.change).toBe(-1);
  });
  it('timer-only sessions (no steadiness) do not count towards steady %', () => {
    const r = progressStats({ today, sessions: [s('2026-11-18', 'om', null, null, 8, null, 6), s('2026-11-17', 'om', null, null, 8, 3, 6)] });
    expect(r.steadyPct).toBe(50);
    expect(progressStats({ today, sessions: [s('2026-11-18', 'om', null, null, 8, null, 6)] }).steadyPct).toBeNull();
  });
  it('weekly hum averages and steady %', () => {
    const r = progressStats({ today, sessions: [s('2026-11-18', 'om', null, null, 10, 6, 6), s('2026-11-10', 'om', null, null, 6, 3, 6)] });
    expect(r.avgHumByWeek).toEqual([6, 10]);
    expect(r.steadyPct).toBe(75);
  });
});
