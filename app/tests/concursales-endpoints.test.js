/**
 * Tests de integración — Módulo Concursales
 *
 * Cubre:
 *  - POST   /api/concursales/bajas              (crear baja)
 *  - GET    /api/concursales/bajas              (listar con filtros)
 *  - GET    /api/concursales/bajas/:id          (obtener por id)
 *  - PUT    /api/concursales/bajas/:id          (actualizar)
 *  - DELETE /api/concursales/bajas/:id          (eliminar)
 *  - POST   /api/concursales/seguimiento-cph    (crear seguimiento)
 *  - GET    /api/concursales/seguimiento-cph    (listar con filtros)
 *  - GET    /api/concursales/seguimiento-cph/:id
 *  - PUT    /api/concursales/seguimiento-cph/:id
 *  - DELETE /api/concursales/seguimiento-cph/:id
 *  - GET    /api/concursales/seguimiento-cph/by-baja/:idBaja
 *  - GET    /api/concursales/seguimiento-cph/estados/unique
 *
 * Usa sql.js (in-memory) — no toca la BD de producción.
 */

const request  = require('supertest');
const bcrypt   = require('bcryptjs');
const express  = require('express');
const bodyParser  = require('body-parser');
const cookieParser = require('cookie-parser');
const path     = require('path');

// ─── Setup de app in-memory ───────────────────────────────────────────────────

async function createConcursalesApp() {
  const { AppDataSource } = require('../src/config/data-source');

  const { BajaConsolidada }  = require('../src/modules/bajas/BajaConsolidadaEntity');
  const { SeguimientoCph }   = require('../src/modules/seguimiento-cph/SeguimientoCphEntity');
  const { SeguimientoCeetps } = require('../src/modules/seguimiento-ceetps/SeguimientoCeetpsEntity');
  const { User }             = require('../src/entities-class/User');
  const { RefreshToken }     = require('../src/entities-class/RefreshToken');
  const { AuditLog }         = require('../src/entities-class/AuditLog');
  const { Permission }       = require('../src/entities-class/Permission');

  AppDataSource.setOptions({
    type: 'sqljs',
    database: new Uint8Array(),
    autoSave: false,
    synchronize: true,
    dropSchema: true,
    logging: false,
    entities: [BajaConsolidada, SeguimientoCph, SeguimientoCeetps, User, RefreshToken, AuditLog, Permission],
    sqlJsConfig: {
      locateFile: (file) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
    },
  });

  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  await AppDataSource.initialize();

  // Seed: permiso admin + usuario admin
  const permRepo = AppDataSource.getRepository(Permission);
  await permRepo.save({
    role: 'admin', description: 'Admin',
    can_read_all: true, can_create: true, can_update: true, can_delete: true,
    can_alter_structure: true, can_manage_users: true, can_view_audit: true,
    filter_by_hospital: false, hospital_code: null,
  });

  const userRepo = AppDataSource.getRepository(User);
  await userRepo.save({
    username: 'admin', email: 'admin@test.com',
    password_hash: bcrypt.hashSync('admin123', 10),
    role: 'admin', is_active: true,
  });

  const { auditMiddleware } = require('../src/middlewares/audit');
  const apiRoutes = require('../src/routes');

  const app = express();
  app.use(cookieParser());
  app.use(bodyParser.json({ limit: '2mb' }));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use('/api', auditMiddleware, apiRoutes);

  return { app, ds: AppDataSource };
}

// ─── Estado compartido del suite ─────────────────────────────────────────────

let app, ds, token;
let bajaId, seguimientoId;

beforeAll(async () => {
  process.env.AUTH_MODE = 'db';
  ({ app, ds } = await createConcursalesApp());

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'admin123' });
  token = loginRes.body.token;
  expect(token).toBeTruthy();
});

afterAll(async () => {
  if (ds && ds.isInitialized) await ds.destroy();
});

// ─── BAJAS CONSOLIDADAS ───────────────────────────────────────────────────────

