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

it('GET /api/personas returns list', async () => {
  const res = await request(app).get('/api/personas?page=1&limit=10');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.data)).toBe(true);
});

it('GET /api/personas/:id/:periodo returns item', async () => {
  const res = await request(app).get(`/api/personas/${data.persona.id_persona}/${data.persona.periodo}`);
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('id_persona', data.persona.id_persona);
});

it('GET /api/personas/:id/:periodo with invalid id returns 400', async () => {
  const res = await request(app).get('/api/personas/abc/2024');
  expect(res.status).toBe(400);
});
