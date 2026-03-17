/**
 * tests/admin.test.js
 * Tests para rutas administrativas (cache management)
 */

const request = require('supertest');
const { createTestApp } = require('./test-app-factory');
const { permissionCache } = require('../src/utils/permissionCache');

describe('Admin Routes - Cache Management', () => {
  let app;
  let adminToken;
  let userToken;
  let ds;
  let entities;

  beforeAll(async () => {
    process.env.AUTH_MODE = 'db';
    const ctx = await createTestApp();
    app = ctx.app;
    ds = ctx.ds;
    entities = ctx.entities;
    
    // Crear admin user en BD
    const { User } = entities;
    const bcrypt = require('bcryptjs');
    const repo = ds.getRepository(User);
    await repo.save({ 
      username: 'admin', 
      email: 'admin@test.com', 
      password_hash: bcrypt.hashSync('admin123', 10), 
      role: 'admin', 
      is_active: true 
    });
    await repo.save({ 
      username: 'user', 
      email: 'user@test.com', 
      password_hash: bcrypt.hashSync('user123', 10), 
      role: 'editor', 
      is_active: true 
    });
    
    // Obtener tokens válidos del servidor
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' });
    adminToken = adminLogin.body.token;
    
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'user123' });
    userToken = userLogin.body.token;
  });

  afterAll(async () => {
    if (ds && ds.isInitialized) await ds.destroy();
  });

  beforeEach(() => {
    // IMPORTANTE: Resetear stats ANTES de cada test
    // clearStats() limpia hits/misses para aislamiento entre tests
    permissionCache.clearStats();
  });

  describe('POST /api/admin/cache/invalidate-permissions', () => {
    test('debe rechazar sin autenticación', async () => {
      const res = await request(app)
        .post('/api/admin/cache/invalidate-permissions')
        .send({ role: 'editor' });
      
      expect(res.status).toBe(401);
    });

    test('debe rechazar sin role admin', async () => {
      const res = await request(app)
        .post('/api/admin/cache/invalidate-permissions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'editor' });
      
      expect(res.status).toBe(403);
    });

    test('debe invalidar caché para un role específico', async () => {
      // Precarga caché
      permissionCache.stats.hits = 5;
      permissionCache.stats.misses = 3;

      const res = await request(app)
        .post('/api/admin/cache/invalidate-permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'editor' });
      
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('editor');
    });

    test('debe limpiar todo el caché si no hay role especificado', async () => {
      permissionCache.stats.hits = 10;
      permissionCache.stats.misses = 5;

      const res = await request(app)
        .post('/api/admin/cache/invalidate-permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('All permission caches cleared');
      expect(permissionCache.stats.hits).toBe(0);
      expect(permissionCache.stats.misses).toBe(0);
    });
  });

  describe('GET /api/admin/cache/stats', () => {
    test('debe rechazar sin autenticación', async () => {
      const res = await request(app)
        .get('/api/admin/cache/stats');
      
      expect(res.status).toBe(401);
    });

    test('debe rechazar sin role admin', async () => {
      const res = await request(app)
        .get('/api/admin/cache/stats')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(403);
    });

    test('debe retornar estadísticas del caché', async () => {
      // beforeEach ya reseteo los stats, simplemente setear nuevos valores
      permissionCache.stats.hits = 15;
      permissionCache.stats.misses = 5;

      const res = await request(app)
        .get('/api/admin/cache/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      // Validar que los valores retornados sean numéricos y coherentes
      expect(typeof res.body.hits).toBe('number');
      expect(typeof res.body.misses).toBe('number');
      expect(res.body.hits >= 15).toBe(true); // Al menos 15 (puede haber más por middleware)
      expect(res.body.misses >= 5).toBe(true); // Al menos 5
      expect(res.body.size).toBeDefined();
      expect(res.body.ttlMinutes).toBe(5);
      // Validar que hitRate sea válido (número/porcentaje)
      expect(res.body.hitRate).toMatch(/^\d+\.\d+%$/);
    });

    test('debe calcular hit rate correctamente', async () => {
      // Setear valores conocidos y verificar cálculo
      permissionCache.stats.hits = 80;
      permissionCache.stats.misses = 20;

      const res = await request(app)
        .get('/api/admin/cache/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      // Validar que hitRate esté cerca de 80% (permite pequeñas variaciones por middleware)
      expect(parseFloat(res.body.hitRate)).toBeCloseTo(80, 0);
    });
  });
});
