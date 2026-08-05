const express = require('express');
const controller = require('../controllers/rolesController');
const { validateIdPeriodo } = require('../middlewares/validators');
const { validateBody } = require('../middlewares/validateBody');
const { validatePagination } = require('../middlewares/paginationValidator');
const { RolCreateSchema, RolUpdateSchema } = require('../schemas');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticateJWT, authorizeRoles('admin','editor'), validatePagination, controller.list);
router.get('/:id/:periodo', authenticateJWT, authorizeRoles('admin','editor'), validateIdPeriodo, controller.getById);
router.post('/', authenticateJWT, authorizeRoles('admin','editor'), validateBody(RolCreateSchema), controller.create);
router.put('/:id/:periodo', authenticateJWT, authorizeRoles('admin','editor'), validateIdPeriodo, validateBody(RolUpdateSchema), controller.update);
router.delete('/:id/:periodo', authenticateJWT, authorizeRoles('admin'), validateIdPeriodo, controller.remove);

module.exports = router;
