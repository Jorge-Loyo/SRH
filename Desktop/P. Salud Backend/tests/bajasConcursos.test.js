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

it('GET /api/bajas-concursos returns list', async () => {
  const res = await request(app).get('/api/bajas-concursos?page=1&limit=10');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.data)).toBe(true);
});

it('GET /api/bajas-concursos/:id/:periodo returns item', async () => {
  const res = await request(app).get(`/api/bajas-concursos/${data.baja.id_baja}/${data.baja.periodo}`);
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('id_baja', data.baja.id_baja);
});
