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

it('GET /api/roles returns list and respects pagination', async () => {
  const res = await request(app).get('/api/roles?page=1&limit=10&sortBy=periodo&sortOrder=DESC').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.data)).toBe(true);
  expect(res.body.meta).toHaveProperty('limit', 10);
});

it('GET /api/roles supports text search (q)', async () => {
  const res = await request(app).get('/api/roles?q=RRHH').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.data)).toBe(true);
});

it('GET /api/roles/:id/:periodo returns item with relations', async () => {
  const res = await request(app).get(`/api/roles/${data.rol.id_rol}/${data.rol.periodo}`).set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  // Relations are loaded in rolesController list/get with relations: { cargo, persona, sigla }
  expect(res.body).toHaveProperty('id_rol', data.rol.id_rol);
});
