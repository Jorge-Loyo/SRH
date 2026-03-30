const request = require('supertest');
const { createTestApp } = require('./test-app-factory');
const { seed } = require('./fixtures');

let app, ds, entities, data;

beforeAll(async () => {
  const ctx = await createTestApp();
  app = ctx.app; ds = ctx.ds; entities = ctx.entities;
  data = await seed(ds, entities);
});

afterAll(async () => { if (ds && ds.isInitialized) await ds.destroy(); });

it('GET /api/siglas returns list', async () => {
  const res = await request(app).get('/api/siglas?page=1&limit=10');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.data)).toBe(true);
  expect(res.body.meta).toHaveProperty('count');
});

it('GET /api/siglas/:id returns item', async () => {
  const res = await request(app).get(`/api/siglas/${data.sigla.id_sigla}`);
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('id_sigla', data.sigla.id_sigla);
});

it('GET /api/siglas/:id with invalid id returns 400', async () => {
  const res = await request(app).get('/api/siglas/abc');
  expect(res.status).toBe(400);
});
