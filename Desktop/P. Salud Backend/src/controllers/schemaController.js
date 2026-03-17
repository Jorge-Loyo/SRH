const { getTableColumns } = require('../services/schemaService');

module.exports = {
  async list(req, res) {
    try {
      const tables = ['siglas', 'personas', 'cargos', 'roles', 'bajas_concursos'];
      const result = {};
      for (const t of tables) {
        // eslint-disable-next-line no-await-in-loop
        result[t] = await getTableColumns(t);
      }
      res.json(result);
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error('[SchemaController.list]', { error: err.message });
      res.status(500).json({ error: 'Error al obtener esquema' });
    }
  },
  async table(req, res) {
    try {
      const { table } = req.params;
      const rows = await getTableColumns(table);
      res.json({ table, columns: rows });
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error('[SchemaController.table]', { error: err.message });
      res.status(500).json({ error: 'Error al obtener columnas' });
    }
  },
};
