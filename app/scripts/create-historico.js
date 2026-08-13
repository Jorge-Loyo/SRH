const mysql = require('mysql2/promise')
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })

;(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })
  await c.execute(`
    CREATE TABLE IF NOT EXISTS dot_resultado_historico (
      proceso_id           VARCHAR(36)  NOT NULL,
      fecha_asignada       DATE         NOT NULL,
      id_sial              VARCHAR(50)  NOT NULL,
      cuil                 BIGINT,
      cuil_y_rol           VARCHAR(80),
      ayn                  VARCHAR(200),
      siglas               VARCHAR(50),
      universo_totalizador VARCHAR(100),
      escalafon            VARCHAR(100),
      codigo_de_registro   VARCHAR(20),
      literal_puesto       VARCHAR(200),
      especialidad         VARCHAR(200),
      unificador_de_puestos VARCHAR(200),
      agrupador            VARCHAR(200),
      codigo_jefaturas     VARCHAR(50),
      jefe_escalafon       VARCHAR(100),
      estado               VARCHAR(50),
      situacion_de_revista VARCHAR(200),
      fecha_proceso        DATETIME,
      PRIMARY KEY (proceso_id, id_sial),
      INDEX idx_fecha    (fecha_asignada),
      INDEX idx_proceso  (proceso_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  console.log('ok: dot_resultado_historico creada')
  await c.end()
})().catch(e => { console.error(e.message); process.exit(1) })
