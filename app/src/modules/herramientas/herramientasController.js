const { AppDataSource } = require('../../config/data-source');
const logger = require('../../utils/logger');
const XLSX = require('xlsx');

async function getErdSchema(req, res) {
  try {
    const db = await AppDataSource.query('SELECT DATABASE() AS db');
    const dbName = db[0].db;

    const columns = await AppDataSource.query(`
      SELECT
        TABLE_NAME   AS tableName,
        COLUMN_NAME  AS columnName,
        COLUMN_TYPE  AS columnType,
        IS_NULLABLE  AS nullable,
        COLUMN_KEY   AS columnKey,
        EXTRA        AS extra
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `, [dbName]);

    const fks = await AppDataSource.query(`
      SELECT
        kcu.TABLE_NAME             AS fromTable,
        kcu.COLUMN_NAME            AS fromColumn,
        kcu.REFERENCED_TABLE_NAME  AS toTable,
        kcu.REFERENCED_COLUMN_NAME AS toColumn,
        kcu.CONSTRAINT_NAME        AS constraintName
      FROM information_schema.KEY_COLUMN_USAGE kcu
      JOIN information_schema.TABLE_CONSTRAINTS tc
        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        AND tc.TABLE_SCHEMA   = kcu.TABLE_SCHEMA
      WHERE kcu.TABLE_SCHEMA = ?
        AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
      ORDER BY kcu.TABLE_NAME, kcu.COLUMN_NAME
    `, [dbName]);

    const tables = {};
    for (const col of columns) {
      if (!tables[col.tableName]) tables[col.tableName] = [];
      tables[col.tableName].push({
        name:     col.columnName,
        type:     col.columnType,
        nullable: col.nullable === 'YES',
        pk:       col.columnKey === 'PRI',
        fk:       col.columnKey === 'MUL',
        auto:     col.extra.includes('auto_increment'),
      });
    }

    res.json({ tables, fks });
  } catch (err) {
    logger.error('[herramientasController] getErdSchema', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── Tablas raíz administrables ─────────────────────────────────────────────
const ADMIN_TABLES = {
  especialidades:         { pk: 'id',              label: 'Especialidades' },
  carreras:               { pk: 'id_carrera',       label: 'Carreras' },
  modalidades:            { pk: 'id_modalidad',     label: 'Modalidades' },
  puestos_tec:            { pk: 'id_puesto_tec',    label: 'Puestos Técnicos' },
  situacion_revista:      { pk: 'id',               label: 'Situación Revista' },
  roles:                  { pk: 'id',               label: 'Roles' },
  siglas:                 { pk: 'id_sigla',         label: 'Siglas' },
  dot_agrupador:          { pk: 'id',               label: 'Dot · Agrupador' },
  dot_unificador_puestos: { pk: 'id',               label: 'Dot · Unificador Puestos' },
  dot_especialidades:     { pk: 'id',               label: 'Dot · Especialidades' },
};

async function getAdminTables(req, res) {
  res.json(Object.entries(ADMIN_TABLES).map(([name, meta]) => ({ name, ...meta })));
}

async function adminInsert(req, res) {
  const { tableName } = req.params;
  const meta = ADMIN_TABLES[tableName];
  if (!meta) return res.status(403).json({ error: 'Tabla no permitida' });
  const fields = Object.keys(req.body);
  if (!fields.length) return res.status(400).json({ error: 'Sin datos' });
  const cols = fields.map(f => `\`${f}\``).join(', ');
  const vals = fields.map(() => '?').join(', ');
  const result = await AppDataSource.query(
    `INSERT INTO \`${tableName}\` (${cols}) VALUES (${vals})`,
    fields.map(f => req.body[f])
  );
  res.json({ id: result.insertId });
}

async function adminUpdate(req, res) {
  const { tableName, id } = req.params;
  const meta = ADMIN_TABLES[tableName];
  if (!meta) return res.status(403).json({ error: 'Tabla no permitida' });
  const fields = Object.keys(req.body);
  if (!fields.length) return res.status(400).json({ error: 'Sin datos' });
  const set = fields.map(f => `\`${f}\` = ?`).join(', ');
  await AppDataSource.query(
    `UPDATE \`${tableName}\` SET ${set} WHERE \`${meta.pk}\` = ?`,
    [...fields.map(f => req.body[f]), id]
  );
  res.json({ ok: true });
}

async function adminDelete(req, res) {
  const { tableName, id } = req.params;
  const meta = ADMIN_TABLES[tableName];
  if (!meta) return res.status(403).json({ error: 'Tabla no permitida' });
  await AppDataSource.query(
    `DELETE FROM \`${tableName}\` WHERE \`${meta.pk}\` = ?`, [id]
  );
  res.json({ ok: true });
}

async function getTableData(req, res) {
  try {
    const { tableName } = req.params;
    // Validar que la tabla existe en la BD actual
    const db = await AppDataSource.query('SELECT DATABASE() AS db');
    const [exists] = await AppDataSource.query(
      `SELECT COUNT(*) AS n FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [db[0].db, tableName]
    );
    if (!parseInt(exists.n)) return res.status(404).json({ error: 'Tabla no encontrada' });

    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const offset = (page - 1) * limit;

    const [{ total }] = await AppDataSource.query(
      `SELECT COUNT(*) AS total FROM \`${tableName}\``
    );
    const rows = await AppDataSource.query(
      `SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`, [limit, offset]
    );

    res.json({ rows, total: parseInt(total), page, limit });
  } catch (err) {
    logger.error('[herramientasController] getTableData', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function getCatalogoCargos(req, res) {
  try {
    // JOIN carreras → especialidades para armar el catálogo completo
    const rows = await AppDataSource.query(`
      SELECT
        c.nombre_carrera  AS carrera,
        e.nombre          AS especialidad,
        e.codigo          AS codigo_especialidad
      FROM especialidades e
      JOIN carreras c ON e.id_carrera = c.id_carrera
      ORDER BY c.nombre_carrera, e.nombre
    `);

    if (!rows.length) {
      return res.status(404).json({ error: 'Sin datos' });
    }

    // Agrupar por carrera para generar una hoja por carrera
    const porCarrera = {};
    for (const r of rows) {
      if (!porCarrera[r.carrera]) porCarrera[r.carrera] = [];
      porCarrera[r.carrera].push(r);
    }

    const wb = XLSX.utils.book_new();

    // Hoja resumen con todo
    const resumenData = [
      ['Carrera', 'Especialidad', 'Código'],
      ...rows.map(r => [r.carrera, r.especialidad, r.codigo_especialidad ?? '']),
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    wsResumen['!cols'] = [{ wch: 40 }, { wch: 40 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Catálogo Completo');

    // Una hoja por carrera
    for (const [carrera, items] of Object.entries(porCarrera)) {
      const sheetData = [
        ['Especialidad', 'Código'],
        ...items.map(r => [r.especialidad, r.codigo_especialidad ?? '']),
      ];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws['!cols'] = [{ wch: 40 }, { wch: 15 }];
      // Nombre de hoja máx 31 chars (límite Excel)
      const sheetName = carrera.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="catalogo-cargos.xlsx"');
    res.send(buffer);
  } catch (err) {
    logger.error('[herramientasController] getCatalogoCargos', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getErdSchema, getTableData, getAdminTables, adminInsert, adminUpdate, adminDelete, getCatalogoCargos };
