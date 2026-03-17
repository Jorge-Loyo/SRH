const { Like } = require('typeorm');
const { AppDataSource } = require('../config/data-source');
const { Cargo } = require('../entities-class/Cargo');
const { getPagination, getOrder, buildWhere } = require('../utils/query');
const CargoService = require('../services/CargoService');
const { ServiceFactory } = require('../utils/serviceFactory');

module.exports = {
  async list(req, res) {
    try {
      const { limit, offset } = req.pagination || { limit: 10, offset: 0 };
      const order = getOrder(req.query, ['id_cargo', 'codigo_cargo', 'periodo']);
      const where = buildWhere(req.query, ['codigo_cargo'], { periodo: 'periodo' }, Like);
      
      const service = ServiceFactory.getService(CargoService, Cargo);
      const { rows, count } = await service.list({ where, order, skip: offset, take: limit });
      
      res.json({ data: rows, meta: { count, limit, offset } });
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error('[CargosController.list]', { error: err.message });
      res.status(500).json({ error: 'Error al obtener registros' });
    }
  },
  async getById(req, res) {
    try {
      const service = ServiceFactory.getService(CargoService, Cargo);
      const { id, periodo } = req.params;
      const item = await service.getById(id, periodo);
      
      if (!item) return res.status(404).json({ error: 'Cargo no encontrado' });
      res.json(item);
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error('[CargosController.getById]', { error: err.message });
      res.status(500).json({ error: 'Error al obtener registro' });
    }
  },
  async create(req, res) {
    try {
      const service = ServiceFactory.getService(CargoService, Cargo);
      const payload = (req.validated && req.validated.body) || req.body;
      const created = await service.create(payload);
      
      res.status(201).json(created);
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error('[CargosController.create]', { error: err.message });
      res.status(400).json({ error: 'Error al crear registro' });
    }
  },
  async update(req, res) {
    try {
      const service = ServiceFactory.getService(CargoService, Cargo);
      const { id, periodo } = req.params;
      const payload = (req.validated && req.validated.body) || req.body;
      const updated = await service.update(id, periodo, payload);
      
      if (!updated) return res.status(404).json({ error: 'Cargo no encontrado' });
      res.json(updated);
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error('[CargosController.update]', { error: err.message });
      res.status(400).json({ error: 'Error al actualizar registro' });
    }
  },
  async remove(req, res) {
    try {
      const service = ServiceFactory.getService(CargoService, Cargo);
      const { id, periodo } = req.params;
      const deleted = await service.remove(id, periodo);
      
      if (!deleted) return res.status(404).json({ error: 'Cargo no encontrado' });
      res.status(204).send();
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error('[CargosController.remove]', { error: err.message });
      res.status(500).json({ error: 'Error al eliminar registro' });
    }
  },
};
