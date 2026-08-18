const express = require('express');

const siglas = require('./siglasRoutes');
const personas = require('./personasRoutes');
const cargos = require('./cargosRoutes');
const roles = require('./rolesRoutes');
const schema = require('./schemaRoutes');
const auth = require('./authRoutes');
const users = require('./usersRoutes');
const audit = require('./auditRoutes');
const periodos = require('./periodosRoutes');
const organigrama = require('./organigramaRoutes');
const recorridas = require('./recorridasRoutes');
const minutas = require('./minutasRoutes');
const pou = require('./pouRoutes');
const admin = require('./adminRoutes');
const hospitalesApi = require('./hospitalesApiRoutes');
const tablasApi = require('./tablasApiRoutes');
const seguridadApi = require('./seguridadApiRoutes');
const dotacionTotalApi = require('./dotacionTotalApiRoutes');
const dotacionActivaApi = require('./dotacionActivaRoutes');

// ─── Módulo 2: Bajas Consolidadas + Seguimiento CPH + CEETPS + Configuración ──
const bajasConsolidadas   = require('../modules/bajas/bajaConsolidadaRoutes');
const seguimientoCph      = require('../modules/seguimiento-cph/seguimientoCphRoutes');
const seguimientoCeetps   = require('../modules/seguimiento-ceetps/seguimientoCeetpsRoutes');
const conjuntosConfig     = require('../modules/conjuntos-config/conjuntosConfigRoutes');
const tableroKpis         = require('../modules/tablero-kpis/tableroKpisRoutes');
const cargaMasivaDotacion = require('../modules/carga-masiva/cargaMasivaRoutes');
const cargaMasivaPou      = require('../modules/carga-masiva/pou/pouRoutes');
const altaCargo           = require('../modules/alta-cargo/altaCargoRoutes');
const herramientas        = require('../modules/herramientas/herramientasRoutes');
const dotacion            = require('../modules/dotacion/dotacionRoutes');

const router = express.Router();

router.use('/siglas', siglas);
router.use('/personas', personas);
// Alta de Cargo debe ir ANTES de /cargos para evitar que /:id/ lo capture
router.use('/cargos/alta', altaCargo);
router.use('/cargos', cargos);
router.use('/roles', roles);
router.use('/_schema', schema);
router.use('/auth', auth);
router.use('/users', users);
router.use('/audit', audit);
router.use('/periodos', periodos);
router.use('/organigrama', organigrama);
router.use('/recorridas', recorridas);
router.use('/minutas', minutas);
router.use('/pou', pou);
router.use('/admin', admin);
router.use('/hospitales', hospitalesApi);
router.use('/tablas', tablasApi);
router.use('/seguridad', seguridadApi);
router.use('/dotacion-total', dotacionTotalApi);
router.use('/dotacion-activa', dotacionActivaApi);
router.use('/admin/carga-masiva/dotacion', cargaMasivaDotacion);
router.use('/admin/carga-masiva/pou', cargaMasivaPou);

router.use('/herramientas', herramientas);
router.use('/dotacion', dotacion);

// ─── Módulo 2 ─────────────────────────────────────────────────────────────────
router.use('/concursales/bajas', bajasConsolidadas);
router.use('/concursales/seguimiento-cph', seguimientoCph);
router.use('/concursales/seguimiento-ceetps', seguimientoCeetps);
router.use('/concursales/config', conjuntosConfig);
router.use('/concursales/tablero', tableroKpis);

// ─── Alta de Cargo — registrado arriba antes de /cargos ─────────────────────

module.exports = router;
