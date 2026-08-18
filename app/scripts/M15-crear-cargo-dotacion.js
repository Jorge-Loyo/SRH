/**
 * M15 — Crear tablas personas_dotacion y cargo_dotacion
 *
 * personas_dotacion : 1 fila por persona (CUIL único), se actualiza semanalmente
 * cargo_dotacion    : historial de ocupación cargo ↔ persona, FK a new_cargo + personas_dotacion
 *
 * Uso: node app/scripts/M15-crear-cargo-dotacion.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
const mysql = require('mysql2/promise');

const SQL_PERSONAS = `
CREATE TABLE IF NOT EXISTS personas_dotacion (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cuil                BIGINT NOT NULL,
  numero_doc          VARCHAR(20)  NULL,
  tipo_doc            VARCHAR(10)  NULL,
  ayn                 VARCHAR(200) NOT NULL,
  fecha_nacimiento    DATE         NULL,
  sexo                VARCHAR(10)  NULL,
  especialidad        VARCHAR(200) NULL,
  telefono            VARCHAR(30)  NULL,
  mail_personal       VARCHAR(200) NULL,
  mail_laboral        VARCHAR(200) NULL,
  domicilio           VARCHAR(200) NULL,
  localidad           VARCHAR(200) NULL,
  fecha_creacion      DATETIME     DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP    DEFAULT NOW() ON UPDATE NOW(),
  UNIQUE KEY uq_pd_cuil (cuil),
  INDEX idx_pd_numero_doc (numero_doc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const SQL_CARGO_DOTACION = `
CREATE TABLE IF NOT EXISTS cargo_dotacion (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  -- Vínculo estructural
  id_cargo            INT UNSIGNED NOT NULL,
  id_persona          INT UNSIGNED NOT NULL,

  -- Trazabilidad del rol SIAL (ej: 000110898-2 = jefe, -1 = planta)
  id_sial             VARCHAR(50)  NOT NULL,
  cuil_y_rol          VARCHAR(80)  NULL,

  -- Ubicación física (FK lógica a organigramas.codigo_reparticion)
  codigo_repa         INT          NULL,

  -- Período y vigencia
  periodo             VARCHAR(10)  NOT NULL,
  desde               DATE         NULL,
  hasta               DATE         NULL,   -- NULL = actualmente activo

  -- Situación de revista
  situacion_revista   ENUM('activo','retencion_cargo','comision') NULL,
  estado              VARCHAR(50)  NULL,

  -- Auditoría
  fecha_proceso       DATETIME     NULL,
  fecha_creacion      DATETIME     DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP    DEFAULT NOW() ON UPDATE NOW(),

  CONSTRAINT fk_cd_cargo   FOREIGN KEY (id_cargo)   REFERENCES new_cargo(id),
  CONSTRAINT fk_cd_persona FOREIGN KEY (id_persona) REFERENCES personas_dotacion(id),

  INDEX idx_cd_id_sial    (id_sial),
  INDEX idx_cd_id_cargo   (id_cargo),
  INDEX idx_cd_id_persona (id_persona),
  INDEX idx_cd_periodo    (periodo),
  INDEX idx_cd_hasta      (hasta),
  INDEX idx_cd_codigo_repa (codigo_repa)
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
    await c.query(SQL_PERSONAS);
    console.log('[M15] Tabla personas_dotacion creada OK');
    const [cols1] = await c.query('DESCRIBE personas_dotacion');
    cols1.forEach(r => console.log(`  ${r.Field.padEnd(25)} ${r.Type}`));

    await c.query(SQL_CARGO_DOTACION);
    console.log('\n[M15] Tabla cargo_dotacion creada OK');
    const [cols2] = await c.query('DESCRIBE cargo_dotacion');
    cols2.forEach(r => console.log(`  ${r.Field.padEnd(25)} ${r.Type}`));
  } finally {
    await c.end();
  }
})().catch(e => { console.error('[M15] ERROR:', e.message); process.exit(1); });
