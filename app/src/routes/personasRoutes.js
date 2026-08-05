const { validateIdPeriodo } = require('../middlewares/validators');
const { validateBody } = require('../middlewares/validateBody');
const { validatePagination } = require('../middlewares/paginationValidator');
const { PersonaCreateSchema, PersonaUpdateSchema } = require('../schemas');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth');
const express = require('express');
const controller = require('../controllers/personasController');

const router = express.Router();

router.get('/', authenticateJWT, authorizeRoles('admin','editor'), validatePagination, controller.list);
router.get('/:id/:periodo', authenticateJWT, authorizeRoles('admin','editor'), validateIdPeriodo, controller.getById);
router.post('/', authenticateJWT, authorizeRoles('admin','editor'), validateBody(PersonaCreateSchema), controller.create);
router.put('/:id/:periodo', authenticateJWT, authorizeRoles('admin','editor'), validateIdPeriodo, validateBody(PersonaUpdateSchema), controller.update);
router.delete('/:id/:periodo', authenticateJWT, authorizeRoles('admin'), validateIdPeriodo, controller.remove);

module.exports = router;
