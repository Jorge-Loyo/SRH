const request = require('supertest');
const { createTestApp } = require('./test-app-factory');

/**
 * Tests de Seguridad para Recorridas
 * 
 * Valida que:
 * 1. Los roles admin, editor, viewer tienen acceso
 * 2. El rol director NO tiene acceso (403 Forbidden)
 * 3. Usuarios no autenticados son rechazados (401)
 * 4. Solo admin y editor pueden eliminar
 */

let app, ds, entities;
let adminToken, editorToken, viewerToken, directorToken;

beforeAll(async () => {
  process.env.AUTH_MODE = 'db';
  const ctx = await createTestApp();
  app = ctx.app; 
  ds = ctx.ds; 
  entities = ctx.entities;
  
  const { User } = entities;
  const bcrypt = require('bcryptjs');
  const repo = ds.getRepository(User);
  
  // Seed usuarios con diferentes roles
  await repo.save({ 
    username: 'admin', 
    email: 'admin@example.com', 
    password_hash: bcrypt.hashSync('admin123', 10), 
    role: 'admin', 
    is_active: true 
  });
  
  await repo.save({ 
    username: 'editor', 
    email: 'editor@example.com', 
    password_hash: bcrypt.hashSync('editor123', 10), 
    role: 'editor', 
    is_active: true 
  });
  
  await repo.save({ 
    username: 'viewer', 
    email: 'viewer@example.com', 
    password_hash: bcrypt.hashSync('viewer123', 10), 
    role: 'viewer', 
    is_active: true 
  });
  
  await repo.save({ 
    username: 'director', 
    email: 'director@example.com', 
    password_hash: bcrypt.hashSync('director123', 10), 
    role: 'director', 
    hospital_code: 'HGACA',
    is_active: true 
  });
  
  // Obtener tokens para cada usuario
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'admin123' });
  adminToken = adminRes.body.token;
  
  const editorRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'editor@example.com', password: 'editor123' });
  editorToken = editorRes.body.token;
  
  const viewerRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'viewer@example.com', password: 'viewer123' });
  viewerToken = viewerRes.body.token;
  
  const directorRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'director@example.com', password: 'director123' });
  directorToken = directorRes.body.token;
});

afterAll(async () => { 
  if (ds && ds.isInitialized) await ds.destroy(); 
});

// ===== Tests de Autenticación =====

it('GET /api/recorridas sin token devuelve 401', async () => {
  const res = await request(app).get('/api/recorridas');
  expect(res.status).toBe(401);
});

it('POST /api/recorridas sin token devuelve 401', async () => {
  const res = await request(app)
    .post('/api/recorridas')
    .send({ hospital_code: 'HGACA', titulo: 'Test', contenido_html: '<p>Test</p>' });
  expect(res.status).toBe(401);
});

// ===== Tests de Autorización: Director EXCLUIDO =====

it('GET /api/recorridas con token de director devuelve 403 (Forbidden)', async () => {
  const res = await request(app)
    .get('/api/recorridas')
    .set('Authorization', `Bearer ${directorToken}`);
  expect(res.status).toBe(403);
  expect(res.body.error).toMatch(/permitido|autorizado|acceso|forbidden/i);
});

it('POST /api/recorridas con token de director devuelve 403 (Forbidden)', async () => {
  const res = await request(app)
    .post('/api/recorridas')
    .set('Authorization', `Bearer ${directorToken}`)
    .send({ hospital_code: 'HGACA', titulo: 'Test Director', contenido_html: '<p>Test</p>' });
  expect(res.status).toBe(403);
  expect(res.body.error).toMatch(/permitido|autorizado|acceso|forbidden/i);
});

// ===== Tests de Autorización: Admin, Editor, Viewer PERMITIDOS =====

it('GET /api/recorridas con token de admin devuelve 200', async () => {
  const res = await request(app)
    .get('/api/recorridas')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('rows');
  expect(Array.isArray(res.body.rows)).toBe(true);
});

it('GET /api/recorridas con token de editor devuelve 200', async () => {
  const res = await request(app)
    .get('/api/recorridas')
    .set('Authorization', `Bearer ${editorToken}`);
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('rows');
});

it('GET /api/recorridas con token de viewer devuelve 200', async () => {
  const res = await request(app)
    .get('/api/recorridas')
    .set('Authorization', `Bearer ${viewerToken}`);
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('rows');
});

