const express = require('express');
const controller = require('../controllers/bajasConcursosController');
const { validateIdPeriodo } = require('../middlewares/validators');
const { validateBody } = require('../middlewares/validateBody');
const { validatePagination } = require('../middlewares/paginationValidator');
const { BajaConcursoCreateSchema, BajaConcursoUpdateSchema } = require('../schemas');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

router.get('/', validatePagination, controller.list);
router.get('/:id/:periodo', validateIdPeriodo, controller.getById);
router.post('/', authenticateJWT, authorizeRoles('admin','editor'), validateBody(BajaConcursoCreateSchema), controller.create);
router.put('/:id/:periodo', authenticateJWT, authorizeRoles('admin','editor'), validateIdPeriodo, validateBody(BajaConcursoUpdateSchema), controller.update);
router.delete('/:id/:periodo', authenticateJWT, authorizeRoles('admin'), validateIdPeriodo, controller.remove);

module.exports = router;
