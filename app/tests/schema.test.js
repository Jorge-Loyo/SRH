const request = require('supertest');
const { createTestApp } = require('./test-app-factory');
const { seed } = require('./fixtures');

let app, ds, entities, adminToken;

beforeAll(async () => {
  process.env.AUTH_MODE = 'db';
  const ctx = await createTestApp();
  app = ctx.app; ds = ctx.ds; entities = ctx.entities;
  await seed(ds, ctx.entities);
  
  // 🔐 Crear admin user para obtener token válido (schema requiere auth + admin role)
  const { User } = entities;
  const bcrypt = require('bcryptjs');
  const repo = ds.getRepository(User);
  await repo.save({ 
    username: 'schema-admin', 
    email: 'schema-admin@test.com', 
    password_hash: bcrypt.hashSync('test123', 10), 
    role: 'admin', 
    is_active: true 
  });
  
  // Obtener token admin
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'schema-admin@test.com', password: 'test123' });
  adminToken = loginRes.body.token;
});

afterAll(async () => { if (ds && ds.isInitialized) await ds.destroy(); });

it('GET /api/_schema returns schema map with tables', async () => {
  const res = await request(app)
    .get('/api/_schema')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('siglas');
});

it('GET /api/_schema/siglas returns column list', async () => {
  const res = await request(app)
    .get('/api/_schema/siglas')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.columns)).toBe(true);
});

it('GET /api/_schema without token is 401', async () => {
  const res = await request(app)
    .get('/api/_schema');
  expect(res.status).toBe(401);
});
