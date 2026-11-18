/**
 * @vitest-environment node
 */
const getUser = vi.fn(), deleteUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser, admin: { deleteUser } } }) }));
const { default: handler } = await import('./delete-account.js');

const call = async (req) => { const res = { code: 0, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } }; await handler({ headers: {}, method: 'POST', ...req }, res); return res; };
beforeEach(() => { getUser.mockReset(); deleteUser.mockReset(); });

it('only POST', async () => expect((await call({ method: 'GET' })).code).toBe(405));
it('no token → 401, nothing deleted', async () => { expect((await call({})).code).toBe(401); expect(deleteUser).not.toHaveBeenCalled(); });
it('invalid token → 401, nothing deleted', async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });
  expect((await call({ headers: { authorization: 'Bearer x' } })).code).toBe(401);
  expect(deleteUser).not.toHaveBeenCalled();
});
it('valid token deletes exactly that user', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null }); deleteUser.mockResolvedValue({ error: null });
  const r = await call({ headers: { authorization: 'Bearer good' } });
  expect(getUser).toHaveBeenCalledWith('good');
  expect(deleteUser).toHaveBeenCalledWith('u-1');
  expect(r).toMatchObject({ code: 200, body: { deleted: true } });
});
it('a failed delete reports 500', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null }); deleteUser.mockResolvedValue({ error: { message: 'x' } });
  expect((await call({ headers: { authorization: 'Bearer good' } })).code).toBe(500);
});
