const { Like } = require('typeorm');
const { AppDataSource } = require('../config/data-source');
const { Sigla } = require('../entities-class/Sigla');
const { getPagination, getOrder, buildWhere } = require('../utils/query');
const SiglaService = require('../services/SiglaService');
const { ServiceFactory } = require('../utils/serviceFactory');

module.exports = {
  async list(req, res) {
    try {
      const { limit, offset } = req.pagination || { limit: 10, offset: 0 };
      const order = getOrder(req.query, ['id_sigla', 'sigla']);
      const where = buildWhere(
        req.query,
        ['sigla', 'universo_totalizador', 'tipo_hospital_sigla'],
        {},
        Like
      );
      
      const service = ServiceFactory.getService(SiglaService, Sigla);
      const { rows, count } = await service.list({ where, order, skip: offset, take: limit });
      
      res.json({ data: rows, meta: { count, limit, offset } });
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error('[SiglasController.list]', { error: err.message });
      res.status(500).json({ error: 'Error al obtener registros' });
    }
  },
  async getById(req, res) {
    try {
      const service = ServiceFactory.getService(SiglaService, Sigla);
      const item = await service.getById(req.params.id);
      
      if (!item) return res.status(404).json({ error: 'Sigla no encontrada' });
      res.json(item);
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error('[SiglasController.getById]', { error: err.message });
      res.status(500).json({ error: 'Error al obtener registro' });
    }
  },
  async create(req, res) {
    try {
      const service = ServiceFactory.getService(SiglaService, Sigla);
      const payload = (req.validated && req.validated.body) || req.body;
      const created = await service.create(payload);
      
      res.status(201).json(created);
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error('[SiglasController.create]', { error: err.message });
      res.status(400).json({ error: 'Error al crear registro' });
    }
  },
  async update(req, res) {
    try {
      const service = ServiceFactory.getService(SiglaService, Sigla);
      const payload = (req.validated && req.validated.body) || req.body;
      const updated = await service.update(req.params.id, payload);
      
      if (!updated) return res.status(404).json({ error: 'Sigla no encontrada' });
      res.json(updated);
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error('[SiglasController.update]', { error: err.message });
      res.status(400).json({ error: 'Error al actualizar registro' });
    }
  },
  async remove(req, res) {
    try {
      const service = ServiceFactory.getService(SiglaService, Sigla);
      const deleted = await service.remove(req.params.id);
      
      if (!deleted) return res.status(404).json({ error: 'Sigla no encontrada' });
      res.status(204).send();
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error('[SiglasController.remove]', { error: err.message });
      res.status(500).json({ error: 'Error al eliminar registro' });
    }
  },
};
