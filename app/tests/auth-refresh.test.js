const request = require('supertest');
const { createTestApp } = require('./test-app-factory');

// El refresh token viaja como cookie httpOnly cuando AUTH_COOKIES=true (ver app/.env,
// igual que en producción) — nunca en el body de la respuesta.
function extractCookie(res, name) {
  const setCookie = res.headers['set-cookie'] || [];
  const line = setCookie.find(c => c.startsWith(`${name}=`));
  return line ? line.split(';')[0] : null;
}

let app, ds, entities;

beforeAll(async () => {
  process.env.AUTH_MODE = 'db';
  process.env.AUTH_COOKIES = 'true';
  const ctx = await createTestApp();
  app = ctx.app; ds = ctx.ds; entities = ctx.entities;
  const { User } = entities;
  const bcrypt = require('bcryptjs');
  const repo = ds.getRepository(User);
  await repo.save({ username: 'admin', email: 'admin@example.com', password_hash: bcrypt.hashSync('admin123', 10), role: 'admin', is_active: true });
});

afterAll(async () => { if (ds && ds.isInitialized) await ds.destroy(); });

it('login -> refresh -> logout flow', async () => {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  expect(login.status).toBe(200);
  const { accessToken } = login.body;
  expect(accessToken).toBeTruthy();
  const loginCookie = extractCookie(login, 'refreshToken');
  expect(loginCookie).toBeTruthy();

  const ref = await request(app)
    .post('/api/auth/refresh')
    .set('Cookie', loginCookie)
    .send({});
  expect(ref.status).toBe(200);
  expect(ref.body.accessToken).toBeTruthy();
  const refreshCookie = extractCookie(ref, 'refreshToken');
  expect(refreshCookie).toBeTruthy();

  const logout = await request(app)
    .post('/api/auth/logout')
    .set('Cookie', refreshCookie)
    .send({});
  expect([200,204]).toContain(logout.status);
});
