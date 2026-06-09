const { z } = require('zod');
const {
  bajaConsolidadaCreateSchema,
  bajaConsolidadaUpdateSchema,
  bajaConsolidadaPaginationSchema,
} = require('./bajaConsolidadaSchema');
const BajaConsolidadaService = require('./BajaConsolidadaService');
const SeguimientoCphService  = require('../seguimiento-cph/SeguimientoCphService');
const { BajaConsolidada }    = require('./BajaConsolidadaEntity');
const { SeguimientoCph }     = require('../seguimiento-cph/SeguimientoCphEntity');
const { SeguimientoCeetps }  = require('../seguimiento-ceetps/SeguimientoCeetpsEntity');
const { ServiceFactory }     = require('../../utils/serviceFactory');
const logger                 = require('../../utils/logger');

/** Instancia del servicio (singleton por módulo) */
function getService() {
  return ServiceFactory.getService(BajaConsolidadaService, BajaConsolidada, SeguimientoCph, SeguimientoCeetps);
}

// ─── GET /api/concursales/bajas ───────────────────────────────────────────────────
async function listBajas(req, res) {
  try {
    const query = bajaConsolidadaPaginationSchema.parse(req.query);
    const { rows, count } = await getService().list(query);
    res.json({ data: rows, meta: { count, limit: query.limit, offset: query.offset } });
  } catch (err) {
    logger.error('[bajaConsolidadaController] listBajas', { error: err.message });
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Parámetros inválidos', details: err.errors });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── GET /api/concursales/bajas/:id ───────────────────────────────────────────────
async function getBaja(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const baja = await getService().getById(id);
    if (!baja) return res.status(404).json({ error: 'Baja no encontrada' });
    res.json(baja);
  } catch (err) {
    logger.error('[bajaConsolidadaController] getBaja', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── POST /api/concursales/bajas ──────────────────────────────────────────────────
async function createBaja(req, res) {
  try {
    const payload = bajaConsolidadaCreateSchema.parse(req.body);
    const result = await getService().create(payload);
    res.status(201).json(result);
  } catch (err) {
    logger.error('[bajaConsolidadaController] createBaja', { error: err.message });
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Datos inválidos', details: err.errors });
    res.status(400).json({ error: 'Error al crear la baja' });
  }
}

// ─── PUT /api/concursales/bajas/:id ───────────────────────────────────────────────
async function updateBaja(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const payload = bajaConsolidadaUpdateSchema.parse(req.body);
    const updated = await getService().update(id, payload);
    if (!updated) return res.status(404).json({ error: 'Baja no encontrada' });
    res.json(updated);
  } catch (err) {
    logger.error('[bajaConsolidadaController] updateBaja', { error: err.message });
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Datos inválidos', details: err.errors });
    res.status(400).json({ error: 'Error al actualizar la baja' });
  }
}

// ─── DELETE /api/concursales/bajas/:id ────────────────────────────────────────────
async function deleteBaja(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const deleted = await getService().remove(id);
    if (!deleted) return res.status(404).json({ error: 'Baja no encontrada' });
    res.json({ message: 'Baja eliminada correctamente', id });
  } catch (err) {
    logger.error('[bajaConsolidadaController] deleteBaja', { error: err.message });
    res.status(500).json({ error: 'Error al eliminar la baja' });
  }
}

module.exports = { listBajas, getBaja, createBaja, updateBaja, deleteBaja };
