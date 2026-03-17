const request = require('supertest');
const { createTestApp } = require('./test-app-factory');

let app, ds, entities;

beforeAll(async () => {
  process.env.AUTH_MODE = 'db';
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
  const { accessToken, refreshToken } = login.body;
  expect(accessToken).toBeTruthy();
  expect(refreshToken).toBeTruthy();

  const ref = await request(app)
    .post('/api/auth/refresh')
    .send({ refreshToken });
  expect(ref.status).toBe(200);
  expect(ref.body.accessToken).toBeTruthy();
  expect(ref.body.refreshToken).toBeTruthy();

  const logout = await request(app)
    .post('/api/auth/logout')
    .send({ refreshToken: ref.body.refreshToken });
  expect([200,204]).toContain(logout.status);
});
