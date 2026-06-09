const { z } = require('zod');
const {
  seguimientoCphCreateSchema,
  seguimientoCphUpdateSchema,
  seguimientoCphPaginationSchema,
} = require('./seguimientoCphSchema');
const SeguimientoCphService = require('./SeguimientoCphService');
const { SeguimientoCph }    = require('./SeguimientoCphEntity');
const { BajaConsolidada }   = require('../bajas/BajaConsolidadaEntity');
const { ServiceFactory }    = require('../../utils/serviceFactory');
const logger                = require('../../utils/logger');

function getService() {
  return ServiceFactory.getService(SeguimientoCphService, SeguimientoCph, BajaConsolidada);
}

// ─── GET /api/concursales/seguimiento-cph ────────────────────────────────────────
async function listSeguimiento(req, res) {
  try {
    const query = seguimientoCphPaginationSchema.parse(req.query);
    const { rows, count } = await getService().list(query);
    res.json({ data: rows, meta: { count, limit: query.limit, offset: query.offset } });
  } catch (err) {
    logger.error('[seguimientoCphController] listSeguimiento', { error: err.message });
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Parámetros inválidos', details: err.errors });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── GET /api/concursales/seguimiento-cph/estados ────────────────────────────────
async function getEstados(req, res) {
  try {
    const estados = await getService().getUniqueEstados();
    res.json({ data: estados });
  } catch (err) {
    logger.error('[seguimientoCphController] getEstados', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── GET /api/concursales/seguimiento-cph/stats/by-efector ───────────────────────
async function getStatsByEfector(req, res) {
  try {
    const stats = await getService().getStatsByEfector();
    res.json({ data: stats });
  } catch (err) {
    logger.error('[seguimientoCphController] getStatsByEfector', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── GET /api/concursales/seguimiento-cph/:id ────────────────────────────────────
async function getSeguimiento(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const item = await getService().getById(id);
    if (!item) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(item);
  } catch (err) {
    logger.error('[seguimientoCphController] getSeguimiento', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── GET /api/concursales/seguimiento-cph/by-baja/:idBaja ────────────────────────
async function getSeguimientoByBaja(req, res) {
  try {
    const idBaja = parseInt(req.params.idBaja, 10);
    if (isNaN(idBaja)) return res.status(400).json({ error: 'ID de baja inválido' });

    const item = await getService().getByBajaId(idBaja);
    if (!item) return res.status(404).json({ error: 'Seguimiento no encontrado para esta baja' });
    res.json(item);
  } catch (err) {
    logger.error('[seguimientoCphController] getSeguimientoByBaja', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── POST /api/concursales/seguimiento-cph ───────────────────────────────────────
async function createSeguimiento(req, res) {
  try {
    const payload = seguimientoCphCreateSchema.parse(req.body);
    const created = await getService().create(payload);
    res.status(201).json(created);
  } catch (err) {
    logger.error('[seguimientoCphController] createSeguimiento', { error: err.message });
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Datos inválidos', details: err.errors });
    res.status(400).json({ error: 'Error al crear el seguimiento' });
  }
}

// ─── PUT /api/concursales/seguimiento-cph/:id ────────────────────────────────────
async function updateSeguimiento(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const payload = seguimientoCphUpdateSchema.parse(req.body);
    const updated = await getService().update(id, payload);
    if (!updated) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(updated);
  } catch (err) {
    logger.error('[seguimientoCphController] updateSeguimiento', { error: err.message });
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Datos inválidos', details: err.errors });
    res.status(400).json({ error: 'Error al actualizar el seguimiento' });
  }
}

// ─── DELETE /api/concursales/seguimiento-cph/:id ─────────────────────────────────
async function deleteSeguimiento(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const deleted = await getService().remove(id);
    if (!deleted) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ message: 'Seguimiento eliminado correctamente', id });
  } catch (err) {
    logger.error('[seguimientoCphController] deleteSeguimiento', { error: err.message });
    res.status(500).json({ error: 'Error al eliminar el seguimiento' });
  }
}

module.exports = {
  listSeguimiento,
  getEstados,
  getStatsByEfector,
  getSeguimiento,
  getSeguimientoByBaja,
  createSeguimiento,
  updateSeguimiento,
  deleteSeguimiento,
};
