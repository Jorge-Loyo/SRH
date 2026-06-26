const { Pou } = require('../entities-class/Pou');
const PouService = require('../services/PouService');
const { ServiceFactory } = require('../utils/serviceFactory');
const { toExcelBase64 } = require('../utils/excel');
const logger = require('../utils/logger');

const MIN_SIGLAS_COMPARAR = 2;
const MAX_SIGLAS_COMPARAR = 8;

// Parsea y valida la lista de siglas recibida en query (?siglas=A,B,C) para /comparar.
// Devuelve { siglasList } o { error } con el mensaje a responder al cliente.
function parseSiglasComparar(siglasRaw) {
  if (!siglasRaw) return { error: 'Se requiere el parámetro siglas' };

  const siglasList = [...new Set(siglasRaw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean))];

  if (siglasList.length < MIN_SIGLAS_COMPARAR) {
    return { error: `Se requieren al menos ${MIN_SIGLAS_COMPARAR} hospitales para comparar` };
  }
  if (siglasList.length > MAX_SIGLAS_COMPARAR) {
    return { error: `Máximo ${MAX_SIGLAS_COMPARAR} hospitales por comparación` };
  }
  if (siglasList.some(s => !/^[A-Z0-9]{2,10}$/.test(s))) {
    return { error: 'Formato de sigla inválido' };
  }
  return { siglasList };
}

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
      if (periodo && !/^\d{4}-\d{2}$/.test(periodo)) {
        return res.status(400).json({ error: 'Formato de periodo inválido (esperado: YYYY-MM)' });
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
  },

  async exportXlsx(req, res) {
    try {
      const { sigla, periodo } = req.query;

      if (!sigla) return res.status(400).json({ error: 'Se requiere el parámetro sigla' });
      if (!/^[A-Z0-9]{2,10}$/.test(sigla)) return res.status(400).json({ error: 'Formato de sigla inválido' });
      if (periodo && !/^\d{4}-\d{2}$/.test(periodo)) return res.status(400).json({ error: 'Formato de periodo inválido' });

      const service = ServiceFactory.getService(PouService, Pou);
      const { rows } = await service.listBySiglaAndPeriodo({ sigla, periodo });

      const columns = ['descripcion_sigla', 'perfil', 'especialidad', 'dotacion_diaria', 'dotacion_sem', 'dotacion_total', 'activos', 'tecnicos', 'vacantes'];
      const filters = { 'Hospital': sigla, ...(periodo ? { 'Período': periodo } : {}) };

      const base64 = await toExcelBase64(rows, columns, { filters });
      return res.json({ base64 });
    } catch (err) {
      logger.error('[PouController.exportXlsx]', { error: err.message });
      return res.status(500).json({ error: 'Error al exportar POU' });
    }
  },

  async periodos(req, res) {
    try {
      const { sigla } = req.query;

      // sigla es opcional: sin ella devuelve los períodos disponibles en TODOS
      // los hospitales (usado por la comparativa, que aún no tiene hospitales elegidos)
      const { AppDataSource } = require('../config/data-source');
      const rows = sigla
        ? await AppDataSource.manager.query(
            'SELECT DISTINCT periodo FROM pou WHERE sigla = ? ORDER BY periodo DESC',
            [sigla]
          )
        : await AppDataSource.manager.query('SELECT DISTINCT periodo FROM pou ORDER BY periodo DESC');

      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const items = rows.map(r => r.periodo);
      const periodsMetadata = items.map(p => ({ periodo: p, hasData: true, isCurrent: p === currentPeriod }));

      // Agregar el periodo actual si no está
      if (!items.includes(currentPeriod)) {
        items.unshift(currentPeriod);
        periodsMetadata.unshift({ periodo: currentPeriod, hasData: false, isCurrent: true });
      }

      const recommended = items.find(p => periodsMetadata.find(m => m.periodo === p && m.hasData)) || null;

      return res.json({ items, periodsMetadata, currentPeriod, hasCurrent: items.includes(currentPeriod), recommended });
    } catch (err) {
      logger.error('[PouController.periodos]', { error: err.message });
      return res.status(500).json({ error: 'Error al obtener períodos de POU' });
    }
  },

  async hospitales(req, res) {
    try {
      const service = ServiceFactory.getService(PouService, Pou);
      const items = await service.listSiglasDisponibles();
      return res.json({ items });
    } catch (err) {
      logger.error('[PouController.hospitales]', { error: err.message });
      return res.status(500).json({ error: 'Error al obtener hospitales con POU' });
    }
  },

  async comparar(req, res) {
    try {
      const { siglas, periodo } = req.query;

      const { siglasList, error } = parseSiglasComparar(siglas);
      if (error) return res.status(400).json({ error });
      if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
        return res.status(400).json({ error: 'Formato de periodo inválido (esperado: YYYY-MM)' });
      }

      const service = ServiceFactory.getService(PouService, Pou);
      const rows = await service.listBySiglasAndPeriodo({ siglas: siglasList, periodo });

      return res.json({ data: rows, meta: { count: rows.length, siglas: siglasList, periodo } });
    } catch (err) {
      logger.error('[PouController.comparar]', { error: err.message });
      return res.status(500).json({ error: 'Error al comparar registros POU' });
    }
  },

  async compararExport(req, res) {
    try {
      const { siglas, periodo } = req.query;

      const { siglasList, error } = parseSiglasComparar(siglas);
      if (error) return res.status(400).json({ error });
      if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
        return res.status(400).json({ error: 'Formato de periodo inválido (esperado: YYYY-MM)' });
      }

      const service = ServiceFactory.getService(PouService, Pou);
      const rows = await service.listBySiglasAndPeriodo({ siglas: siglasList, periodo });

      const columns = ['sigla', 'descripcion_sigla', 'perfil', 'especialidad', 'dotacion_diaria', 'dotacion_sem', 'dotacion_total', 'activos', 'tecnicos', 'vacantes'];
      const filters = { 'Hospitales': siglasList.join(', '), 'Período': periodo };

      const base64 = await toExcelBase64(rows, columns, { filters });
      return res.json({ base64 });
    } catch (err) {
      logger.error('[PouController.compararExport]', { error: err.message });
      return res.status(500).json({ error: 'Error al exportar comparativa POU' });
    }
  }
};
