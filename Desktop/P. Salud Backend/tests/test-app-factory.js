const express = require('express');
const bodyParser = require('body-parser');
const { AppDataSource } = require('../src/config/data-source');
const apiRoutes = require('../src/routes');
const { auditMiddleware } = require('../src/middlewares/audit');

async function initTestDataSource(entities) {
  // Reconfigure AppDataSource for in-memory SQL.js (pure WASM, no native build)
  AppDataSource.setOptions({
    type: 'sqljs',
    database: new Uint8Array(),
    autoSave: false,
    synchronize: true,
    dropSchema: true,
    logging: false,
    entities,
  });
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  await AppDataSource.initialize();
  return AppDataSource;
}

async function createTestApp() {
  const { Sigla } = require('../src/entities-class/Sigla');
  const { Persona } = require('../src/entities-class/Persona');
  const { Cargo } = require('../src/entities-class/Cargo');
  const { Rol } = require('../src/entities-class/Rol');
  const { BajaConcurso } = require('../src/entities-class/BajaConcurso');
  const { User } = require('../src/entities-class/User');
  const { RefreshToken } = require('../src/entities-class/RefreshToken');
  const { AuditLog } = require('../src/entities-class/AuditLog');
  const { Permission } = require('../src/entities-class/Permission');
  const { Recorrida } = require('../src/entities-class/Recorrida');

  await initTestDataSource([Sigla, Persona, Cargo, Rol, BajaConcurso, User, RefreshToken, AuditLog, Permission, Recorrida]);

  const app = express();
  app.use(bodyParser.json({ limit: '2mb' }));
  app.use(bodyParser.urlencoded({ extended: true }));
  // Minimal health route similar to server's
  app.get('/health', async (_req, res) => {
    try {
      await AppDataSource.query('SELECT 1');
      res.json({ status: 'ok', db: 'sqljs' });
    } catch (e) {
      res.status(500).json({ status: 'fail', error: e.message });
    }
  });
  app.use('/api', auditMiddleware, apiRoutes);
  return { app, ds: AppDataSource, entities: { Sigla, Persona, Cargo, Rol, BajaConcurso, User, RefreshToken, Permission, Recorrida } };
}

module.exports = { createTestApp };
