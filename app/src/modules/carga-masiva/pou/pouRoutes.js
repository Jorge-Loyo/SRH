const express = require('express');
const multer = require('multer');
const { authenticateJWT, authorizeRoles } = require('../../../middlewares/auth');
const { preview, confirm, discard } = require('./pouController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter(req, file, cb) {
    const isXlsx = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      || file.originalname.toLowerCase().endsWith('.xlsx');
    cb(isXlsx ? null : new Error('Sólo se aceptan archivos .xlsx'), isXlsx);
  },
});

router.post('/preview', authenticateJWT, authorizeRoles('admin'), upload.single('archivo'), preview);
router.post('/:uploadId/confirm', authenticateJWT, authorizeRoles('admin'), confirm);
router.delete('/:uploadId', authenticateJWT, authorizeRoles('admin'), discard);

module.exports = router;
