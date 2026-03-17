const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createTestApp } = require('./test-app-factory');

describe('Audit purge', () => {
  let app, ds;
  let adminToken;

  beforeAll(async () => {
    process.env.AUTH_MODE = 'db';
    const ctx = await createTestApp();
    app = ctx.app; ds = ctx.ds;
    const { User } = require('../src/entities-class/User');
    const urepo = ds.getRepository(User);
    await urepo.save({ username: 'purger', email: 'purger@example.com', password_hash: bcrypt.hashSync('secret', 10), role: 'admin', is_active: true });
    const loginRes = await request(app).post('/api/auth/login').send({ username: 'purger', password: 'secret' });
    adminToken = loginRes.body.accessToken || loginRes.body.token;
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  test('purge deletes only older logs', async () => {
    const { AuditLog } = require('../src/entities-class/AuditLog');
    const repo = ds.getRepository(AuditLog);
    // Insert two logs: one old (200 days), one recent
    const now = new Date();
    const oldDate = new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000);
    const recentDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    await repo.save({ source: 'api', action: 'create', user_username: 'purger', path: '/x', method: 'POST', status: 201, created_at: oldDate });
    await repo.save({ source: 'api', action: 'create', user_username: 'purger', path: '/y', method: 'POST', status: 201, created_at: recentDate });

    const purgeRes = await request(app)
      .post('/api/audit/purge?days=180')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();
    expect(purgeRes.status).toBe(200);

    const listRes = await request(app)
      .get('/api/audit?path=/x')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    // The old '/x' should be gone
    const stillOld = (listRes.body.rows || []).some(r => (r.path || '').includes('/x'));
    expect(stillOld).toBe(false);

    const listRecent = await request(app)
      .get('/api/audit?path=/y')
      .set('Authorization', `Bearer ${adminToken}`);
    const hasRecent = (listRecent.body.rows || []).some(r => (r.path || '').includes('/y'));
    expect(hasRecent).toBe(true);
  });
});
