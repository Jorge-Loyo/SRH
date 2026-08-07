/**
 * Script: setup-dotaneitor-resultado.js
 * Crea las tablas dot_resultado y dot_resultado_historial.
 * Uso: node scripts/setup-dotaneitor-resultado.js
 */
require('dotenv').config({ path: '.env.local' })
const { AppDataSource } = require('../src/config/data-source')

async function run() {
  await AppDataSource.initialize()
  const db = AppDataSource

  // ── dot_resultado ─────────────────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS dot_resultado (
      id_sial              VARCHAR(50)  NOT NULL,
      cuil                 BIGINT       NULL,
      cuil_y_rol           VARCHAR(80)  NULL,
      ayn                  VARCHAR(200) NULL,
      fecha_nacimiento     DATE         NULL,
      edad                 SMALLINT     NULL,
      sexo                 VARCHAR(20)  NULL,
      tipo_doc             VARCHAR(20)  NULL,
      numero_doc           VARCHAR(20)  NULL,
      codigo_repa          VARCHAR(20)  NULL,
      descripcion_repa     VARCHAR(200) NULL,
      siglas               VARCHAR(50)  NULL,
      universo_totalizador VARCHAR(100) NULL,
      tipo_hospital_sigla  VARCHAR(100) NULL,
      monovalencia         VARCHAR(100) NULL,
      escalafon            VARCHAR(100) NULL,
      codigo_de_registro   VARCHAR(20)  NULL,
      literal_cr           VARCHAR(200) NULL,
      regimen              VARCHAR(100) NULL,
      situacion_de_revista VARCHAR(200) NULL,
      puesto               VARCHAR(20)  NULL,
      literal_puesto       VARCHAR(200) NULL,
      especialidad         VARCHAR(200) NULL,
      unificador_de_puestos VARCHAR(200) NULL,
      agrupador            VARCHAR(200) NULL,
      codigo_jefaturas     VARCHAR(50)  NULL,
      jefe_escalafon       VARCHAR(100) NULL,
      estado               VARCHAR(50)  NULL,
      fecha_proceso        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id_sial)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  console.log('✓ dot_resultado OK')

  // ── dot_resultado_historial ───────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS dot_resultado_historial (
      id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      proceso_id    VARCHAR(36)  NOT NULL,
      fecha_proceso DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      accion        ENUM('insert','update','delete') NOT NULL,
      id_sial       VARCHAR(50)  NOT NULL,
      cuil_y_rol    VARCHAR(80)  NULL,
      ayn           VARCHAR(200) NULL,
      campo         VARCHAR(100) NULL,
      valor_anterior TEXT        NULL,
      valor_nuevo    TEXT        NULL,
      INDEX idx_proceso (proceso_id),
      INDEX idx_fecha   (fecha_proceso),
      INDEX idx_id_sial (id_sial)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  console.log('✓ dot_resultado_historial OK')

  console.log('\n✅ Setup dot_resultado completado.')
  await AppDataSource.destroy()
}

run().catch(e => { console.error(e); process.exit(1) })
