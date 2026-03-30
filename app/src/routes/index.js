const express = require('express');

const siglas = require('./siglasRoutes');
const personas = require('./personasRoutes');
const cargos = require('./cargosRoutes');
const roles = require('./rolesRoutes');
const bajasConcursos = require('./bajasConcursosRoutes');
const concursos = require('./concursosRoutes');
const schema = require('./schemaRoutes');
const auth = require('./authRoutes');
const users = require('./usersRoutes');
const audit = require('./auditRoutes');
const periodos = require('./periodosRoutes');
const organigrama = require('./organigramaRoutes');
const recorridas = require('./recorridasRoutes');
const minutas = require('./minutasRoutes');
const pages = require('./pagesRoutes');
const admin = require('./adminRoutes');

const router = express.Router();

router.use('/siglas', siglas);
router.use('/personas', personas);
router.use('/cargos', cargos);
router.use('/roles', roles);
router.use('/bajas-concursos', bajasConcursos);
router.use('/concursos', concursos);
router.use('/_schema', schema);
router.use('/auth', auth);
router.use('/users', users);
router.use('/audit', audit);
router.use('/periodos', periodos);
router.use('/organigrama', organigrama);
router.use('/recorridas', recorridas);
router.use('/minutas', minutas);
router.use('/pages', pages);
router.use('/admin', admin);

module.exports = router;
