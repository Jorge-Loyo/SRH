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

function proxyToPython(req, res, target, timeoutMs = 25000) {
  const isFormData = req.headers['content-type']?.includes('multipart/form-data');
  const fetchOpts = {
    method: req.method,
    signal: AbortSignal.timeout(timeoutMs),
    headers: isFormData ? {} : { 'content-type': req.headers['content-type'] || 'application/json' },
  };
  if (!['GET', 'HEAD'].includes(req.method)) {
    if (isFormData) {
      fetchOpts.body = req;
      fetchOpts.duplex = 'half';
      fetchOpts.headers['content-type'] = req.headers['content-type'];
    } else {
      fetchOpts.body = JSON.stringify(req.body);
    }
  }
  return fetch(target, fetchOpts).then(async upstream => {
    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      if (!['transfer-encoding', 'connection', 'content-encoding'].includes(k)) res.setHeader(k, v);
    });
    const buf = await upstream.arrayBuffer();
    res.end(Buffer.from(buf));
  }).catch(() => {
    res.status(503).json({ error: 'Servicio Dotaneitor no disponible' });
  });
}

// Endpoints públicos (sin auth)
router.get('/dotaneitor/health', (req, res) => {
  proxyToPython(req, res, `${PYTHON_SERVICE}/health`);
});

router.get('/dotaneitor/ultima-actualizacion', (req, res) => {
  proxyToPython(req, res, `${PYTHON_SERVICE}/ultima-actualizacion`);
});

// Resto de endpoints con auth
router.all('/dotaneitor/*', ...auth, (req, res) => {
  const path = req.params[0];
  const qs   = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
  proxyToPython(req, res, `${PYTHON_SERVICE}/${path}${qs}`);
});

module.exports = router;
