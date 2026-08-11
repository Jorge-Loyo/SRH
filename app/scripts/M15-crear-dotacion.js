/**
 * M15 — Crear tabla `dotacion`
 *
 * Representa la ocupación de un cargo por un agente en un período.
 * Se alimenta desde dot_resultado (padrón Dotaneitor) cruzado con new_cargo por id_sial.
 *
 * Uso: node app/scripts/M15-crear-dotacion.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
const mysql = require('mysql2/promise');

const SQL = `
CREATE TABLE IF NOT EXISTS dotacion (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  -- Vínculo con el cargo estructural
  id_cargo              INT UNSIGNED NOT NULL,
  id_sial               VARCHAR(20)  NULL,

  -- Agente que ocupa el cargo (identificado por CUIL — sin FK a personas, tabla histórica)
  cuil                  BIGINT       NULL,
  cuil_y_rol            VARCHAR(80)  NULL,
  ayn                   VARCHAR(200) NULL,

  -- Período del padrón del que proviene este registro
  periodo               VARCHAR(10)  NOT NULL,

  -- Ocupación
  desde                 DATE         NULL,   -- ANTIGÜEDAD del padrón (fecha inicio en el cargo)
  hasta                 DATE         NULL,   -- NULL = actualmente ocupado

  -- Situación
  situacion_revista     ENUM('activo','retencion_cargo','comision') NULL,
  estado                VARCHAR(50)  NULL,   -- Activo / Bloqueado / Retencion / Comision (del padrón)

  -- Datos del padrón para consulta directa (evita joins a dot_resultado)
  siglas                VARCHAR(50)  NULL,
  escalafon             VARCHAR(100) NULL,
  literal_cr            VARCHAR(200) NULL,
  literal_puesto        VARCHAR(200) NULL,
  especialidad          VARCHAR(200) NULL,
  agrupador             VARCHAR(200) NULL,
  unificador_de_puestos VARCHAR(200) NULL,
  jefe_escalafon        VARCHAR(100) NULL,
  universo_totalizador  VARCHAR(100) NULL,
  tipo_hospital_sigla   VARCHAR(100) NULL,

  -- Auditoría
  fecha_proceso         DATETIME     NULL,   -- fecha del proceso Dotaneitor que generó este registro
  fecha_creacion        DATETIME     DEFAULT NOW(),
  fecha_actualizacion   TIMESTAMP    DEFAULT NOW() ON UPDATE NOW(),

  CONSTRAINT fk_dotacion_cargo FOREIGN KEY (id_cargo) REFERENCES new_cargo(id),
  INDEX idx_dotacion_id_sial   (id_sial),
  INDEX idx_dotacion_cuil      (cuil),
  INDEX idx_dotacion_periodo   (periodo),
  INDEX idx_dotacion_siglas    (siglas),
  INDEX idx_dotacion_estado    (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

(async () => {
  const c = await mysql.createConnection({
    host: 'localhost', port: 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await c.query(SQL);
    console.log('[M15] Tabla dotacion creada OK');

    // Verificar estructura
    const [cols] = await c.query('DESCRIBE dotacion');
    console.log(`[M15] Columnas: ${cols.length}`);
    cols.forEach(r => console.log(`  ${r.Field.padEnd(25)} ${r.Type}`));
  } finally {
    await c.end();
  }
})().catch(e => { console.error('[M15] ERROR:', e.message); process.exit(1); });