it('POST /api/recorridas con token de admin devuelve 201', async () => {
  const res = await request(app)
    .post('/api/recorridas')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ hospital_code: 'HGACA', titulo: 'Recorrida Admin', contenido_html: '<p>Contenido de prueba</p>' });
  expect(res.status).toBe(201);
  expect(res.body).toHaveProperty('id');
  expect(res.body.titulo).toBe('Recorrida Admin');
});

it('POST /api/recorridas con token de editor devuelve 201', async () => {
  const res = await request(app)
    .post('/api/recorridas')
    .set('Authorization', `Bearer ${editorToken}`)
    .send({ hospital_code: 'HSJRP', titulo: 'Recorrida Editor', contenido_html: '<p>Contenido editor</p>' });
  expect(res.status).toBe(201);
  expect(res.body).toHaveProperty('id');
});

it('POST /api/recorridas con token de viewer devuelve 201', async () => {
  const res = await request(app)
    .post('/api/recorridas')
    .set('Authorization', `Bearer ${viewerToken}`)
    .send({ hospital_code: 'HMNSE', titulo: 'Recorrida Viewer', contenido_html: '<p>Contenido viewer</p>' });
  expect(res.status).toBe(201);
  expect(res.body).toHaveProperty('id');
});

// ===== Tests de DELETE: Solo Admin y Editor =====

it('DELETE /api/recorridas con token de viewer devuelve 403 (no permitido)', async () => {
  // Crear recorrida para eliminar
  const createRes = await request(app)
    .post('/api/recorridas')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ hospital_code: 'TEST', titulo: 'Para eliminar', contenido_html: '<p>Test</p>' });
  
  const recorridaId = createRes.body.id;
  
  // Intentar eliminar con viewer
  const res = await request(app)
    .delete(`/api/recorridas/${recorridaId}`)
    .set('Authorization', `Bearer ${viewerToken}`);
  expect(res.status).toBe(403);
});

it('DELETE /api/recorridas con token de admin devuelve 204', async () => {
  // Crear recorrida para eliminar
  const createRes = await request(app)
    .post('/api/recorridas')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ hospital_code: 'TEST', titulo: 'Para eliminar admin', contenido_html: '<p>Test</p>' });
  
  const recorridaId = createRes.body.id;
  
  // Eliminar con admin
  const res = await request(app)
    .delete(`/api/recorridas/${recorridaId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(204);
});

it('DELETE /api/recorridas con token de editor devuelve 204', async () => {
  // Crear recorrida para eliminar
  const createRes = await request(app)
    .post('/api/recorridas')
    .set('Authorization', `Bearer ${editorToken}`)
    .send({ hospital_code: 'TEST', titulo: 'Para eliminar editor', contenido_html: '<p>Test</p>' });
  
  const recorridaId = createRes.body.id;
  
  // Eliminar con editor
  const res = await request(app)
    .delete(`/api/recorridas/${recorridaId}`)
    .set('Authorization', `Bearer ${editorToken}`);
  expect(res.status).toBe(204);
});

// ===== Tests de Validación de Datos =====

it('POST /api/recorridas sin hospital_code devuelve 400', async () => {
  const res = await request(app)
    .post('/api/recorridas')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ titulo: 'Sin hospital', contenido_html: '<p>Test</p>' });
  expect(res.status).toBe(400);
});

it('POST /api/recorridas sin titulo devuelve 400', async () => {
  const res = await request(app)
    .post('/api/recorridas')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ hospital_code: 'HGACA', contenido_html: '<p>Test</p>' });
  expect(res.status).toBe(400);
});

it('POST /api/recorridas sin contenido_html devuelve 400', async () => {
  const res = await request(app)
    .post('/api/recorridas')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ hospital_code: 'HGACA', titulo: 'Sin contenido' });
  expect(res.status).toBe(400);
});

// ===== Tests de Sanitización HTML =====

it('POST /api/recorridas sanitiza scripts (XSS prevention)', async () => {
  const maliciousHtml = '<p>Texto normal</p><script>alert("XSS")</script><p>Más texto</p>';
  const res = await request(app)
    .post('/api/recorridas')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ hospital_code: 'HGACA', titulo: 'Test XSS', contenido_html: maliciousHtml });
  
  expect(res.status).toBe(201);
  // El script debe ser eliminado o transformado (no debe ejecutarse como JS)
  expect(res.body.contenido_html).not.toContain('<script>');
  // El contenido debe preservar el texto seguro
  expect(res.body.contenido_html).toContain('Texto normal');
  expect(res.body.contenido_html).toContain('Más texto');
});
