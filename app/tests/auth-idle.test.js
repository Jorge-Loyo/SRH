const request = require('supertest');
const bcrypt = require('bcryptjs');
let createTestApp;

// El refresh token viaja como cookie httpOnly cuando AUTH_COOKIES=true (ver app/.env,
// igual que en producción) — nunca en el body de la respuesta.
function extractCookie(res, name) {
  const setCookie = res.headers['set-cookie'] || [];
  const line = setCookie.find(c => c.startsWith(`${name}=`));
  return line ? line.split(';')[0] : null;
}

describe('Auth idle timeout (inactivity)', () => {
  let app, ds;

  beforeAll(async () => {
    // Ensure env is set BEFORE requiring modules that read config
    process.env.AUTH_MODE = 'db';
    process.env.AUTH_IDLE_MINUTES = '1'; // keep short for test
    process.env.AUTH_COOKIES = 'true';
    ({ createTestApp } = require('./test-app-factory'));
    const ctx = await createTestApp();
    app = ctx.app; ds = ctx.ds;
    const { User } = require('../src/entities-class/User');
    const repo = ds.getRepository(User);
    await repo.save({
      username: 'idle',
      email: 'idle@example.com',
      password_hash: bcrypt.hashSync('secret', 10),
      role: 'admin',
      is_active: true,
    });
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  test('refresh fails after idle threshold and token is revoked', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ username: 'idle', password: 'secret' });
    expect(loginRes.status).toBe(200);
    const rtCookie = extractCookie(loginRes, 'refreshToken');
    expect(rtCookie).toBeTruthy();
    const rt = rtCookie.split('=')[1];

    // Set last_used to 2 minutes ago (idle threshold is 1)
  const { RefreshToken } = require('../src/entities-class/RefreshToken');
  const repo = ds.getRepository(RefreshToken);
    const token_hash = require('crypto').createHash('sha256').update(rt).digest('hex');
    const entity = await repo.findOne({ where: { token_hash } });
    entity.last_used = new Date(Date.now() - 2 * 60 * 1000);
    await repo.save(entity);

    const refreshRes = await request(app).post('/api/auth/refresh').set('Cookie', rtCookie).send({});
    expect(refreshRes.status).toBe(401);

    const after = await repo.findOne({ where: { token_hash } });
    expect(after.revoked).toBe(true);
    expect(after.revoked_reason).toBe('idle');
  });
});
