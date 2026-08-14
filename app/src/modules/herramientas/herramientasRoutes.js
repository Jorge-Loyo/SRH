const express = require('express');
const {
  getErdSchema, getTableData,
  getAdminTables, adminInsert, adminUpdate, adminDelete,
} = require('./herramientasController');
const { authenticateJWT, authorizeRoles } = require('../../middlewares/auth');

const router = express.Router();
const auth   = [authenticateJWT, authorizeRoles('admin', 'editor')];

router.get('/erd',                          ...auth, getErdSchema);
router.get('/table/:tableName',             ...auth, getTableData);
router.get('/admin/tables',                 ...auth, getAdminTables);
router.post('/admin/:tableName',            ...auth, adminInsert);
router.put('/admin/:tableName/:id',         ...auth, adminUpdate);
router.delete('/admin/:tableName/:id',      ...auth, adminDelete);

const PYTHON_SERVICE = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001';

// health es público para que el frontend pueda verificar sin token
router.get('/dotaneitor/health', async (req, res) => {
  const target = `${PYTHON_SERVICE}/health`;
  try {
    const upstream = await fetch(target);
    const buf = await upstream.arrayBuffer();
    res.status(upstream.status).end(Buffer.from(buf));
  } catch {
    res.status(503).json({ error: 'Servicio Dotaneitor no disponible' });
  }
});

router.all('/dotaneitor/*', ...auth, async (req, res) => {
  const target = `${PYTHON_SERVICE}/${req.params[0]}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;
  try {
    const isFormData = req.headers['content-type']?.includes('multipart/form-data');
    const fetchOpts = {
      method: req.method,
      headers: isFormData ? {} : { 'content-type': req.headers['content-type'] || 'application/json' },
    };
    if (!['GET', 'HEAD'].includes(req.method)) {
      if (isFormData) {
        // pipe raw body for multipart
        fetchOpts.body = req;
        fetchOpts.duplex = 'half';
        fetchOpts.headers['content-type'] = req.headers['content-type'];
      } else {
        fetchOpts.body = JSON.stringify(req.body);
      }
    }
    const upstream = await fetch(target, fetchOpts);
    res.status(upstream.status);
    upstream.headers.forEach((v, k) => !['transfer-encoding','connection'].includes(k) && res.setHeader(k, v));
    const buf = await upstream.arrayBuffer();
    res.end(Buffer.from(buf));
  } catch {
    res.status(503).json({ error: 'Servicio Dotaneitor no disponible' });
  }
});

module.exports = router;
