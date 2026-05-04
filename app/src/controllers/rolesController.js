const { Like } = require('typeorm');
const { AppDataSource } = require('../config/data-source');
const { Rol } = require('../entities-class/Rol');
const { Cargo } = require('../entities-class/Cargo');
const { Persona } = require('../entities-class/Persona');
const { Sigla } = require('../entities-class/Sigla');
const { getPagination, getOrder, buildWhere } = require('../utils/query');
const { applyHospitalFilter } = require('../utils/rls');
const RolService = require('../services/RolService');
const { ServiceFactory } = require('../utils/serviceFactory');
const logger = require('../utils/logger');

module.exports = {
  async list(req, res) {
    try {
      const { limit, offset } = req.pagination || { limit: 10, offset: 0 };
      const order = getOrder(req.query, ['id_rol', 'periodo']);
      let where = buildWhere(
        req.query,
        ['descripcion_reparticion', 'escalafon', 'situacion_revista', 'literal_puesto', 'unificador_puesto'],
        { periodo: 'periodo', id_cargo: 'id_cargo', id_persona: 'id_persona', id_sigla: 'id_sigla', codigo_reparticion: 'codigo_reparticion' },
        Like
      );
      
      // Aplicar filtro de hospital si el usuario tiene restricción (RLS)
      where = await applyHospitalFilter(req, where);
      
      const service = ServiceFactory.getService(RolService, Rol);
      
      // Si hay filtro de hospital, usar query builder
      if (where._hospitalFilter) {
        const hospitalCode = where._hospitalFilter;
        delete where._hospitalFilter;
        
        const { rows, count } = await service.list({
          where,
          order,
          skip: offset,
          take: limit,
          useQueryBuilder: true,
          hospitalFilter: hospitalCode
        });
        
        return res.json({ data: rows, meta: { count, limit, offset } });
      }
      
      // Sin filtro de hospital, query normal
      const { rows, count } = await service.list({
        where,
        relations: { cargo: true, persona: true, sigla: true },
        order,
        skip: offset,
        take: limit
      });
      
      res.json({ data: rows, meta: { count, limit, offset } });
    } catch (err) {
      logger.error('[RolesController.list]', { error: err.message });
      res.status(500).json({ error: 'Error al obtener registros' });
    }
  },
  async getById(req, res) {
    try {
      const service = ServiceFactory.getService(RolService, Rol);
      const { id, periodo } = req.params;
      const item = await service.getById(id, periodo, { 
        cargo: true, 
        persona: true, 
        sigla: true 
      });
      
      if (!item) return res.status(404).json({ error: 'Rol no encontrado' });
      res.json(item);
    } catch (err) {
      logger.error('[RolesController.getById]', { error: err.message });
      res.status(500).json({ error: 'Error al obtener registro' });
    }
  },
  async create(req, res) {
    try {
      const service = ServiceFactory.getService(RolService, Rol);
      const payload = (req.validated && req.validated.body) || req.body;
      const created = await service.create(payload);
      
      res.status(201).json(created);
    } catch (err) {
      logger.error('[RolesController.create]', { error: err.message });
      res.status(400).json({ error: 'Error al crear registro' });
    }
  },
  async update(req, res) {
    try {
      const service = ServiceFactory.getService(RolService, Rol);
      const { id, periodo } = req.params;
      const payload = (req.validated && req.validated.body) || req.body;
      const updated = await service.update(id, periodo, payload);
      
      if (!updated) return res.status(404).json({ error: 'Rol no encontrado' });
      res.json(updated);
    } catch (err) {
      logger.error('[RolesController.update]', { error: err.message });
      res.status(400).json({ error: 'Error al actualizar registro' });
    }
  },
  async remove(req, res) {
    try {
      const service = ServiceFactory.getService(RolService, Rol);
      const { id, periodo } = req.params;
      const deleted = await service.remove(id, periodo);
      
      if (!deleted) return res.status(404).json({ error: 'Rol no encontrado' });
      res.status(204).send();
    } catch (err) {
      logger.error('[RolesController.remove]', { error: err.message });
      res.status(500).json({ error: 'Error al eliminar registro' });
    }
  },
};
