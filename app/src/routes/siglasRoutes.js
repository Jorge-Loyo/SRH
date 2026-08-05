const express = require('express');
const controller = require('../controllers/siglasController');
const { validateId } = require('../middlewares/validators');
const { validateBody } = require('../middlewares/validateBody');
const { validatePagination } = require('../middlewares/paginationValidator');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth');
const { SiglaCreateSchema, SiglaUpdateSchema } = require('../schemas');

const router = express.Router();

router.get('/', authenticateJWT, authorizeRoles('admin','editor'), validatePagination, controller.list);
router.get('/:id', authenticateJWT, authorizeRoles('admin','editor'), validateId, controller.getById);
router.post('/', authenticateJWT, authorizeRoles('admin','editor'), validateBody(SiglaCreateSchema), controller.create);
router.put('/:id', authenticateJWT, authorizeRoles('admin','editor'), validateId, validateBody(SiglaUpdateSchema), controller.update);
router.delete('/:id', authenticateJWT, authorizeRoles('admin'), validateId, controller.remove);

module.exports = router;
