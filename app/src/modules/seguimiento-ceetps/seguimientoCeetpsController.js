const { z } = require('zod');
const {
  seguimientoCeetpsCreateSchema,
  seguimientoCeetpsUpdateSchema,
  seguimientoCeetssPaginationSchema,
} = require('./seguimientoCeetpsSchema');
const SeguimientoCeetpsService = require('./SeguimientoCeetpsService');
const { SeguimientoCeetps }    = require('./SeguimientoCeetpsEntity');
const { ServiceFactory }       = require('../../utils/serviceFactory');
const logger                   = require('../../utils/logger');

function getService() {
  return ServiceFactory.getService(SeguimientoCeetpsService, SeguimientoCeetps);
}

async function listSeguimientoCeetps(req, res) {
  try {
    const query = seguimientoCeetssPaginationSchema.parse(req.query);
    const { rows, count } = await getService().list(query);
    res.json({ data: rows, meta: { count, limit: query.limit, offset: query.offset } });
  } catch (err) {
    logger.error('[seguimientoCeetpsController] listSeguimientoCeetps', { error: err.message });
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Parámetros inválidos', details: err.errors });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function getSeguimientoCeetps(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const item = await getService().getById(id);
    if (!item) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(item);
  } catch (err) {
    logger.error('[seguimientoCeetpsController] getSeguimientoCeetps', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function getSeguimientoCeetpsByBaja(req, res) {
  try {
    const idBaja = parseInt(req.params.idBaja, 10);
    if (isNaN(idBaja)) return res.status(400).json({ error: 'ID de baja inválido' });
    const item = await getService().getByBajaId(idBaja);
    if (!item) return res.status(404).json({ error: 'Seguimiento CEETPS no encontrado para esta baja' });
    res.json(item);
  } catch (err) {
    logger.error('[seguimientoCeetpsController] getSeguimientoCeetpsByBaja', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function createSeguimientoCeetps(req, res) {
  try {
    const payload = seguimientoCeetpsCreateSchema.parse(req.body);
    const created = await getService().create(payload);
    res.status(201).json(created);
  } catch (err) {
    logger.error('[seguimientoCeetpsController] createSeguimientoCeetps', { error: err.message });
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Datos inválidos', details: err.errors });
    res.status(400).json({ error: 'Error al crear el seguimiento CEETPS' });
  }
}

async function updateSeguimientoCeetps(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const payload = seguimientoCeetpsUpdateSchema.parse(req.body);
    const updated = await getService().update(id, payload);
    if (!updated) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(updated);
  } catch (err) {
    logger.error('[seguimientoCeetpsController] updateSeguimientoCeetps', { error: err.message });
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Datos inválidos', details: err.errors });
    res.status(400).json({ error: 'Error al actualizar el seguimiento CEETPS' });
  }
}

async function deleteSeguimientoCeetps(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const deleted = await getService().remove(id);
    if (!deleted) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ message: 'Seguimiento CEETPS eliminado correctamente', id });
  } catch (err) {
    logger.error('[seguimientoCeetpsController] deleteSeguimientoCeetps', { error: err.message });
    res.status(500).json({ error: 'Error al eliminar el seguimiento CEETPS' });
  }
}

module.exports = {
  listSeguimientoCeetps,
  getSeguimientoCeetps,
  getSeguimientoCeetpsByBaja,
  createSeguimientoCeetps,
  updateSeguimientoCeetps,
  deleteSeguimientoCeetps,
};