describe('POST /api/concursales/bajas', () => {
  test('crea una baja con campos mínimos', async () => {
    const res = await request(app)
      .post('/api/concursales/bajas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre_apellido: 'García, Juan',
        cuil: '20-12345678-9',
        sigla: 'HGAT',
        puesto_baja: 'MEDICO DE PLANTA',
        escalafon: 'Médico',
        genera_concurso: 'SI',
        fecha_baja: '2024-03-15',
        motivo_baja: 'Renuncia',
      });
    expect(res.status).toBe(201);
    // El servicio devuelve { baja, seguimiento, seguimientoCeetps }
    expect(res.body).toHaveProperty('baja');
    expect(res.body.baja).toHaveProperty('id');
    expect(res.body.baja.nombre_apellido).toBe('García, Juan');
    // es_cph=true porque genera_concurso=SI y puesto no es Técnico/Enfermería
    expect(res.body.baja.es_cph).toBe(true);
    // Se crea seguimiento automáticamente
    expect(res.body.seguimiento).not.toBeNull();
    expect(res.body.seguimiento.id_baja).toBe(res.body.baja.id);
    bajaId = res.body.baja.id;
  });

  test('crea una baja sin genera_concurso (campo opcional)', async () => {
    const res = await request(app)
      .post('/api/concursales/bajas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre_apellido: 'López, Ana', sigla: 'HGAZ' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('baja');
    expect(res.body.baja).toHaveProperty('id');
    // Sin genera_concurso=SI no se crea seguimiento
    expect(res.body.seguimiento).toBeNull();
  });

  test('rechaza sin token → 401', async () => {
    const res = await request(app)
      .post('/api/concursales/bajas')
      .send({ nombre_apellido: 'Test' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/concursales/bajas', () => {
  test('devuelve lista con meta', async () => {
    const res = await request(app)
      .get('/api/concursales/bajas')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.count).toBeGreaterThanOrEqual(1);
  });

  test('filtra por sigla', async () => {
    const res = await request(app)
      .get('/api/concursales/bajas?sigla=HGAT')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every(b => b.sigla === 'HGAT')).toBe(true);
  });

  test('filtra por genera_concurso=SI', async () => {
    const res = await request(app)
      .get('/api/concursales/bajas?genera_concurso=SI')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every(b => b.genera_concurso === 'SI')).toBe(true);
  });

  test('paginación: limit=1 devuelve 1 resultado', async () => {
    const res = await request(app)
      .get('/api/concursales/bajas?limit=1&offset=0')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  test('búsqueda por search (nombre)', async () => {
    const res = await request(app)
      .get('/api/concursales/bajas?search=García')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/concursales/bajas/:id', () => {
  test('devuelve la baja creada', async () => {
    const res = await request(app)
      .get(`/api/concursales/bajas/${bajaId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(bajaId);
    expect(res.body.cuil).toBe('20-12345678-9');
  });

  test('id inexistente → 404', async () => {
    const res = await request(app)
      .get('/api/concursales/bajas/99999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('id no numérico → 400', async () => {
    const res = await request(app)
      .get('/api/concursales/bajas/abc')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/concursales/bajas/:id', () => {
  test('actualiza motivo_baja', async () => {
    const res = await request(app)
      .put(`/api/concursales/bajas/${bajaId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ motivo_baja: 'Jubilación' });
    expect(res.status).toBe(200);
    expect(res.body.motivo_baja).toBe('Jubilación');
  });

  test('actualiza genera_concurso — crea baja auxiliar para no afectar bajaId', async () => {
    // Usamos una baja separada para no disparar eliminación en cascada sobre bajaId
    const crear = await request(app)
      .post('/api/concursales/bajas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre_apellido: 'Auxiliar Test', sigla: 'HGAZ', genera_concurso: 'SI',
              puesto_baja: 'MEDICO DE PLANTA', escalafon: 'Médico', fecha_baja: '2024-01-01' });
    const auxId = crear.body.baja.id;
    const res = await request(app)
      .put(`/api/concursales/bajas/${auxId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ genera_concurso: 'NO' });
    // El servicio puede eliminar la baja al cambiar genera_concurso a NO — aceptamos 200 o 404
    expect([200, 404]).toContain(res.status);
  });

  test('id inexistente → 404', async () => {
    const res = await request(app)
      .put('/api/concursales/bajas/99999')
      .set('Authorization', `Bearer ${token}`)
      .send({ motivo_baja: 'X' });
    expect(res.status).toBe(404);
  });
});

// ─── SEGUIMIENTO CPH ──────────────────────────────────────────────────────────

describe('POST /api/concursales/seguimiento-cph', () => {
  test('crea un seguimiento vinculado a la baja', async () => {
    const res = await request(app)
      .post('/api/concursales/seguimiento-cph')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id_baja: bajaId,
        sigla_efector: 'HGAT',
        descr_efector: 'Hospital Tornu',
        nombre_baja: 'García, Juan',
        cuil_baja: '20-12345678-9',
        fecha_baja: '2024-03-15',
        ee_baja: 'EX-2024-001',
        escalafon_1: 'Médico',
        puesto_1: 'MEDICO DE PLANTA',
        estado: 'NO INICIADO',
        usuario: 'Nahila',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.sigla_efector).toBe('HGAT');
    seguimientoId = res.body.id;
  });

  test('crea seguimiento sin id_baja (carga manual directa)', async () => {
    const res = await request(app)
      .post('/api/concursales/seguimiento-cph')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sigla_efector: 'HGNRG',
        nombre_baja: 'Pérez, María',
        estado: 'ACTIVO',
      });
    expect(res.status).toBe(201);
    expect(res.body.id_baja).toBeNull();
  });

  test('rechaza sin token → 401', async () => {
    const res = await request(app)
      .post('/api/concursales/seguimiento-cph')
      .send({ sigla_efector: 'HGAT' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/concursales/seguimiento-cph', () => {
  test('devuelve lista con meta', async () => {
    const res = await request(app)
      .get('/api/concursales/seguimiento-cph')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.count).toBeGreaterThanOrEqual(1);
  });

  test('filtra por sigla_efector', async () => {
    const res = await request(app)
      .get('/api/concursales/seguimiento-cph?sigla_efector=HGAT')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every(r => r.sigla_efector === 'HGAT')).toBe(true);
  });

  test('filtra por estado', async () => {
    const res = await request(app)
      .get('/api/concursales/seguimiento-cph?estado=NO INICIADO')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('filtra por usuario', async () => {
    const res = await request(app)
      .get('/api/concursales/seguimiento-cph?usuario=Nahila')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every(r => r.usuario === 'Nahila')).toBe(true);
  });

  test('filtra por id_baja', async () => {
    const res = await request(app)
      .get(`/api/concursales/seguimiento-cph?id_baja=${bajaId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].id_baja).toBe(bajaId);
  });

  test('búsqueda global por nombre', async () => {
    const res = await request(app)
      .get('/api/concursales/seguimiento-cph?search=García')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('paginación: limit=1', async () => {
    const res = await request(app)
      .get('/api/concursales/seguimiento-cph?limit=1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });
});

describe('GET /api/concursales/seguimiento-cph/:id', () => {
  test('devuelve el seguimiento creado', async () => {
    const res = await request(app)
      .get(`/api/concursales/seguimiento-cph/${seguimientoId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(seguimientoId);
    expect(res.body.cuil_baja).toBe('20-12345678-9');
  });

  test('id inexistente → 404', async () => {
    const res = await request(app)
      .get('/api/concursales/seguimiento-cph/99999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('id no numérico → 400', async () => {
    const res = await request(app)
      .get('/api/concursales/seguimiento-cph/abc')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/concursales/seguimiento-cph/by-baja/:idBaja', () => {
  test('devuelve el seguimiento por id_baja', async () => {
    const res = await request(app)
      .get(`/api/concursales/seguimiento-cph/by-baja/${bajaId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id_baja).toBe(bajaId);
  });

  test('baja sin seguimiento → 404', async () => {
    const res = await request(app)
      .get('/api/concursales/seguimiento-cph/by-baja/99999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('id no numérico → 400', async () => {
    const res = await request(app)
      .get('/api/concursales/seguimiento-cph/by-baja/abc')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/concursales/seguimiento-cph/estados/unique', () => {
  test('devuelve array de estados únicos', async () => {
    const res = await request(app)
      .get('/api/concursales/seguimiento-cph/estados/unique')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toContain('NO INICIADO');
  });
});

describe('PUT /api/concursales/seguimiento-cph/:id', () => {
  test('actualiza estado a ACTIVO', async () => {
    const res = await request(app)
      .put(`/api/concursales/seguimiento-cph/${seguimientoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        estado: 'ACTIVO',
        ee_concurso: 'EX-2024-CONC-001',
        fecha_ee_concurso: '2024-04-01',
      });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ACTIVO');
    expect(res.body.ee_concurso).toBe('EX-2024-CONC-001');
  });

  test('actualiza campos booleanos', async () => {
    const res = await request(app)
      .put(`/api/concursales/seguimiento-cph/${seguimientoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ sorteo_jurado: true, suspendido: false });
    expect(res.status).toBe(200);
    expect(res.body.sorteo_jurado).toBe(true);
    expect(res.body.suspendido).toBe(false);
  });

  test('actualiza sub_estado_3', async () => {
    const res = await request(app)
      .put(`/api/concursales/seguimiento-cph/${seguimientoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ sub_estado_3: 'B-AUTORIZADO', fecha_autorizacion: '2024-05-01' });
    expect(res.status).toBe(200);
    expect(res.body.sub_estado_3).toBe('B-AUTORIZADO');
  });

  test('id inexistente → 404', async () => {
    const res = await request(app)
      .put('/api/concursales/seguimiento-cph/99999')
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'ACTIVO' });
    expect(res.status).toBe(404);
  });
});

// ─── DELETE — al final para no romper los tests anteriores ───────────────────

describe('DELETE /api/concursales/seguimiento-cph/:id', () => {
  test('elimina el seguimiento', async () => {
    const res = await request(app)
      .delete(`/api/concursales/seguimiento-cph/${seguimientoId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(seguimientoId);
  });

  test('ya eliminado → 404', async () => {
    const res = await request(app)
      .delete(`/api/concursales/seguimiento-cph/${seguimientoId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/concursales/bajas/:id', () => {
  test('la baja ya fue eliminada en cascada por el DELETE del seguimiento', async () => {
    // SeguimientoCphService.remove() elimina la baja vinculada en cascada.
    // Por eso al intentar eliminar la baja directamente ya devuelve 404.
    const res = await request(app)
      .delete(`/api/concursales/bajas/${bajaId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('baja sin seguimiento se elimina directamente', async () => {
    // Crear una baja que NO genere seguimiento (genera_concurso != SI)
    const crear = await request(app)
      .post('/api/concursales/bajas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre_apellido: 'Sin Seguimiento', sigla: 'HGAZ' });
    const id = crear.body.baja.id;

    const del = await request(app)
      .delete(`/api/concursales/bajas/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    expect(del.body.id).toBe(id);

    // Segunda vez → 404
    const del2 = await request(app)
      .delete(`/api/concursales/bajas/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del2.status).toBe(404);
  });
});
