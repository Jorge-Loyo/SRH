const request = require('supertest');
const { createTestApp } = require('./test-app-factory');
const { seed } = require('./fixtures');

let app, ds, entities;

beforeAll(async () => {
  const ctx = await createTestApp();
  app = ctx.app; ds = ctx.ds; entities = ctx.entities;
  await seed(ds, entities);
});

afterAll(async () => { if (ds && ds.isInitialized) await ds.destroy(); });

it('GET /api/periodos returns period metadata including currentPeriod flags', async () => {
  const res = await request(app).get('/api/periodos');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.items)).toBe(true);
  expect(res.body).toHaveProperty('latest');
  expect(res.body).toHaveProperty('currentPeriod');
  expect(res.body).toHaveProperty('hasCurrent');
  expect(res.body).toHaveProperty('recommended');
});

it('GET /api/periodos?hospital=HR filters by hospital sigla and returns recommendation', async () => {
  const res = await request(app).get('/api/periodos?hospital=HR');
  expect(res.status).toBe(200);
  expect(res.body.hospital).toBe('HR');
  expect(res.body).toHaveProperty('recommended');
});
