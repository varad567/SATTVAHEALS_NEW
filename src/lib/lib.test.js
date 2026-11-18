import * as db from './db.js';
import { todayISO, addDays, greeting, dayLabel } from './format.js';

beforeEach(() => localStorage.clear());

describe('db (local stand-in)', () => {
  it('a new user loads as empty, not undefined', async () => {
    expect(await db.load('u1')).toEqual({ profile: null, checkins: [], completions: [], sessions: [] });
  });
  it('saves and reloads a profile', async () => {
    await db.saveProfile('u1', { name: 'A' });
    expect((await db.load('u1')).profile).toEqual({ name: 'A' });
  });
  it('one check-in per day: saving again replaces it', async () => {
    await db.saveCheckin('u1', '2026-11-18', 'low');
    await db.saveCheckin('u1', '2026-11-18', 'okay');
    await db.saveCheckin('u1', '2026-11-17', 'low');
    expect((await db.load('u1')).checkins).toEqual(expect.arrayContaining([{ date: '2026-11-18', mood: 'okay' }, { date: '2026-11-17', mood: 'low' }]));
    expect((await db.load('u1')).checkins).toHaveLength(2);
  });
  it('done → undo → done again keeps exactly one row per module per day', async () => {
    await db.setDone('u1', '2026-11-18', 'ahara', 'a', true);
    await db.setDone('u1', '2026-11-18', 'ahara', 'a', false);
    expect((await db.load('u1')).completions).toEqual([]);
    await db.setDone('u1', '2026-11-18', 'ahara', 'a', true);
    await db.setDone('u1', '2026-11-18', 'ahara', 'b', true);
    expect((await db.load('u1')).completions).toEqual([{ date: '2026-11-18', module: 'ahara', practiceId: 'b' }]);
  });
  it('users never see each other’s data, and delete removes only one user', async () => {
    await db.saveProfile('u1', { name: 'A' }); await db.saveProfile('u2', { name: 'B' });
    await db.deleteAll('u1');
    expect((await db.load('u1')).profile).toBeNull();
    expect((await db.load('u2')).profile).toEqual({ name: 'B' });
  });
  it('recovers from corrupted storage instead of crashing', async () => {
    localStorage.setItem('sh.db.v1', '{not json');
    expect((await db.load('u1')).profile).toBeNull();
    await db.saveProfile('u1', { name: 'A' });
    expect((await db.load('u1')).profile).toEqual({ name: 'A' });
  });
});

describe('date helpers', () => {
  it('todayISO uses the local calendar day', () => {
    expect(todayISO(new Date(2026, 10, 18, 23, 59))).toBe('2026-11-18');
    expect(todayISO(new Date(2026, 10, 19, 0, 1))).toBe('2026-11-19');
  });
  it('addDays crosses months and years', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it.each([[0, 'Good morning'], [11, 'Good morning'], [12, 'Good afternoon'], [16, 'Good afternoon'], [17, 'Good evening'], [23, 'Good evening']])('hour %i → %s', (h, g) => expect(greeting(h)).toBe(g));
  it('dayLabel names the right weekday', () => expect(dayLabel('2026-11-18')).toBe('Wednesday'));
});
