const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createTestApp } = require('./test-app-factory');

describe('Audit logs middleware and filters', () => {
  let app, ds, entities;
  let adminToken;

  beforeAll(async () => {
    process.env.AUTH_MODE = 'db';
    const ctx = await createTestApp();
    app = ctx.app; ds = ctx.ds; entities = ctx.entities;
    const { User } = require('../src/entities-class/User');
    const repo = ds.getRepository(User);
    await repo.save({
      username: 'bob',
      email: 'bob@example.com',
      password_hash: bcrypt.hashSync('secret', 10),
      role: 'admin',
      is_active: true,
    });
    const loginRes = await request(app).post('/api/auth/login').send({ username: 'bob', password: 'secret' });
    adminToken = loginRes.body.accessToken || loginRes.body.token;
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  test('writing to API creates audit entries and filters work', async () => {
    // Create a Sigla (write = should be audited)
    const createRes = await request(app)
      .post('/api/siglas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sigla: 'AUD', universo_totalizador: 'TEST', tipo_hospital_sigla: 'X' });
    expect(createRes.status).toBe(201);

    // Fetch audit logs via API as admin
    const logsRes = await request(app)
      .get('/api/audit?source=api&action=create')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(logsRes.status).toBe(200);
    const hasCreate = logsRes.body.rows.some(r => (r.method === 'POST' && (r.path || '').includes('/api/siglas')));
    expect(hasCreate).toBe(true);
  });
});
