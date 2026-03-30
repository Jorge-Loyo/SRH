const request = require('supertest');
const { createTestApp } = require('./test-app-factory');

let app, ds, entities;

beforeAll(async () => {
  process.env.AUTH_MODE = 'db';
  const ctx = await createTestApp();
  app = ctx.app; ds = ctx.ds; entities = ctx.entities;
  // Seed admin user in DB
  const { User } = entities;
  const bcrypt = require('bcryptjs');
  const repo = ds.getRepository(User);
  await repo.save({ username: 'admin', email: 'admin@example.com', password_hash: bcrypt.hashSync('admin123', 10), role: 'admin', is_active: true });
});

afterAll(async () => { if (ds && ds.isInitialized) await ds.destroy(); });

it('POST /api/auth/login (db) returns token', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'admin123' });
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('token');
});

it('POST /api/siglas without token is 401', async () => {
  const res = await request(app)
    .post('/api/siglas')
    .send({ sigla: 'XX', universo_totalizador: 'U', tipo_hospital_sigla: 'G' });
  expect(res.status).toBe(401);
});

it('POST /api/siglas with admin token is 201', async () => {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'admin123' });
  const token = login.body.token;
  const res = await request(app)
    .post('/api/siglas')
    .set('Authorization', `Bearer ${token}`)
    .send({ sigla: 'XY', universo_totalizador: 'U', tipo_hospital_sigla: 'G' });
  expect(res.status).toBe(201);
});
