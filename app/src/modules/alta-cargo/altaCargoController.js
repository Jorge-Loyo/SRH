const { z } = require('zod');
const { altaCargoCreateSchema, altaCargoPaginationSchema } = require('./altaCargoSchema');
const AltaCargoService = require('./AltaCargoService');
const { CargosAlta }    = require('./AltaCargoEntity');
const { RegistroCph, RegistroEnf, RegistroTecPou, RegistroTecPof } = require('./AltaCargoSubEntities');
const { ServiceFactory } = require('../../utils/serviceFactory');
const logger = require('../../utils/logger');

function getService() {
  return ServiceFactory.getService(
    AltaCargoService,
    CargosAlta, RegistroCph, RegistroEnf, RegistroTecPou, RegistroTecPof,
  );
}

async function listAltas(req, res) {
  try {
    const query = altaCargoPaginationSchema.parse(req.query);
    const { rows, count } = await getService().list(query);
    res.json({ data: rows, meta: { count, limit: query.limit, offset: query.offset } });
  } catch (err) {
    logger.error('[altaCargoController] listAltas', { error: err.message });
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Parámetros inválidos', details: err.errors });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function getAlta(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const alta = await getService().getById(id);
    if (!alta) return res.status(404).json({ error: 'Alta no encontrada' });
    res.json(alta);
  } catch (err) {
    logger.error('[altaCargoController] getAlta', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function createAlta(req, res) {
  try {
    const payload = altaCargoCreateSchema.parse(req.body);
    const result  = await getService().create(payload);
    res.status(201).json(result);
  } catch (err) {
    logger.error('[altaCargoController] createAlta', { error: err.message });
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Datos inválidos', details: err.errors });
    res.status(400).json({ error: 'Error al crear el alta' });
  }
}

module.exports = { listAltas, getAlta, createAlta };
