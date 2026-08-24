const { AppDataSource } = require('../../config/data-source');
const logger = require('../../utils/logger');
const ExcelJS = require('exceljs');

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
      SELECT DISTINCT
        CASE c.nombre WHEN 'Escalafón General' THEN 'Escalafón General (Anexo II)' ELSE c.nombre END AS escalafon,
        pc.nombre AS puesto, e.nombre AS especialidad
      FROM puestos_cargo pc
      JOIN carreras c ON LOWER(c.codigo) = LOWER(pc.carrera)
      LEFT JOIN puesto_especialidades pe ON pe.id_puesto = pc.id
      LEFT JOIN especialidades e ON e.id = pe.id_especialidad
      WHERE pc.activo = 1 AND pc.es_medico = 0
        AND pc.id NOT IN (149, 150, 151, 152, 153)

      UNION

      SELECT c.nombre AS escalafon, 'Médico' AS puesto, e.nombre AS especialidad
      FROM puestos_cargo pc
      JOIN carreras c ON LOWER(c.codigo) = LOWER(pc.carrera)
      CROSS JOIN especialidades e
      WHERE pc.activo = 1 AND pc.es_medico = 1 AND pc.nombre = 'MEDICO' AND e.id_carrera = 1 AND e.activo = 1

      UNION

      SELECT 'Enfermería' AS escalafon, puesto, NULL AS especialidad
      FROM (SELECT 'Licenciado en Enfermería' AS puesto UNION SELECT 'Enfermero Profesional' UNION SELECT 'Auxiliar de Enfermería') enf

      ORDER BY escalafon, puesto, especialidad
    `);

    if (!rows.length) {
      return res.status(404).json({ error: 'Sin datos' });
    }

    // Agrupar por carrera para generar una hoja por carrera
    const porCarrera = {};
    for (const r of rows) {
      if (!porCarrera[r.escalafon]) porCarrera[r.escalafon] = [];
      porCarrera[r.escalafon].push(r);
    }

    const wb = new ExcelJS.Workbook();
    const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

    function addSheet(name, headers, data) {
      const ws = wb.addWorksheet(name);
      ws.addRow(headers);
      ws.getRow(1).eachCell(cell => {
        cell.fill = HEADER_FILL;
        cell.font = HEADER_FONT;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      ws.getRow(1).height = 20;
      data.forEach(r => ws.addRow(r));
      ws.columns.forEach(col => {
        let max = 10;
        col.eachCell(cell => { if (cell.value) max = Math.max(max, String(cell.value).length + 2); });
        col.width = Math.min(max, 50);
      });
    }

    addSheet('Catálogo Completo',
      ['Escalafón', 'Puesto', 'Especialidad'],
      rows.map(r => [r.escalafon, r.puesto, r.especialidad ?? '-'])
    );

    for (const [escalafon, items] of Object.entries(porCarrera)) {
      addSheet(
        escalafon.substring(0, 31),
        ['Puesto', 'Especialidad'],
        items.map(r => [r.puesto, r.especialidad ?? '-'])
      );
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="catalogo-cargos.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    logger.error('[herramientasController] getCatalogoCargos', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getErdSchema, getTableData, getAdminTables, adminInsert, adminUpdate, adminDelete, getCatalogoCargos };
