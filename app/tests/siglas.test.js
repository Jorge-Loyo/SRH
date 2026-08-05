const request = require('supertest');
const { createTestApp } = require('./test-app-factory');
const { seed } = require('./fixtures');

let app, ds, entities, data, token;

beforeAll(async () => {
  process.env.AUTH_MODE = 'db';
  const ctx = await createTestApp();
  app = ctx.app; ds = ctx.ds; entities = ctx.entities;
  data = await seed(ds, entities);

  const bcrypt = require('bcryptjs');
  await ds.getRepository(entities.User).save({
    username: 'admin', email: 'admin@example.com',
    password_hash: bcrypt.hashSync('admin123', 10), role: 'admin', is_active: true,
  });
  const loginRes = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'admin123' });
  token = loginRes.body.token;
});

afterAll(async () => { if (ds && ds.isInitialized) await ds.destroy(); });

it('GET /api/siglas returns list', async () => {
  const res = await request(app).get('/api/siglas?page=1&limit=10').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.data)).toBe(true);
  expect(res.body.meta).toHaveProperty('count');
});

it('GET /api/siglas/:id returns item', async () => {
  const res = await request(app).get(`/api/siglas/${data.sigla.id_sigla}`).set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('id_sigla', data.sigla.id_sigla);
});

it('GET /api/siglas/:id with invalid id returns 400', async () => {
  const res = await request(app).get('/api/siglas/abc').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(400);
});
