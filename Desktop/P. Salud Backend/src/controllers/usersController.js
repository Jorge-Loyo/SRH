const { AppDataSource } = require('../config/data-source');
const { User } = require('../entities-class/User');
const UserService = require('../services/UserService');
const { ServiceFactory } = require('../utils/serviceFactory');

module.exports = {
  async list(_req, res) {
    const service = ServiceFactory.getService(UserService, User);
    const users = await service.list();
    res.json({ data: users });
  },

  async getById(req, res) {
    const service = ServiceFactory.getService(UserService, User);
    const user = await service.getById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  },

  async create(req, res) {
    try {
      const { username, email = null, password, role = 'viewer', is_active = true, hospital_code = null } = req.validated?.body || req.body;
      
      // ✅ FIX: Validar email si se proporciona
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ error: 'Email inválido' });
        }
      }
      
      const service = ServiceFactory.getService(UserService, User);
      const created = await service.create({ username, email, password, role, is_active, hospital_code });
      res.status(201).json(created);
    } catch (e) {
      if (e.message === 'USERNAME_EXISTS') {
        return res.status(409).json({ error: 'Usuario ya existe' });
      }
      if (e.message === 'EMAIL_EXISTS') {
        return res.status(409).json({ error: 'Email ya existe' });
      }
      const logger = require('../utils/logger');
      logger.error('[UsersController.create]', { error: e.message });
      res.status(400).json({ error: 'Error al crear usuario' });
    }
  },

  async update(req, res) {
    const service = ServiceFactory.getService(UserService, User);
    const { username, email, password, role, is_active, hospital_code } = req.validated?.body || req.body;
    
    // ✅ FIX: Validar email si se proporciona
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Email inválido' });
      }
    }
    
    try {
      const updated = await service.update(req.params.id, { username, email, password, role, is_active, hospital_code });
      if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json(updated);
    } catch (e) {
      if (e.message === 'USERNAME_EXISTS') {
        return res.status(409).json({ error: 'Usuario ya existe' });
      }
      if (e.message === 'EMAIL_EXISTS') {
        return res.status(409).json({ error: 'Email ya existe' });
      }
      const logger = require('../utils/logger');
      logger.error('[UsersController.update]', { error: e.message });
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  },

  async remove(req, res) {
    const service = ServiceFactory.getService(UserService, User);
    const deleted = await service.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.status(204).send();
  },
};
