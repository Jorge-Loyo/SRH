const express = require('express');
const controller = require('../controllers/usersController');
const { authenticateJWT, requirePermission } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validateBody');
const { UserCreateSchema, UserUpdateSchema } = require('../schemas');

const router = express.Router();

router.use(authenticateJWT, requirePermission('can_manage_users'));
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validateBody(UserCreateSchema), controller.create);
router.put('/:id', validateBody(UserUpdateSchema), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
