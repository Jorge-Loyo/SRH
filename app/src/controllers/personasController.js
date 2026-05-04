const { Like } = require('typeorm');
const { AppDataSource } = require('../config/data-source');
const { Persona } = require('../entities-class/Persona');
const { getPagination, getOrder, buildWhere } = require('../utils/query');
const PersonaService = require('../services/PersonaService');
const { ServiceFactory } = require('../utils/serviceFactory');
const logger = require('../utils/logger');

module.exports = {
  async list(req, res) {
    try {
      const { limit, offset } = req.pagination || { limit: 10, offset: 0 };
      const order = getOrder(req.query, ['id_persona', 'nombre_apellido', 'periodo']);
      const where = buildWhere(
        req.query,
        ['nombre_apellido', 'especialidad', 'localidad', 'mail_personal', 'mail_laboral'],
        { periodo: 'periodo', tipo_doc: 'tipo_doc', sexo: 'sexo', cuil: 'cuil', numero_doc: 'numero_doc' },
        Like
      );
      
      const service = ServiceFactory.getService(PersonaService, Persona);
      const { rows, count } = await service.list({ where, order, skip: offset, take: limit });
      
      res.json({ data: rows, meta: { count, limit, offset } });
    } catch (err) {
      logger.error('[PersonasController.list]', { error: err.message, stack: err.stack });
      res.status(500).json({ error: 'Error al obtener personas' });
    }
  },
  async getById(req, res) {
    try {
      const service = ServiceFactory.getService(PersonaService, Persona);
      const { id, periodo } = req.params;
      const item = await service.getById(id, periodo);
      
      if (!item) return res.status(404).json({ error: 'Persona no encontrada' });
      res.json(item);
    } catch (err) {
      logger.error('[PersonasController.getById]', { error: err.message });
      res.status(500).json({ error: 'Error al obtener persona' });
    }
  },
  async create(req, res) {
    try {
      const service = ServiceFactory.getService(PersonaService, Persona);
      const payload = (req.validated && req.validated.body) || req.body;
      const created = await service.create(payload);
      
      res.status(201).json(created);
    } catch (err) {
      logger.error('[PersonasController.create]', { error: err.message, stack: err.stack });
      res.status(400).json({ error: 'No se pudo crear el registro' });
    }
  },
  async update(req, res) {
    try {
      const service = ServiceFactory.getService(PersonaService, Persona);
      const { id, periodo } = req.params;
      const payload = (req.validated && req.validated.body) || req.body;
      const updated = await service.update(id, periodo, payload);
      
      if (!updated) return res.status(404).json({ error: 'Persona no encontrada' });
      res.json(updated);
    } catch (err) {
      logger.error('[PersonasController.update]', { error: err.message });
      res.status(400).json({ error: 'No se pudo actualizar el registro' });
    }
  },
  async remove(req, res) {
    try {
      const service = ServiceFactory.getService(PersonaService, Persona);
      const { id, periodo } = req.params;
      const deleted = await service.remove(id, periodo);
      
      if (!deleted) return res.status(404).json({ error: 'Persona no encontrada' });
      res.status(204).send();
    } catch (err) {
      logger.error('[PersonasController.remove]', { error: err.message });
      res.status(500).json({ error: 'No se pudo eliminar el registro' });
    }
  },
};
