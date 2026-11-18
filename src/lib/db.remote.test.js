/**
 * Supabase store: checks each function sends the right table, columns, filters and conflict keys,
 * maps snake_case ↔ camelCase, and surfaces errors. Uses a recording fake client.
 */
const calls = [];
let result = { data: [], error: null };
const builder = (table) => {
  const call = { table, ops: [] }; calls.push(call);
  const b = new Proxy({}, { get: (_, op) => (op === 'then' ? (res, rej) => Promise.resolve(typeof result === 'function' ? result(call) : result).then(res, rej) : (...args) => { call.ops.push([op, ...args]); return b; }) });
  return b;
};
vi.mock('./supabase.js', () => ({ supabase: { from: (t) => builder(t), auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } } }));
const db = await import('./db.remote.js');

beforeEach(() => { calls.length = 0; result = { data: [], error: null }; });

it('load reads 4 tables (recent dates only) and maps columns to the app shape', async () => {
  result = (c) => ({ error: null, data: {
    profiles: { name: 'A', prakriti: {}, prefs: {} },
    checkins: [{ date: '2026-11-18', mood: 'low' }],
    completions: [{ date: '2026-11-18', module: 'ahara', practice_id: 'x' }],
    hum_sessions: [{ date: '2026-11-18', practice_id: 'p', kind: 'om', rounds: 3, avg_hum: 8, avg_inhale: 4, steady_rounds: 2, before: 2, after: 4 }],
  }[c.table] });
  const d = await db.load('u');
  expect(calls.map((c) => c.table).sort()).toEqual(['checkins', 'completions', 'hum_sessions', 'profiles']);
  expect(calls.find((c) => c.table === 'profiles').ops).toContainEqual(['eq', 'id', 'u']);
  calls.filter((c) => c.table !== 'profiles').forEach((c) => expect(c.ops.some(([op, col]) => op === 'gte' && col === 'date')).toBe(true));
  expect(d).toEqual({
    profile: { name: 'A', prakriti: {}, prefs: {} },
    checkins: [{ date: '2026-11-18', mood: 'low' }],
    completions: [{ date: '2026-11-18', module: 'ahara', practiceId: 'x' }],
    sessions: [{ date: '2026-11-18', practiceId: 'p', kind: 'om', rounds: 3, avgHum: 8, avgInhale: 4, steadyRounds: 2, before: 2, after: 4 }],
  });
});

it('check-in upserts on (user_id, date)', async () => {
  await db.saveCheckin('u', '2026-11-18', 'okay');
  expect(calls[0]).toEqual({ table: 'checkins', ops: [['upsert', { user_id: 'u', date: '2026-11-18', mood: 'okay' }, { onConflict: 'user_id,date' }]] });
});

it('done upserts on (user_id, date, module); undo deletes exactly that row', async () => {
  await db.setDone('u', '2026-11-18', 'mantra', 'p', true);
  expect(calls[0].ops[0]).toEqual(['upsert', { user_id: 'u', date: '2026-11-18', module: 'mantra', practice_id: 'p' }, { onConflict: 'user_id,date,module' }]);
  await db.setDone('u', '2026-11-18', 'mantra', 'p', false);
  expect(calls[1].ops).toEqual([['delete'], ['eq', 'user_id', 'u'], ['eq', 'date', '2026-11-18'], ['eq', 'module', 'mantra']]);
});

it('profile upsert sends only known fields (no stray data)', async () => {
  await db.saveProfile('u', { name: 'A', prakriti: { v: 1 }, prefs: { d: 1 }, extra: 'nope' });
  expect(calls[0].ops[0]).toEqual(['upsert', { id: 'u', name: 'A', prakriti: { v: 1 }, prefs: { d: 1 }, age_confirmed: true }]);
});

it('hum session maps to snake_case columns', async () => {
  await db.addSession('u', { date: 'd', practiceId: 'p', kind: 'om', rounds: 3, avgHum: 8, avgInhale: 4, steadyRounds: null, before: null, after: 5 });
  expect(calls[0].ops[0][1]).toEqual({ user_id: 'u', date: 'd', practice_id: 'p', kind: 'om', rounds: 3, avg_hum: 8, avg_inhale: 4, steady_rounds: null, before: null, after: 5 });
});

it('database errors are thrown, so the app can show "Couldn’t save"', async () => {
  result = { data: null, error: { message: 'row-level security' } };
  await expect(db.saveCheckin('u', 'd', 'low')).rejects.toMatchObject({ message: 'row-level security' });
  await expect(db.load('u')).rejects.toBeTruthy();
});

it('delete account calls the server with the user’s token and throws on failure', async () => {
  const f = vi.fn(async () => ({ ok: true })); vi.stubGlobal('fetch', f);
  await db.deleteAll('u');
  expect(f).toHaveBeenCalledWith('/api/delete-account', { method: 'POST', headers: { Authorization: 'Bearer tok' } });
  f.mockResolvedValueOnce({ ok: false, status: 500 });
  await expect(db.deleteAll('u')).rejects.toThrow(/500/);
  vi.unstubAllGlobals();
});
