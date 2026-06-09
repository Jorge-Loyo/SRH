const { AppDataSource } = require('../../config/data-source');
const { ConjuntosConfig } = require('./ConjuntosConfigEntity');
const logger = require('../../utils/logger');

const CONFIG_KEY       = 'conjuntos_rules';
const CONFIG_KEY_CEETPS = 'conjuntos_rules_ceetps';

function getRepo() {
  return AppDataSource.getRepository(ConjuntosConfig);
}

async function getConjuntosConfig(req, res) {
  try {
    const record = await getRepo().findOne({ where: { key: CONFIG_KEY } });
    const rules = record ? JSON.parse(record.value || '[]') : [];
    res.json({ rules });
  } catch (err) {
    logger.error('[conjuntosConfig] getConjuntosConfig', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function saveConjuntosConfig(req, res) {
  try {
    const { rules } = req.body;
    if (!Array.isArray(rules)) {
      return res.status(400).json({ error: 'rules debe ser un array' });
    }
    await getRepo().save({ key: CONFIG_KEY, value: JSON.stringify(rules) });
    res.json({ ok: true });
  } catch (err) {
    logger.error('[conjuntosConfig] saveConjuntosConfig', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function getConjuntosCeetpsConfig(req, res) {
  try {
    const record = await getRepo().findOne({ where: { key: CONFIG_KEY_CEETPS } });
    const rules = record ? JSON.parse(record.value || '[]') : [];
    res.json({ rules });
  } catch (err) {
    logger.error('[conjuntosConfig] getConjuntosCeetpsConfig', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function saveConjuntosCeetpsConfig(req, res) {
  try {
    const { rules } = req.body;
    if (!Array.isArray(rules)) {
      return res.status(400).json({ error: 'rules debe ser un array' });
    }
    await getRepo().save({ key: CONFIG_KEY_CEETPS, value: JSON.stringify(rules) });
    res.json({ ok: true });
  } catch (err) {
    logger.error('[conjuntosConfig] saveConjuntosCeetpsConfig', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { getConjuntosConfig, saveConjuntosConfig, getConjuntosCeetpsConfig, saveConjuntosCeetpsConfig };
