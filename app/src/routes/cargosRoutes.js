const express = require('express');
const controller = require('../controllers/cargosController');
const { validateIdPeriodo } = require('../middlewares/validators');
const { validateBody } = require('../middlewares/validateBody');
const { validatePagination } = require('../middlewares/paginationValidator');
const { CargoCreateSchema, CargoUpdateSchema } = require('../schemas');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticateJWT, authorizeRoles('admin','editor'), validatePagination, controller.list);
// Handle missing periodo with trailing slash: /cargos/:id/
router.get('/:id/', (req, res) => {
	res.status(400).json({ error: 'Periodo inválido' });
});
router.get('/:id/:periodo', authenticateJWT, authorizeRoles('admin','editor'), validateIdPeriodo, controller.getById);
router.post('/', authenticateJWT, authorizeRoles('admin','editor'), validateBody(CargoCreateSchema), controller.create);
router.put('/:id/:periodo', authenticateJWT, authorizeRoles('admin','editor'), validateIdPeriodo, validateBody(CargoUpdateSchema), controller.update);
router.delete('/:id/:periodo', authenticateJWT, authorizeRoles('admin'), validateIdPeriodo, controller.remove);

module.exports = router;
