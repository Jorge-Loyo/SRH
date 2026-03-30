const { AppDataSource } = require('../config/data-source');
const PeriodoService = require('../services/PeriodoService');

module.exports = {
  async list(req, res) {
    try {
      const limitRaw = parseInt((req.query.limit || '12'), 10) || 12;
      const hospital = (req.query.hospital || '').trim();
      
      const entityManager = AppDataSource.manager;
      const periodoService = new PeriodoService(entityManager);
      
      const result = await periodoService.list({
        limit: limitRaw,
        hospital: hospital || null
      });
      
      return res.json(result);
    } catch (e) {
      const logger = require('../utils/logger');
      logger.error('[PeriodosController.list]', { error: e.message });
      return res.status(500).json({ error: 'Error obteniendo periodos' });
    }
  }
};
