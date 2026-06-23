const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createTestApp } = require('./test-app-factory');
const { seed } = require('./fixtures');

// El refresh token viaja como cookie httpOnly cuando AUTH_COOKIES=true (ver app/.env,
// igual que en producción) — nunca en el body de la respuesta. Por eso lo extraemos
// de Set-Cookie y lo reenviamos manualmente, simulando el comportamiento del navegador.
function extractCookie(res, name) {
  const setCookie = res.headers['set-cookie'] || [];
  const line = setCookie.find(c => c.startsWith(`${name}=`));
  return line ? line.split(';')[0] : null;
}

describe('Auth refresh reuse detection', () => {
  let app, ds, entities;

  beforeAll(async () => {
    process.env.AUTH_MODE = 'db';
    process.env.AUTH_COOKIES = 'true';
    const ctx = await createTestApp();
    app = ctx.app; ds = ctx.ds; entities = ctx.entities;
    await seed(ds, entities); // permisos por rol, incl. can_view_audit para 'admin'
    const { User } = require('../src/entities-class/User');
    const repo = ds.getRepository(User);
    await repo.save({
      username: 'alice',
      email: 'alice@example.com',
      password_hash: bcrypt.hashSync('secret', 10),
      role: 'admin',
      is_active: true,
    });
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  test('reusing an old refresh token revokes family', async () => {
    // Login to obtain access and refresh (cookie)
    const loginRes = await request(app).post('/api/auth/login').send({ username: 'alice', password: 'secret' });
    expect(loginRes.status).toBe(200);
    const rt1 = extractCookie(loginRes, 'refreshToken');
    expect(rt1).toBeTruthy();

    // First refresh rotates
    const r1 = await request(app).post('/api/auth/refresh').set('Cookie', rt1).send({});
    expect(r1.status).toBe(200);
    const rt2 = extractCookie(r1, 'refreshToken');
    expect(rt2).toBeTruthy();

    // Reuse original token (rt1) should trigger family revocation and 401
    const r2 = await request(app).post('/api/auth/refresh').set('Cookie', rt1).send({});
    expect(r2.status).toBe(401);

    // The rotated token (rt2) now also should fail because family revoked
    const r3 = await request(app).post('/api/auth/refresh').set('Cookie', rt2).send({});
    expect(r3.status).toBe(401);

    // Audit should record reuse detection event
    const meRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'secret' });
    const adminToken = meRes.body.accessToken || meRes.body.token;
    const logsRes = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(logsRes.status).toBe(200);
    const found = logsRes.body.rows.some(r => r.action === 'refresh-reuse-detected');
    expect(found).toBe(true);
  });
});
