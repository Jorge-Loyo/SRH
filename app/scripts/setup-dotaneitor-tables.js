/**
 * Script: setup-dotaneitor-tables.js
 * Crea las tablas de referencia para Dotaneitor y las carga desde el Excel.
 * Uso: node scripts/setup-dotaneitor-tables.js
 */
require('dotenv').config({ path: '.env.local' })
const path = require('path')
const { AppDataSource } = require('../src/config/data-source')

// Ruta al Excel de referencia
const EXCEL_PATH = path.resolve(
  'C:/Desarrollo/SRH/Automatización Dotación/ARCHIVOS PARA DOTACION.xlsx'
)

async function run() {
  await AppDataSource.initialize()
  const db = AppDataSource

  console.log('Creando tablas...')

  // ── 1. Agregar desc_sigla a siglas si no existe ──────────────────────────
  const [cols] = await db.query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'siglas' AND COLUMN_NAME = 'desc_sigla'
  `)
  if (!cols) {
    await db.query(`ALTER TABLE siglas ADD COLUMN desc_sigla VARCHAR(150) NULL AFTER sigla`)
    console.log('  + Columna desc_sigla agregada a siglas')
  }

  // ── 2. dot_agrupador ─────────────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS dot_agrupador (
      id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      cruce     VARCHAR(300) NOT NULL,
      escalafon VARCHAR(150) NOT NULL,
      lit_puesto VARCHAR(200) NOT NULL,
      agrupador  VARCHAR(150) NOT NULL,
      activo     TINYINT(1) NOT NULL DEFAULT 1,
      UNIQUE KEY uq_cruce (cruce(250))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  console.log('  + dot_agrupador OK')

  // ── 3. dot_unificador_puestos ────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS dot_unificador_puestos (
      id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      cruce        VARCHAR(400) NOT NULL,
      lit_cod_reg  VARCHAR(150) NOT NULL,
      lit_puesto   VARCHAR(200) NOT NULL,
      unificador   VARCHAR(200) NOT NULL,
      activo       TINYINT(1) NOT NULL DEFAULT 1,
      UNIQUE KEY uq_cruce (cruce(250))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  console.log('  + dot_unificador_puestos OK')

  // ── 4. dot_especialidades ────────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS dot_especialidades (
      id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      tipo            ENUM('cph','suplentes','residentes') NOT NULL,
      cuil            BIGINT NOT NULL,
      cuil_y_rol      VARCHAR(50) NOT NULL,
      rol             INT NOT NULL,
      apellido_nombre VARCHAR(200) NULL,
      nombre_puesto   VARCHAR(200) NULL,
      doc_resp_alta   VARCHAR(100) NULL,
      especialidad    VARCHAR(200) NOT NULL,
      activo          TINYINT(1) NOT NULL DEFAULT 1,
      INDEX idx_cuil (cuil),
      INDEX idx_tipo_cuil (tipo, cuil)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  console.log('  + dot_especialidades OK')

  // ── Cargar datos desde Excel ─────────────────────────────────────────────
  let ExcelJS
  try { ExcelJS = require('exceljs') } catch {
    console.error('exceljs no disponible, instalalo: npm install exceljs')
    process.exit(1)
  }

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(EXCEL_PATH)
  console.log('\nCargando datos desde Excel...')

  // ── SIGLAS ────────────────────────────────────────────────────────────────
  const wsSiglas = wb.getWorksheet('SIGLAS')
  let siglasCargadas = 0, siglasActualizadas = 0
  const headerSiglas = wsSiglas.getRow(1).values.slice(1) // [Sigla, DESC_SIGLA, UNIVERSO TOTALIZADOR, Tipo de Hospital / Sigla, Monovalencia]
  for (let i = 2; i <= wsSiglas.rowCount; i++) {
    const row = wsSiglas.getRow(i).values.slice(1)
    if (!row[0]) continue
    const [sigla, desc_sigla, universo, tipo, monovalencia] = row.map(v => v == null ? null : String(v).trim())
    const [existing] = await db.query(`SELECT id_sigla FROM siglas WHERE sigla = ?`, [sigla])
    if (existing) {
      await db.query(
        `UPDATE siglas SET desc_sigla=?, universo_totalizador=?, tipo_hospital_sigla=?, monovalencia=? WHERE sigla=?`,
        [desc_sigla, universo || '', tipo || '', monovalencia || null, sigla]
      )
      siglasActualizadas++
    } else {
      // Obtener próximo id_sigla manual (la tabla no tiene AUTO_INCREMENT)
      const [{ maxId }] = await db.query(`SELECT COALESCE(MAX(id_sigla),0)+1 AS maxId FROM siglas`)
      await db.query(
        `INSERT INTO siglas (id_sigla, sigla, desc_sigla, universo_totalizador, tipo_hospital_sigla, monovalencia) VALUES (?,?,?,?,?,?)`,
        [maxId, sigla, desc_sigla, universo || '', tipo || '', monovalencia || null]
      )
      siglasCargadas++
    }
  }
  console.log(`  SIGLAS: ${siglasCargadas} nuevas, ${siglasActualizadas} actualizadas`)

  // ── AGRUPADOR ─────────────────────────────────────────────────────────────
  const wsAgrup = wb.getWorksheet('AGRUPADOR')
  const [{ n: agrupCount }] = await db.query(`SELECT COUNT(*) as n FROM dot_agrupador`)
  if (parseInt(agrupCount) === 0) {
    let batch = []
    for (let i = 2; i <= wsAgrup.rowCount; i++) {
      const row = wsAgrup.getRow(i).values.slice(1)
      if (!row[0]) continue
      const [cruce, escalafon, lit_puesto, agrupador] = row.map(v => v == null ? '' : String(v).trim())
      batch.push([cruce, escalafon, lit_puesto, agrupador])
      if (batch.length === 200) {
        await db.query(
          `INSERT IGNORE INTO dot_agrupador (cruce, escalafon, lit_puesto, agrupador) VALUES ?`,
          [batch]
        )
        batch = []
      }
    }
    if (batch.length) await db.query(`INSERT IGNORE INTO dot_agrupador (cruce, escalafon, lit_puesto, agrupador) VALUES ?`, [batch])
    const [{ n }] = await db.query(`SELECT COUNT(*) as n FROM dot_agrupador`)
    console.log(`  AGRUPADOR: ${n} registros cargados`)
  } else {
    console.log(`  AGRUPADOR: ya tiene ${agrupCount} registros, saltando`)
  }

  // ── UNIFICADOR DE PUESTOS ─────────────────────────────────────────────────
  const wsUnif = wb.getWorksheet('UNIFICADOR DE PUESTOS')
  const [{ n: unifCount }] = await db.query(`SELECT COUNT(*) as n FROM dot_unificador_puestos`)
  if (parseInt(unifCount) === 0) {
    let batch = []
    for (let i = 2; i <= wsUnif.rowCount; i++) {
      const row = wsUnif.getRow(i).values.slice(1)
      if (!row[0]) continue
      const [cruce, lit_cod_reg, lit_puesto, unificador] = row.map(v => v == null ? '' : String(v).trim())
      batch.push([cruce, lit_cod_reg, lit_puesto, unificador])
      if (batch.length === 200) {
        await db.query(
          `INSERT IGNORE INTO dot_unificador_puestos (cruce, lit_cod_reg, lit_puesto, unificador) VALUES ?`,
          [batch]
        )
        batch = []
      }
    }
    if (batch.length) await db.query(`INSERT IGNORE INTO dot_unificador_puestos (cruce, lit_cod_reg, lit_puesto, unificador) VALUES ?`, [batch])
    const [{ n }] = await db.query(`SELECT COUNT(*) as n FROM dot_unificador_puestos`)
    console.log(`  UNIFICADOR DE PUESTOS: ${n} registros cargados`)
  } else {
    console.log(`  UNIFICADOR DE PUESTOS: ya tiene ${unifCount} registros, saltando`)
  }

  // ── ESPECIALIDADES (CPH / SUPLENTES / RESIDENTES) ─────────────────────────
  const espSheets = [
    { sheet: 'ESPECIALIDADES CPH',        tipo: 'cph',        cuil: 0, cuil_y_rol: 1, rol: 2, nombre: 3, puesto: 5, doc: 6, esp: 7 },
    { sheet: 'ESPECIALIDADES SUPLENTES',  tipo: 'suplentes',  cuil: 0, cuil_y_rol: 1, rol: 2, nombre: 3, puesto: 5, doc: 6, esp: 7 },
    { sheet: 'ESPECIALIDADES RESIDENTES', tipo: 'residentes', cuil: 0, cuil_y_rol: 1, rol: 2, nombre: 3, puesto: 4, doc: 5, esp: 6 },
  ]
  const [{ n: espCount }] = await db.query(`SELECT COUNT(*) as n FROM dot_especialidades`)
  if (parseInt(espCount) === 0) {
    for (const cfg of espSheets) {
      const ws = wb.getWorksheet(cfg.sheet)
      let batch = [], total = 0
      for (let i = 2; i <= ws.rowCount; i++) {
        const row = ws.getRow(i).values.slice(1)
        if (!row[cfg.cuil]) continue
        const cuil     = parseInt(String(row[cfg.cuil]).replace(/\D/g, '')) || 0
        const cuil_rol = row[cfg.cuil_y_rol] ? String(row[cfg.cuil_y_rol]).trim() : ''
        const rol      = parseInt(row[cfg.rol]) || 0
        const nombre   = row[cfg.nombre]  ? String(row[cfg.nombre]).trim()  : null
        const puesto   = row[cfg.puesto]  ? String(row[cfg.puesto]).trim()  : null
        const doc      = row[cfg.doc]     ? String(row[cfg.doc]).trim()     : null
        const esp      = row[cfg.esp]     ? String(row[cfg.esp]).trim()     : ''
        if (!esp) continue
        batch.push([cfg.tipo, cuil, cuil_rol, rol, nombre, puesto, doc, esp])
        total++
        if (batch.length === 500) {
          await db.query(
            `INSERT INTO dot_especialidades (tipo, cuil, cuil_y_rol, rol, apellido_nombre, nombre_puesto, doc_resp_alta, especialidad) VALUES ?`,
            [batch]
          )
          batch = []
        }
      }
      if (batch.length) {
        await db.query(
          `INSERT INTO dot_especialidades (tipo, cuil, cuil_y_rol, rol, apellido_nombre, nombre_puesto, doc_resp_alta, especialidad) VALUES ?`,
          [batch]
        )
      }
      console.log(`  ${cfg.sheet}: ${total} registros cargados`)
    }
  } else {
    console.log(`  ESPECIALIDADES: ya tiene ${espCount} registros, saltando`)
  }

  console.log('\n✅ Setup Dotaneitor completado.')
  await AppDataSource.destroy()
}

run().catch(e => { console.error(e); process.exit(1) })
