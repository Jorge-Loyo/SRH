const { Like } = require('typeorm');
const { BajaConcurso } = require('../entities-class/BajaConcurso');
const { getPagination, getOrder, buildWhere } = require('../utils/query');
const BajaConcursoService = require('../services/BajaConcursoService');
const { ServiceFactory } = require('../utils/serviceFactory');

module.exports = {
  async list(req, res) {
    try {
      const { limit, offset } = req.pagination || { limit: 10, offset: 0 };
      const order = getOrder(req.query, ['id_baja', 'periodo']);
      const where = buildWhere(
        req.query,
        ['sigla', 'motivo_baja', 'nombre_apellido', 'puesto_baja', 'especialidad_baja'],
        { periodo: 'periodo', id_cargo: 'id_cargo' },
        Like
      );
      
      const service = ServiceFactory.getService(BajaConcursoService, BajaConcurso);
      const { rows, count } = await service.list({ 
        where, 
        order, 
        skip: offset, 
        take: limit, 
        relations: { cargo: true } 
      });
      
      res.json({ data: rows, meta: { count, limit, offset } });
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error('[BajasConcursosController.list]', { error: err.message });
      res.status(500).json({ error: 'Error al obtener registros' });
    }
  },
  async getById(req, res) {
    try {
      const service = ServiceFactory.getService(BajaConcursoService, BajaConcurso);
      const { id, periodo } = req.params;
      const item = await service.getById(id, periodo);
      
      if (!item) return res.status(404).json({ error: 'Baja no encontrada' });
      res.json(item);
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error('[BajasConcursosController.getById]', { error: err.message });
      res.status(500).json({ error: 'Error al obtener registro' });
    }
  },
  async create(req, res) {
    try {
      const service = ServiceFactory.getService(BajaConcursoService, BajaConcurso);
      const payload = (req.validated && req.validated.body) || req.body;
      const created = await service.create(payload);
      
      res.status(201).json(created);
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error('[BajasConcursosController.create]', { error: err.message });
      res.status(400).json({ error: 'Error al crear registro' });
    }
  },
  async update(req, res) {
    try {
      const service = ServiceFactory.getService(BajaConcursoService, BajaConcurso);
      const { id, periodo } = req.params;
      const payload = (req.validated && req.validated.body) || req.body;
      const updated = await service.update(id, periodo, payload);
      
      if (!updated) return res.status(404).json({ error: 'Baja no encontrada' });
      res.json(updated);
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error('[BajasConcursosController.update]', { error: err.message });
      res.status(400).json({ error: 'Error al actualizar registro' });
    }
  },
  async remove(req, res) {
    try {
      const service = ServiceFactory.getService(BajaConcursoService, BajaConcurso);
      const { id, periodo } = req.params;
      const deleted = await service.remove(id, periodo);
      
      if (!deleted) return res.status(404).json({ error: 'Baja no encontrada' });
      res.status(204).send();
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error('[BajasConcursosController.remove]', { error: err.message });
      res.status(500).json({ error: 'Error al eliminar registro' });
    }
  },
};
