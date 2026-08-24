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
    // ── 1. Modalidades reales por puesto CPH (desde cargos vigentes) ──────────
    const modalidadesPuesto = await AppDataSource.query(`
      SELECT pc.id, GROUP_CONCAT(DISTINCT m.id_cod ORDER BY m.id_cod) AS modalidades
      FROM puestos_cargo pc
      JOIN new_cargo nc ON nc.id_puesto = pc.id AND nc.estado = 'vigente'
      JOIN modalidades m ON m.id = nc.id_modalidad
      WHERE pc.carrera = 'cph' AND pc.activo = 1
      GROUP BY pc.id
    `);
    const modMap = {};
    for (const r of modalidadesPuesto) modMap[r.id] = r.modalidades.split(',');

    // ── 2. CPH no médicos con sus especialidades ──────────────────────────────
    const noMedicosRaw = await AppDataSource.query(`
      SELECT DISTINCT pc.id, pc.nombre AS profesion, e.nombre AS subespecialidad
      FROM puestos_cargo pc
      JOIN new_cargo nc ON nc.id_puesto = pc.id AND nc.estado = 'vigente'
      LEFT JOIN puesto_especialidades pe ON pe.id_puesto = pc.id
      LEFT JOIN especialidades e ON e.id = pe.id_especialidad
      WHERE pc.carrera = 'cph' AND pc.activo = 1 AND pc.es_medico = 0
        AND (e.nombre IS NULL OR e.nombre NOT LIKE '%sin Especialidad%')
      GROUP BY pc.id, pc.nombre, e.nombre
      ORDER BY pc.nombre, e.nombre
    `);
    // Deduplicar por (id, subespecialidad) — el DISTINCT SQL no es suficiente con JOINs múltiples
    const noMedicosSet = new Set();
    const noMedicos = noMedicosRaw.filter(r => {
      const key = `${r.id}|${r.subespecialidad ?? ''}`;
      if (noMedicosSet.has(key)) return false;
      noMedicosSet.add(key);
      return true;
    });

    // ── 3. CPH médico con especialidades médicas (id<=78, sin 'sin Especialidad') ────────
    const medicos = await AppDataSource.query(`
      SELECT DISTINCT e.nombre AS especialidad_raw
      FROM especialidades e
      WHERE e.id_carrera = 1 AND e.activo = 1 AND e.id <= 78
        AND e.nombre NOT LIKE '%sin Especialidad%'
      ORDER BY e.nombre
    `);

    // ── 4. Modalidades del puesto MEDICO (id=10) ──────────────────────────────
    const modMedico = modMap[10] ?? ['POF'];

    // ── 5. Construir filas ────────────────────────────────────────────────────
    // Helper: separar especialidad y subespecialidad del paréntesis
    function splitEsp(nombre) {
      if (!nombre) return ['-', '-'];
      const m = nombre.match(/^(.+?)\s*\((.+)\)\s*$/);
      return m ? [m[1].trim(), m[2].trim()] : [nombre.trim(), '-'];
    }

    const filas = [];

    // CPH no médicos → una fila por (profesion × modalidad × subespecialidad)
    for (const r of noMedicos) {
      const mods = modMap[r.id] ?? ['-'];
      for (const mod of mods) {
        filas.push({
          escalafon: 'CPH',
          puesto: 'No Médico',
          modalidad: mod,
          especialidad: r.profesion,
          subespecialidad: r.subespecialidad ?? '-',
        });
      }
    }

    // CPH médico → una fila por (especialidad × modalidad)
    for (const mod of modMedico) {
      for (const r of medicos) {
        const [esp, subesp] = splitEsp(r.especialidad_raw);
        filas.push({
          escalafon: 'CPH',
          puesto: 'Médico',
          modalidad: mod,
          especialidad: esp,
          subespecialidad: subesp,
        });
      }
    }

    // Enfermería (hardcoded, sin modalidad)
    for (const p of ['Licenciado en Enfermería', 'Enfermero Profesional', 'Auxiliar de Enfermería']) {
      filas.push({ escalafon: 'Enfermería', puesto: p, modalidad: '-', especialidad: '-', subespecialidad: '-' });
    }

    // Escalafón General (Anexo II) — todos los activos, sin jefaturas/gerencias
    const egPuestos = await AppDataSource.query(`
      SELECT DISTINCT pc.nombre FROM puestos_cargo pc
      WHERE pc.carrera = 'eg' AND pc.activo = 1 AND pc.id NOT IN (149,150,151,152,153)
      ORDER BY pc.nombre
    `);
    for (const r of egPuestos) {
      filas.push({ escalafon: 'Escalafón General (Anexo II)', puesto: r.nombre, modalidad: '-', especialidad: '-', subespecialidad: '-' });
    }

    // Técnico
    const tecPuestos = await AppDataSource.query(`
      SELECT pc.nombre, GROUP_CONCAT(DISTINCT m.id_cod ORDER BY m.id_cod) AS modalidades
      FROM puestos_cargo pc
      LEFT JOIN new_cargo nc ON nc.id_puesto = pc.id AND nc.estado = 'vigente'
      LEFT JOIN modalidades m ON m.id = nc.id_modalidad
      WHERE pc.carrera = 'tec' AND pc.activo = 1
      GROUP BY pc.id, pc.nombre
      ORDER BY pc.nombre
    `);
    for (const r of tecPuestos) {
      const mods = r.modalidades ? r.modalidades.split(',') : ['-'];
      for (const mod of mods) {
        filas.push({ escalafon: 'Técnico', puesto: r.nombre, modalidad: mod, especialidad: '-', subespecialidad: '-' });
      }
    }

    if (!filas.length) return res.status(404).json({ error: 'Sin datos' });

    // ── 6. Generar Excel ──────────────────────────────────────────────────────
    const HEADERS = ['Escalafón', 'Puesto', 'Modalidad', 'Especialidad', 'Sub-especialidad'];
    const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

    const wb = new ExcelJS.Workbook();

    function addSheet(name, data) {
      const ws = wb.addWorksheet(name);
      ws.addRow(HEADERS);
      ws.getRow(1).eachCell(cell => {
        cell.fill = HEADER_FILL;
        cell.font = HEADER_FONT;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      ws.getRow(1).height = 20;
      for (const f of data)
        ws.addRow([f.escalafon, f.puesto, f.modalidad, f.especialidad, f.subespecialidad]);
      ws.columns.forEach(col => {
        let max = 12;
        col.eachCell(cell => { if (cell.value) max = Math.max(max, String(cell.value).length + 2); });
        col.width = Math.min(max, 50);
      });
    }

    // Hoja completa
    addSheet('Catálogo Completo', filas);

    // Una hoja por escalafón
    const porEscalafon = {};
    for (const f of filas) {
      if (!porEscalafon[f.escalafon]) porEscalafon[f.escalafon] = [];
      porEscalafon[f.escalafon].push(f);
    }
    for (const [esc, items] of Object.entries(porEscalafon))
      addSheet(esc.substring(0, 31), items);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="catalogo-cargos.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    logger.error('[herramientasController] getCatalogoCargos', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}
async function getPadronCargos(req, res) {
  try {
    const rows = await AppDataSource.query(`
      SELECT DISTINCT
        carrera      AS Carrera,
        puesto       AS Puesto,
        especialidad AS Especialidad,
        modalidad    AS Modalidad
      FROM new_cargo
      WHERE estado = 'vigente'
      ORDER BY carrera, puesto, especialidad, modalidad
    `);

    if (!rows.length) return res.status(404).json({ error: 'Sin datos' });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Padrón de Cargos');

    const HEADERS = ['Carrera', 'Puesto', 'Especialidad', 'Modalidad'];
    const FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    const FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

    ws.addRow(HEADERS);
    ws.getRow(1).eachCell(cell => {
      cell.fill = FILL;
      cell.font = FONT;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(1).height = 20;

    for (const r of rows)
      ws.addRow([r.Carrera ?? '', r.Puesto ?? '', r.Especialidad ?? '', r.Modalidad ?? '']);

    ws.columns.forEach(col => {
      let max = 12;
      col.eachCell(cell => { if (cell.value) max = Math.max(max, String(cell.value).length + 2); });
      col.width = Math.min(max, 60);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="padron-cargos.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    logger.error('[herramientasController] getPadronCargos', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getErdSchema, getTableData, getAdminTables, adminInsert, adminUpdate, adminDelete, getCatalogoCargos, getPadronCargos };
