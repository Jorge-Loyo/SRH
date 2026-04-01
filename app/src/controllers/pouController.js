const { Pou } = require('../entities-class/Pou');
const PouService = require('../services/PouService');
const { ServiceFactory } = require('../utils/serviceFactory');
const logger = require('../utils/logger');

module.exports = {
  async list(req, res) {
    try {
      const { sigla, periodo } = req.query;

      if (!sigla) {
        return res.status(400).json({ error: 'Se requiere el parámetro sigla' });
      }
      if (!/^[A-Z0-9]{2,10}$/.test(sigla)) {
        return res.status(400).json({ error: 'Formato de sigla inválido' });
      }
      if (periodo && !/^\d{6}$/.test(periodo)) {
        return res.status(400).json({ error: 'Formato de periodo inválido (esperado: YYYYMM)' });
      }

      const service = ServiceFactory.getService(PouService, Pou);
      const { rows, count } = await service.listBySiglaAndPeriodo({ sigla, periodo });

      return res.json({ data: rows, meta: { count } });
    } catch (err) {
      logger.error('[PouController.list]', { error: err.message });
      return res.status(500).json({ error: 'Error al obtener registros POU' });
    }
  },

  async getById(req, res) {
    try {
      const { id, periodo } = req.params;
      const service = ServiceFactory.getService(PouService, Pou);
      const item = await service.getById(id, periodo);
      if (!item) return res.status(404).json({ error: 'Registro POU no encontrado' });
      return res.json(item);
    } catch (err) {
      logger.error('[PouController.getById]', { error: err.message });
      return res.status(500).json({ error: 'Error al obtener registro POU' });
    }
  }
};
