const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const apiRoutes = require('../src/routes');
const { auditMiddleware } = require('../src/middlewares/audit');

async function initTestDataSource(entities) {
  const { AppDataSource } = require('../src/config/data-source');
  const path = require('path');

  AppDataSource.setOptions({
    type: 'sqljs',
    database: new Uint8Array(),
    autoSave: false,
    synchronize: true,
    dropSchema: true,
    logging: false,
    entities,
    sqlJsConfig: {
      locateFile: (file) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
    },
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
  const { User } = require('../src/entities-class/User');
  const { RefreshToken } = require('../src/entities-class/RefreshToken');
  const { AuditLog } = require('../src/entities-class/AuditLog');
  const { Permission } = require('../src/entities-class/Permission');
  const { Recorrida } = require('../src/entities-class/Recorrida');

  const ds = await initTestDataSource([Sigla, Persona, Cargo, Rol, User, RefreshToken, AuditLog, Permission, Recorrida]);

  const app = express();
  app.use(cookieParser());
  app.use(bodyParser.json({ limit: '2mb' }));
  app.use(bodyParser.urlencoded({ extended: true }));
  // Minimal health route similar to server's
  app.get('/health', async (_req, res) => {
    try {
      await ds.query('SELECT 1');
      res.json({ status: 'ok', db: 'sqljs' });
    } catch (e) {
      res.status(500).json({ status: 'fail', error: e.message });
    }
  });
  app.use('/api', auditMiddleware, apiRoutes);
  return { app, ds, entities: { Sigla, Persona, Cargo, Rol, User, RefreshToken, Permission, Recorrida } };
}

module.exports = { createTestApp };
